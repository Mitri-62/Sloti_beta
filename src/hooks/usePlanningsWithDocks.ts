// src/hooks/usePlanningsWithDocks.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { PlanningWithDock } from '../types/planning.types';
import { toast } from 'sonner';

export function usePlanningsWithDocks(
  companyId?: string | null,
  filters?: {
    date?: string;
    type?: 'Réception' | 'Expédition';
  }
) {
  const [plannings, setPlannings] = useState<PlanningWithDock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setPlannings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('plannings')
        .select(`
          *,
          dock_booking:dock_bookings!plannings_dock_booking_id_fkey (
            id,
            slot_start,
            slot_end,
            status,
            dock:docks (
              id,
              name,
              type,
              zone
            )
          )
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: true })
        .order('hour', { ascending: true });

      if (filters?.date) {
        query = query.eq('date', filters.date);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPlannings(data as PlanningWithDock[]);
    } catch (err: any) {
      console.error('[usePlanningsWithDocks] Erreur:', err);
      setError(err);
      toast.error('Erreur lors du chargement des plannings');
    } finally {
      setLoading(false);
    }
  }, [companyId, filters?.date, filters?.type]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    plannings,
    loading,
    error,
    refresh
  };
}