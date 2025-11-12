// src/pages/DockManagement/DockManagement.tsx - VERSION COMPLÈTE AVEC MAINTENANCE
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDocks } from '../../hooks/useDocks';
import { Plus, LayoutGrid, Wrench } from 'lucide-react';
import DockList from './DockList';
import DockMaintenance from './DockMaintenance';
import DockForm from '../../components/DockForm';

type ViewType = 'list' | 'maintenance';

export default function DockManagement() {
  const { user } = useAuth();
  const { docks, loading, create, update, remove } = useDocks(user?.company_id);
  
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [showDockForm, setShowDockForm] = useState(false);
  const [editingDock, setEditingDock] = useState<any>(null);

  const handleCreateDock = () => {
    setEditingDock(null);
    setShowDockForm(true);
  };

  const handleEditDock = (dock: any) => {
    setEditingDock(dock);
    setShowDockForm(true);
  };

  const handleSaveDock = async (dockData: any) => {
    if (editingDock) {
      await update({ id: editingDock.id, ...dockData });
    } else {
      await create({ ...dockData, company_id: user!.company_id });
    }
    setShowDockForm(false);
    setEditingDock(null);
  };

  const handleDeleteDock = async (dockId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce quai ?')) {
      await remove(dockId);
    }
  };

  // ✅ NOUVEAU : Gérer les mises à jour de maintenance
  const handleUpdateMaintenance = async (dockId: string, maintenanceData: any) => {
    await update({ 
      id: dockId, 
      ...maintenanceData 
    });
  };

  // Stats simples pour l'en-tête
  const availableDocks = docks.filter(d => d.status === 'available').length;
  const maintenanceDocks = docks.filter(d => d.status === 'maintenance').length;
  const occupiedDocks = docks.filter(d => d.status === 'occupied').length;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* HEADER */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Quais</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {docks.length} quai{docks.length > 1 ? 's' : ''} • {availableDocks} disponible{availableDocks > 1 ? 's' : ''} • {maintenanceDocks} en maintenance • {occupiedDocks} occupé{occupiedDocks > 1 ? 's' : ''}
            </p>
          </div>

          <button
            onClick={handleCreateDock}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            Nouveau Quai
          </button>
        </div>

        {/* NAVIGATION TABS - SIMPLIFIÉ */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setCurrentView('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
              currentView === 'list'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            Liste des Quais
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              currentView === 'list' 
                ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300' 
                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}>
              {docks.length}
            </span>
          </button>

          <button
            onClick={() => setCurrentView('maintenance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
              currentView === 'maintenance'
                ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Wrench className="w-5 h-5" />
            Quais en Maintenance
            {maintenanceDocks > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                currentView === 'maintenance' 
                  ? 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300' 
                  : 'bg-orange-200 dark:bg-orange-600 text-orange-700 dark:text-orange-300'
              }`}>
                {maintenanceDocks}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
            </div>
          </div>
        ) : (
          <>
            {currentView === 'list' && (
              <DockList
                docks={docks}
                onEdit={handleEditDock}
                onDelete={handleDeleteDock}
              />
            )}

            {currentView === 'maintenance' && (
              <DockMaintenance
                docks={docks.filter(d => d.status === 'maintenance')}
                allDocks={docks}
                onEdit={handleEditDock}
                onStatusChange={async (dockId, newStatus) => {
                  await update({ id: dockId, status: newStatus });
                }}
                onUpdateMaintenance={handleUpdateMaintenance}  // ✅ AJOUTÉ
              />
            )}
          </>
        )}
      </div>

      {/* MODAL FORMULAIRE QUAI */}
      {showDockForm && (
        <DockForm
          dock={editingDock}
          onSave={handleSaveDock}
          onClose={() => {
            setShowDockForm(false);
            setEditingDock(null);
          }}
        />
      )}
    </div>
  );
}