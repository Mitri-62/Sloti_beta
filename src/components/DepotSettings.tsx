// src/components/DepotSettings.tsx
// Composant pour configurer l'adresse du dépôt de l'entreprise

import { useState, useEffect } from 'react';
import { MapPin, Save, Search, Building2, Navigation, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface DepotInfo {
  depot_address: string | null;
  depot_lat: number | null;
  depot_lng: number | null;
}

interface DepotSettingsProps {
  onSave?: () => void;
  compact?: boolean;
}

export default function DepotSettings({ onSave, compact = false }: DepotSettingsProps) {
  const { user } = useAuth();
  const [depot, setDepot] = useState<DepotInfo>({
    depot_address: null,
    depot_lat: null,
    depot_lng: null
  });
  const [addressInput, setAddressInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Charger les données du dépôt
  useEffect(() => {
    loadDepot();
  }, [user?.company_id]);

  const loadDepot = async () => {
    if (!user?.company_id) return;
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('depot_address, depot_lat, depot_lng')
        .eq('id', user.company_id)
        .single();

      if (error) throw error;

      if (data) {
        setDepot({
          depot_address: data.depot_address,
          depot_lat: data.depot_lat,
          depot_lng: data.depot_lng
        });
        setAddressInput(data.depot_address || '');
      }
    } catch (error) {
      console.error('Erreur chargement dépôt:', error);
    } finally {
      setLoading(false);
    }
  };

  // Géocodage avec Nominatim (OpenStreetMap)
  const geocodeAddress = async (address: string) => {
    if (!address || address.length < 3) {
      setSuggestions([]);
      return;
    }

    setGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=fr&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'fr'
          }
        }
      );
      
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Erreur géocodage:', error);
      toast.error('Erreur lors de la recherche d\'adresse');
    } finally {
      setGeocoding(false);
    }
  };

  // Debounce pour la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (addressInput && addressInput !== depot.depot_address) {
        geocodeAddress(addressInput);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [addressInput]);

  // Sélectionner une suggestion
  const selectSuggestion = (suggestion: any) => {
    setDepot({
      depot_address: suggestion.display_name,
      depot_lat: parseFloat(suggestion.lat),
      depot_lng: parseFloat(suggestion.lon)
    });
    setAddressInput(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Utiliser la position actuelle
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée');
      return;
    }

    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocoding pour obtenir l'adresse
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'fr'
              }
            }
          );
          
          const data = await response.json();
          
          setDepot({
            depot_address: data.display_name,
            depot_lat: latitude,
            depot_lng: longitude
          });
          setAddressInput(data.display_name);
          toast.success('Position actuelle récupérée !');
        } catch (error) {
          // Si le reverse geocoding échoue, on garde juste les coordonnées
          setDepot({
            depot_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            depot_lat: latitude,
            depot_lng: longitude
          });
          setAddressInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        
        setGeocoding(false);
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        toast.error('Impossible de récupérer la position');
        setGeocoding(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Sauvegarder le dépôt
  const saveDepot = async () => {
    if (!user?.company_id) return;
    
    if (!depot.depot_lat || !depot.depot_lng) {
      toast.error('Veuillez sélectionner une adresse valide');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          depot_address: depot.depot_address,
          depot_lat: depot.depot_lat,
          depot_lng: depot.depot_lng
        })
        .eq('id', user.company_id);

      if (error) throw error;

      toast.success('Adresse du dépôt enregistrée !');
      onSave?.();
    } catch (error: any) {
      console.error('Erreur sauvegarde dépôt:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  // Version compacte pour intégration dans d'autres pages
  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Adresse du dépôt</h3>
        </div>

        {depot.depot_address ? (
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{depot.depot_address}</p>
              <p className="text-xs text-gray-500">
                {depot.depot_lat?.toFixed(4)}, {depot.depot_lng?.toFixed(4)}
              </p>
            </div>
            <Check size={16} className="text-green-600" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle size={16} />
            <span className="text-sm">Non configuré</span>
          </div>
        )}
      </div>
    );
  }

  // Version complète
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Building2 size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Adresse du dépôt</h2>
            <p className="text-blue-100 text-sm">Point de départ et retour des tournées</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Statut actuel */}
        {depot.depot_address && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-500 p-2 rounded-full">
                <Check size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-800 dark:text-green-200">Dépôt configuré</p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">{depot.depot_address}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  GPS : {depot.depot_lat?.toFixed(6)}, {depot.depot_lng?.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recherche d'adresse */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Rechercher une adresse
          </label>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {geocoding ? (
                <Loader2 size={18} className="text-gray-400 animate-spin" />
              ) : (
                <Search size={18} className="text-gray-400" />
              )}
            </div>
            
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Ex: 123 Rue de la Logistique, 62000 Arras"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start gap-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <MapPin size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {suggestion.display_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {suggestion.type} • {parseFloat(suggestion.lat).toFixed(4)}, {parseFloat(suggestion.lon).toFixed(4)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bouton position actuelle */}
          <button
            onClick={useCurrentLocation}
            disabled={geocoding}
            className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            <Navigation size={16} />
            Utiliser ma position actuelle
          </button>
        </div>

        {/* Coordonnées (lecture seule) */}
        {depot.depot_lat && depot.depot_lng && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Latitude
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-mono">
                {depot.depot_lat.toFixed(6)}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Longitude
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-mono">
                {depot.depot_lng.toFixed(6)}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>ℹ️ À quoi ça sert ?</strong>
          </p>
          <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
            <li>Point de départ pour le calcul des tournées</li>
            <li>Point de retour si "Retour dépôt" est activé</li>
            <li>Utilisé pour l'optimisation des trajets</li>
          </ul>
        </div>

        {/* Bouton sauvegarder */}
        <button
          onClick={saveDepot}
          disabled={saving || !depot.depot_lat || !depot.depot_lng}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            saving || !depot.depot_lat
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save size={18} />
              Enregistrer l'adresse du dépôt
            </>
          )}
        </button>
      </div>
    </div>
  );
}