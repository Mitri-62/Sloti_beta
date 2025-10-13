// src/pages/MasterData.tsx - VERSION OPTIMISÉE
import { useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import MasterDataTable from "../components/MasterDataTable";
import MasterDataFormModal from "../components/MasterDataFormModal";
import { 
  Upload, Plus, AlertCircle, Package, Search, Filter, 
  Download, TrendingUp, Layers, Weight, FileText,
  CheckSquare, Square, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useOptimizedQuery } from "../hooks/useOptimizedQuery";
import { withErrorHandling, errorService } from "../services/errorService";
import { queryCache } from "../services/queryCache";

// ✅ Type strict pour MasterData
interface MasterDataRow {
  id: string;
  company_id: string;
  sku: string;
  designation: string;
  tus: 'FEU' | 'CAR' | 'BAC';
  qty_per_pallet: number;
  poids_net: number;
  poids_brut: number;
  longueur: number;
  largeur: number;
  hauteur: number;
  hauteur_couche: number;
  nb_couches: number;
  ean: string;
  stackable: boolean;
  max_stack_height: number;
  max_stack_weight: number;
  unite_mesure?: string;
  unite?: string;
  created_at?: string;
  updated_at?: string;
}

export default function MasterData() {
  const { user } = useAuth();
  
  // ✅ Hook optimisé avec cache et realtime
  const { 
    data: products, 
    loading, 
    refresh 
  } = useOptimizedQuery<MasterDataRow>('masterdata', {
    cache: true,
    cacheTTL: 10 * 60 * 1000, // 10 minutes (données rarement modifiées)
    realtime: true,
    filter: { company_id: user?.company_id },
    orderBy: { column: 'sku', ascending: true },
    deps: [user?.company_id],
  });

  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<MasterDataRow | null>(null);
  
  // États UI
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("Tous");
  const [filterStackable, setFilterStackable] = useState<string>("Tous");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // ✅ Filtrage optimisé avec useMemo
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const searchLower = search.toLowerCase();
      const matchSearch = 
        product.sku?.toLowerCase().includes(searchLower) ||
        product.designation?.toLowerCase().includes(searchLower) ||
        product.ean?.toLowerCase().includes(searchLower);
      
      const matchType = filterType === "Tous" || product.tus === filterType;
      const matchStackable = 
        filterStackable === "Tous" || 
        (filterStackable === "Oui" && product.stackable) ||
        (filterStackable === "Non" && !product.stackable);
      
      return matchSearch && matchType && matchStackable;
    });
  }, [products, search, filterType, filterStackable]);

  // ✅ Tri optimisé avec useMemo
  const sortedProducts = useMemo(() => {
    if (!sortConfig) return filteredProducts;
    
    return [...filteredProducts].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof MasterDataRow];
      const bVal = b[sortConfig.key as keyof MasterDataRow];
      
      // Gestion des valeurs nulles/undefined
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortConfig]);

  // ✅ KPI optimisés avec useMemo
  const kpis = useMemo(() => ({
    totalProducts: products.length,
    stackableProducts: products.filter(p => p.stackable).length,
    totalWeight: products.reduce((sum, p) => sum + (p.poids_brut || 0) * (p.qty_per_pallet || 0), 0),
    uniqueTypes: [...new Set(products.map(p => p.tus))].filter(Boolean),
  }), [products]);

  // ✅ Handlers optimisés avec useCallback
  const handleSort = useCallback((key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedProducts.map(p => p.id)));
    }
  }, [selectedIds.size, sortedProducts]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  // ✅ Suppression en masse avec gestion d'erreur
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.warning("Aucun produit sélectionné");
      return;
    }

    if (!confirm(`Supprimer ${selectedIds.size} produit(s) ?`)) return;

    const result = await withErrorHandling(async () => {
      const { error } = await supabase
        .from("masterdata")
        .delete()
        .in("id", Array.from(selectedIds))
        .eq("company_id", user?.company_id);

      if (error) throw error;

      // ✅ Invalider le cache et recharger
      queryCache.invalidate('masterdata_*');
      await refresh();
      
      return true;
    }, 'Suppression produits');

    if (result) {
      toast.success(`${selectedIds.size} produit(s) supprimé(s)`);
      setSelectedIds(new Set());
    }
  };

  // ✅ Export CSV optimisé
  const handleExportCSV = useCallback(() => {
    const dataToExport = selectedIds.size > 0 
      ? sortedProducts.filter(p => selectedIds.has(p.id))
      : sortedProducts;

    if (dataToExport.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = [
      "SKU", "Type", "Désignation", "EAN", "Qté/palette",
      "Poids net", "Poids brut", "Longueur", "Largeur", "Hauteur",
      "Nb couches", "Hauteur couche", "Gerbable", "Poids max"
    ];

    const rows = dataToExport.map(p => [
      p.sku, p.tus, p.designation, p.ean, p.qty_per_pallet,
      p.poids_net, p.poids_brut, p.longueur, p.largeur, p.hauteur,
      p.nb_couches, p.hauteur_couche, p.stackable ? "Oui" : "Non", p.max_stack_weight
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `masterdata_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast.success(`${dataToExport.length} produit(s) exporté(s)`);
  }, [sortedProducts, selectedIds]);

  // ✅ Template avec gestion d'erreur
  const handleDownloadTemplate = useCallback(() => {
    const headers = [
      "Article", "Désignation article", "TUS", "Qté EqpCh.", 
      "Poids net", "Poids brut", "Longueur", "Largeur", "Hauteur",
      "Compteur", "Code EAN/UPC"
    ];

    const exampleRow = [
      "SKU001", "Exemple de produit", "FEU", "100",
      "10.5", "11.2", "1200", "800", "150",
      "8", "1234567890123"
    ];

    const csvContent = [headers, exampleRow]
      .map(row => row.map(cell => `"${cell}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_masterdata.csv";
    link.click();
    
    toast.success("Template téléchargé");
  }, []);

  const handleAdd = useCallback(() => {
    setEditProduct(null);
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((row: MasterDataRow) => {
    setEditProduct(row);
    setShowModal(true);
  }, []);

  // ✅ Suppression avec gestion d'erreur centralisée
  const handleDelete = async (row: MasterDataRow) => {
    if (!confirm("Supprimer cet article ?")) return;
    
    const result = await withErrorHandling(async () => {
      const { error } = await supabase
        .from("masterdata")
        .delete()
        .eq("id", row.id)
        .eq("company_id", user?.company_id);

      if (error) throw error;

      // ✅ Invalider le cache
      queryCache.invalidate('masterdata_*');
      await refresh();
      
      return true;
    }, 'Suppression article');

    if (result) {
      toast.success("Article supprimé");
    }
  };

  // ✅ Sauvegarde avec gestion d'erreur
  const handleSave = async (formData: any) => {
    if (!user?.company_id) {
      errorService.handle(
        errorService.validation("ID entreprise manquant"),
        'Sauvegarde article'
      );
      return;
    }

    const result = await withErrorHandling(async () => {
      const dataWithCompany = {
        ...formData,
        company_id: user.company_id
      };

      if (editProduct) {
        const { error } = await supabase
          .from("masterdata")
          .update(dataWithCompany)
          .eq("id", editProduct.id)
          .eq("company_id", user.company_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("masterdata")
          .insert([dataWithCompany]);

        if (error) throw error;
      }

      // ✅ Invalider le cache
      queryCache.invalidate('masterdata_*');
      await refresh();
      
      return true;
    }, editProduct ? 'Mise à jour article' : 'Ajout article');

    if (result) {
      toast.success(editProduct ? "Article mis à jour" : "Article ajouté");
      setShowModal(false);
    }
  };

  // ✅ Import avec gestion d'erreur complète
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user?.company_id) {
      errorService.handle(
        errorService.validation("ID entreprise manquant"),
        'Import MasterData'
      );
      return;
    }

    toast.info("📥 Import en cours...");

    const result = await withErrorHandling(async () => {
      let parsedData: any[] = [];
      const fileName = file.name.toLowerCase();

      // Parsing CSV ou Excel
      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split("\n").filter(l => l.trim());
        
        if (lines.length < 2) {
          throw errorService.validation("Fichier CSV vide");
        }

        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim());
        
        parsedData = lines.slice(1).map(line => {
          const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          headers.forEach((header, i) => {
            row[header] = values[i];
          });
          return row;
        });
      } 
      else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedData = XLSX.utils.sheet_to_json(worksheet);
      } 
      else {
        throw errorService.validation("Format non supporté (.csv, .xlsx uniquement)");
      }

      // Validation et mapping
      const validEntries = parsedData
        .filter((row: any) => {
          return (row.Article || row.sku) && (row['Qté EqpCh.'] || row.qty_per_pallet);
        })
        .map((row: any) => ({
          company_id: user.company_id,
          sku: String(row.Article || row.sku || '').trim(),
          designation: String(row['Désignation article'] || row.designation || '').trim(),
          tus: (row.TUS || row.tus || 'FEU').toUpperCase(),
          qty_per_pallet: parseFloat(row['Qté EqpCh.'] || row.qty_per_pallet) || 0,
          poids_net: parseFloat(row['Poids net'] || row.poids_net) || 0,
          poids_brut: parseFloat(row['Poids brut'] || row.poids_brut) || 0,
          longueur: parseFloat(row.Longueur || row.longueur) || 1200,
          largeur: parseFloat(row.Largeur || row.largeur) || 800,
          hauteur: parseFloat(row.Hauteur || row.hauteur) || 150,
          nb_couches: parseInt(row.Compteur || row.nb_couches) || 8,
          hauteur_couche: parseFloat(row.Hauteur || row.hauteur) || 150,
          stackable: true,
          max_stack_weight: 600,
          ean: String(row['Code EAN/UPC'] || row.ean || ''),
          unite_mesure: 'MM',
          unite: 'KG',
        }))
        .filter((entry: any) => entry.sku && entry.qty_per_pallet > 0);

      if (validEntries.length === 0) {
        throw errorService.validation("Aucune donnée valide trouvée dans le fichier");
      }

      // Vérifier doublons
      const skus = validEntries.map((e: any) => e.sku);
      const { data: existing } = await supabase
        .from("masterdata")
        .select("sku")
        .eq("company_id", user.company_id)
        .in("sku", skus);

      const existingSKUs = new Set(existing?.map((e: any) => e.sku) || []);
      const newEntries = validEntries.filter((e: any) => !existingSKUs.has(e.sku));
      const duplicates = validEntries.length - newEntries.length;

      if (newEntries.length === 0) {
        throw errorService.validation(`Tous les ${validEntries.length} SKU existent déjà`);
      }

      // Import par batch
      const batchSize = 100;
      let totalImported = 0;
      
      for (let i = 0; i < newEntries.length; i += batchSize) {
        const batch = newEntries.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from("masterdata")
          .insert(batch);

        if (error) throw error;
        totalImported += batch.length;
      }

      // ✅ Invalider le cache et recharger
      queryCache.invalidate('masterdata_*');
      await refresh();

      return { totalImported, duplicates };
    }, 'Import MasterData');

    if (result) {
      const message = result.duplicates > 0 
        ? `✅ ${result.totalImported} nouveaux articles (${result.duplicates} doublons ignorés)`
        : `✅ ${result.totalImported} articles importés`;
      
      toast.success(message);
    }

    e.target.value = '';
  };

  // Colonnes du tableau
  const columns = [
    { key: "sku", label: "SKU", sortable: true },
    { key: "tus", label: "Type", sortable: true },
    { key: "designation", label: "Désignation", sortable: true },
    { key: "qty_per_pallet", label: "Qté/palette", sortable: true },
    { key: "poids_brut", label: "Poids brut (kg)", sortable: true },
    { key: "nb_couches", label: "Couches", sortable: true },
    { 
      key: "stackable", 
      label: "Gerbable",
      sortable: true,
      render: (val: boolean) => (
        <span className={val ? "text-green-600 dark:text-green-400 font-semibold" : "text-gray-400 dark:text-gray-500"}>
          {val ? "✓ Oui" : "✗ Non"}
        </span>
      )
    },
  ];

  // ✅ Guard clause pour company_id
  if (!user?.company_id) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Erreur de configuration
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Votre compte n'est pas associé à une entreprise.
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="text-blue-600 dark:text-blue-500" size={28} />
              MasterData
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestion du catalogue produits
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
            >
              <FileText size={16} />
              Template
            </button>
            <label className="cursor-pointer px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center gap-2 text-sm">
              <Upload size={16} />
              <span className="hidden sm:inline">Importer</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={handleAdd}
              className="px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Ajouter</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total produits</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.totalProducts}</p>
              </div>
              <Package className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Gerbables</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.stackableProducts}</p>
              </div>
              <Layers className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Poids total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(kpis.totalWeight)} kg</p>
              </div>
              <Weight className="text-purple-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Types</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.uniqueTypes.length}</p>
              </div>
              <TrendingUp className="text-orange-500" size={32} />
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par SKU, désignation, EAN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Boutons */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter size={20} />
              Filtres
              {(filterType !== "Tous" || filterStackable !== "Tous") && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {(filterType !== "Tous" ? 1 : 0) + (filterStackable !== "Tous" ? 1 : 0)}
                </span>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={sortedProducts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Download size={20} />
              <span className="hidden sm:inline">Export</span>
              {selectedIds.size > 0 && ` (${selectedIds.size})`}
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={20} />
                <span className="hidden sm:inline">Supprimer</span>
                {` (${selectedIds.size})`}
              </button>
            )}
          </div>

          {/* Panel filtres */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Tous">Tous les types</option>
                    {kpis.uniqueTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gerbable
                  </label>
                  <select
                    value={filterStackable}
                    onChange={(e) => setFilterStackable(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Tous">Tous</option>
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Résultats */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSelectAll}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title={selectedIds.size === sortedProducts.length ? "Tout désélectionner" : "Tout sélectionner"}
              >
                {selectedIds.size === sortedProducts.length ? (
                  <CheckSquare size={20} className="text-blue-600" />
                ) : (
                  <Square size={20} className="text-gray-400" />
                )}
              </button>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {sortedProducts.length} résultat{sortedProducts.length > 1 ? "s" : ""}
                {search && ` pour "${search}"`}
                {selectedIds.size > 0 && ` • ${selectedIds.size} sélectionné(s)`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {products.length === 0 ? "Aucun article dans votre MasterData" : "Aucun résultat"}
              </p>
              {products.length === 0 && (
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ajouter votre premier article
                </button>
              )}
            </div>
          ) : (
            <MasterDataTable
              data={sortedProducts}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              onSelect={toggleSelect}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
          )}
        </div>
      </div>
      
      {showModal && (
        <MasterDataFormModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          initialData={editProduct}
        />
      )}
    </div>
  );
}