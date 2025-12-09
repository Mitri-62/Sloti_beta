// src/types/booking.types.ts
/**
 * Types pour le module Booking Transport
 */

// ============================================================
// ENUMS & TYPES CONSTANTS
// ============================================================

export type BookingStatus = 
  | 'draft'       // Brouillon
  | 'pending'     // En attente de devis
  | 'quoted'      // Devis reçus
  | 'confirmed'   // Réservation confirmée
  | 'in_transit'  // En cours de livraison
  | 'delivered'   // Livré
  | 'cancelled';  // Annulé

export type CarrierType = 
  | 'express'       // Livraison express (< 24h)
  | 'standard'      // Standard (24-48h)
  | 'economique'    // Économique (48-72h)
  | 'frigorifique'  // Transport frigorifique
  | 'volumineux';   // Gros volumes

export type MerchandiseType = 
  | 'palette'
  | 'colis'
  | 'vrac'
  | 'container'
  | 'autre';

// ============================================================
// INTERFACES
// ============================================================

/**
 * Transporteur partenaire
 */
export interface Carrier {
  id: string;
  company_id: string;
  name: string;
  logo_url?: string | null;
  type: CarrierType;
  base_price_per_km: number;
  min_price: number;
  delivery_delay_hours: number;
  rating: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Devis simulé d'un transporteur
 */
export interface CarrierQuote {
  carrier: Carrier;
  price: number;
  estimated_delivery: Date;
  delivery_delay_hours: number;
}

/**
 * Booking de transport
 */
export interface TransportBooking {
  id: string;
  company_id: string;
  user_id?: string | null;
  reference: string;
  status: BookingStatus;
  
  // Origine
  origin_address: string;
  origin_city: string;
  origin_postal_code?: string | null;
  origin_country: string;
  origin_contact_name?: string | null;
  origin_contact_phone?: string | null;
  
  // Destination
  destination_address: string;
  destination_city: string;
  destination_postal_code?: string | null;
  destination_country: string;
  destination_contact_name?: string | null;
  destination_contact_phone?: string | null;
  
  // Marchandise
  merchandise_type: string;
  merchandise_description?: string | null;
  weight_kg?: number | null;
  volume_m3?: number | null;
  quantity: number;
  is_fragile: boolean;
  is_dangerous: boolean;
  temperature_controlled: boolean;
  temperature_min?: number | null;
  temperature_max?: number | null;
  
  // Dates
  pickup_date: string;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;
  delivery_date_requested?: string | null;
  delivery_date_estimated?: string | null;
  delivery_date_actual?: string | null;
  
  // Transporteur
  carrier_id?: string | null;
  carrier_name?: string | null;
  quoted_price?: number | null;
  final_price?: number | null;
  
  // Tracking
  tracking_number?: string | null;
  tracking_url?: string | null;
  
  // Notes
  special_instructions?: string | null;
  internal_notes?: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Relations (jointures)
  carrier?: Carrier | null;
}

/**
 * Formulaire de création de booking
 */
export interface TransportBookingFormData {
  // Origine
  origin_address: string;
  origin_city: string;
  origin_postal_code?: string;
  origin_country?: string;
  origin_contact_name?: string;
  origin_contact_phone?: string;
  
  // Destination
  destination_address: string;
  destination_city: string;
  destination_postal_code?: string;
  destination_country?: string;
  destination_contact_name?: string;
  destination_contact_phone?: string;
  
  // Marchandise
  merchandise_type: MerchandiseType;
  merchandise_description?: string;
  weight_kg?: number;
  volume_m3?: number;
  quantity?: number;
  is_fragile?: boolean;
  is_dangerous?: boolean;
  temperature_controlled?: boolean;
  temperature_min?: number;
  temperature_max?: number;
  
  // Dates
  pickup_date: string;
  pickup_time_from?: string;
  pickup_time_to?: string;
  delivery_date_requested?: string;
  
  // Notes
  special_instructions?: string;
}

// ============================================================
// HELPERS
// ============================================================

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  quoted: 'Devis reçus',
  confirmed: 'Confirmé',
  in_transit: 'En transit',
  delivered: 'Livré',
  cancelled: 'Annulé'
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  draft: 'gray',
  pending: 'yellow',
  quoted: 'blue',
  confirmed: 'green',
  in_transit: 'purple',
  delivered: 'emerald',
  cancelled: 'red'
};

export const CARRIER_TYPE_LABELS: Record<CarrierType, string> = {
  express: 'Express',
  standard: 'Standard',
  economique: 'Économique',
  frigorifique: 'Frigorifique',
  volumineux: 'Volumineux'
};

export const MERCHANDISE_TYPE_LABELS: Record<MerchandiseType, string> = {
  palette: 'Palette',
  colis: 'Colis',
  vrac: 'Vrac',
  container: 'Container',
  autre: 'Autre'
};