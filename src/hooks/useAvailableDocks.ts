// src/hooks/useAvailableDocks.ts
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { DockRow } from '../types/dock.types';

interface UseAvailableDocksProps {
  companyId?: string | null;
  date?: string; // Format: YYYY-MM-DD
  startTime?: string; // Format: HH:mm
  duration?: number; // En minutes
  excludeBookingId?: string; // Pour exclure une réservation existante lors de l'édition
}

/**
 * Hook pour récupérer les quais disponibles selon un créneau horaire
 */
export function useAvailableDocks({
  companyId,
  date,
  startTime,
  duration = 30,
  excludeBookingId
}: UseAvailableDocksProps) {
  const [availableDocks, setAvailableDocks] = useState<DockRow[]>([]);
  const [allDocks, setAllDocks] = useState<DockRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setAvailableDocks([]);
      setAllDocks([]);
      return;
    }

    loadDocks();
  }, [companyId, date, startTime, duration, excludeBookingId]);

  const loadDocks = async () => {
    if (!companyId) return;

    setLoading(true);

    try {
      // 1. Récupérer tous les quais de l'entreprise
      const { data: docks, error: docksError } = await supabase
        .from('docks')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (docksError) throw docksError;
      setAllDocks(docks || []);

      // 2. Si pas de date/heure, retourner tous les quais
      if (!date || !startTime) {
        setAvailableDocks(docks || []);
        setLoading(false);
        return;
      }

      // 3. Calculer le créneau horaire
      const [hours, minutes] = startTime.split(':').map(Number);
      const slotStart = new Date(date);
      slotStart.setHours(hours, minutes, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      // 4. Récupérer les réservations qui chevauchent ce créneau
      let bookingsQuery = supabase
        .from('dock_bookings')
        .select('dock_id')
        .gte('slot_end', slotStart.toISOString())
        .lte('slot_start', slotEnd.toISOString())
        .in('status', ['requested', 'confirmed', 'in_progress']);

      // Exclure la réservation actuelle si on édite
      if (excludeBookingId) {
        bookingsQuery = bookingsQuery.neq('id', excludeBookingId);
      }

      const { data: conflictingBookings, error: bookingsError } = await bookingsQuery;

      if (bookingsError) throw bookingsError;

      // 5. Filtrer les quais disponibles
      const busyDockIds = new Set(conflictingBookings?.map(b => b.dock_id) || []);
      const available = docks?.filter(dock => !busyDockIds.has(dock.id)) || [];

      setAvailableDocks(available);
    } catch (error) {
      console.error('[useAvailableDocks] Erreur:', error);
      setAvailableDocks([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    availableDocks,
    allDocks,
    loading,
    refresh: loadDocks
  };
}