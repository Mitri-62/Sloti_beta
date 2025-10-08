// src/types.ts

export interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  company_id?: string;

  // ✅ Ajout pour Supabase join
  company_name?: string; // nom lisible de la company
}