// src/components/TourMap.tsx - AVEC CLEANUP COMPLET
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
  tourId?: string;
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
  tourId
}: TourMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routingControlRef = useRef<any>(null);
  const driverPathRef = useRef<L.Polyline | null>(null);
  
  const [driverPath, setDriverPath] = useState<[number, number][]>([]);
  const [pathDistance, setPathDistance] = useState(0);

  // Charger le parcours depuis localStorage
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

  // Sauvegarder le parcours
  useEffect(() => {
    if (tourId && driverPath.length > 0) {
      localStorage.setItem(`driver-path-${tourId}`, JSON.stringify({
        path: driverPath,
        distance: pathDistance,
        lastUpdate: new Date().toISOString()
      }));
    }
  }, [driverPath, pathDistance, tourId]);

  // Calculer la distance (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
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

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true
    }).setView([48.8566, 2.3522], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;
  }, []);

  // Créer l'icône personnalisée
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

  // Créer le popup
  const createPopupContent = (stop: Stop) => {
    const statusIcon = stop.status === 'completed' ? '✓' : 
                       stop.status === 'arrived' ? '→' : '○';
    const statusColor = markerColors[stop.status as keyof typeof markerColors];
    
    return `
      <div style="min-width: 200px; font-family: system-ui;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="
            width: 24px; height: 24px; border-radius: 50%; 
            background-color: ${statusColor}; color: white; 
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; font-size: 12px;">
            ${stop.sequence_order}
          </div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${stop.customer_name}</h3>
        </div>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">${stop.address}</p>
        <span style="
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 8px; background-color: ${statusColor}20;
          color: ${statusColor}; border-radius: 12px;
          font-size: 12px; font-weight: 500;">
          ${statusIcon} ${statusLabels[stop.status as keyof typeof statusLabels]}
        </span>
      </div>
    `;
  };

  // Mettre à jour les markers
  useEffect(() => {
    if (!mapRef.current || stops.length === 0) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const validStops = stops.filter(s => s.latitude && s.longitude);
    if (validStops.length === 0) return;

    const bounds = L.latLngBounds([]);

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

    if (validStops.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stops, onStopClick]);

  // Ajouter un point au parcours
  useEffect(() => {
    if (!driverLocation) return;

    const newPoint: [number, number] = [driverLocation.latitude, driverLocation.longitude];

    setDriverPath(prev => {
      if (prev.length === 0) return [newPoint];

      const lastPoint = prev[prev.length - 1];
      const distance = calculateDistance(
        lastPoint[0], lastPoint[1],
        newPoint[0], newPoint[1]
      );

      if (distance > 0.01) {
        setPathDistance(prevDist => prevDist + distance);
        return [...prev, newPoint];
      }

      return prev;
    });
  }, [driverLocation]);

  // Afficher le parcours du chauffeur
  useEffect(() => {
    if (!mapRef.current) return;

    if (driverPathRef.current) {
      driverPathRef.current.remove();
      driverPathRef.current = null;
    }

    if (driverPath.length >= 2) {
      const polyline = L.polyline(driverPath, {
        color: '#10B981',
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1,
        dashArray: '5, 10',
      }).addTo(mapRef.current);

      polyline.bindTooltip(
        `Parcours réel: ${pathDistance.toFixed(2)} km`,
        { permanent: false, direction: 'center' }
      );

      driverPathRef.current = polyline;
    }
  }, [driverPath, pathDistance]);

  // Marker du chauffeur
  useEffect(() => {
    if (!mapRef.current) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }

    if (driverLocation) {
      const driverIcon = L.divIcon({
        html: `
          <div style="position: relative;">
            <svg width="50" height="50" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="22" fill="#3B82F6" stroke="white" stroke-width="4"/>
              <text x="25" y="32" font-size="24" fill="white" text-anchor="middle">🚛</text>
            </svg>
            ${pathDistance > 0 ? `
              <div style="
                position: absolute; bottom: -30px; left: 50%;
                transform: translateX(-50%); white-space: nowrap;
                background: white; padding: 4px 8px; border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: 11px;">
                📍 ${pathDistance.toFixed(2)} km
              </div>
            ` : ''}
          </div>
        `,
        className: 'driver-marker',
        iconSize: [50, 50],
        iconAnchor: [25, 25]
      });

      const marker = L.marker([driverLocation.latitude, driverLocation.longitude], {
        icon: driverIcon,
        zIndexOffset: 1000
      });

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

    if (routingControlRef.current) {
      mapRef.current.removeControl(routingControlRef.current);
    }

    const waypoints = validStops.map(stop => 
      L.latLng(stop.latitude, stop.longitude)
    );

    routingControlRef.current = (L as any).Routing.control({
      waypoints: waypoints,
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      showAlternatives: false,
      lineOptions: {
        styles: [
          { color: '#3B82F6', opacity: 0.6, weight: 5 }
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      createMarker: () => null,
      show: false,
    }).addTo(mapRef.current);

    const container = routingControlRef.current.getContainer();
    if (container) {
      container.style.display = 'none';
    }
  }, [stops, showRoute]);

  // Fonction de réinitialisation
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

  // 🔥 CLEANUP COMPLET - LE PLUS IMPORTANT
  useEffect(() => {
    return () => {
      console.log('🧹 Cleanup TourMap');

      // 1. Supprimer le routingControl
      if (routingControlRef.current && mapRef.current) {
        try {
          mapRef.current.removeControl(routingControlRef.current);
        } catch (e) {
          console.warn('Erreur cleanup routingControl:', e);
        }
        routingControlRef.current = null;
      }

      // 2. Supprimer tous les markers
      markersRef.current.forEach(marker => {
        try {
          marker.remove();
        } catch (e) {
          console.warn('Erreur cleanup marker:', e);
        }
      });
      markersRef.current = [];

      // 3. Supprimer le marker du chauffeur
      if (driverMarkerRef.current) {
        try {
          driverMarkerRef.current.remove();
        } catch (e) {
          console.warn('Erreur cleanup driverMarker:', e);
        }
        driverMarkerRef.current = null;
      }

      // 4. Supprimer la polyline du parcours
      if (driverPathRef.current && mapRef.current) {
        try {
          mapRef.current.removeLayer(driverPathRef.current);
        } catch (e) {
          console.warn('Erreur cleanup driverPath:', e);
        }
        driverPathRef.current = null;
      }

      // 5. Détruire la carte Leaflet
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn('Erreur cleanup map:', e);
        }
        mapRef.current = null;
      }

      console.log('✅ TourMap cleanup terminé');
    };
  }, []); // 🎯 Dépendances vides = se déclenche uniquement au démontage

  return (
    <div style={{ position: 'relative', height }}>
      {pathDistance > 0 && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 1000,
          background: 'white', padding: '12px 16px', borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px'
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
              padding: '6px 12px', background: '#EF4444', color: 'white',
              border: 'none', borderRadius: '6px', fontSize: '11px',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
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
          width: '100%', height: '100%',
          borderRadius: '8px', overflow: 'hidden'
        }} 
      />
      
      {stops.length === 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white', padding: '20px', borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center'
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