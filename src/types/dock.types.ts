// src/types/dock.types.ts
// ============================================================
// TYPES DE BASE
// ============================================================

export type DockType = 'loading' | 'unloading' | 'both';
export type DockStatus = 'available' | 'occupied' | 'maintenance' | 'closed';
export type BookingStatus = 'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type ActivityType = 'check_in' | 'check_out' | 'start_loading' | 'end_loading' | 'status_change' | 'delay_reported' | 'incident_reported';

// ============================================================
// TYPES SUPABASE (DATABASE SCHEMA)
// ============================================================

export interface DockRow {
  id: string;
  company_id: string;
  name: string;
  type: DockType;
  status: DockStatus;
  description?: string | null;
  zone?: string | null;
  capacity?: string | null;
  operating_hours_start?: string | null;
  operating_hours_end?: string | null;
  
  // ✅ CHAMPS DE MAINTENANCE DÉTAILLÉE
  maintenance_reason?: string | null;
  maintenance_start_date?: string | null;  // Format: 'YYYY-MM-DD'
  maintenance_end_date?: string | null;    // Format: 'YYYY-MM-DD'
  maintenance_cost?: number | null;
  maintenance_technician?: string | null;
  maintenance_notes?: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface DockBookingRow {
  id: string;
  dock_id: string;
  company_id: string;
  slot_start: string;
  slot_end: string;
  status: BookingStatus;
  type: 'loading' | 'unloading';
  transporter_name: string;
  vehicle_plate?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  estimated_duration?: number | null;
  actual_duration?: number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  loading_start_time?: string | null;
  loading_end_time?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DockActivityRow {
  id: string;
  dock_booking_id: string;
  activity_type: ActivityType;
  performed_by: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

// ============================================================
// TYPES POUR INSERT (sans id, timestamps auto)
// ============================================================

export type DockInsert = Omit<DockRow, 'id' | 'created_at' | 'updated_at'>;
export type DockBookingInsert = Omit<DockBookingRow, 'id' | 'created_at' | 'updated_at'>;
export type DockActivityInsert = Omit<DockActivityRow, 'id' | 'created_at'>;

// ============================================================
// TYPES POUR UPDATE (id requis, reste optionnel)
// ============================================================

export type DockUpdate = Partial<Omit<DockRow, 'id' | 'company_id' | 'created_at'>> & { id: string };
export type DockBookingUpdate = Partial<Omit<DockBookingRow, 'id' | 'company_id' | 'dock_id' | 'created_at'>> & { id: string };

// ============================================================
// TYPES COMPOSÉS (avec relations)
// ============================================================

export interface DockWithBookings extends DockRow {
  bookings: DockBookingRow[];
  current_booking?: DockBookingRow | null;
}

export interface DockBookingWithDock extends DockBookingRow {
  dock: DockRow;
}

export interface DockBookingWithActivities extends DockBookingRow {
  activities: DockActivityRow[];
}

// ============================================================
// TYPES POUR STATISTIQUES
// ============================================================

export interface DockOccupancyStats {
  dock_id: string;
  dock_name: string;
  total_minutes: number;
  occupied_minutes: number;
  occupancy_rate: number;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  average_duration: number;
}

export interface DockDashboardStats {
  total_docks: number;
  available_docks: number;
  occupied_docks: number;
  maintenance_docks: number;
  today_bookings: number;
  today_completed: number;
  today_in_progress: number;
  average_occupancy_rate: number;
  total_weekly_bookings: number;
}

export interface TransporterPerformance {
  transporter_name: string;
  total_bookings: number;
  completed_on_time: number;
  late_arrivals: number;
  no_shows: number;
  average_delay_minutes: number;
  punctuality_rate: number;
}

// ============================================================
// TYPES UTILITAIRES
// ============================================================

export interface AvailableSlot {
  slot_start: Date;
  slot_end: Date;
  duration_minutes: number;
}

export interface BookingConflictCheck {
  has_conflict: boolean;
  conflicting_booking?: DockBookingRow;
  message?: string;
}

export interface DockAvailabilityCheck {
  is_available: boolean;
  dock: DockRow;
  reason?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  booking?: DockBookingRow;
}

// ============================================================
// ✅ NOUVEAUX TYPES POUR LA MAINTENANCE
// ============================================================

export interface MaintenanceData {
  maintenance_reason: string;
  maintenance_start_date: string;
  maintenance_end_date: string;
  maintenance_cost: number | null;
  maintenance_technician: string;
  maintenance_notes: string;
}