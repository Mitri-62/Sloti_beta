// src/vitrine/hooks/useVitrineAdmin.ts
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

interface UseVitrineAdminReturn {
  isAdmin: boolean;
  isLoading: boolean;
  user: any | null;
  error: string | null;
}

// Email du super admin - à terme, utiliser is_super_admin dans la table users
const SUPER_ADMIN_EMAIL = 'dimitri.deremarque@gmail.com';

export default function useVitrineAdmin(): UseVitrineAdminReturn {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Récupérer la session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          setIsAdmin(false);
          setUser(null);
          return;
        }

        setUser(session.user);

        // Méthode 1 : Vérification par email (simple)
        if (session.user.email === SUPER_ADMIN_EMAIL) {
          setIsAdmin(true);
          return;
        }

        // Méthode 2 : Vérification via la table users (plus robuste)
        // Décommenter si tu utilises le champ is_super_admin
        /*
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_super_admin')
          .eq('auth_id', session.user.id)
          .single();

        if (userError) {
          console.error('Erreur vérification admin:', userError);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(userData?.is_super_admin === true);
        */

        setIsAdmin(false);

      } catch (err: any) {
        console.error('Erreur useVitrineAdmin:', err);
        setError(err.message || 'Erreur de vérification');
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setUser(null);
      } else if (session?.user) {
        setUser(session.user);
        setIsAdmin(session.user.email === SUPER_ADMIN_EMAIL);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, isLoading, user, error };
}