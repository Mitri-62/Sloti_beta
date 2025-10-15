// src/hooks/useOptimizedQuery.ts - VERSION CORRIGÉE
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { queryCache, withCache } from '../services/queryCache';
import { errorService } from '../services/errorService';

interface UseOptimizedQueryOptions {
  cache?: boolean;
  cacheTTL?: number;
  realtime?: boolean;
  filter?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  select?: string;
  deps?: any[];
}

interface UseOptimizedQueryResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

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

  // ✅ CRITIQUE : Mémoriser le filterString pour éviter les re-renders
  const filterString = useMemo(() => JSON.stringify(filter), [JSON.stringify(filter)]);
  const orderByString = useMemo(() => JSON.stringify(orderBy), [JSON.stringify(orderBy)]);

  // ✅ Générer une clé de cache stable
  const cacheKey = useMemo(
    () => `${table}_${filterString}_${select}_${orderByString}`,
    [table, filterString, select, orderByString]
  );

  // ✅ Utiliser useRef pour éviter de recréer fetchData
  const fetchDataRef = useRef<(skipCache?: boolean) => Promise<void>>();

  fetchDataRef.current = useCallback(async (skipCache = false) => {
    setLoading(true);
    setError(null);

    try {
      let result: T[];

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
        const { data: fetchedData, error: fetchError } = await buildQuery<T>(
          table,
          { filter, orderBy, limit, select }
        );

        if (fetchError) throw fetchError;
        result = fetchedData || [];

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
  }, [table, cacheKey, cache, cacheTTL, filterString, orderByString, limit, select]);

  // ✅ Wrapper stable pour fetchData
  const fetchData = useCallback(async (skipCache = false) => {
    await fetchDataRef.current?.(skipCache);
  }, []);

  const refetch = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  const refresh = useCallback(async () => {
    queryCache.invalidate(cacheKey);
    await fetchData(true);
  }, [fetchData, cacheKey]);

  // ✅ CRITIQUE : useEffect stable avec depsString
  const depsString = useMemo(() => JSON.stringify(deps), [JSON.stringify(deps)]);

  useEffect(() => {
    fetchData();
  }, [fetchData, depsString]); // ✅ depsString au lieu de ...deps

  // ✅ Realtime avec cleanup approprié
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
  }, [table, realtime, cacheKey, cache, fetchData, filterString]); // ✅ filterString au lieu de filter

  return {
    data,
    loading,
    error,
    refetch,
    refresh,
  };
}

// ✅ Helper pour construire les requêtes
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

  if (options.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  if (options.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true,
    });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query as unknown as { data: T[] | null; error: any };
}

// ✅ Hook pour requête unique
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