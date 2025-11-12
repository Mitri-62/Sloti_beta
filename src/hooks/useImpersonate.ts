// src/hooks/useImpersonate.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface ImpersonateSession {
  originalUserId: string;
  originalCompanyId: string | null;
  targetCompanyId: string;
  targetCompanyName: string;
  startedAt: string;
}

export function useImpersonate() {
  const { user } = useAuth();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonateSession, setImpersonateSession] = useState<ImpersonateSession | null>(null);

  // Vérifier s'il y a une session impersonate active
  useEffect(() => {
    const sessionData = sessionStorage.getItem('impersonate_session');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      setImpersonateSession(session);
      setIsImpersonating(true);
    }
  }, []);

  // Démarrer l'impersonate
  const startImpersonate = useCallback(async (targetCompanyId: string, targetCompanyName: string) => {
    if (!user) return false;

    try {
      // Créer la session
      const session: ImpersonateSession = {
        originalUserId: user.id,
        originalCompanyId: user.company_id || null,
        targetCompanyId,
        targetCompanyName,
        startedAt: new Date().toISOString(),
      };

      // Sauvegarder dans sessionStorage
      sessionStorage.setItem('impersonate_session', JSON.stringify(session));

      // Logger l'action
      await supabase.from('impersonate_logs').insert({
        super_admin_id: user.id,
        target_company_id: targetCompanyId,
        action: 'start',
        timestamp: new Date().toISOString(),
      });

      // Mettre à jour le company_id de l'utilisateur temporairement
      const { error } = await supabase
        .from('users')
        .update({ company_id: targetCompanyId })
        .eq('id', user.id);

      if (error) throw error;

      setImpersonateSession(session);
      setIsImpersonating(true);

      // Recharger la page pour appliquer les changements
      window.location.href = '/app';
      return true;
    } catch (error) {
      console.error('Erreur démarrage impersonate:', error);
      return false;
    }
  }, [user]);

  // Arrêter l'impersonate
  const stopImpersonate = useCallback(async () => {
    if (!impersonateSession || !user) return false;

    try {
      // Restaurer la company_id originale
      const { error } = await supabase
        .from('users')
        .update({ company_id: impersonateSession.originalCompanyId })
        .eq('id', impersonateSession.originalUserId);

      if (error) throw error;

      // Logger la fin
      await supabase.from('impersonate_logs').insert({
        super_admin_id: impersonateSession.originalUserId,
        target_company_id: impersonateSession.targetCompanyId,
        action: 'stop',
        timestamp: new Date().toISOString(),
      });

      // Nettoyer le sessionStorage
      sessionStorage.removeItem('impersonate_session');

      setImpersonateSession(null);
      setIsImpersonating(false);

      // Retourner au dashboard fondateur
      window.location.href = '/app/founder/dashboard';
      return true;
    } catch (error) {
      console.error('Erreur arrêt impersonate:', error);
      return false;
    }
  }, [impersonateSession, user]);

  return {
    isImpersonating,
    impersonateSession,
    startImpersonate,
    stopImpersonate,
  };
}

export default useImpersonate;