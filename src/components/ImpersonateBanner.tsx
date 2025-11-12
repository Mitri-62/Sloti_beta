// src/components/ImpersonateBanner.tsx
import { AlertTriangle, LogOut } from 'lucide-react';
import useImpersonate from '../hooks/useImpersonate';

export default function ImpersonateBanner() {
  const { isImpersonating, impersonateSession, stopImpersonate } = useImpersonate();

  if (!isImpersonating || !impersonateSession) return null;

  const handleStop = async () => {
    if (confirm('Voulez-vous quitter le mode impersonate et retourner au dashboard fondateur ?')) {
      await stopImpersonate();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="flex-shrink-0 animate-pulse" />
            <div>
              <div className="font-bold text-sm">
                Mode Impersonate Actif
              </div>
              <div className="text-xs opacity-90">
                Vous êtes connecté en tant qu'admin de{' '}
                <strong>{impersonateSession.targetCompanyName}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors text-sm"
          >
            <LogOut size={16} />
            Retour Dashboard Fondateur
          </button>
        </div>
      </div>
    </div>
  );
}