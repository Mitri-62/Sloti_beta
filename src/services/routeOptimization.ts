interface Location {
    lat: number;
    lng: number;
    address: string;
  }
  
  interface OptimizedRoute {
    optimizedOrder: number[];
    totalDistance: number;
    totalDuration: number;
    waypoints: google.maps.DirectionsWaypoint[];
  }
  
  export async function optimizeRoute(
    origin: Location,
    destinations: Location[],
    returnToOrigin: boolean = false
  ): Promise<OptimizedRoute> {
    if (destinations.length === 0) {
      return {
        optimizedOrder: [],
        totalDistance: 0,
        totalDuration: 0,
        waypoints: []
      };
    }
  
    // Pour moins de 10 points, on peut utiliser l'API Directions directement
    if (destinations.length <= 10) {
      return await optimizeWithDirectionsAPI(origin, destinations, returnToOrigin);
    }
  
    // Pour plus de 10 points, utiliser un algorithme plus avancé
    return await optimizeWithNearestNeighbor(origin, destinations, returnToOrigin);
  }
  
  async function optimizeWithDirectionsAPI(
    origin: Location,
    destinations: Location[],
    returnToOrigin: boolean
  ): Promise<OptimizedRoute> {
    const directionsService = new google.maps.DirectionsService();
  
    const waypoints = destinations.map(dest => ({
      location: new google.maps.LatLng(dest.lat, dest.lng),
      stopover: true
    }));
  
    try {
      const result = await directionsService.route({
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: returnToOrigin 
          ? new google.maps.LatLng(origin.lat, origin.lng)
          : new google.maps.LatLng(destinations[destinations.length - 1].lat, destinations[destinations.length - 1].lng),
        waypoints: waypoints.slice(0, returnToOrigin ? waypoints.length : -1),
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC
      });
  
      if (result.routes.length === 0) {
        throw new Error('Aucun itinéraire trouvé');
      }
  
      const route = result.routes[0];
      let totalDistance = 0;
      let totalDuration = 0;
  
      route.legs.forEach(leg => {
        totalDistance += leg.distance?.value || 0;
        totalDuration += leg.duration?.value || 0;
      });
  
      const optimizedOrder = result.routes[0].waypoint_order || destinations.map((_, i) => i);
  
      return {
        optimizedOrder,
        totalDistance: totalDistance / 1000, // Convertir en km
        totalDuration: totalDuration / 60, // Convertir en minutes
        waypoints: route.waypoint_order.map(i => waypoints[i])
      };
    } catch (error) {
      console.error('Erreur optimisation itinéraire:', error);
      // Fallback : ordre original
      return {
        optimizedOrder: destinations.map((_, i) => i),
        totalDistance: 0,
        totalDuration: 0,
        waypoints: waypoints
      };
    }
  }
  
  // Algorithme nearest neighbor pour plus de 10 points
  async function optimizeWithNearestNeighbor(
    origin: Location,
    destinations: Location[],
    returnToOrigin: boolean
  ): Promise<OptimizedRoute> {
    const unvisited = [...destinations];
    const optimizedOrder: number[] = [];
    let currentLocation = origin;
    let totalDistance = 0;
  
    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
  
      for (let i = 0; i < unvisited.length; i++) {
        const distance = calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          unvisited[i].lat,
          unvisited[i].lng
        );
  
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }
  
      const nearest = unvisited.splice(nearestIndex, 1)[0];
      const originalIndex = destinations.indexOf(nearest);
      optimizedOrder.push(originalIndex);
      totalDistance += nearestDistance;
      currentLocation = nearest;
    }
  
    if (returnToOrigin) {
      totalDistance += calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        origin.lat,
        origin.lng
      );
    }
  
    const waypoints = optimizedOrder.map(i => ({
      location: new google.maps.LatLng(destinations[i].lat, destinations[i].lng),
      stopover: true
    }));
  
    return {
      optimizedOrder,
      totalDistance,
      totalDuration: totalDistance * 2, // Estimation approximative
      waypoints
    };
  }
  
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  // Géocodage d'une adresse
  export async function geocodeAddress(address: string): Promise<Location | null> {
    const geocoder = new google.maps.Geocoder();
  
    try {
      const result = await geocoder.geocode({ address });
  
      if (result.results.length === 0) {
        return null;
      }
  
      const location = result.results[0].geometry.location;
      return {
        lat: location.lat(),
        lng: location.lng(),
        address: result.results[0].formatted_address
      };
    } catch (error) {
      console.error('Erreur géocodage:', error);
      return null;
    }
  }