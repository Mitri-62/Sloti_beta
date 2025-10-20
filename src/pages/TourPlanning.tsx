// src/pages/TourPlanning.tsx - VERSION RESPONSIVE MOBILE COMPLÈTE
import { useState, useEffect } from "react";
import { 
  Calendar, Truck, User, Plus, MapPin, Clock,
  ChevronLeft, ChevronRight, Search, Zap,
  Edit2, Trash2, Eye, CheckCircle, XCircle,
  TrendingUp
} from "lucide-react";
import TourFormModal from "../components/TourFormModal";
import OptimizationResultModal from "../components/OptimizationResultModal";
import { createTour } from "../hooks/useTourData";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { optimizeTour } from "../utils/TourOptimizer";
import { toast } from "sonner";

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

  const loadTours = async () => {
    if (!user?.company_id) return;
    
    setLoading(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('tours')
      .select(`
        *,
        driver:drivers(id, name, phone),
        vehicle:vehicles(id, name, license_plate, type)
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
                         tour.driver?.name.toLowerCase().includes(searchQuery.toLowerCase());
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

      const { error: tourError } = await supabase
        .from('tours')
        .update({
          name: tourData.name,
          date: tourData.date,
          driver_id: tourData.driver_id,
          vehicle_id: tourData.vehicle_id,
          start_time: tourData.start_time
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
          company_id: user?.company_id
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

  const handleOptimizeTour = async (tourId: string) => {
    try {
      setOptimizing(tourId);
      
      const { data: tourData, error: tourError } = await supabase
        .from('tours')
        .select(`
          *,
          delivery_stops(*),
          vehicle:vehicles(*)
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
        toast.error('Au moins 2 points de livraison avec coordonnées GPS requis pour optimiser');
        setOptimizing(null);
        return;
      }

      if (stopsWithCoords.length < tourData.delivery_stops.length) {
        toast.warning(`${tourData.delivery_stops.length - stopsWithCoords.length} stop(s) sans coordonnées seront ignorés`);
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
        max_capacity_kg: tourData.vehicle?.max_capacity_kg || tourData.vehicle?.capacity_kg || 1000,
        max_volume_m3: tourData.vehicle?.max_volume_m3 || tourData.vehicle?.capacity_m3 || 15,
        avg_speed_kmh: 40
      };

      const startTime = tourData.start_time 
        ? new Date(tourData.start_time).toTimeString().slice(0, 5)
        : '08:00';

      toast.loading('🔄 Optimisation en cours...', { id: 'optimizing' });
      
      const depotLocation = { latitude: 45.7640, longitude: 4.8357 };
      
      const result = optimizeTour(stops, depotLocation, vehicle, startTime);

      for (let i = 0; i < result.stops.length; i++) {
        await supabase
          .from('delivery_stops')
          .update({
            sequence_order: i + 1,
            estimated_arrival: result.estimated_arrival_times[i]
          })
          .eq('id', result.stops[i].id);
      }

      await supabase
        .from('tours')
        .update({
          total_distance_km: result.total_distance,
          estimated_duration_minutes: result.total_duration
        })
        .eq('id', tourId);

      toast.dismiss('optimizing');
      
      const savedDistance = tourData.total_distance_km 
        ? Math.round((tourData.total_distance_km - result.total_distance) * 10) / 10
        : 0;
      
      const savedPercent = tourData.total_distance_km && savedDistance > 0
        ? Math.round((savedDistance / tourData.total_distance_km) * 100)
        : 0;

      setOptimizationResult({
        totalDistance: result.total_distance,
        previousDistance: tourData.total_distance_km,
        totalDuration: result.total_duration,
        feasibilityScore: result.feasibility_score,
        stopsCount: result.stops.length,
        savedKm: savedDistance > 0 ? savedDistance : undefined,
        savedPercent: savedPercent > 0 ? savedPercent : undefined,
        tourName: tourData.name
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
      const result = await createTour(tourData, userId, companyId);
      
      if (result.success) {
        toast.success('Tournée créée avec succès !');
        setShowNewTourModal(false);
        await loadTours();
      } else {
        toast.error(`Erreur: ${result.error}`);
      }
    })();
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen planning-container">
      
      {/* Header avec stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <Truck className="text-blue-600 dark:text-blue-400 w-6 h-6 sm:w-8 sm:h-8" />
              <span className="leading-tight">Planification des tournées</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Organisez et optimisez vos livraisons quotidiennes
            </p>
          </div>

          <button
            onClick={() => setShowNewTourModal(true)}
            className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <Plus size={20} />
            Nouvelle tournée
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-700">
            <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-300 font-medium mb-1">Total</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 rounded-lg p-3 sm:p-4 border border-yellow-200 dark:border-yellow-700">
            <div className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-300 font-medium mb-1">Planifiées</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-900 dark:text-yellow-100">{stats.planned}</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-700">
            <div className="text-xs sm:text-sm text-green-600 dark:text-green-300 font-medium mb-1">En cours</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-900 dark:text-green-100">{stats.inProgress}</div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">Terminées</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-3 sm:p-4 border border-purple-200 dark:border-purple-700">
            <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-300 font-medium mb-1">Livraisons</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.totalStops}</div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800 rounded-lg p-3 sm:p-4 border border-indigo-200 dark:border-indigo-700">
            <div className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-300 font-medium mb-1">Distance</div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-indigo-900 dark:text-indigo-100">
              {stats.totalDistance.toFixed(1)} km
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et sélecteur de date */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Sélecteur de date */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousDay}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white text-center">
                  {selectedDate.toLocaleDateString('fr-FR', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short' 
                  })}
                </span>
              </div>
              
              <button
                onClick={goToNextDay}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <button
              onClick={goToToday}
              className="w-full mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Aujourd'hui
            </button>
          </div>

          {/* Recherche */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Nom, chauffeur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Filtre statut */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement des tournées...</p>
          </div>
        ) : filteredTours.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 sm:p-12 text-center border border-gray-200 dark:border-gray-700">
            <Truck size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucune tournée pour cette date
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Créez votre première tournée pour commencer
            </p>
            <button
              onClick={() => setShowNewTourModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Créer une tournée
            </button>
          </div>
        ) : (
          filteredTours.map((tour) => {
            const StatusIcon = statusConfig[tour.status]?.icon || Clock;
            const isOptimizing = optimizing === tour.id;
            
            return (
              <div
                key={tour.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-col gap-4">
                  
                  {/* Infos principales */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 truncate">
                          {tour.name}
                        </h3>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs sm:text-sm font-medium ${statusConfig[tour.status]?.color}`}>
                          <StatusIcon size={14} sm:size={16} />
                          {statusConfig[tour.status]?.label}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <User size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="truncate">{tour.driver?.name || 'Non assigné'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Truck size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="truncate">{tour.vehicle?.name || 'Aucun véhicule'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock size={16} className="text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <span>{tour.startTime || 'Non défini'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin size={16} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span>{tour.stops} livraison{tour.stops > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {tour.total_distance_km !== undefined && tour.total_distance_km > 0 && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <TrendingUp size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400">
                            Distance: <strong className="text-gray-900 dark:text-white">{tour.total_distance_km.toFixed(1)} km</strong>
                          </span>
                        </div>
                        {tour.estimated_duration_minutes && (
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <Clock size={16} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Durée: <strong className="text-gray-900 dark:text-white">
                                {Math.floor(tour.estimated_duration_minutes / 60)}h{tour.estimated_duration_minutes % 60}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    <button
                      onClick={() => handleViewTour(tour.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Eye size={16} />
                      <span>Voir</span>
                    </button>

                    <button
                      onClick={() => handleOptimizeTour(tour.id)}
                      disabled={isOptimizing || tour.stops < 2}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                        isOptimizing
                          ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 cursor-wait'
                          : tour.stops < 2
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg'
                      }`}
                      title={tour.stops < 2 ? "Au moins 2 livraisons requises" : "Optimiser l'itinéraire"}
                    >
                      <Zap size={16} className={isOptimizing ? "animate-spin" : ""} />
                      <span>{isOptimizing ? "..." : "Optimiser"}</span>
                    </button>

                    <button
                      onClick={() => handleEditTour(tour)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 size={16} />
                      <span className="sm:hidden">Éditer</span>
                    </button>

                    <button
                      onClick={() => handleDeleteTour(tour.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                      <span className="sm:hidden">Suppr.</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal création tournée */}
      {showNewTourModal && (
        <TourFormModal
          isOpen={showNewTourModal}
          onClose={() => setShowNewTourModal(false)}
          onSave={handleCreateTour}
          selectedDate={selectedDate}
        />
      )}

      {/* Modal édition tournée */}
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

      {/* Modal résultat optimisation */}
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