import { useState, useCallback, useMemo } from 'react';
import { StockItem, RackData } from '../types';

interface SearchResult {
  item: StockItem;
  rack: RackData;
  score: number; // 0-1, plus haut = meilleur match
  matchType: 'exact' | 'startsWith' | 'contains' | 'fuzzy';
}

interface UseRackSearchProps {
  items: StockItem[];
  rackData: RackData[];
}

// Simple fuzzy match score
const fuzzyScore = (query: string, target: string): number => {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  
  if (t === q) return 1;
  if (t.startsWith(q)) return 0.9;
  if (t.includes(q)) return 0.7;
  
  // Check if all chars of query appear in order in target
  let qIdx = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -2;
  
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      if (i === lastMatchIdx + 1) consecutiveBonus += 0.1;
      lastMatchIdx = i;
      qIdx++;
    }
  }
  
  if (qIdx === q.length) {
    return 0.3 + consecutiveBonus + (q.length / t.length) * 0.3;
  }
  
  return 0;
};

export const useRackSearch = ({ items, rackData }: UseRackSearchProps) => {
  const [query, setQuery] = useState('');
  const [highlightedRackId, setHighlightedRackId] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  // Map items to their racks
  const itemRackMap = useMemo(() => {
    const map = new Map<string, RackData>();
    
    items.forEach(item => {
      if (!item.emplacement_prenant) return;
      
      // Extraire le code rack de l'emplacement
      const match = item.emplacement_prenant.match(/^([A-Za-z]+)/);
      if (!match) return;
      
      const rackCode = match[1].toUpperCase();
      const rack = rackData.find(r => r.rackCode === rackCode);
      
      if (rack) {
        map.set(item.id, rack);
      }
    });
    
    return map;
  }, [items, rackData]);

  // Search results
  const results = useMemo((): SearchResult[] => {
    if (!query || query.length < 2) return [];

    const q = query.toLowerCase().trim();
    const scored: SearchResult[] = [];

    items.forEach(item => {
      const rack = itemRackMap.get(item.id);
      if (!rack) return;

      // Score sur différents champs
      let bestScore = 0;
      let matchType: SearchResult['matchType'] = 'fuzzy';

      // Nom
      const nameScore = fuzzyScore(q, item.name || '');
      if (nameScore > bestScore) {
        bestScore = nameScore;
        matchType = nameScore === 1 ? 'exact' : nameScore >= 0.9 ? 'startsWith' : nameScore >= 0.7 ? 'contains' : 'fuzzy';
      }

      // EAN
      if (item.ean) {
        const eanScore = fuzzyScore(q, item.ean);
        if (eanScore > bestScore) {
          bestScore = eanScore;
          matchType = eanScore === 1 ? 'exact' : 'contains';
        }
      }

      // Désignation
      if (item.designation) {
        const desigScore = fuzzyScore(q, item.designation) * 0.8; // Poids légèrement inférieur
        if (desigScore > bestScore) {
          bestScore = desigScore;
          matchType = 'contains';
        }
      }

      // Lot
      if (item.lot) {
        const lotScore = fuzzyScore(q, item.lot);
        if (lotScore > bestScore) {
          bestScore = lotScore;
          matchType = lotScore === 1 ? 'exact' : 'contains';
        }
      }

      // Emplacement
      if (item.emplacement_prenant) {
        const empScore = fuzzyScore(q, item.emplacement_prenant);
        if (empScore > bestScore) {
          bestScore = empScore;
          matchType = empScore === 1 ? 'exact' : 'contains';
        }
      }

      if (bestScore > 0.2) {
        scored.push({ item, rack, score: bestScore, matchType });
      }
    });

    // Trier par score décroissant, max 10 résultats
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [query, items, itemRackMap]);

  // Sélectionner un résultat
  const selectResult = useCallback((result: SearchResult | null) => {
    setSelectedResult(result);
    setHighlightedRackId(result?.rack.id || null);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setSelectedResult(null);
    setHighlightedRackId(null);
  }, []);

  // Highlight temporaire (pour le hover sur les résultats)
  const highlightRack = useCallback((rackId: string | null) => {
    setHighlightedRackId(rackId);
  }, []);

  return {
    query,
    setQuery,
    results,
    selectedResult,
    selectResult,
    highlightedRackId,
    highlightRack,
    clearSearch,
    hasResults: results.length > 0
  };
};