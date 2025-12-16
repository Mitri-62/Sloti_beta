// src/services/dockService.extension.ts
// Extension du dockService pour la liaison Planning ↔ DockBooking
// 🔒 SÉCURITÉ: Defense-in-depth avec filtres company_id sur toutes les opérations

import { supabase } from '../supabaseClient';

/**
 * Lier un planning à une réservation de quai
 * 🔒 SÉCURITÉ: Ajout du paramètre companyId pour UPDATE
 */
export async function linkPlanningToDockBooking(
  planningId: string,
  dockBookingId: string,
  companyId: string // 🔒 Paramètre ajouté
): Promise<void> {
  if (!companyId) throw new Error('company_id requis'); // 🔒 Guard clause

  try {
    // 🔒 SÉCURITÉ: Defense-in-depth - Ajout du filtre company_id
    const { error } = await supabase
      .from('plannings')
      .update({ dock_booking_id: dockBookingId })
      .eq('id', planningId)
      .eq('company_id', companyId); // 🔒 Defense-in-depth

    if (error) throw error;
  } catch (error: any) {
    console.error('[linkPlanningToDockBooking] Erreur:', error);
    throw new Error('Erreur lors de la liaison planning-quai');
  }
}

/**
 * Retirer le lien entre un planning et un quai
 * 🔒 SÉCURITÉ: Ajout du paramètre companyId pour UPDATE
 */
export async function unlinkPlanningFromDockBooking(
  planningId: string,
  companyId: string // 🔒 Paramètre ajouté
): Promise<void> {
  if (!companyId) throw new Error('company_id requis'); // 🔒 Guard clause

  try {
    // 🔒 SÉCURITÉ: Defense-in-depth - Ajout du filtre company_id
    const { error } = await supabase
      .from('plannings')
      .update({ dock_booking_id: null })
      .eq('id', planningId)
      .eq('company_id', companyId); // 🔒 Defense-in-depth

    if (error) throw error;
  } catch (error: any) {
    console.error('[unlinkPlanningFromDockBooking] Erreur:', error);
    throw new Error('Erreur lors de la suppression du lien');
  }
}

/**
 * Obtenir tous les plannings liés à un quai pour une période donnée
 * 🔒 SÉCURITÉ: Ajout du paramètre companyId pour SELECT
 */
export async function getPlanningsForDock(
  dockId: string,
  companyId: string, // 🔒 Paramètre ajouté
  dateFrom?: string,
  dateTo?: string
): Promise<any[]> {
  if (!companyId) throw new Error('company_id requis'); // 🔒 Guard clause

  try {
    // 🔒 SÉCURITÉ: Defense-in-depth - Ajout du filtre company_id
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
      .eq('company_id', companyId); // 🔒 Defense-in-depth

    // Filtrer par dock_id via la relation dock_booking
    // Note: Le filtrage par dock_id se fait côté client car la relation est nullable

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    const { data, error } = await query.order('date').order('hour');

    if (error) throw error;
    
    // Filtrer côté client pour le dock_id
    const filteredData = (data || []).filter(
      (p: any) => p.dock_booking?.dock_id === dockId
    );
    
    return filteredData;
  } catch (error: any) {
    console.error('[getPlanningsForDock] Erreur:', error);
    throw new Error('Erreur lors de la récupération des plannings');
  }
}

/**
 * Synchroniser l'horaire d'un planning avec sa réservation de quai
 * 🔒 SÉCURITÉ: Ajout du paramètre companyId pour UPDATE
 */
export async function synchronizePlanningWithDockBooking(
  planningId: string,
  companyId: string // 🔒 Paramètre ajouté
): Promise<void> {
  if (!companyId) throw new Error('company_id requis'); // 🔒 Guard clause

  try {
    // 🔒 SÉCURITÉ: Defense-in-depth - Ajout du filtre company_id sur SELECT
    const { data: planning, error: planningError } = await supabase
      .from('plannings')
      .select('*, dock_booking:dock_bookings!plannings_dock_booking_id_fkey(*)')
      .eq('id', planningId)
      .eq('company_id', companyId) // 🔒 Defense-in-depth
      .single();

    if (planningError) throw planningError;
    if (!planning || !planning.dock_booking) return;

    // Calculer les nouveaux horaires basés sur le planning
    const planningDateTime = `${planning.date}T${planning.hour}:00`;
    const duration = planning.duration || 120;
    const endDateTime = new Date(planningDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + duration);

    // 🔒 SÉCURITÉ: Defense-in-depth - Ajout du filtre company_id sur UPDATE
    const { error: updateError } = await supabase
      .from('dock_bookings')
      .update({
        slot_start: planningDateTime,
        slot_end: endDateTime.toISOString(),
        transporter_name: planning.transporter
      })
      .eq('id', planning.dock_booking.id)
      .eq('company_id', companyId); // 🔒 Defense-in-depth

    if (updateError) throw updateError;
  } catch (error: any) {
    console.error('[synchronizePlanningWithDockBooking] Erreur:', error);
    throw new Error('Erreur lors de la synchronisation');
  }
}

/**
 * Créer automatiquement une réservation de quai depuis un planning
 * 🔒 SÉCURITÉ: Utilise companyId pour toutes les opérations
 */
export async function createDockBookingFromPlanning(
  planningId: string,
  dockId: string,
  companyId: string // 🔒 Paramètre requis
): Promise<string> {
  if (!companyId) throw new Error('company_id requis'); // 🔒 Guard clause

  try {
    // 🔒 SÉCURITÉ: Récupérer le planning avec filtre company_id
    const { data: planning, error: planningError } = await supabase
      .from('plannings')
      .select('*')
      .eq('id', planningId)
      .eq('company_id', companyId) // 🔒 Defense-in-depth
      .single();

    if (planningError) throw planningError;
    if (!planning) throw new Error('Planning non trouvé');

    // Calculer les horaires
    const slotStart = `${planning.date}T${planning.hour}:00`;
    const duration = planning.duration || 120;
    const endDateTime = new Date(slotStart);
    endDateTime.setMinutes(endDateTime.getMinutes() + duration);

    // Créer la réservation de quai
    const { data: booking, error: bookingError } = await supabase
      .from('dock_bookings')
      .insert({
        dock_id: dockId,
        company_id: companyId, // 🔒 Utiliser le company_id passé
        slot_start: slotStart,
        slot_end: endDateTime.toISOString(),
        transporter_name: planning.transporter,
        status: 'confirmed',
        booking_type: planning.type === 'Réception' ? 'unloading' : 'loading',
        internal_notes: `Créé depuis planning: ${planning.name || planningId}`
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Lier le planning à la réservation
    await linkPlanningToDockBooking(planningId, booking.id, companyId);

    return booking.id;
  } catch (error: any) {
    console.error('[createDockBookingFromPlanning] Erreur:', error);
    throw new Error('Erreur lors de la création de la réservation');
  }
}