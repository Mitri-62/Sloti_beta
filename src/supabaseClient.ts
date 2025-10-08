// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Gestion d’erreurs utilitaire
export const handleSupabaseError = (error: any): string => {
  console.error("Supabase error:", error);

  if (error?.message === "Failed to fetch") {
    return "Mode hors ligne actif - les données sont stockées localement";
  }

  if (error?.code === "23505") {
    return "Cet élément existe déjà.";
  }

  if (error?.code === "PGRST301") {
    return "Vous n'avez pas les permissions nécessaires.";
  }

  return error?.message || "Une erreur est survenue";
};
