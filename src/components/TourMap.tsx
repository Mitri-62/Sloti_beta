// src/components/TourMap.tsx - AVEC CHOIX DE PROVIDERS
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { Layers } from 'lucide-react';

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

// 🗺️ DIFFÉRENTS FOURNISSEURS DE CARTES
const MAP_PROVIDERS = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  },
  carto_light: {
    name: 'Carto Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
  },
  carto_dark: {
    name: 'Carto Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
  },
  esri_world: {
    name: 'ESRI World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© ESRI',
    maxZoom: 18
  },
  google_streets: {
    name: 'Google Streets',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '© Google',
    maxZoom: 20
  },
  google_satellite: {
    name: 'Google Satellite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '© Google',
    maxZoom: 20
  },
  google_hybrid: {
    name: 'Google Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '© Google',
    maxZoom: 20
  },
  stadia_smooth: {
    name: 'Stadia Smooth',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © OpenStreetMap',
    maxZoom: 20
  },
  stadia_dark: {
    name: 'Stadia Dark',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © OpenStreetMap',
    maxZoom: 20
  }
};

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
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  const [driverPath, setDriverPath] = useState<[number, number][]>([]);
  const [pathDistance, setPathDistance] = useState(0);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<keyof typeof MAP_PROVIDERS>('carto_light');

  // Charger le fournisseur sauvegardé
  useEffect(() => {
    const saved = localStorage.getItem('map-provider');
    if (saved && MAP_PROVIDERS[saved as keyof typeof MAP_PROVIDERS]) {
      setCurrentProvider(saved as keyof typeof MAP_PROVIDERS);
    }
  }, []);

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

    const provider = MAP_PROVIDERS[currentProvider];
    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;
  }, []);

  // Changer de fournisseur de tuiles
  const changeProvider = (providerId: keyof typeof MAP_PROVIDERS) => {
    if (!mapRef.current) return;

    // Supprimer l'ancienne couche
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    // Ajouter la nouvelle couche
    const provider = MAP_PROVIDERS[providerId];
    const newTileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom
    }).addTo(mapRef.current);

    tileLayerRef.current = newTileLayer;
    setCurrentProvider(providerId);
    localStorage.setItem('map-provider', providerId);
    setShowProviderMenu(false);
  };

  // Créer l'icône personnalisée avec meilleure visibilité
  const createCustomIcon = (stop: Stop) => {
    const color = markerColors[stop.status as keyof typeof markerColors] || markerColors.pending;
    
    const svgIcon = `
      <svg width="50" height="60" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
        <!-- Ombre portée -->
        <ellipse cx="25" cy="56" rx="8" ry="3" fill="rgba(0,0,0,0.3)" />
        
        <!-- Contour blanc épais pour visibilité -->
        <path d="M25 2C13.954 2 5 10.954 5 22c0 14 20 35 20 35s20-21 20-35C45 10.954 36.046 2 25 2z" 
              fill="white" />
        
        <!-- Marqueur principal -->
        <path d="M25 5C15.611 5 8 12.611 8 22c0 12 17 30 17 30s17-18 17-30C42 12.611 34.389 5 25 5z" 
              fill="${color}" stroke="white" stroke-width="2.5"/>
        
        <!-- Cercle intérieur blanc -->
        <circle cx="25" cy="22" r="13" fill="white" opacity="0.95"/>
        
        <!-- Cercle de couleur -->
        <circle cx="25" cy="22" r="11" fill="${color}"/>
        
        <!-- Numéro avec contour -->
        <text x="25" y="29" font-size="16" font-weight="900" fill="white" text-anchor="middle" 
              stroke="rgba(0,0,0,0.3)" stroke-width="3" paint-order="stroke">
          ${stop.sequence_order}
        </text>
        <text x="25" y="29" font-size="16" font-weight="900" fill="white" text-anchor="middle">
          ${stop.sequence_order}
        </text>
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker',
      iconSize: [50, 60],
      iconAnchor: [25, 60],
      popupAnchor: [0, -60]
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

  // Dessiner le parcours réel du chauffeur
  useEffect(() => {
    if (!mapRef.current || !driverLocation) return;

    const newPoint: [number, number] = [driverLocation.latitude, driverLocation.longitude];
    
    setDriverPath(prev => {
      const updated = [...prev, newPoint];
      
      if (updated.length > 1) {
        const lastPoint = updated[updated.length - 2];
        const distance = calculateDistance(lastPoint[0], lastPoint[1], newPoint[0], newPoint[1]);
        setPathDistance(prev => prev + distance);
      }
      
      return updated;
    });
  }, [driverLocation]);

  // Afficher la polyline du parcours
  useEffect(() => {
    if (!mapRef.current || driverPath.length < 2) return;

    if (driverPathRef.current) {
      driverPathRef.current.setLatLngs(driverPath);
    } else {
      driverPathRef.current = L.polyline(driverPath, {
        color: '#10B981',
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1
      }).addTo(mapRef.current);
    }
  }, [driverPath]);

  // Afficher le marker du chauffeur avec meilleure visibilité
  useEffect(() => {
    if (!mapRef.current || !driverLocation) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLocation.latitude, driverLocation.longitude]);
    } else {
      const driverIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 60px; height: 60px;">
            <!-- Cercle pulsant blanc -->
            <div style="
              position: absolute; top: 50%; left: 50%; 
              transform: translate(-50%, -50%);
              width: 65px; height: 65px; 
              background: rgba(255, 255, 255, 0.4); 
              border-radius: 50%;
              animation: pulse-ring 2s ease-in-out infinite;">
            </div>
            
            <!-- Cercle principal avec ombre -->
            <div style="
              position: absolute; top: 50%; left: 50%; 
              transform: translate(-50%, -50%);
              width: 56px; height: 56px; 
              background: white;
              border-radius: 50%;
              box-shadow: 0 6px 20px rgba(0,0,0,0.4);">
            </div>
            
            <!-- Cercle de couleur -->
            <div style="
              position: absolute; top: 50%; left: 50%; 
              transform: translate(-50%, -50%);
              width: 50px; height: 50px; 
              background: linear-gradient(135deg, #10B981 0%, #059669 100%);
              border-radius: 50%; border: 3px solid white;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
              display: flex; align-items: center; justify-content: center;
              font-size: 26px;">
              🚚
            </div>
            
            ${pathDistance > 0 ? `
              <div style="
                position: absolute; bottom: -35px; left: 50%;
                transform: translateX(-50%); white-space: nowrap;
                background: white; padding: 6px 12px; border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25); 
                font-size: 12px; font-weight: 700;
                color: #10B981; border: 2px solid #10B981;">
                📍 ${pathDistance.toFixed(2)} km
              </div>
            ` : ''}
          </div>
        `,
        className: 'driver-marker',
        iconSize: [60, 60],
        iconAnchor: [30, 30]
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

  // CLEANUP COMPLET
  useEffect(() => {
    return () => {
      console.log('🧹 Cleanup TourMap');

      if (routingControlRef.current && mapRef.current) {
        try {
          mapRef.current.removeControl(routingControlRef.current);
        } catch (e) {
          console.warn('Erreur cleanup routingControl:', e);
        }
        routingControlRef.current = null;
      }

      markersRef.current.forEach(marker => {
        try {
          marker.remove();
        } catch (e) {
          console.warn('Erreur cleanup marker:', e);
        }
      });
      markersRef.current = [];

      if (driverMarkerRef.current) {
        try {
          driverMarkerRef.current.remove();
        } catch (e) {
          console.warn('Erreur cleanup driverMarker:', e);
        }
        driverMarkerRef.current = null;
      }

      if (driverPathRef.current && mapRef.current) {
        try {
          mapRef.current.removeLayer(driverPathRef.current);
        } catch (e) {
          console.warn('Erreur cleanup driverPath:', e);
        }
        driverPathRef.current = null;
      }

      if (tileLayerRef.current && mapRef.current) {
        try {
          mapRef.current.removeLayer(tileLayerRef.current);
        } catch (e) {
          console.warn('Erreur cleanup tileLayer:', e);
        }
        tileLayerRef.current = null;
      }

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
  }, []);

  return (
    <div style={{ position: 'relative', height }}>
      {/* Sélecteur de fournisseur de carte */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1000 }}>
        <button
          onClick={() => setShowProviderMenu(!showProviderMenu)}
          style={{
            background: 'white', padding: '10px 14px', borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '14px', fontWeight: 500
          }}
        >
          <Layers size={18} />
          {MAP_PROVIDERS[currentProvider].name}
        </button>

        {showProviderMenu && (
          <div style={{
            position: 'absolute', top: '50px', left: 0,
            background: 'white', borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            overflow: 'hidden', minWidth: '200px'
          }}>
            {Object.entries(MAP_PROVIDERS).map(([id, provider]) => (
              <button
                key={id}
                onClick={() => changeProvider(id as keyof typeof MAP_PROVIDERS)}
                style={{
                  width: '100%', padding: '12px 16px', border: 'none',
                  background: currentProvider === id ? '#EFF6FF' : 'white',
                  color: currentProvider === id ? '#2563EB' : '#374151',
                  textAlign: 'left', cursor: 'pointer',
                  fontSize: '14px', fontWeight: currentProvider === id ? 600 : 400,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (currentProvider !== id) {
                    e.currentTarget.style.background = '#F9FAFB';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentProvider !== id) {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                {provider.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Indicateur de distance parcourue */}
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
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
        }
        
        .driver-marker {
          background: transparent !important;
          border: none !important;
          filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));
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
        
        @keyframes pulse-ring {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0;
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