import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

interface Stop {
  id: string;
  customer_name: string;
  address: string;
  latitude: number;
  longitude: number;
  sequence_order: number;
  status: string;
}

// Interface pour la position du chauffeur
interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  last_update: string;
}

interface TourMapProps {
  stops: Stop[];
  showRoute?: boolean;
  onStopClick?: (stop: Stop) => void;
  height?: string;
  driverLocation?: DriverLocation | null;
  tourId?: string; // ✅ NOUVEAU : Pour identifier le parcours
}

const markerColors = {
  pending: '#6B7280',
  arrived: '#3B82F6',
  completed: '#10B981',
  failed: '#EF4444'
};

const statusLabels = {
  pending: 'En attente',
  arrived: 'Arrivé',
  completed: 'Livré',
  failed: 'Échec'
};

export default function TourMap({ 
  stops, 
  showRoute = true, 
  onStopClick, 
  height = '600px',
  driverLocation,
  tourId // ✅ NOUVEAU
}: TourMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routingControlRef = useRef<any>(null);
  const driverPathRef = useRef<L.Polyline | null>(null); // ✅ NOUVEAU : Ref pour la polyline
  
  // ✅ NOUVEAU : État pour stocker le parcours du chauffeur
  const [driverPath, setDriverPath] = useState<[number, number][]>([]);
  const [pathDistance, setPathDistance] = useState(0); // Distance totale parcourue

  // ✅ NOUVEAU : Charger le parcours depuis localStorage au montage
  useEffect(() => {
    if (tourId) {
      const saved = localStorage.getItem(`driver-path-${tourId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setDriverPath(parsed.path || []);
          setPathDistance(parsed.distance || 0);
        } catch (e) {
          console.error('Erreur chargement parcours:', e);
        }
      }
    }
  }, [tourId]);

  // ✅ NOUVEAU : Sauvegarder le parcours dans localStorage
  useEffect(() => {
    if (tourId && driverPath.length > 0) {
      localStorage.setItem(`driver-path-${tourId}`, JSON.stringify({
        path: driverPath,
        distance: pathDistance,
        lastUpdate: new Date().toISOString()
      }));
    }
  }, [driverPath, pathDistance, tourId]);

  // ✅ NOUVEAU : Fonction pour calculer la distance entre deux points (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Créer la carte
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true
    }).setView([48.8566, 2.3522], 12); // Paris par défaut

    // Ajouter les tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Créer l'icône personnalisée pour les markers
  const createCustomIcon = (stop: Stop) => {
    const color = markerColors[stop.status as keyof typeof markerColors] || markerColors.pending;
    
    const svgIcon = `
      <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 30 20 30s20-16 20-30C40 8.954 31.046 0 20 0z" 
              fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="20" cy="20" r="12" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
        <text x="20" y="26" font-size="14" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
          ${stop.sequence_order}
        </text>
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker',
      iconSize: [40, 50],
      iconAnchor: [20, 50],
      popupAnchor: [0, -50]
    });
  };

  // Créer le popup HTML
  const createPopupContent = (stop: Stop) => {
    const statusIcon = stop.status === 'completed' ? '✓' : 
                       stop.status === 'arrived' ? '→' : '○';
    const statusColor = markerColors[stop.status as keyof typeof markerColors];
    
    return `
      <div style="min-width: 200px; font-family: system-ui;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            background-color: ${statusColor}; 
            color: white; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
          ">
            ${stop.sequence_order}
          </div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${stop.customer_name}</h3>
        </div>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">${stop.address}</p>
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background-color: ${statusColor}20;
          color: ${statusColor};
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        ">
          ${statusIcon} ${statusLabels[stop.status as keyof typeof statusLabels]}
        </span>
      </div>
    `;
  };

  // Mettre à jour les markers
  useEffect(() => {
    if (!mapRef.current || stops.length === 0) return;

    // Supprimer les anciens markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const validStops = stops.filter(s => s.latitude && s.longitude);
    if (validStops.length === 0) return;

    // Créer les bounds pour ajuster la vue
    const bounds = L.latLngBounds([]);

    // Ajouter les nouveaux markers
    validStops.forEach(stop => {
      const marker = L.marker([stop.latitude, stop.longitude], {
        icon: createCustomIcon(stop)
      });

      marker.bindPopup(createPopupContent(stop));

      marker.on('click', () => {
        if (onStopClick) onStopClick(stop);
      });

      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
      bounds.extend([stop.latitude, stop.longitude]);
    });

    // Ajuster la vue
    if (validStops.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stops, onStopClick]);

  // ✅ NOUVEAU : Ajouter un point au parcours quand la position du chauffeur change
  useEffect(() => {
    if (!driverLocation) return;

    const newPoint: [number, number] = [driverLocation.latitude, driverLocation.longitude];

    setDriverPath(prev => {
      // Si c'est le premier point, l'ajouter directement
      if (prev.length === 0) {
        return [newPoint];
      }

      // Vérifier si le point a vraiment changé (éviter les doublons)
      const lastPoint = prev[prev.length - 1];
      const distance = calculateDistance(
        lastPoint[0], lastPoint[1],
        newPoint[0], newPoint[1]
      );

      // N'ajouter que si le chauffeur s'est déplacé d'au moins 10 mètres
      if (distance > 0.01) { // 0.01 km = 10 mètres
        // Mettre à jour la distance totale
        setPathDistance(prevDist => prevDist + distance);
        return [...prev, newPoint];
      }

      return prev;
    });
  }, [driverLocation]);

  // ✅ NOUVEAU : Afficher le parcours du chauffeur sur la carte
  useEffect(() => {
    if (!mapRef.current) return;

    // Supprimer l'ancienne polyline
    if (driverPathRef.current) {
      driverPathRef.current.remove();
      driverPathRef.current = null;
    }

    // Créer la nouvelle polyline si on a au moins 2 points
    if (driverPath.length >= 2) {
      const polyline = L.polyline(driverPath, {
        color: '#10B981', // Vert pour le parcours réel
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1,
        dashArray: '5, 10', // Ligne pointillée
      }).addTo(mapRef.current);

      // Ajouter un tooltip au survol
      polyline.bindTooltip(
        `Parcours réel: ${pathDistance.toFixed(2)} km`,
        { permanent: false, direction: 'center' }
      );

      driverPathRef.current = polyline;
    }
  }, [driverPath, pathDistance]);

  // Gérer le marker du chauffeur
  useEffect(() => {
    if (!mapRef.current) return;

    // Supprimer l'ancien marker du chauffeur
    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }

    // Ajouter le nouveau marker si la position existe
    if (driverLocation) {
      // Créer une icône de camion pour le chauffeur
      const driverIcon = L.divIcon({
        html: `
          <div style="position: relative;">
            <svg width="50" height="50" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="22" fill="#3B82F6" stroke="white" stroke-width="4"/>
              <text x="25" y="32" font-size="24" fill="white" text-anchor="middle">🚛</text>
            </svg>
            <div style="
              position: absolute;
              bottom: -22px;
              left: 50%;
              transform: translateX(-50%);
              background: #3B82F6;
              color: white;
              padding: 3px 10px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              border: 2px solid white;
            ">
              Chauffeur
            </div>
          </div>
        `,
        className: 'driver-marker',
        iconSize: [50, 50],
        iconAnchor: [25, 25],
      });

      const marker = L.marker(
        [driverLocation.latitude, driverLocation.longitude],
        { 
          icon: driverIcon,
          zIndexOffset: 1000
        }
      );

      // Popup pour le chauffeur avec distance parcourue
      const lastUpdate = new Date(driverLocation.last_update);
      const minutesAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);
      
      marker.bindPopup(`
        <div style="text-align: center; padding: 10px; min-width: 180px;">
          <div style="font-size: 32px; margin-bottom: 8px;">🚛</div>
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #3B82F6;">
            Position chauffeur
          </h3>
          <p style="margin: 0; font-size: 13px; color: #666;">
            Mis à jour il y a <strong>${minutesAgo}</strong> min
          </p>
          ${pathDistance > 0 ? `
            <div style="
              margin-top: 8px;
              padding: 6px;
              background: #10B98120;
              border-radius: 6px;
              border: 1px solid #10B981;
            ">
              <p style="margin: 0; font-size: 12px; color: #10B981; font-weight: 600;">
                📍 ${pathDistance.toFixed(2)} km parcourus
              </p>
            </div>
          ` : ''}
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">
            ${driverLocation.latitude.toFixed(6)}, ${driverLocation.longitude.toFixed(6)}
          </p>
        </div>
      `);

      marker.addTo(mapRef.current);
      driverMarkerRef.current = marker;
    }
  }, [driverLocation, pathDistance]);

  // Gérer l'itinéraire planifié
  useEffect(() => {
    if (!mapRef.current || !showRoute || stops.length < 2) {
      if (routingControlRef.current) {
        mapRef.current?.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
      return;
    }

    const validStops = stops.filter(s => s.latitude && s.longitude);
    if (validStops.length < 2) return;

    // Supprimer l'ancien itinéraire
    if (routingControlRef.current) {
      mapRef.current.removeControl(routingControlRef.current);
    }

    // Créer les waypoints
    const waypoints = validStops.map(stop => 
      L.latLng(stop.latitude, stop.longitude)
    );

    // Créer le contrôle de routing
    routingControlRef.current = (L as any).Routing.control({
      waypoints: waypoints,
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      showAlternatives: false,
      lineOptions: {
        styles: [
          { color: '#3B82F6', opacity: 0.6, weight: 5 } // Plus transparent pour distinguer du parcours réel
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      createMarker: () => null,
      show: false,
    }).addTo(mapRef.current);

    // Masquer le conteneur d'instructions
    const container = routingControlRef.current.getContainer();
    if (container) {
      container.style.display = 'none';
    }

  }, [stops, showRoute]);

  // ✅ NOUVEAU : Fonction pour réinitialiser le parcours
  const clearDriverPath = () => {
    setDriverPath([]);
    setPathDistance(0);
    if (tourId) {
      localStorage.removeItem(`driver-path-${tourId}`);
    }
    if (driverPathRef.current) {
      driverPathRef.current.remove();
      driverPathRef.current = null;
    }
  };

  // ✅ NOUVEAU : Exposer la fonction de reset (optionnel)
  useEffect(() => {
    // Ajouter la fonction au window pour pouvoir l'appeler depuis l'extérieur
    (window as any).clearDriverPath = clearDriverPath;
  }, [tourId]);

  return (
    <div style={{ position: 'relative', height }}>
      {/* ✅ NOUVEAU : Badge avec statistiques du parcours */}
      {pathDistance > 0 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: '180px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📍</span>
            <div>
              <p style={{ margin: 0, fontSize: '11px', color: '#666', fontWeight: 500 }}>
                Distance parcourue
              </p>
              <p style={{ margin: 0, fontSize: '18px', color: '#10B981', fontWeight: 700 }}>
                {pathDistance.toFixed(2)} km
              </p>
            </div>
          </div>
          <button
            onClick={clearDriverPath}
            style={{
              padding: '6px 12px',
              background: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#DC2626'}
            onMouseOut={(e) => e.currentTarget.style.background = '#EF4444'}
          >
            🗑️ Effacer le parcours
          </button>
        </div>
      )}

      <div 
        ref={mapContainerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '8px',
          overflow: 'hidden'
        }} 
      />
      
      {stops.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#666' }}>Aucun point de livraison à afficher</p>
        </div>
      )}

      <style>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .driver-marker {
          background: transparent !important;
          border: none !important;
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.85;
          }
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .leaflet-popup-close-button {
          font-size: 20px !important;
          padding: 4px 8px !important;
        }
      `}</style>
    </div>
  );
}