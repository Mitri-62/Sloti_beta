// src/components/AddressAutocomplete.tsx
import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Store } from 'lucide-react';
import { GeocodingService, type AddressSuggestion } from '../services/geocodingService';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Entrez une adresse...",
  className = ""
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Fermer les suggestions si clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rechercher les suggestions avec debounce
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    timeoutRef.current = setTimeout(async () => {
      try {
        // Utiliser searchPlaces pour inclure les commerces
        const results = await GeocodingService.searchPlaces(value, 5);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('Erreur recherche:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setSelectedIndex(-1);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.display_name);
    onSelect(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Détecter si c'est un commerce
  const isCommerce = (suggestion: AddressSuggestion): boolean => {
    return /leclerc|carrefour|auchan|intermarché|lidl|super|hyper|magasin/i.test(
      suggestion.address || suggestion.display_name
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${className}`}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 animate-spin" />
        )}
      </div>

      {/* Liste des suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => {
            const isBusiness = isCommerce(suggestion);
            
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors ${
                  index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {isBusiness ? (
                    <Store className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
                  ) : (
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {suggestion.address || suggestion.display_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {suggestion.postcode && `${suggestion.postcode}, `}
                      {suggestion.city}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Message si aucun résultat */}
      {showSuggestions && !isLoading && value.length >= 3 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Aucune adresse trouvée
        </div>
      )}
    </div>
  );
}