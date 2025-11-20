// src/components/VehicleFormModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Truck, DollarSign, FileText, Settings, Link2, AlertCircle } from 'lucide-react';
import type { 
  VehicleFormData, 
  VehicleRow, 
  VehicleType, 
  VehicleStatus,
  FuelType
} from '../types/vehicle.types';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: VehicleFormData) => Promise<void>;
  initialData?: VehicleRow | null;
  drivers?: Array<{ id: string; name: string; }>;
}

type TabType = 'info' | 'costs' | 'documents' | 'equipment' | 'assignment';

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  van: 'Fourgon',
  truck: 'Camion',
  trailer: 'Remorque'
};

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  active: 'Actif',
  maintenance: 'En maintenance',
  inactive: 'Inactif',
  sold: 'Vendu'
};

const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  diesel: 'Diesel',
  essence: 'Essence',
  électrique: 'Électrique',
  hybride: 'Hybride',
  gpl: 'GPL'
};

export default function VehicleFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  drivers = []
}: VehicleFormModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<VehicleFormData>({
    name: '',
    registration: '',
    type: 'truck',
    status: 'active',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    max_weight: undefined,
    payload: undefined,
    volume: undefined,
    current_mileage: undefined,
    purchase_price: undefined,
    purchase_date: '',
    average_consumption: undefined,
    fuel_type: 'diesel',
    vin: '',
    insurance_company: '',
    insurance_policy_number: '',
    insurance_expiry: '',
    road_tax_amount: undefined,
    road_tax_expiry: '',
    technical_inspection_expiry: '',
    has_tailgate: false,
    has_fridge: false,
    has_gps: false,
    has_trailer: false,
    number_of_axles: 2,
    equipment_notes: '',
    assigned_driver_id: '',
    home_base: '',
    gps_device_id: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        registration: initialData.registration || '',
        type: initialData.type || 'truck',
        status: initialData.status || 'active',
        brand: initialData.brand || '',
        model: initialData.model || '',
        year: initialData.year || new Date().getFullYear(),
        color: initialData.color || '',
        max_weight: initialData.max_weight || undefined,
        payload: initialData.payload || undefined,
        volume: initialData.volume || undefined,
        current_mileage: initialData.current_mileage || undefined,
        purchase_price: initialData.purchase_price || undefined,
        purchase_date: initialData.purchase_date || '',
        average_consumption: initialData.average_consumption || undefined,
        fuel_type: initialData.fuel_type || 'diesel',
        vin: initialData.vin || '',
        insurance_company: initialData.insurance_company || '',
        insurance_policy_number: initialData.insurance_policy_number || '',
        insurance_expiry: initialData.insurance_expiry || '',
        road_tax_amount: initialData.road_tax_amount || undefined,
        road_tax_expiry: initialData.road_tax_expiry || '',
        technical_inspection_expiry: initialData.technical_inspection_expiry || '',
        has_tailgate: initialData.has_tailgate || false,
        has_fridge: initialData.has_fridge || false,
        has_gps: initialData.has_gps || false,
        has_trailer: initialData.has_trailer || false,
        number_of_axles: initialData.number_of_axles || 2,
        equipment_notes: initialData.equipment_notes || '',
        assigned_driver_id: initialData.assigned_driver_id || '',
        home_base: initialData.home_base || '',
        gps_device_id: initialData.gps_device_id || ''
      });
    }
  }, [initialData, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.registration.trim()) {
      newErrors.registration = 'L\'immatriculation est requise';
    }

    if (formData.vin && formData.vin.length !== 17) {
      newErrors.vin = 'Le VIN doit contenir exactement 17 caractères';
    }

    if (formData.insurance_expiry) {
      const insuranceDate = new Date(formData.insurance_expiry);
      if (insuranceDate < new Date()) {
        newErrors.insurance_expiry = 'La date d\'expiration est déjà passée';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setActiveTab('info');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof VehicleFormData>(
    field: K,
    value: VehicleFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'info', label: 'Informations', icon: Truck },
    { id: 'costs', label: 'Coûts', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'equipment', label: 'Équipements', icon: Settings },
    { id: 'assignment', label: 'Affectation', icon: Link2 }
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {initialData ? 'Modifier le véhicule' : 'Nouveau véhicule'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex overflow-x-auto px-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-medium'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: INFORMATIONS DE BASE */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom du véhicule *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Ex: Camion 1"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Immatriculation *
                  </label>
                  <input
                    type="text"
                    value={formData.registration}
                    onChange={(e) => updateField('registration', e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.registration ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="AB-123-CD"
                  />
                  {errors.registration && <p className="mt-1 text-sm text-red-500">{errors.registration}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => updateField('type', e.target.value as VehicleType)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statut *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => updateField('status', e.target.value as VehicleStatus)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Marque</label>
                  <input
                    type="text"
                    value={formData.brand || ''}
                    onChange={(e) => updateField('brand', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Renault"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modèle</label>
                  <input
                    type="text"
                    value={formData.model || ''}
                    onChange={(e) => updateField('model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Master"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Année</label>
                  <input
                    type="number"
                    value={formData.year || ''}
                    onChange={(e) => updateField('year', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1990"
                    max={new Date().getFullYear() + 1}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Couleur</label>
                  <input
                    type="text"
                    value={formData.color || ''}
                    onChange={(e) => updateField('color', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Blanc"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Caractéristiques Techniques</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Poids max (kg)</label>
                    <input
                      type="number"
                      value={formData.max_weight || ''}
                      onChange={(e) => updateField('max_weight', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="3500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Charge utile (kg)</label>
                    <input
                      type="number"
                      value={formData.payload || ''}
                      onChange={(e) => updateField('payload', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="1500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Volume (m³)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.volume || ''}
                      onChange={(e) => updateField('volume', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COÛTS & MAINTENANCE */}
          {activeTab === 'costs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prix d'achat (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price || ''}
                    onChange={(e) => updateField('purchase_price', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="35000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date d'achat</label>
                  <input
                    type="date"
                    value={formData.purchase_date || ''}
                    onChange={(e) => updateField('purchase_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kilométrage actuel (km)</label>
                  <input
                    type="number"
                    value={formData.current_mileage || ''}
                    onChange={(e) => updateField('current_mileage', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="125000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type de carburant</label>
                  <select
                    value={formData.fuel_type || 'diesel'}
                    onChange={(e) => updateField('fuel_type', e.target.value as FuelType)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(FUEL_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Consommation moyenne (L/100km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.average_consumption || ''}
                    onChange={(e) => updateField('average_consumption', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="9.5"
                  />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">📊 Calcul automatique du TCO</p>
                    <p>Le coût total de possession (TCO) sera calculé automatiquement en incluant le prix d'achat et les coûts de maintenance.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENTS & ASSURANCES */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Numéro VIN (NIV)</label>
                <input
                  type="text"
                  value={formData.vin || ''}
                  onChange={(e) => updateField('vin', e.target.value.toUpperCase())}
                  maxLength={17}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.vin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="17 caractères"
                />
                {errors.vin && <p className="mt-1 text-sm text-red-500">{errors.vin}</p>}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Numéro d'identification du véhicule (17 caractères)</p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📄 Assurance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Compagnie d'assurance</label>
                    <input
                      type="text"
                      value={formData.insurance_company || ''}
                      onChange={(e) => updateField('insurance_company', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: AXA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Numéro de police</label>
                    <input
                      type="text"
                      value={formData.insurance_policy_number || ''}
                      onChange={(e) => updateField('insurance_policy_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: POL-123456"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date d'expiration</label>
                    <input
                      type="date"
                      value={formData.insurance_expiry || ''}
                      onChange={(e) => updateField('insurance_expiry', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors.insurance_expiry ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.insurance_expiry && <p className="mt-1 text-sm text-red-500">{errors.insurance_expiry}</p>}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🚛 Taxe à l'essieu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Montant (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.road_tax_amount || ''}
                      onChange={(e) => updateField('road_tax_amount', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="350"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date d'expiration</label>
                    <input
                      type="date"
                      value={formData.road_tax_expiry || ''}
                      onChange={(e) => updateField('road_tax_expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🔧 Contrôle Technique</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date d'expiration</label>
                  <input
                    type="date"
                    value={formData.technical_inspection_expiry || ''}
                    onChange={(e) => updateField('technical_inspection_expiry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ÉQUIPEMENTS */}
          {activeTab === 'equipment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.has_tailgate || false}
                    onChange={(e) => updateField('has_tailgate', e.target.checked)}
                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">Hayon élévateur</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Équipé d'un hayon pour chargement</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.has_fridge || false}
                    onChange={(e) => updateField('has_fridge', e.target.checked)}
                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">Système frigorifique</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Transport à température contrôlée</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.has_gps || false}
                    onChange={(e) => updateField('has_gps', e.target.checked)}
                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">GPS embarqué</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Système de navigation installé</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.has_trailer || false}
                    onChange={(e) => updateField('has_trailer', e.target.checked)}
                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">Avec remorque</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Véhicule tractant une remorque</p>
                  </div>
                </label>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Caractéristiques</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre d'essieux</label>
                    <input
                      type="number"
                      min="2"
                      max="5"
                      value={formData.number_of_axles || 2}
                      onChange={(e) => updateField('number_of_axles', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ID Dispositif GPS</label>
                    <input
                      type="text"
                      value={formData.gps_device_id || ''}
                      onChange={(e) => updateField('gps_device_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="GPS-12345"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes supplémentaires</label>
                  <textarea
                    value={formData.equipment_notes || ''}
                    onChange={(e) => updateField('equipment_notes', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Décrivez les équipements spéciaux ou modifications..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AFFECTATION */}
          {activeTab === 'assignment' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Chauffeur attitré</label>
                <select
                  value={formData.assigned_driver_id || ''}
                  onChange={(e) => updateField('assigned_driver_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Aucun chauffeur attitré</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>{driver.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Le chauffeur principal assigné à ce véhicule</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base de rattachement</label>
                <input
                  type="text"
                  value={formData.home_base || ''}
                  onChange={(e) => updateField('home_base', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Dépôt Paris Nord"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Lieu de stationnement habituel du véhicule</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">👥 Chauffeurs autorisés</p>
                    <p>Vous pourrez gérer la liste complète des chauffeurs autorisés à conduire ce véhicule après sa création.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Annuler
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-md"
          >
            {loading ? 'Enregistrement...' : initialData ? 'Mettre à jour' : 'Créer le véhicule'}
          </button>
        </div>
      </div>
    </div>
  );
}