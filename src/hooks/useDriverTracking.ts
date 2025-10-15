import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

interface DriverLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export function useDriverTracking(driverId: string, tourId: string) {
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ location: DriverLocation; time: number } | null>(null);

  // Fonction pour vérifier si on doit envoyer la position
  const shouldSendLocation = (newLoc: DriverLocation): boolean => {
    if (!lastSentRef.current) return true;
    
    const timeDiff = Date.now() - lastSentRef.current.time;
    if (timeDiff > 30000) return true; // 30 secondes
    
    // Calculer distance depuis dernière position
    const R = 6371000; // Rayon terre en mètres
    const lat1 = lastSentRef.current.location.latitude * Math.PI / 180;
    const lat2 = newLoc.latitude * Math.PI / 180;
    const dLat = lat2 - lat1;
    const dLng = (newLoc.longitude - lastSentRef.current.location.longitude) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance > 50; // Plus de 50 mètres
  };

  // Envoyer la position au serveur
  const sendLocation = async (loc: DriverLocation) => {
    try {
      const { error } = await supabase
        .from('driver_locations')
        .insert({
          driver_id: driverId,
          tour_id: tourId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          speed: loc.speed,
          heading: loc.heading,
          timestamp: loc.timestamp
        });

      if (error) throw error;

      // Mettre à jour la position actuelle
      await supabase
        .from('drivers')
        .update({
          current_location_lat: loc.latitude,
          current_location_lng: loc.longitude,
          last_location_update: loc.timestamp
        })
        .eq('id', driverId);

      lastSentRef.current = { location: loc, time: Date.now() };
    } catch (error) {
      console.error('Erreur envoi position:', error);
    }
  };

  // Démarrer le tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error('GPS non disponible');
      return;
    }

    setTracking(true);
    toast.loading('Activation du GPS...', { id: 'gps' });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: DriverLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          timestamp: new Date().toISOString()
        };

        setLocation(newLocation);

        if (shouldSendLocation(newLocation)) {
          sendLocation(newLocation);
        }

        toast.success('GPS activé !', { id: 'gps' });
      },
      (error) => {
        console.error('Erreur GPS:', error);
        toast.error('Erreur GPS', { id: 'gps' });
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  };

  // Arrêter le tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    toast.success('GPS arrêté');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { location, tracking, startTracking, stopTracking };
}