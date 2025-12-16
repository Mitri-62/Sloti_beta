// src/hooks/useUsers.ts - VERSION SÉCURISÉE
import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { User } from '../types';
import { toast } from 'sonner';

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  addUser: (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

export function useUsers(): UseUsersReturn {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * ✅ Charger les utilisateurs de la même company uniquement
   */
  const loadUsers = useCallback(async () => {
    // Guard : company_id obligatoire
    if (!user?.company_id) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await userService.getAll(user.company_id);
      setUsers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des utilisateurs';
      setError(message);
      console.error('[useUsers] Erreur loadUsers:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  /**
   * ✅ Ajouter un utilisateur dans la même company
   */
  const addUser = useCallback(async (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<User> => {
    if (!user?.company_id) {
      throw new Error('Vous devez être connecté pour ajouter un utilisateur');
    }

    try {
      setLoading(true);
      setError(null);
      
      const newUser = await userService.register(userData, user.company_id);
      
      // Mettre à jour la liste locale
      setUsers(prev => [newUser, ...prev]);
      
      toast.success(`Utilisateur "${newUser.name || newUser.email}" ajouté avec succès`);
      return newUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'ajout de l\'utilisateur';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  /**
   * ✅ Mettre à jour un utilisateur (même company uniquement)
   */
  const updateUser = useCallback(async (id: string, updates: Partial<User>): Promise<User> => {
    if (!user?.company_id) {
      throw new Error('Vous devez être connecté pour modifier un utilisateur');
    }

    try {
      setLoading(true);
      setError(null);
      
      const updatedUser = await userService.update(id, updates, user.company_id);
      
      // Mettre à jour la liste locale
      setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
      
      toast.success(`Utilisateur "${updatedUser.name || updatedUser.email}" mis à jour`);
      return updatedUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  /**
   * ✅ Supprimer un utilisateur (même company uniquement)
   */
  const deleteUser = useCallback(async (id: string): Promise<void> => {
    if (!user?.company_id) {
      throw new Error('Vous devez être connecté pour supprimer un utilisateur');
    }

    // Empêcher l'auto-suppression
    if (id === user.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte');
      throw new Error('Auto-suppression interdite');
    }

    try {
      setLoading(true);
      setError(null);
      
      await userService.delete(id, user.company_id);
      
      // Mettre à jour la liste locale
      setUsers(prev => prev.filter(u => u.id !== id));
      
      toast.success('Utilisateur supprimé');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, user?.id]);

  // Chargement initial
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    users,
    loading,
    error,
    addUser,
    updateUser,
    deleteUser,
    refreshUsers: loadUsers
  };
}

export default useUsers;