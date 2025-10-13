// src/components/MasterDataTable.tsx
import { useState, useMemo } from "react";
import { Edit2, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square } from "lucide-react";

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface MasterDataTableProps {
  data: any[];
  columns: Column[];
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
  pageSize?: number;
}

export default function MasterDataTable({
  data,
  columns,
  onEdit,
  onDelete,
  selectedIds = new Set(),
  onSelect,
  sortConfig,
  onSort,
  pageSize = 10,
}: MasterDataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  // 🔎 Filtrage par recherche
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, data]);

  // 📄 Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const start = (currentPage - 1) * pageSize;
  const pageData = filteredData.slice(start, start + pageSize);

  // Réinitialiser la page si on change les filtres
  useMemo(() => {
    setCurrentPage(1);
  }, [search]);

  // Icône de tri
  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="text-gray-400 dark:text-gray-500" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" />
      : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Recherche */}
      <div className="relative w-64">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
        />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
            <tr>
              {/* Colonne de sélection */}
              {onSelect && (
                <th className="px-4 py-2 w-10">
                  {/* Header vide pour checkbox */}
                </th>
              )}

              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2 text-left font-semibold">
                  {col.sortable && onSort ? (
                    <button
                      onClick={() => onSort(col.key)}
                      className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {col.label}
                      {getSortIcon(col.key)}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}

              {(onEdit || onDelete) && (
                <th className="px-4 py-2 text-center">Actions</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onSelect ? 1 : 0) + (onEdit || onDelete ? 1 : 0)}
                  className="text-center py-6 text-gray-400 dark:text-gray-500"
                >
                  Aucun résultat
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => {
                const isSelected = selectedIds.has(row.id);
                
                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {/* Checkbox de sélection */}
                    {onSelect && (
                      <td className="px-4 py-2">
                        <button
                          onClick={() => onSelect(row.id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                          title={isSelected ? "Désélectionner" : "Sélectionner"}
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square size={18} className="text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      </td>
                    )}

                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-2 text-gray-900 dark:text-white">
                        {col.render ? col.render(row[col.key], row) : row[col.key] || "-"}
                      </td>
                    ))}

                    {(onEdit || onDelete) && (
                      <td className="px-4 py-2">
                        <div className="flex justify-center gap-2">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(row)}
                              className="p-1.5 rounded bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors"
                              title="Modifier"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(row)}
                              className="p-1.5 rounded bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-3">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Info pagination + sélection */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Affichage de {start + 1} à {Math.min(start + pageSize, filteredData.length)} sur {filteredData.length} résultat{filteredData.length > 1 ? 's' : ''}
        {selectedIds.size > 0 && ` • ${selectedIds.size} élément${selectedIds.size > 1 ? 's' : ''} sélectionné${selectedIds.size > 1 ? 's' : ''}`}
      </div>
    </div>
  );
}