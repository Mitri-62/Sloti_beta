// src/components/DockBookingForm.tsx - VERSION CORRIGÉE
import { useState } from 'react';
import { X, Calendar,Truck,Package } from 'lucide-react';
import { DockRow } from '../types/dock.types';
import { format } from 'date-fns';
import { useAvailableSlots } from '../hooks/useDockStats';

interface DockBookingFormProps {
  dock: DockRow;
  date?: Date;
  onSave: (data: any) => void;
  onClose: () => void;
}

export default function DockBookingForm({ dock, date, onSave, onClose }: DockBookingFormProps) {
  const [formData, setFormData] = useState({
    date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    slot_start: '08:00',
    slot_end: '10:00',
    type: 'loading' as 'loading' | 'unloading',
    transporter_name: '',
    vehicle_plate: '',
    driver_name: '',
    driver_phone: '',
    estimated_duration: 120,
    notes: ''
  });

  // ✅ CORRECTION : Gérer le cas où useAvailableSlots peut retourner undefined
  const slotsResult = useAvailableSlots(
    dock.id,
    formData.date,
    formData.estimated_duration
  );
  
  const slots = slotsResult?.slots || [];
  const slotsLoading = slotsResult?.loading || false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const slotStart = `${formData.date}T${formData.slot_start}:00Z`;
    const slotEnd = `${formData.date}T${formData.slot_end}:00Z`;

    onSave({
      slot_start: slotStart,
      slot_end: slotEnd,
      type: formData.type,
      transporter_name: formData.transporter_name,
      vehicle_plate: formData.vehicle_plate,
      driver_name: formData.driver_name,
      driver_phone: formData.driver_phone,
      estimated_duration: formData.estimated_duration,
      status: 'requested',
      notes: formData.notes
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nouvelle réservation</h2>
              <p className="text-sm text-gray-600 mt-1">
                {dock.name} - {dock.type === 'both' ? 'Chargement et Déchargement' : dock.type === 'loading' ? 'Chargement' : 'Déchargement'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* DATE & CRÉNEAUX */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Date et créneau horaire
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Début *
                </label>
                <input
                  type="time"
                  required
                  value={formData.slot_start}
                  onChange={(e) => setFormData({ ...formData, slot_start: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fin *
                </label>
                <input
                  type="time"
                  required
                  value={formData.slot_end}
                  onChange={(e) => setFormData({ ...formData, slot_end: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* CRÉNEAUX DISPONIBLES */}
            {!slotsLoading && slots.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Créneaux disponibles suggérés :
                </label>
                <div className="flex flex-wrap gap-2">
                  {slots.slice(0, 6).map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          slot_start: format(slot.slot_start, 'HH:mm'),
                          slot_end: format(slot.slot_end, 'HH:mm')
                        });
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      {format(slot.slot_start, 'HH:mm')} - {format(slot.slot_end, 'HH:mm')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TYPE D'OPÉRATION */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'opération *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'loading' })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.type === 'loading'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Package className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">Chargement</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'unloading' })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.type === 'unloading'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Package className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">Déchargement</div>
              </button>
            </div>
          </div>

          {/* TRANSPORTEUR */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-gray-600" />
              Informations transporteur
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du transporteur *
                </label>
                <input
                  type="text"
                  required
                  value={formData.transporter_name}
                  onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                  placeholder="Ex: Transport Express"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plaque d'immatriculation
                </label>
                <input
                  type="text"
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                  placeholder="Ex: AB-123-CD"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du chauffeur
                </label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  placeholder="Ex: Jean Dupont"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone chauffeur
                </label>
                <input
                  type="tel"
                  value={formData.driver_phone}
                  onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                  placeholder="Ex: 06 12 34 56 78"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* DURÉE ESTIMÉE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée estimée (minutes)
            </label>
            <input
              type="number"
              min="15"
              step="15"
              value={formData.estimated_duration}
              onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* NOTES */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes / Instructions
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informations complémentaires..."
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
              Créer la réservation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}