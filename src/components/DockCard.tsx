// src/components/DockCard.tsx - AVEC DARK MODE
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
      bg: 'bg-green-50 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      badge: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      label: 'Disponible'
    },
    occupied: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      label: 'Occupé'
    },
    maintenance: {
      bg: 'bg-orange-50 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
      badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
      label: 'Maintenance'
    },
    closed: {
      bg: 'bg-gray-50 dark:bg-gray-700',
      text: 'text-gray-700 dark:text-gray-400',
      badge: 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-600',
      label: 'Fermé'
    }
  };

  const config = statusConfig[dock.status];

  return (
    <div className={`${config.bg} rounded-lg border-2 ${config.border} overflow-hidden hover:shadow-lg transition-all duration-200`}>
      {/* HEADER */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{dock.name}</h3>
            {dock.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{dock.description}</p>
            )}
          </div>
          
          <span className={`${config.badge} px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-4 space-y-3">
        {/* TYPE */}
        <div className="flex items-center gap-2 text-sm">
          <Truck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
          <span className="text-gray-600 dark:text-gray-400 capitalize">{dock.type}</span>
        </div>

        {/* ZONE */}
        {dock.zone && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Zone:</span>
            <span className="text-gray-600 dark:text-gray-400">{dock.zone}</span>
          </div>
        )}

        {/* CAPACITÉ */}
        {dock.capacity && (
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Capacité:</span>
            <span className="text-gray-600 dark:text-gray-400">{dock.capacity}</span>
          </div>
        )}

        {/* HORAIRES */}
        {dock.operating_hours_start && dock.operating_hours_end && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Horaires:</span>
            <span className="text-gray-600 dark:text-gray-400">
              {dock.operating_hours_start} - {dock.operating_hours_end}
            </span>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Modifier
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}