// src/components/InventoryCounter.tsx
import { useState, useEffect, useMemo } from "react";
import { Dialog } from "@headlessui/react";
import { X, Plus, Search, Trash2, Save, Camera } from "lucide-react";
import { supabase } from "../supabaseClient";
import { toast } from "sonner";
import { Inventory, InventoryLine } from "../hooks/useOptimizedInventories";
import { useOptimizedInventories } from "../hooks/useOptimizedInventories";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inventory: Inventory;
  companyId: string;
}

interface StockItem {
  id: string;
  ean: string | null;
  name: string;
  quantity: number;
}

export default function InventoryCounter({
  isOpen,
  onClose,
  inventory,
  companyId,
}: Props) {
  const { addLine, updateLine, removeLine } = useOptimizedInventories(companyId);

  const [lines, setLines] = useState<InventoryLine[]>(inventory.lines || []);
  const [searchEAN, setSearchEAN] = useState("");
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Charger les lignes existantes
  useEffect(() => {
    if (inventory.id) {
      loadLines();
    }
  }, [inventory.id]);

  const loadLines = async () => {
    const { data, error } = await supabase
      .from("inventory_lines")
      .select("*")
      .eq("inventory_id", inventory.id)
      .order("counted_at", { ascending: false });

    if (!error && data) {
      setLines(data as InventoryLine[]);
    }
  };

  // Rechercher un produit par EAN
  const handleSearchEAN = async () => {
    if (!searchEAN.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("stocks")
        .select("id, ean, name, quantity")
        .eq("company_id", companyId)
        .or(`ean.ilike.%${searchEAN}%,name.ilike.%${searchEAN}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults((data as StockItem[]) || []);

      if (!data || data.length === 0) {
        toast.info("Aucun produit trouvé");
      }
    } catch (error) {
      console.error("Erreur recherche:", error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setIsSearching(false);
    }
  };

  // Ajouter un produit à l'inventaire
  const handleAddProduct = async (stock: StockItem) => {
    // Vérifier si déjà compté
    if (lines.find((l) => l.stock_id === stock.id)) {
      toast.warning("Ce produit est déjà dans l'inventaire");
      return;
    }

    try {
      const newLine = await addLine(inventory.id, {
        stock_id: stock.id,
        ean: stock.ean || undefined,
        name: stock.name,
        theoretical_quantity: stock.quantity,
        physical_quantity: 0,
        counted_by: undefined,
      });

      setLines((prev) => [newLine, ...prev]);
      setSearchEAN("");
      setSearchResults([]);
      toast.success("Produit ajouté");
    } catch (error) {
      // Erreur déjà gérée
    }
  };

  // Mettre à jour la quantité physique
  const handleUpdateQuantity = async (lineId: string, physicalQty: number) => {
    try {
      await updateLine(lineId, {
        physical_quantity: physicalQty,
      });

      setLines((prev) =>
        prev.map((line) =>
          line.id === lineId ? { ...line, physical_quantity: physicalQty } : line
        )
      );
    } catch (error) {
      // Erreur déjà gérée
    }
  };

  // Supprimer une ligne
  const handleRemoveLine = async (lineId: string) => {
    try {
      await removeLine(lineId);
      setLines((prev) => prev.filter((l) => l.id !== lineId));
    } catch (error) {
      // Erreur déjà gérée
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = lines.length;
    const counted = lines.filter((l) => l.physical_quantity > 0).length;
    const totalDifference = lines.reduce(
      (sum, l) => sum + ((l.difference as number) || 0),
      0
    );
    const precision =
      total > 0
        ? Math.round(
            (lines.filter((l) => l.difference === 0).length / total) * 100
          )
        : 100;

    return { total, counted, totalDifference, precision };
  }, [lines]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{inventory.name}</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Zone: {inventory.zone || "Toutes zones"} • Date:{" "}
                  {inventory.date}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm text-blue-100">Total produits</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm text-blue-100">Comptés</p>
                <p className="text-2xl font-bold">{stats.counted}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm text-blue-100">Écart total</p>
                <p
                  className={`text-2xl font-bold ${
                    stats.totalDifference > 0
                      ? "text-green-300"
                      : stats.totalDifference < 0
                      ? "text-red-300"
                      : ""
                  }`}
                >
                  {stats.totalDifference > 0 ? "+" : ""}
                  {stats.totalDifference}
                </p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm text-blue-100">Précision</p>
                <p className="text-2xl font-bold">{stats.precision}%</p>
              </div>
            </div>
          </div>

          {/* Recherche */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Scanner ou rechercher un produit (EAN, nom)..."
                  value={searchEAN}
                  onChange={(e) => setSearchEAN(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearchEAN()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white text-lg"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSearchEAN}
                disabled={isSearching}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {isSearching ? "..." : "Rechercher"}
              </button>
            </div>

            {/* Résultats de recherche */}
            {searchResults.length > 0 && (
              <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
                {searchResults.map((stock) => (
                  <div
                    key={stock.id}
                    className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {stock.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        EAN: {stock.ean || "N/A"} • Stock théorique:{" "}
                        {stock.quantity}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddProduct(stock)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Plus size={16} /> Ajouter
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tableau de comptage */}
          <div className="overflow-auto max-h-96 p-6">
            {lines.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Camera size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucun produit compté</p>
                <p className="text-sm mt-2">
                  Utilisez la recherche ci-dessus pour ajouter des produits
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      EAN
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Produit
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                      Théorique
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                      Physique
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                      Écart
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {lines.map((line) => {
                    const difference = (line.difference as number) || 0;

                    return (
                      <tr
                        key={line.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {line.ean || "-"}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {line.name}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                          {line.theoretical_quantity}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={line.physical_quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(
                                line.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center font-bold dark:bg-gray-900 dark:text-white"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full font-bold ${
                              difference > 0
                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                : difference < 0
                                ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {difference > 0 ? "+" : ""}
                            {difference}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoveLine(line.id)}
                            className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={onClose}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
            >
              <Save size={20} /> Enregistrer et Fermer
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}