import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import Warehouse3DView from '../components/Warehouse3DView';
import { Search, Filter, Download, Package, TrendingUp, AlertTriangle, Boxes } from "lucide-react";


type StockItem = {
  id: string;
  ean: string | null;
  name: string;
  type: string;
  quantity: number;
  lot?: string | null;
  expiration_date?: string | null;
  type_magasin_prenant?: string | null;
  emplacement_prenant?: string | null;
  designation?: string | null;
  emplacement_cedant?: string | null;
  ordre_transfert?: string | null;
  qte_theorique_prenant?: string | null;
  company_id: string;
  movement_name?: string;
};

export default function StockSynoptique() {
  const { user } = useAuth();
  const companyId = user?.company_id ?? null;

  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("Tous");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'table' | '3d'>('table');

  const loadStock = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("stocks")
        .select("*")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      if (data) setItems(data);
    } catch (err: any) {
      console.error("Erreur chargement stocks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [companyId]);

  // Filtrage
  const filteredItems = items.filter((item) => {
    const matchType = filterType === "Tous" || item.type === filterType;
    const searchLower = search.toLowerCase();
    const matchSearch =
      item.name?.toLowerCase().includes(searchLower) ||
      (item.ean || "").toLowerCase().includes(searchLower) ||
      item.movement_name?.toLowerCase().includes(searchLower) ||
      item.designation?.toLowerCase().includes(searchLower);

    return matchType && matchSearch;
  });

  // KPI
  const totalSkus = items.length;
  const totalDistinctArticles = new Set(items.map((i) => i.name)).size;
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  
  // Produits expirant bientôt (dans les 30 jours)
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = items.filter(item => {
    if (!item.expiration_date) return false;
    const expDate = new Date(item.expiration_date);
    return expDate >= today && expDate <= in30Days;
  }).length;

  // Types uniques
  const uniqueTypes = [...new Set(items.map(i => i.type))].filter(Boolean);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      alert("Aucune donnée à exporter");
      return;
    }

    const headers = [
      "EAN", "Article", "Type", "Quantité", "Lot", "DLC", 
      "Désignation", "Type Mag. Prenant", "Empl. Prenant", 
      "Empl. Cédant", "Ordre Transfert", "Qté Théor. Prenant", "Mouvement"
    ];

    const rows = filteredItems.map(item => [
      item.ean || "",
      item.name,
      item.type,
      item.quantity,
      item.lot || "",
      item.expiration_date || "",
      item.designation || "",
      item.type_magasin_prenant || "",
      item.emplacement_prenant || "",
      item.emplacement_cedant || "",
      item.ordre_transfert || "",
      item.qte_theorique_prenant || "",
      item.movement_name || "",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stock_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des stocks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="text-blue-600" size={28} />
              Vue Synoptique du Stock
            </h1>
            <p className="text-gray-600 mt-1">
              Gestion et suivi des stocks en temps réel
            </p>
          </div>
  
          {/* 🟩 Bouton pour changer de vue */}
          <button
            onClick={() => setView(view === "table" ? "3d" : "table")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Boxes size={18} />
            {view === "table" ? "Vue 3D" : "Vue Tableau"}
          </button>
        </div>
  
        {/* 🟩 Affichage conditionnel */}
        {view === "3d" ? (
          <div className="h-[600px] bg-white rounded-lg shadow-lg p-4">
            <Warehouse3DView items={filteredItems} />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">SKUs totaux</p>
                <p className="text-2xl font-bold text-gray-900">{totalSkus}</p>
              </div>
              <Package className="text-blue-500" size={32} />
            </div>
        </div>

          <div className="bg-white shadow rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Articles distincts</p>
                <p className="text-2xl font-bold text-gray-900">{totalDistinctArticles}</p>
              </div>
              <TrendingUp className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Quantité totale</p>
                <p className="text-2xl font-bold text-gray-900">{totalQuantity}</p>
              </div>
              <Package className="text-purple-500" size={32} />
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Expire bientôt</p>
                <p className="text-2xl font-bold text-gray-900">{expiringSoon}</p>
              </div>
              <AlertTriangle className="text-orange-500" size={32} />
            </div>
          </div>
        </div>

        {/* Filtres et Recherche */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par article, EAN, mouvement..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Bouton Filtres */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter size={20} />
              <span>Filtres</span>
              {filterType !== "Tous" && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  1
                </span>
              )}
            </button>

            {/* Bouton Export */}
            <button
              onClick={handleExportCSV}
              disabled={filteredItems.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={20} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>

          {/* Panel Filtres */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Tous">Tous les types</option>
                    {uniqueTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Résultats */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <p className="text-sm text-gray-600">
                {filteredItems.length} résultat
                {filteredItems.length > 1 ? "s" : ""}{" "}
                {search && ` pour "${search}"`}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">EAN</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Article</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Quantité</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Lot</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">DLC</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Désignation</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Empl. Prenant</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Mouvement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Aucun résultat trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-900">{item.ean || "-"}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-3 text-gray-600">{item.lot || "-"}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.expiration_date ? (
                            <span
                              className={
                                new Date(item.expiration_date) <= in30Days
                                  ? "text-orange-600 font-medium"
                                  : ""
                              }
                            >
                              {new Date(item.expiration_date).toLocaleDateString("fr-FR")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td
                          className="px-4 py-3 text-gray-600 max-w-xs truncate"
                          title={item.designation || ""}
                        >
                          {item.designation || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.emplacement_prenant || "-"}</td>
                        <td className="px-4 py-3">
                          {item.movement_name ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              {item.movement_name}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
);
}