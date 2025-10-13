// src/services/queryCache.ts
/**
 * Service de cache pour éviter les requêtes répétées à Supabase
 * Utilise un TTL (Time To Live) pour invalider automatiquement les données obsolètes
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
  }
  
  class QueryCache {
    private cache = new Map<string, CacheEntry<any>>();
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes par défaut
  
    /**
     * Récupère une donnée du cache si elle est encore valide
     * @param key - Clé unique pour identifier la donnée
     * @param ttl - Durée de vie en millisecondes (optionnel)
     * @returns Les données en cache ou null si expirées/absentes
     */
    get<T>(key: string, ttl: number = this.DEFAULT_TTL): T | null {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return null;
      }
  
      const isExpired = Date.now() - entry.timestamp > ttl;
      
      if (isExpired) {
        this.cache.delete(key);
        return null;
      }
  
      console.log(`✅ Cache HIT: ${key}`);
      return entry.data;
    }
  
    /**
     * Stocke une donnée dans le cache
     * @param key - Clé unique pour identifier la donnée
     * @param data - Les données à mettre en cache
     */
    set<T>(key: string, data: T): void {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });
      console.log(`💾 Cache SET: ${key}`);
    }
  
    /**
     * Invalide une entrée spécifique du cache
     * @param key - Clé de l'entrée à invalider
     */
    invalidate(key: string): void {
      const deleted = this.cache.delete(key);
      if (deleted) {
        console.log(`🗑️ Cache INVALIDATE: ${key}`);
      }
    }
  
    /**
     * Invalide toutes les entrées correspondant à un pattern
     * @param pattern - Pattern pour matcher les clés (ex: "products_*")
     */
    invalidatePattern(pattern: string): void {
      const regex = new RegExp(pattern.replace('*', '.*'));
      let count = 0;
  
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          count++;
        }
      }
  
      if (count > 0) {
        console.log(`🗑️ Cache INVALIDATE PATTERN: ${pattern} (${count} entrées)`);
      }
    }
  
    /**
     * Vide complètement le cache
     */
    clear(): void {
      this.cache.clear();
      console.log('🗑️ Cache CLEARED');
    }
  
    /**
     * Retourne des statistiques sur le cache
     */
    getStats() {
      return {
        size: this.cache.size,
        keys: Array.from(this.cache.keys()),
      };
    }
  }
  
  // Instance singleton
  export const queryCache = new QueryCache();
  
  /**
   * Hook utilitaire pour utiliser le cache facilement
   * @example
   * const products = await withCache('products_list', () => 
   *   supabase.from('masterdata').select()
   * );
   */
  export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Vérifier le cache d'abord
    const cached = queryCache.get<T>(key, ttl);
    if (cached !== null) {
      return cached;
    }
  
    // Sinon, fetch et mettre en cache
    console.log(`⏳ Cache MISS: ${key} - Fetching...`);
    const data = await fetcher();
    queryCache.set(key, data);
    
    return data;
  }