// src/components/ProtectedDriverRoute.tsx
// Protection de la route /driver-app avec token d'accès

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader, AlertTriangle, Lock } from 'lucide-react';

interface ProtectedDriverRouteProps {
  children: React.ReactNode;
}

interface DriverAccess {
  tour_id: string;
  driver_id: string;
  driver_name: string;
  company_id: string;
  expires_at: string;
}

export default function ProtectedDriverRoute({ children }: ProtectedDriverRouteProps) {
  const { tourId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<DriverAccess | null>(null);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!tourId) {
        setError('ID de tournée manquant');
        setLoading(false);
        return;
      }

      if (!token) {
        setError('Token d\'accès requis');
        setLoading(false);
        return;
      }

      try {
        // ✅ Vérifier le token via RPC sécurisée
        const { data, error: rpcError } = await supabase
          .rpc('verify_driver_access_token', {
            p_tour_id: tourId,
            p_token: token,
          });

        if (rpcError) {
          console.error('Erreur vérification token:', rpcError);
          setError('Token invalide ou expiré');
          setLoading(false);
          return;
        }

        if (!data || data.valid === false) {
          setError(data?.error || 'Accès refusé');
          setLoading(false);
          return;
        }

        // ✅ Token valide
        setAccess({
          tour_id: data.tour_id,
          driver_id: data.driver_id,
          driver_name: data.driver_name,
          company_id: data.company_id,
          expires_at: data.expires_at,
        });

      } catch (err) {
        console.error('Erreur vérification accès:', err);
        setError('Erreur de vérification');
      } finally {
        setLoading(false);
      }
    };

    verifyAccess();
  }, [tourId, token]);

  // Chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
          <p className="text-gray-600">Vérification de l'accès...</p>
        </div>
      </div>
    );
  }

  // Erreur d'accès
  if (error || !access) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-red-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600 mb-6">{error || 'Vous n\'avez pas accès à cette page.'}</p>
          
          <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-600">
            <p className="font-medium mb-2">Causes possibles :</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Le lien a expiré</li>
              <li>Le lien est invalide</li>
              <li>La tournée n'existe plus</li>
            </ul>
          </div>
          
          <p className="mt-6 text-sm text-gray-500">
            Contactez votre responsable pour obtenir un nouveau lien d'accès.
          </p>
        </div>
      </div>
    );
  }

  // Vérifier l'expiration
  if (new Date(access.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-orange-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien expiré</h1>
          <p className="text-gray-600">
            Ce lien d'accès a expiré. Veuillez demander un nouveau lien à votre responsable.
          </p>
        </div>
      </div>
    );
  }

  // ✅ Accès autorisé - Passer les infos au composant enfant via context
  return (
    <DriverAccessContext.Provider value={access}>
      {children}
    </DriverAccessContext.Provider>
  );
}

// ✅ Context pour partager les infos d'accès
import { createContext, useContext } from 'react';

const DriverAccessContext = createContext<DriverAccess | null>(null);

export function useDriverAccess() {
  const context = useContext(DriverAccessContext);
  if (!context) {
    throw new Error('useDriverAccess must be used within ProtectedDriverRoute');
  }
  return context;
}