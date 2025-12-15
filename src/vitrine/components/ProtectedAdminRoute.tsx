// src/vitrine/components/ProtectedAdminRoute.tsx
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader, ShieldX, ArrowLeft } from 'lucide-react';
import useVitrineAdmin from '../hooks/useVitrineAdmin';
import logo from '../../assets/Sloti.svg';

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { isAdmin, isLoading, user, error } = useVitrineAdmin();

  // État de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <img src={logo} alt="Sloti" className="h-16 mx-auto mb-6" />
          <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600 font-medium">Vérification des autorisations...</p>
        </div>
      </div>
    );
  }

  // Pas connecté → redirection login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Connecté mais pas admin → page d'erreur
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldX className="text-red-600" size={40} />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Accès refusé
            </h1>
            
            <p className="text-gray-600 mb-6">
              Vous n'avez pas les autorisations nécessaires pour accéder à cette page.
              <br />
              <span className="text-sm text-gray-500 mt-2 block">
                Connecté en tant que : {user?.email}
              </span>
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft size={18} />
                Retour à l'accueil
              </a>
              <button
                onClick={async () => {
                  const { supabase } = await import('../../supabaseClient');
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin → afficher le contenu
  return <>{children}</>;
}