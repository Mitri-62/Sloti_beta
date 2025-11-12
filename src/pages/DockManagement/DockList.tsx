// src/pages/DockManagement/DockList.tsx - VERSION AVEC DARK MODE
import { useState } from 'react';
import { DockRow } from '../../types/dock.types';
import DockCard from '../../components/DockCard';
import { Search, Filter } from 'lucide-react';

interface DockListProps {
  docks: DockRow[];
  onEdit: (dock: DockRow) => void;
  onDelete: (dockId: string) => void;
}

export default function DockList({ docks, onEdit, onDelete }: DockListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredDocks = docks.filter(dock => {
    const matchesSearch = dock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dock.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || dock.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* FILTRES */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* RECHERCHE */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher un quai..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* FILTRE STATUT */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="available">Disponible</option>
              <option value="occupied">Occupé</option>
              <option value="maintenance">Maintenance</option>
              <option value="closed">Fermé</option>
            </select>
          </div>
        </div>

        {/* STATS RAPIDES */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{docks.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {docks.filter(d => d.status === 'available').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Disponibles</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {docks.filter(d => d.status === 'occupied').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Occupés</div>
          </div>
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {docks.filter(d => d.status === 'maintenance').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Maintenance</div>
          </div>
        </div>
      </div>

      {/* GRILLE DES QUAIS */}
      {filteredDocks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-gray-400 dark:text-gray-500 text-lg">Aucun quai trouvé</div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {searchQuery || statusFilter !== 'all'
              ? 'Essayez de modifier vos filtres'
              : 'Commencez par créer votre premier quai'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocks.map(dock => (
            <DockCard
              key={dock.id}
              dock={dock}
              onEdit={() => onEdit(dock)}
              onDelete={() => onDelete(dock.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}