// src/components/DockAssignModal.tsx
import { useState, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Warehouse, AlertTriangle, CheckCircle, Clock, MapPin } from 'lucide-react';
import { format, parseISO, addMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';
import { useDocks } from '../hooks/useDocks';
import { useDockBookings } from '../hooks/useDockBookings';
import * as dockService from '../services/dockService';
import type { Planning } from '../hooks/useOptimizedPlannings';
import type { DockRow } from '../types/dock.types';

interface DockAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  planning: Planning;
  companyId: string;
  onSuccess: () => void;
}

export default function DockAssignModal({
  isOpen,
  onClose,
  planning,
  companyId,
  onSuccess
}: DockAssignModalProps) {
  const { docks, loading: docksLoading } = useDocks(companyId);
  const { bookings } = useDockBookings(companyId);
  
  const [selectedDock, setSelectedDock] = useState<DockRow | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Calculer les horaires du créneau basé sur le planning
  const slotStart = useMemo(() => {
    if (!planning.date || !planning.hour) return null;
    return `${planning.date}T${planning.hour}:00`;
  }, [planning.date, planning.hour]);

  const slotEnd = useMemo(() => {
    if (!slotStart) return null;
    const start = parseISO(slotStart);
    const end = addMinutes(start, planning.duration || 120);
    return format(end, "yyyy-MM-dd'T'HH:mm:ss");
  }, [slotStart, planning.duration]);

  // Filtrer les quais selon le type de planning
  const filteredDocks = useMemo(() => {
    return docks.filter(dock => {
      // Si Réception → docks 'unloading' ou 'both'
      if (planning.type === 'Réception') {
        return dock.type === 'unloading' || dock.type === 'both';
      }
      // Si Expédition → docks 'loading' ou 'both'
      if (planning.type === 'Expédition') {
        return dock.type === 'loading' || dock.type === 'both';
      }
      return true;
    });
  }, [docks, planning.type]);

  // Vérifier la disponibilité du quai sélectionné
  useEffect(() => {
    if (!selectedDock || !slotStart || !slotEnd) {
      setAvailabilityStatus(null);
      return;
    }

    const checkAvailability = async () => {
      setCheckingAvailability(true);
      try {
        const result = await dockService.checkDockAvailability(
          selectedDock.id,
          slotStart,
          slotEnd
        );
        
        setAvailabilityStatus({
          available: result.is_available,
          reason: result.reason
        });
      } catch (error) {
        console.error('Erreur vérification disponibilité:', error);
        setAvailabilityStatus({
          available: false,
          reason: 'Erreur lors de la vérification'
        });
      } finally {
        setCheckingAvailability(false);
      }
    };

    checkAvailability();
  }, [selectedDock, slotStart, slotEnd]);

  // Compter les réservations existantes par quai pour ce créneau
  const dockOccupancy = useMemo(() => {
    const occupancy: Record<string, number> = {};
    
    if (!slotStart || !slotEnd) return occupancy;
    
    const start = parseISO(slotStart);
    const end = parseISO(slotEnd);
    
    bookings.forEach(booking => {
      const bookingStart = parseISO(booking.slot_start);
      const bookingEnd = parseISO(booking.slot_end);
      
      // Vérifier si le créneau chevauche
      const overlaps = bookingStart < end && bookingEnd > start;
      
      if (overlaps && booking.status !== 'cancelled' && booking.status !== 'no_show') {
        occupancy[booking.dock_id] = (occupancy[booking.dock_id] || 0) + 1;
      }
    });
    
    return occupancy;
  }, [bookings, slotStart, slotEnd]);

  const handleAssign = async () => {
    if (!selectedDock || !slotStart || !slotEnd) {
      toast.error('Veuillez sélectionner un quai');
      return;
    }

    if (!availabilityStatus?.available) {
      toast.error('Ce quai n\'est pas disponible pour ce créneau');
      return;
    }

    setSaving(true);
    try {
      // ✅ Type de réservation basé sur le type de planning
      const bookingType: 'loading' | 'unloading' = 
        planning.type === 'Réception' ? 'unloading' : 'loading';
      
      const bookingData = {
        company_id: companyId,
        dock_id: selectedDock.id,
        slot_start: slotStart,
        slot_end: slotEnd,
        type: bookingType,
        transporter_name: planning.transporter,
        status: 'confirmed' as const,
        notes: planning.products || undefined,
      };

      // Créer la réservation de quai
      const newBooking = await dockService.createDockBooking(bookingData);
      console.log('✅ Réservation créée:', newBooking.id);

      // ✅ Mettre à jour le planning directement avec supabase
      const { error: updateError } = await supabase
        .from('plannings')
        .update({ dock_booking_id: newBooking.id })
        .eq('id', planning.id);

      if (updateError) {
        console.error('Erreur mise à jour planning:', updateError);
        throw updateError;
      }

      console.log('✅ Planning mis à jour avec dock_booking_id:', newBooking.id);

      toast.success(`${selectedDock.name} assigné avec succès`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur assignation quai:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl shadow-2xl">
          {/* HEADER */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                Assigner un quai
              </Dialog.Title>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {planning.type} - {planning.transporter}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* INFOS PLANNING */}
          <div className="p-6 bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Date</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {format(parseISO(planning.date), 'dd/MM/yyyy', { locale: fr })}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Horaire</span>
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {planning.hour} ({planning.duration || 120} min)
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Type</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {planning.type}
                </p>
              </div>
            </div>
          </div>

          {/* LISTE DES QUAIS */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {docksLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Chargement des quais...</p>
              </div>
            ) : filteredDocks.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  Aucun quai compatible avec ce type d'opération
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocks.map(dock => {
                  const isSelected = selectedDock?.id === dock.id;
                  const occupancy = dockOccupancy[dock.id] || 0;
                  const isOccupied = occupancy > 0;
                  
                  const statusColors = {
                    available: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
                    occupied: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
                    maintenance: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
                    closed: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                  };

                  const canSelect = dock.status === 'available' && !isOccupied;

                  return (
                    <button
                      key={dock.id}
                      onClick={() => canSelect && setSelectedDock(dock)}
                      disabled={!canSelect}
                      className={`
                        w-full p-4 rounded-lg border-2 transition-all text-left
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                        ${!canSelect && 'opacity-50 cursor-not-allowed'}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Warehouse className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            <span className="font-bold text-gray-900 dark:text-white">{dock.name}</span>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="capitalize">{dock.type}</span>
                            {dock.zone && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {dock.zone}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[dock.status]}`}>
                            {dock.status === 'available' ? 'Disponible' : 
                             dock.status === 'occupied' ? 'Occupé' :
                             dock.status === 'maintenance' ? 'Maintenance' : 'Fermé'}
                          </span>
                          {isOccupied && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              {occupancy} conflit{occupancy > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* STATUT DISPONIBILITÉ */}
          {selectedDock && (
            <div className="px-6 pb-4">
              {checkingAvailability ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Vérification de la disponibilité...
                </div>
              ) : availabilityStatus ? (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  availabilityStatus.available 
                    ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' 
                    : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                }`}>
                  {availabilityStatus.available ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium">
                    {availabilityStatus.available 
                      ? 'Ce quai est disponible pour ce créneau'
                      : availabilityStatus.reason || 'Ce quai n\'est pas disponible'}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* FOOTER */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedDock || !availabilityStatus?.available || saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Assignation...' : 'Assigner ce quai'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}