// src/hooks/usePlannings.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

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

export function usePlannings(
  companyId?: string, 
  options: UsePlanningsOptions = {}
) {
  const { forecastOnly = false, enableRealtime = true } = options;

  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chargement initial
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

      if (err) throw err;

      setPlannings((data as Planning[]) || []);
    } catch (err: any) {
      console.error("Erreur chargement plannings:", err);
      setError(err.message || "Impossible de charger les plannings");
    } finally {
      setLoading(false);
    }
  }, [companyId, forecastOnly]);

  // Ajout
  const add = async (planning: Omit<Planning, "id">) => {
    if (!companyId) {
      throw new Error("Company ID manquant");
    }

    setError(null);

    try {
      // Retirer documents de l'objet à insérer
      const { documents, ...planningData } = planning;
      
      const { data, error: err } = await supabase
        .from("plannings")
        .insert({ 
          ...planningData, 
          company_id: companyId,
          is_forecast: planning.is_forecast ?? false
        })
        .select("*, documents(*)");

      if (err) throw err;

      if (data && data.length > 0) {
        setPlannings((prev) => [...prev, ...data]);
      }
    } catch (err: any) {
      console.error("Erreur ajout planning:", err);
      setError(err.message || "Impossible d'ajouter l'événement");
      throw err;
    }
  };

  // Mise à jour
  const update = async (id: string, updates: Partial<Planning>) => {
    setError(null);

    try {
      // Retirer les champs qui ne sont pas dans la table
      const { documents, ...cleanUpdates } = updates;
      
      const { data, error: err } = await supabase
        .from("plannings")
        .update(cleanUpdates)
        .eq("id", id)
        .select("*, documents(*)");

      if (err) throw err;

      if (data && data[0]) {
        setPlannings((prev) =>
          prev.map((p) => (p.id === id ? data[0] : p))
        );
      }
    } catch (err: any) {
      console.error("Erreur update planning:", err);
      setError(err.message || "Impossible de mettre à jour l'événement");
      throw err;
    }
  };

  // Suppression
  const remove = async (id: string) => {
    setError(null);

    try {
      const { error: err } = await supabase
        .from("plannings")
        .delete()
        .eq("id", id);

      if (err) throw err;

      setPlannings((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error("Erreur suppression planning:", err);
      setError(err.message || "Impossible de supprimer l'événement");
      throw err;
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

          if (payload.eventType === "INSERT") {
            if (newPlanning.is_forecast === forecastOnly) {
              const { data } = await supabase
                .from("plannings")
                .select("*, documents(*)")
                .eq("id", newPlanning.id)
                .single();

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
              const { data } = await supabase
                .from("plannings")
                .select("*, documents(*)")
                .eq("id", newPlanning.id)
                .single();

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