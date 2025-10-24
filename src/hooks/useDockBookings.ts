// src/hooks/useDockBookings.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { 
  DockBookingRow, 
  DockBookingInsert, 
  DockBookingUpdate,
  DockBookingWithDock
} from '../types/dock.types';
import * as dockService from '../services/dockService';

interface UseDockBookingsOptions {
  enableRealtime?: boolean;
  filters?: {
    dock_id?: string;
    status?: string | string[];
    date_from?: string;
    date_to?: string;
  };
}

export function useDockBookings(
  companyId?: string | null,
  options: UseDockBookingsOptions = {}
) {
  const { enableRealtime = true, filters } = options;

  const [bookings, setBookings] = useState<DockBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ✅ CORRECTION : Mémoriser les filtres pour éviter la boucle infinie
  const filtersKey = useMemo(() => {
    return JSON.stringify(filters || {});
  }, [filters]);

  const load = useCallback(async () => {
    console.log('🔄 [useDockBookings] load() appelé');
    
    if (!companyId) {
      console.log('⚠️ [useDockBookings] Pas de companyId, arrêt');
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsedFilters = JSON.parse(filtersKey);
      console.log('📊 [useDockBookings] Filtres utilisés:', parsedFilters);
      
      const data = await dockService.getDockBookings(companyId, parsedFilters);
      
      console.log('✅ [useDockBookings] Bookings chargés:', data.length);
      setBookings(data);
    } catch (err: any) {
      console.error('❌ [useDockBookings] Erreur load:', err);
      setError(err);
      toast.error('Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  }, [companyId, filtersKey]); // ✅ CORRECTION : Utiliser filtersKey au lieu de filters

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const create = useCallback(async (booking: DockBookingInsert): Promise<DockBookingRow | null> => {
    if (!companyId) return null;

    try {
      const newBooking = await dockService.createDockBooking(booking);
      setBookings(prev => [...prev, newBooking]);
      toast.success('Réservation créée avec succès');
      return newBooking;
    } catch (err: any) {
      console.error('[useDockBookings] Erreur create:', err);
      toast.error(err.message || 'Erreur lors de la création');
      return null;
    }
  }, [companyId]);

  const update = useCallback(async (bookingUpdate: DockBookingUpdate): Promise<DockBookingRow | null> => {
    try {
      const updatedBooking = await dockService.updateDockBooking(bookingUpdate);
      setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
      toast.success('Réservation mise à jour');
      return updatedBooking;
    } catch (err: any) {
      console.error('[useDockBookings] Erreur update:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour');
      return null;
    }
  }, []);

  const cancel = useCallback(async (bookingId: string, reason?: string): Promise<boolean> => {
    try {
      await dockService.cancelDockBooking(bookingId, reason);
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
      toast.success('Réservation annulée');
      return true;
    } catch (err: any) {
      console.error('[useDockBookings] Erreur cancel:', err);
      toast.error(err.message || 'Erreur lors de l\'annulation');
      return false;
    }
  }, []);

  const confirm = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      await update({ id: bookingId, status: 'confirmed' });
      toast.success('Réservation confirmée');
      return true;
    } catch (err) {
      return false;
    }
  }, [update]);

  const markNoShow = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      await update({ id: bookingId, status: 'no_show' });
      toast.warning('Transporteur marqué comme absent');
      return true;
    } catch (err) {
      return false;
    }
  }, [update]);

  const checkIn = useCallback(async (
    bookingId: string,
    actualData?: {
      vehicle_plate?: string;
      driver_name?: string;
      driver_phone?: string;
    }
  ): Promise<DockBookingRow | null> => {
    try {
      const updatedBooking = await dockService.checkInBooking(bookingId, actualData);
      setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
      toast.success('Camion arrivé au quai');
      return updatedBooking;
    } catch (err: any) {
      console.error('[useDockBookings] Erreur checkIn:', err);
      toast.error(err.message || 'Erreur lors du check-in');
      return null;
    }
  }, []);

  const startLoading = useCallback(async (bookingId: string): Promise<DockBookingRow | null> => {
    try {
      const updatedBooking = await dockService.startLoading(bookingId);
      setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
      toast.success('Chargement démarré');
      return updatedBooking;
    } catch (err: any) {
      console.error('[useDockBookings] Erreur startLoading:', err);
      toast.error(err.message || 'Erreur');
      return null;
    }
  }, []);

  const completeLoading = useCallback(async (
    bookingId: string,
    actualDuration?: number
  ): Promise<DockBookingRow | null> => {
    try {
      const updatedBooking = await dockService.completeLoading(bookingId, actualDuration);
      setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
      toast.success('Chargement terminé');
      return updatedBooking;
    } catch (err: any) {
      console.error('[useDockBookings] Erreur completeLoading:', err);
      toast.error(err.message || 'Erreur');
      return null;
    }
  }, []);

  const checkOut = useCallback(async (bookingId: string): Promise<DockBookingRow | null> => {
    try {
      const updatedBooking = await dockService.checkOutBooking(bookingId);
      setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
      toast.success('Camion parti du quai');
      return updatedBooking;
    } catch (err: any) {
      console.error('[useDockBookings] Erreur checkOut:', err);
      toast.error(err.message || 'Erreur lors du check-out');
      return null;
    }
  }, []);

  // ✅ Premier chargement
  useEffect(() => {
    console.log('🎬 [useDockBookings] useEffect initial');
    load();
  }, [load]);

  // ✅ Realtime (désactivé temporairement pour éviter les boucles)
  useEffect(() => {
    if (!enableRealtime || !companyId) {
      console.log('⚠️ [useDockBookings] Realtime désactivé');
      return;
    }

    console.log('📡 [useDockBookings] Activation realtime');
    const channel = supabase
      .channel('dock_bookings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dock_bookings',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('[useDockBookings] Realtime event:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              setBookings(prev => [...prev, payload.new as DockBookingRow]);
              break;
            case 'UPDATE':
              setBookings(prev => prev.map(b => b.id === payload.new.id ? payload.new as DockBookingRow : b));
              break;
            case 'DELETE':
              setBookings(prev => prev.filter(b => b.id !== payload.old.id));
              break;
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [useDockBookings] Déconnexion realtime');
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, companyId]);

  return {
    bookings,
    loading,
    error,
    refresh,
    create,
    update,
    cancel,
    confirm,
    markNoShow,
    checkIn,
    startLoading,
    completeLoading,
    checkOut
  };
}

// ============================================================
// HOOK POUR UNE RÉSERVATION UNIQUE
// ============================================================

export function useDockBooking(bookingId?: string | null) {
  const [booking, setBooking] = useState<DockBookingWithDock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!bookingId) {
      setBooking(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await dockService.getDockBookingWithDock(bookingId);
      setBooking(data);
    } catch (err: any) {
      console.error('[useDockBooking] Erreur load:', err);
      setError(err);
      toast.error('Erreur lors du chargement de la réservation');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { booking, loading, error, refresh };
}

// ============================================================
// HOOKS SPÉCIALISÉS
// ============================================================

export function useTodayBookings(companyId?: string | null) {
  const today = new Date().toISOString().split('T')[0];
  
  // ✅ CORRECTION : Mémoriser l'objet filters
  const filters = useMemo(() => ({
    date_from: `${today}T00:00:00Z`,
    date_to: `${today}T23:59:59Z`,
    status: ['confirmed', 'in_progress', 'requested'] as string[]
  }), [today]);
  
  return useDockBookings(companyId, { filters });
}

export function useActiveBookings(companyId?: string | null) {
  // ✅ CORRECTION : Mémoriser l'objet filters
  const filters = useMemo(() => ({
    status: ['in_progress'] as string[]
  }), []);
  
  return useDockBookings(companyId, { filters });
}