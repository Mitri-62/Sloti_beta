// src/components/CookieBanner.tsx
// Bandeau de consentement cookies RGPD pour Google Analytics
import { useState, useEffect } from 'react';
import { X, Cookie, Settings, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'sloti_cookie_consent';

interface CookieConsent {
  essential: boolean; // Toujours true
  analytics: boolean;
  timestamp: string;
}

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà donné son consentement
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    
    if (!consent) {
      // Pas de consentement enregistré, afficher le bandeau
      setIsVisible(true);
      // Désactiver GA par défaut
      disableGA();
    } else {
      try {
        const parsed: CookieConsent = JSON.parse(consent);
        setAnalyticsEnabled(parsed.analytics);
        
        if (parsed.analytics) {
          enableGA();
        } else {
          disableGA();
        }
      } catch {
        setIsVisible(true);
        disableGA();
      }
    }
  }, []);

  const enableGA = () => {
    // Activer Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    }
  };

  const disableGA = () => {
    // Désactiver Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        'analytics_storage': 'denied'
      });
    }
    // Supprimer les cookies GA existants
    document.cookie.split(";").forEach((c) => {
      if (c.trim().startsWith("_ga")) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      }
    });
  };

  const saveConsent = (analytics: boolean) => {
    const consent: CookieConsent = {
      essential: true,
      analytics,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setAnalyticsEnabled(analytics);
    
    if (analytics) {
      enableGA();
    } else {
      disableGA();
    }
    
    setIsVisible(false);
  };

  const acceptAll = () => {
    saveConsent(true);
  };

  const rejectAll = () => {
    saveConsent(false);
  };

  const savePreferences = () => {
    saveConsent(analyticsEnabled);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
              <Cookie className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                🍪 Nous respectons votre vie privée
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nous utilisons des cookies pour améliorer votre expérience. Les cookies essentiels 
                sont nécessaires au fonctionnement du site. Les cookies analytics nous aident à 
                comprendre comment vous utilisez notre site.
              </p>
            </div>
          </div>

          {/* Détails (dépliable) */}
          {showDetails && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl space-y-4">
              
              {/* Cookies essentiels */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">Cookies essentiels</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                      Toujours actifs
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Authentification, préférences, sécurité. Nécessaires au fonctionnement.
                  </p>
                </div>
                <div className="w-10 h-5 bg-cyan-600 rounded-full flex items-center justify-end px-0.5">
                  <div className="w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>

              {/* Cookies analytics */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">Cookies analytics</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                      Google Analytics
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Statistiques de visite anonymisées pour améliorer notre service.
                  </p>
                </div>
                <button
                  onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    analyticsEnabled ? 'bg-cyan-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    analyticsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                En savoir plus : <Link to="/confidentialite" className="text-cyan-600 hover:underline">Politique de confidentialité</Link>
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <Settings size={16} />
            {showDetails ? 'Masquer les détails' : 'Personnaliser'}
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={rejectAll}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Refuser tout
            </button>
            
            {showDetails ? (
              <button
                onClick={savePreferences}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Check size={16} />
                Enregistrer mes choix
              </button>
            ) : (
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
              >
                Accepter tout
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook pour gérer le consentement depuis d'autres composants
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        setConsent(JSON.parse(stored));
      } catch {
        setConsent(null);
      }
    }
  }, []);

  const resetConsent = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    window.location.reload();
  };

  return { consent, resetConsent };
}