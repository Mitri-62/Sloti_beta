// src/pages/DockManagement/DockManagement.tsx
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDocks } from '../../hooks/useDocks';
import { Plus, LayoutGrid, Calendar, BarChart3, Truck } from 'lucide-react';
import DockList from './DockList';
import DockPlanning from './DockPlanning';
import DockDashboard from './DockDashboard';
import DockCheckIn from './DockCheckIn';
import DockForm from '../../components/DockForm';

type ViewType = 'list' | 'planning' | 'dashboard' | 'checkin';

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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Quais</h1>
            <p className="text-sm text-gray-500 mt-1">
              {docks.length} quai{docks.length > 1 ? 's' : ''} configuré{docks.length > 1 ? 's' : ''}
            </p>
          </div>

          <button
            onClick={handleCreateDock}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau Quai
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setCurrentView('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentView === 'list'
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            Liste des Quais
          </button>

          <button
            onClick={() => setCurrentView('planning')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentView === 'planning'
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Planning
          </button>

          <button
            onClick={() => setCurrentView('checkin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentView === 'checkin'
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Truck className="w-5 h-5" />
            Check-in / Check-out
          </button>

          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentView === 'dashboard'
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Statistiques
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
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

            {currentView === 'planning' && (
              <DockPlanning docks={docks} companyId={user?.company_id} />
            )}

            {currentView === 'checkin' && (
              <DockCheckIn companyId={user?.company_id} />
            )}

            {currentView === 'dashboard' && (
              <DockDashboard companyId={user?.company_id} />
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