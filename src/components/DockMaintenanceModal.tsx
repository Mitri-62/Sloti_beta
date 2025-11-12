// src/components/DockMaintenanceModal.tsx
import { useState,} from 'react';
import { X, Calendar, Euro, User, FileText, AlertTriangle } from 'lucide-react';
import type { DockRow } from '../types/dock.types';

interface DockMaintenanceModalProps {
  dock: DockRow;
  onSave: (maintenanceData: MaintenanceData) => void;
  onClose: () => void;
}

interface MaintenanceData {
  maintenance_reason: string;
  maintenance_start_date: string;
  maintenance_end_date: string;
  maintenance_cost: number | null;
  maintenance_technician: string;
  maintenance_notes: string;
}

export default function DockMaintenanceModal({ dock, onSave, onClose }: DockMaintenanceModalProps) {
  const [formData, setFormData] = useState<MaintenanceData>({
    maintenance_reason: dock.maintenance_reason ?? '',
    maintenance_start_date: dock.maintenance_start_date ?? new Date().toISOString().split('T')[0],
    maintenance_end_date: dock.maintenance_end_date ?? '',
    maintenance_cost: dock.maintenance_cost ?? null,
    maintenance_technician: dock.maintenance_technician ?? '',
    maintenance_notes: dock.maintenance_notes ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof MaintenanceData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.maintenance_reason.trim()) {
      newErrors.maintenance_reason = 'La raison est obligatoire';
    }

    if (!formData.maintenance_start_date) {
      newErrors.maintenance_start_date = 'La date de début est obligatoire';
    }

    if (!formData.maintenance_end_date) {
      newErrors.maintenance_end_date = 'La date de fin est obligatoire';
    }

    if (formData.maintenance_start_date && formData.maintenance_end_date) {
      if (new Date(formData.maintenance_end_date) < new Date(formData.maintenance_start_date)) {
        newErrors.maintenance_end_date = 'La date de fin doit être après la date de début';
      }
    }

    if (formData.maintenance_cost !== null && formData.maintenance_cost < 0) {
      newErrors.maintenance_cost = 'Le coût ne peut pas être négatif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSave(formData);
    }
  };

  // Calculer la durée
  const calculateDuration = () => {
    if (formData.maintenance_start_date && formData.maintenance_end_date) {
      const start = new Date(formData.maintenance_start_date);
      const end = new Date(formData.maintenance_end_date);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays + 1 : 0;
    }
    return 0;
  };

  const duration = calculateDuration();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Gérer la maintenance
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {dock.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* RAISON */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Raison de la maintenance <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.maintenance_reason}
              onChange={(e) => handleChange('maintenance_reason', e.target.value)}
              placeholder="Ex: Réparation porte automatique"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                errors.maintenance_reason 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.maintenance_reason && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.maintenance_reason}</p>
            )}
          </div>

          {/* DATES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date de début */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date de début <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.maintenance_start_date}
                onChange={(e) => handleChange('maintenance_start_date', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.maintenance_start_date 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.maintenance_start_date && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.maintenance_start_date}</p>
              )}
            </div>

            {/* Date de fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date de fin prévue <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.maintenance_end_date}
                onChange={(e) => handleChange('maintenance_end_date', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.maintenance_end_date 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.maintenance_end_date && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.maintenance_end_date}</p>
              )}
            </div>
          </div>

          {/* Durée calculée */}
          {duration > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                📅 Durée totale: <span className="font-semibold">{duration} jour{duration > 1 ? 's' : ''}</span>
              </p>
            </div>
          )}

          {/* COÛT ET TECHNICIEN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coût */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Euro className="w-4 h-4 inline mr-1" />
                Coût estimé (€)
              </label>
              <input
                type="number"
                value={formData.maintenance_cost || ''}
                onChange={(e) => handleChange('maintenance_cost', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Ex: 1500"
                min="0"
                step="0.01"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                  errors.maintenance_cost 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.maintenance_cost && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.maintenance_cost}</p>
              )}
            </div>

            {/* Technicien */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Technicien assigné
              </label>
              <input
                type="text"
                value={formData.maintenance_technician}
                onChange={(e) => handleChange('maintenance_technician', e.target.value)}
                placeholder="Ex: Jean Dupont"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* NOTES */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes détaillées
            </label>
            <textarea
              value={formData.maintenance_notes}
              onChange={(e) => handleChange('maintenance_notes', e.target.value)}
              placeholder="Détails sur l'intervention, pièces à commander, prochains contrôles recommandés..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ces notes seront visibles par toute l'équipe
            </p>
          </div>

          {/* ALERTE */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-300 mb-1">
                  Important
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-400">
                  Le quai restera indisponible pour les réservations pendant toute la durée de la maintenance. 
                  Pensez à le réactiver une fois les travaux terminés.
                </p>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-md"
            >
              Enregistrer la maintenance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}