import { useState } from "react";
import { 
  Calendar, Truck, User, Plus, MapPin, Clock,
  ChevronLeft, ChevronRight, Search,
  Edit2, Trash2, Eye, CheckCircle, AlertCircle, XCircle
} from "lucide-react";
import TourFormModal from "../components/TourFormModal";
import { useTours, createTour } from "../hooks/useTourData";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";


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
  }

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    planned: { label: "Planifiée", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
    in_progress: { label: "En cours", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
    completed: { label: "Terminée", color: "bg-gray-100 text-gray-700 border-gray-200", icon: CheckCircle },
    cancelled: { label: "Annulée", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
    
  };

  export default function TourPlanning() {
    const { user } = useAuth();
    const navigate = useNavigate(); // Ajoutez cette ligne
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showNewTourModal, setShowNewTourModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const { tours } = useTours(selectedDate);

  // Navigation de dates
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
    return matchesSearch && matchesStatus;  // Enlevez la ligne matchesDate
  });

  // Stats
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
  const handleEditTour = (tour: Tour) => {
    console.log("Modifier tournée:", tour);
    alert("Fonctionnalité à venir : Modification de tournée");
  };
  
  const handleDeleteTour = async (tourId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette tournée ?")) return;
    
    try {
      const { error } = await supabase
        .from('tours')
        .delete()
        .eq('id', tourId);
      
      if (error) throw error;
      alert("Tournée supprimée avec succès");
    } catch (err) {
      alert("Erreur lors de la suppression");
      console.error(err);
    }
  };
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Planification des tournées</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Organisez et optimisez vos livraisons</p>
          </div>
          <button
            onClick={() => setShowNewTourModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold shadow-sm"
          >
            <Plus size={20} />
            Nouvelle tournée
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-6 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tournées</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{stats.planned}</div>
            <div className="text-xs text-blue-600 mt-1">Planifiées</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-700">{stats.inProgress}</div>
            <div className="text-xs text-green-600 mt-1">En cours</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-700">{stats.completed}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Terminées</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-2xl font-bold text-purple-700">{stats.totalStops}</div>
            <div className="text-xs text-purple-600 mt-1">Livraisons</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="text-2xl font-bold text-orange-700">{stats.totalDistance}</div>
            <div className="text-xs text-orange-600 mt-1">km total</div>
          </div>
        </div>
      </div>

      

      {/* Filtres et navigation de date */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Navigation de date */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <Calendar size={18} className="text-gray-500 dark:text-gray-400" />
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {selectedDate.toLocaleDateString("fr-FR", { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            <button
              onClick={goToNextDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Aujourd'hui
            </button>
          </div>

          

          {/* Recherche et filtres */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une tournée..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="planned">Planifiées</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminées</option>
              <option value="cancelled">Annulées</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des tournées */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTours.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Truck size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Aucune tournée</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {searchQuery || filterStatus !== "all" 
                  ? "Aucun résultat ne correspond à vos critères" 
                  : "Créez votre première tournée pour cette date"}
              </p>
              {!searchQuery && filterStatus === "all" && (
                <button
                  onClick={() => setShowNewTourModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <Plus size={18} />
                  Créer une tournée
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTours.map((tour: Tour) => {  // Ajoutez : Tour
  const StatusIcon = statusConfig[tour.status as keyof typeof statusConfig]?.icon || Clock;
              return (
                <div
                  key={tour.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{tour.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig[tour.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-700 border-gray-200 dark:border-gray-700'} flex items-center gap-1`}>
                        <StatusIcon size={14} />
                        {statusConfig[tour.status as keyof typeof statusConfig]?.label || tour.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        {/* Chauffeur */}
                        <div className="flex items-start gap-2">
                          <User size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Chauffeur</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {tour.driver ? tour.driver.name : (
                                <span className="text-orange-600">Non assigné</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Véhicule */}
                        <div className="flex items-start gap-2">
                          <Truck size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Véhicule</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {tour.vehicle ? (
                                <>
                                  {tour.vehicle.name}
                                  <span className="text-gray-400 ml-1">({tour.vehicle.plate})</span>
                                </>
                              ) : (
                                <span className="text-orange-600">Non assigné</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Horaires */}
                        <div className="flex items-start gap-2">
                          <Clock size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Horaires</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {tour.startTime} - {tour.estimatedEnd}
                            </div>
                          </div>
                        </div>

                        {/* Statistiques */}
                        <div className="flex items-start gap-2">
                          <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Livraisons / Distance</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {tour.stops} points • {tour.distance} km
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Alerte si non assigné */}
                      {(!tour.driver || !tour.vehicle) && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                          <AlertCircle size={16} />
                          <span>
                            {!tour.driver && !tour.vehicle 
                              ? "Chauffeur et véhicule non assignés"
                              : !tour.driver 
                                ? "Chauffeur non assigné"
                                : "Véhicule non assigné"}
                          </span>
                        </div>
                      )}
                    </div>

               {/* Actions */}
<div className="flex items-center gap-2 ml-4">
  <button
    onClick={() => handleViewTour(tour.id)}
    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
    title="Voir les détails"
  >
    <Eye size={18} className="text-gray-600 dark:text-gray-300" />
  </button>
  <button
    onClick={() => handleEditTour(tour)}
    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
    title="Modifier"
  >
    <Edit2 size={18} className="text-gray-600 dark:text-gray-300" />
  </button>
  <button
    onClick={() => handleDeleteTour(tour.id)}
    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
    title="Supprimer"
  >
    <Trash2 size={18} className="text-red-600" />
  </button>
</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nouvelle tournée */}
{showNewTourModal && (
  <TourFormModal
    isOpen={showNewTourModal}
    onClose={() => setShowNewTourModal(false)}
    selectedDate={selectedDate}
    onSave={async (tourData) => {
        if (!user?.id || !user?.company_id) {
          alert("Erreur: utilisateur non connecté");
          return;
        }
        
        const result = await createTour(tourData, user.id, user.company_id);
        
        if (result.success) {
          alert("Tournée créée avec succès!");
          setShowNewTourModal(false);
        } else {
          alert(`Erreur: ${result.error}`);
        }
      }}
      />
      )}
          </div>
        );
      }