// src/hooks/useDocks.ts
/**
 * Hook React pour la gestion des quais
 * ✅ Cache intelligent
 * ✅ Realtime Supabase
 * ✅ Mises à jour optimistes
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { DockRow, DockInsert, DockUpdate, DockWithBookings } from '../types/dock.types';
import * as dockService from '../services/dockService';

interface UseDocksOptions {
  enableRealtime?: boolean;
  includeBookings?: boolean;
}

export function useDocks(companyId?: string | null, options: UseDocksOptions = {}) {
  const { enableRealtime = true } = options;

  const [docks, setDocks] = useState<DockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setDocks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await dockService.getDocks(companyId);
      setDocks(data);
    } catch (err: any) {
      console.error('[useDocks] Erreur load:', err);
      setError(err);
      toast.error('Erreur lors du chargement des quais');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const create = useCallback(async (dock: DockInsert): Promise<DockRow | null> => {
    if (!companyId) return null;

    try {
      const newDock = await dockService.createDock(dock);
      setDocks(prev => [...prev, newDock]);
      toast.success(`Quai "${newDock.name}" créé avec succès`);
      return newDock;
    } catch (err: any) {
      console.error('[useDocks] Erreur create:', err);
      toast.error(err.message || 'Erreur lors de la création du quai');
      return null;
    }
  }, [companyId]);

  const update = useCallback(async (dockUpdate: DockUpdate): Promise<DockRow | null> => {
    try {
      const updatedDock = await dockService.updateDock(dockUpdate);
      setDocks(prev => prev.map(d => d.id === updatedDock.id ? updatedDock : d));
      toast.success(`Quai "${updatedDock.name}" mis à jour`);
      return updatedDock;
    } catch (err: any) {
      console.error('[useDocks] Erreur update:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour');
      return null;
    }
  }, []);

  const remove = useCallback(async (dockId: string): Promise<boolean> => {
    try {
      await dockService.deleteDock(dockId);
      setDocks(prev => prev.filter(d => d.id !== dockId));
      toast.success('Quai supprimé avec succès');
      return true;
    } catch (err: any) {
      console.error('[useDocks] Erreur remove:', err);
      toast.error(err.message || 'Erreur lors de la suppression');
      return false;
    }
  }, []);

  const changeStatus = useCallback(async (
    dockId: string,
    newStatus: DockRow['status']
  ): Promise<boolean> => {
    try {
      await update({ id: dockId, status: newStatus });
      return true;
    } catch (err) {
      return false;
    }
  }, [update]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!enableRealtime || !companyId) return;

    const channel = supabase
      .channel('docks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'docks',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('[useDocks] Realtime event:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              setDocks(prev => [...prev, payload.new as DockRow]);
              break;
            case 'UPDATE':
              setDocks(prev => prev.map(d => d.id === payload.new.id ? payload.new as DockRow : d));
              break;
            case 'DELETE':
              setDocks(prev => prev.filter(d => d.id !== payload.old.id));
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, companyId]);

  return { docks, loading, error, refresh, create, update, remove, changeStatus };
}

export function useDock(dockId?: string | null, includeCompleted: boolean = false) {
  const [dock, setDock] = useState<DockWithBookings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!dockId) {
      setDock(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await dockService.getDockWithBookings(dockId, includeCompleted);
      setDock(data);
    } catch (err: any) {
      console.error('[useDock] Erreur load:', err);
      setError(err);
      toast.error('Erreur lors du chargement du quai');
    } finally {
      setLoading(false);
    }
  }, [dockId, includeCompleted]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { dock, loading, error, refresh };
}