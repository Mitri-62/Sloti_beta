import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  last_update: string;
}

export function useDriverLocation(driverId: string | null) {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [tracking, setTracking] = useState(false);

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

    setTracking(true);

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Mettre à jour dans Supabase
        await supabase
          .from('drivers')
          .update({
            current_location_lat: latitude,
            current_location_lng: longitude,
            last_location_update: new Date().toISOString()
          })
          .eq('id', driverId);

        setLocation({
          driver_id: driverId,
          latitude,
          longitude,
          last_update: new Date().toISOString()
        });
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    // Nettoyer au démontage
    return () => {
      navigator.geolocation.clearWatch(watchId);
      setTracking(false);
    };
  };

  const stopTracking = () => {
    setTracking(false);
  };

  return { location, tracking, startTracking, stopTracking };
}