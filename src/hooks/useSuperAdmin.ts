// src/hooks/useSuperAdmin.ts
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export function useSuperAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (authLoading) return;
      
      if (!user?.id) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_super_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erreur vérification super admin:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data?.is_super_admin === true);
        }
      } catch (err) {
        console.error('Erreur:', err);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, [user?.id, authLoading]);

  return { isSuperAdmin, loading };
}

export default useSuperAdmin;