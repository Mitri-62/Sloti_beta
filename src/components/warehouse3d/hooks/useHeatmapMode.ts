import { useState, useMemo, useCallback } from 'react';
import { RackData, WarehouseConfig } from '../types';
import { MAX_POSITIONS } from '../config';

export type HeatmapMetric = 'fillRate' | 'quantity' | 'overflow';

interface HeatmapData {
  rackId: string;
  rackCode: string;
  value: number; // 0-100 pour fillRate, quantité brute pour quantity
  normalizedValue: number; // 0-1 pour le gradient de couleur
  color: number; // Couleur hex
  label: string;
}

interface UseHeatmapModeProps {
  rackData: RackData[];
  config: WarehouseConfig;
}

// Gradient de couleurs : vert → jaune → orange → rouge
const getHeatmapColor = (value: number): number => {
  // value: 0-1
  if (value <= 0.25) {
    // Vert → Vert-jaune
    const t = value / 0.25;
    const r = Math.round(34 + t * (132 - 34));
    const g = Math.round(197 + t * (204 - 197));
    const b = Math.round(94 + t * (22 - 94));
    return (r << 16) | (g << 8) | b;
  } else if (value <= 0.5) {
    // Vert-jaune → Jaune
    const t = (value - 0.25) / 0.25;
    const r = Math.round(132 + t * (250 - 132));
    const g = Math.round(204 + t * (204 - 204));
    const b = Math.round(22 + t * (21 - 22));
    return (r << 16) | (g << 8) | b;
  } else if (value <= 0.75) {
    // Jaune → Orange
    const t = (value - 0.5) / 0.25;
    const r = Math.round(250 + t * (245 - 250));
    const g = Math.round(204 + t * (158 - 204));
    const b = Math.round(21 + t * (11 - 21));
    return (r << 16) | (g << 8) | b;
  } else {
    // Orange → Rouge
    const t = (value - 0.75) / 0.25;
    const r = Math.round(245 + t * (239 - 245));
    const g = Math.round(158 + t * (68 - 158));
    const b = Math.round(11 + t * (68 - 11));
    return (r << 16) | (g << 8) | b;
  }
};

// Couleur pour rack vide
const EMPTY_COLOR = 0x94a3b8; // Gris slate

export const useHeatmapMode = ({ rackData, config }: UseHeatmapModeProps) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [metric, setMetric] = useState<HeatmapMetric>('fillRate');

  // Calcul des données heatmap
  const heatmapData = useMemo((): Map<string, HeatmapData> => {
    const map = new Map<string, HeatmapData>();
    const totalPositionsPerRack = config.levelCount * MAX_POSITIONS;

    // Trouver le max pour normalisation (pour metric 'quantity')
    let maxQuantity = 0;
    rackData.forEach(rack => {
      let qty = 0;
      rack.stockByLevel.forEach(alv => {
        alv.slots.forEach(s => { qty += s.totalQuantity; });
      });
      if (qty > maxQuantity) maxQuantity = qty;
    });

    rackData.forEach(rack => {
      let occupiedPositions = 0;
      let totalQuantity = 0;
      let hasOverflow = false;

      rack.stockByLevel.forEach(alv => {
        if (alv.isOverflow) hasOverflow = true;
        occupiedPositions += alv.slots.size;
        alv.slots.forEach(s => { totalQuantity += s.totalQuantity; });
      });

      const fillRate = totalPositionsPerRack > 0 
        ? (occupiedPositions / totalPositionsPerRack) * 100 
        : 0;

      let value: number;
      let normalizedValue: number;
      let label: string;

      switch (metric) {
        case 'fillRate':
          value = fillRate;
          normalizedValue = fillRate / 100;
          label = `${Math.round(fillRate)}%`;
          break;
        case 'quantity':
          value = totalQuantity;
          normalizedValue = maxQuantity > 0 ? totalQuantity / maxQuantity : 0;
          label = `${totalQuantity} u.`;
          break;
        case 'overflow':
          value = hasOverflow ? 100 : 0;
          normalizedValue = hasOverflow ? 1 : 0;
          label = hasOverflow ? '⚠️' : '✓';
          break;
      }

      const color = totalQuantity === 0 && metric !== 'overflow'
        ? EMPTY_COLOR
        : getHeatmapColor(normalizedValue);

      map.set(rack.id, {
        rackId: rack.id,
        rackCode: rack.rackCode,
        value,
        normalizedValue,
        color,
        label
      });
    });

    return map;
  }, [rackData, config, metric]);

  // Stats globales
  const stats = useMemo(() => {
    const values = Array.from(heatmapData.values());
    const nonEmpty = values.filter(v => v.value > 0);
    
    if (nonEmpty.length === 0) {
      return { min: 0, max: 0, avg: 0, total: values.length, filled: 0 };
    }

    const sum = nonEmpty.reduce((acc, v) => acc + v.value, 0);
    return {
      min: Math.min(...nonEmpty.map(v => v.value)),
      max: Math.max(...nonEmpty.map(v => v.value)),
      avg: sum / nonEmpty.length,
      total: values.length,
      filled: nonEmpty.length
    };
  }, [heatmapData]);

  const toggle = useCallback(() => setIsEnabled(p => !p), []);

  const getColorForRack = useCallback((rackId: string): number | null => {
    if (!isEnabled) return null;
    return heatmapData.get(rackId)?.color || null;
  }, [isEnabled, heatmapData]);

  const getLabelForRack = useCallback((rackId: string): string | null => {
    if (!isEnabled) return null;
    return heatmapData.get(rackId)?.label || null;
  }, [isEnabled, heatmapData]);

  return {
    isEnabled,
    setIsEnabled,
    toggle,
    metric,
    setMetric,
    heatmapData,
    stats,
    getColorForRack,
    getLabelForRack
  };
};

export { getHeatmapColor, EMPTY_COLOR };