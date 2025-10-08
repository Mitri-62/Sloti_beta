import { User } from '../types';
import { supabase, handleSupabaseError } from "../supabaseClient";

export const userService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));
    return data || [];
  },

  async getById(id: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data;
  },

  /**
   * 🔑 Mise à jour d'un utilisateur métier (profil, rôle, etc.)
   * ⚠️ NE GÈRE PLUS LE MOT DE PASSE
   */
  async update(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        last_active: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },

  async updateLastActive(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },

  /**
   * 🔐 Mise à jour du mot de passe via Supabase Auth
   */
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw new Error(handleSupabaseError(error));
  }
};