// src/types/company.types.ts

export interface CompanyWithStats {
  id: string;
  name: string;
  billing_email: string | null;
  created_at: string;
  users_count?: number;
  tours_count?: number;
  stocks_count?: number;
}

export interface SuperAdmin {
  id: string;
  user_id: string;
  notes: string | null;
  created_at: string;
}

export interface CompanyStats {
  total_companies: number;
  total_users: number;
  total_tours: number;
  total_stocks: number;
}

export interface UserInvitation {
  email: string;
  role: 'admin' | 'dispatcher' | 'driver' | 'warehouse';
  company_id: string;
}
