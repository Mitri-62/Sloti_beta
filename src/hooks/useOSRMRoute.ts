// src/hooks/useOSRMRoute.ts
import { useState, useCallback } from 'react';
import { OSRMService } from '../services/osrmService';

interface RouteCoordinates {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

interface RouteResult {
  distance_km: number;
  duration_minutes: number;
  geometry?: any;
  fromCache: boolean;
}

export function useOSRMRoute() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(async (
    coords: RouteCoordinates
  ): Promise<RouteResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await OSRMService.getRoute(coords);
      
      if (!result) {
        setError('Impossible de calculer la route');
        return null;
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateMultipleRoutes = useCallback(async (
    routes: RouteCoordinates[]
  ): Promise<(RouteResult | null)[]> => {
    setLoading(true);
    setError(null);

    try {
      const results = await OSRMService.getRoutesInBatch(routes);
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    calculateRoute,
    calculateMultipleRoutes,
    loading,
    error
  };
}