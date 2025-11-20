// src/services/osrmService.ts
import { RouteCacheService } from './routeCacheService';

interface OSRMRoute {
  distance: number; // en mètres
  duration: number; // en secondes
  geometry?: any;
}

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

// ✅ NOUVEAU : Interface pour les informations du véhicule
interface VehicleProfile {
  weight_kg?: number;
  height_m?: number;
  length_m?: number;
  width_m?: number;
}

export class OSRMService {
  private static readonly OSRM_BASE_URL = 'https://router.project-osrm.org';
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 seconde

  /**
   * ✅ MODIFIÉ : Détermine le profil de routing selon le véhicule
   */
  private static getRoutingProfile(vehicle?: VehicleProfile): string {
    // Par défaut : profil voiture
    if (!vehicle) return 'driving';

    // Si le véhicule fait plus de 3.5T → Profil poids lourd
    if (vehicle.weight_kg && vehicle.weight_kg > 3500) {
      return 'driving'; // Note: OSRM public n'a pas de profil HGV, mais on peut l'ajouter avec une instance personnalisée
    }

    return 'driving';
  }

  /**
   * ✅ MODIFIÉ : Génère une clé de cache incluant le profil véhicule
   */
  private static getCacheKey(coords: RouteCoordinates, vehicle?: VehicleProfile): string {
    const profile = this.getRoutingProfile(vehicle);
    return `${coords.from.lat},${coords.from.lng}-${coords.to.lat},${coords.to.lng}-${profile}`;
  }

  /**
   * ✅ MODIFIÉ : Calcule une route avec cache intelligent et profil véhicule
   */
  static async getRoute(
    coords: RouteCoordinates, 
    vehicle?: VehicleProfile
  ): Promise<RouteResult | null> {
    const profile = this.getRoutingProfile(vehicle);
    
    // 1. D'abord chercher dans le cache (avec le profil inclus)
    const cachedRoute = await RouteCacheService.getRoute(coords, profile);
    
    if (cachedRoute) {
      console.log(`✅ Route trouvée dans le cache (profil: ${profile})`);
      return {
        distance_km: cachedRoute.distance_km,
        duration_minutes: cachedRoute.duration_minutes,
        geometry: cachedRoute.route_geometry,
        fromCache: true
      };
    }

    // 2. Si pas dans le cache, appeler OSRM avec le bon profil
    console.log(`🌐 Appel OSRM pour calculer la route (profil: ${profile})...`);
    const osrmResult = await this.callOSRM(coords, profile);

    if (!osrmResult) {
      // 3. Fallback : estimation basique si OSRM échoue
      console.warn('⚠️ OSRM a échoué, utilisation du fallback');
      return this.fallbackEstimate(coords, vehicle);
    }

    // 4. Sauvegarder dans le cache pour les prochaines fois
    const distance_km = osrmResult.distance / 1000;
    const duration_minutes = osrmResult.duration / 60;

    await RouteCacheService.saveRoute(
      coords,
      duration_minutes,
      distance_km,
      JSON.stringify(osrmResult.geometry),
      profile
    );

    return {
      distance_km,
      duration_minutes,
      geometry: osrmResult.geometry,
      fromCache: false
    };
  }

  /**
   * ✅ MODIFIÉ : Appelle l'API OSRM avec le profil approprié
   */
  private static async callOSRM(
    coords: RouteCoordinates,
    profile: string = 'driving',
    retryCount = 0
  ): Promise<OSRMRoute | null> {
    try {
      // ✅ Utilisation du profil dans l'URL
      const url = `${this.OSRM_BASE_URL}/route/v1/${profile}/${coords.from.lng},${coords.from.lat};${coords.to.lng},${coords.to.lat}?overview=full&geometries=geojson`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      return data.routes[0];

    } catch (error) {
      console.error(`Erreur OSRM (tentative ${retryCount + 1}/${this.MAX_RETRIES}):`, error);

      // Retry avec délai exponentiel
      if (retryCount < this.MAX_RETRIES - 1) {
        const delay = this.RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callOSRM(coords, profile, retryCount + 1);
      }

      return null;
    }
  }

  /**
   * ✅ MODIFIÉ : Estimation de secours avec ajustement selon le type de véhicule
   */
  private static fallbackEstimate(
    coords: RouteCoordinates, 
    vehicle?: VehicleProfile
  ): RouteResult {
    const distance_km = this.haversineDistance(
      coords.from.lat,
      coords.from.lng,
      coords.to.lat,
      coords.to.lng
    );

    // ✅ Ajustement selon le type de véhicule
    let detourFactor = 1.3; // Facteur de détour par défaut
    let averageSpeed = 50; // km/h par défaut

    if (vehicle?.weight_kg && vehicle.weight_kg > 3500) {
      detourFactor = 1.4; // Poids lourds font plus de détours (évitement centres-villes, etc.)
      averageSpeed = 45; // Vitesse moyenne plus faible pour les PL
    }

    const adjustedDistance = distance_km * detourFactor;
    const duration_minutes = (adjustedDistance / averageSpeed) * 60;

    return {
      distance_km: adjustedDistance,
      duration_minutes,
      fromCache: false
    };
  }

  /**
   * Calcul de distance à vol d'oiseau (formule de Haversine)
   */
  private static haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * ✅ MODIFIÉ : Calcule plusieurs routes en batch avec profil véhicule
   */
  static async getRoutesInBatch(
    routes: RouteCoordinates[],
    vehicle?: VehicleProfile
  ): Promise<(RouteResult | null)[]> {
    const results: (RouteResult | null)[] = [];

    // Traiter par lots de 5 pour ne pas surcharger OSRM
    const batchSize = 5;
    for (let i = 0; i < routes.length; i += batchSize) {
      const batch = routes.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(coords => this.getRoute(coords, vehicle))
      );
      results.push(...batchResults);

      // Petit délai entre les batches
      if (i + batchSize < routes.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * ✅ NOUVEAU : Utilitaire pour créer un VehicleProfile depuis un objet véhicule
   */
  static createVehicleProfile(vehicle: {
    capacity_kg?: number;
    height_m?: number;
    length_m?: number;
    width_m?: number;
  }): VehicleProfile {
    return {
      weight_kg: vehicle.capacity_kg,
      height_m: vehicle.height_m,
      length_m: vehicle.length_m,
      width_m: vehicle.width_m
    };
  }
}