// src/hooks/useImpersonate.ts - VERSION SÉCURISÉE
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface ImpersonateSession {
  targetCompanyId: string;
  targetCompanyName: string;
  startedAt: string;
  expiresAt: string; // ✅ NOUVEAU: Expiration automatique
}

// ✅ Durée max d'impersonation: 2 heures
const IMPERSONATE_DURATION_MS = 2 * 60 * 60 * 1000;

// ✅ Clé de stockage
const STORAGE_KEY = 'sloti_impersonate_session';

export function useImpersonate() {
  const { user } = useAuth();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonateSession, setImpersonateSession] = useState<ImpersonateSession | null>(null);

  // ✅ Vérifier si l'utilisateur est super admin (via le hook dédié)
  const checkIsSuperAdmin = useCallback(async (): Promise<boolean> => {
    if (!user?.email) return false;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('email', user.email)
        .single();

      if (error || !data) return false;
      return data.is_super_admin === true;
    } catch {
      return false;
    }
  }, [user?.email]);

  // ✅ Charger la session au montage
  useEffect(() => {
    const loadSession = () => {
      try {
        const sessionData = sessionStorage.getItem(STORAGE_KEY);
        if (!sessionData) {
          setIsImpersonating(false);
          setImpersonateSession(null);
          return;
        }

        const session: ImpersonateSession = JSON.parse(sessionData);
        
        // ✅ Vérifier l'expiration
        if (new Date(session.expiresAt) < new Date()) {
          console.warn('⚠️ Session impersonate expirée');
          sessionStorage.removeItem(STORAGE_KEY);
          setIsImpersonating(false);
          setImpersonateSession(null);
          toast.warning('Session d\'impersonation expirée');
          return;
        }

        setImpersonateSession(session);
        setIsImpersonating(true);
      } catch (err) {
        console.error('Erreur chargement session impersonate:', err);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    };

    loadSession();

    // ✅ Vérifier périodiquement l'expiration (toutes les minutes)
    const interval = setInterval(loadSession, 60000);
    return () => clearInterval(interval);
  }, []);

  /**
   * ✅ Démarrer l'impersonation
   * - Ne modifie PAS la BDD
   * - Stocke uniquement en sessionStorage
   * - Le company_id effectif est géré par le context
   */
  const startImpersonate = useCallback(async (
    targetCompanyId: string, 
    targetCompanyName: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Utilisateur non connecté');
      return false;
    }

    // ✅ Vérification serveur obligatoire
    const isSuperAdmin = await checkIsSuperAdmin();
    if (!isSuperAdmin) {
      toast.error('Accès refusé - Super admin requis');
      console.error('🚫 Tentative d\'impersonation non autorisée');
      return false;
    }

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + IMPERSONATE_DURATION_MS);

      const session: ImpersonateSession = {
        targetCompanyId,
        targetCompanyName,
        startedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      // ✅ Logger l'action côté serveur (audit trail)
      const { error: logError } = await supabase.from('impersonate_logs').insert({
        super_admin_id: user.id,
        target_company_id: targetCompanyId,
        action: 'start',
        ip_address: null, // Sera rempli par un trigger si configuré
        user_agent: navigator.userAgent.substring(0, 255),
      });

      if (logError) {
        console.warn('⚠️ Impossible de logger l\'impersonation:', logError);
        // On continue quand même - le log n'est pas bloquant
      }

      // ✅ Sauvegarder en sessionStorage uniquement
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      
      setImpersonateSession(session);
      setIsImpersonating(true);

      toast.success(`Connecté en tant que ${targetCompanyName}`, {
        description: `Session valide jusqu'à ${expiresAt.toLocaleTimeString('fr-FR')}`,
        duration: 5000,
      });

      // ✅ Recharger pour appliquer le nouveau contexte
      window.location.href = '/';
      return true;

    } catch (error) {
      console.error('❌ Erreur démarrage impersonate:', error);
      toast.error('Erreur lors de l\'impersonation');
      return false;
    }
  }, [user, checkIsSuperAdmin]);

  /**
   * ✅ Arrêter l'impersonation
   */
  const stopImpersonate = useCallback(async (): Promise<boolean> => {
    if (!impersonateSession) {
      toast.warning('Aucune session d\'impersonation active');
      return false;
    }

    try {
      // ✅ Logger la fin
      if (user) {
        await supabase.from('impersonate_logs').insert({
          super_admin_id: user.id,
          target_company_id: impersonateSession.targetCompanyId,
          action: 'stop',
          user_agent: navigator.userAgent.substring(0, 255),
        });
      }

      // ✅ Nettoyer le sessionStorage
      sessionStorage.removeItem(STORAGE_KEY);
      
      setImpersonateSession(null);
      setIsImpersonating(false);

      toast.success('Session d\'impersonation terminée');

      // ✅ Retourner au dashboard fondateur
      window.location.href = '/founder/dashboard';
      return true;

    } catch (error) {
      console.error('❌ Erreur arrêt impersonate:', error);
      toast.error('Erreur lors de l\'arrêt');
      return false;
    }
  }, [impersonateSession, user]);

  /**
   * ✅ Obtenir le company_id effectif
   * Utilisé par les autres composants pour savoir quelle company afficher
   */
  const getEffectiveCompanyId = useCallback((): string | null => {
    if (isImpersonating && impersonateSession) {
      return impersonateSession.targetCompanyId;
    }
    return user?.company_id || null;
  }, [isImpersonating, impersonateSession, user?.company_id]);

  /**
   * ✅ Temps restant avant expiration
   */
  const getTimeRemaining = useCallback((): number | null => {
    if (!impersonateSession) return null;
    const remaining = new Date(impersonateSession.expiresAt).getTime() - Date.now();
    return Math.max(0, remaining);
  }, [impersonateSession]);

  return {
    isImpersonating,
    impersonateSession,
    startImpersonate,
    stopImpersonate,
    getEffectiveCompanyId,
    getTimeRemaining,
  };
}

export default useImpersonate;