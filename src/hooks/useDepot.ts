// src/hooks/useDepot.ts
// Hook pour récupérer l'adresse du dépôt de l'entreprise

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface DepotLocation {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isConfigured: boolean;
}

interface UseDepotReturn {
  depot: DepotLocation;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDepot(): UseDepotReturn {
  const { user } = useAuth();
  const [depot, setDepot] = useState<DepotLocation>({
    address: null,
    latitude: null,
    longitude: null,
    isConfigured: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepot = async () => {
    if (!user?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('depot_address, depot_lat, depot_lng')
        .eq('id', user.company_id)
        .single();

      if (fetchError) throw fetchError;

      const isConfigured = !!(data?.depot_lat && data?.depot_lng);
      
      setDepot({
        address: data?.depot_address || null,
        latitude: data?.depot_lat || null,
        longitude: data?.depot_lng || null,
        isConfigured
      });
    } catch (err: any) {
      console.error('Erreur chargement dépôt:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepot();
  }, [user?.company_id]);

  return {
    depot,
    loading,
    error,
    refetch: fetchDepot
  };
}

/**
 * Fonction utilitaire pour obtenir le point de départ d'une tournée
 * Priorité : GPS chauffeur > Dépôt entreprise > Position véhicule > Défaut
 */
export function getStartLocationWithDepot(options: {
  driverGps?: { latitude: number; longitude: number } | null;
  depot?: { latitude: number | null; longitude: number | null };
  vehicleLocation?: { latitude: number; longitude: number } | null;
  defaultLocation?: { latitude: number; longitude: number };
}): {
  latitude: number;
  longitude: number;
  source: 'driver_gps' | 'depot' | 'vehicle' | 'default';
} {
  const { driverGps, depot, vehicleLocation, defaultLocation } = options;

  // 1. Position GPS temps réel du chauffeur (pour tournée en cours)
  if (driverGps?.latitude && driverGps?.longitude) {
    return {
      latitude: driverGps.latitude,
      longitude: driverGps.longitude,
      source: 'driver_gps'
    };
  }

  // 2. Dépôt de l'entreprise (pour planification)
  if (depot?.latitude && depot?.longitude) {
    return {
      latitude: depot.latitude,
      longitude: depot.longitude,
      source: 'depot'
    };
  }

  // 3. Position du véhicule (garage)
  if (vehicleLocation?.latitude && vehicleLocation?.longitude) {
    return {
      latitude: vehicleLocation.latitude,
      longitude: vehicleLocation.longitude,
      source: 'vehicle'
    };
  }

  // 4. Position par défaut (Arras)
  const fallback = defaultLocation || { latitude: 50.2928, longitude: 2.7828 };
  return {
    latitude: fallback.latitude,
    longitude: fallback.longitude,
    source: 'default'
  };
}