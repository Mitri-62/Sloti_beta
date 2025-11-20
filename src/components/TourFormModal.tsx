import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  X, User, Calendar, MapPin, Plus, Trash2,
  AlertTriangle, Package, Check, Edit2, GripVertical,
  Clock, Shield, AlertCircle
} from "lucide-react";
import { useVehicles, useDrivers } from "../hooks/useTourData";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AddressAutocomplete from './AddressAutocomplete';

interface DeliveryStop {
  id: string;
  address: string;
  customerName: string;
  customerPhone: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  weight_kg: number;
  volume_m3: number;
  notes: string;
  latitude?: number;
  longitude?: number;
  estimated_stop_time?: number;
}

interface TourFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tourData: any) => void;
  selectedDate: Date;
  initialData?: any;
  isEditMode?: boolean;
}

// Composant pour un point draggable
function SortableStop({ stop, index, onEdit, onRemove, estimatedTime }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [startH, startM] = stop.timeWindowStart.split(':').map(Number);
  const [endH, endM] = stop.timeWindowEnd.split(':').map(Number);
  const windowDuration = (endH * 60 + endM) - (startH * 60 + startM);
  
  let windowColor = 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
  if (windowDuration < 120) windowColor = 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
  else if (windowDuration < 240) windowColor = 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';

  const hasGPS = stop.latitude && stop.longitude;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 flex items-start gap-2 hover:border-blue-300 dark:hover:border-blue-600 transition-all"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded mt-1"
      >
        <GripVertical size={18} className="text-gray-400" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold rounded-full">
            {index + 1}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">{stop.customerName}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${windowColor}`}>
            {windowDuration < 120 ? '🔴 Serré' : windowDuration < 240 ? '🟠 Moyen' : '🟢 Large'}
          </span>
          {hasGPS && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 font-medium">
              📍 GPS
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 ml-8">{stop.address}</p>
        <div className="flex items-center gap-4 ml-8 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{stop.customerPhone || "Non renseigné"}</span>
          <span>⏰ {stop.timeWindowStart} - {stop.timeWindowEnd}</span>
          <span>📦 {stop.weight_kg} kg • {stop.volume_m3} m³</span>
          <span className="text-purple-600 dark:text-purple-400 font-medium">
            ⏱️ {stop.estimated_stop_time || 15}min arrêt
          </span>
          {index === 0 ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              📍 Point de départ
            </span>
          ) : estimatedTime && (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              🕐 Arrivée ~{estimatedTime}
            </span>
          )}
        </div>
        {stop.notes && (
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-8 mt-1 italic">📝 {stop.notes}</p>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(stop)}
          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400"
          title="Modifier"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => onRemove(stop.id)}
          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
          title="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default function TourFormModal({ 
  isOpen, 
  onClose,
  onSave,
  selectedDate,
  initialData,
  isEditMode = false
}: TourFormModalProps) {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { drivers, loading: driversLoading } = useDrivers();
  
  const [tourName, setTourName] = useState("");
  const [tourDate, setTourDate] = useState(selectedDate.toISOString().split('T')[0]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [stops, setStops] = useState<DeliveryStop[]>([]);
  const [showAddStop, setShowAddStop] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  
  const [hasValidDistance, setHasValidDistance] = useState(false);
  const [stopsModified, setStopsModified] = useState(false);
  
  const formRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [newStop, setNewStop] = useState<DeliveryStop>({
    id: "",
    address: "",
    customerName: "",
    customerPhone: "",
    timeWindowStart: "09:00",
    timeWindowEnd: "17:00",
    weight_kg: 0,
    volume_m3: 0,
    notes: "",
    estimated_stop_time: 15,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (showAddStop && formRef.current) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest'
        });
      }, 100);
    }
  }, [showAddStop]);

  useEffect(() => {
    if (isEditMode && initialData) {
      setTourName(initialData.name || '');
      setTourDate(initialData.date || selectedDate.toISOString().split('T')[0]);
      setSelectedDriver(initialData.driver_id || '');
      setSelectedVehicle(initialData.vehicle_id || '');
      
      if (initialData.start_time) {
        const time = new Date(initialData.start_time).toTimeString().slice(0, 5);
        setStartTime(time);
      }
      
      if (initialData.total_distance_km && initialData.total_distance_km > 0) {
        setHasValidDistance(true);
        setStopsModified(false);
      }
      
      if (initialData.id) {
        loadExistingStops(initialData.id);
      } else if (initialData.stops) {
        const formatted = initialData.stops.map((s: any) => ({
          id: s.id || Date.now().toString(),
          address: s.address,
          customerName: s.customer_name || s.customerName,
          customerPhone: s.customer_phone || s.customerPhone || '',
          timeWindowStart: s.time_window_start || s.timeWindowStart,
          timeWindowEnd: s.time_window_end || s.timeWindowEnd,
          weight_kg: s.weight_kg || 0,
          volume_m3: s.volume_m3 || 0,
          notes: s.notes || '',
          latitude: s.latitude,
          longitude: s.longitude,
          estimated_stop_time: s.estimated_stop_time || 15
        }));
        setStops(formatted);
      }
    }
  }, [isEditMode, initialData, selectedDate]);

  const loadExistingStops = async (tourId: string) => {
    const { data } = await supabase
      .from('delivery_stops')
      .select('*')
      .eq('tour_id', tourId)
      .order('sequence_order');

    if (data) {
      const formatted = data.map((s: any) => ({
        id: s.id,
        address: s.address,
        customerName: s.customer_name,
        customerPhone: s.customer_phone || '',
        timeWindowStart: s.time_window_start,
        timeWindowEnd: s.time_window_end,
        weight_kg: s.weight_kg || 0,
        volume_m3: s.volume_m3 || 0,
        notes: s.notes || '',
        latitude: s.latitude,
        longitude: s.longitude,
        estimated_stop_time: s.estimated_stop_time || 15
      }));
      setStops(formatted);
    }
  };

  if (!isOpen) return null;

  // ✅ HELPERS pour compatibilité ancien/nouveau schéma
  const getVehicleCapacityKg = (vehicle: any): number => {
    return vehicle?.max_weight || vehicle?.capacity_kg || 0;
  };

  const getVehicleCapacityM3 = (vehicle: any): number => {
    return vehicle?.volume || vehicle?.capacity_m3 || 0;
  };

  const getVehicleRegistration = (vehicle: any): string => {
    return vehicle?.registration || vehicle?.license_plate || 'N/A';
  };

  const vehicle = vehicles.find(v => v.id === selectedVehicle);
  const driver = drivers.find(d => d.id === selectedDriver);

  const AVERAGE_SPEED_KM_H = 50;
  const STOP_TIME_MINUTES = 15;
  const MAX_CONTINUOUS_DRIVE_MINUTES = 270;
  const MANDATORY_BREAK_MINUTES = 45;
  const MAX_DAILY_SERVICE_HOURS = 12;
  const MAX_DAILY_DRIVE_HOURS = 9;
  
  const totalWeight = stops.reduce((sum, s) => sum + (s.weight_kg || 0), 0);
  const totalVolume = stops.reduce((sum, s) => sum + (s.volume_m3 || 0), 0);
  
  // ✅ Utilise les helpers pour obtenir les capacités
  const vehicleCapacityKg = vehicle ? getVehicleCapacityKg(vehicle) : 0;
  const vehicleCapacityM3 = vehicle ? getVehicleCapacityM3(vehicle) : 0;
  
  const weightPercent = vehicleCapacityKg > 0 ? (totalWeight / vehicleCapacityKg) * 100 : 0;
  const volumePercent = vehicleCapacityM3 > 0 ? (totalVolume / vehicleCapacityM3) * 100 : 0;
  const isOverloaded = weightPercent > 100 || volumePercent > 100;

  const calculateTourDuration = (realDistance?: number) => {
    if (stops.length === 0) return { 
      totalMinutes: 0, 
      driveMinutes: 0,
      breaksCount: 0, 
      estimatedTimes: [],
      regulatoryBreaks: []
    };

    const totalDistance = realDistance || (stops.length > 1 ? (stops.length - 1) * 10 : 0);
    const driveMinutes = (totalDistance / AVERAGE_SPEED_KM_H) * 60;
    const breaksCount = Math.floor(driveMinutes / MAX_CONTINUOUS_DRIVE_MINUTES);
    const stopTimeMinutes = stops.reduce((sum, stop) => sum + (stop.estimated_stop_time || STOP_TIME_MINUTES), 0);
    const totalMinutes = driveMinutes + stopTimeMinutes + (breaksCount * MANDATORY_BREAK_MINUTES);

    const [startH, startM] = startTime.split(':').map(Number);
    let currentMinutes = startH * 60 + startM;
    let cumulativeDriveMinutes = 0;
    
    const distancePerLeg = stops.length > 1 ? totalDistance / (stops.length - 1) : 0;
    const timePerLeg = distancePerLeg > 0 ? (distancePerLeg / AVERAGE_SPEED_KM_H) * 60 : 0;
    
    const estimatedTimes: string[] = [];
    const regulatoryBreaks: number[] = [];
    
    stops.forEach((stop, idx) => {
      if (idx > 0) {
        cumulativeDriveMinutes += timePerLeg;
        currentMinutes += timePerLeg;
        
        if (cumulativeDriveMinutes >= MAX_CONTINUOUS_DRIVE_MINUTES) {
          currentMinutes += MANDATORY_BREAK_MINUTES;
          cumulativeDriveMinutes = 0;
          regulatoryBreaks.push(idx);
        }
      }
      
      const h = Math.floor(currentMinutes / 60);
      const m = Math.floor(currentMinutes % 60);
      estimatedTimes.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      currentMinutes += (stop.estimated_stop_time || STOP_TIME_MINUTES);
    });

    return { 
      totalMinutes, 
      driveMinutes,
      breaksCount, 
      estimatedTimes,
      regulatoryBreaks
    };
  };

  const shouldUseRealDistance = hasValidDistance && !stopsModified;
  const { totalMinutes, driveMinutes, breaksCount, estimatedTimes, regulatoryBreaks } = calculateTourDuration(
    shouldUseRealDistance ? initialData?.total_distance_km : undefined
  );
  
  const tourHours = totalMinutes / 60;
  const driveHours = driveMinutes / 60;
  const totalStopMinutes = stops.reduce((sum, stop) => sum + (stop.estimated_stop_time || STOP_TIME_MINUTES), 0);
  
  const isDriveTimeLegal = driveHours <= MAX_DAILY_DRIVE_HOURS;
  const isServiceTimeLegal = tourHours <= MAX_DAILY_SERVICE_HOURS;
  
  const amplitudeStatus = !isServiceTimeLegal ? 'illegal' : 
                          !isDriveTimeLegal ? 'warning' : 
                          tourHours > 10 ? 'caution' : 'ok';

  const displayDistance = shouldUseRealDistance && initialData?.total_distance_km 
    ? initialData.total_distance_km 
    : (stops.length > 1 ? (stops.length - 1) * 10 : 0);

  const getTimeWindowViolations = () => {
    return stops.filter((stop, idx) => {
      if (!estimatedTimes[idx]) return false;
      const estimated = estimatedTimes[idx];
      return estimated > stop.timeWindowEnd;
    });
  };

  const timeWindowViolations = getTimeWindowViolations();

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setStops((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setStopsModified(true);
    }
  };

  const handleAddStop = () => {
    if (!newStop.address || !newStop.customerName) {
      alert("L'adresse et le nom du client sont obligatoires");
      return;
    }
    
    if (editingStopId) {
      setStops(stops.map(s => s.id === editingStopId ? { ...newStop, id: editingStopId } : s));
      setEditingStopId(null);
    } else {
      setStops([...stops, { ...newStop, id: Date.now().toString() }]);
    }
    
    setStopsModified(true);
    
    setNewStop({
      id: "",
      address: "",
      customerName: "",
      customerPhone: "",
      timeWindowStart: "09:00",
      timeWindowEnd: "17:00",
      weight_kg: 0,
      volume_m3: 0,
      notes: "",
      estimated_stop_time: 15,
    });
    setShowAddStop(false);
  };

  const handleEditStop = (stop: DeliveryStop) => {
    setNewStop({ ...stop });
    setEditingStopId(stop.id);
    setShowAddStop(true);
  };

  const handleRemoveStop = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce point de livraison ?')) {
      setStops(stops.filter(s => s.id !== id));
      setStopsModified(true);
    }
  };

  const handleCancelEdit = () => {
    setNewStop({
      id: "",
      address: "",
      customerName: "",
      customerPhone: "",
      timeWindowStart: "09:00",
      timeWindowEnd: "17:00",
      weight_kg: 0,
      volume_m3: 0,
      notes: "",
      estimated_stop_time: 15,
    });
    setEditingStopId(null);
    setShowAddStop(false);
  };

  const handleSave = () => {
    if (!tourName) {
      alert("Le nom de la tournée est obligatoire");
      return;
    }
    if (!selectedDriver || !selectedVehicle) {
      alert("Veuillez sélectionner un chauffeur et un véhicule");
      return;
    }
    if (stops.length === 0) {
      alert("Ajoutez au moins un point de livraison");
      return;
    }
    if (isOverloaded) {
      alert("Le véhicule est en surcharge ! Réduisez le poids ou le volume.");
      return;
    }
    if (amplitudeStatus === 'illegal') {
      alert(`⚠️ ILLÉGAL - Temps de service: ${tourHours.toFixed(1)}h > ${MAX_DAILY_SERVICE_HOURS}h (Code des transports D.3312-51)\nVous devez réduire le nombre d'arrêts ou diviser en 2 tournées.`);
      return;
    }
    if (!isDriveTimeLegal) {
      if (!confirm(`⚠️ Temps de conduite: ${driveHours.toFixed(1)}h > ${MAX_DAILY_DRIVE_HOURS}h (Règlement CE 561/2006)\nCela nécessite une dérogation exceptionnelle. Continuer ?`)) {
        return;
      }
    }
    if (timeWindowViolations.length > 0) {
      if (!confirm(`${timeWindowViolations.length} créneaux ne seront pas respectés. Continuer quand même ?`)) {
        return;
      }
    }

    const tourData = {
      name: tourName,
      date: tourDate,
      driver_id: selectedDriver,
      vehicle_id: selectedVehicle,
      start_time: startTime,
      stops: stops,
      status: "planned",
    };

    if (onSave) {
      onSave(tourData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl my-8 flex flex-col max-h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? 'Modifier la tournée' : 'Nouvelle tournée'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isEditMode ? 'Modifiez les détails de votre tournée' : 'Planifiez une nouvelle tournée de livraison'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollContainerRef}>
          {/* Informations générales */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar size={18} />
              Informations générales
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom de la tournée *</label>
                <input
                  type="text"
                  value={tourName}
                  onChange={(e) => setTourName(e.target.value)}
                  placeholder="Ex: Tournée Nord"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <input
                  type="date"
                  value={tourDate}
                  onChange={(e) => setTourDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Heure de départ *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Affectation */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User size={18} />
              Affectation
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chauffeur *</label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={driversLoading}
                >
                  <option value="">Sélectionner un chauffeur</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id} disabled={driver.status !== "available"}>
                      {driver.name} {driver.status !== "available" && "(Indisponible)"}
                    </option>
                  ))}
                </select>
                {driver && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{driver.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Véhicule *</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={vehiclesLoading}
                >
                  <option value="">Sélectionner un véhicule</option>
                  {vehicles.map(v => {
                    // ✅ Helper pour obtenir l'immatriculation
                    const registration = getVehicleRegistration(v);
                    
                    // ✅ Désactiver uniquement si en maintenance, vendu ou inactif
                    const isDisabled = ['maintenance', 'sold', 'inactive'].includes(v.status);
                    
                    // ✅ Label de statut
                    const statusLabel = isDisabled ? ` (${v.status === 'maintenance' ? 'En maintenance' : v.status === 'sold' ? 'Vendu' : 'Inactif'})` : '';
                    
                    return (
                      <option key={v.id} value={v.id} disabled={isDisabled}>
                        {v.name} - {registration}{statusLabel}
                      </option>
                    );
                  })}
                </select>
                {vehicle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Capacité: {vehicleCapacityKg} kg • {vehicleCapacityM3} m³
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CONFORMITÉ RÉGLEMENTAIRE */}
          {stops.length > 0 && (
            <div className={`rounded-lg p-4 border ${
              amplitudeStatus === 'illegal' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
              amplitudeStatus === 'warning' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
              amplitudeStatus === 'caution' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
              'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield size={18} />
                  Conformité réglementaire
                  {amplitudeStatus === 'illegal' && <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />}
                  {amplitudeStatus === 'warning' && <AlertCircle size={18} className="text-orange-600 dark:text-orange-400" />}
                </h3>
                <span className={`text-2xl font-bold ${
                  amplitudeStatus === 'illegal' ? 'text-red-600 dark:text-red-400' :
                  amplitudeStatus === 'warning' ? 'text-orange-600 dark:text-orange-400' :
                  amplitudeStatus === 'caution' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  {tourHours.toFixed(1)}h
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Temps de conduite: {driveHours > MAX_DAILY_DRIVE_HOURS && '⚠️'}
                  </span>
                  <span className={`font-medium ${
                    driveHours > MAX_DAILY_DRIVE_HOURS ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {Math.floor(driveHours)}h{Math.round((driveHours % 1) * 60)}min / {MAX_DAILY_DRIVE_HOURS}h max
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Temps arrêts ({stops.length} stops):</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {Math.floor(totalStopMinutes / 60)}h{totalStopMinutes % 60}min
                  </span>
                </div>
                
                {breaksCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Pauses réglementaires ({breaksCount} × {MANDATORY_BREAK_MINUTES}min):
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {breaksCount * MANDATORY_BREAK_MINUTES}min
                    </span>
                  </div>
                )}
                
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    Temps de service total: {tourHours > MAX_DAILY_SERVICE_HOURS && '🚨'}
                  </span>
                  <span className={`font-bold ${
                    tourHours > MAX_DAILY_SERVICE_HOURS ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {Math.floor(tourHours)}h{Math.round((tourHours % 1) * 60)}min / {MAX_DAILY_SERVICE_HOURS}h max
                  </span>
                </div>
              </div>

              {amplitudeStatus === 'illegal' && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">🚨 ILLÉGAL - Code des transports D.3312-51</p>
                    <p className="mt-1">Le temps de service dépasse {MAX_DAILY_SERVICE_HOURS}h. Vous devez:</p>
                    <ul className="list-disc ml-5 mt-1">
                      <li>Réduire le nombre d'arrêts</li>
                      <li>Diviser en 2 tournées distinctes</li>
                    </ul>
                  </div>
                </div>
              )}

              {amplitudeStatus === 'warning' && !isDriveTimeLegal && (
                <div className="mt-3 flex items-start gap-2 text-sm text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">⚠️ Règlement CE 561/2006</p>
                    <p className="mt-1">Temps de conduite {MAX_DAILY_DRIVE_HOURS}h. Possible uniquement 2× par semaine avec dérogation.</p>
                  </div>
                </div>
              )}

              {breaksCount > 0 && (
                <div className="mt-3 flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                  <Clock size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">📋 Pauses réglementaires obligatoires</p>
                    <p className="mt-1">{breaksCount} pause(s) de {MANDATORY_BREAK_MINUTES}min après chaque {MAX_CONTINUOUS_DRIVE_MINUTES / 60}h de conduite</p>
                  </div>
                </div>
              )}

              {timeWindowViolations.length > 0 && (
                <div className="mt-3 flex items-start gap-2 text-sm text-orange-700 dark:text-orange-300">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    {timeWindowViolations.length} créneau(x) ne pourront pas être respecté(s) avec cet ordre
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Charge du véhicule */}
          {vehicle && stops.length > 0 && (
            <div className={`rounded-lg p-4 border ${
              isOverloaded 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }`}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Package size={18} />
                Charge du véhicule
                {isOverloaded && <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />}
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">Poids</span>
                    <span className={weightPercent > 100 ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-900 dark:text-white"}>
                      {totalWeight} / {vehicleCapacityKg} kg ({weightPercent.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        weightPercent > 100 ? 'bg-red-600 dark:bg-red-500' : 
                        weightPercent > 80 ? 'bg-orange-500 dark:bg-orange-400' : 
                        'bg-green-500 dark:bg-green-400'
                      }`}
                      style={{ width: `${Math.min(weightPercent, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">Volume</span>
                    <span className={volumePercent > 100 ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-900 dark:text-white"}>
                      {totalVolume.toFixed(1)} / {vehicleCapacityM3} m³ ({volumePercent.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        volumePercent > 100 ? 'bg-red-600 dark:bg-red-500' : 
                        volumePercent > 80 ? 'bg-orange-500 dark:bg-orange-400' : 
                        'bg-green-500 dark:bg-green-400'
                      }`}
                      style={{ width: `${Math.min(volumePercent, 100)}%` }}
                    />
                  </div>
                </div>

                {isOverloaded && (
                  <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300 mt-2">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>Véhicule en surcharge. Réduisez le nombre de livraisons ou choisissez un véhicule plus grand.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Points de livraison avec Drag & Drop */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin size={18} />
                Points de livraison ({stops.length})
              </h3>
              <button
                onClick={() => {
                  setEditingStopId(null);
                  setShowAddStop(true);
                }}
                className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-1 text-sm font-medium"
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>

            {stops.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MapPin size={48} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun point de livraison ajouté</p>
                <p className="text-xs mt-1">Cliquez sur "Ajouter" pour commencer</p>
              </div>
            ) : (
              <div className="space-y-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={stops.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {stops.map((stop, index) => (
                      <SortableStop
                        key={stop.id}
                        stop={stop}
                        index={index}
                        onEdit={handleEditStop}
                        onRemove={handleRemoveStop}
                        estimatedTime={estimatedTimes[index]}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                  💡 Glissez-déposez les points pour réorganiser l'itinéraire
                </p>
              </div>
            )}
          </div>

          {/* Formulaire d'ajout/édition */}
          {showAddStop && (
            <div ref={formRef} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-300 dark:border-blue-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                {editingStopId ? '✏️ Modifier le point' : '➕ Nouveau point de livraison'}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Adresse * 
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Tapez pour rechercher)</span>
                  </label>
                  <AddressAutocomplete
                    value={newStop.address}
                    onChange={(value) => setNewStop({...newStop, address: value})}
                    onSelect={(suggestion) => {
                      setNewStop({
                        ...newStop,
                        address: suggestion.display_name,
                        latitude: suggestion.latitude,
                        longitude: suggestion.longitude
                      });
                    }}
                    placeholder="Commencez à taper une adresse..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du client *</label>
                  <input
                    type="text"
                    value={newStop.customerName}
                    onChange={(e) => setNewStop({...newStop, customerName: e.target.value})}
                    placeholder="Nom du client"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={newStop.customerPhone}
                    onChange={(e) => setNewStop({...newStop, customerPhone: e.target.value})}
                    placeholder="06 12 34 56 78"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Créneau début</label>
                  <input
                    type="time"
                    value={newStop.timeWindowStart}
                    onChange={(e) => setNewStop({...newStop, timeWindowStart: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Créneau fin</label>
                  <input
                    type="time"
                    value={newStop.timeWindowEnd}
                    onChange={(e) => setNewStop({...newStop, timeWindowEnd: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Poids (kg)</label>
                  <input
                    type="number"
                    value={newStop.weight_kg}
                    onChange={(e) => setNewStop({...newStop, weight_kg: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Volume (m³)</label>
                  <input
                    type="number"
                    value={newStop.volume_m3}
                    onChange={(e) => setNewStop({...newStop, volume_m3: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ⏱️ Temps d'arrêt estimé
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewStop({...newStop, estimated_stop_time: 5})}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                        newStop.estimated_stop_time === 5
                          ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 font-medium'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      ⚡ 5min
                      <span className="text-xs block mt-0.5 opacity-75">Express</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStop({...newStop, estimated_stop_time: 15})}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                        newStop.estimated_stop_time === 15
                          ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 font-medium'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      📦 15min
                      <span className="text-xs block mt-0.5 opacity-75">Standard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStop({...newStop, estimated_stop_time: 30})}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                        newStop.estimated_stop_time === 30
                          ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 font-medium'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      🏗️ 30min
                      <span className="text-xs block mt-0.5 opacity-75">Complexe</span>
                    </button>
                    <input
                      type="number"
                      value={newStop.estimated_stop_time || 15}
                      onChange={(e) => setNewStop({...newStop, estimated_stop_time: parseInt(e.target.value) || 15})}
                      min="1"
                      max="120"
                      placeholder="Autre"
                      className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    💡 Ajustez selon le type de livraison (déchargement, signatures, etc.)
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={newStop.notes}
                    onChange={(e) => setNewStop({...newStop, notes: e.target.value})}
                    placeholder="Instructions particulières..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddStop}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium flex items-center gap-2"
                >
                  <Check size={16} />
                  {editingStopId ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!tourName || !selectedDriver || !selectedVehicle || stops.length === 0 || isOverloaded || amplitudeStatus === 'illegal'}
            className={`px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
              !tourName || !selectedDriver || !selectedVehicle || stops.length === 0 || isOverloaded || amplitudeStatus === 'illegal'
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed"
                : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-sm"
            }`}
          >
            <Check size={18} />
            {isEditMode ? 'Enregistrer' : 'Créer la tournée'}
          </button>
        </div>
      </div>
    </div>
  );
}