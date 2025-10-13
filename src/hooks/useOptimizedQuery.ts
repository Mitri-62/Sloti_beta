// src/hooks/useOptimizedQuery.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { queryCache, withCache } from '../services/queryCache';
import { errorService } from '../services/errorService';

interface UseOptimizedQueryOptions {
  /** Activer la mise en cache des résultats */
  cache?: boolean;
  /** Durée de vie du cache en millisecondes */
  cacheTTL?: number;
  /** Activer les mises à jour en temps réel */
  realtime?: boolean;
  /** Filtre à appliquer sur la requête */
  filter?: Record<string, any>;
  /** Tri des résultats */
  orderBy?: { column: string; ascending?: boolean };
  /** Limiter le nombre de résultats */
  limit?: number;
  /** Colonnes à sélectionner (par défaut: '*') */
  select?: string;
  /** Dépendances pour re-fetch (comme useEffect) */
  deps?: any[];
}

interface UseOptimizedQueryResult<T> {
  /** Les données récupérées */
  data: T[];
  /** État de chargement */
  loading: boolean;
  /** Erreur éventuelle */
  error: Error | null;
  /** Recharger manuellement les données */
  refetch: () => Promise<void>;
  /** Invalider le cache et recharger */
  refresh: () => Promise<void>;
}

/**
 * Hook optimisé pour les requêtes Supabase avec cache et gestion d'erreurs
 * 
 * @example
 * // Simple
 * const { data: products, loading } = useOptimizedQuery<Product>('masterdata');
 * 
 * @example
 * // Avec cache et filtre
 * const { data: stocks, loading, refetch } = useOptimizedQuery<Stock>('stocks', {
 *   cache: true,
 *   cacheTTL: 60000, // 1 minute
 *   filter: { company_id: user?.company_id },
 *   realtime: true,
 * });
 */
export function useOptimizedQuery<T extends Record<string, any> = Record<string, any>>(
  table: string,
  options: UseOptimizedQueryOptions = {}
): UseOptimizedQueryResult<T> {
  const {
    cache = false,
    cacheTTL = 5 * 60 * 1000,
    realtime = false,
    filter = {},
    orderBy,
    limit,
    select = '*',
    deps = [],
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Générer une clé de cache unique basée sur les paramètres
  const cacheKey = `${table}_${JSON.stringify(filter)}_${select}_${orderBy?.column || 'default'}`;

  /**
   * Fonction de fetch principale
   */
  const fetchData = useCallback(async (skipCache = false) => {
    setLoading(true);
    setError(null);

    try {
      let result: T[];

      // Si cache activé et pas de skip
      if (cache && !skipCache) {
        result = await withCache<T[]>(
          cacheKey,
          async () => {
            const { data: fetchedData, error: fetchError } = await buildQuery<T>(
              table,
              { filter, orderBy, limit, select }
            );

            if (fetchError) throw fetchError;
            return fetchedData || [];
          },
          cacheTTL
        );
      } else {
        // Fetch direct sans cache
        const { data: fetchedData, error: fetchError } = await buildQuery<T>(
          table,
          { filter, orderBy, limit, select }
        );

        if (fetchError) throw fetchError;
        result = fetchedData || [];

        // Mettre en cache si activé
        if (cache) {
          queryCache.set(cacheKey, result);
        }
      }

      setData(result);
    } catch (err) {
      const appError = err instanceof Error ? err : new Error('Unknown error');
      setError(appError);
      errorService.handle(err, `useOptimizedQuery: ${table}`);
    } finally {
      setLoading(false);
    }
  }, [table, cacheKey, cache, cacheTTL, JSON.stringify(filter), orderBy, limit, select]);

  /**
   * Recharger depuis le cache ou serveur
   */
  const refetch = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  /**
   * Forcer le refresh (bypass cache)
   */
  const refresh = useCallback(async () => {
    queryCache.invalidate(cacheKey);
    await fetchData(true);
  }, [fetchData, cacheKey]);

  // Charger les données au montage et quand les deps changent
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...deps]);

  // Gestion du realtime
  useEffect(() => {
    if (!realtime) return;

    console.log(`🔄 Realtime activé pour ${table}`);

    const channel = supabase
      .channel(`${table}_changes_${cacheKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: Object.keys(filter).length > 0 
            ? Object.entries(filter).map(([key, val]) => `${key}=eq.${val}`).join(',')
            : undefined,
        },
        (payload) => {
          console.log(`📡 Realtime event for ${table}:`, payload.eventType);
          
          // Invalider le cache et recharger
          if (cache) {
            queryCache.invalidate(cacheKey);
          }
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      console.log(`🔌 Realtime désactivé pour ${table}`);
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, realtime, cacheKey, cache]);

  return {
    data,
    loading,
    error,
    refetch,
    refresh,
  };
}

/**
 * Helper pour construire les requêtes Supabase
 */
async function buildQuery<T>(
  table: string,
  options: {
    filter?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    select?: string;
  }
) {
  let query = supabase.from(table).select(options.select || '*');

  // Appliquer les filtres
  if (options.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  // Appliquer le tri
  if (options.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true,
    });
  }

  // Appliquer la limite
  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query as unknown as { data: T[] | null; error: any };
}

/**
 * Hook pour une requête unique (single row)
 */
export function useOptimizedQuerySingle<T extends Record<string, any> = Record<string, any>>(
  table: string,
  id: string | null,
  options: Omit<UseOptimizedQueryOptions, 'limit'> = {}
): Omit<UseOptimizedQueryResult<T>, 'data'> & { data: T | null } {
  const { data, loading, error, refetch, refresh } = useOptimizedQuery<T>(
    table,
    {
      ...options,
      filter: { ...options.filter, id },
      limit: 1,
      deps: [id, ...(options.deps || [])],
    }
  );

  return {
    data: data[0] || null,
    loading,
    error,
    refetch,
    refresh,
  };
}