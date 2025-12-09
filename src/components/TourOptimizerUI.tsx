// src/utils/TourOptimizer.ts
// Algorithme d'optimisation de tournées avec contraintes temps et capacité
// VERSION CORRIGÉE

interface Stop {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  time_window_start: string; // HH:MM
  time_window_end: string;
  service_duration: number; // minutes
  weight_kg: number;
  volume_m3: number;
  priority: 'high' | 'medium' | 'low';
}

interface Vehicle {
  max_capacity_kg: number;
  max_volume_m3: number;
  avg_speed_kmh: number;
}

interface OptimizedTour {
  stops: Stop[];
  total_distance: number;
  total_duration: number;
  estimated_arrival_times: string[];
  feasibility_score: number;
  warnings: string[];
}

interface Location {
  latitude: number;
  longitude: number;
}

/**
 * Calcule la distance haversine entre deux points GPS
 */
function haversineDistance(
  lat1: number, lon1: number, 
  lat2: number, lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
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
  // Gérer les cas où minutes dépasse 24h
  const normalizedMinutes = minutes % (24 * 60);
  const h = Math.floor(normalizedMinutes / 60);
  const m = Math.floor(normalizedMinutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * ✅ CORRIGÉ: Calcule la distance totale INCLUANT le départ depuis le dépôt
 */
function calculateTotalDistanceWithDepot(
  route: Stop[], 
  depot: Location
): number {
  if (route.length === 0) return 0;
  
  let total = 0;
  
  // ✅ Distance dépôt → premier stop
  total += haversineDistance(
    depot.latitude, depot.longitude,
    route[0].latitude, route[0].longitude
  );
  
  // Distance entre les stops
  for (let i = 0; i < route.length - 1; i++) {
    total += haversineDistance(
      route[i].latitude, route[i].longitude,
      route[i + 1].latitude, route[i + 1].longitude
    );
  }
  
  return total;
}

/**
 * Algorithme du plus proche voisin avec contraintes de capacité ET fenêtres horaires
 */
function nearestNeighborWithConstraints(
  stops: Stop[],
  depot: Location,
  vehicle: Vehicle,
  startTime: string
): Stop[] {
  const unvisited = [...stops];
  const route: Stop[] = [];
  let currentLocation = depot;
  let currentTime = timeToMinutes(startTime);
  let currentWeight = 0;
  let currentVolume = 0;
  
  while (unvisited.length > 0) {
    let bestStop: Stop | null = null;
    let bestScore = Infinity;
    let bestIndex = -1;
    let bestArrivalTime = 0;
    
    for (let i = 0; i < unvisited.length; i++) {
      const stop = unvisited[i];
      
      // Vérifier contraintes de capacité
      if (currentWeight + stop.weight_kg > vehicle.max_capacity_kg) continue;
      if (currentVolume + stop.volume_m3 > vehicle.max_volume_m3) continue;
      
      // Calculer temps d'arrivée
      const distance = haversineDistance(
        currentLocation.latitude, currentLocation.longitude,
        stop.latitude, stop.longitude
      );
      const travelTime = (distance / vehicle.avg_speed_kmh) * 60;
      let arrivalTime = currentTime + travelTime;
      
      const windowStart = timeToMinutes(stop.time_window_start);
      const windowEnd = timeToMinutes(stop.time_window_end);
      
      // Si on arrive trop tôt, on attend
      if (arrivalTime < windowStart) {
        arrivalTime = windowStart;
      }
      
      // Si on arrive trop tard, pénalité mais pas d'exclusion
      const latePenalty = arrivalTime > windowEnd ? (arrivalTime - windowEnd) * 2 : 0;
      
      // Score = distance + pénalité retard - bonus priorité
      const priorityBonus = stop.priority === 'high' ? 10 : 
                           stop.priority === 'medium' ? 0 : -5;
      
      const score = distance + latePenalty - priorityBonus;
      
      if (score < bestScore) {
        bestScore = score;
        bestStop = stop;
        bestIndex = i;
        bestArrivalTime = arrivalTime;
      }
    }
    
    if (bestStop) {
      route.push(bestStop);
      unvisited.splice(bestIndex, 1);
      currentLocation = { latitude: bestStop.latitude, longitude: bestStop.longitude };
      currentTime = bestArrivalTime + bestStop.service_duration;
      currentWeight += bestStop.weight_kg;
      currentVolume += bestStop.volume_m3;
    } else {
      // Plus de stops faisables (capacité dépassée)
      console.warn(`⚠️ ${unvisited.length} stops non planifiés (capacité)`);
      break;
    }
  }
  
  return route;
}

/**
 * ✅ CORRIGÉ: Optimisation 2-opt INCLUANT le dépôt dans le calcul
 */
function twoOptWithDepot(route: Stop[], depot: Location): Stop[] {
  if (route.length < 3) return route;
  
  let improved = true;
  let bestRoute = [...route];
  let bestDistance = calculateTotalDistanceWithDepot(bestRoute, depot);
  let iterations = 0;
  const maxIterations = 1000; // Éviter boucle infinie
  
  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    
    for (let i = 0; i < bestRoute.length - 1; i++) {
      for (let j = i + 2; j < bestRoute.length; j++) {
        // Créer nouvelle route en inversant le segment [i+1, j]
        const newRoute = [
          ...bestRoute.slice(0, i + 1),
          ...bestRoute.slice(i + 1, j + 1).reverse(),
          ...bestRoute.slice(j + 1)
        ];
        
        const newDistance = calculateTotalDistanceWithDepot(newRoute, depot);
        
        if (newDistance < bestDistance - 0.01) { // Seuil pour éviter micro-optimisations
          bestRoute = newRoute;
          bestDistance = newDistance;
          improved = true;
        }
      }
    }
  }
  
  console.log(`🔄 2-opt: ${iterations} itérations, distance: ${bestDistance.toFixed(1)} km`);
  return bestRoute;
}

/**
 * ✅ CORRIGÉ: Vérifie les fenêtres horaires INCLUANT trajet depuis dépôt
 */
function calculateArrivalTimes(
  route: Stop[],
  depot: Location,
  startTime: string,
  vehicle: Vehicle
): { arrivalTimes: string[]; violations: string[]; totalDuration: number } {
  const arrivalTimes: string[] = [];
  const violations: string[] = [];
  let currentTime = timeToMinutes(startTime);
  let currentLocation = depot;
  
  for (let i = 0; i < route.length; i++) {
    const stop = route[i];
    
    // ✅ Calculer temps de trajet (y compris depuis le dépôt pour i=0)
    const distance = haversineDistance(
      currentLocation.latitude, currentLocation.longitude,
      stop.latitude, stop.longitude
    );
    const travelTime = (distance / vehicle.avg_speed_kmh) * 60;
    currentTime += travelTime;
    
    const windowStart = timeToMinutes(stop.time_window_start);
    const windowEnd = timeToMinutes(stop.time_window_end);
    
    // Si on arrive trop tôt, on attend
    if (currentTime < windowStart) {
      currentTime = windowStart;
    }
    
    // Si on arrive trop tard, noter la violation
    if (currentTime > windowEnd) {
      const lateMinutes = Math.round(currentTime - windowEnd);
      violations.push(`${stop.address}: +${lateMinutes}min de retard`);
    }
    
    arrivalTimes.push(minutesToTime(currentTime));
    
    // Ajouter temps de service
    currentTime += stop.service_duration;
    currentLocation = { latitude: stop.latitude, longitude: stop.longitude };
  }
  
  const totalDuration = currentTime - timeToMinutes(startTime);
  
  return { arrivalTimes, violations, totalDuration };
}

/**
 * ✅ CORRIGÉ: Calcule un score de faisabilité plus précis
 */
function calculateFeasibilityScore(
  route: Stop[],
  originalStops: Stop[],
  vehicle: Vehicle,
  violations: string[]
): number {
  let score = 100;
  
  // Pénalité pour stops non planifiés (-10 par stop)
  const missedStops = originalStops.length - route.length;
  score -= missedStops * 10;
  
  // Pénalité pour violations de fenêtres horaires (-5 par violation)
  score -= violations.length * 5;
  
  // Pénalité si capacité proche du max (> 90%)
  const totalWeight = route.reduce((sum, s) => sum + s.weight_kg, 0);
  const totalVolume = route.reduce((sum, s) => sum + s.volume_m3, 0);
  const weightUsage = totalWeight / vehicle.max_capacity_kg;
  const volumeUsage = totalVolume / vehicle.max_volume_m3;
  
  if (weightUsage > 0.95 || volumeUsage > 0.95) {
    score -= 10;
  }
  
  // Bonus si tout est OK
  if (violations.length === 0 && missedStops === 0) {
    score += 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * ✅ FONCTION PRINCIPALE CORRIGÉE
 */
export function optimizeTour(
  stops: Stop[],
  startLocation: Location,
  vehicle: Vehicle,
  startTime: string
): OptimizedTour {
  console.log(`🚀 Optimisation: ${stops.length} stops, départ ${startTime}`);
  
  if (stops.length === 0) {
    return {
      stops: [],
      total_distance: 0,
      total_duration: 0,
      estimated_arrival_times: [],
      feasibility_score: 100,
      warnings: []
    };
  }
  
  if (stops.length === 1) {
    const distance = haversineDistance(
      startLocation.latitude, startLocation.longitude,
      stops[0].latitude, stops[0].longitude
    );
    const travelTime = (distance / vehicle.avg_speed_kmh) * 60;
    const arrivalTime = timeToMinutes(startTime) + travelTime;
    
    return {
      stops: [...stops],
      total_distance: Math.round(distance * 10) / 10,
      total_duration: Math.round(travelTime + stops[0].service_duration),
      estimated_arrival_times: [minutesToTime(arrivalTime)],
      feasibility_score: 100,
      warnings: []
    };
  }
  
  // Étape 1: Nearest Neighbor avec contraintes
  let optimizedRoute = nearestNeighborWithConstraints(
    stops, 
    startLocation, 
    vehicle, 
    startTime
  );
  
  // Étape 2: Amélioration 2-opt (avec dépôt)
  optimizedRoute = twoOptWithDepot(optimizedRoute, startLocation);
  
  // Étape 3: Calculer heures d'arrivée et violations
  const { arrivalTimes, violations, totalDuration } = calculateArrivalTimes(
    optimizedRoute,
    startLocation,
    startTime,
    vehicle
  );
  
  // Étape 4: Distance totale (avec dépôt)
  const totalDistance = calculateTotalDistanceWithDepot(optimizedRoute, startLocation);
  
  // Étape 5: Score de faisabilité
  const feasibilityScore = calculateFeasibilityScore(
    optimizedRoute,
    stops,
    vehicle,
    violations
  );
  
  // Warnings
  const warnings: string[] = [];
  if (optimizedRoute.length < stops.length) {
    warnings.push(`${stops.length - optimizedRoute.length} stop(s) non planifié(s) (capacité dépassée)`);
  }
  if (violations.length > 0) {
    warnings.push(`${violations.length} créneau(x) horaire(s) non respecté(s)`);
  }
  
  console.log(`✅ Optimisation terminée: ${totalDistance.toFixed(1)} km, score ${feasibilityScore}/100`);
  if (warnings.length > 0) {
    console.warn('⚠️ Warnings:', warnings);
  }
  
  return {
    stops: optimizedRoute,
    total_distance: Math.round(totalDistance * 10) / 10,
    total_duration: Math.round(totalDuration),
    estimated_arrival_times: arrivalTimes,
    feasibility_score: feasibilityScore,
    warnings
  };
}

/**
 * Suggère le meilleur moment de départ
 */
export function suggestOptimalStartTime(stops: Stop[]): string {
  if (stops.length === 0) return '08:00';
  
  // Trouver la fenêtre la plus tôt
  const earliestWindow = stops.reduce((min, stop) => {
    const start = timeToMinutes(stop.time_window_start);
    return start < min ? start : min;
  }, Infinity);
  
  // Partir 30-60 min avant pour avoir de la marge (selon distance estimée)
  const marginMinutes = stops.length > 5 ? 60 : 30;
  const suggestedStart = Math.max(360, earliestWindow - marginMinutes); // Pas avant 6h00
  
  return minutesToTime(suggestedStart);
}