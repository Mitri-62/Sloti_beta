import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { CheckCircle, Navigation } from 'lucide-react';

interface Stop {
  id: string;
  customer_name: string;
  address: string;
  latitude: number;
  longitude: number;
  sequence_order: number;
  status: string;
}

interface TourMapProps {
  stops: Stop[];
  showRoute?: boolean;
  onStopClick?: (stop: Stop) => void;
  height?: string;
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

export default function TourMap({ stops, showRoute = true, onStopClick, height = '600px' }: TourMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routingControlRef = useRef<any>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

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
        setSelectedStop(stop);
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

  // Gérer l'itinéraire
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
          { color: '#3B82F6', opacity: 0.8, weight: 5 }
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      createMarker: () => null, // Ne pas créer de markers (on a déjà les nôtres)
      show: false, // Masquer le panneau d'instructions
    }).addTo(mapRef.current);

    // Masquer le conteneur d'instructions
    const container = routingControlRef.current.getContainer();
    if (container) {
      container.style.display = 'none';
    }

  }, [stops, showRoute]);

  return (
    <div style={{ position: 'relative', height }}>
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