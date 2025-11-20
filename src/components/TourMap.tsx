// src/components/TourMap.tsx - VERSION CORRIGÉE
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { Layers, Trash2, Navigation as NavigationIcon } from 'lucide-react';

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
  const [currentProvider, setCurrentProvider] = useState<keyof typeof MAP_PROVIDERS>('osm');

  useEffect(() => {
    const saved = localStorage.getItem('map-provider');
    if (saved && MAP_PROVIDERS[saved as keyof typeof MAP_PROVIDERS]) {
      setCurrentProvider(saved as keyof typeof MAP_PROVIDERS);
    }
  }, []);

  useEffect(() => {
    if (tourId) {
      const saved = localStorage.getItem(`driver-path-${tourId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setDriverPath(parsed.path || []);
          setPathDistance(parsed.distance || 0);
          console.log('📍 Parcours chargé:', parsed.path.length, 'points,', parsed.distance.toFixed(2), 'km');
        } catch (e) {
          console.error('Erreur chargement parcours:', e);
        }
      }
    }
  }, [tourId]);

  useEffect(() => {
    if (tourId && driverPath.length > 0) {
      localStorage.setItem(`driver-path-${tourId}`, JSON.stringify({
        path: driverPath,
        distance: pathDistance,
        lastUpdate: new Date().toISOString()
      }));
    }
  }, [driverPath, pathDistance, tourId]);

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

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let initialCenter: [number, number] = [48.8566, 2.3522];
    let initialZoom = 12;

    if (driverLocation?.latitude && driverLocation?.longitude) {
      initialCenter = [driverLocation.latitude, driverLocation.longitude];
      initialZoom = 14;
      console.log('🚚 Carte centrée sur le camion:', initialCenter);
    } else {
      const validStops = stops.filter(s => s.latitude && s.longitude);
      
      if (validStops.length > 0) {
        const avgLat = validStops.reduce((sum, s) => sum + s.latitude, 0) / validStops.length;
        const avgLng = validStops.reduce((sum, s) => sum + s.longitude, 0) / validStops.length;
        initialCenter = [avgLat, avgLng];
        
        if (validStops.length === 1) {
          initialZoom = 15;
        } else {
          initialZoom = 13;
        }
        console.log('📍 Carte centrée sur les stops:', initialCenter);
      }
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true
    }).setView(initialCenter, initialZoom);

    const provider = MAP_PROVIDERS[currentProvider];
    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;

    setTimeout(() => {
      if (mapRef.current) {
        const bounds = L.latLngBounds([]);
        let hasPoints = false;

        if (driverLocation?.latitude && driverLocation?.longitude) {
          bounds.extend([driverLocation.latitude, driverLocation.longitude]);
          hasPoints = true;
        }

        const validStops = stops.filter(s => s.latitude && s.longitude);
        validStops.forEach(s => {
          bounds.extend([s.latitude, s.longitude]);
          hasPoints = true;
        });

        if (hasPoints && bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    }, 100);
  }, [stops, currentProvider, driverLocation]);

  const changeProvider = (providerId: keyof typeof MAP_PROVIDERS) => {
    if (!mapRef.current) return;

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

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

  const createCustomIcon = (stop: Stop) => {
    const color = markerColors[stop.status as keyof typeof markerColors] || markerColors.pending;
    
    const svgIcon = `
      <svg width="50" height="60" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="25" cy="56" rx="8" ry="3" fill="rgba(0,0,0,0.3)" />
        <path d="M25 2C13.954 2 5 10.954 5 22c0 14 20 35 20 35s20-21 20-35C45 10.954 36.046 2 25 2z" 
              fill="white" />
        <path d="M25 5C15.611 5 8 12.611 8 22c0 12 17 30 17 30s17-18 17-30C42 12.611 34.389 5 25 5z" 
              fill="${color}" stroke="white" stroke-width="2.5"/>
        <circle cx="25" cy="22" r="13" fill="white" opacity="0.95"/>
        <circle cx="25" cy="22" r="11" fill="${color}"/>
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

  useEffect(() => {
    if (!mapRef.current || stops.length === 0) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const validStops = stops.filter(s => s.latitude && s.longitude);
    if (validStops.length === 0) return;

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
    });
  }, [stops, onStopClick]);

  useEffect(() => {
    if (!mapRef.current || !driverLocation) return;

    const newPoint: [number, number] = [driverLocation.latitude, driverLocation.longitude];
    
    setDriverPath(prev => {
      const updated = [...prev];
      
      if (updated.length > 0) {
        const last = updated[updated.length - 1];
        if (last[0] === newPoint[0] && last[1] === newPoint[1]) {
          return prev;
        }
        
        const distance = calculateDistance(last[0], last[1], newPoint[0], newPoint[1]);
        
        if (distance > 1) {
          console.warn('⚠️ Saut GPS détecté:', distance.toFixed(2), 'km - ignoré');
          return prev;
        }
        
        setPathDistance(prevDist => prevDist + distance);
        console.log('📍 Nouveau point:', newPoint, '+', distance.toFixed(3), 'km');
      }
      
      updated.push(newPoint);
      return updated;
    });
  }, [driverLocation]);

  useEffect(() => {
    if (!mapRef.current || driverPath.length < 2) {
      if (driverPathRef.current) {
        driverPathRef.current.remove();
        driverPathRef.current = null;
      }
      return;
    }

    if (driverPathRef.current) {
      driverPathRef.current.setLatLngs(driverPath);
    } else {
      driverPathRef.current = L.polyline(driverPath, {
        color: '#3B82F6',
        weight: 5,
        opacity: 0.8,
        smoothFactor: 1.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(mapRef.current);
    }

    console.log('🔵 Parcours mis à jour:', driverPath.length, 'points');
  }, [driverPath]);

  useEffect(() => {
    if (!mapRef.current || !driverLocation) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLocation.latitude, driverLocation.longitude]);
    } else {
      const driverIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 60px; height: 60px;">
            <div style="
              position: absolute; top: 50%; left: 50%; 
              transform: translate(-50%, -50%);
              width: 70px; height: 70px; 
              background: rgba(59, 130, 246, 0.3); 
              border-radius: 50%;
              animation: pulse-ring 2s ease-in-out infinite;">
            </div>
            
            <div style="
              position: absolute; top: 50%; left: 50%; 
              transform: translate(-50%, -50%);
              width: 54px; height: 54px; 
              background: white;
              border-radius: 50%;
              box-shadow: 0 6px 20px rgba(0,0,0,0.3);">
            </div>
            
            <div style="
              position: absolute; top: 50%; left: 50%; 
              transform: translate(-50%, -50%);
              width: 48px; height: 48px; 
              background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
              border-radius: 50%; 
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
              display: flex; 
              align-items: center; 
              justify-content: center;
              font-size: 24px;">
              🚛
            </div>
            
            ${pathDistance > 0 ? `
              <div style="
                position: absolute; 
                bottom: -38px; 
                left: 50%;
                transform: translateX(-50%); 
                white-space: nowrap;
                background: linear-gradient(135deg, #3B82F6, #2563EB); 
                padding: 6px 12px; 
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25); 
                font-size: 12px; 
                font-weight: 700;
                color: white;
                border: 2px solid white;
                display: flex;
                align-items: center;
                gap: 4px;">
                <span style="font-size: 14px;">📍</span>
                ${pathDistance.toFixed(2)} km
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

      marker.bindPopup(`
        <div style="padding: 8px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #1F2937;">
            📍 Position actuelle
          </div>
          <div style="font-size: 12px; color: #6B7280;">
            Chauffeur en déplacement
          </div>
          ${pathDistance > 0 ? `
            <div style="margin-top: 6px; padding: 4px 8px; background: #EFF6FF; border-radius: 4px; font-size: 11px; color: #2563EB; font-weight: 600;">
              Distance: ${pathDistance.toFixed(2)} km
            </div>
          ` : ''}
        </div>
      `);

      marker.addTo(mapRef.current);
      driverMarkerRef.current = marker;
    }

    mapRef.current.setView([driverLocation.latitude, driverLocation.longitude], mapRef.current.getZoom(), { 
      animate: true, 
      duration: 0.5 
    });
  }, [driverLocation, pathDistance]);

  // ✅ CORRECTION RADICALE: Détruire complètement le control avant d'en créer un nouveau
  useEffect(() => {
    if (!mapRef.current || !showRoute || stops.length < 1) {
      // Détruire le control existant
      if (routingControlRef.current) {
        try {
          // Supprimer tous les event listeners
          if (routingControlRef.current.off) {
            routingControlRef.current.off();
          }
          // Supprimer de la map si attaché
          if (mapRef.current && routingControlRef.current._map) {
            mapRef.current.removeControl(routingControlRef.current);
          }
          // Supprimer manuellement les layers de route
          if (routingControlRef.current._line) {
            try {
              mapRef.current?.removeLayer(routingControlRef.current._line);
            } catch (e) {}
          }
        } catch (e) {
          console.warn('⚠️ Erreur nettoyage routingControl:', e);
        }
        routingControlRef.current = null;
      }
      return;
    }

    const validStops = stops.filter(s => s.latitude && s.longitude);
    if (validStops.length < 1) return;

    // Détruire complètement l'ancien control
    if (routingControlRef.current) {
      try {
        if (routingControlRef.current.off) {
          routingControlRef.current.off();
        }
        if (routingControlRef.current._line && mapRef.current) {
          try {
            mapRef.current.removeLayer(routingControlRef.current._line);
          } catch (e) {}
        }
        if (routingControlRef.current._map && mapRef.current) {
          mapRef.current.removeControl(routingControlRef.current);
        }
      } catch (e) {
        console.warn('⚠️ Erreur destruction routingControl:', e);
      }
      routingControlRef.current = null;
    }

    const waypoints = [];

    if (driverLocation?.latitude && driverLocation?.longitude) {
      waypoints.push(L.latLng(driverLocation.latitude, driverLocation.longitude));
      console.log('🚚 Route depuis le camion:', [driverLocation.latitude, driverLocation.longitude]);
    }

    validStops.forEach(stop => {
      waypoints.push(L.latLng(stop.latitude, stop.longitude));
    });

    console.log('📍 Waypoints totaux:', waypoints.length, '(camion + stops)');

    if (waypoints.length < 2) return;

    try {
      routingControlRef.current = (L as any).Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        showAlternatives: false,
        lineOptions: {
          styles: [
            { 
              color: '#EF4444',
              opacity: 0.8,
              weight: 5,
              dashArray: '15, 10'
            }
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
    } catch (e) {
      console.error('❌ Erreur lors de la création du routingControl:', e);
      routingControlRef.current = null;
    }
  }, [stops, showRoute, driverLocation]);

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
    console.log('🗑️ Parcours effacé');
  };

  // ✅ CLEANUP AMÉLIORÉ - Détruire le routingControl en priorité
  useEffect(() => {
    return () => {
      console.log('🧹 Cleanup TourMap');

      // ✅ PRIORITÉ 1: Détruire le routingControl AVANT tout le reste
      if (routingControlRef.current) {
        try {
          // Désactiver tous les event listeners
          if (routingControlRef.current.off) {
            routingControlRef.current.off();
          }
          // Supprimer la ligne de route manuellement
          if (routingControlRef.current._line && mapRef.current) {
            try {
              mapRef.current.removeLayer(routingControlRef.current._line);
            } catch (e) {}
          }
          // Supprimer les waypoints markers
          if (routingControlRef.current._markers) {
            routingControlRef.current._markers.forEach((marker: any) => {
              try {
                if (mapRef.current) mapRef.current.removeLayer(marker);
              } catch (e) {}
            });
          }
          // Enfin supprimer le control de la map
          if (routingControlRef.current._map && mapRef.current) {
            mapRef.current.removeControl(routingControlRef.current);
          }
        } catch (e) {
          console.warn('⚠️ Erreur cleanup routingControl:', e);
        }
        routingControlRef.current = null;
      }

      // ✅ Nettoyer les markers
      markersRef.current.forEach(marker => {
        try {
          if (marker && mapRef.current) {
            marker.remove();
          }
        } catch (e) {
          console.warn('⚠️ Erreur cleanup marker:', e);
        }
      });
      markersRef.current = [];

      // ✅ Nettoyer le marker du chauffeur
      if (driverMarkerRef.current) {
        try {
          if (mapRef.current) {
            driverMarkerRef.current.remove();
          }
        } catch (e) {
          console.warn('⚠️ Erreur cleanup driverMarker:', e);
        }
        driverMarkerRef.current = null;
      }

      // ✅ Nettoyer le parcours
      if (driverPathRef.current) {
        try {
          if (mapRef.current) {
            mapRef.current.removeLayer(driverPathRef.current);
          }
        } catch (e) {
          console.warn('⚠️ Erreur cleanup driverPath:', e);
        }
        driverPathRef.current = null;
      }

      // ✅ Nettoyer la couche de tuiles
      if (tileLayerRef.current) {
        try {
          if (mapRef.current) {
            mapRef.current.removeLayer(tileLayerRef.current);
          }
        } catch (e) {
          console.warn('⚠️ Erreur cleanup tileLayer:', e);
        }
        tileLayerRef.current = null;
      }

      // ✅ Détruire la carte en DERNIER
      if (mapRef.current) {
        try {
          // Supprimer tous les layers restants
          mapRef.current.eachLayer((layer: any) => {
            try {
              mapRef.current?.removeLayer(layer);
            } catch (e) {}
          });
          // Détruire la map
          mapRef.current.remove();
        } catch (e) {
          console.warn('⚠️ Erreur cleanup map:', e);
        }
        mapRef.current = null;
      }

      console.log('✅ TourMap cleanup terminé');
    };
  }, []);

  return (
    <div style={{ position: 'relative', height }}>
      <div style={{ position: 'absolute', top: '10px', left: '60px', zIndex: 400 }}>
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
            overflow: 'hidden', minWidth: '200px',
            zIndex: 400
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

      {driverPath.length > 0 && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 1000,
          background: 'white', padding: '12px', borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          minWidth: '180px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <NavigationIcon size={16} style={{ color: '#3B82F6' }} />
            <div>
              <p style={{ margin: 0, fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>
                Parcours réel
              </p>
              <p style={{ margin: 0, fontSize: '18px', color: '#3B82F6', fontWeight: 700 }}>
                {pathDistance.toFixed(2)} km
              </p>
            </div>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#9CA3AF' }}>
            {driverPath.length} points enregistrés
          </p>
          <button
            onClick={clearDriverPath}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              background: '#FEE2E2',
              color: '#DC2626',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#FECACA'}
            onMouseOut={(e) => e.currentTarget.style.background = '#FEE2E2'}
          >
            <Trash2 size={14} />
            Effacer
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
            transform: translate(-50%, -50%) scale(1.4);
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
        
        .leaflet-control-zoom {
          z-index: 500 !important;
        }
        
        .leaflet-top, .leaflet-bottom {
          z-index: 500 !important;
        }
      `}</style>
    </div>
  );
}