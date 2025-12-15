// src/components/ImpersonateBanner.tsx
// Bandeau d'avertissement affiché pendant l'impersonation

import { useState, useEffect } from 'react';
import { useImpersonate } from '../hooks/useImpersonate';
import { AlertTriangle, X, Clock, Building2, LogOut } from 'lucide-react';

export default function ImpersonateBanner() {
  const { isImpersonating, impersonateSession, stopImpersonate, getTimeRemaining } = useImpersonate();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  // Mettre à jour le temps restant toutes les secondes
  useEffect(() => {
    if (!isImpersonating) return;

    const updateTime = () => {
      const remaining = getTimeRemaining();
      if (remaining === null) return;

      const minutes = Math.floor(remaining / 60000);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${mins}m`);
      } else if (mins > 0) {
        setTimeRemaining(`${mins} min`);
      } else {
        setTimeRemaining('< 1 min');
      }

      // Alerte si moins de 15 minutes
      setIsExpiringSoon(remaining < 15 * 60 * 1000);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000); // Update toutes les 30s

    return () => clearInterval(interval);
  }, [isImpersonating, getTimeRemaining]);

  if (!isImpersonating || !impersonateSession) {
    return null;
  }

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-2 flex items-center justify-between text-sm ${
        isExpiringSoon 
          ? 'bg-red-600 text-white' 
          : 'bg-orange-500 text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle size={18} className="flex-shrink-0" />
        <span className="font-medium">
          Mode Impersonation actif
        </span>
        <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded">
          <Building2 size={14} />
          {impersonateSession.targetCompanyName}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden md:flex items-center gap-1.5 text-white/80">
          <Clock size={14} />
          Expire dans {timeRemaining}
        </span>
        
        <button
          onClick={() => stopImpersonate()}
          className="flex items-center gap-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Terminer</span>
        </button>
      </div>
    </div>
  );
}

// ✅ Hook pour ajuster le padding du body quand le banner est visible
export function useImpersonateBannerOffset() {
  const { isImpersonating } = useImpersonate();
  
  useEffect(() => {
    if (isImpersonating) {
      document.body.style.paddingTop = '40px';
    } else {
      document.body.style.paddingTop = '0';
    }

    return () => {
      document.body.style.paddingTop = '0';
    };
  }, [isImpersonating]);
}