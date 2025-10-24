// src/types/planning.types.ts

export type PlanningType = 'Réception' | 'Expédition';
export type PlanningStatus = 'Prévu' | 'En cours' | 'Chargé' | 'Terminé';

export interface PlanningRow {
  id: string;
  company_id: string | null;
  user_id: string | null;
  date: string; // Date ISO
  hour: string; // Ex: "08:00"
  type: PlanningType;
  transporter: string | null;
  products: string | null;
  status: PlanningStatus;
  duration: number; // En minutes
  name: string | null;
  is_forecast: boolean;
  dock_booking_id?: string | null; // ✅ Nouvelle colonne
  created_at: string;
}

export interface PlanningWithDock extends PlanningRow {
  dock_booking?: {
    id: string;
    dock: {
      id: string;
      name: string;
      type: string;
      zone?: string | null;
    };
    slot_start: string;
    slot_end: string;
    status: string;
  } | null;
}

export type PlanningInsert = Omit<PlanningRow, 'id' | 'created_at'>;
export type PlanningUpdate = Partial<Omit<PlanningRow, 'id' | 'company_id' | 'created_at'>> & { id: string };