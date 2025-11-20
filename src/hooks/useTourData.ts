// src/hooks/useTourData.ts - VERSION AVEC GPS AUTOMATIQUE
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { GeocodingService } from '../services/geocodingService';

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
        .eq('company_id', user!.company_id)
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
        .eq('company_id', user!.company_id)
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
        .eq('company_id', user!.company_id);

      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        query = query.eq('date', dateStr);
      }

      const { data: toursData, error } = await query.order('date', { ascending: true });

      if (!error && toursData) {
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

    const channel = supabase
      .channel('tours_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tours',
        filter: `company_id=eq.${user!.company_id}`
      }, fetchTours)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.company_id, selectedDate]);

  return { tours, loading };
}

// ✅ FONCTION AVEC GPS AUTOMATIQUE
export async function createTour(tourData: any, userId: string, companyId: string) {
  try {
    console.log('🚀 Création tournée avec GPS automatique...');
    
    // Générer un token unique et sécurisé
    const accessToken = btoa(
      Math.random().toString(36).substring(2) + 
      Date.now().toString(36) + 
      Math.random().toString(36).substring(2)
    );
    
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 48);
    
    console.log('✅ Token généré:', accessToken.substring(0, 15) + '...');

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
        status: 'planned',
        access_token: accessToken
      })
      .select()
      .single();

    if (tourError) {
      console.error('❌ Erreur SQL:', tourError);
      throw tourError;
    }

    console.log('✅ Tournée créée avec ID:', tour.id);

    // 2. ✅ GÉOCODAGE AUTOMATIQUE DES ADRESSES
    if (tourData.stops && tourData.stops.length > 0) {
      console.log('📍 Création de', tourData.stops.length, 'stops avec géocodage automatique...');
      
      const stopsWithGPS = await Promise.all(
        tourData.stops.map(async (stop: any, index: number) => {
          let latitude = stop.latitude;
          let longitude = stop.longitude;

          // Si pas de coordonnées, géocoder automatiquement
          if (!latitude || !longitude) {
            try {
              console.log(`🗺️ Géocodage: ${stop.address}...`);
              
              const result = await GeocodingService.geocodeAddress(
                stop.address,
                stop.postalCode || '',
                stop.city || ''
              );
              
              if (result) {
                latitude = result.latitude;
                longitude = result.longitude;
                console.log(`✅ ${stop.address} → ${latitude}, ${longitude}`);
              } else {
                console.warn(`⚠️ Impossible de géocoder: ${stop.address}`);
              }
            } catch (error) {
              console.error(`❌ Erreur géocodage ${stop.address}:`, error);
            }
          }

          return {
            tour_id: tour.id,
            sequence_order: index + 1,
            address: stop.address,
            customer_name: stop.customerName,
            customer_phone: stop.customerPhone || null,
            time_window_start: stop.timeWindowStart,
            time_window_end: stop.timeWindowEnd,
            weight_kg: stop.weight_kg || 0,
            volume_m3: stop.volume_m3 || 0,
            notes: stop.notes || null,
            status: 'pending',
            latitude: latitude,
            longitude: longitude
          };
        })
      );

      const { error: stopsError } = await supabase
        .from('delivery_stops')
        .insert(stopsWithGPS);

      if (stopsError) {
        console.error('❌ Erreur création stops:', stopsError);
        throw stopsError;
      }

      const geocodedCount = stopsWithGPS.filter(s => s.latitude && s.longitude).length;
      console.log(`✅ ${geocodedCount}/${stopsWithGPS.length} adresses géocodées avec succès`);
    }

    console.log('🎉 Tournée créée avec GPS automatique !');
    return { success: true, tour };
    
  } catch (error: any) {
    console.error('💥 Erreur création tournée:', error);
    return { success: false, error: error.message || error.toString() };
  }
}