// src/pages/TourPlanning.tsx - VERSION UX AMÉLIORÉE
import { useState, useEffect } from "react";
import { 
  Calendar, Truck, User, Plus, Clock,
  ChevronLeft, ChevronRight, Search, Zap,
  Edit2, Trash2, Eye, CheckCircle, XCircle,
  TrendingUp, Navigation, MapPin, Info
} from "lucide-react";
import TourFormModal from "../components/TourFormModal";
import OptimizationResultModal from "../components/OptimizationResultModal";
import { createTour } from "../hooks/useTourData";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { optimizeTour } from "../utils/TourOptimizer";
import { toast } from "sonner";
import { OSRMService } from "../services/osrmService";
import { useDepot } from '../hooks/useDepot';

interface Tour {
  id: string;
  name: string;
  date: string;
  driver: any;
  vehicle: any;
  stops: number;
  distance: number;
  status: string;
  startTime: string;
  estimatedEnd: string;
  total_distance_km?: number;
  estimated_duration_minutes?: number;
  driver_id?: string;
  vehicle_id?: string;
  start_time?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  planned: { 
    label: "Planifiée", 
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700", 
    icon: Clock 
  },
  in_progress: { 
    label: "En cours", 
    color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700", 
    icon: CheckCircle 
  },
  completed: { 
    label: "Terminée", 
    color: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600", 
    icon: CheckCircle 
  },
  cancelled: { 
    label: "Annulée", 
    color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700", 
    icon: XCircle 
  },
};

export default function TourPlanning() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewTourModal, setShowNewTourModal] = useState(false);
  const [showEditTourModal, setShowEditTourModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [calculatingRoutes, setCalculatingRoutes] = useState<string | null>(null);
  
  // ✅ NOUVEAU: Récupérer le dépôt configuré
  const { depot } = useDepot();

  // ✅ NOUVEAU: Afficher le conseil une seule fois en haut
  const [showTip, setShowTip] = useState(true);

  const loadTours = async () => {
    if (!user?.company_id) return;
    
    setLoading(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('tours')
      .select(`
        *,
        driver:drivers(id, name, phone, current_location_lat, current_location_lng),
        vehicle:vehicles(id, name, registration, type, max_weight, volume, capacity_kg, capacity_m3)
      `)
      .eq('company_id', user.company_id)
      .eq('date', dateStr)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Erreur chargement tournées:', error);
      toast.error('Erreur lors du chargement des tournées');
      setLoading(false);
      return;
    }

    const toursWithStops = await Promise.all(
      (data || []).map(async (tour) => {
        const { count } = await supabase
          .from('delivery_stops')
          .select('*', { count: 'exact', head: true })
          .eq('tour_id', tour.id);

        return {
          id: tour.id,
          name: tour.name,
          date: tour.date,
          driver: tour.driver,
          vehicle: tour.vehicle,
          stops: count || 0,
          distance: tour.total_distance_km || 0,
          status: tour.status,
          startTime: tour.start_time 
            ? new Date(tour.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) 
            : '',
          estimatedEnd: tour.end_time 
            ? new Date(tour.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) 
            : '',
          total_distance_km: tour.total_distance_km,
          estimated_duration_minutes: tour.estimated_duration_minutes,
          driver_id: tour.driver_id,
          vehicle_id: tour.vehicle_id,
          start_time: tour.start_time
        };
      })
    );

    setTours(toursWithStops);
    setLoading(false);
  };

  useEffect(() => {
    loadTours();

    const channel = supabase
      .channel('tours_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tours',
        filter: `company_id=eq.${user!.company_id}`
      }, loadTours)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.company_id, selectedDate]);

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const filteredTours = tours.filter(tour => {
    const matchesSearch = tour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tour.driver?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || tour.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: filteredTours.length,
    planned: filteredTours.filter(t => t.status === "planned").length,
    inProgress: filteredTours.filter(t => t.status === "in_progress").length,
    completed: filteredTours.filter(t => t.status === "completed").length,
    totalStops: filteredTours.reduce((sum, t) => sum + t.stops, 0),
    totalDistance: filteredTours.reduce((sum, t) => sum + t.distance, 0),
  };

  const handleViewTour = (tourId: string) => {
    navigate(`/app/tour-planning/${tourId}`);
  };

  const handleEditTour = (tourToEdit: Tour) => {
    setEditingTour(tourToEdit);
    setShowEditTourModal(true);
  };

  const handleUpdateTour = async (tourData: any): Promise<void> => {
    if (!editingTour?.id) return;
  
    try {
      setLoading(true);
  
      const startTimeFormatted = tourData.start_time 
        ? `${tourData.date}T${tourData.start_time}:00`
        : null;
  
      const { error: tourError } = await supabase
        .from('tours')
        .update({
          name: tourData.name,
          date: tourData.date,
          driver_id: tourData.driver_id,
          vehicle_id: tourData.vehicle_id,
          start_time: startTimeFormatted
        })
        .eq('id', editingTour.id);
  
      if (tourError) throw tourError;
  
      const { error: deleteError } = await supabase
        .from('delivery_stops')
        .delete()
        .eq('tour_id', editingTour.id);
  
      if (deleteError) throw deleteError;
  
      if (tourData.stops && tourData.stops.length > 0) {
        const stopsToInsert = tourData.stops.map((stop: any, index: number) => ({
          tour_id: editingTour.id,
          address: stop.address,
          customer_name: stop.customerName,
          customer_phone: stop.customerPhone || null,
          time_window_start: stop.timeWindowStart,
          time_window_end: stop.timeWindowEnd,
          weight_kg: stop.weight_kg || 0,
          volume_m3: stop.volume_m3 || 0,
          notes: stop.notes || null,
          sequence_order: index + 1,
          status: 'pending',
          latitude: stop.latitude || null,
          longitude: stop.longitude || null,
        }));
  
        const { error: stopsError } = await supabase
          .from('delivery_stops')
          .insert(stopsToInsert);
  
        if (stopsError) throw stopsError;
      }
  
      toast.success('Tournée modifiée avec succès !');
      setShowEditTourModal(false);
      setEditingTour(null);
      await loadTours();
    } catch (error: any) {
      console.error('Erreur lors de la modification:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteTour = async (tourId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette tournée ?")) return;

    const { error } = await supabase
      .from('tours')
      .delete()
      .eq('id', tourId);

    if (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    } else {
      toast.success('Tournée supprimée');
      loadTours();
    }
  };

  // ✅ CORRIGÉ: Utilise le dépôt configuré
  const getDepotLocation = (tour: Tour) => {
    // 1. Dépôt configuré
    if (depot.isConfigured && depot.latitude && depot.longitude) {
      return { latitude: depot.latitude, longitude: depot.longitude, source: 'depot' };
    }
    
    // 2. Position du chauffeur
    if (tour.driver?.current_location_lat && tour.driver?.current_location_lng) {
      return { 
        latitude: tour.driver.current_location_lat, 
        longitude: tour.driver.current_location_lng,
        source: 'driver'
      };
    }
    
    // 3. Par défaut (Arras)
    return { latitude: 50.2928, longitude: 2.8828, source: 'default' };
  };

  const calculateTourRoutes = async (tourId: string) => {
    try {
      setCalculatingRoutes(tourId);
      toast.loading('Calcul des distances...', { id: 'calc-route' });

      const { data: stops, error } = await supabase
        .from('delivery_stops')
        .select('*')
        .eq('tour_id', tourId)
        .order('sequence_order', { ascending: true });

      if (error) throw error;
      if (!stops || stops.length === 0) {
        toast.error('Aucun arrêt trouvé pour cette tournée', { id: 'calc-route' });
        return;
      }

      const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);
      if (stopsWithCoords.length === 0) {
        toast.error('Aucun arrêt n\'a de coordonnées GPS', { id: 'calc-route' });
        return;
      }

      const tour = tours.find(t => t.id === tourId);
      if (!tour) return;

      const depotLocation = getDepotLocation(tour);

      const routes = [];
      
      // Dépôt → premier stop
      routes.push({
        from: { lat: depotLocation.latitude, lng: depotLocation.longitude },
        to: { lat: stopsWithCoords[0].latitude, lng: stopsWithCoords[0].longitude }
      });

      // Entre les stops
      for (let i = 0; i < stopsWithCoords.length - 1; i++) {
        routes.push({
          from: { lat: stopsWithCoords[i].latitude, lng: stopsWithCoords[i].longitude },
          to: { lat: stopsWithCoords[i + 1].latitude, lng: stopsWithCoords[i + 1].longitude }
        });
      }

      // Retour au dépôt
      const lastStop = stopsWithCoords[stopsWithCoords.length - 1];
      routes.push({
        from: { lat: lastStop.latitude, lng: lastStop.longitude },
        to: { lat: depotLocation.latitude, lng: depotLocation.longitude }
      });

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

      const hours = Math.floor(totalDuration / 60);
      const mins = Math.round(totalDuration % 60);

      toast.success(
        `✅ ${Math.round(totalDistance)} km • ${hours}h${String(mins).padStart(2, '0')} (retour inclus)`,
        { id: 'calc-route', duration: 4000 }
      );

      await loadTours();

    } catch (error) {
      console.error('Erreur calcul routes:', error);
      toast.error('Erreur lors du calcul des routes', { id: 'calc-route' });
    } finally {
      setCalculatingRoutes(null);
    }
  };

  const handleOptimizeTour = async (tourId: string) => {
    try {
      setOptimizing(tourId);
      
      const { data: tourData, error: tourError } = await supabase
        .from('tours')
        .select(`
          *,
          delivery_stops(*),
          vehicle:vehicles(id, name, registration, type, max_weight, volume, capacity_kg, capacity_m3),
          driver:drivers(id, current_location_lat, current_location_lng)
        `)
        .eq('id', tourId)
        .single();
  
      if (tourError || !tourData) {
        toast.error('Erreur lors du chargement de la tournée');
        setOptimizing(null);
        return;
      }
  
      const stopsWithCoords = tourData.delivery_stops.filter(
        (s: any) => s.latitude && s.longitude
      );
  
      if (stopsWithCoords.length < 2) {
        toast.error('Au moins 2 points avec coordonnées GPS requis');
        setOptimizing(null);
        return;
      }
  
      const stops = stopsWithCoords.map((s: any) => ({
        id: s.id,
        address: s.address,
        latitude: s.latitude,
        longitude: s.longitude,
        time_window_start: s.time_window_start || '08:00',
        time_window_end: s.time_window_end || '18:00',
        service_duration: s.service_duration || 15,
        weight_kg: s.weight_kg || 0,
        volume_m3: s.volume_m3 || 0,
        priority: (s.priority || 'medium') as 'high' | 'medium' | 'low'
      }));
  
      const vehicle = {
        max_capacity_kg: tourData.vehicle?.max_weight || tourData.vehicle?.capacity_kg || 1000,
        max_volume_m3: tourData.vehicle?.volume || tourData.vehicle?.capacity_m3 || 15,
        avg_speed_kmh: 40
      };
  
      const startTime = tourData.start_time 
        ? new Date(tourData.start_time).toTimeString().slice(0, 5)
        : '08:00';
  
      toast.loading('Optimisation en cours...', { id: 'optimizing' });
      
      // ✅ CORRIGÉ: Utilise le dépôt configuré
      let depotLocation = { latitude: 50.2928, longitude: 2.8828 };
      
      if (depot.isConfigured && depot.latitude && depot.longitude) {
        depotLocation = { latitude: depot.latitude, longitude: depot.longitude };
        console.log('🏭 Optimisation depuis le dépôt configuré:', depotLocation);
      } else if (tourData.driver?.current_location_lat && tourData.driver?.current_location_lng) {
        depotLocation = {
          latitude: tourData.driver.current_location_lat,
          longitude: tourData.driver.current_location_lng
        };
        console.log('🚚 Optimisation depuis position GPS du chauffeur:', depotLocation);
      }
      
      const result = optimizeTour(stops, depotLocation, vehicle, startTime, { returnToDepot: true });

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

      // Retour au dépôt
      const lastStop = optimizedStops[optimizedStops.length - 1];
      routes.push({
        from: { lat: lastStop.latitude, lng: lastStop.longitude },
        to: { lat: depotLocation.latitude, lng: depotLocation.longitude }
      });

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
        const estimatedDate = new Date(tourData.date);
        estimatedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        await supabase
          .from('delivery_stops')
          .update({
            sequence_order: i + 1,
            estimated_arrival: estimatedDate.toISOString()
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
      
      const savedDistance = tourData.total_distance_km 
        ? Math.round((tourData.total_distance_km - totalRealDistance) * 10) / 10
        : 0;
      
      const savedPercent = tourData.total_distance_km && savedDistance > 0
        ? Math.round((savedDistance / tourData.total_distance_km) * 100)
        : 0;

      setOptimizationResult({
        totalDistance: totalRealDistance,
        previousDistance: tourData.total_distance_km,
        totalDuration: totalRealDuration,
        feasibilityScore: result.feasibility_score,
        stopsCount: optimizedStops.length,
        savedKm: savedDistance > 0 ? savedDistance : undefined,
        savedPercent: savedPercent > 0 ? savedPercent : undefined,
        tourName: tourData.name,
        returnToDepot: true
      });
      setShowOptimizationModal(true);

      await loadTours();

    } catch (error) {
      console.error('Erreur optimisation:', error);
      toast.error('Erreur lors de l\'optimisation');
    } finally {
      setOptimizing(null);
    }
  };
   
  const handleCreateTour = (tourData: any): void => {
    if (!user?.id || !user?.company_id) {
      toast.error('Erreur d\'authentification');
      return;
    }
  
    const userId = user.id;
    const companyId = user.company_id;
  
    (async () => {
      toast.loading('Création de la tournée...', { id: 'create-tour' });
      
      const result = await createTour(tourData, userId, companyId);
      
      if (result.success) {
        const stopsCount = tourData.stops?.length || 0;
        toast.success(
          `✅ Tournée créée avec ${stopsCount} adresse(s) géocodée(s)`,
          { id: 'create-tour', duration: 4000 }
        );
        setShowNewTourModal(false);
        await loadTours();
      } else {
        toast.error(`Erreur: ${result.error}`, { id: 'create-tour' });
      }
    })();
  };

  const getVehicleRegistration = (vehicle: any): string => {
    return vehicle?.registration || vehicle?.license_plate || 'N/A';
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 mb-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="text-blue-600 dark:text-blue-400 w-6 h-6" />
              Planification des tournées
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Organisez et optimisez vos livraisons
            </p>
          </div>

          <button
            onClick={() => setShowNewTourModal(true)}
            className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md font-medium"
          >
            <Plus size={18} />
            Nouvelle tournée
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
            <div className="text-xs text-blue-600 dark:text-blue-300 font-medium">Total</div>
            <div className="text-xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700">
            <div className="text-xs text-yellow-600 dark:text-yellow-300 font-medium">Planifiées</div>
            <div className="text-xl font-bold text-yellow-900 dark:text-yellow-100">{stats.planned}</div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 border border-green-200 dark:border-green-700">
            <div className="text-xs text-green-600 dark:text-green-300 font-medium">En cours</div>
            <div className="text-xl font-bold text-green-900 dark:text-green-100">{stats.inProgress}</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">Terminées</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.completed}</div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
            <div className="text-xs text-purple-600 dark:text-purple-300 font-medium">Livraisons</div>
            <div className="text-xl font-bold text-purple-900 dark:text-purple-100">{stats.totalStops}</div>
          </div>
          
          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 border border-indigo-200 dark:border-indigo-700">
            <div className="text-xs text-indigo-600 dark:text-indigo-300 font-medium">Distance</div>
            <div className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
              {stats.totalDistance.toFixed(0)} km
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NOUVEAU: Conseil affiché une seule fois */}
      {showTip && filteredTours.some(t => t.stops >= 2 && !t.total_distance_km) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Info size={18} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                💡 Utilisez <strong>Optimiser</strong> pour économiser jusqu'à 30% de carburant
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                ou <strong>Calculer</strong> si l'ordre des stops est déjà optimal
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowTip(false)}
            className="text-blue-400 hover:text-blue-600 text-lg font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousDay}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  {selectedDate.toLocaleDateString('fr-FR', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short' 
                  })}
                </span>
              </div>
              
              <button
                onClick={goToNextDay}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            
            <button
              onClick={goToToday}
              className="w-full mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
            >
              Aujourd'hui
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Nom, chauffeur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="planned">Planifiée</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des tournées */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement des tournées...</p>
          </div>
        ) : filteredTours.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
            <Truck size={40} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Aucune tournée pour cette date
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Créez votre première tournée
            </p>
            <button
              onClick={() => setShowNewTourModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={18} />
              Créer une tournée
            </button>
          </div>
        ) : (
          filteredTours.map((tour) => {
            const StatusIcon = statusConfig[tour.status]?.icon || Clock;
            const isOptimizing = optimizing === tour.id;
            const isCalculating = calculatingRoutes === tour.id;
            
            return (
              <div
                key={tour.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-col gap-3">
                  
                  {/* Header de la carte */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white truncate mb-1">
                        {tour.name}
                      </h3>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${statusConfig[tour.status]?.color}`}>
                        <StatusIcon size={12} />
                        {statusConfig[tour.status]?.label}
                      </div>
                    </div>
                    
                    {/* Distance/durée si calculé */}
                    {tour.total_distance_km && tour.total_distance_km > 0 && (
                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {tour.total_distance_km.toFixed(1)} km
                        </div>
                        {tour.estimated_duration_minutes && (
                          <div className="text-xs text-gray-500">
                            {Math.floor(tour.estimated_duration_minutes / 60)}h{String(tour.estimated_duration_minutes % 60).padStart(2, '0')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <User size={14} className="text-blue-500 flex-shrink-0" />
                      <span className="truncate">{tour.driver?.name || 'Non assigné'}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Truck size={14} className="text-green-500 flex-shrink-0" />
                      <span className="truncate">{tour.vehicle?.name || 'Aucun'}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Clock size={14} className="text-orange-500 flex-shrink-0" />
                      <span>{tour.startTime || 'Non défini'}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <MapPin size={14} className="text-purple-500 flex-shrink-0" />
                      <span>{tour.stops} stop{tour.stops > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* ✅ BOUTONS SIMPLIFIÉS */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => handleViewTour(tour.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                    >
                      <Eye size={14} />
                      Voir
                    </button>

                    <button
                      onClick={() => calculateTourRoutes(tour.id)}
                      disabled={isCalculating || tour.stops < 2}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                        isCalculating
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-wait'
                          : tour.stops < 2
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-cyan-600 text-white hover:bg-cyan-700'
                      }`}
                    >
                      <TrendingUp size={14} className={isCalculating ? "animate-spin" : ""} />
                      {isCalculating ? "..." : "Calculer"}
                    </button>

                    <button
                      onClick={() => handleOptimizeTour(tour.id)}
                      disabled={isOptimizing || tour.stops < 2}
                      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                        isOptimizing
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-wait'
                          : tour.stops < 2
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {!isOptimizing && tour.stops >= 2 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-yellow-900 text-[8px] font-bold px-1 py-0.5 rounded-full">
                          PRO
                        </span>
                      )}
                      <Zap size={14} className={isOptimizing ? "animate-spin" : ""} />
                      {isOptimizing ? "..." : "Optimiser"}
                    </button>

                    <button
                      onClick={() => handleEditTour(tour)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
                    >
                      <Edit2 size={14} />
                      <span className="hidden sm:inline">Éditer</span>
                    </button>

                    <button
                      onClick={() => handleDeleteTour(tour.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-xs"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {showNewTourModal && (
        <TourFormModal
          isOpen={showNewTourModal}
          onClose={() => setShowNewTourModal(false)}
          onSave={handleCreateTour}
          selectedDate={selectedDate}
        />
      )}

      {showEditTourModal && editingTour && (
        <TourFormModal
          isOpen={showEditTourModal}
          onClose={() => {
            setShowEditTourModal(false);
            setEditingTour(null);
          }}
          onSave={handleUpdateTour}
          selectedDate={new Date(editingTour.date)}
          initialData={editingTour}
          isEditMode={true}
        />
      )}

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