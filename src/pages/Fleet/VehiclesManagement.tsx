// src/pages/Fleet/VehiclesManagement.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { 
  TruckIcon, Plus, Edit2, Trash2, Search, 
  AlertTriangle, CheckCircle, XCircle, Clock, Wrench,
  Calendar, Gauge, Package, FileText, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import VehicleFormModal from '../../components/VehicleFormModal';
import type { 
  VehicleRow, 
  VehicleFormData,
  VehicleType,
  VehicleStatus,
} from '../../types/vehicle.types';

// Labels pour affichage
const TYPE_LABELS: Record<VehicleType, string> = {
  van: 'Fourgon',
  truck: 'Camion',
  trailer: 'Remorque'
};

const STATUS_CONFIG: Record<VehicleStatus, { label: string; color: string; icon: any }> = {
  active: { label: 'Actif', color: 'green', icon: CheckCircle },
  maintenance: { label: 'En maintenance', color: 'orange', icon: Wrench },
  inactive: { label: 'Inactif', color: 'gray', icon: XCircle },
  sold: { label: 'Vendu', color: 'red', icon: XCircle }
};

interface Driver {
  id: string;
  name: string;
}

export default function VehiclesManagement() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [user?.company_id]);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchTerm, statusFilter, typeFilter]);

  const loadData = async () => {
    if (!user?.company_id) return;

    try {
      // Charger les véhicules
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      // Charger les chauffeurs pour le dropdown d'affectation
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('id, name')
        .eq('company_id', user.company_id)
        .order('name');

      if (driversError) throw driversError;
      setDrivers(driversData || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const filterVehicles = () => {
    let filtered = [...vehicles];

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.vin?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    // Filtre par type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(v => v.type === typeFilter);
    }

    setFilteredVehicles(filtered);
  };

  const handleSave = async (formData: VehicleFormData) => {
    if (!user?.company_id) return;

    try {
      // ✅ Nettoyer les données : convertir les chaînes vides en null pour les UUID
      const cleanedData = {
        ...formData,
        // Champs UUID - convertir "" en null
        assigned_driver_id: formData.assigned_driver_id || null,
        
        // Champs numériques - convertir "" en null
        capacity_kg: formData.capacity_kg || null,
        capacity_m3: formData.capacity_m3 || null,
        height_m: formData.height_m || null,
        length_m: formData.length_m || null,
        width_m: formData.width_m || null,
        year: formData.year || null,
        current_mileage: formData.current_mileage || null,
        average_consumption: formData.average_consumption || null,
        purchase_price: formData.purchase_price || null,
        road_tax_amount: formData.road_tax_amount || null,
        number_of_axles: formData.number_of_axles || null,
        max_weight: formData.max_weight || null,
        payload: formData.payload || null,
        volume: formData.volume || null,
        
        // Champs date - convertir "" en null
        last_maintenance: formData.last_maintenance || null,
        next_technical_inspection: formData.next_technical_inspection || null,
        purchase_date: formData.purchase_date || null,
        insurance_expiry: formData.insurance_expiry || null,
        road_tax_expiry: formData.road_tax_expiry || null,
        technical_inspection_expiry: formData.technical_inspection_expiry || null,
        last_used_date: formData.last_used_date || null,
        
        // Champs texte - convertir "" en null
        gps_device_id: formData.gps_device_id || null,
        fuel_type: formData.fuel_type || null,
        notes: formData.notes || null,
        mileage_unit: formData.mileage_unit || null,
        vin: formData.vin || null,
        insurance_company: formData.insurance_company || null,
        insurance_policy_number: formData.insurance_policy_number || null,
        equipment_notes: formData.equipment_notes || null,
        home_base: formData.home_base || null,
        brand: formData.brand || null,
        model: formData.model || null,
        color: formData.color || null,
      };

      if (editingVehicle) {
        // ✅ UPDATE avec filtre company_id (defense in depth)
        const { error } = await supabase
          .from('vehicles')
          .update({
            ...cleanedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingVehicle.id)
          .eq('company_id', user.company_id);

        if (error) throw error;
        toast.success('✅ Véhicule mis à jour avec succès');
      } else {
        // Création
        const { error } = await supabase
          .from('vehicles')
          .insert({
            ...cleanedData,
            company_id: user.company_id
          });

        if (error) throw error;
        toast.success('✅ Véhicule ajouté avec succès');
      }

      loadData();
      setShowModal(false);
      setEditingVehicle(null);
    } catch (error: any) {
      console.error('Erreur sauvegarde véhicule:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!user?.company_id) return;
    if (!confirm(`Voulez-vous vraiment supprimer le véhicule "${name}" ?\n\nCette action est irréversible.`)) return;

    try {
      // ✅ DELETE avec filtre company_id (defense in depth)
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)
        .eq('company_id', user.company_id);

      if (error) throw error;
      toast.success('🗑️ Véhicule supprimé');
      loadData();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const openModal = (vehicle?: VehicleRow) => {
    setEditingVehicle(vehicle || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVehicle(null);
  };

  const getStatusBadge = (status: VehicleStatus) => {
    const config = STATUS_CONFIG[status];
    if (!config) return null;

    const Icon = config.icon;
    
    const colorClasses = {
      green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClasses[config.color as keyof typeof colorClasses]}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const getAlertBadge = (vehicle: VehicleRow) => {
    const alerts: string[] = [];
    const today = new Date();

    // Vérifier assurance
    if (vehicle.insurance_expiry) {
      const expiryDate = new Date(vehicle.insurance_expiry);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        alerts.push('Assurance expirée');
      } else if (daysUntilExpiry <= 30) {
        alerts.push(`Assurance: ${daysUntilExpiry}j`);
      }
    }

    // Vérifier contrôle technique
    if (vehicle.technical_inspection_expiry) {
      const expiryDate = new Date(vehicle.technical_inspection_expiry);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        alerts.push('CT expiré');
      } else if (daysUntilExpiry <= 30) {
        alerts.push(`CT: ${daysUntilExpiry}j`);
      }
    }

    // Vérifier taxe à l'essieu
    if (vehicle.road_tax_expiry) {
      const expiryDate = new Date(vehicle.road_tax_expiry);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        alerts.push('Taxe expirée');
      } else if (daysUntilExpiry <= 30) {
        alerts.push(`Taxe: ${daysUntilExpiry}j`);
      }
    }

    if (alerts.length === 0) return null;

    const severity = alerts.some(a => a.includes('expiré')) ? 'critical' : 'warning';

    return (
      <div className={`flex items-center gap-1 text-xs font-medium ${
        severity === 'critical' 
          ? 'text-red-600 dark:text-red-400' 
          : 'text-orange-600 dark:text-orange-400'
      }`}>
        <AlertTriangle size={14} />
        <span>{alerts.length}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des véhicules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <TruckIcon size={32} className="text-orange-600 dark:text-orange-400" />
                Gestion de la Flotte
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''} · {filteredVehicles.length} affiché{filteredVehicles.length > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 flex items-center gap-2 font-medium transition-colors shadow-md"
            >
              <Plus size={20} />
              Nouveau véhicule
            </button>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Actifs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vehicles.filter(v => v.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">En maintenance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vehicles.filter(v => v.status === 'maintenance').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Wrench className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Alertes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vehicles.filter(v => {
                    const today = new Date();
                    return (
                      (v.insurance_expiry && new Date(v.insurance_expiry) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) ||
                      (v.technical_inspection_expiry && new Date(v.technical_inspection_expiry) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) ||
                      (v.road_tax_expiry && new Date(v.road_tax_expiry) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000))
                    );
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Kilométrage total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vehicles.reduce((sum, v) => sum + (v.current_mileage || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Gauge className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, immatriculation, VIN..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Filtre statut */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>

            {/* Filtre type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Tous les types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste des véhicules */}
        {filteredVehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map(vehicle => (
              <div
                key={vehicle.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all p-6 border border-gray-200 dark:border-gray-700"
              >
                {/* Header de la carte */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <TruckIcon size={24} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{vehicle.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{vehicle.registration}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(vehicle.status)}
                    {getAlertBadge(vehicle)}
                  </div>
                </div>

                {/* Informations principales */}
                <div className="space-y-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Type</span>
                    <span className="font-medium text-gray-900 dark:text-white">{TYPE_LABELS[vehicle.type]}</span>
                  </div>
                  
                  {vehicle.brand && vehicle.model && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Modèle</span>
                      <span className="font-medium text-gray-900 dark:text-white">{vehicle.brand} {vehicle.model}</span>
                    </div>
                  )}

                  {vehicle.current_mileage && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Gauge size={14} />
                        Kilométrage
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {vehicle.current_mileage.toLocaleString()} km
                      </span>
                    </div>
                  )}

                  {(vehicle.max_weight || vehicle.volume) && (
                    <div className="flex items-center gap-4 text-sm">
                      {vehicle.max_weight && (
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Package size={14} />
                          <span>{vehicle.max_weight} kg</span>
                        </div>
                      )}
                      {vehicle.volume && (
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Package size={14} />
                          <span>{vehicle.volume} m³</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Équipements */}
                {(vehicle.has_tailgate || vehicle.has_fridge || vehicle.has_gps || vehicle.has_trailer) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {vehicle.has_tailgate && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        Hayon
                      </span>
                    )}
                    {vehicle.has_fridge && (
                      <span className="text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded">
                        Frigo
                      </span>
                    )}
                    {vehicle.has_gps && (
                      <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        GPS
                      </span>
                    )}
                    {vehicle.has_trailer && (
                      <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                        Remorque
                      </span>
                    )}
                  </div>
                )}

                {/* Dates importantes */}
                {(vehicle.insurance_expiry || vehicle.technical_inspection_expiry) && (
                  <div className="space-y-1 mb-4 text-xs">
                    {vehicle.insurance_expiry && (
                      <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <FileText size={12} />
                          Assurance
                        </span>
                        <span>{new Date(vehicle.insurance_expiry).toLocaleDateString()}</span>
                      </div>
                    )}
                    {vehicle.technical_inspection_expiry && (
                      <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Settings size={12} />
                          Contrôle technique
                        </span>
                        <span>{new Date(vehicle.technical_inspection_expiry).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => openModal(vehicle)}
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2 transition-colors font-medium"
                  >
                    <Edit2 size={16} />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle.id, vehicle.name)}
                    className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <TruckIcon size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Aucun véhicule ne correspond aux filtres'
                : 'Aucun véhicule dans votre flotte'}
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
              <button
                onClick={() => openModal()}
                className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Ajouter votre premier véhicule
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Formulaire */}
      <VehicleFormModal
        isOpen={showModal}
        onClose={closeModal}
        onSave={handleSave}
        initialData={editingVehicle}
        drivers={drivers}
      />
    </div>
  );
}