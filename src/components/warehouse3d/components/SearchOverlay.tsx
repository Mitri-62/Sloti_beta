import { FC, useRef, useEffect } from 'react';
import { Search, X, MapPin, Package, Hash, Navigation } from 'lucide-react';
import { StockItem, RackData } from '../types';

interface SearchResult {
  item: StockItem;
  rack: RackData;
  score: number;
  matchType: 'exact' | 'startsWith' | 'contains' | 'fuzzy';
}

interface SearchOverlayProps {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  selectedResult: SearchResult | null;
  onSelectResult: (result: SearchResult) => void;
  onHoverResult: (rackId: string | null) => void;
  onClear: () => void;
  onFlyTo: (result: SearchResult) => void;
  isDark: boolean;
}

export const SearchOverlay: FC<SearchOverlayProps> = ({
  query,
  setQuery,
  results,
  selectedResult,
  onSelectResult,
  onHoverResult,
  onClear,
  onFlyTo,
  isDark
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Ctrl+K ou Cmd+K pour focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && query) {
        onClear();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [query, onClear]);

  const matchBadge = (type: SearchResult['matchType']) => {
    const styles = {
      exact: 'bg-green-500 text-white',
      startsWith: 'bg-blue-500 text-white',
      contains: 'bg-amber-500 text-white',
      fuzzy: 'bg-slate-400 text-white'
    };
    const labels = {
      exact: 'Exact',
      startsWith: 'Début',
      contains: 'Contient',
      fuzzy: 'Approx.'
    };
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-80">
      {/* Search input */}
      <div className={`relative rounded-xl shadow-lg ${
        isDark ? 'bg-gray-800' : 'bg-white'
      } ${results.length > 0 ? 'rounded-b-none' : ''}`}>
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un article... (Ctrl+K)"
          className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none ${
            isDark 
              ? 'bg-gray-800 text-white placeholder-slate-500' 
              : 'bg-white text-slate-900 placeholder-slate-400'
          } ${results.length > 0 ? 'rounded-b-none' : ''}`}
        />
        {query && (
          <button
            onClick={onClear}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {results.length > 0 && (
        <div className={`rounded-b-xl shadow-lg border-t max-h-80 overflow-y-auto ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'
        }`}>
          {results.map((result, idx) => {
            const isSelected = selectedResult?.item.id === result.item.id;
            return (
              <div
                key={result.item.id || idx}
                onMouseEnter={() => onHoverResult(result.rack.id)}
                onMouseLeave={() => onHoverResult(null)}
                onClick={() => onSelectResult(result)}
                className={`p-3 cursor-pointer transition-colors ${
                  isSelected
                    ? isDark ? 'bg-blue-600' : 'bg-blue-50'
                    : isDark ? 'hover:bg-gray-700' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      isSelected && !isDark ? 'text-blue-900' : ''
                    }`}>
                      {result.item.name}
                    </p>
                    {result.item.designation && (
                      <p className={`text-xs truncate mt-0.5 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {result.item.designation}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs flex items-center gap-1 ${
                        isDark ? 'text-cyan-400' : 'text-cyan-600'
                      }`}>
                        <MapPin className="w-3 h-3" />
                        {result.item.emplacement_prenant}
                      </span>
                      {result.item.ean && (
                        <span className={`text-xs flex items-center gap-1 ${
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          <Hash className="w-3 h-3" />
                          {result.item.ean}
                        </span>
                      )}
                      <span className={`text-xs flex items-center gap-1 ${
                        isDark ? 'text-green-400' : 'text-green-600'
                      }`}>
                        <Package className="w-3 h-3" />
                        {result.item.quantity}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {matchBadge(result.matchType)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlyTo(result);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDark 
                          ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                      title="Aller au rack"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No results */}
      {query.length >= 2 && results.length === 0 && (
        <div className={`rounded-b-xl shadow-lg border-t p-4 text-center ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'
        }`}>
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Aucun article trouvé pour "{query}"
          </p>
        </div>
      )}

      {/* Selected result info */}
      {selectedResult && (
        <div className={`mt-2 p-3 rounded-xl shadow-lg ${
          isDark ? 'bg-green-900/50 border border-green-700' : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-green-700' : 'bg-green-500'}`}>
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-green-200' : 'text-green-800'}`}>
                Rack {selectedResult.rack.rackCode}
              </p>
              <p className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                Article localisé • {selectedResult.item.quantity} unités
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};