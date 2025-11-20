// src/pages/DriverApp.tsx - VERSION COMPLÈTE AVEC ANALYTICS
import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Navigation, MapPin, Package, CheckCircle, AlertCircle, Phone, Clock, Lock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

interface Stop {
  id: string;
  sequence_order: number;
  customer_name: string;
  address: string;
  customer_phone: string;
  time_window_start: string;
  time_window_end: string;
  weight_kg: number;
  status: 'pending' | 'arrived' | 'completed' | 'failed';
}

interface Tour {
  id: string;
  name: string;
  driver_id: string;
  access_token?: string;
  token_expires_at?: string;
}

export default function DriverApp() {
  const { tourId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [tracking, setTracking] = useState(false);
  const [tour, setTour] = useState<Tour | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const accessLoggedRef = useRef(false);

  // 📊 Logger l'accès
  const logAccess = async (action: string, metadata?: any) => {
    if (!tour?.id) return;

    try {
      await supabase.from('driver_access_logs').insert({
        tour_id: tour.id,
        driver_id: tour.driver_id,
        action: action,
        user_agent: navigator.userAgent,
        metadata: metadata || {}
      });
      console.log('📊 Log:', action);
    } catch (err) {
      console.warn('⚠️ Erreur logging:', err);
    }
  };

  // Charger les données de la tournée avec vérification du token
  useEffect(() => {
    if (!tourId) {
      setError('ID de tournée manquant');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Token d\'accès manquant. Demandez un nouveau lien à votre dispatcher.');
      setLoading(false);
      return;
    }

    loadTourWithToken();

    // S'abonner aux changements
    const channel = supabase
      .channel(`tour-${tourId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_stops',
        filter: `tour_id=eq.${tourId}`
      }, loadTourWithToken)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tourId, token]);

  const loadTourWithToken = async () => {
    try {
      console.log('🔐 Vérification token...');
      console.log('📍 Tour ID:', tourId);
      console.log('🔑 Token reçu:', token?.substring(0, 20) + '...');
      
      // Vérifier le token
      const { data: tourData, error: tourError } = await supabase
        .from('tours')
        .select('id, name, driver_id, access_token, token_expires_at')
        .eq('id', tourId)
        .maybeSingle();

      if (tourError) {
        console.error('❌ Erreur chargement:', tourError);
        throw new Error('Erreur lors du chargement de la tournée');
      }

      if (!tourData) {
        console.error('❌ Aucune tournée trouvée avec cet ID');
        throw new Error('Tournée introuvable');
      }

      console.log('📦 Tournée trouvée:', tourData.name);
      console.log('🔑 Token en base:', tourData.access_token?.substring(0, 20) + '...');

      // Vérifier que le token correspond
      if (tourData.access_token !== token) {
        console.error('❌ Token invalide - Les tokens ne correspondent pas');
        throw new Error('Accès non autorisé - Token invalide');
      }

      // 🆕 Vérifier l'expiration du token
      if (tourData.token_expires_at) {
        const expiryDate = new Date(tourData.token_expires_at);
        if (expiryDate < new Date()) {
          console.error('⏰ Token expiré');
          throw new Error('Ce lien a expiré. Demandez un nouveau lien à votre dispatcher.');
        }
        console.log('✅ Token valide jusqu\'au:', expiryDate.toLocaleString('fr-FR'));
      }

      console.log('✅ Token validé avec succès !');
      setTour(tourData);

      // 📊 Logger l'accès (une seule fois)
      if (!accessLoggedRef.current) {
        await logAccess('opened', {
          timestamp: new Date().toISOString()
        });
        accessLoggedRef.current = true;
      }

      // Charger les stops
      const { data: stopsData, error: stopsError } = await supabase
        .from('delivery_stops')
        .select('*')
        .eq('tour_id', tourId)
        .order('sequence_order', { ascending: true });

      if (stopsError) {
        console.error('❌ Erreur stops:', stopsError);
      } else if (stopsData) {
        console.log(`✅ ${stopsData.length} arrêts chargés`);
        setStops(stopsData);
      }

      setError(null);
      setLoading(false);
    } catch (err: any) {
      console.error('💥 Exception:', err);
      setError(err.message || 'Erreur lors du chargement');
      setLoading(false);
    }
  };

  // Fonction pour calculer la distance
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Vérifier si on doit envoyer la position
  const shouldSendLocation = (lat: number, lng: number): boolean => {
    if (!lastSentRef.current) return true;
    
    const timeDiff = Date.now() - lastSentRef.current.time;
    if (timeDiff > 30000) return true;
    
    const distance = calculateDistance(
      lastSentRef.current.lat,
      lastSentRef.current.lng,
      lat,
      lng
    ) * 1000;
    
    return distance > 50;
  };

  // Envoyer la position au serveur
  const sendLocation = async (latitude: number, longitude: number, accuracy?: number) => {
    if (!tour?.driver_id || !tourId) return;

    try {
      await supabase.from('driver_locations').insert({
        driver_id: tour.driver_id,
        tour_id: tourId,
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString()
      });

      await supabase
        .from('drivers')
        .update({
          current_location_lat: latitude,
          current_location_lng: longitude,
          last_location_update: new Date().toISOString()
        })
        .eq('id', tour.driver_id);

      if (lastSentRef.current) {
        const dist = calculateDistance(
          lastSentRef.current.lat,
          lastSentRef.current.lng,
          latitude,
          longitude
        );
        setDistanceTraveled(prev => prev + dist);
      }

      lastSentRef.current = { lat: latitude, lng: longitude, time: Date.now() };
    } catch (error) {
      console.error('Erreur envoi position:', error);
    }
  };

  // Démarrer le tracking GPS
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error('GPS non disponible sur cet appareil');
      return;
    }

    setTracking(true);
    toast.loading('Demande d\'accès au GPS...', { id: 'gps' });

    // 📊 Logger l'activation GPS
    logAccess('gps_enabled');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        if (shouldSendLocation(latitude, longitude)) {
          sendLocation(latitude, longitude, accuracy);
        }

        toast.success('GPS activé !', { id: 'gps' });
      },
      (error) => {
        console.error('Erreur GPS:', error);
        
        let errorMessage = 'Impossible d\'obtenir votre position';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permission GPS refusée. Autorisez la localisation dans les réglages de Safari.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position GPS indisponible. Vérifiez votre connexion.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Délai GPS dépassé. Réessayez.';
            break;
        }
        
        toast.error(errorMessage, { id: 'gps', duration: 5000 });
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Arrêter le tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    toast.success('GPS arrêté');

    // 📊 Logger l'arrêt GPS
    logAccess('gps_disabled');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Marquer un arrêt comme "Arrivé"
  const markArrived = async (stopId: string) => {
    const { error } = await supabase
      .from('delivery_stops')
      .update({ status: 'arrived' })
      .eq('id', stopId);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
    } else {
      toast.success('Marqué comme arrivé');
      // 📊 Logger l'arrivée
      logAccess('stop_arrived', { stop_id: stopId });
    }
  };

  // Marquer un arrêt comme "Complété"
  const markCompleted = async (stopId: string) => {
    const { error } = await supabase
      .from('delivery_stops')
      .update({ 
        status: 'completed',
        actual_arrival: new Date().toISOString()
      })
      .eq('id', stopId);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
    } else {
      toast.success('Livraison validée !');
      // 📊 Logger la complétion
      logAccess('stop_completed', { stop_id: stopId });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la tournée...</p>
          <p className="text-sm text-gray-400 mt-2">Vérification des accès...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !tour) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <Lock size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600 mb-4">{error || 'Tournée introuvable'}</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>💡 Assurez-vous que :</strong>
            </p>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>Le lien est complet et correct</li>
              <li>Vous utilisez le bon token d'accès</li>
              <li>Le lien n'a pas expiré (validité 48h)</li>
              <li>La tournée n'a pas été supprimée</li>
            </ul>
            <p className="text-xs text-yellow-600 mt-3 italic">
              Si le problème persiste, contactez votre dispatcher pour obtenir un nouveau lien.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentStop = stops.find(s => s.status === 'arrived') || 
                       stops.find(s => s.status === 'pending');

  const completedStops = stops.filter(s => s.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mobile */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-10 shadow-lg">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-1">{tour.name}</h1>
          <p className="text-sm text-blue-100">Tournée du jour</p>
          
          {/* Statut GPS */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {tracking ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">GPS activé</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-sm">GPS désactivé</span>
                </>
              )}
            </div>
            
            {!tracking ? (
              <button
                onClick={startTracking}
                className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50"
              >
                <Navigation size={16} />
                Activer GPS
              </button>
            ) : (
              <button
                onClick={stopTracking}
                className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 bg-white/20 hover:bg-white/30"
              >
                Arrêter GPS
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">
              {completedStops}/{stops.length}
            </p>
            <p className="text-xs text-gray-600 mt-1">Arrêts complétés</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{distanceTraveled.toFixed(1)} km</p>
            <p className="text-xs text-gray-600 mt-1">Parcourus</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-200">
            <p className="text-2xl font-bold text-blue-600">{stops.length - completedStops}</p>
            <p className="text-xs text-gray-600 mt-1">Restants</p>
          </div>
        </div>
      </div>

      {/* Prochain arrêt */}
      {currentStop && (
        <div className="px-4 mb-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {currentStop.sequence_order}
              </div>
              <span className="text-sm font-medium">Prochain arrêt</span>
            </div>
            
            <h3 className="text-xl font-bold mb-2">{currentStop.customer_name}</h3>
            <p className="text-sm text-blue-100 mb-4">{currentStop.address}</p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={14} />
                  <span className="text-xs">Créneau</span>
                </div>
                <p className="text-sm font-semibold">
                  {currentStop.time_window_start} - {currentStop.time_window_end}
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Package size={14} />
                  <span className="text-xs">Poids</span>
                </div>
                <p className="text-sm font-semibold">{currentStop.weight_kg} kg</p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <a
                href={`tel:${currentStop.customer_phone}`}
                className="flex-1 px-4 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-semibold text-center flex items-center justify-center gap-2"
              >
                <Phone size={18} />
                Appeler
              </a>
              
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentStop.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors font-semibold text-center flex items-center justify-center gap-2"
              >
                <MapPin size={18} />
                Maps
              </a>

              <a
                href={`https://waze.com/ul?q=${encodeURIComponent(currentStop.address)}&navigate=yes`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors font-semibold text-center flex items-center justify-center gap-2"
              >
                <Navigation size={18} />
                Waze
              </a>
            </div>

            {currentStop.status === 'arrived' ? (
              <button
                onClick={() => markCompleted(currentStop.id)}
                className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 rounded-xl transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                Valider la livraison
              </button>
            ) : (
              <button
                onClick={() => markArrived(currentStop.id)}
                className="w-full px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <MapPin size={18} />
                Je suis arrivé
              </button>
            )}
          </div>
        </div>
      )}

      {/* Liste des arrêts */}
      <div className="px-4 pb-20">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Tous les arrêts</h2>
        <div className="space-y-3">
          {stops.map((stop) => (
            <div
              key={stop.id}
              className={`bg-white rounded-xl shadow-sm p-4 border-2 transition-all ${
                stop.status === 'completed'
                  ? 'border-green-200 bg-green-50'
                  : stop.status === 'arrived'
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${
                  stop.status === 'completed' 
                    ? 'bg-green-500 text-white'
                    : stop.status === 'arrived'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {stop.sequence_order}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">{stop.customer_name}</h3>
                    {stop.status === 'completed' && (
                      <CheckCircle className="text-green-600" size={20} />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{stop.address}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {stop.time_window_start} - {stop.time_window_end}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package size={12} />
                      {stop.weight_kg} kg
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions si GPS pas activé */}
      {!tracking && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t-2 border-yellow-200 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-yellow-900 text-sm mb-1">
                GPS non activé
              </p>
              <p className="text-xs text-yellow-800 mb-2">
                Activez le GPS pour que le dispatching puisse suivre votre position en temps réel.
              </p>
              <details className="text-xs text-yellow-700">
                <summary className="cursor-pointer font-medium">📱 Problème d'autorisation ?</summary>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Tapez sur "aA" dans la barre d'adresse Safari</li>
                  <li>Sélectionnez "Réglages du site web"</li>
                  <li>Activez "Localisation"</li>
                  <li>Rechargez la page et réessayez</li>
                </ol>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}