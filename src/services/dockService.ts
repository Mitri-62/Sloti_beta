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
  try {
    let query = supabase
      .from('dock_bookings')
      .select('*')
      .eq('company_id', companyId);

    if (filters?.dock_id) {
      query = query.eq('dock_id', filters.dock_id);
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query = query.in('status', statuses);
    }

    if (filters?.date_from) {
      query = query.gte('slot_start', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('slot_end', filters.date_to);
    }

    const { data, error } = await query.order('slot_start', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    handleError(error, 'récupération des réservations');
  }
}

export async function getDockBookingWithDock(bookingId: string): Promise<DockBookingWithDock | null> {
  try {
    const { data, error } = await supabase
      .from('dock_bookings')
      .select(`
        *,
        dock:dock_id(*)
      `)
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
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
// LIEN PLANNING → DOCK BOOKING
// ============================================================

export async function linkPlanningToDockBooking(planningId: string, dockBookingId: string): Promise<void> {
  try {
    console.log('🔗 [linkPlanningToDockBooking] Linking planning:', planningId, 'to booking:', dockBookingId);
    
    const { error } = await supabase
      .from('plannings')
      .update({ dock_booking_id: dockBookingId })
      .eq('id', planningId);

    if (error) throw error;
    console.log('✅ [linkPlanningToDockBooking] Lien créé avec succès');
  } catch (error: any) {
    handleError(error, 'lien planning-quai');
  }
}

export async function unlinkPlanningFromDockBooking(planningId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('plannings')
      .update({ dock_booking_id: null })
      .eq('id', planningId);

    if (error) throw error;
  } catch (error: any) {
    handleError(error, 'suppression du lien planning-quai');
  }
}

// ============================================================
// DISPONIBILITÉ
// ============================================================

export async function checkDockAvailability(
  dockId: string,
  slotStart: string,
  slotEnd: string
): Promise<DockAvailabilityCheck> {
  try {
    // Récupérer le quai
    const { data: dock, error: dockError } = await supabase
      .from('docks')
      .select('*')
      .eq('id', dockId)
      .single();

    if (dockError) throw dockError;
    if (!dock) {
      return {
        is_available: false,
        dock: null as any,
        reason: 'Quai non trouvé'
      };
    }

    // Vérifier le statut du quai
    if (dock.status !== 'available') {
      return {
        is_available: false,
        dock,
        reason: `Quai en ${dock.status}`
      };
    }

    // Vérifier les conflits de réservation
    const conflictCheck = await checkBookingConflict(dockId, slotStart, slotEnd);
    if (conflictCheck.has_conflict) {
      return {
        is_available: false,
        dock,
        reason: 'Créneau en conflit avec une autre réservation'
      };
    }

    return {
      is_available: true,
      dock
    };
  } catch (error: any) {
    handleError(error, 'vérification disponibilité quai');
  }
}

export async function getAvailableSlots(
  dockId: string,
  date: string,
  durationMinutes: number = 120
): Promise<AvailableSlot[]> {
  try {
    const startOfDay = `${date}T00:00:00Z`;
    const endOfDay = `${date}T23:59:59Z`;

    const { data: bookings, error } = await supabase
      .from('dock_bookings')
      .select('slot_start, slot_end, status')
      .eq('dock_id', dockId)
      .gte('slot_start', startOfDay)
      .lte('slot_end', endOfDay)
      .not('status', 'in', '(cancelled,completed,no_show)');

    if (error) throw error;

    const slots: AvailableSlot[] = [];
    const dayStart = new Date(`${date}T06:00:00Z`);
    const dayEnd = new Date(`${date}T22:00:00Z`);
    const slotDuration = durationMinutes * 60 * 1000;

    let currentTime = new Date(dayStart);
    while (currentTime.getTime() + slotDuration <= dayEnd.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration);

      const isAvailable = !bookings?.some(booking => {
        const bookingStart = new Date(booking.slot_start);
        const bookingEnd = new Date(booking.slot_end);
        return (currentTime < bookingEnd && slotEnd > bookingStart);
      });

      if (isAvailable) {
        slots.push({
          slot_start: new Date(currentTime),
          slot_end: slotEnd,
          duration_minutes: durationMinutes
        });
      }

      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000); // +30 min
    }

    return slots;
  } catch (error: any) {
    handleError(error, 'calcul des créneaux disponibles');
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
    const averageDuration = durations.length > 0 ?
      Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    return {
      dock_id: dockId,
      dock_name: dock?.name || 'Unknown',
      total_minutes: data?.total_minutes || 0,
      occupied_minutes: data?.occupied_minutes || 0,
      occupancy_rate: data?.occupancy_rate || 0,
      total_bookings: totalBookings,
      completed_bookings: completedBookings,
      cancelled_bookings: cancelledBookings,
      average_duration: averageDuration
    };
  } catch (error: any) {
    handleError(error, 'calcul d\'occupation');
  }
}

// ============================================================
// ACTIVITÉS
// ============================================================

export async function createDockActivity(activity: DockActivityInsert): Promise<DockActivityRow> {
  try {
    const { data, error } = await supabase
      .from('dock_activities')
      .insert(activity)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    handleError(error, 'création d\'activité');
  }
}

export async function getDockActivities(
  dockBookingId: string
): Promise<DockActivityRow[]> {
  try {
    const { data, error } = await supabase
      .from('dock_activities')
      .select('*')
      .eq('dock_booking_id', dockBookingId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    handleError(error, 'récupération des activités');
  }
}