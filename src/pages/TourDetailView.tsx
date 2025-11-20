// src/pages/TourDetailView.tsx - VERSION COMPLÈTE CORRIGÉE
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, MapPin, User, Truck, Clock, Package, 
  AlertCircle, Edit2, Navigation, Download, 
  Printer, Smartphone, Zap, TrendingUp
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import TourMap from '../components/TourMap';
import TourFormModal from '../components/TourFormModal';
import ShareDriverModal from '../components/ShareDriverModal';
import { downloadTourPDF, printTourPDF } from '../services/pdfExport';
import { toast } from 'sonner';
import { OSRMService } from "../services/osrmService";
import { optimizeTour } from "../utils/TourOptimizer";
import OptimizationResultModal from '../components/OptimizationResultModal';

interface DeliveryStop {
  id: string;
  sequence_order: number;
  address: string;
  customer_name: string;
  customer_phone: string;
  time_window_start: string;
  time_window_end: string;
  weight_kg: number;
  volume_m3: number;
  notes: string;
  status: 'pending' | 'arrived' | 'completed' | 'failed';
  estimated_arrival: string | null;
  actual_arrival: string | null;
  latitude: number;
  longitude: number;
  failure_reason?: string;
}

interface Tour {
  id: string;
  name: string;
  date: string;
  start_time: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  driver: any;
  vehicle: any;
  total_distance_km: number;
  estimated_duration_minutes: number;
  access_token?: string;
  token_expires_at?: string;
}

interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  last_update: string;
}

const statusColors = {
  pending: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
  arrived: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
  completed: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
  failed: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700",
};

function useDriverLocationRealtime(driverId: string | undefined) {
  const [location, setLocation] = useState<DriverLocation | null>(null);

  useEffect(() => {
    if (!driverId) return;

    const loadInitial = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('current_location_lat, current_location_lng, last_location_update')
        .eq('id', driverId)
        .single();

      if (data?.current_location_lat && data?.current_location_lng) {
        setLocation({
          driver_id: driverId,
          latitude: data.current_location_lat,
          longitude: data.current_location_lng,
          last_update: data.last_location_update
        });
      }
    };

    loadInitial();

    const channel = supabase
      .channel(`driver-location-${driverId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'drivers',
        filter: `id=eq.${driverId}`
      }, (payload) => {
        const newData = payload.new;
        if (newData.current_location_lat && newData.current_location_lng) {
          setLocation({
            driver_id: driverId,
            latitude: newData.current_location_lat,
            longitude: newData.current_location_lng,
            last_update: newData.last_location_update
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

export default function TourDetailView() {
  const { tourId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tour, setTour] = useState<Tour | null>(null);
  const [stops, setStops] = useState<DeliveryStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [selectedStopForProblem, setSelectedStopForProblem] = useState<string | null>(null);
  const [problemReason, setProblemReason] = useState('');
  const [problemType, setProblemType] = useState<'customer_absent' | 'address_incorrect' | 'access_denied' | 'other'>('customer_absent');
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [driverUrl, setDriverUrl] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [calculatingRoutes, setCalculatingRoutes] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  
  const driverLocation = useDriverLocationRealtime(tour?.driver?.id);

  const loadTourDetails = async () => {
    if (!tourId || !user?.company_id) return;

    setLoading(true);

    const { data: tourData, error: tourError } = await supabase
      .from('tours')
      .select(`
        *,
        driver:drivers(id, name, phone, current_location_lat, current_location_lng),
        vehicle:vehicles(
          id, 
          name,
          registration,
          type, 
          capacity_kg, 
          capacity_m3,
          current_location_lat, 
          current_location_lng, 
          last_location_update
        )
      `)
      .eq('id', tourId)
      .eq('company_id', user!.company_id)
      .single();

    if (tourError) {
      console.error('Erreur chargement tournée:', tourError);
      toast.error('Erreur lors du chargement de la tournée');
      setLoading(false);
      return;
    }

    setTour(tourData);

    const { data: stopsData, error: stopsError } = await supabase
      .from('delivery_stops')
      .select('*')
      .eq('tour_id', tourId)
      .order('sequence_order', { ascending: true });

    if (!stopsError && stopsData) {
      setStops(stopsData);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTourDetails();

    if (!tourId) return;

    const channel = supabase
      .channel(`tour-${tourId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_stops',
        filter: `tour_id=eq.${tourId}`
      }, () => {
        loadTourDetails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tourId, user?.company_id]);

  const getStartLocation = () => {
    if (driverLocation?.latitude && driverLocation?.longitude) {
      return {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        source: 'driver_gps'
      };
    }

    if (tour?.vehicle?.current_location_lat && tour?.vehicle?.current_location_lng) {
      return {
        latitude: tour.vehicle.current_location_lat,
        longitude: tour.vehicle.current_location_lng,
        source: 'vehicle'
      };
    }

    if (tour?.driver?.current_location_lat && tour?.driver?.current_location_lng) {
      return {
        latitude: tour.driver.current_location_lat,
        longitude: tour.driver.current_location_lng,
        source: 'driver'
      };
    }

    if (stops.length > 0) {
      const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);
      if (stopsWithCoords.length > 0) {
        const avgLat = stopsWithCoords.reduce((sum, s) => sum + s.latitude, 0) / stopsWithCoords.length;
        const avgLng = stopsWithCoords.reduce((sum, s) => sum + s.longitude, 0) / stopsWithCoords.length;
        return {
          latitude: avgLat,
          longitude: avgLng,
          source: 'estimated'
        };
      }
    }

    return {
      latitude: 50.2928,
      longitude: 2.8828,
      source: 'default'
    };
  };

  const calculateTourRoutes = async () => {
    if (!tourId || !tour) return;

    try {
      setCalculatingRoutes(true);

      const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);
      if (stopsWithCoords.length === 0) {
        toast.error('Aucun arrêt n\'a de coordonnées GPS');
        setCalculatingRoutes(false);
        return;
      }

      const startLocation = getStartLocation();
      
      let startMessage = '';
      if (startLocation.source === 'driver_gps') {
        startMessage = '🚚 Départ depuis la position GPS temps réel du chauffeur';
      } else if (startLocation.source === 'vehicle') {
        startMessage = '🅿️ Départ depuis la position du véhicule (garage)';
      } else if (startLocation.source === 'driver') {
        startMessage = '👤 Départ depuis la dernière position du chauffeur';
      } else if (startLocation.source === 'estimated') {
        startMessage = '📍 Départ estimé (centre des livraisons)';
      } else {
        startMessage = '⚠️ Position de départ par défaut utilisée';
      }

      toast.loading(`${startMessage} - Calcul en cours...`, { id: 'calc-route' });

      if (stopsWithCoords.length < stops.length) {
        toast.warning(`${stops.length - stopsWithCoords.length} arrêt(s) sans coordonnées GPS ignoré(s)`);
      }

      const routes = [];
      
      routes.push({
        from: { lat: startLocation.latitude, lng: startLocation.longitude },
        to: { lat: stopsWithCoords[0].latitude, lng: stopsWithCoords[0].longitude }
      });

      for (let i = 0; i < stopsWithCoords.length - 1; i++) {
        routes.push({
          from: { lat: stopsWithCoords[i].latitude, lng: stopsWithCoords[i].longitude },
          to: { lat: stopsWithCoords[i + 1].latitude, lng: stopsWithCoords[i + 1].longitude }
        });
      }

      const results = await OSRMService.getRoutesInBatch(routes);

      let totalDistance = 0;
      let totalDuration = 0;

      results.forEach((result) => {
        if (result) {
          totalDistance += result.distance_km;
          totalDuration += result.duration_minutes;
        }
      });

      const { error: updateError } = await supabase
        .from('tours')
        .update({
          total_distance_km: Math.round(totalDistance * 10) / 10,
          estimated_duration_minutes: Math.round(totalDuration)
        })
        .eq('id', tourId);

      if (updateError) throw updateError;

      toast.success(
        `✅ Trajet calculé depuis ${startLocation.source === 'vehicle' ? 'le véhicule' : 'le point de départ'} !\n📏 Distance totale: ${Math.round(totalDistance)} km\n⏱️ Durée estimée: ${Math.round(totalDuration)} min`,
        { id: 'calc-route', duration: 5000 }
      );

      await loadTourDetails();

    } catch (error) {
      console.error('Erreur calcul routes:', error);
      toast.error('Erreur lors du calcul des routes', { id: 'calc-route' });
    } finally {
      setCalculatingRoutes(false);
    }
  };

  const handleOptimizeTour = async () => {
    if (!tourId || !tour) return;

    try {
      setOptimizing(true);

      const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);

      if (stopsWithCoords.length < 2) {
        toast.error('Au moins 2 points de livraison avec coordonnées GPS requis pour optimiser');
        setOptimizing(false);
        return;
      }

      if (stopsWithCoords.length < stops.length) {
        toast.warning(`${stops.length - stopsWithCoords.length} stop(s) sans coordonnées seront ignorés`);
      }

      const stopsData = stopsWithCoords.map((s: any) => ({
        id: s.id,
        address: s.address,
        latitude: s.latitude,
        longitude: s.longitude,
        time_window_start: s.time_window_start || '08:00',
        time_window_end: s.time_window_end || '18:00',
        service_duration: 15,
        weight_kg: s.weight_kg || 0,
        volume_m3: s.volume_m3 || 0,
        priority: 'medium' as 'high' | 'medium' | 'low'
      }));

      const vehicle = {
        max_capacity_kg: tour.vehicle?.capacity_kg || 1000,
        max_volume_m3: tour.vehicle?.capacity_m3 || 15,
        avg_speed_kmh: 40
      };

      const startTime = tour.start_time 
        ? new Date(tour.start_time).toTimeString().slice(0, 5)
        : '08:00';

      const startLocation = getStartLocation();

      let optimizationMessage = '';
      if (startLocation.source === 'driver_gps') {
        optimizationMessage = '🚚 Optimisation depuis la position GPS temps réel du chauffeur...';
      } else if (startLocation.source === 'vehicle') {
        optimizationMessage = '🅿️ Optimisation depuis la position du véhicule (garage)...';
      } else if (startLocation.source === 'driver') {
        optimizationMessage = '👤 Optimisation depuis la dernière position du chauffeur...';
      } else if (startLocation.source === 'estimated') {
        optimizationMessage = '📍 Optimisation depuis un point central...';
      } else {
        optimizationMessage = '⚠️ Optimisation avec position par défaut...';
      }

      toast.loading(optimizationMessage, { id: 'optimizing' });

      const depotLocation = {
        latitude: startLocation.latitude,
        longitude: startLocation.longitude
      };

      const result = optimizeTour(stopsData, depotLocation, vehicle, startTime);

      toast.loading('🗺️ Calcul des routes réelles avec OSRM...', { id: 'optimizing' });

      const optimizedStops = result.stops;
      const routes = [];

      routes.push({
        from: { lat: depotLocation.latitude, lng: depotLocation.longitude },
        to: { lat: optimizedStops[0].latitude, lng: optimizedStops[0].longitude }
      });

      for (let i = 0; i < optimizedStops.length - 1; i++) {
        routes.push({
          from: { lat: optimizedStops[i].latitude, lng: optimizedStops[i].longitude },
          to: { lat: optimizedStops[i + 1].latitude, lng: optimizedStops[i + 1].longitude }
        });
      }

      const routeResults = await OSRMService.getRoutesInBatch(routes);

      let totalRealDistance = 0;
      let totalRealDuration = 0;

      routeResults.forEach((route) => {
        if (route) {
          totalRealDistance += route.distance_km;
          totalRealDuration += route.duration_minutes;
        }
      });

      for (let i = 0; i < optimizedStops.length; i++) {
        const arrivalTime = result.estimated_arrival_times[i];

        const [hours, minutes] = arrivalTime.split(':');
        const estimatedDate = new Date(tour.date);
        estimatedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const estimatedArrivalISO = estimatedDate.toISOString();

        await supabase
          .from('delivery_stops')
          .update({
            sequence_order: i + 1,
            estimated_arrival: estimatedArrivalISO
          })
          .eq('id', optimizedStops[i].id);
      }

      await supabase
        .from('tours')
        .update({
          total_distance_km: Math.round(totalRealDistance * 10) / 10,
          estimated_duration_minutes: Math.round(totalRealDuration)
        })
        .eq('id', tourId);

      toast.dismiss('optimizing');

      const savedDistance = tour.total_distance_km 
        ? Math.round((tour.total_distance_km - totalRealDistance) * 10) / 10
        : 0;

      const savedPercent = tour.total_distance_km && savedDistance > 0
        ? Math.round((savedDistance / tour.total_distance_km) * 100)
        : 0;

      setOptimizationResult({
        totalDistance: totalRealDistance,
        previousDistance: tour.total_distance_km,
        totalDuration: totalRealDuration,
        feasibilityScore: result.feasibility_score,
        stopsCount: optimizedStops.length,
        savedKm: savedDistance > 0 ? savedDistance : undefined,
        savedPercent: savedPercent > 0 ? savedPercent : undefined,
        tourName: tour.name,
        startLocationSource: startLocation.source
      });
      setShowOptimizationModal(true);

      await loadTourDetails();

    } catch (error) {
      console.error('Erreur optimisation:', error);
      toast.error('Erreur lors de l\'optimisation');
    } finally {
      setOptimizing(false);
    }
  };

  const updateStopStatus = async (stopId: string, newStatus: string, failureReason?: string) => {
    const updateData: any = { 
      status: newStatus,
      actual_arrival: newStatus === 'completed' ? new Date().toISOString() : null
    };
    
    if (newStatus === 'failed' && failureReason) {
      updateData.failure_reason = failureReason;
    }
    
    const { error } = await supabase
      .from('delivery_stops')
      .update(updateData)
      .eq('id', stopId);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
    } else {
      toast.success('Statut mis à jour');
      await loadTourDetails();
    }
  };

  const cancelStatus = async (stopId: string) => {
    if (!confirm('Voulez-vous annuler le statut de ce point de livraison ?')) return;
    await updateStopStatus(stopId, 'pending');
  };

  const openProblemModal = (stopId: string) => {
    setSelectedStopForProblem(stopId);
    setProblemReason('');
    setProblemType('customer_absent');
    setShowProblemModal(true);
  };

  const submitProblem = async () => {
    if (!selectedStopForProblem) return;
    if (!problemReason.trim()) {
      toast.error('Veuillez indiquer la raison du problème');
      return;
    }
    
    const problemReasons: Record<string, string> = {
      customer_absent: 'Client absent',
      address_incorrect: 'Adresse incorrecte',
      access_denied: 'Accès refusé',
      other: 'Autre'
    };
    
    const fullReason = `${problemReasons[problemType]}: ${problemReason}`;
    await updateStopStatus(selectedStopForProblem, 'failed', fullReason);
    setShowProblemModal(false);
    setSelectedStopForProblem(null);
  };

  const startTour = async () => {
    if (!tour) return;
    const { error } = await supabase
      .from('tours')
      .update({ status: 'in_progress' })
      .eq('id', tour.id);

    if (!error) {
      setTour({ ...tour, status: 'in_progress' });
      toast.success('Tournée démarrée !');
    }
  };

  const completeTour = async () => {
    if (!tour) return;
    const allCompleted = stops.every(s => s.status === 'completed');
    
    if (!allCompleted && !confirm('Tous les stops ne sont pas terminés. Terminer quand même ?')) return;

    const { error } = await supabase
      .from('tours')
      .update({ status: 'completed' })
      .eq('id', tour.id);

    if (!error) {
      setTour({ ...tour, status: 'completed' });
      toast.success('Tournée terminée !');
    }
  };

  const exportPDF = async () => {
    if (!tour || stops.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    
    try {
      toast.loading('Génération du PDF...');
      await downloadTourPDF(tour, stops);
      toast.dismiss();
      toast.success('PDF téléchargé !');
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de l\'export');
    }
  };

  const handlePrint = () => {
    if (!tour || stops.length === 0) {
      toast.error('Aucune donnée à imprimer');
      return;
    }
    printTourPDF(tour, stops);
  };

  const openDriverView = async () => {
    if (!tour?.id) return;

    try {
      toast.loading('Génération du lien sécurisé...', { id: 'driver-link' });
      
      let { data: tourData, error } = await supabase
        .from('tours')
        .select('access_token, token_expires_at')
        .eq('id', tour.id)
        .single();

      if (error) {
        toast.error('Erreur lors de la génération du lien', { id: 'driver-link' });
        return;
      }

      let token = tourData?.access_token;
      let expiresAt = tourData?.token_expires_at;

      const needsNewToken = !token || (expiresAt && new Date(expiresAt) < new Date());

      if (needsNewToken) {
        token = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
        
        const newExpiry = new Date();
        newExpiry.setHours(newExpiry.getHours() + 48);
        expiresAt = newExpiry.toISOString();
        
        const { error: updateError } = await supabase
          .from('tours')
          .update({ 
            access_token: token,
            token_expires_at: expiresAt
          })
          .eq('id', tour.id);

        if (updateError) {
          toast.error('Erreur lors de la génération du token', { id: 'driver-link' });
          return;
        }
      }

      const url = `${window.location.origin}/app/driver-app/${tour.id}?token=${token}`;
      setDriverUrl(url);
      
      toast.success('Lien prêt !', { id: 'driver-link' });
      setShowShareModal(true);
      
    } catch (error) {
      console.error('Erreur génération lien:', error);
      toast.error('Erreur lors de la génération du lien', { id: 'driver-link' });
    }
  };

  const regenerateToken = async () => {
    if (!tour?.id) return;

    const newToken = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
    const newExpiry = new Date();
    newExpiry.setHours(newExpiry.getHours() + 48);

    const { error } = await supabase
      .from('tours')
      .update({
        access_token: newToken,
        token_expires_at: newExpiry.toISOString()
      })
      .eq('id', tour.id);

    if (error) throw error;

    const url = `${window.location.origin}/app/driver-app/${tour.id}?token=${newToken}`;
    setDriverUrl(url);
    
    setTour({
      ...tour,
      access_token: newToken,
      token_expires_at: newExpiry.toISOString()
    });
  };

  const handleUpdateTour = async (tourData: any) => {
    if (!tour || !user?.company_id) return;

    try {
      setUpdating(true);

      let startTimeTimestamp = null;
      if (tourData.start_time) {
        if (tourData.start_time.includes('T') || tourData.start_time.includes(' ')) {
          startTimeTimestamp = tourData.start_time;
        } else {
          const tourDate = tourData.date || tour.date;
          startTimeTimestamp = `${tourDate}T${tourData.start_time}:00`;
        }
      }

      const { error: tourError } = await supabase
        .from('tours')
        .update({
          name: tourData.name,
          date: tourData.date,
          driver_id: tourData.driver_id || null,
          vehicle_id: tourData.vehicle_id || null,
          start_time: startTimeTimestamp
        })
        .eq('id', tour.id)
        .eq('company_id', user.company_id);

      if (tourError) throw tourError;

      if (tourData.stops && Array.isArray(tourData.stops) && tourData.stops.length > 0) {
        const { error: deleteError } = await supabase
          .from('delivery_stops')
          .delete()
          .eq('tour_id', tour.id);

        if (deleteError) throw deleteError;

        const stopsToInsert = tourData.stops.map((stop: any, index: number) => ({
          tour_id: tour.id,
          sequence_order: index + 1,
          address: stop.address || '',
          customer_name: stop.customer_name || stop.customerName || '',
          customer_phone: stop.customer_phone || stop.customerPhone || null,
          time_window_start: stop.time_window_start || stop.timeWindowStart || '09:00',
          time_window_end: stop.time_window_end || stop.timeWindowEnd || '17:00',
          weight_kg: stop.weight_kg || 0,
          volume_m3: stop.volume_m3 || 0,
          notes: stop.notes || null,
          latitude: stop.latitude || null,
          longitude: stop.longitude || null,
          status: 'pending'
        }));

        const { error: insertError } = await supabase
          .from('delivery_stops')
          .insert(stopsToInsert);

        if (insertError) throw insertError;
      }

      toast.success('Tournée modifiée avec succès !');
      setShowEditModal(false);
      await loadTourDetails();

    } catch (error: any) {
      console.error('Erreur modification:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white">Tournée introuvable</p>
          <button 
            onClick={() => navigate('/app/tour-planning')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour aux tournées
          </button>
        </div>
      </div>
    );
  }

  const totalWeight = stops.reduce((sum, s) => sum + s.weight_kg, 0);
  const completedStops = stops.filter(s => s.status === 'completed').length;

  const startLocation = getStartLocation();
  const hasRealLocation = startLocation.source === 'driver_gps' || startLocation.source === 'vehicle' || startLocation.source === 'driver';

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button 
              onClick={() => navigate('/app/tour-planning')}
              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{tour.name}</h1>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <button 
              onClick={openDriverView} 
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              <Smartphone size={16} />
              Vue Chauffeur
            </button>
            <button onClick={exportPDF} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Download size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button onClick={handlePrint} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Printer size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
            >
              <Edit2 size={16} />
              Modifier
            </button>
            {tour.status === 'planned' && (
              <button onClick={startTour} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Navigation size={16} />
                Démarrer
              </button>
            )}
            {tour.status === 'in_progress' && (
              <button onClick={completeTour} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Terminer
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {!hasRealLocation && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-xs">
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  Aucune position GPS disponible
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  Le calcul utilisera une position estimée. Activez le GPS du chauffeur ou configurez la position du véhicule pour des trajets précis.
                </p>
              </div>
            </div>
          )}

          {hasRealLocation && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mt-1 flex-shrink-0"></div>
              <div className="flex-1 text-xs">
                <p className="font-medium text-green-900 dark:text-green-100">
                  {startLocation.source === 'driver_gps' && '🚚 Position GPS temps réel active'}
                  {startLocation.source === 'vehicle' && '🅿️ Position du véhicule configurée'}
                  {startLocation.source === 'driver' && '👤 Dernière position du chauffeur disponible'}
                </p>
                <p className="text-green-700 dark:text-green-300 mt-1">
                  Les trajets seront calculés depuis cette position réelle.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div className="flex items-start gap-1.5 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <User className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Chauffeur</p>
                <p className="font-medium truncate text-gray-900 dark:text-white">{tour.driver?.name || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Truck className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Véhicule</p>
                <p className="font-medium truncate text-gray-900 dark:text-white">{tour.vehicle?.name || 'N/A'}</p>
                {hasRealLocation && (
                  <span className="text-[9px] text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    {startLocation.source === 'driver_gps' && 'GPS Temps Réel'}
                    {startLocation.source === 'vehicle' && 'Position Garage'}
                    {startLocation.source === 'driver' && 'Dernière Position'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-1.5 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Package className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Charge</p>
                <p className="font-medium text-gray-900 dark:text-white">{totalWeight} kg</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Départ</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(tour.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-3 text-sm font-medium ${
            mobileView === 'list'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Liste ({stops.length})
        </button>
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 py-3 text-sm font-medium ${
            mobileView === 'map'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Carte
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className={`flex-col lg:w-2/5 w-full bg-gray-50 dark:bg-gray-900 overflow-y-auto lg:border-r border-gray-200 dark:border-gray-700 ${mobileView === 'list' ? 'flex' : 'hidden'} lg:flex`}>
          <div className="p-3 sm:p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">
                  Points de livraison ({stops.length})
                </h2>
              </div>

              {stops.length >= 2 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  {tour.total_distance_km && tour.total_distance_km > 0 && (
                    <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={16} className="text-blue-600 dark:text-blue-400" />
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Distance actuelle</span>
                        </div>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {tour.total_distance_km.toFixed(1)} km
                        </span>
                      </div>
                      {tour.estimated_duration_minutes && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Durée estimée</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {Math.floor(tour.estimated_duration_minutes / 60)}h{tour.estimated_duration_minutes % 60}min
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-2 mb-3">
                    <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                      {hasRealLocation ? '🚚' : '⚠️'}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100 font-medium">
                        {hasRealLocation 
                          ? (tour.total_distance_km && tour.total_distance_km > 0 
                              ? "Optimisez pour économiser jusqu'à 30% de carburant"
                              : startLocation.source === 'driver_gps' 
                                ? "Calculez le trajet depuis la position GPS temps réel"
                                : "Calculez le trajet depuis la position réelle")
                          : "Aucune position GPS - calcul avec estimation"
                        }
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={calculateTourRoutes}
                      disabled={calculatingRoutes || stops.length < 2}
                      className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                        calculatingRoutes
                          ? 'bg-cyan-200 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300 cursor-wait'
                          : stops.length < 2
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-md hover:shadow-lg'
                      }`}
                    >
                      <TrendingUp size={18} className={calculatingRoutes ? "animate-spin" : ""} />
                      <span className="font-semibold text-xs">{calculatingRoutes ? "Calcul..." : "Calculer"}</span>
                      <span className="text-[9px] opacity-80">
                        {startLocation.source === 'driver_gps' && "GPS temps réel"}
                        {startLocation.source === 'vehicle' && "Depuis garage"}
                        {startLocation.source === 'driver' && "Dernière pos."}
                        {!hasRealLocation && "Position estimée"}
                      </span>
                    </button>

                    <button
                      onClick={handleOptimizeTour}
                      disabled={optimizing || stops.length < 2}
                      className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                        optimizing
                          ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 cursor-wait'
                          : stops.length < 2
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg'
                      }`}
                    >
                      {!optimizing && stops.length >= 2 && (
                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-[8px] font-bold px-1 py-0.5 rounded-full shadow-lg">
                          PRO
                        </div>
                      )}
                      <Zap size={18} className={optimizing ? "animate-spin" : ""} />
                      <span className="font-semibold text-xs">{optimizing ? "..." : "Optimiser"}</span>
                      <span className="text-[9px] opacity-80">
                        {startLocation.source === 'driver_gps' && "GPS temps réel"}
                        {startLocation.source === 'vehicle' && "Depuis garage"}
                        {startLocation.source === 'driver' && "Dernière pos."}
                        {!hasRealLocation && "Position estimée"}
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={() => setShowMap(!showMap)}
                    className="hidden lg:flex w-full mt-2 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 items-center justify-center gap-2"
                  >
                    <MapPin size={12} />
                    {showMap ? 'Masquer la carte' : 'Afficher la carte'}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {stops.map((stop, index) => (
                <div key={stop.id} className="relative">
                  <div className="flex gap-2">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        stop.status === 'completed' ? 'bg-green-600 text-white' : 
                        stop.status === 'arrived' ? 'bg-blue-600 text-white' :
                        'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      {index < stops.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-[50px] ${
                          stop.status === 'completed' ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`} />
                      )}
                    </div>

                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 mb-2">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-xs text-gray-900 dark:text-white truncate">{stop.customer_name}</h3>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[stop.status]}`}>
                              {stop.status === 'pending' && 'Attente'}
                              {stop.status === 'arrived' && 'Arrivé'}
                              {stop.status === 'completed' && 'Livré'}
                              {stop.status === 'failed' && 'Échec'}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-600 dark:text-gray-400 flex items-start gap-1">
                            <MapPin size={10} className="mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{stop.address}</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Créneau</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {stop.time_window_start}-{stop.time_window_end}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Colis</p>
                          <p className="font-medium text-gray-900 dark:text-white">{stop.weight_kg} kg</p>
                        </div>
                      </div>

                      {stop.notes && (
                        <div className="text-[10px] p-1.5 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded text-yellow-800 dark:text-yellow-200 mb-2">
                          <strong>Note:</strong> {stop.notes}
                        </div>
                      )}

                      {tour.status === 'in_progress' && (
                        <div className="space-y-1.5">
                          {stop.status === 'pending' && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => updateStopStatus(stop.id, 'arrived')}
                                className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700 font-medium"
                              >
                                Arrivé
                              </button>
                              <button
                                onClick={() => openProblemModal(stop.id)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-[10px] hover:bg-red-700 font-medium"
                              >
                                Problème
                              </button>
                            </div>
                          )}
                          
                          {stop.status === 'arrived' && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => updateStopStatus(stop.id, 'completed')}
                                className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700 font-medium"
                              >
                                Livré
                              </button>
                              <button
                                onClick={() => openProblemModal(stop.id)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-[10px] hover:bg-red-700 font-medium"
                              >
                                Problème
                              </button>
                              <button
                                onClick={() => cancelStatus(stop.id)}
                                className="px-2 py-1 bg-gray-500 text-white rounded text-[10px] hover:bg-gray-600 font-medium"
                              >
                                Annuler
                              </button>
                            </div>
                          )}
                          
                          {stop.status === 'completed' && (
                            <button
                              onClick={() => cancelStatus(stop.id)}
                              className="w-full px-2 py-1 bg-orange-500 text-white rounded text-[10px] hover:bg-orange-600 font-medium"
                            >
                              Annuler livraison
                            </button>
                          )}
                          
                          {stop.status === 'failed' && (
                            <div className="space-y-1.5">
                              {stop.failure_reason && (
                                <div className="text-[10px] p-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-red-800 dark:text-red-200">
                                  <strong>Raison:</strong> {stop.failure_reason}
                                </div>
                              )}
                              <button
                                onClick={() => cancelStatus(stop.id)}
                                className="w-full px-2 py-1 bg-orange-500 text-white rounded text-[10px] hover:bg-orange-600 font-medium"
                              >
                                Réessayer
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {stops.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <MapPin size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Aucun point de livraison</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showMap && stops.length > 0 && (
          <div className={`flex-1 bg-white dark:bg-gray-800 ${mobileView === 'map' ? 'flex' : 'hidden'} lg:flex flex-col`}>
            <div className="h-full flex flex-col">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin size={16} />
                    Carte
                  </h3>
                  
                  {tour.driver && driverLocation && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] text-gray-600 dark:text-gray-300 font-medium">GPS actif</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <TourMap 
                  stops={stops}
                  showRoute={true}
                  driverLocation={driverLocation}
                  tourId={tourId}
                  onStopClick={(stop) => {
                    toast.success(`Arrêt ${stop.sequence_order}: ${stop.customer_name}`);
                  }}
                  height="100%"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {showProblemModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <div className="fixed inset-0 bg-black/50" onClick={() => {
            setShowProblemModal(false);
            setSelectedStopForProblem(null);
          }} />
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-md shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Signaler un problème
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type de problème
                </label>
                <select
                  value={problemType}
                  onChange={(e) => setProblemType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="customer_absent">Client absent</option>
                  <option value="address_incorrect">Adresse incorrecte</option>
                  <option value="access_denied">Accès refusé</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Détails *
                </label>
                <textarea
                  value={problemReason}
                  onChange={(e) => setProblemReason(e.target.value)}
                  placeholder="Décrivez le problème..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={submitProblem}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium"
              >
                Confirmer
              </button>
              <button
                onClick={() => {
                  setShowProblemModal(false);
                  setSelectedStopForProblem(null);
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareDriverModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        driverUrl={driverUrl}
        tourName={tour.name}
        expiresAt={tour.token_expires_at}
        onRegenerate={regenerateToken}
      />

      {showEditModal && (
        <TourFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdateTour}
          selectedDate={new Date(tour.date)}
          initialData={{
            ...tour,
            stops: stops
          }}
          isEditMode={true}
        />
      )}

      {showOptimizationModal && optimizationResult && (
        <div style={{ zIndex: 10000 }}>
          <OptimizationResultModal
            isOpen={showOptimizationModal}
            onClose={() => setShowOptimizationModal(false)}
            result={optimizationResult}
            tourName={optimizationResult.tourName}
          />
        </div>
      )}
    </div>
  );
}