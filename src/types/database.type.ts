// src/types/database.types.ts
/**
 * Types stricts pour toutes les tables de la base de données
 * Synchronisé avec le schéma Supabase
 */

export interface MasterDataRow {
    id: string;
    company_id: string;
    sku: string;
    designation: string;
    tus: 'FEU' | 'CAR' | 'BAC';
    qty_per_pallet: number;
    poids_net: number;
    poids_brut: number;
    longueur: number;
    largeur: number;
    hauteur: number;
    hauteur_couche: number;
    nb_couches: number;
    ean: string;
    stackable: boolean;
    max_stack_height: number;
    max_stack_weight: number;
    unite_mesure?: string;
    unite?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface StockRow {
    id: string;
    company_id: string;
    ean: string;
    name: string;
    quantity: number;
    type: string;
    lot?: string | null;
    expiration_date?: string | null;
    type_magasin_prenant?: string | null;
    emplacement_prenant?: string | null;
    designation?: string | null;
    emplacement_cedant?: string | null;
    ordre_transfert?: string | null;
    qte_theorique_prenant?: string | null;
    movement_name?: string | null;
    import_date?: string | null;
    created_at: string;
    updated_at?: string;
  }
  
  export interface PlanningRow {
    id: string;
    company_id: string;
    date: string;
    hour: string;
    type: 'Réception' | 'Expédition';
    transporter: string;
    products: string;
    status: 'Prévu' | 'En cours' | 'Chargé' | 'Terminé';
    duration?: number;
    is_forecast?: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface DocumentRow {
    id: string;
    name: string;
    url: string;
    path: string;
    type: string;
    planning_id: string;
    company_id: string;
    created_at: string;
  }
  
  export interface TourRow {
    id: string;
    company_id: string;
    name: string;
    date: string;
    start_time?: string | null;
    end_time?: string | null;
    driver_id?: string | null;
    vehicle_id?: string | null;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    total_distance_km?: number | null;
    estimated_duration_minutes?: number | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface DeliveryStopRow {
    id: string;
    tour_id: string;
    sequence_order: number;
    address: string;
    customer_name: string;
    customer_phone?: string | null;
    time_window_start?: string | null;
    time_window_end?: string | null;
    weight_kg?: number | null;
    volume_m3?: number | null;
    notes?: string | null;
    status: 'pending' | 'arrived' | 'completed' | 'failed';
    estimated_arrival?: string | null;
    actual_arrival?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface DriverRow {
    id: string;
    company_id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    license_number?: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
  }
  
  export interface VehicleRow {
    id: string;
    company_id: string;
    name: string;
    license_plate: string;
    type: string;
    capacity_kg?: number | null;
    capacity_m3?: number | null;
    status: 'active' | 'maintenance' | 'inactive';
    created_at: string;
    updated_at: string;
  }
  
  export interface ChatMessageRow {
    id: string;
    company_id: string;
    channel_id: string;
    user_id: string;
    username: string;
    content: string;
    attachment_url?: string | null;
    attachment_type?: string | null;
    created_at: string;
    updated_at?: string | null;
  }
  
  export interface ChatChannelRow {
    id: string;
    company_id: string;
    name: string;
    description?: string | null;
    is_private: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface ActivityRow {
    id: string;
    company_id: string;
    user_id?: string | null;
    message: string;
    created_at: string;
  }
  
  export interface CompanyRow {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface UserRow {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    company_id?: string | null;
    last_active?: string | null;
    created_at: string;
    updated_at?: string | null;
  }
  
  // Types pour les formulaires (sans id, dates auto)
  export type MasterDataInsert = Omit<MasterDataRow, 'id' | 'created_at' | 'updated_at'>;
  export type StockInsert = Omit<StockRow, 'id' | 'created_at' | 'updated_at'>;
  export type PlanningInsert = Omit<PlanningRow, 'id' | 'created_at' | 'updated_at'>;
  export type TourInsert = Omit<TourRow, 'id' | 'created_at' | 'updated_at'>;
  
  // Types pour les updates (tout optionnel sauf id)
  export type MasterDataUpdate = Partial<Omit<MasterDataRow, 'id' | 'created_at'>> & { id: string };
  export type StockUpdate = Partial<Omit<StockRow, 'id' | 'created_at'>> & { id: string };
  export type PlanningUpdate = Partial<Omit<PlanningRow, 'id' | 'created_at'>> & { id: string };