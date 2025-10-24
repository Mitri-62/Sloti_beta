// src/components/DockCard.tsx
import { DockRow } from '../types/dock.types';
import { Edit2, Trash2, Truck, Package, Clock, MapPin } from 'lucide-react';

interface DockCardProps {
  dock: DockRow;
  onEdit: () => void;
  onDelete: () => void;
}

export default function DockCard({ dock, onEdit, onDelete }: DockCardProps) {
  const statusConfig = {
    available: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-800',
      label: 'Disponible'
    },
    occupied: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800',
      label: 'Occupé'
    },
    maintenance: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-800',
      label: 'Maintenance'
    },
    closed: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      badge: 'bg-gray-100 text-gray-800',
      label: 'Fermé'
    }
  };

  const config = statusConfig[dock.status];

  return (
    <div className={`${config.bg} rounded-lg border-2 border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200`}>
      {/* HEADER */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{dock.name}</h3>
            {dock.description && (
              <p className="text-sm text-gray-600 mt-1">{dock.description}</p>
            )}
          </div>
          
          <span className={`${config.badge} px-3 py-1 rounded-full text-xs font-medium`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-4 space-y-3">
        {/* TYPE */}
        <div className="flex items-center gap-2 text-sm">
          <Truck className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-700">Type:</span>
          <span className="text-gray-600 capitalize">{dock.type}</span>
        </div>

            {/* ZONE - ✅ Vérifier que zone existe avant de l'afficher */}
            {dock.zone && (
            <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-700">Zone:</span>
                <span className="text-gray-600">{dock.zone}</span>
            </div>
            )}

        {/* CAPACITÉ */}
        {dock.capacity && (
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-700">Capacité:</span>
            <span className="text-gray-600">{dock.capacity}</span>
          </div>
        )}

        {/* HORAIRES */}
        {dock.operating_hours_start && dock.operating_hours_end && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-700">Horaires:</span>
            <span className="text-gray-600">
              {dock.operating_hours_start} - {dock.operating_hours_end}
            </span>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Modifier
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}