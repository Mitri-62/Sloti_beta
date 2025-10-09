// src/hooks/usePlannings.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { validatePlanning, validatePlanningUpdate } from "../schemas/planningSchema";
import { toast } from "sonner";

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
 * Classe d'erreur personnalisée pour les opérations de planning
 */
export class PlanningError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PlanningError';
  }
}

export function usePlannings(
  companyId?: string, 
  options: UsePlanningsOptions = {}
) {
  const { forecastOnly = false, enableRealtime = true } = options;

  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Gestionnaire d'erreur centralisé
   */
  const handleError = useCallback((
    error: any, 
    operation: string,
    showToast = true
  ): never => {
    console.error(`[usePlannings] Erreur lors de ${operation}:`, error);

    let message = `Impossible de ${operation}`;
    let code = 'UNKNOWN_ERROR';

    // Erreur Supabase
    if (error?.code) {
      code = error.code;
      
      switch (error.code) {
        case '23505': // Violation de contrainte unique
          message = "Un événement similaire existe déjà";
          break;
        case '23503': // Violation de clé étrangère
          message = "Référence invalide (company_id)";
          break;
        case 'PGRST116': // Aucune ligne retournée
          message = "Événement introuvable";
          break;
        case '42501': // Permission refusée
          message = "Vous n'avez pas les permissions nécessaires";
          break;
        default:
          message = error.message || message;
      }
    }
    // Erreur de validation
    else if (error?.message) {
      message = error.message;
      code = 'VALIDATION_ERROR';
    }

    setError(message);
    
    if (showToast) {
      toast.error(message, {
        description: `Opération: ${operation}`,
        duration: 5000,
      });
    }

    throw new PlanningError(message, code, error);
  }, []);

  /**
   * Chargement initial des plannings
   */
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
        .from("plannings")
        .select("*, documents(*)")
        .eq("company_id", companyId)
        .eq("is_forecast", forecastOnly);

      const { data, error: err } = await query
        .order("date", { ascending: true })
        .order("hour", { ascending: true });

      if (err) handleError(err, "charger les plannings", false);

      setPlannings((data as Planning[]) || []);
    } catch (err: any) {
      // L'erreur a déjà été gérée par handleError
      if (!(err instanceof PlanningError)) {
        handleError(err, "charger les plannings", false);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, forecastOnly, handleError]);

  /**
   * Ajout d'un planning avec validation
   */
  const add = async (planning: Omit<Planning, "id">) => {
    if (!companyId) {
      throw new PlanningError("Company ID manquant", "MISSING_COMPANY_ID");
    }

    setError(null);

    try {
      // 🔒 Validation des données
      const validation = validatePlanning(planning);
      if (!validation.success) {
        throw new PlanningError(
          validation.message,
          "VALIDATION_ERROR",
          validation.errors
        );
      }

      // Retirer documents de l'objet à insérer
      const { documents, ...planningData } = planning;
      
      const { data, error: err } = await supabase
        .from("plannings")
        .insert({ 
          ...validation.data, // Utiliser les données validées
          company_id: companyId,
          is_forecast: planning.is_forecast ?? false
        })
        .select("*, documents(*)");

      if (err) handleError(err, "ajouter l'événement");

      if (data && data.length > 0) {
        setPlannings((prev) => [...prev, ...data]);
        toast.success("Événement ajouté avec succès");
      }
    } catch (err: any) {
      if (!(err instanceof PlanningError)) {
        handleError(err, "ajouter l'événement");
      } else {
        throw err; // Re-throw pour que le composant puisse gérer
      }
    }
  };

  /**
   * Mise à jour d'un planning avec validation partielle
   */
  const update = async (id: string, updates: Partial<Planning>) => {
    setError(null);

    try {
      // 🔒 Validation des données de mise à jour
      const validation = validatePlanningUpdate(updates);
      if (!validation.success) {
        throw new PlanningError(
          validation.message,
          "VALIDATION_ERROR",
          validation.errors
        );
      }

      // Retirer les champs qui ne sont pas dans la table
      const { documents, id: _, company_id, created_at, updated_at, ...cleanUpdates } = validation.data as any;
      
      const { data, error: err } = await supabase
        .from("plannings")
        .update(cleanUpdates)
        .eq("id", id)
        .select("*, documents(*)");

      if (err) handleError(err, "mettre à jour l'événement");

      if (data && data[0]) {
        setPlannings((prev) =>
          prev.map((p) => (p.id === id ? data[0] : p))
        );
        toast.success("Événement modifié avec succès");
      }
    } catch (err: any) {
      if (!(err instanceof PlanningError)) {
        handleError(err, "mettre à jour l'événement");
      } else {
        throw err;
      }
    }
  };

  /**
   * Suppression d'un planning
   */
  const remove = async (id: string) => {
    setError(null);

    try {
      const { error: err } = await supabase
        .from("plannings")
        .delete()
        .eq("id", id);

      if (err) handleError(err, "supprimer l'événement");

      setPlannings((prev) => prev.filter((p) => p.id !== id));
      toast.success("Événement supprimé avec succès");
    } catch (err: any) {
      if (!(err instanceof PlanningError)) {
        handleError(err, "supprimer l'événement");
      } else {
        throw err;
      }
    }
  };

  // Chargement initial
  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!companyId || !enableRealtime) return;

    const channel = supabase
      .channel(`plannings-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plannings",
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const newPlanning = payload.new as Planning;
          const oldPlanning = payload.old as Planning;

          try {
            if (payload.eventType === "INSERT") {
              if (newPlanning.is_forecast === forecastOnly) {
                const { data, error } = await supabase
                  .from("plannings")
                  .select("*, documents(*)")
                  .eq("id", newPlanning.id)
                  .single();

                if (error) throw error;

                if (data) {
                  setPlannings((prev) => {
                    if (prev.some(p => p.id === data.id)) return prev;
                    return [...prev, data].sort((a, b) => {
                      if (a.date !== b.date) return a.date.localeCompare(b.date);
                      return a.hour.localeCompare(b.hour);
                    });
                  });
                }
              }
            } else if (payload.eventType === "UPDATE") {
              if (newPlanning.is_forecast !== forecastOnly) {
                setPlannings((prev) => prev.filter((p) => p.id !== newPlanning.id));
              } else {
                const { data, error } = await supabase
                  .from("plannings")
                  .select("*, documents(*)")
                  .eq("id", newPlanning.id)
                  .single();

                if (error) throw error;

                if (data) {
                  setPlannings((prev) => {
                    const exists = prev.some(p => p.id === data.id);
                    if (exists) {
                      return prev.map((p) => (p.id === data.id ? data : p));
                    } else {
                      return [...prev, data].sort((a, b) => {
                        if (a.date !== b.date) return a.date.localeCompare(b.date);
                        return a.hour.localeCompare(b.hour);
                      });
                    }
                  });
                }
              }
            } else if (payload.eventType === "DELETE") {
              setPlannings((prev) => prev.filter((p) => p.id !== oldPlanning.id));
            }
          } catch (err) {
            console.error("[Realtime] Erreur lors du traitement:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, forecastOnly, enableRealtime]);

  return { 
    plannings, 
    loading, 
    error,
    add, 
    update, 
    remove, 
    reload: load 
  };
}