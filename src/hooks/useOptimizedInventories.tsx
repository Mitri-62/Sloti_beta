// src/hooks/useOptimizedInventories.tsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { errorService } from "../services/errorService";
import { toast } from "sonner";
import { queryCache } from "../services/queryCache";

export interface InventoryLine {
  id: string;
  inventory_id: string;
  stock_id?: string;
  ean?: string;
  name: string;
  theoretical_quantity: number;
  physical_quantity: number;
  difference?: number;
  notes?: string;
  counted_by?: string;
  counted_at?: string;
}

export interface Inventory {
  id: string;
  company_id: string;
  name: string;
  date: string;
  zone?: string;
  status: "in_progress" | "completed" | "validated";
  notes?: string;
  created_by?: string;
  created_at?: string;
  completed_at?: string;
  lines?: InventoryLine[];
}

interface UseInventoriesOptions {
  includeLines?: boolean;
  status?: string;
  enableRealtime?: boolean;
}

/**
 * Hook optimisé pour la gestion des inventaires
 * ✅ Cache intelligent
 * ✅ Mises à jour optimistes
 * ✅ Realtime performant
 * ✅ Gestion d'erreur centralisée
 */
export function useOptimizedInventories(
  companyId?: string | null,
  options: UseInventoriesOptions = {}
) {
  const { includeLines = false, status, enableRealtime = true } = options;

  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Cache Key
  const cacheKey = `inventories_${companyId || "none"}_${status || "all"}_${includeLines}`;

  // Fetch Function
  const fetchInventories = useCallback(async (): Promise<Inventory[]> => {
    if (!companyId) return [];

    try {
      let query = supabase
        .from("inventories")
        .select(includeLines ? "*, inventory_lines(*)" : "*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error: err } = await query;

      if (err) throw err;

      // Mapper les données pour correspondre à l'interface
      const inventories = (data || []).map((inv: any) => ({
        ...inv,
        lines: inv.inventory_lines || [],
      })) as Inventory[];

      return inventories;
    } catch (err) {
      errorService.handle(err, "charger les inventaires");
      throw err;
    }
  }, [companyId, status, includeLines]);

  // Load with cache
  const loadInventories = useCallback(async () => {
    if (!companyId) {
      setInventories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cached = queryCache.get<Inventory[]>(cacheKey, 2 * 60 * 1000);
      if (cached) {
        setInventories(cached);
        setLoading(false);
        return;
      }

      const data = await fetchInventories();
      setInventories(data);
      queryCache.set(cacheKey, data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [companyId, cacheKey, fetchInventories]);

  // Initial load
  useEffect(() => {
    loadInventories();
  }, [loadInventories]);

  // Realtime subscription
  useEffect(() => {
    if (!enableRealtime || !companyId) return;

    const subscription = supabase
      .channel(`inventories_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventories",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newInventory = payload.new as Inventory;
            setInventories((prev) => [newInventory, ...prev]);
            queryCache.invalidate(cacheKey);
            toast.success("Nouvel inventaire créé");
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Inventory;
            setInventories((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i))
            );
            queryCache.invalidate(cacheKey);
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as Inventory;
            setInventories((prev) => prev.filter((i) => i.id !== deleted.id));
            queryCache.invalidate(cacheKey);
            toast.info("Inventaire supprimé");
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [companyId, enableRealtime, cacheKey]);

  // CREATE Inventory
  const create = useCallback(
    async (inventory: Omit<Inventory, "id" | "company_id">) => {
      try {
        const tempId = `temp-${Date.now()}`;
        const optimisticInventory: Inventory = {
          ...inventory,
          id: tempId,
          company_id: companyId || "",
          status: inventory.status || "in_progress",
        };

        setInventories((prev) => [optimisticInventory, ...prev]);

        const { data, error: err } = await supabase
          .from("inventories")
          .insert({
            ...inventory,
            company_id: companyId,
          })
          .select()
          .single();

        if (err) throw err;

        setInventories((prev) =>
          prev.map((i) => (i.id === tempId ? (data as Inventory) : i))
        );

        queryCache.invalidate(cacheKey);
        toast.success("Inventaire créé avec succès");
        return data as Inventory;
      } catch (err) {
        errorService.handle(err, "créer l'inventaire");
        await loadInventories();
        throw err;
      }
    },
    [companyId, cacheKey, loadInventories]
  );

  // UPDATE Inventory
  const update = useCallback(
    async (id: string, updates: Partial<Inventory>) => {
      try {
        setInventories((prev) =>
          prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
        );

        const { data, error: err } = await supabase
          .from("inventories")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (err) throw err;

        setInventories((prev) =>
          prev.map((i) => (i.id === id ? (data as Inventory) : i))
        );

        queryCache.invalidate(cacheKey);
        toast.success("Inventaire mis à jour");
        return data as Inventory;
      } catch (err) {
        errorService.handle(err, "mettre à jour l'inventaire");
        await loadInventories();
        throw err;
      }
    },
    [cacheKey, loadInventories]
  );

  // DELETE Inventory
  const remove = useCallback(
    async (id: string) => {
      try {
        setInventories((prev) => prev.filter((i) => i.id !== id));

        const { error: err } = await supabase
          .from("inventories")
          .delete()
          .eq("id", id);

        if (err) throw err;

        queryCache.invalidate(cacheKey);
        toast.success("Inventaire supprimé");
      } catch (err) {
        errorService.handle(err, "supprimer l'inventaire");
        await loadInventories();
        throw err;
      }
    },
    [cacheKey, loadInventories]
  );

  // ADD Line to Inventory
  const addLine = useCallback(
    async (
      inventoryId: string,
      line: Omit<InventoryLine, "id" | "inventory_id">
    ) => {
      try {
        const { data, error: err } = await supabase
          .from("inventory_lines")
          .insert({
            ...line,
            inventory_id: inventoryId,
          })
          .select()
          .single();

        if (err) throw err;

        // Update local state
        setInventories((prev) =>
          prev.map((inv) =>
            inv.id === inventoryId
              ? {
                  ...inv,
                  lines: [...(inv.lines || []), data as InventoryLine],
                }
              : inv
          )
        );

        queryCache.invalidate(cacheKey);
        toast.success("Produit ajouté");
        return data as InventoryLine;
      } catch (err) {
        errorService.handle(err, "ajouter le produit");
        throw err;
      }
    },
    [cacheKey]
  );

  // UPDATE Line
  const updateLine = useCallback(
    async (lineId: string, updates: Partial<InventoryLine>) => {
      try {
        const { data, error: err } = await supabase
          .from("inventory_lines")
          .update(updates)
          .eq("id", lineId)
          .select()
          .single();

        if (err) throw err;

        // Update local state
        setInventories((prev) =>
          prev.map((inv) => ({
            ...inv,
            lines: inv.lines?.map((line) =>
              line.id === lineId ? (data as InventoryLine) : line
            ),
          }))
        );

        queryCache.invalidate(cacheKey);
        return data as InventoryLine;
      } catch (err) {
        errorService.handle(err, "modifier la ligne");
        throw err;
      }
    },
    [cacheKey]
  );

  // DELETE Line
  const removeLine = useCallback(
    async (lineId: string) => {
      try {
        const { error: err } = await supabase
          .from("inventory_lines")
          .delete()
          .eq("id", lineId);

        if (err) throw err;

        setInventories((prev) =>
          prev.map((inv) => ({
            ...inv,
            lines: inv.lines?.filter((line) => line.id !== lineId),
          }))
        );

        queryCache.invalidate(cacheKey);
        toast.success("Ligne supprimée");
      } catch (err) {
        errorService.handle(err, "supprimer la ligne");
        throw err;
      }
    },
    [cacheKey]
  );

  // VALIDATE Inventory (ajuster les stocks)
  const validate = useCallback(
    async (inventoryId: string) => {
      try {
        // Récupérer l'inventaire avec ses lignes
        const { data: inventory, error: invErr } = await supabase
          .from("inventories")
          .select("*, inventory_lines(*)")
          .eq("id", inventoryId)
          .single();

        if (invErr) throw invErr;

        // Mapper les lignes
        const lines = inventory?.inventory_lines || [];

        // Ajuster chaque stock
        for (const line of lines) {
          if (line.stock_id && line.difference !== 0) {
            const { error: updateErr } = await supabase
              .from("stocks")
              .update({
                quantity: line.physical_quantity,
              })
              .eq("id", line.stock_id);

            if (updateErr) throw updateErr;
          }
        }

        // Marquer l'inventaire comme validé
        await update(inventoryId, {
          status: "validated",
          completed_at: new Date().toISOString(),
        });

        toast.success("Inventaire validé et stocks ajustés");
      } catch (err) {
        errorService.handle(err, "valider l'inventaire");
        throw err;
      }
    },
    [update]
  );

  return {
    inventories,
    loading,
    error: error?.message || null,
    create,
    update,
    remove,
    addLine,
    updateLine,
    removeLine,
    validate,
    reload: loadInventories,
  };
}