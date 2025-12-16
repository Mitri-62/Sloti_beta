// src/services/userService.ts - VERSION SÉCURISÉE
import { User } from '../types';
import { supabase, handleSupabaseError } from "../supabaseClient";

export const userService = {
  /**
   * ✅ Récupérer tous les utilisateurs de la même company
   * @param companyId - ID de l'entreprise (obligatoire)
   */
  async getAll(companyId: string): Promise<User[]> {
    if (!companyId) {
      console.warn('[userService.getAll] company_id manquant');
      return [];
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));
    return data || [];
  },

  /**
   * ✅ Récupérer un utilisateur par ID (même company uniquement)
   * @param id - ID de l'utilisateur
   * @param companyId - ID de l'entreprise (obligatoire)
   */
  async getById(id: string, companyId: string): Promise<User | null> {
    if (!companyId) {
      console.warn('[userService.getById] company_id manquant');
      return null;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      // PGRST116 = pas de résultat (normal si user d'une autre company)
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    return data;
  },

  /**
   * ✅ Récupérer l'utilisateur courant (par son propre ID)
   * @param userId - ID de l'utilisateur connecté
   */
  async getCurrentUser(userId: string): Promise<User | null> {
    if (!userId) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    return data;
  },

  /**
   * ✅ Mise à jour d'un utilisateur (même company uniquement)
   * @param id - ID de l'utilisateur à modifier
   * @param updates - Champs à mettre à jour
   * @param companyId - ID de l'entreprise (obligatoire)
   */
  async update(id: string, updates: Partial<User>, companyId: string): Promise<User> {
    if (!companyId) {
      throw new Error('Company ID requis pour la mise à jour');
    }

    // Empêcher la modification du company_id
    const { company_id: _, ...safeUpdates } = updates as any;
    
    const { data, error } = await supabase
      .from('users')
      .update({
        ...safeUpdates,
        last_active: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data;
  },

  /**
   * ✅ Suppression d'un utilisateur (même company uniquement)
   * @param id - ID de l'utilisateur à supprimer
   * @param companyId - ID de l'entreprise (obligatoire)
   */
  async delete(id: string, companyId: string): Promise<void> {
    if (!companyId) {
      throw new Error('Company ID requis pour la suppression');
    }
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw new Error(handleSupabaseError(error));
  },

  /**
   * ✅ Mise à jour de la dernière activité (utilisateur courant uniquement)
   * @param id - ID de l'utilisateur connecté
   */
  async updateLastActive(id: string): Promise<void> {
    if (!id) return;
    
    const { error } = await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      // Ne pas throw pour ne pas bloquer l'UX
      console.error('[userService.updateLastActive] Erreur:', error);
    }
  },

  /**
   * 🔐 Mise à jour du mot de passe via Supabase Auth
   * (L'utilisateur ne peut changer que son propre mot de passe)
   */
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw new Error(handleSupabaseError(error));
  },

  /**
   * ✅ Inscription d'un nouvel utilisateur
   * @param userData - Données du nouvel utilisateur
   * @param companyId - ID de l'entreprise
   */
  async register(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }, companyId: string): Promise<User> {
    if (!companyId) {
      throw new Error('Company ID requis pour l\'inscription');
    }

    // 1. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });

    if (authError) throw new Error(handleSupabaseError(authError));
    if (!authData.user) throw new Error('Erreur lors de la création du compte');

    // 2. Créer le profil utilisateur dans la table users
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: userData.email,
        name: userData.name,
        role: userData.role || 'user',
        company_id: companyId,
        last_active: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data;
  }
};