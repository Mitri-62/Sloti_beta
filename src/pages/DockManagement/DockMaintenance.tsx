// src/pages/DockManagement/DockMaintenance.tsx - VERSION AMÉLIORÉE
import { useState } from 'react';
import { 
  Wrench, 
  CheckCircle, 
  Calendar, 
  AlertTriangle,
  Play,
  Package,
  MapPin,
  Clock,
  Euro,
  FileText,
  Edit2,
} from 'lucide-react';
import type { DockRow } from '../../types/dock.types';
import DockMaintenanceModal from '../../components/DockMaintenanceModal';

interface DockMaintenanceProps {
  docks: DockRow[];
  allDocks: DockRow[];
  onEdit: (dock: DockRow) => void;
  onStatusChange: (dockId: string, newStatus: 'available' | 'occupied' | 'maintenance' | 'closed') => void;
  onUpdateMaintenance: (dockId: string, maintenanceData: any) => void;
}

export default function DockMaintenance({ 
  docks, 
  allDocks,
  onStatusChange,
  onUpdateMaintenance
}: DockMaintenanceProps) {
  const [selectedDock,] = useState<string | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [editingDock, setEditingDock] = useState<DockRow | null>(null);

  const handleReactivate = (dock: DockRow) => {
    if (confirm(`Réactiver le quai ${dock.name} ?`)) {
      onStatusChange(dock.id, 'available');
    }
  };

  const handlePlanMaintenance = (dock: DockRow) => {
    setEditingDock(dock);
    setShowMaintenanceModal(true);
  };

  const handleSaveMaintenance = (maintenanceData: any) => {
    if (editingDock) {
      onUpdateMaintenance(editingDock.id, maintenanceData);
    }
    setShowMaintenanceModal(false);
    setEditingDock(null);
  };

  // Calculer le nombre de jours restants
  const getDaysRemaining = (endDate: string | null | undefined): number | null => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalDocks = allDocks.length;
  const maintenanceCount = docks.length;
  const maintenancePercentage = totalDocks > 0 ? Math.round((maintenanceCount / totalDocks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quais en maintenance</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                {maintenanceCount}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Wrench className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {maintenancePercentage}% du total des quais
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quais disponibles</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {allDocks.filter(d => d.status === 'available').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Opérationnels et prêts
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total des quais</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalDocks}
              </p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Package className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Configurés dans le système
          </p>
        </div>
      </div>

      {/* LISTE DES QUAIS EN MAINTENANCE */}
      {maintenanceCount === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Aucun quai en maintenance
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Tous les quais sont opérationnels ! 🎉
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Quais nécessitant une intervention
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Cliquez sur un quai pour voir les détails et gérer la maintenance
            </p>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {docks.map((dock) => {
              const daysRemaining = getDaysRemaining(dock.maintenance_end_date);
              const isOverdue = daysRemaining !== null && daysRemaining < 0;
              const isEndingSoon = daysRemaining !== null && daysRemaining <= 2 && daysRemaining >= 0;

              return (
                <div
                  key={dock.id}
                  className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedDock === dock.id ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Icon */}
                      <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
                        <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>

                      {/* Info principale */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {dock.name}
                          </h3>
                          <span className="px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-full">
                            EN MAINTENANCE
                          </span>
                          {isOverdue && (
                            <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded-full">
                              EN RETARD
                            </span>
                          )}
                          {isEndingSoon && (
                            <span className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-semibold rounded-full">
                              FIN PROCHE
                            </span>
                          )}
                        </div>

                        {/* Raison de la maintenance */}
                        {dock.maintenance_reason && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              📋 {dock.maintenance_reason}
                            </p>
                          </div>
                        )}

                        {/* Détails de la maintenance */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {/* Dates */}
                          {dock.maintenance_start_date && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Début: </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {new Date(dock.maintenance_start_date).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>
                          )}

                          {dock.maintenance_end_date && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Fin prévue: </span>
                                <span className={`font-medium ${
                                  isOverdue 
                                    ? 'text-red-600 dark:text-red-400' 
                                    : isEndingSoon 
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {new Date(dock.maintenance_end_date).toLocaleDateString('fr-FR')}
                                  {daysRemaining !== null && (
                                    <span className="ml-1">
                                      ({isOverdue ? `+${Math.abs(daysRemaining)}j` : `J-${daysRemaining}`})
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Coût */}
                          {dock.maintenance_cost && (
                            <div className="flex items-center gap-2 text-sm">
                              <Euro className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Coût estimé: </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {dock.maintenance_cost.toLocaleString('fr-FR')} €
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Technicien */}
                          {dock.maintenance_technician && (
                            <div className="flex items-center gap-2 text-sm">
                              <Package className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Technicien: </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {dock.maintenance_technician}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {dock.maintenance_notes && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Notes de maintenance:
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                  {dock.maintenance_notes}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Infos du quai */}
                        <div className="flex flex-wrap gap-4 text-sm mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {dock.type && (
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                              <Package className="w-4 h-4" />
                              <span className="capitalize">{dock.type}</span>
                            </div>
                          )}
                          
                          {dock.zone && (
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                              <MapPin className="w-4 h-4" />
                              <span>Zone {dock.zone}</span>
                            </div>
                          )}
                          
                          {dock.operating_hours_start && dock.operating_hours_end && (
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                              <Clock className="w-4 h-4" />
                              <span>{dock.operating_hours_start} - {dock.operating_hours_end}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlanMaintenance(dock);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Éditer
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactivate(dock);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Réactiver
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INFO BOX */}
      {maintenanceCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                Gestion de la maintenance
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                Les quais en maintenance ne peuvent pas recevoir de nouvelles réservations. 
                Pensez à les réactiver dès que les travaux sont terminés pour optimiser votre capacité d'accueil.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MAINTENANCE */}
      {showMaintenanceModal && editingDock && (
        <DockMaintenanceModal
          dock={editingDock}
          onSave={handleSaveMaintenance}
          onClose={() => {
            setShowMaintenanceModal(false);
            setEditingDock(null);
          }}
        />
      )}
    </div>
  );
}