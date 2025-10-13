import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  last_update: string;
}

export function useDriverLocation(driverId: string | null | undefined) {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null); // ✅ Pour stocker le watchId

  useEffect(() => {
    if (!driverId) return;

    // Charger la position initiale
    loadDriverLocation(driverId);

    // S'abonner aux mises à jour en temps réel
    const channel = supabase
      .channel(`driver-location-${driverId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'drivers',
        filter: `id=eq.${driverId}`
      }, (payload) => {
        if (payload.new.current_location_lat && payload.new.current_location_lng) {
          setLocation({
            driver_id: driverId,
            latitude: payload.new.current_location_lat,
            longitude: payload.new.current_location_lng,
            last_update: payload.new.last_location_update
          });
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [driverId]);

  // ✅ Nettoyer le tracking au démontage du composant
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const loadDriverLocation = async (id: string) => {
    const { data, error } = await supabase
      .from('drivers')
      .select('current_location_lat, current_location_lng, last_location_update')
      .eq('id', id)
      .single();

    if (!error && data?.current_location_lat && data?.current_location_lng) {
      setLocation({
        driver_id: id,
        latitude: data.current_location_lat,
        longitude: data.current_location_lng,
        last_update: data.last_location_update
      });
    }
  };

  const startTracking = () => {
    if (!driverId || tracking) return;

    // ✅ Vérifier si la géolocalisation est disponible
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setTracking(true);
    toast.loading('Activation du suivi GPS...', { id: 'tracking-start' });

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // ✅ Toast de succès seulement la première fois
        if (watchIdRef.current !== null) {
          toast.success('Suivi GPS activé !', { id: 'tracking-start' });
        }

        try {
          // Mettre à jour dans Supabase
          const { error } = await supabase
            .from('drivers')
            .update({
              current_location_lat: latitude,
              current_location_lng: longitude,
              last_location_update: new Date().toISOString()
            })
            .eq('id', driverId);

          if (error) {
            console.error('Erreur mise à jour position:', error);
            toast.error('Erreur lors de la mise à jour de la position');
          }

          // Mettre à jour l'état local
          setLocation({
            driver_id: driverId,
            latitude,
            longitude,
            last_update: new Date().toISOString()
          });
        } catch (err) {
          console.error('Erreur:', err);
        }
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        toast.dismiss('tracking-start');
        
        // ✅ Messages d'erreur plus explicites
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Permission de géolocalisation refusée. Veuillez autoriser l\'accès à votre position.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Position indisponible. Vérifiez votre connexion GPS.');
            break;
          case error.TIMEOUT:
            toast.error('Délai d\'attente dépassé pour obtenir votre position.');
            break;
          default:
            toast.error('Erreur lors de la récupération de votre position.');
        }
        
        setTracking(false);
        watchIdRef.current = null;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    toast.success('Suivi GPS arrêté');
  };

  return { location, tracking, startTracking, stopTracking };
}