// src/hooks/useOptimizedPlannings.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { errorService } from "../services/errorService";
import { validatePlanning, validatePlanningUpdate, validateEventDateTime } from "../schemas/planningSchema";
import { toast } from "sonner";
import { queryCache } from "../services/queryCache";

export interface Document {
  id: string;
  name: string;
  url: string;
  path: string;
  type: string;
  planning_id: string;
  company_id: string;
  created_at?: string;
}

export interface Planning {
  id: string;
  date: string;
  hour: string;
  type: "Réception" | "Expédition";
  transporter: string;
  products: string;
  status: "Prévu" | "En cours" | "Chargé" | "Terminé";
  company_id: string;
  duration?: number;
  is_forecast?: boolean;
  documents?: Document[];
  created_at?: string;
  updated_at?: string;
}

interface UsePlanningsOptions {
  forecastOnly?: boolean;
  enableRealtime?: boolean;
}

/**
 * Hook optimisé pour la gestion des plannings
 * ✅ Cache intelligent
 * ✅ Mises à jour optimistes
 * ✅ Realtime performant
 * ✅ Gestion d'erreur centralisée
 */
export function useOptimizedPlannings(
  companyId?: string | null,
  options: UsePlanningsOptions = {}
) {
  const { forecastOnly = false, enableRealtime = true } = options;

  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 🔹 Cache Key
  const cacheKey = `plannings_${companyId || "none"}_${forecastOnly ? "forecast" : "normal"}`;

  // 🔹 Fetch Function
  const fetchPlannings = useCallback(async (): Promise<Planning[]> => {
    if (!companyId) return [];

    try {
      const { data, error: err } = await supabase
        .from("plannings")
        .select("*, documents(*)")
        .eq("company_id", companyId)
        .eq("is_forecast", forecastOnly)
        .order("date", { ascending: true })
        .order("hour", { ascending: true });

      if (err) throw err;
      return (data as Planning[]) || [];
    } catch (err) {
      errorService.handle(err, "charger les plannings");
      throw err;
    }
  }, [companyId, forecastOnly]);

  // 🔹 Load with cache
  const loadPlannings = useCallback(async () => {
    if (!companyId) {
      setPlannings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check cache first (avec TTL de 2 minutes)
      const cached = queryCache.get<Planning[]>(cacheKey, 2 * 60 * 1000);
      if (cached) {
        setPlannings(cached);
        setLoading(false);
        return;
      }

      // Fetch from DB
      const data = await fetchPlannings();
      setPlannings(data);
      queryCache.set(cacheKey, data); // ✅ Seulement 2 arguments
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [companyId, forecastOnly, cacheKey, fetchPlannings]);

  // 🔹 Initial load
  useEffect(() => {
    loadPlannings();
  }, [loadPlannings]);

  // 🔹 Realtime subscription
  useEffect(() => {
    if (!enableRealtime || !companyId) return;

    const subscription = supabase
      .channel(`plannings_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plannings",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newPlanning = payload.new as Planning;
            if (newPlanning.is_forecast === forecastOnly) {
              setPlannings((prev) => [...prev, newPlanning]);
              queryCache.invalidate(cacheKey);
              toast.success("Nouveau planning ajouté");
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Planning;
            setPlannings((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            );
            queryCache.invalidate(cacheKey);
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as Planning;
            setPlannings((prev) => prev.filter((p) => p.id !== deleted.id));
            queryCache.invalidate(cacheKey);
            toast.info("Planning supprimé");
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [companyId, forecastOnly, enableRealtime, cacheKey]);

  // 🔹 ADD Planning
  const add = useCallback(
    async (planning: Omit<Planning, "id">) => {
      try {
        // Validation
        const validation = validatePlanning(planning);
        if (!validation.success) {
          throw errorService.validation(validation.message);
        }

        // Validation date/heure
        const dateTimeValidation = validateEventDateTime(
          validation.data.date,
          validation.data.hour,
          false
        );
        if (!dateTimeValidation.success) {
          throw errorService.validation(dateTimeValidation.message);
        }

        // ✅ Assurer que products est une string (pas undefined)
        const validatedData = {
          ...validation.data,
          products: validation.data.products || "",
        };

        // Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const optimisticPlanning: Planning = {
          ...validatedData,
          id: tempId,
          company_id: companyId || "",
          is_forecast: forecastOnly,
          documents: [],
        };

        setPlannings((prev) => [...prev, optimisticPlanning]);

        // Insert in DB
        const { data, error: err } = await supabase
          .from("plannings")
          .insert({
            ...validatedData,
            company_id: companyId,
            is_forecast: forecastOnly,
          })
          .select("*, documents(*)")
          .single();

        if (err) throw err;

        // Replace temp item with real one
        setPlannings((prev) =>
          prev.map((p) => (p.id === tempId ? (data as Planning) : p))
        );
        queryCache.invalidate(cacheKey);

        toast.success("Planning ajouté avec succès");
        return data as Planning;
      } catch (err) {
        errorService.handle(err, "ajouter le planning");
        await loadPlannings(); // Rollback
        throw err;
      }
    },
    [companyId, forecastOnly, cacheKey, loadPlannings]
  );

  // 🔹 UPDATE Planning
  const update = useCallback(
    async (id: string, updates: Partial<Planning>) => {
      try {
        // Validation avec validatePlanningUpdate pour les updates partiels
        const validation = validatePlanningUpdate(updates);
        if (!validation.success) {
          throw errorService.validation(validation.message);
        }

        // ✅ Assurer que products est une string si présent
        const validatedData = {
          ...validation.data,
          ...(validation.data.products !== undefined && {
            products: validation.data.products || "",
          }),
        };

        // Optimistic Update
        setPlannings((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...validatedData } : p))
        );

        // Update in DB
        const { data, error: err } = await supabase
          .from("plannings")
          .update(validatedData)
          .eq("id", id)
          .select("*, documents(*)")
          .single();

        if (err) throw err;

        // Confirm with real data
        setPlannings((prev) =>
          prev.map((p) => (p.id === id ? (data as Planning) : p))
        );
        queryCache.invalidate(cacheKey);

        toast.success("Planning mis à jour");
        return data as Planning;
      } catch (err) {
        errorService.handle(err, "mettre à jour le planning");
        await loadPlannings(); // Rollback
        throw err;
      }
    },
    [cacheKey, loadPlannings]
  );

  // 🔹 DELETE Planning
  const remove = useCallback(
    async (id: string) => {
      try {
        // Optimistic Delete
        setPlannings((prev) => prev.filter((p) => p.id !== id));

        // Delete from DB
        const { error: err } = await supabase
          .from("plannings")
          .delete()
          .eq("id", id);

        if (err) throw err;

        queryCache.invalidate(cacheKey);
        toast.success("Planning supprimé");
      } catch (err) {
        errorService.handle(err, "supprimer le planning");
        await loadPlannings(); // Rollback
        throw err;
      }
    },
    [cacheKey, loadPlannings]
  );

  // 🔹 BULK OPERATIONS (pour import CSV)
  const addBulk = useCallback(
    async (planningsList: Omit<Planning, "id">[]) => {
      try {
        const validated = planningsList.map((p) => {
          const validation = validatePlanning(p);
          if (!validation.success) {
            throw errorService.validation(
              `Planning invalide: ${validation.message}`
            );
          }
          return {
            ...validation.data,
            company_id: companyId,
            is_forecast: forecastOnly,
          };
        });

        const { data, error: err } = await supabase
          .from("plannings")
          .insert(validated)
          .select("*, documents(*)");

        if (err) throw err;

        await loadPlannings();
        toast.success(`${planningsList.length} plannings ajoutés`);
        return data as Planning[];
      } catch (err) {
        errorService.handle(err, "importer les plannings");
        throw err;
      }
    },
    [companyId, forecastOnly, loadPlannings]
  );

  return {
    plannings,
    loading,
    error: error?.message || null,
    add,
    update,
    remove,
    addBulk,
    reload: loadPlannings,
  };
}