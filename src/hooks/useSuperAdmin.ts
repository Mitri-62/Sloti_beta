// src/hooks/useSuperAdmin.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Vérifier si l'utilisateur est super admin
  const checkSuperAdmin = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('is_super_admin', { user_id: user.id });

      if (!error) {
        setIsSuperAdmin(data === true);
      }
    } catch (error) {
      console.error('Erreur vérification super admin:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkSuperAdmin();
  }, [checkSuperAdmin]);

  return {
    isSuperAdmin,
    loading,
  };
}

export default useSuperAdmin;
