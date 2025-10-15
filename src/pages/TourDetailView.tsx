// src/pages/TourDetailView.tsx - VERSION FINALE CORRIGÉE
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, MapPin, User, Truck, Clock, Package, 
  AlertCircle, Phone, Edit2,
  Navigation, Download, Printer
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import TourMap from '../components/TourMap';
import { downloadTourPDF, printTourPDF } from '../services/pdfExport';
import { toast } from 'sonner';

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

// ✅ HOOK POUR ÉCOUTER LA POSITION DU CHAUFFEUR
function useDriverLocationRealtime(driverId: string | undefined) {
  const [location, setLocation] = useState<DriverLocation | null>(null);

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
          driver_id: driverId,
          latitude: data.current_location_lat,
          longitude: data.current_location_lng,
          last_update: data.last_location_update
        });
      }
    };

    loadInitial();

    // S'abonner aux mises à jour en temps réel
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
  
  // ✅ UTILISER LE HOOK POUR LA POSITION
  const driverLocation = useDriverLocationRealtime(tour?.driver?.id);

  useEffect(() => {
    if (!tourId || !user?.company_id) return;

    async function loadTourDetails() {
      setLoading(true);

      const { data: tourData, error: tourError } = await supabase
        .from('tours')
        .select(`
          *,
          driver:drivers(id, name, phone),
          vehicle:vehicles(id, name, license_plate, type, capacity_kg, capacity_m3)
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
    }

    loadTourDetails();

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

  const updateStopStatus = async (stopId: string, newStatus: string) => {
    const { error } = await supabase
      .from('delivery_stops')
      .update({ 
        status: newStatus,
        actual_arrival: newStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', stopId);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    } else {
      toast.success('Statut mis à jour');
    }
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
    } else {
      toast.error('Erreur lors du démarrage');
    }
  };

  const completeTour = async () => {
    if (!tour) return;
    const allCompleted = stops.every(s => s.status === 'completed');
    
    if (!allCompleted) {
      if (!confirm('Tous les stops ne sont pas terminés. Voulez-vous quand même terminer la tournée ?')) {
        return;
      }
    }

    const { error } = await supabase
      .from('tours')
      .update({ status: 'completed' })
      .eq('id', tour.id);

    if (!error) {
      setTour({ ...tour, status: 'completed' });
      toast.success('Tournée terminée !');
    } else {
      toast.error('Erreur lors de la finalisation');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 dark:text-red-400 mb-4" />
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
  const totalVolume = stops.reduce((sum, s) => sum + s.volume_m3, 0);
  const completedStops = stops.filter(s => s.status === 'completed').length;
  const progress = stops.length > 0 ? (completedStops / stops.length) * 100 : 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/app/tour-planning')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-white"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tour.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {new Date(tour.date).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportPDF}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Exporter en PDF"
            >
              <Download size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Imprimer"
            >
              <Printer size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => navigate(`/app/tour-planning/edit/${tour.id}`)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <Edit2 size={16} />
              Modifier
            </button>
            {tour.status === 'planned' && (
              <button
                onClick={startTour}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Navigation size={16} />
                Démarrer
              </button>
            )}
            {tour.status === 'in_progress' && (
              <button
                onClick={completeTour}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Terminer la tournée
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Progression</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {completedStops} / {stops.length} livrés ({progress.toFixed(0)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Infos tournée */}
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <User size={20} className="text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Chauffeur</p>
              <p className="font-medium text-gray-900 dark:text-white">{tour.driver?.name || 'Non assigné'}</p>
              {tour.driver?.phone && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                  <Phone size={12} />
                  {tour.driver.phone}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Truck size={20} className="text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Véhicule</p>
              <p className="font-medium text-gray-900 dark:text-white">{tour.vehicle?.name || 'Non assigné'}</p>
              {tour.vehicle?.license_plate && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{tour.vehicle.license_plate}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Package size={20} className="text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Charge totale</p>
              <p className="font-medium text-gray-900 dark:text-white">{totalWeight} kg</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{totalVolume.toFixed(1)} m³</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Clock size={20} className="text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Horaire départ</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(tour.start_time).toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
              {tour.total_distance_km && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{tour.total_distance_km} km</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Layout en 2 colonnes : Liste à gauche (40%) + Carte à droite (60%) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLONNE GAUCHE - Liste des stops */}
        <div className="w-2/5 bg-gray-50 dark:bg-gray-900 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Points de livraison ({stops.length})
              </h2>
              <button
                onClick={() => setShowMap(!showMap)}
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <MapPin size={14} />
                {showMap ? 'Masquer' : 'Afficher'} carte
              </button>
            </div>

            <div className="space-y-3">
              {stops.map((stop, index) => {
                const isLast = index === stops.length - 1;

                return (
                  <div key={stop.id} className="relative">
                    <div className="flex gap-3">
                      {/* Timeline */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          stop.status === 'completed' 
                            ? 'bg-green-600 text-white' 
                            : stop.status === 'arrived'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 flex-1 min-h-[60px] ${
                            stop.status === 'completed' ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`} />
                        )}
                      </div>

                      {/* Carte stop */}
                      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-2">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{stop.customer_name}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[stop.status]}`}>
                                {stop.status === 'pending' && 'En attente'}
                                {stop.status === 'arrived' && 'Arrivé'}
                                {stop.status === 'completed' && 'Livré'}
                                {stop.status === 'failed' && 'Échec'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1 mb-2">
                              <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                              {stop.address}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Créneau</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {stop.time_window_start} - {stop.time_window_end}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Colis</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {stop.weight_kg} kg
                            </p>
                          </div>
                        </div>

                        {stop.notes && (
                          <div className="text-xs p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded text-yellow-800 dark:text-yellow-200 mb-2">
                            <strong>Note:</strong> {stop.notes}
                          </div>
                        )}

                        {/* Actions rapides */}
                        {tour.status === 'in_progress' && stop.status !== 'completed' && (
                          <div className="flex gap-2">
                            {stop.status === 'pending' && (
                              <button
                                onClick={() => updateStopStatus(stop.id, 'arrived')}
                                className="flex-1 px-2 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                              >
                                Arrivé
                              </button>
                            )}
                            {stop.status === 'arrived' && (
                              <button
                                onClick={() => updateStopStatus(stop.id, 'completed')}
                                className="flex-1 px-2 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                              >
                                Livré
                              </button>
                            )}
                            <button
                              onClick={() => updateStopStatus(stop.id, 'failed')}
                              className="px-2 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                              Problème
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {stops.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <MapPin size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Aucun point de livraison</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE - Carte */}
        {showMap && stops.length > 0 && (
          <div className="flex-1 bg-white dark:bg-gray-800">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin size={18} />
                    Carte de l'itinéraire
                  </h3>
                  
                  {/* Indicateur GPS */}
                  {tour.driver && (
                    <div className="flex items-center gap-3">
                      {driverLocation ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                            GPS actif - Mis à jour il y a {
                              Math.floor((Date.now() - new Date(driverLocation.last_update).getTime()) / 60000)
                            } min
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                            GPS non activé
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {!tour.driver && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 px-3 py-2 rounded-lg">
                      <AlertCircle size={14} />
                      Assignez un chauffeur
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
    </div>
  );
}