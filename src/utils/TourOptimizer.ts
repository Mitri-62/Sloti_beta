// src/utils/TourOptimizer.ts
// Algorithme d'optimisation de tournées avec contraintes temps et capacité

export interface Stop {
    id: string;
    address: string;
    latitude: number;
    longitude: number;
    time_window_start: string;
    time_window_end: string;
    service_duration: number;
    weight_kg: number;
    volume_m3: number;
    priority: 'high' | 'medium' | 'low';
  }
  
  export interface Vehicle {
    max_capacity_kg: number;
    max_volume_m3: number;
    avg_speed_kmh: number;
  }
  
  export interface OptimizedTour {
    stops: Stop[];
    total_distance: number;
    total_duration: number;
    estimated_arrival_times: string[];
    feasibility_score: number;
  }
  
  /**
   * Calcule la distance haversine entre deux points GPS
   */
  function haversineDistance(
    lat1: number, lon1: number, 
    lat2: number, lon2: number
  ): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  /**
   * Convertit HH:MM en minutes depuis minuit
   */
  function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
  
  /**
   * Convertit minutes en HH:MM
   */
  function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  
  /**
   * Algorithme du plus proche voisin
   */
  function nearestNeighborTSP(
    stops: Stop[],
    startLocation: { latitude: number; longitude: number },
    vehicle: Vehicle
  ): Stop[] {
    const unvisited = [...stops];
    const route: Stop[] = [];
    let current = startLocation;
    
    while (unvisited.length > 0) {
      let nearest: Stop | null = null;
      let minDistance = Infinity;
      let bestIndex = -1;
      
      for (let i = 0; i < unvisited.length; i++) {
        const stop = unvisited[i];
        const distance = haversineDistance(
          current.latitude, current.longitude,
          stop.latitude, stop.longitude
        );
        
        const totalWeight = route.reduce((sum, s) => sum + s.weight_kg, 0) + stop.weight_kg;
        const totalVolume = route.reduce((sum, s) => sum + s.volume_m3, 0) + stop.volume_m3;
        
        if (totalWeight > vehicle.max_capacity_kg || totalVolume > vehicle.max_volume_m3) {
          continue;
        }
        
        const priorityBonus = stop.priority === 'high' ? -5 : 
                             stop.priority === 'medium' ? 0 : 5;
        
        const adjustedDistance = distance + priorityBonus;
        
        if (adjustedDistance < minDistance) {
          minDistance = adjustedDistance;
          nearest = stop;
          bestIndex = i;
        }
      }
      
      if (nearest) {
        route.push(nearest);
        unvisited.splice(bestIndex, 1);
        current = { latitude: nearest.latitude, longitude: nearest.longitude };
      } else {
        break;
      }
    }
    
    return route;
  }
  
  /**
   * Optimisation 2-opt
   */
  function twoOptImprovement(route: Stop[]): Stop[] {
    let improved = true;
    let bestRoute = [...route];
    let iterations = 0;
    const maxIterations = 100;
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      for (let i = 1; i < bestRoute.length - 1; i++) {
        for (let j = i + 1; j < bestRoute.length; j++) {
          const newRoute = [...bestRoute];
          const segment = newRoute.slice(i, j + 1).reverse();
          newRoute.splice(i, segment.length, ...segment);
          
          const oldDist = calculateTotalDistance(bestRoute);
          const newDist = calculateTotalDistance(newRoute);
          
          if (newDist < oldDist) {
            bestRoute = newRoute;
            improved = true;
          }
        }
      }
    }
    
    return bestRoute;
  }
  
  /**
   * Calcule la distance totale
   */
  function calculateTotalDistance(route: Stop[]): number {
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      total += haversineDistance(
        route[i].latitude, route[i].longitude,
        route[i + 1].latitude, route[i + 1].longitude
      );
    }
    return total;
  }
  
  /**
   * Vérifie la faisabilité des créneaux horaires
   */
  function checkTimeWindowsFeasibility(
    route: Stop[],
    startTime: string,
    vehicle: Vehicle
  ): { feasible: boolean; arrivalTimes: string[]; violations: string[] } {
    let currentTime = timeToMinutes(startTime);
    const arrivalTimes: string[] = [];
    const violations: string[] = [];
    
    for (let i = 0; i < route.length; i++) {
      const stop = route[i];
      
      if (i > 0) {
        const distance = haversineDistance(
          route[i-1].latitude, route[i-1].longitude,
          stop.latitude, stop.longitude
        );
        const travelTime = (distance / vehicle.avg_speed_kmh) * 60;
        currentTime += travelTime;
      }
      
      const windowStart = timeToMinutes(stop.time_window_start);
      const windowEnd = timeToMinutes(stop.time_window_end);
      
      if (currentTime < windowStart) {
        currentTime = windowStart;
      } else if (currentTime > windowEnd) {
        violations.push(`${stop.address}: arrivée ${minutesToTime(currentTime)} après ${stop.time_window_end}`);
      }
      
      arrivalTimes.push(minutesToTime(currentTime));
      currentTime += stop.service_duration;
    }
    
    return {
      feasible: violations.length === 0,
      arrivalTimes,
      violations
    };
  }
  
  /**
   * FONCTION PRINCIPALE : Optimise une tournée complète
   */
  export function optimizeTour(
    stops: Stop[],
    startLocation: { latitude: number; longitude: number },
    vehicle: Vehicle,
    startTime: string
  ): OptimizedTour {
    
    // Trier par priorité puis fenêtre horaire
    const sortedStops = [...stops].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return timeToMinutes(a.time_window_start) - timeToMinutes(b.time_window_start);
    });
    
    // Algorithme du plus proche voisin
    let optimizedRoute = nearestNeighborTSP(sortedStops, startLocation, vehicle);
    
    // Amélioration 2-opt
    if (optimizedRoute.length > 3) {
      optimizedRoute = twoOptImprovement(optimizedRoute);
    }
    
    // Calculs finaux
    const totalDistance = calculateTotalDistance(optimizedRoute);
    const timeCheck = checkTimeWindowsFeasibility(optimizedRoute, startTime, vehicle);
    
    const totalDuration = timeCheck.arrivalTimes.length > 0 
      ? timeToMinutes(timeCheck.arrivalTimes[timeCheck.arrivalTimes.length - 1]) - timeToMinutes(startTime)
      : 0;
    
    const capacityUsage = optimizedRoute.reduce((sum, s) => sum + s.weight_kg, 0) / vehicle.max_capacity_kg;
    const feasibilityScore = Math.round(
      (timeCheck.feasible ? 50 : 0) + 
      (capacityUsage <= 1 ? 30 : 0) +
      (optimizedRoute.length === stops.length ? 20 : 0)
    );
    
    return {
      stops: optimizedRoute,
      total_distance: Math.round(totalDistance * 10) / 10,
      total_duration: totalDuration,
      estimated_arrival_times: timeCheck.arrivalTimes,
      feasibility_score: feasibilityScore
    };
  }
  
  /**
   * Suggère le meilleur moment de départ
   */
  export function suggestOptimalStartTime(stops: Stop[]): string {
    if (stops.length === 0) return '08:00';
    
    const earliestWindow = stops.reduce((min, stop) => {
      const start = timeToMinutes(stop.time_window_start);
      return start < min ? start : min;
    }, Infinity);
    
    const suggestedStart = Math.max(480, earliestWindow - 120);
    return minutesToTime(suggestedStart);
  }