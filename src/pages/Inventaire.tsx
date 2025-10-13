// src/pages/Inventaire.tsx
import { useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useOptimizedInventories, Inventory } from "../hooks/useOptimizedInventories";
import {
  Package,
  Plus,
  Search,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Trash2,
  Eye,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog } from "@headlessui/react";
import { toast } from "sonner";
import InventoryCounter from "../components/InventoryCounter";

export default function Inventaire() {
  const { user } = useAuth();
  const companyId = user?.company_id ?? null;

  const { inventories, loading, create, update, remove, validate } =
    useOptimizedInventories(companyId, {
      includeLines: true,
      enableRealtime: true,
    });

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [showCounterModal, setShowCounterModal] = useState(false);

  const [newInventory, setNewInventory] = useState({
    name: "",
    date: format(new Date(), "yyyy-MM-dd"),
    zone: "",
    notes: "",
  });

  // Filtres
  const filteredInventories = useMemo(() => {
    return inventories.filter((inv) => {
      const matchStatus = filterStatus === "all" || inv.status === filterStatus;
      const matchSearch =
        inv.name.toLowerCase().includes(search.toLowerCase()) ||
        inv.zone?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [inventories, filterStatus, search]);

  // Statistiques
  const stats = useMemo(() => {
    const inProgress = inventories.filter((i) => i.status === "in_progress").length;
    const completed = inventories.filter((i) => i.status === "completed").length;
    const validated = inventories.filter((i) => i.status === "validated").length;

    return { inProgress, completed, validated, total: inventories.length };
  }, [inventories]);

  // Créer un inventaire
  const handleCreate = async () => {
    if (!newInventory.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    try {
      await create({
        name: newInventory.name,
        date: newInventory.date,
        zone: newInventory.zone || undefined,
        notes: newInventory.notes || undefined,
        status: "in_progress",
        created_by: user?.id,
      });

      setShowCreateModal(false);
      setNewInventory({
        name: "",
        date: format(new Date(), "yyyy-MM-dd"),
        zone: "",
        notes: "",
      });
    } catch (error) {
      // Erreur déjà gérée par le hook
    }
  };

  // Supprimer un inventaire
  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet inventaire ?")) return;

    try {
      await remove(id);
    } catch (error) {
      // Erreur déjà gérée
    }
  };

  // Terminer un inventaire
  const handleComplete = async (id: string) => {
    try {
      await update(id, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      // Erreur déjà gérée
    }
  };

  // Valider un inventaire (ajuster les stocks)
  const handleValidate = async (id: string) => {
    if (
      !confirm(
        "Valider cet inventaire ajustera définitivement les stocks. Continuer ?"
      )
    )
      return;

    try {
      await validate(id);
    } catch (error) {
      // Erreur déjà gérée
    }
  };

  // Export CSV
  const handleExportCSV = (inventory: Inventory) => {
    if (!inventory.lines || inventory.lines.length === 0) {
      toast.error("Aucune ligne à exporter");
      return;
    }

    const headers = [
      "EAN",
      "Produit",
      "Qté Théorique",
      "Qté Physique",
      "Écart",
      "Notes",
    ];

    const rows = inventory.lines.map((line) => [
      line.ean || "",
      line.name,
      line.theoretical_quantity,
      line.physical_quantity,
      line.difference || 0,
      line.notes || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventaire_${inventory.name}_${inventory.date}.csv`;
    link.click();
    toast.success("Export CSV réussi");
  };

  // Calculer les stats d'un inventaire
  const getInventoryStats = (inventory: Inventory) => {
    const lines = inventory.lines || [];
    const total = lines.length;
    const positiveGaps = lines.filter((l) => (l.difference || 0) > 0).length;
    const negativeGaps = lines.filter((l) => (l.difference || 0) < 0).length;
    const perfect = lines.filter((l) => l.difference === 0).length;
    const precision = total > 0 ? Math.round((perfect / total) * 100) : 100;

    return { total, positiveGaps, negativeGaps, perfect, precision };
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      in_progress: (
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium flex items-center gap-1">
          <Clock size={14} /> En cours
        </span>
      ),
      completed: (
        <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium flex items-center gap-1">
          <AlertCircle size={14} /> Terminé
        </span>
      ),
      validated: (
        <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs font-medium flex items-center gap-1">
          <CheckCircle size={14} /> Validé
        </span>
      ),
    };
    return badges[status as keyof typeof badges] || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Chargement des inventaires...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              Inventaires
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez vos inventaires physiques et ajustez les stocks
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" /> Nouvel Inventaire
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Total
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
              <Package className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  En cours
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.inProgress}
                </p>
              </div>
              <Clock className="text-orange-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Terminés
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.completed}
                </p>
              </div>
              <AlertCircle className="text-yellow-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Validés
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.validated}
                </p>
              </div>
              <CheckCircle className="text-green-500" size={32} />
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Rechercher par nom ou zone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminés</option>
              <option value="validated">Validés</option>
            </select>
          </div>
        </div>

        {/* Liste des inventaires */}
        {filteredInventories.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
              Aucun inventaire
            </p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Créez votre premier inventaire pour commencer
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Créer un inventaire
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInventories.map((inventory) => {
              const inventoryStats = getInventoryStats(inventory);

              return (
                <div
                  key={inventory.id}
                  className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    {/* Info principale */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <FileText className="text-blue-600 mt-1" size={24} />
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {inventory.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {format(
                                new Date(inventory.date),
                                "dd MMMM yyyy",
                                { locale: fr }
                              )}
                            </span>
                            {inventory.zone && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {inventory.zone}
                              </span>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(inventory.status)}
                      </div>

                      {/* Statistiques */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">
                            Produits
                          </p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {inventoryStats.total}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">
                            Écarts +
                          </p>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            {inventoryStats.positiveGaps}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">
                            Écarts -
                          </p>
                          <p className="font-bold text-red-600 dark:text-red-400">
                            {inventoryStats.negativeGaps}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">
                            Précision
                          </p>
                          <p className="font-bold text-blue-600 dark:text-blue-400">
                            {inventoryStats.precision}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 lg:w-48">
                      {inventory.status === "in_progress" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedInventory(inventory);
                              setShowCounterModal(true);
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <Eye size={16} /> Compter
                          </button>
                          <button
                            onClick={() => handleComplete(inventory.id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            <CheckCircle size={16} /> Terminer
                          </button>
                        </>
                      )}

                      {inventory.status === "completed" && (
                        <button
                          onClick={() => handleValidate(inventory.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          <CheckCircle size={16} /> Valider
                        </button>
                      )}

                      <button
                        onClick={() => handleExportCSV(inventory)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                      >
                        <Download size={16} /> Export
                      </button>

                      {inventory.status !== "validated" && (
                        <button
                          onClick={() => handleDelete(inventory.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors text-sm font-medium"
                        >
                          <Trash2 size={16} /> Supprimer
                        </button>
                      )}
                    </div>
                  </div>

                  {inventory.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 italic">
                      {inventory.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Création */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Nouvel Inventaire
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={newInventory.name}
                  onChange={(e) =>
                    setNewInventory({ ...newInventory, name: e.target.value })
                  }
                  placeholder="Ex: Inventaire Octobre 2025"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newInventory.date}
                  onChange={(e) =>
                    setNewInventory({ ...newInventory, date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Zone (optionnel)
                </label>
                <input
                  type="text"
                  value={newInventory.zone}
                  onChange={(e) =>
                    setNewInventory({ ...newInventory, zone: e.target.value })
                  }
                  placeholder="Ex: Entrepôt A"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optionnel)
                </label>
                <textarea
                  value={newInventory.notes}
                  onChange={(e) =>
                    setNewInventory({ ...newInventory, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreate}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium"
              >
                Créer
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Annuler
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal Comptage */}
      {selectedInventory && (
        <InventoryCounter
          isOpen={showCounterModal}
          onClose={() => {
            setShowCounterModal(false);
            setSelectedInventory(null);
          }}
          inventory={selectedInventory}
          companyId={companyId || ""}
        />
      )}
    </div>
  );
}