// src/services/dockService.extension.ts
// Extension du dockService pour la liaison Planning ↔ DockBooking

import { supabase } from '../supabaseClient';

/**
 * Lier un planning à une réservation de quai
 */
export async function linkPlanningToDockBooking(
  planningId: string,
  dockBookingId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('plannings')
      .update({ dock_booking_id: dockBookingId })
      .eq('id', planningId);

    if (error) throw error;
  } catch (error: any) {
    console.error('[linkPlanningToDockBooking] Erreur:', error);
    throw new Error('Erreur lors de la liaison planning-quai');
  }
}

/**
 * Retirer le lien entre un planning et un quai
 */
export async function unlinkPlanningFromDockBooking(
  planningId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('plannings')
      .update({ dock_booking_id: null })
      .eq('id', planningId);

    if (error) throw error;
  } catch (error: any) {
    console.error('[unlinkPlanningFromDockBooking] Erreur:', error);
    throw new Error('Erreur lors de la suppression du lien');
  }
}

/**
 * Obtenir tous les plannings liés à un quai pour une période donnée
 */
export async function getPlanningsForDock(
  dockId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<any[]> {
  try {
    let query = supabase
      .from('plannings')
      .select(`
        *,
        dock_booking:dock_bookings!plannings_dock_booking_id_fkey (
          id,
          dock_id,
          slot_start,
          slot_end,
          status
        )
      `)
      .eq('dock_booking.dock_id', dockId);

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    const { data, error } = await query.order('date').order('hour');

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('[getPlanningsForDock] Erreur:', error);
    throw new Error('Erreur lors de la récupération des plannings');
  }
}

/**
 * Synchroniser l'horaire d'un planning avec sa réservation de quai
 */
export async function synchronizePlanningWithDockBooking(
  planningId: string
): Promise<void> {
  try {
    // Récupérer le planning
    const { data: planning, error: planningError } = await supabase
      .from('plannings')
      .select('*, dock_booking:dock_bookings!plannings_dock_booking_id_fkey(*)')
      .eq('id', planningId)
      .single();

    if (planningError) throw planningError;
    if (!planning || !planning.dock_booking) return;

    // Calculer les nouveaux horaires basés sur le planning
    const planningDateTime = `${planning.date}T${planning.hour}:00`;
    const duration = planning.duration || 120;
    const endDateTime = new Date(planningDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + duration);

    // Mettre à jour la réservation de quai
    const { error: updateError } = await supabase
      .from('dock_bookings')
      .update({
        slot_start: planningDateTime,
        slot_end: endDateTime.toISOString(),
        transporter_name: planning.transporter
      })
      .eq('id', planning.dock_booking.id);

    if (updateError) throw updateError;
  } catch (error: any) {
    console.error('[synchronizePlanningWithDockBooking] Erreur:', error);
    throw new Error('Erreur lors de la synchronisation');
  }
}