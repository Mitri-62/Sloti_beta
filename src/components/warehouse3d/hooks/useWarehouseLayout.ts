import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { WarehouseConfig } from '../types';
import { DEFAULT_CONFIG } from '../config';
import { toast } from 'sonner';

export interface RackPosition {
  id: string;
  rackCode: string;
  x: number;
  z: number;
  rotation: number;
}

export interface WarehouseLayout {
  id: string;
  name: string;
  config: WarehouseConfig;
  rackPositions: RackPosition[];
  isDefault: boolean;
}

export const useWarehouseLayout = (companyId: string | null | undefined) => {
  const [layout, setLayout] = useState<WarehouseLayout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Charger le layout au montage
  useEffect(() => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    const loadLayout = async () => {
      try {
        const { data, error } = await supabase
          .from('warehouse_layouts')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_default', true)
          .limit(1);

        // Ignorer l'erreur PGRST116 (pas de résultat) et 406
        if (error && error.code !== 'PGRST116') {
          console.error('Erreur chargement layout:', error);
          return;
        }

        const layoutData = data?.[0];

        if (layoutData) {
          setLayout({
            id: layoutData.id,
            name: layoutData.name,
            config: layoutData.config as WarehouseConfig,
            rackPositions: (layoutData.rack_positions as RackPosition[]) || [],
            isDefault: layoutData.is_default
          });
        }
      } catch (err) {
        console.error('Erreur:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLayout();
  }, [companyId]);

  // Sauvegarder le layout
  const saveLayout = useCallback(async (
    config: WarehouseConfig,
    rackPositions: RackPosition[],
    name: string = 'Principal'
  ): Promise<boolean> => {
    if (!companyId) {
      toast.error('Entreprise non trouvée');
      return false;
    }

    setIsSaving(true);

    try {
      let result;

      if (layout?.id) {
        // UPDATE si on a déjà un layout
        console.log('Updating layout:', layout.id);
        result = await supabase
          .from('warehouse_layouts')
          .update({
            config,
            rack_positions: rackPositions,
            updated_at: new Date().toISOString()
          })
          .eq('id', layout.id)
          .select()
          .single();
      } else {
        // INSERT si pas de layout existant
        console.log('Creating new layout for company:', companyId);
        result = await supabase
          .from('warehouse_layouts')
          .insert({
            company_id: companyId,
            name,
            config,
            rack_positions: rackPositions,
            is_default: true
          })
          .select()
          .single();
      }

      if (result.error) {
        console.error('Supabase error:', result.error);
        throw result.error;
      }

      console.log('Layout saved:', result.data);

      setLayout({
        id: result.data.id,
        name: result.data.name,
        config: result.data.config as WarehouseConfig,
        rackPositions: (result.data.rack_positions as RackPosition[]) || [],
        isDefault: result.data.is_default
      });

      toast.success('Layout sauvegardé !');
      return true;

    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      toast.error(`Erreur: ${err.message || 'Erreur lors de la sauvegarde'}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [companyId, layout?.id]);

  // Réinitialiser le layout
  const resetLayout = useCallback(async (): Promise<boolean> => {
    if (!layout?.id) return true;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('warehouse_layouts')
        .update({
          rack_positions: [],
          config: DEFAULT_CONFIG
        })
        .eq('id', layout.id);

      if (error) throw error;

      setLayout(prev => prev ? {
        ...prev,
        config: DEFAULT_CONFIG,
        rackPositions: []
      } : null);

      toast.success('Layout réinitialisé');
      return true;

    } catch (err: any) {
      console.error('Erreur reset:', err);
      toast.error(`Erreur: ${err.message || 'Erreur lors de la réinitialisation'}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [layout?.id]);

  return {
    layout,
    isLoading,
    isSaving,
    saveLayout,
    resetLayout,
    hasCustomLayout: !!layout?.rackPositions?.length
  };
};