// src/components/DockForm.tsx
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DockRow } from '../types/dock.types';

interface DockFormProps {
  dock?: DockRow | null;
  onSave: (data: any) => void;
  onClose: () => void;
}

export default function DockForm({ dock, onSave, onClose }: DockFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'loading' as 'loading' | 'unloading' | 'both',
    zone: '',
    description: '',
    capacity: '',
    status: 'available' as 'available' | 'occupied' | 'maintenance' | 'closed',
    operating_hours_start: '08:00',
    operating_hours_end: '18:00'
  });

  useEffect(() => {
    if (dock) {
      setFormData({
        name: dock.name,
        type: dock.type,
        zone: dock.zone || '',
        description: dock.description || '',
        capacity: dock.capacity || '',
        status: dock.status,
        operating_hours_start: dock.operating_hours_start || '08:00',
        operating_hours_end: dock.operating_hours_end || '18:00'
      });
    }
  }, [dock]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {dock ? 'Modifier le quai' : 'Nouveau quai'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* NOM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du quai *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Quai 1, Quai A, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* TYPE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de quai *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="loading">Chargement uniquement</option>
              <option value="unloading">Déchargement uniquement</option>
              <option value="both">Chargement et Déchargement</option>
            </select>
          </div>

          {/* ZONE & CAPACITÉ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zone
              </label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                placeholder="Ex: Zone A, Extérieur, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacité
              </label>
              <input
                type="text"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="Ex: 1 camion, 33 palettes"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* HORAIRES */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Heure d'ouverture
              </label>
              <input
                type="time"
                value={formData.operating_hours_start}
                onChange={(e) => setFormData({ ...formData, operating_hours_start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Heure de fermeture
              </label>
              <input
                type="time"
                value={formData.operating_hours_end}
                onChange={(e) => setFormData({ ...formData, operating_hours_end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* STATUT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="available">Disponible</option>
              <option value="occupied">Occupé</option>
              <option value="maintenance">En maintenance</option>
              <option value="closed">Fermé</option>
            </select>
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Informations complémentaires sur le quai..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {dock ? 'Mettre à jour' : 'Créer le quai'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}