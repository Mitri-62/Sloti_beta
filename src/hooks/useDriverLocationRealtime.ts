import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface DriverPosition {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export function useDriverLocationRealtime(driverId: string) {
  const [location, setLocation] = useState<DriverPosition | null>(null);

  useEffect(() => {
    if (!driverId) return;

    // Charger position initiale
    const loadInitial = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('current_location_lat, current_location_lng, last_location_update')
        .eq('id', driverId)
        .single();

      if (data?.current_location_lat && data?.current_location_lng) {
        setLocation({
          latitude: data.current_location_lat,
          longitude: data.current_location_lng,
          timestamp: data.last_location_update
        });
      }
    };

    loadInitial();

    // S'abonner aux mises à jour
    const channel = supabase
      .channel(`driver-${driverId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'drivers',
        filter: `id=eq.${driverId}`
      }, (payload) => {
        const newData = payload.new;
        if (newData.current_location_lat && newData.current_location_lng) {
          setLocation({
            latitude: newData.current_location_lat,
            longitude: newData.current_location_lng,
            timestamp: newData.last_location_update
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return location;
}