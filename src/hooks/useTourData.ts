import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export function useVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.company_id) {
      setLoading(false);
      return;
    }
  
    async function fetchVehicles() {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('company_id', user!.company_id)  // Ajoutez !
          .order('name');
        
        if (!error) setVehicles(data || []);
        setLoading(false);
      }
    fetchVehicles();
  }, [user?.company_id]);

  return { vehicles, loading };
}

export function useDrivers() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.company_id) return;

    async function fetchDrivers() {
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('company_id', user!.company_id)  // Ajoutez !
          .order('name');
        
        if (!error) setDrivers(data || []);
        setLoading(false);
      }

    fetchDrivers();
  }, [user?.company_id]);

  return { drivers, loading };
}

export function useTours(selectedDate?: Date) {
  const { user } = useAuth();
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.company_id) return;

    async function fetchTours() {
        setLoading(true);
        
        let query = supabase
          .from('tours')
          .select(`
            *,
            driver:drivers(id, name, phone, status),
            vehicle:vehicles(id, name, license_plate, type, capacity_kg, status)
          `)
          .eq('company_id', user!.company_id);  // Ajoutez !

      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        query = query.eq('date', dateStr);
      }

      const { data: toursData, error } = await query.order('date', { ascending: true });

      if (!error && toursData) {
        // Compter les stops pour chaque tournée
        const toursWithStops = await Promise.all(
          toursData.map(async (tour) => {
            const { count } = await supabase
              .from('delivery_stops')
              .select('*', { count: 'exact', head: true })
              .eq('tour_id', tour.id);

            return {
              ...tour,
              stops: count || 0,
              distance: tour.total_distance_km || 0,
              startTime: tour.start_time ? new Date(tour.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
              estimatedEnd: tour.end_time ? new Date(tour.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
            };
          })
        );

        setTours(toursWithStops);
      }
      
      setLoading(false);
    }

    fetchTours();

    // Realtime
    const channel = supabase
    .channel('tours_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'tours',
      filter: `company_id=eq.${user!.company_id}` // Ajoutez ! pour dire à TS que user existe ici
    }, fetchTours)
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, [user?.company_id, selectedDate]);

  return { tours, loading };
}

export async function createTour(tourData: any, userId: string, companyId: string) {
  try {
    console.log('Données envoyées:', {
      company_id: companyId,
      name: tourData.name,
      date: tourData.date,
      driver_id: tourData.driver_id,
      vehicle_id: tourData.vehicle_id,
      start_time: tourData.start_time ? `${tourData.date}T${tourData.start_time}:00` : null,
      status: 'planned'
    });

    // 1. Créer la tournée
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .insert({
        company_id: companyId,
        name: tourData.name,
        date: tourData.date,
        driver_id: tourData.driver_id,
        vehicle_id: tourData.vehicle_id,
        start_time: tourData.start_time ? `${tourData.date}T${tourData.start_time}:00` : null,
        status: 'planned'
      })
      .select()
      .single();

    if (tourError) {
      console.error('Erreur SQL détaillée:', tourError);
      console.error('Code:', tourError.code);
      console.error('Message:', tourError.message);
      console.error('Details:', tourError.details);
      throw tourError;
    }

    console.log('Tournée créée:', tour);

    // 2. Créer les stops
    if (tourData.stops && tourData.stops.length > 0) {
      console.log('Création de', tourData.stops.length, 'stops');
      
      const stopsData = tourData.stops.map((stop: any, index: number) => ({
        tour_id: tour.id,
        sequence_order: index + 1,
        address: stop.address,
        customer_name: stop.customerName,
        customer_phone: stop.customerPhone || '',
        time_window_start: stop.timeWindowStart,
        time_window_end: stop.timeWindowEnd,
        weight_kg: stop.weight_kg || 0,
        volume_m3: stop.volume_m3 || 0,
        notes: stop.notes || '',
        status: 'pending',
        latitude: null,
        longitude: null
      }));

      console.log('Stops à créer:', stopsData);

      const { error: stopsError } = await supabase
        .from('delivery_stops')
        .insert(stopsData);

      if (stopsError) {
        console.error('Erreur création stops:', stopsError);
        console.error('Code:', stopsError.code);
        console.error('Message:', stopsError.message);
        throw stopsError;
      }

      console.log('Stops créés avec succès');
    }

    return { success: true, tour };
  } catch (error: any) {
    console.error('Erreur création tournée complète:', error);
    return { success: false, error: error.message || error.toString() };
  }
}