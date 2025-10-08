import { useEffect } from 'react';
import { useStore } from '../stores/useStore';
import { userService } from '../services/userService';

export function useUsers() {
  const {
    users,
    setUsers,
    setError,
    setLoading,
    addNotification
  } = useStore();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAll();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) => {
    try {
      setLoading(true);
      const newUser = await userService.register(userData);
      setUsers(prev => [...prev, newUser]);
      addNotification(`Nouvel utilisateur ajouté : ${newUser.name}`);
      return newUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout de l\'utilisateur');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      setLoading(true);
      const updatedUser = await userService.update(id, updates);
      setUsers(prev => prev.map(user => 
        user.id === id ? updatedUser : user
      ));
      addNotification(`Utilisateur mis à jour : ${updatedUser.name}`);
      return updatedUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setLoading(true);
      await userService.delete(id);
      setUsers(prev => prev.filter(user => user.id !== id));
      addNotification('Utilisateur supprimé');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    addUser,
    updateUser,
    deleteUser,
    refreshUsers: loadUsers
  };
}