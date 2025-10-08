export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'user'
          last_active: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'admin' | 'user'
          last_active?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'user'
          last_active?: string
          created_at?: string
        }
      }
      receptions: {
        Row: {
          id: string
          date: string
          hour: number
          minutes: number
          transporteur: string
          reference?: string
          status: 'pending' | 'confirmed' | 'delayed' | 'completed'
          notes?: string
          position: number
          created_by_id?: string
          updated_by_id?: string
          created_at: string
          updated_at?: string
        }
        Insert: {
          id?: string
          date: string
          hour: number
          minutes: number
          transporteur: string
          reference?: string
          status: 'pending' | 'confirmed' | 'delayed' | 'completed'
          notes?: string
          position: number
          created_by_id?: string
          updated_by_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          date?: string
          hour?: number
          minutes?: number
          transporteur?: string
          reference?: string
          status?: 'pending' | 'confirmed' | 'delayed' | 'completed'
          notes?: string
          position?: number
          updated_by_id?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}