// src/services/dockService.ts
import { supabase } from '../supabaseClient';
import { 
  DockRow, DockBookingRow, DockActivityRow,
  DockInsert, DockBookingInsert, DockActivityInsert,
  DockUpdate, DockBookingUpdate,
  DockWithBookings, DockBookingWithDock,
  DockOccupancyStats, AvailableSlot,
  BookingConflictCheck, DockAvailabilityCheck
} from '../types/dock.types';

class DockError extends Error {
  constructor(message: string, public code: string = 'DOCK_ERROR') {
    super(message);
    this.name = 'DockError';
  }
}

function handleError(error: any, operation: string): never {
  console.error(`[dockService] Erreur ${operation}:`, error);
  let message = `Erreur lors de ${operation}`;
  if (error?.code === '23505') message = 'Cette entrée existe déjà';
  else if (error?.code === '23503') message = 'Référence invalide';
  else if (error?.message) message = error.message;
  throw new DockError(message, error?.code || 'UNKNOWN');
}

// ============================================================
// QUAIS
// ============================================================

export async function getDocks(companyId: string): Promise<DockRow[]> {
  console.log('🔍 [getDocks] companyId:', companyId);
  try {
    const { data, error } = await supabase
      .from('docks')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    
    console.log('📦 [getDocks] Résultat:', { dataLength: data?.length, error });
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('💥 [getDocks] Erreur:', error);
    handleError(error, 'récupération des quais');
  }
}

export async function getDockWithBookings(
  dockId: string,
  includeCompleted: boolean = false
): Promise<DockWithBookings | null> {
  try {
    const { data: dock, error: dockError } = await supabase
      .from('docks')
      .select('*')
      .eq('id', dockId)
      .single();
    if (dockError) throw dockError;
    if (!dock) return null;

    let query = supabase.from('dock_bookings').select('*').eq('dock_id', dockId);
    if (!includeCompleted) {
      query = query.not('status', 'in', '(completed,cancelled,no_show)');
    }
    const { data: bookings, error: bookingsError } = await query.order('slot_start', { ascending: true });
    if (bookingsError) throw bookingsError;

    const currentBooking = bookings?.find(b => b.status === 'in_progress') || null;
    return { ...dock, bookings: bookings || [], current_booking: currentBooking };
  } catch (error: any) {
    handleError(error, 'récupération du quai');
  }
}

export async function createDock(dock: DockInsert): Promise<DockRow> {
  console.log('🔍 [createDock] dock:', dock);
  try {
    const { data, error } = await supabase.from('docks').insert(dock).select().single();
    console.log('📦 [createDock] Résultat:', { data, error });
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('💥 [createDock] Erreur:', error);
    handleError(error, 'création du quai');
  }
}

export async function updateDock(update: DockUpdate): Promise<DockRow> {
  try {
    const { id, ...updates } = update;
    const { data, error } = await supabase.from('docks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } catch (error: any) {
    handleError(error, 'mise à jour du quai');
  }
}

export async function deleteDock(dockId: string): Promise<void> {
  try {
    const { data: activeBookings } = await supabase
      .from('dock_bookings')
      .select('id')
      .eq('dock_id', dockId)
      .in('status', ['confirmed', 'in_progress'])
      .limit(1);
    if (activeBookings && activeBookings.length > 0) {
      throw new DockError('Impossible de supprimer un quai avec des réservations actives', 'ACTIVE_BOOKINGS');
    }
    const { error } = await supabase.from('docks').delete().eq('id', dockId);
    if (error) throw error;
  } catch (error: any) {
    if (error instanceof DockError) throw error;
    handleError(error, 'suppression du quai');
  }
}

// ============================================================
// RÉSERVATIONS
// ============================================================

export async function getDockBookings(
  companyId: string,
  filters?: {
    dock_id?: string;
    status?: string | string[];
    date_from?: string;
    date_to?: string;
  }
): Promise<DockBookingRow[]> {
  console.log('🔍 [getDockBookings] START');
  console.log('📊 companyId:', companyId);
  console.log('📊 filters:', JSON.stringify(filters, null, 2));

  try {
    // Étape 1: Query de base
    console.log('⚙️ Création query de base...');
    let query = supabase
      .from('dock_bookings')
      .select('*')
      .eq('company_id', companyId);
    
    console.log('✅ Query de base OK');

    // Étape 2: Filtres optionnels
    if (filters?.dock_id) {
      console.log('⚙️ Ajout filtre dock_id:', filters.dock_id);
      query = query.eq('dock_id', filters.dock_id);
    }
    
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        console.log('⚙️ Ajout filtre status (array):', filters.status);
        query = query.in('status', filters.status);
      } else {
        console.log('⚙️ Ajout filtre status (string):', filters.status);
        query = query.eq('status', filters.status);
      }
    }
    
    if (filters?.date_from) {
      console.log('⚙️ Ajout filtre date_from:', filters.date_from);
      query = query.gte('slot_start', filters.date_from);
    }
    
    if (filters?.date_to) {
      console.log('⚙️ Ajout filtre date_to:', filters.date_to);
      query = query.lte('slot_start', filters.date_to);
    }

    // Étape 3: Exécution
    console.log('🚀 Exécution query...');
    const { data, error } = await query.order('slot_start', { ascending: true });
    
    console.log('📦 Résultat:', {
      hasData: !!data,
      dataLength: data?.length || 0,
      hasError: !!error,
      error: error
    });

    if (error) {
      console.error('❌ Erreur Supabase:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('✅ SUCCESS - Retour de', data?.length || 0, 'réservations');
    return data || [];

  } catch (error: any) {
    console.error('💥 CATCH dans getDockBookings:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    handleError(error, 'récupération des réservations');
  }
}

export async function getDockBookingWithDock(bookingId: string): Promise<DockBookingWithDock | null> {
  try {
    const { data, error } = await supabase
      .from('dock_bookings')
      .select('*, dock:docks(*)')
      .eq('id', bookingId)
      .single();
    if (error) throw error;
    return data as any;
  } catch (error: any) {
    handleError(error, 'récupération de la réservation');
  }
}

export async function checkBookingConflict(
  dockId: string,
  slotStart: string,
  slotEnd: string,
  excludeBookingId?: string
): Promise<BookingConflictCheck> {
  try {
    const { data, error } = await supabase.rpc('check_dock_booking_conflict', {
      p_dock_id: dockId,
      p_slot_start: slotStart,
      p_slot_end: slotEnd,
      p_booking_id: excludeBookingId || null
    });
    if (error) throw error;
    const hasConflict = data === true;
    if (hasConflict) {
      const { data: conflicting } = await supabase
        .from('dock_bookings')
        .select('*')
        .eq('dock_id', dockId)
        .not('status', 'in', '(cancelled,completed,no_show)')
        .or(`slot_start.lte.${slotEnd},slot_end.gte.${slotStart}`)
        .limit(1)
        .single();
      return {
        has_conflict: true,
        conflicting_booking: conflicting,
        message: 'Un autre créneau chevauche cet horaire'
      };
    }
    return { has_conflict: false };
  } catch (error: any) {
    handleError(error, 'vérification des conflits');
  }
}

export async function createDockBooking(booking: DockBookingInsert): Promise<DockBookingRow> {
  console.log('🔍 [createDockBooking] booking:', booking);
  try {
    const conflictCheck = await checkBookingConflict(booking.dock_id, booking.slot_start, booking.slot_end);
    if (conflictCheck.has_conflict) {
      throw new DockError('Conflit de réservation détecté', 'BOOKING_CONFLICT');
    }
    const { data, error } = await supabase.from('dock_bookings').insert(booking).select().single();
    console.log('📦 [createDockBooking] Résultat:', { data, error });
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('💥 [createDockBooking] Erreur:', error);
    if (error instanceof DockError) throw error;
    handleError(error, 'création de la réservation');
  }
}

export async function updateDockBooking(update: DockBookingUpdate): Promise<DockBookingRow> {
  try {
    const { id, ...updates } = update;
    if (updates.slot_start || updates.slot_end) {
      const current = await getDockBookingWithDock(id);
      if (current) {
        const newStart = updates.slot_start || current.slot_start;
        const newEnd = updates.slot_end || current.slot_end;
        const conflictCheck = await checkBookingConflict(current.dock_id, newStart, newEnd, id);
        if (conflictCheck.has_conflict) throw new DockError('Conflit détecté', 'BOOKING_CONFLICT');
      }
    }
    const { data, error } = await supabase.from('dock_bookings').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } catch (error: any) {
    if (error instanceof DockError) throw error;
    handleError(error, 'mise à jour');
  }
}

export async function cancelDockBooking(bookingId: string, reason?: string): Promise<void> {
  await updateDockBooking({ id: bookingId, status: 'cancelled', internal_notes: reason });
}

export async function checkInBooking(
  bookingId: string,
  actualData?: { vehicle_plate?: string; driver_name?: string; driver_phone?: string }
): Promise<DockBookingRow> {
  try {
    const updates: Partial<DockBookingRow> = {
      status: 'in_progress',
      check_in_time: new Date().toISOString(),
      ...actualData
    };
    const { data, error } = await supabase.from('dock_bookings').update(updates).eq('id', bookingId).select().single();
    if (error) throw error;
    return data;
  } catch (error: any) {
    handleError(error, 'check-in');
  }
}

export async function startLoading(bookingId: string): Promise<DockBookingRow> {
  try {
    const { data, error } = await supabase
      .from('dock_bookings')
      .update({ loading_start_time: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error: any) {
    handleError(error, 'démarrage chargement');
  }
}

export async function completeLoading(bookingId: string, actualDuration?: number): Promise<DockBookingRow> {
  try {
    const now = new Date().toISOString();
    const updates: Partial<DockBookingRow> = { loading_end_time: now, status: 'completed' };
    if (actualDuration) {
      updates.actual_duration = actualDuration;
    } else {
      const booking = await getDockBookingWithDock(bookingId);
      if (booking?.loading_start_time) {
        updates.actual_duration = Math.round((new Date(now).getTime() - new Date(booking.loading_start_time).getTime()) / 60000);
      }
    }
    const { data, error } = await supabase.from('dock_bookings').update(updates).eq('id', bookingId).select().single();
    if (error) throw error;
    return data;
  } catch (error: any) {
    handleError(error, 'fin chargement');
  }
}

export async function checkOutBooking(bookingId: string): Promise<DockBookingRow> {
  try {
    const { data, error } = await supabase
      .from('dock_bookings')
      .update({ check_out_time: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error: any) {
    handleError(error, 'check-out');
  }
}

// ============================================================
// STATISTIQUES
// ============================================================

export async function calculateDockOccupancy(
  dockId: string,
  startDate: string,
  endDate: string
): Promise<DockOccupancyStats> {
  try {
    const { data, error } = await supabase.rpc('calculate_dock_occupancy', {
      p_dock_id: dockId,
      p_start_date: startDate,
      p_end_date: endDate
    });
    if (error) throw error;

    const { data: dock } = await supabase.from('docks').select('name').eq('id', dockId).single();
    const { data: bookings } = await supabase
      .from('dock_bookings')
      .select('status, actual_duration')
      .eq('dock_id', dockId)
      .gte('slot_start', startDate)
      .lte('slot_start', endDate);

    const totalBookings = bookings?.length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
    const durations = bookings?.filter(b => b.actual_duration).map(b => b.actual_duration!) || [];
    const averageDuration = durations.length > 0 ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : 0;

    return {
      dock_id: dockId,
      dock_name: dock?.name || 'Inconnu',
      total_minutes: data[0]?.total_minutes || 0,
      occupied_minutes: data[0]?.occupied_minutes || 0,
      occupancy_rate: data[0]?.occupancy_rate || 0,
      total_bookings: totalBookings,
      completed_bookings: completedBookings,
      cancelled_bookings: cancelledBookings,
      average_duration: averageDuration
    };
  } catch (error: any) {
    handleError(error, 'calcul statistiques');
  }
}

export async function getAvailableSlots(
  dockId: string,
  date: string,
  durationMinutes: number = 120
): Promise<AvailableSlot[]> {
  try {
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_dock_id: dockId,
      p_date: date,
      p_slot_duration_minutes: durationMinutes
    });
    if (error) throw error;
    return (data || []).map((slot: any) => ({
      slot_start: new Date(slot.slot_start),
      slot_end: new Date(slot.slot_end),
      duration_minutes: durationMinutes
    }));
  } catch (error: any) {
    handleError(error, 'récupération créneaux');
  }
}

export async function checkDockAvailability(
  dockId: string,
  slotStart: string,
  slotEnd: string
): Promise<DockAvailabilityCheck> {
  try {
    const { data: dock, error } = await supabase.from('docks').select('*').eq('id', dockId).single();
    if (error) throw error;
    if (dock.status !== 'available') {
      return {
        is_available: false,
        dock,
        reason: `Quai ${dock.status === 'maintenance' ? 'en maintenance' : 'fermé'}`
      };
    }
    const conflictCheck = await checkBookingConflict(dockId, slotStart, slotEnd);
    if (conflictCheck.has_conflict) {
      return { is_available: false, dock, reason: 'Créneau déjà réservé' };
    }
    return { is_available: true, dock };
  } catch (error: any) {
    handleError(error, 'vérification disponibilité');
  }
}

export async function getDockActivities(bookingId: string): Promise<DockActivityRow[]> {
  try {
    const { data, error } = await supabase
      .from('dock_activities')
      .select('*, user:users(id, name, email)')
      .eq('dock_booking_id', bookingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    handleError(error, 'récupération activités');
  }
}

export async function createDockActivity(activity: DockActivityInsert): Promise<DockActivityRow> {
  try {
    const { data, error } = await supabase.from('dock_activities').insert(activity).select().single();
    if (error) throw error;
    return data;
  } catch (error: any) {
    handleError(error, 'création activité');
  }
}