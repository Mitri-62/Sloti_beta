// src/services/routeCacheService.ts
import { supabase } from '../supabaseClient';

interface CachedRoute {
  id: string;
  from_lat: number;
  from_lng: number;
  to_lat: number;
  to_lng: number;
  duration_minutes: number;
  distance_km: number;
  route_geometry?: string;
  vehicle_profile?: string; // ✅ NOUVEAU : Profil du véhicule (driving, driving-hgv, etc.)
  created_at: string;
  last_used_at: string;
  hit_count: number;
}

interface RouteCoordinates {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

export class RouteCacheService {
  private static readonly CACHE_PRECISION = 6; // Nombre de décimales pour arrondir les coordonnées

  /**
   * Arrondit les coordonnées pour améliorer les hits du cache
   */
  private static roundCoordinate(value: number): number {
    const factor = Math.pow(10, this.CACHE_PRECISION);
    return Math.round(value * factor) / factor;
  }

  /**
   * ✅ MODIFIÉ : Recherche une route dans le cache avec profil véhicule
   */
  static async getRoute(
    coords: RouteCoordinates, 
    vehicleProfile: string = 'driving'
  ): Promise<CachedRoute | null> {
    const fromLat = this.roundCoordinate(coords.from.lat);
    const fromLng = this.roundCoordinate(coords.from.lng);
    const toLat = this.roundCoordinate(coords.to.lat);
    const toLng = this.roundCoordinate(coords.to.lng);

    // ✅ Inclure le profil véhicule dans la recherche
    const { data, error } = await supabase
      .from('route_cache')
      .select('*')
      .eq('from_lat', fromLat)
      .eq('from_lng', fromLng)
      .eq('to_lat', toLat)
      .eq('to_lng', toLng)
      .eq('vehicle_profile', vehicleProfile)
      .single();

    if (error || !data) {
      return null;
    }

    // Mettre à jour last_used_at et hit_count
    await this.updateUsage(data.id);

    return data;
  }

  /**
   * ✅ MODIFIÉ : Sauvegarde une route dans le cache avec profil véhicule
   */
  static async saveRoute(
    coords: RouteCoordinates,
    duration_minutes: number,
    distance_km: number,
    route_geometry?: string,
    vehicleProfile: string = 'driving'
  ): Promise<string | null> {
    const fromLat = this.roundCoordinate(coords.from.lat);
    const fromLng = this.roundCoordinate(coords.from.lng);
    const toLat = this.roundCoordinate(coords.to.lat);
    const toLng = this.roundCoordinate(coords.to.lng);

    try {
      // ✅ Vérifier si l'entrée existe déjà pour ce profil
      const { data: existing } = await supabase
        .from('route_cache')
        .select('id')
        .eq('from_lat', fromLat)
        .eq('from_lng', fromLng)
        .eq('to_lat', toLat)
        .eq('to_lng', toLng)
        .eq('vehicle_profile', vehicleProfile)
        .single();

      if (existing) {
        // Mettre à jour l'entrée existante
        const { data, error } = await supabase
          .from('route_cache')
          .update({
            duration_minutes,
            distance_km,
            route_geometry,
            last_used_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select('id')
          .single();

        if (error) {
          console.error('Erreur lors de la mise à jour du cache:', error);
          return null;
        }

        return data.id;
      } else {
        // Créer une nouvelle entrée
        const { data, error } = await supabase
          .from('route_cache')
          .insert({
            from_lat: fromLat,
            from_lng: fromLng,
            to_lat: toLat,
            to_lng: toLng,
            duration_minutes,
            distance_km,
            route_geometry,
            vehicle_profile: vehicleProfile,
            hit_count: 0,
            created_at: new Date().toISOString(),
            last_used_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (error) {
          console.error('Erreur lors de la création du cache:', error);
          return null;
        }

        return data.id;
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du cache:', error);
      return null;
    }
  }

  /**
   * Met à jour l'utilisation d'une route en cache
   */
  private static async updateUsage(routeId: string): Promise<void> {
    try {
      // Récupérer le hit_count actuel
      const { data: current } = await supabase
        .from('route_cache')
        .select('hit_count')
        .eq('id', routeId)
        .single();

      if (current) {
        await supabase
          .from('route_cache')
          .update({
            last_used_at: new Date().toISOString(),
            hit_count: (current.hit_count || 0) + 1
          })
          .eq('id', routeId);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du hit_count:', error);
    }
  }

  /**
   * ✅ NOUVEAU : Nettoie les anciennes entrées du cache par profil
   */
  static async cleanOldCache(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('route_cache')
      .delete()
      .lt('last_used_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('Erreur lors du nettoyage du cache:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * ✅ MODIFIÉ : Statistiques du cache avec détails par profil
   */
  static async getCacheStats(): Promise<{
    total: number;
    byProfile: { profile: string; count: number }[];
    mostUsed: CachedRoute[];
    oldestEntries: CachedRoute[];
  } | null> {
    try {
      // Nombre total d'entrées
      const { count } = await supabase
        .from('route_cache')
        .select('*', { count: 'exact', head: true });

      // ✅ Statistiques par profil véhicule
      const { data: profileStats } = await supabase
        .from('route_cache')
        .select('vehicle_profile')
        .order('vehicle_profile');

      const byProfile = profileStats?.reduce((acc: any[], item) => {
        const profile = item.vehicle_profile || 'driving';
        const existing = acc.find(p => p.profile === profile);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ profile, count: 1 });
        }
        return acc;
      }, []) || [];

      // Entrées les plus utilisées
      const { data: mostUsed } = await supabase
        .from('route_cache')
        .select('*')
        .order('hit_count', { ascending: false })
        .limit(10);

      // Entrées les plus anciennes
      const { data: oldestEntries } = await supabase
        .from('route_cache')
        .select('*')
        .order('last_used_at', { ascending: true })
        .limit(10);

      return {
        total: count || 0,
        byProfile,
        mostUsed: mostUsed || [],
        oldestEntries: oldestEntries || []
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
      return null;
    }
  }

  /**
   * ✅ NOUVEAU : Invalide le cache pour une paire de coordonnées (tous profils)
   */
  static async invalidateRoute(coords: RouteCoordinates): Promise<number> {
    const fromLat = this.roundCoordinate(coords.from.lat);
    const fromLng = this.roundCoordinate(coords.from.lng);
    const toLat = this.roundCoordinate(coords.to.lat);
    const toLng = this.roundCoordinate(coords.to.lng);

    const { data, error } = await supabase
      .from('route_cache')
      .delete()
      .eq('from_lat', fromLat)
      .eq('from_lng', fromLng)
      .eq('to_lat', toLat)
      .eq('to_lng', toLng)
      .select('id');

    if (error) {
      console.error('Erreur lors de l\'invalidation du cache:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * ✅ NOUVEAU : Pré-remplir le cache pour des routes fréquentes
   */
  static async warmCache(
    routes: { coords: RouteCoordinates; profile?: string }[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const route of routes) {
      try {
        const cached = await this.getRoute(route.coords, route.profile || 'driving');
        if (!cached) {
          // Route pas en cache, on devrait la calculer ici
          // Pour l'instant on skip
          failed++;
        } else {
          success++;
        }
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
  }
}