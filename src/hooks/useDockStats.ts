// src/hooks/useDockStats.ts
/**
 * Hook React pour les statistiques des quais
 * ✅ Taux d'occupation
 * ✅ Performance
 * ✅ Dashboard stats
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { 
  DockOccupancyStats,
  AvailableSlot,
  DockDashboardStats,
  TransporterPerformance
} from '../types/dock.types';
import * as dockService from '../services/dockService';

// ============================================================
// TAUX D'OCCUPATION D'UN QUAI
// ============================================================

export function useDockOccupancy(
  dockId?: string | null,
  startDate?: string,
  endDate?: string
) {
  const [stats, setStats] = useState<DockOccupancyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!dockId || !startDate || !endDate) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await dockService.calculateDockOccupancy(dockId, startDate, endDate);
      setStats(data);
    } catch (err: any) {
      console.error('[useDockOccupancy] Erreur:', err);
      setError(err);
      toast.error('Erreur lors du calcul des statistiques');
    } finally {
      setLoading(false);
    }
  }, [dockId, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, error, refresh: load };
}

// ============================================================
// CRÉNEAUX DISPONIBLES
// ============================================================

export function useAvailableSlots(
  dockId?: string | null,
  date?: string,
  durationMinutes: number = 120
) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!dockId || !date) {
      setSlots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await dockService.getAvailableSlots(dockId, date, durationMinutes);
      setSlots(data);
    } catch (err: any) {
      console.error('[useAvailableSlots] Erreur:', err);
      setError(err);
      toast.error('Erreur lors de la récupération des créneaux');
    } finally {
      setLoading(false);
    }
  }, [dockId, date, durationMinutes]);

  useEffect(() => {
    load();
  }, [load]);

  return { slots, loading, error, refresh: load };
}

// ============================================================
// DASHBOARD STATS GLOBALES
// ============================================================

export function useDockDashboard(companyId?: string | null) {
  const [stats, setStats] = useState<DockDashboardStats>({
    total_docks: 0,
    available_docks: 0,
    occupied_docks: 0,
    maintenance_docks: 0,
    today_bookings: 0,
    today_completed: 0,
    today_in_progress: 0,
    average_occupancy_rate: 0,
    total_weekly_bookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Récupérer les quais
      const { data: docks, error: docksError } = await supabase
        .from('docks')
        .select('id, status')
        .eq('company_id', companyId);

      if (docksError) throw docksError;

      const total_docks = docks?.length || 0;
      const available_docks = docks?.filter(d => d.status === 'available').length || 0;
      const occupied_docks = docks?.filter(d => d.status === 'occupied').length || 0;
      const maintenance_docks = docks?.filter(d => d.status === 'maintenance').length || 0;

      // Réservations du jour
      const today = new Date().toISOString().split('T')[0];
      const { data: todayBookings, error: todayError } = await supabase
        .from('dock_bookings')
        .select('status')
        .eq('company_id', companyId)
        .gte('slot_start', `${today}T00:00:00Z`)
        .lte('slot_start', `${today}T23:59:59Z`);

      if (todayError) throw todayError;

      const today_bookings = todayBookings?.length || 0;
      const today_completed = todayBookings?.filter(b => b.status === 'completed').length || 0;
      const today_in_progress = todayBookings?.filter(b => b.status === 'in_progress').length || 0;

      // Réservations de la semaine
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      const { count: weeklyCount, error: weeklyError } = await supabase
        .from('dock_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('slot_start', startOfWeek.toISOString())
        .lte('slot_start', endOfWeek.toISOString());

      if (weeklyError) throw weeklyError;

      // Taux d'occupation moyen (calculé sur la semaine)
      let average_occupancy_rate = 0;
      if (docks && docks.length > 0) {
        const occupancyPromises = docks.map(dock => 
          dockService.calculateDockOccupancy(
            dock.id,
            startOfWeek.toISOString(),
            endOfWeek.toISOString()
          ).catch(() => ({ occupancy_rate: 0 } as DockOccupancyStats))
        );
        
        const occupancies = await Promise.all(occupancyPromises);
        const totalRate = occupancies.reduce((sum, o) => sum + (o?.occupancy_rate || 0), 0);
        average_occupancy_rate = Math.round(totalRate / docks.length);
      }

      const dashboardStats: DockDashboardStats = {
        total_docks,
        available_docks,
        occupied_docks,
        maintenance_docks,
        today_bookings,
        today_completed,
        today_in_progress,
        average_occupancy_rate,
        total_weekly_bookings: weeklyCount || 0
      };

      setStats(dashboardStats);
    } catch (err: any) {
      console.error('[useDockDashboard] Erreur:', err);
      setError(err);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, error, refresh: load };
}

// ============================================================
// PERFORMANCE TRANSPORTEURS
// ============================================================

export function useTransporterPerformance(
  companyId?: string | null,
  startDate?: string,
  endDate?: string
) {
  const [performance, setPerformance] = useState<TransporterPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!companyId || !startDate || !endDate) {
      setPerformance([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Récupérer toutes les réservations de la période
      const { data: bookings, error: bookingsError } = await supabase
        .from('dock_bookings')
        .select('*')
        .eq('company_id', companyId)
        .gte('slot_start', startDate)
        .lte('slot_start', endDate);

      if (bookingsError) throw bookingsError;

      // Grouper par transporteur
      const transporterMap = new Map<string, {
        bookings: any[];
        completed_on_time: number;
        late_arrivals: number;
        no_shows: number;
        total_delay: number;
      }>();

      bookings?.forEach(booking => {
        const name = booking.transporter_name;
        
        if (!transporterMap.has(name)) {
          transporterMap.set(name, {
            bookings: [],
            completed_on_time: 0,
            late_arrivals: 0,
            no_shows: 0,
            total_delay: 0
          });
        }

        const transporterData = transporterMap.get(name)!;
        transporterData.bookings.push(booking);

        // Analyser les performances
        if (booking.status === 'no_show') {
          transporterData.no_shows++;
        } else if (booking.status === 'completed') {
          // Vérifier si en retard (si check_in_time > slot_start + 15min de marge)
          if (booking.check_in_time && booking.slot_start) {
            const checkIn = new Date(booking.check_in_time);
            const slotStart = new Date(booking.slot_start);
            const delayMinutes = (checkIn.getTime() - slotStart.getTime()) / 60000;
            
            if (delayMinutes > 15) {
              transporterData.late_arrivals++;
              transporterData.total_delay += delayMinutes - 15;
            } else {
              transporterData.completed_on_time++;
            }
          }
        }
      });

      // Calculer les statistiques finales
      const performanceList: TransporterPerformance[] = Array.from(
        transporterMap.entries()
      ).map(([name, data]) => {
        const total_bookings = data.bookings.length;
        const completed = data.completed_on_time + data.late_arrivals;
        const punctuality_rate = completed > 0 
          ? Math.round((data.completed_on_time / completed) * 100) 
          : 0;
        const average_delay_minutes = data.late_arrivals > 0
          ? Math.round(data.total_delay / data.late_arrivals)
          : 0;

        return {
          transporter_name: name,
          total_bookings,
          completed_on_time: data.completed_on_time,
          late_arrivals: data.late_arrivals,
          no_shows: data.no_shows,
          average_delay_minutes,
          punctuality_rate
        };
      });

      // Trier par nombre de réservations
      performanceList.sort((a, b) => b.total_bookings - a.total_bookings);

      setPerformance(performanceList);
    } catch (err: any) {
      console.error('[useTransporterPerformance] Erreur:', err);
      setError(err);
      toast.error('Erreur lors du calcul des performances');
    } finally {
      setLoading(false);
    }
  }, [companyId, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  return { performance, loading, error, refresh: load };
}

// ============================================================
// VÉRIFIER DISPONIBILITÉ
// ============================================================

export function useCheckDockAvailability() {
  const [checking, setChecking] = useState(false);

  const check = useCallback(async (
    dockId: string,
    slotStart: string,
    slotEnd: string
  ) => {
    setChecking(true);

    try {
      const result = await dockService.checkDockAvailability(dockId, slotStart, slotEnd);
      return result;
    } catch (err: any) {
      console.error('[useCheckDockAvailability] Erreur:', err);
      toast.error('Erreur lors de la vérification');
      return {
        is_available: false,
        dock: null as any,
        reason: 'Erreur de vérification'
      };
    } finally {
      setChecking(false);
    }
  }, []);

  return { check, checking };
}