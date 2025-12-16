// src/pages/TourDetailView.tsx - VERSION UX AMÉLIORÉE
// 🔒 SÉCURITÉ: Defense-in-depth avec filtres sur UPDATE delivery_stops
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, MapPin, User, Truck, Clock, Package, 
  AlertCircle, Edit2, Navigation, Download, 
  Printer, Smartphone, Zap, TrendingUp, RefreshCw, Home,
  Settings, ChevronDown, ChevronUp
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
import { useDepot } from '../hooks/useDepot';

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
  tour_id?: string;
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

const statusLabels = {
  pending: "En attente",
  arrived: "Arrivé",
  completed: "Livré",
  failed: "Échec"
};

// Hook séparé pour la position du chauffeur en temps réel
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
      .channel(`dispatch-driver-loc-${driverId}-${Date.now()}`)
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
  const companyId = user?.company_id ?? null; // 🔒 Récupération du company_id
  
  const [tour, setTour] = useState<Tour | null>(null);
  const [stops, setStops] = useState<DeliveryStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
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
  
  // Option retour dépôt
  const [returnToDepot, setReturnToDepot] = useState(true);
  
  // Panneau options déplié/replié
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  
  // Récupérer le dépôt de l'entreprise
  const { depot, loading: depotLoading } = useDepot();
  
  const driverLocation = useDriverLocationRealtime(tour?.driver?.id);

  const loadStops = useCallback(async () => {
    if (!tourId) return;
    
    const { data: stopsData, error: stopsError } = await supabase
      .from('delivery_stops')
      .select('*')
      .eq('tour_id', tourId)
      .order('sequence_order', { ascending: true });

    if (!stopsError && stopsData) {
      setStops(stopsData);
      setLastUpdate(new Date());
    }
  }, [tourId]);

  const loadTourDetails = useCallback(async () => {
    if (!tourId || !companyId) return;

    setLoading(true);

    const { data: tourData, error: tourError } = await supabase
      .from('tours')
      .select(`
        *,
        driver:drivers(id, name, phone, current_location_lat, current_location_lng),
        vehicle:vehicles(id, name, registration, type, capacity_kg, capacity_m3, current_location_lat, current_location_lng, last_location_update)
      `)
      .eq('id', tourId)
      .eq('company_id', companyId)
      .single();

    if (tourError) {
      toast.error('Erreur lors du chargement de la tournée');
      setLoading(false);
      return;
    }

    setTour(tourData);
    await loadStops();
    setLoading(false);
  }, [tourId, companyId, loadStops]);

  useEffect(() => {
    if (!tourId || !companyId) return;

    loadTourDetails();

    const stopsChannel = supabase
      .channel(`dispatch-stops-${tourId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_stops',
        filter: `tour_id=eq.${tourId}`
      }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          const newStatus = (payload.new as any).status;
          const customerName = (payload.new as any).customer_name;
          
          if (newStatus === 'arrived') {
            toast.info(`📍 ${customerName} - Chauffeur arrivé !`, { duration: 4000 });
          } else if (newStatus === 'completed') {
            toast.success(`✅ ${customerName} - Livraison validée !`, { duration: 4000 });
          } else if (newStatus === 'failed') {
            toast.error(`❌ ${customerName} - Échec signalé`, { duration: 4000 });
          }
        }
        
        loadStops();
      })
      .subscribe();

    const tourChannel = supabase
      .channel(`dispatch-tour-${tourId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tours',
        filter: `id=eq.${tourId}`
      }, (payload) => {
        setTour(prev => {
          if (!prev) return null;
          return {
            ...prev,
            name: (payload.new as any).name || prev.name,
            status: (payload.new as any).status || prev.status,
            total_distance_km: (payload.new as any).total_distance_km ?? prev.total_distance_km,
            estimated_duration_minutes: (payload.new as any).estimated_duration_minutes ?? prev.estimated_duration_minutes
          };
        });
        
        setLastUpdate(new Date());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(stopsChannel);
      supabase.removeChannel(tourChannel);
    };
  }, [tourId, companyId]);

  const handleManualRefresh = async () => {
    toast.loading('Actualisation...', { id: 'refresh' });
    await loadStops();
    toast.success('Données actualisées !', { id: 'refresh' });
  };

  const getStartLocation = () => {
    if (driverLocation?.latitude && driverLocation?.longitude) {
      return { latitude: driverLocation.latitude, longitude: driverLocation.longitude, source: 'driver_gps' };
    }

    if (depot.isConfigured && depot.latitude && depot.longitude) {
      return { latitude: depot.latitude, longitude: depot.longitude, source: 'depot' };
    }

    if (tour?.vehicle?.current_location_lat && tour?.vehicle?.current_location_lng) {
      return { latitude: tour.vehicle.current_location_lat, longitude: tour.vehicle.current_location_lng, source: 'vehicle' };
    }

    if (tour?.driver?.current_location_lat && tour?.driver?.current_location_lng) {
      return { latitude: tour.driver.current_location_lat, longitude: tour.driver.current_location_lng, source: 'driver' };
    }

    if (stops.length > 0) {
      const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);
      if (stopsWithCoords.length > 0) {
        const avgLat = stopsWithCoords.reduce((sum, s) => sum + s.latitude, 0) / stopsWithCoords.length;
        const avgLng = stopsWithCoords.reduce((sum, s) => sum + s.longitude, 0) / stopsWithCoords.length;
        return { latitude: avgLat, longitude: avgLng, source: 'estimated' };
      }
    }

    return { latitude: 50.2928, longitude: 2.8828, source: 'default' };
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
      toast.loading('Calcul des distances...', { id: 'calc-route' });

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

      if (returnToDepot && stopsWithCoords.length > 0) {
        const lastStop = stopsWithCoords[stopsWithCoords.length - 1];
        routes.push({
          from: { lat: lastStop.latitude, lng: lastStop.longitude },
          to: { lat: startLocation.latitude, lng: startLocation.longitude }
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

      // 🔒 SÉCURITÉ: UPDATE tours avec company_id
      await supabase
        .from('tours')
        .update({
          total_distance_km: Math.round(totalDistance * 10) / 10,
          estimated_duration_minutes: Math.round(totalDuration)
        })
        .eq('id', tourId)
        .eq('company_id', companyId); // 🔒 Defense-in-depth

      const hours = Math.floor(totalDuration / 60);
      const mins = Math.round(totalDuration % 60);
      
      toast.success(
        `✅ ${Math.round(totalDistance)} km • ${hours}h${String(mins).padStart(2, '0')}${returnToDepot ? ' (retour inclus)' : ''}`,
        { id: 'calc-route', duration: 4000 }
      );

      await loadTourDetails();

    } catch (error) {
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
        toast.error('Au moins 2 points avec coordonnées GPS requis');
        setOptimizing(false);
        return;
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

      toast.loading('Optimisation en cours...', { id: 'optimizing' });

      const depotLocation = {
        latitude: startLocation.latitude,
        longitude: startLocation.longitude
      };

      const result = optimizeTour(stopsData, depotLocation, vehicle, startTime, { returnToDepot });

      toast.loading('Calcul des routes OSRM...', { id: 'optimizing' });

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

      if (returnToDepot && optimizedStops.length > 0) {
        const lastStop = optimizedStops[optimizedStops.length - 1];
        routes.push({
          from: { lat: lastStop.latitude, lng: lastStop.longitude },
          to: { lat: depotLocation.latitude, lng: depotLocation.longitude }
        });
      }

      const routeResults = await OSRMService.getRoutesInBatch(routes);

      let totalRealDistance = 0;
      let totalRealDuration = 0;
      let returnDistance = 0;

      routeResults.forEach((route, index) => {
        if (route) {
          totalRealDistance += route.distance_km;
          totalRealDuration += route.duration_minutes;
          
          if (returnToDepot && index === routeResults.length - 1) {
            returnDistance = route.distance_km;
          }
        }
      });

      // 🔒 SÉCURITÉ: UPDATE delivery_stops avec tour_id
      for (let i = 0; i < optimizedStops.length; i++) {
        const arrivalTime = result.estimated_arrival_times[i];

        const [hours, minutes] = arrivalTime.split(':');
        const estimatedDate = new Date(tour.date);
        estimatedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        await supabase
          .from('delivery_stops')
          .update({
            sequence_order: i + 1,
            estimated_arrival: estimatedDate.toISOString()
          })
          .eq('id', optimizedStops[i].id)
          .eq('tour_id', tourId); // 🔒 Defense-in-depth
      }

      // 🔒 SÉCURITÉ: UPDATE tours avec company_id
      await supabase
        .from('tours')
        .update({
          total_distance_km: Math.round(totalRealDistance * 10) / 10,
          estimated_duration_minutes: Math.round(totalRealDuration)
        })
        .eq('id', tourId)
        .eq('company_id', companyId); // 🔒 Defense-in-depth

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
        startLocationSource: startLocation.source,
        returnToDepot,
        returnDistance: returnToDepot ? Math.round(returnDistance * 10) / 10 : undefined,
        returnTime: result.estimated_return_time
      });
      setShowOptimizationModal(true);

      await loadTourDetails();

    } catch (error) {
      toast.error('Erreur lors de l\'optimisation');
    } finally {
      setOptimizing(false);
    }
  };

  // 🔒 SÉCURITÉ: UPDATE delivery_stops avec tour_id pour defense-in-depth
  const updateStopStatus = async (stopId: string, newStatus: string, failureReason?: string) => {
    if (!tourId) return; // 🔒 Guard clause

    const updateData: any = { 
      status: newStatus,
      actual_arrival: newStatus === 'completed' ? new Date().toISOString() : null
    };
    
    if (newStatus === 'failed' && failureReason) {
      updateData.failure_reason = failureReason;
    }
    
    // 🔒 SÉCURITÉ: Defense-in-depth - Ajout du filtre tour_id sur UPDATE
    const { error } = await supabase
      .from('delivery_stops')
      .update(updateData)
      .eq('id', stopId)
      .eq('tour_id', tourId); // 🔒 Defense-in-depth

    if (error) {
      toast.error('Erreur lors de la mise à jour');
    } else {
      toast.success('Statut mis à jour');
    }
  };

  const cancelStatus = async (stopId: string) => {
    if (!confirm('Voulez-vous annuler le statut de ce point ?')) return;
    await updateStopStatus(stopId, 'pending');
  };

  const openProblemModal = (stopId: string) => {
    setSelectedStopForProblem(stopId);
    setProblemReason('');
    setProblemType('customer_absent');
    setShowProblemModal(true);
  };

  const submitProblem = async () => {
    if (!selectedStopForProblem || !problemReason.trim()) {
      toast.error('Veuillez indiquer la raison du problème');
      return;
    }
    
    const problemReasons: Record<string, string> = {
      customer_absent: 'Client absent',
      address_incorrect: 'Adresse incorrecte',
      access_denied: 'Accès refusé',
      other: 'Autre'
    };
    
    await updateStopStatus(selectedStopForProblem, 'failed', `${problemReasons[problemType]}: ${problemReason}`);
    setShowProblemModal(false);
    setSelectedStopForProblem(null);
  };

  // 🔒 SÉCURITÉ: UPDATE tours avec company_id
  const startTour = async () => {
    if (!tour || !companyId) return;
    const { error } = await supabase
      .from('tours')
      .update({ status: 'in_progress' })
      .eq('id', tour.id)
      .eq('company_id', companyId); // 🔒 Defense-in-depth

    if (!error) {
      setTour({ ...tour, status: 'in_progress' });
      toast.success('Tournée démarrée !');
    }
  };

  // 🔒 SÉCURITÉ: UPDATE tours avec company_id
  const completeTour = async () => {
    if (!tour || !companyId) return;
    const allCompleted = stops.every(s => s.status === 'completed');
    
    if (!allCompleted && !confirm('Tous les points ne sont pas livrés. Terminer quand même ?')) return;

    const { error } = await supabase
      .from('tours')
      .update({ status: 'completed' })
      .eq('id', tour.id)
      .eq('company_id', companyId); // 🔒 Defense-in-depth

    if (!error) {
      setTour({ ...tour, status: 'completed' });
      toast.success('Tournée terminée !');
    }
  };

  const exportPDF = async () => {
    if (!tour || stops.length === 0) return;
    try {
      toast.loading('Génération du PDF...');
      await downloadTourPDF(tour, stops);
      toast.dismiss();
      toast.success('PDF téléchargé !');
    } catch {
      toast.dismiss();
      toast.error('Erreur lors de l\'export');
    }
  };

  const handlePrint = () => {
    if (tour && stops.length > 0) printTourPDF(tour, stops);
  };

  // 🔒 SÉCURITÉ: UPDATE tours avec company_id
  const openDriverView = async () => {
    if (!tour?.id || !companyId) return;

    try {
      toast.loading('Génération du lien...', { id: 'driver-link' });
      
      let { data: tourData } = await supabase
        .from('tours')
        .select('access_token, token_expires_at')
        .eq('id', tour.id)
        .eq('company_id', companyId) // 🔒 Defense-in-depth
        .single();

      let token = tourData?.access_token;
      let expiresAt = tourData?.token_expires_at;

      if (!token || (expiresAt && new Date(expiresAt) < new Date())) {
        token = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
        const newExpiry = new Date();
        newExpiry.setHours(newExpiry.getHours() + 48);
        expiresAt = newExpiry.toISOString();
        
        await supabase
          .from('tours')
          .update({ access_token: token, token_expires_at: expiresAt })
          .eq('id', tour.id)
          .eq('company_id', companyId); // 🔒 Defense-in-depth
      }

      const url = `${window.location.origin}/app/driver-app/${tour.id}?token=${token}`;
      setDriverUrl(url);
      toast.success('Lien prêt !', { id: 'driver-link' });
      setShowShareModal(true);
      
    } catch {
      toast.error('Erreur', { id: 'driver-link' });
    }
  };

  // 🔒 SÉCURITÉ: UPDATE tours avec company_id
  const regenerateToken = async () => {
    if (!tour?.id || !companyId) return;

    const newToken = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
    const newExpiry = new Date();
    newExpiry.setHours(newExpiry.getHours() + 48);

    await supabase
      .from('tours')
      .update({ access_token: newToken, token_expires_at: newExpiry.toISOString() })
      .eq('id', tour.id)
      .eq('company_id', companyId); // 🔒 Defense-in-depth

    setDriverUrl(`${window.location.origin}/app/driver-app/${tour.id}?token=${newToken}`);
    setTour({ ...tour, access_token: newToken, token_expires_at: newExpiry.toISOString() });
  };

  // 🔒 SÉCURITÉ: UPDATE tours avec company_id
  const handleUpdateTour = async (tourData: any) => {
    if (!tour || !companyId) return;

    try {
      setUpdating(true);

      let startTimeTimestamp = null;
      if (tourData.start_time) {
        startTimeTimestamp = tourData.start_time.includes('T') 
          ? tourData.start_time 
          : `${tourData.date || tour.date}T${tourData.start_time}:00`;
      }

      await supabase
        .from('tours')
        .update({
          name: tourData.name,
          date: tourData.date,
          driver_id: tourData.driver_id || null,
          vehicle_id: tourData.vehicle_id || null,
          start_time: startTimeTimestamp
        })
        .eq('id', tour.id)
        .eq('company_id', companyId); // 🔒 Defense-in-depth

      if (tourData.stops?.length > 0) {
        await supabase.from('delivery_stops').delete().eq('tour_id', tour.id);

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

        await supabase.from('delivery_stops').insert(stopsToInsert);
      }

      toast.success('Tournée modifiée !');
      setShowEditModal(false);
      await loadTourDetails();

    } catch (error: any) {
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
  const arrivedStops = stops.filter(s => s.status === 'arrived').length;

  const startLocation = getStartLocation();
  const hasRealLocation = ['driver_gps', 'depot', 'vehicle', 'driver'].includes(startLocation.source);

  const getStartLocationInfo = () => {
    switch (startLocation.source) {
      case 'driver_gps': return { icon: '🚚', label: 'GPS temps réel', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' };
      case 'depot': return { icon: '🏭', label: 'Dépôt', color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' };
      case 'vehicle': return { icon: '🅿️', label: 'Véhicule', color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700' };
      case 'driver': return { icon: '👤', label: 'Chauffeur', color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700' };
      default: return { icon: '📍', label: 'Estimé', color: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700' };
    }
  };

  const startInfo = getStartLocationInfo();

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button 
              onClick={() => navigate('/app/tour-planning')}
              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-xl font-bold text-gray-900 dark:text-white truncate">{tour.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Temps réel</span>
                </div>
                {lastUpdate && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    • MAJ : {lastUpdate.toLocaleTimeString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button 
              onClick={openDriverView} 
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
            >
              <Smartphone size={14} />
              Vue Chauffeur
            </button>
            <button onClick={exportPDF} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Download size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button onClick={handlePrint} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Printer size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2 text-sm"
            >
              <Edit2 size={14} />
              Modifier
            </button>
            {tour.status === 'planned' && (
              <button onClick={startTour} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm">
                <Navigation size={14} />
                Démarrer
              </button>
            )}
            {tour.status === 'in_progress' && (
              <button onClick={completeTour} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                Terminer
              </button>
            )}
          </div>
        </div>

        {/* Stats compactes */}
        <div className="space-y-2">
          {tour.status === 'in_progress' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-blue-900 dark:text-blue-100">📊 Progression</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {completedStops}/{stops.length} livraisons
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                <div 
                  className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${stops.length > 0 ? (completedStops / stops.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
              <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="truncate text-gray-900 dark:text-white">{tour.driver?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
              <Truck className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="truncate text-gray-900 dark:text-white">{tour.vehicle?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
              <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="text-gray-900 dark:text-white">{totalWeight} kg</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
              <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="text-gray-900 dark:text-white">
                {new Date(tour.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="lg:hidden flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-2.5 text-sm font-medium ${
            mobileView === 'list'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Liste ({stops.length})
        </button>
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2.5 text-sm font-medium ${
            mobileView === 'map'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Carte
        </button>
        <button
          onClick={handleManualRefresh}
          className="px-4 py-2.5 text-gray-500 dark:text-gray-400"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left panel - Stops list */}
        <div className={`flex-col lg:w-2/5 w-full bg-gray-50 dark:bg-gray-900 overflow-y-auto lg:border-r border-gray-200 dark:border-gray-700 ${mobileView === 'list' ? 'flex' : 'hidden'} lg:flex`}>
          <div className="p-3 sm:p-4">
            
            {/* Section Optimisation simplifiée */}
            {stops.length >= 2 && (
              <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                
                {/* Stats distance/durée */}
                {tour.total_distance_km && tour.total_distance_km > 0 ? (
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-blue-600" />
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {tour.total_distance_km.toFixed(1)} km
                          </span>
                        </div>
                        {tour.estimated_duration_minutes && (
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-indigo-600" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {Math.floor(tour.estimated_duration_minutes / 60)}h{String(tour.estimated_duration_minutes % 60).padStart(2, '0')}
                            </span>
                          </div>
                        )}
                      </div>
                      {returnToDepot && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Home size={10} />
                          Retour inclus
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700 text-center">
                    <p className="text-xs text-gray-500">Aucun calcul effectué</p>
                  </div>
                )}

                {/* Boutons Calculer / Optimiser */}
                <div className="p-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={calculateTourRoutes}
                    disabled={calculatingRoutes || stops.length < 2}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                      calculatingRoutes
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-wait'
                        : 'bg-cyan-600 text-white hover:bg-cyan-700'
                    }`}
                  >
                    <TrendingUp size={16} className={calculatingRoutes ? "animate-spin" : ""} />
                    {calculatingRoutes ? "Calcul..." : "Calculer"}
                  </button>

                  <button
                    onClick={handleOptimizeTour}
                    disabled={optimizing || stops.length < 2}
                    className={`relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                      optimizing
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-wait'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-yellow-900 text-[8px] font-bold px-1 py-0.5 rounded-full">
                      PRO
                    </span>
                    <Zap size={16} className={optimizing ? "animate-spin" : ""} />
                    {optimizing ? "..." : "Optimiser"}
                  </button>
                </div>

                {/* Options dépliables */}
                <div className="border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setShowRouteOptions(!showRouteOptions)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <span className="flex items-center gap-1.5">
                      <Settings size={12} />
                      Options de calcul
                    </span>
                    {showRouteOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  
                  {showRouteOptions && (
                    <div className="px-3 pb-3 space-y-2">
                      {/* Toggle retour dépôt */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Home size={14} className="text-gray-500" />
                          <div>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Retour dépôt</span>
                            <p className="text-[10px] text-gray-500">{returnToDepot ? 'Tournée fermée' : 'Tournée ouverte'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setReturnToDepot(!returnToDepot)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            returnToDepot ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            returnToDepot ? 'translate-x-5' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* Point de départ */}
                      <div className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${startInfo.color}`}>
                        <span>{startInfo.icon}</span>
                        <span>Départ: {startInfo.label}</span>
                        {!depot.isConfigured && startLocation.source !== 'driver_gps' && (
                          <button 
                            onClick={() => navigate('/app/settings')}
                            className="ml-auto text-orange-600 dark:text-orange-400 hover:underline font-medium"
                          >
                            Configurer dépôt →
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bouton masquer carte (desktop) */}
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700"
                >
                  <MapPin size={12} />
                  {showMap ? 'Masquer la carte' : 'Afficher la carte'}
                </button>
              </div>
            )}

            {/* Header liste */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Points de livraison ({stops.length})
              </h2>
            </div>

            {/* Stops list */}
            <div className="space-y-2">
              {stops.map((stop, index) => (
                <div key={stop.id} className="relative">
                  <div className="flex gap-2">
                    {/* Timeline */}
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] transition-all ${
                        stop.status === 'completed' ? 'bg-green-600 text-white' : 
                        stop.status === 'arrived' ? 'bg-blue-600 text-white animate-pulse' :
                        stop.status === 'failed' ? 'bg-red-600 text-white' :
                        'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      {index < stops.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-[40px] ${
                          stop.status === 'completed' ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`} />
                      )}
                    </div>

                    {/* Stop card */}
                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 mb-1">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-xs text-gray-900 dark:text-white truncate">{stop.customer_name}</h3>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${statusColors[stop.status]}`}>
                              {statusLabels[stop.status]}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-600 dark:text-gray-400 flex items-start gap-1">
                            <MapPin size={9} className="mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{stop.address}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-1.5">
                        <span>🕐 {stop.time_window_start}-{stop.time_window_end}</span>
                        <span>📦 {stop.weight_kg} kg</span>
                        {stop.estimated_arrival && (
                          <span className="text-blue-600 font-medium">
                            → {new Date(stop.estimated_arrival).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {stop.notes && (
                        <div className="text-[9px] p-1 bg-yellow-50 dark:bg-yellow-900/30 rounded text-yellow-800 dark:text-yellow-200 mb-1.5">
                          📝 {stop.notes}
                        </div>
                      )}

                      {/* Actions selon le statut */}
                      {tour.status === 'in_progress' && (
                        <div className="flex gap-1.5">
                          {stop.status === 'pending' && (
                            <>
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
                            </>
                          )}
                          
                          {stop.status === 'arrived' && (
                            <>
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
                                ↩
                              </button>
                            </>
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
                            <div className="w-full space-y-1">
                              {stop.failure_reason && (
                                <div className="text-[9px] p-1 bg-red-50 dark:bg-red-900/30 rounded text-red-800 dark:text-red-200">
                                  ❌ {stop.failure_reason}
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
                <div className="text-center py-8 text-gray-500">
                  <MapPin size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun point de livraison</p>
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                  >
                    Ajouter des points
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel - Map */}
        {showMap && stops.length > 0 && (
          <div className={`flex-1 bg-white dark:bg-gray-800 ${mobileView === 'map' ? 'flex' : 'hidden'} lg:flex flex-col`}>
            <div className="h-full flex flex-col">
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                    <MapPin size={14} />
                    Carte
                  </h3>
                  
                  {driverLocation && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-700">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] text-green-700 dark:text-green-300 font-medium">GPS actif</span>
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
                  onStopClick={(stop) => toast.success(`Arrêt ${stop.sequence_order}: ${stop.customer_name}`)}
                  height="100%"
                  depotLocation={depot.isConfigured ? {
                    latitude: depot.latitude!,
                    longitude: depot.longitude!,
                    address: depot.address || undefined,
                    source: 'depot'
                  } : undefined}
                  showDepot={depot.isConfigured}
                  returnToDepot={returnToDepot}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Problem Modal */}
      {showProblemModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowProblemModal(false)} />
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-md shadow-2xl relative z-10">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Signaler un problème</h3>
            <div className="space-y-3">
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
              <textarea
                value={problemReason}
                onChange={(e) => setProblemReason(e.target.value)}
                placeholder="Décrivez le problème..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={submitProblem} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium">
                Confirmer
              </button>
              <button onClick={() => setShowProblemModal(false)} className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Driver Modal */}
      <ShareDriverModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        driverUrl={driverUrl}
        tourName={tour.name}
        expiresAt={tour.token_expires_at}
        onRegenerate={regenerateToken}
      />

      {/* Edit Modal */}
      {showEditModal && (
        <TourFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdateTour}
          selectedDate={new Date(tour.date)}
          initialData={{ ...tour, stops }}
          isEditMode={true}
        />
      )}

      {/* Optimization Result Modal */}
      {showOptimizationModal && optimizationResult && (
        <OptimizationResultModal
          isOpen={showOptimizationModal}
          onClose={() => setShowOptimizationModal(false)}
          result={optimizationResult}
          tourName={optimizationResult.tourName}
        />
      )}
    </div>
  );
}