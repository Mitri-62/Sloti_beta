// src/types/vehicle.types.ts - TYPES ÉTENDUS POUR GESTION DE FLOTTE

// ============================================
// TYPES DE BASE
// ============================================

export type VehicleStatus = 'active' | 'maintenance' | 'inactive' | 'sold';
export type VehicleType = 'van' | 'truck' | 'trailer';
export type FuelType = 'diesel' | 'essence' | 'électrique' | 'hybride' | 'gpl';
export type MaintenanceType = 'révision' | 'réparation' | 'pneus' | 'vidange' | 'carrosserie' | 'autre';
export type DocumentType = 'photo' | 'insurance' | 'registration' | 'technical_inspection' | 'invoice' | 'other';
export type AlertSeverity = 'critical' | 'warning' | 'info';

// ============================================
// INTERFACE VEHICLE (TABLE PRINCIPALE)
// ============================================

export interface VehicleRow {
  id: string;
  company_id: string;
  name: string;
  registration: string;
  type: VehicleType;
  status: VehicleStatus;
  
  // Caractéristiques techniques
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  max_weight?: number | null; // en kg
  payload?: number | null; // en kg
  volume?: number | null; // en m³
  
  // Dimensions (ajouté)
  capacity_kg?: number | null;
  capacity_m3?: number | null;
  height_m?: number | null;
  length_m?: number | null;
  width_m?: number | null;
  
  // 🔧 MAINTENANCE & COÛTS
  current_mileage?: number | null;
  mileage_unit?: string | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  average_consumption?: number | null;
  fuel_type?: FuelType | null;
  last_maintenance?: string | null;
  next_technical_inspection?: string | null;
  
  // 📄 DOCUMENTS & ASSURANCES
  vin?: string | null;
  insurance_company?: string | null;
  insurance_policy_number?: string | null;
  insurance_expiry?: string | null;
  road_tax_amount?: number | null;
  road_tax_expiry?: string | null;
  technical_inspection_expiry?: string | null;
  
  // 🚛 ÉQUIPEMENTS
  has_tailgate?: boolean | null;
  has_fridge?: boolean | null;
  has_gps?: boolean | null;
  has_trailer?: boolean | null;
  number_of_axles?: number | null;
  equipment_notes?: string | null;
  
  // 🔗 AFFECTATIONS
  assigned_driver_id?: string | null;
  home_base?: string | null;
  
  // 📊 STATISTIQUES
  total_tours_completed?: number | null;
  total_distance_traveled?: number | null;
  last_used_date?: string | null;
  
  // Notes
  notes?: string | null;
  
  // GPS & Tracking
  gps_device_id?: string | null;
  last_gps_update?: string | null;
  current_location_lat?: number | null;
  current_location_lng?: number | null;
  last_location_update?: string | null;
  
  created_at: string;
  updated_at: string;
}

// ============================================
// VEHICLE AVEC RELATIONS
// ============================================

export interface Vehicle extends VehicleRow {
  assigned_driver?: {
    id: string;
    name: string;
    license_number: string;
  } | null;
  authorized_drivers?: AuthorizedDriver[];
  documents?: VehicleDocument[];
  maintenance_records?: MaintenanceRecord[];
  mileage_history?: MileageHistoryEntry[];
}

// ============================================
// HISTORIQUE KILOMÉTRAGE
// ============================================

export interface MileageHistoryEntry {
  id: string;
  company_id: string;
  vehicle_id: string;
  mileage: number;
  recorded_date: string;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface MileageHistoryInput {
  vehicle_id: string;
  mileage: number;
  recorded_date: string;
  notes?: string;
}

// ============================================
// MAINTENANCE
// ============================================

export interface MaintenanceRecord {
  id: string;
  company_id: string;
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  cost?: number | null;
  date: string;
  mileage_at_maintenance?: number | null;
  next_maintenance_date?: string | null;
  next_maintenance_mileage?: number | null;
  description?: string | null;
  invoice_number?: string | null;
  garage_name?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface MaintenanceInput {
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  cost?: number;
  date: string;
  mileage_at_maintenance?: number;
  next_maintenance_date?: string;
  next_maintenance_mileage?: number;
  description?: string;
  invoice_number?: string;
  garage_name?: string;
}

export interface NextMaintenance {
  maintenance_type: MaintenanceType;
  next_date?: string | null;
  next_mileage?: number | null;
  days_remaining?: number | null;
  mileage_remaining?: number | null;
}

// ============================================
// DOCUMENTS & PHOTOS
// ============================================

export interface VehicleDocument {
  id: string;
  company_id: string;
  vehicle_id: string;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  description?: string | null;
  uploaded_at: string;
  uploaded_by?: string | null;
}

export interface DocumentUploadInput {
  vehicle_id: string;
  document_type: DocumentType;
  file: File;
  description?: string;
}

// ============================================
// CHAUFFEURS AUTORISÉS
// ============================================

export interface AuthorizedDriver {
  vehicle_id: string;
  driver_id: string;
  driver_name: string;
  driver_license: string;
  authorized_since: string;
  authorized_by?: string | null;
  notes?: string | null;
}

export interface AuthorizeDriverInput {
  vehicle_id: string;
  driver_id: string;
  notes?: string;
}

// ============================================
// ALERTES & NOTIFICATIONS
// ============================================

export interface VehicleAlert {
  vehicle_id: string;
  vehicle_name: string;
  alert_type: 'insurance' | 'road_tax' | 'technical_inspection' | 'maintenance';
  alert_message: string;
  expiry_date: string;
  days_remaining: number;
  severity: AlertSeverity;
}

// ============================================
// STATISTIQUES & KPIs
// ============================================

export interface VehicleStats {
  vehicle_id: string;
  vehicle_name: string;
  
  // Utilisation
  total_tours: number;
  total_distance: number;
  average_distance_per_tour: number;
  last_used: string | null;
  
  // Coûts
  purchase_price: number;
  total_maintenance_cost: number;
  total_cost: number;
  cost_per_km: number;
  cost_per_tour: number;
  
  // Maintenance
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  maintenance_count: number;
  
  // Consommation
  average_consumption: number | null;
  estimated_fuel_cost_per_100km: number | null;
}

export interface FleetOverviewStats {
  total_vehicles: number;
  active_vehicles: number;
  in_maintenance: number;
  
  total_tours_today: number;
  total_distance_today: number;
  
  alerts_critical: number;
  alerts_warning: number;
  
  average_vehicle_age: number;
  average_mileage: number;
  
  total_fleet_value: number;
  total_maintenance_cost_month: number;
}

// ============================================
// FORMULAIRES - VERSION COMPLÈTE ✅
// ============================================

export interface VehicleFormData {
  // Informations de base (requis)
  name: string;
  registration: string;
  type: VehicleType;
  status: VehicleStatus;
  
  // Informations générales
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  
  // Caractéristiques & Dimensions
  max_weight?: number | null;
  payload?: number | null;
  volume?: number | null;
  capacity_kg?: number | null;
  capacity_m3?: number | null;
  height_m?: number | null;
  length_m?: number | null;
  width_m?: number | null;
  
  // Coûts & Maintenance
  current_mileage?: number | null;
  mileage_unit?: string | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  average_consumption?: number | null;
  fuel_type?: FuelType | null;
  last_maintenance?: string | null;
  next_technical_inspection?: string | null;
  
  // Documents & Assurances
  vin?: string | null;
  insurance_company?: string | null;
  insurance_policy_number?: string | null;
  insurance_expiry?: string | null;
  road_tax_amount?: number | null;
  road_tax_expiry?: string | null;
  technical_inspection_expiry?: string | null;
  
  // Équipements
  has_tailgate?: boolean | null;
  has_fridge?: boolean | null;
  has_gps?: boolean | null;
  has_trailer?: boolean | null;
  number_of_axles?: number | null;
  equipment_notes?: string | null;
  
  // Affectations
  assigned_driver_id?: string | null;
  home_base?: string | null;
  
  // Statistiques
  last_used_date?: string | null;
  
  // Notes
  notes?: string | null;
  
  // GPS
  gps_device_id?: string | null;
}

// ============================================
// FILTRES & TRI
// ============================================

export interface VehicleFilters {
  status?: VehicleStatus[];
  type?: VehicleType[];
  assigned_driver_id?: string;
  has_alerts?: boolean;
  search?: string;
}

export type VehicleSortField = 
  | 'name' 
  | 'registration' 
  | 'type' 
  | 'status' 
  | 'mileage' 
  | 'last_used'
  | 'insurance_expiry';

export interface VehicleSortConfig {
  field: VehicleSortField;
  direction: 'asc' | 'desc';
}

// ============================================
// EXPORTS UTILITAIRES
// ============================================

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  diesel: 'Diesel',
  essence: 'Essence',
  électrique: 'Électrique',
  hybride: 'Hybride',
  gpl: 'GPL'
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  révision: 'Révision',
  réparation: 'Réparation',
  pneus: 'Pneus',
  vidange: 'Vidange',
  carrosserie: 'Carrosserie',
  autre: 'Autre'
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  photo: 'Photo',
  insurance: 'Assurance',
  registration: 'Carte grise',
  technical_inspection: 'Contrôle technique',
  invoice: 'Facture',
  other: 'Autre'
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  active: 'Actif',
  maintenance: 'En maintenance',
  inactive: 'Inactif',
  sold: 'Vendu'
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  van: 'Fourgon',
  truck: 'Camion',
  trailer: 'Remorque'
};