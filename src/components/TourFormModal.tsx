import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  X, User, Calendar, MapPin, Plus, Trash2,
  AlertTriangle, Package, Check
} from "lucide-react";
import { useVehicles, useDrivers } from "../hooks/useTourData";

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
}

interface TourFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tourData: any) => void;
  selectedDate: Date;
  initialData?: any;
  isEditMode?: boolean;
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
  });

  // Charger les données en mode édition
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
      
      // Charger les stops
      if (initialData.id) {
        loadExistingStops(initialData.id);
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
        notes: s.notes || ''
      }));
      setStops(formatted);
    }
  };

  if (!isOpen) return null;

  const vehicle = vehicles.find(v => v.id === selectedVehicle);
  const driver = drivers.find(d => d.id === selectedDriver);

  const totalWeight = stops.reduce((sum, s) => sum + (s.weight_kg || 0), 0);
  const totalVolume = stops.reduce((sum, s) => sum + (s.volume_m3 || 0), 0);
  const weightPercent = vehicle ? (totalWeight / vehicle.capacity_kg) * 100 : 0;
  const volumePercent = vehicle ? (totalVolume / vehicle.capacity_m3) * 100 : 0;
  const isOverloaded = weightPercent > 100 || volumePercent > 100;

  const handleAddStop = () => {
    if (!newStop.address || !newStop.customerName) {
      alert("L'adresse et le nom du client sont obligatoires");
      return;
    }
    
    setStops([...stops, { ...newStop, id: Date.now().toString() }]);
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
    });
    setShowAddStop(false);
  };

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter(s => s.id !== id));
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
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id} disabled={vehicle.status !== "available"}>
                      {vehicle.name} - {vehicle.license_plate} {vehicle.status !== "available" && "(En cours)"}
                    </option>
                  ))}
                </select>
                {vehicle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Capacité: {vehicle.capacity_kg} kg • {vehicle.capacity_m3} m³
                  </p>
                )}
              </div>
            </div>
          </div>

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
                      {totalWeight} / {vehicle.capacity_kg} kg ({weightPercent.toFixed(0)}%)
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
                      {totalVolume.toFixed(1)} / {vehicle.capacity_m3} m³ ({volumePercent.toFixed(0)}%)
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
                    <span>Attention: Le véhicule est en surcharge. Réduisez le nombre de livraisons ou choisissez un véhicule plus grand.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Points de livraison */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin size={18} />
                Points de livraison ({stops.length})
              </h3>
              <button
                onClick={() => setShowAddStop(true)}
                className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-1 text-sm font-medium"
              >
                <Plus size={16} />
                Ajouter un point
              </button>
            </div>

            {stops.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MapPin size={48} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun point de livraison ajouté</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stops.map((stop, index) => (
                  <div key={stop.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold rounded-full">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">{stop.customerName}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 ml-8">{stop.address}</p>
                      <div className="flex items-center gap-4 ml-8 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{stop.customerPhone || "Non renseigné"}</span>
                        <span>{stop.timeWindowStart} - {stop.timeWindowEnd}</span>
                        <span>{stop.weight_kg} kg • {stop.volume_m3} m³</span>
                      </div>
                      {stop.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-8 mt-1 italic">Note: {stop.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveStop(stop.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulaire d'ajout de point */}
          {showAddStop && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-300 dark:border-blue-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Nouveau point de livraison</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse *</label>
                  <input
                    type="text"
                    value={newStop.address}
                    onChange={(e) => setNewStop({...newStop, address: e.target.value})}
                    placeholder="123 Rue de la Livraison, 75001 Paris"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
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
                  Ajouter
                </button>
                <button
                  onClick={() => setShowAddStop(false)}
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
            disabled={!tourName || !selectedDriver || !selectedVehicle || stops.length === 0 || isOverloaded}
            className={`px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
              !tourName || !selectedDriver || !selectedVehicle || stops.length === 0 || isOverloaded
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed"
                : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-sm"
            }`}
          >
            <Check size={18} />
            {isEditMode ? 'Enregistrer les modifications' : 'Créer la tournée'}
          </button>
        </div>
      </div>
    </div>
  );
}