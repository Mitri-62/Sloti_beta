// src/pages/StockSynoptique.tsx - VERSION AVEC INTERACTION 3D → TABLEAU
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";

// ✅ NOUVEAU CHEMIN - Import depuis le dossier modulaire
import Warehouse3DView from '../components/warehouse3d/Warehouse3DView';

import { 
  Search, Filter, Download, Package, TrendingUp, AlertTriangle, Boxes, 
  Edit2, Check, X, TrendingDown, Calendar, BarChart3, Activity, MapPin, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

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
  created_at?: string;
  updated_at?: string;
  tus?: string | null;
};

type ForecastData = {
  date: string;
  entrees: number;
  sorties: number;
  stockPrevisionnel: number;
};

// ✅ Type pour la sélection depuis la vue 3D
type EmplacementSelection = {
  emplacement: string;
  level: number;
  position: number;
} | null;

export default function StockSynoptique() {
  const { user } = useAuth();
  const companyId = user?.company_id ?? null;

  const [items, setItems] = useState<StockItem[]>([]);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("Tous");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'table' | '3d' | 'forecast'>('table');
  
  // États pour l'édition
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Partial<StockItem>>({});
  const [saving, setSaving] = useState(false);

  // États pour les prévisions
  const [forecastDays, setForecastDays] = useState(7);
  const [historicalPeriod, setHistoricalPeriod] = useState(30);

  // ✅ NOUVEAU: État pour la sélection depuis la 3D
  const [emplacementSelection, setEmplacementSelection] = useState<EmplacementSelection>(null);
  const [highlightedRows, setHighlightedRows] = useState<Set<string>>(new Set());

  const loadStock = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      // ✅ Requêtes parallélisées pour de meilleures performances
      const [stocksRes, entreesRes, sortiesRes] = await Promise.all([
        supabase
          .from("stocks")
          .select("*")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("stock_entries")
          .select("*, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("stock_exits")
          .select("*, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (stocksRes.error) throw stocksRes.error;

      const stocksData = stocksRes.data || [];

      if (stocksData.length > 0) {
        const uniqueNames = [...new Set(stocksData.map(s => s.name).filter(Boolean))];

        const { data: mdData } = await supabase
          .from("masterdata")
          .select("sku, tus, designation")
          .eq("company_id", companyId)
          .in("sku", uniqueNames);

        const tusMap = new Map<string, { tus: string | null; designation: string | null }>();
        mdData?.forEach(m => {
          tusMap.set(m.sku, { tus: m.tus, designation: m.designation });
        });

        const itemsWithTus = stocksData.map(item => {
          const mdInfo = tusMap.get(item.name);
          return {
            ...item,
            tus: mdInfo?.tus || null,
            designation: item.designation || mdInfo?.designation || null,
          };
        });

        setItems(itemsWithTus);
      } else {
        setItems([]);
      }

      // Traiter l'historique
      const history = [
        ...(entreesRes.data?.map(e => ({ ...e, type: 'entree' })) || []),
        ...(sortiesRes.data?.map(s => ({ ...s, type: 'sortie' })) || [])
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setStockHistory(history);
    } catch (err: any) {
      console.error("Erreur chargement stocks:", err);
      toast.error("Erreur lors du chargement des stocks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [companyId]);

  // ✅ NOUVEAU: Handler pour le clic sur un emplacement 3D
  const handleEmplacementClick = useCallback((emplacement: string, level: number, position: number) => {
    console.log(`📍 Clic sur emplacement: ${emplacement}, Niveau: ${level}, Position: ${position}`);
    
    // Construire le pattern de recherche (ex: "A-1-2" ou juste "A")
    const searchPattern = `${emplacement}-${level}`;
    
    // Trouver les items correspondants
    const matchingItems = items.filter(item => {
      if (!item.emplacement_prenant) return false;
      const emp = item.emplacement_prenant.toUpperCase();
      // Match exact ou préfixe
      return emp.startsWith(emplacement.toUpperCase()) || 
             emp.includes(searchPattern.toUpperCase());
    });

    if (matchingItems.length > 0) {
      // Stocker la sélection
      setEmplacementSelection({ emplacement, level, position });
      
      // Mettre en surbrillance les lignes correspondantes
      setHighlightedRows(new Set(matchingItems.map(i => i.id)));
      
      // Filtrer par l'emplacement
      setSearch(emplacement);
      
      // Basculer vers la vue tableau
      setView('table');
      
      // Notification
      toast.success(
        <div className="flex items-center gap-2">
          <MapPin size={16} />
          <span>
            <strong>{matchingItems.length}</strong> article{matchingItems.length > 1 ? 's' : ''} 
            {' '}en <strong>{emplacement}</strong> niveau {level}
          </span>
        </div>,
        { duration: 4000 }
      );

      // Scroll vers le premier élément après un court délai (pour laisser la vue se charger)
      setTimeout(() => {
        const firstRow = document.querySelector(`[data-item-id="${matchingItems[0].id}"]`);
        firstRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);

    } else {
      toast.info(
        <div className="flex items-center gap-2">
          <Package size={16} />
          <span>Aucun stock à l'emplacement <strong>{emplacement}-{level}</strong></span>
        </div>
      );
    }
  }, [items]);

  // ✅ NOUVEAU: Effacer la sélection d'emplacement
  const clearEmplacementSelection = useCallback(() => {
    setEmplacementSelection(null);
    setHighlightedRows(new Set());
    setSearch("");
  }, []);

  // ✅ NOUVEAU: Naviguer vers un emplacement depuis le tableau
  const goToEmplacement3D = useCallback((emplacement: string) => {
    if (!emplacement) return;
    
    // Parser l'emplacement pour extraire rack/niveau
    const match = emplacement.match(/^([A-Za-z]+)[-._\/]?(\d+)?/);
    if (match) {
      const rackCode = match[1].toUpperCase();
      const level = match[2] ? parseInt(match[2]) : 1;
      
      setEmplacementSelection({ emplacement: rackCode, level, position: 1 });
      setView('3d');
      
      toast.info(
        <div className="flex items-center gap-2">
          <Boxes size={16} />
          <span>Navigation vers <strong>Rack {rackCode}</strong></span>
        </div>
      );
    }
  }, []);

  // Calcul des prévisions (inchangé)
  const forecastData = useMemo(() => {
    if (stockHistory.length === 0) return [];

    const dailyStats: Record<string, { entrees: number; sorties: number }> = {};
    
    stockHistory.forEach(movement => {
      const date = format(parseISO(movement.created_at), 'yyyy-MM-dd');
      if (!dailyStats[date]) {
        dailyStats[date] = { entrees: 0, sorties: 0 };
      }
      
      if (movement.type === 'entree') {
        dailyStats[date].entrees += movement.quantity || 1;
      } else {
        dailyStats[date].sorties += movement.quantity || 1;
      }
    });

    const dates = Object.keys(dailyStats).sort();
    const recentDates = dates.slice(-historicalPeriod);
    
    let totalEntrees = 0;
    let totalSorties = 0;
    
    recentDates.forEach(date => {
      totalEntrees += dailyStats[date].entrees;
      totalSorties += dailyStats[date].sorties;
    });
    
    const avgEntrees = totalEntrees / historicalPeriod;
    const avgSorties = totalSorties / historicalPeriod;

    const currentStock = items.reduce((sum, item) => sum + item.quantity, 0);
    const forecasts: ForecastData[] = [];
    let stockPrevisionnel = currentStock;

    for (let i = 1; i <= forecastDays; i++) {
      const date = format(subDays(new Date(), -i), 'yyyy-MM-dd');
      const entreesPrevues = Math.round(avgEntrees);
      const sortiesPrevues = Math.round(avgSorties);
      
      stockPrevisionnel = stockPrevisionnel + entreesPrevues - sortiesPrevues;
      
      forecasts.push({
        date,
        entrees: entreesPrevues,
        sorties: sortiesPrevues,
        stockPrevisionnel: Math.max(0, stockPrevisionnel),
      });
    }

    return forecasts;
  }, [stockHistory, items, forecastDays, historicalPeriod]);

  const trends = useMemo(() => {
    if (forecastData.length < 3) {
      return { stock: 'stable', percentChange: 0 };
    }

    const stockValues = forecastData.map(d => d.stockPrevisionnel);
    const first = stockValues[0];
    const last = stockValues[stockValues.length - 1];
    const percentChange = ((last - first) / first) * 100;

    return {
      stock: percentChange > 10 ? 'increasing' : percentChange < -10 ? 'decreasing' : 'stable',
      percentChange: Math.round(percentChange),
    };
  }, [forecastData]);

  const startEditing = (item: StockItem) => {
    setEditingId(item.id);
    setEditingValues({
      ean: item.ean,
      name: item.name,
      type: item.type,
      quantity: item.quantity,
      lot: item.lot,
      expiration_date: item.expiration_date,
      designation: item.designation,
      emplacement_prenant: item.emplacement_prenant,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValues({});
  };

  const saveEditing = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("stocks")
        .update(editingValues)
        .eq("id", editingId);

      if (error) throw error;

      setItems(items.map(item => 
        item.id === editingId 
          ? { ...item, ...editingValues } 
          : item
      ));

      toast.success("Stock mis à jour avec succès");
      setEditingId(null);
      setEditingValues({});
    } catch (err: any) {
      console.error("Erreur sauvegarde:", err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof StockItem, value: any) => {
    setEditingValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredItems = items.filter((item) => {
    const matchType = filterType === "Tous" || item.type === filterType;
    const searchLower = search.toLowerCase();
    const matchSearch =
      item.name?.toLowerCase().includes(searchLower) ||
      (item.ean || "").toLowerCase().includes(searchLower) ||
      item.movement_name?.toLowerCase().includes(searchLower) ||
      item.designation?.toLowerCase().includes(searchLower) ||
      (item.emplacement_prenant || "").toLowerCase().includes(searchLower);

    return matchType && matchSearch;
  });

  const totalSkus = items.length;
  const totalDistinctArticles = new Set(items.map((i) => i.name)).size;
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = items.filter(item => {
    if (!item.expiration_date) return false;
    const expDate = new Date(item.expiration_date);
    return expDate >= today && expDate <= in30Days;
  }).length;

  const uniqueTypes = [...new Set(items.map(i => i.type))].filter(Boolean);

  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = [
      "EAN", "Article", "Type", "Quantité", "Lot", "DLC", 
      "Désignation", "Emplacement", "TUS"
    ];

    const rows = filteredItems.map(item => [
      item.ean || "",
      item.name,
      item.type,
      item.quantity,
      item.lot || "",
      item.expiration_date || "",
      item.designation || "",
      item.emplacement_prenant || "",
      item.tus || "",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stock_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Export CSV réussi");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des stocks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="text-blue-600" size={28} />
              Vue Synoptique du Stock
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestion et suivi des stocks en temps réel
            </p>
          </div>
  
          {/* Boutons de vue */}
          <div className="flex gap-2">
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                view === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Package size={18} />
              Tableau
            </button>
            <button
              onClick={() => setView('3d')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                view === '3d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Boxes size={18} />
              3D
            </button>
            <button
              onClick={() => setView('forecast')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                view === 'forecast'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <BarChart3 size={18} />
              Prévisions
            </button>
          </div>
        </div>

        {/* ✅ NOUVEAU: Bandeau de sélection d'emplacement */}
        {emplacementSelection && view === 'table' && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <MapPin className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Emplacement sélectionné : <strong>{emplacementSelection.emplacement}</strong>
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Niveau {emplacementSelection.level}, Position {emplacementSelection.position}
                  {' '}&bull;{' '}
                  <span className="font-medium">{highlightedRows.size} article{highlightedRows.size > 1 ? 's' : ''}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('3d')}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
              >
                <Boxes size={16} />
                Voir en 3D
              </button>
              <button
                onClick={clearEmplacementSelection}
                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
                title="Effacer la sélection"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
  
        {/* Vue 3D */}
        {view === '3d' && (
          <div className="h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            {/* ✅ NOUVEAU: Instructions interaction */}
            <div className="mb-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <MapPin size={16} />
                <span>
                  <strong>Astuce :</strong> Cliquez sur un rack pour voir son stock dans le tableau
                </span>
                <ArrowRight size={14} className="ml-1" />
              </p>
            </div>
            
            <div className="h-[calc(100%-40px)]">
              <Warehouse3DView 
                items={filteredItems} 
                onEmplacementClick={handleEmplacementClick}
              />
            </div>
          </div>
        )}

        {/* Vue Prévisions - Code inchangé */}
        {view === 'forecast' && (
          <div className="space-y-6">
            {/* KPI Prévisions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Stock actuel</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalQuantity}</p>
                  </div>
                  <Package className="text-blue-500" size={32} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Stock prévisionnel</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {forecastData.length > 0 ? forecastData[forecastData.length - 1].stockPrevisionnel : 0}
                    </p>
                  </div>
                  <Activity className="text-purple-500" size={32} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tendance</p>
                    <div className="flex items-center gap-2 mt-1">
                      {trends.stock === 'increasing' && (
                        <>
                          <TrendingUp className="text-green-500" size={24} />
                          <span className="text-xl font-bold text-green-600">+{trends.percentChange}%</span>
                        </>
                      )}
                      {trends.stock === 'decreasing' && (
                        <>
                          <TrendingDown className="text-red-500" size={24} />
                          <span className="text-xl font-bold text-red-600">{trends.percentChange}%</span>
                        </>
                      )}
                      {trends.stock === 'stable' && (
                        <>
                          <Activity className="text-gray-500" size={24} />
                          <span className="text-xl font-bold text-gray-600">Stable</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Alertes DLC</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{expiringSoon}</p>
                  </div>
                  <AlertTriangle className="text-orange-500" size={32} />
                </div>
              </div>
            </div>

            {/* Graphiques - Code existant simplifié */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-600" />
                Évolution prévisionnelle du stock
              </h3>
              
              {forecastData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => format(parseISO(date), 'dd/MM', { locale: fr })}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(date) => format(parseISO(date), 'dd MMMM yyyy', { locale: fr })}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="stockPrevisionnel" 
                        stroke="#8b5cf6" 
                        fill="#8b5cf6" 
                        fillOpacity={0.6}
                        name="Stock prévisionnel"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <AlertTriangle size={48} className="mx-auto mb-4 text-yellow-500" />
                    <p>Pas assez de données historiques</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vue Tableau */}
        {view === 'table' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">SKUs totaux</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalSkus}</p>
                  </div>
                  <Package className="text-blue-500" size={32} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Articles distincts</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalDistinctArticles}</p>
                  </div>
                  <TrendingUp className="text-green-500" size={32} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Quantité totale</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalQuantity}</p>
                  </div>
                  <Package className="text-purple-500" size={32} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Expire bientôt</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{expiringSoon}</p>
                  </div>
                  <AlertTriangle className="text-orange-500" size={32} />
                </div>
              </div>
            </div>

            {/* Filtres et Recherche */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Rechercher par article, EAN, emplacement..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      // Effacer la sélection si recherche manuelle
                      if (emplacementSelection && e.target.value !== emplacementSelection.emplacement) {
                        setEmplacementSelection(null);
                        setHighlightedRows(new Set());
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Filter size={20} />
                  <span>Filtres</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  disabled={filteredItems.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download size={20} />
                  <span className="hidden sm:inline">Exporter</span>
                </button>
              </div>

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
                        {uniqueTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tableau */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredItems.length} résultat{filteredItems.length > 1 ? "s" : ""}
                  {search && ` pour "${search}"`}
                  {highlightedRows.size > 0 && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      ({highlightedRows.size} depuis la vue 3D)
                    </span>
                  )}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">EAN</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Article</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Quantité</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Lot</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">DLC</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Désignation</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Empl.</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">TUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          Aucun résultat trouvé
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const isEditing = editingId === item.id;
                        const isHighlighted = highlightedRows.has(item.id);
                        
                        return (
                          <tr
                            key={item.id}
                            data-item-id={item.id}
                            className={`transition-colors ${
                              isEditing 
                                ? 'bg-blue-50 dark:bg-blue-900/20' 
                                : isHighlighted
                                ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-inset ring-green-300 dark:ring-green-700'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={saveEditing}
                                      disabled={saving}
                                      className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                                      title="Sauvegarder"
                                    >
                                      {saving ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                      ) : (
                                        <Check size={18} />
                                      )}
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      disabled={saving}
                                      className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                                      title="Annuler"
                                    >
                                      <X size={18} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEditing(item)}
                                      className="p-1 text-blue-600 hover:text-blue-700"
                                      title="Modifier"
                                    >
                                      <Edit2 size={18} />
                                    </button>
                                    {/* ✅ NOUVEAU: Bouton pour voir en 3D */}
                                    {item.emplacement_prenant && (
                                      <button
                                        onClick={() => goToEmplacement3D(item.emplacement_prenant!)}
                                        className="p-1 text-indigo-600 hover:text-indigo-700"
                                        title="Voir en 3D"
                                      >
                                        <Boxes size={18} />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingValues.ean || ''}
                                  onChange={(e) => handleFieldChange('ean', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
                                  placeholder="EAN"
                                />
                              ) : (
                                <span className="text-gray-900 dark:text-white">{item.ean || "-"}</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingValues.name || ''}
                                  onChange={(e) => handleFieldChange('name', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm font-medium"
                                  placeholder="Article"
                                />
                              ) : (
                                <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                {item.type}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editingValues.quantity || 0}
                                  onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm font-bold"
                                  min="0"
                                />
                              ) : (
                                <span className="font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {item.lot || "-"}
                            </td>

                            <td className="px-4 py-3">
                              {item.expiration_date ? (
                                <span className={
                                  new Date(item.expiration_date) <= in30Days
                                    ? "text-orange-600 font-medium"
                                    : "text-gray-600 dark:text-gray-400"
                                }>
                                  {new Date(item.expiration_date).toLocaleDateString("fr-FR")}
                                </span>
                              ) : "-"}
                            </td>

                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                              {item.designation || "-"}
                            </td>

                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingValues.emplacement_prenant || ''}
                                  onChange={(e) => handleFieldChange('emplacement_prenant', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
                                  placeholder="Emplacement"
                                />
                              ) : (
                                <span className={`text-gray-600 dark:text-gray-400 ${isHighlighted ? 'font-medium text-green-700 dark:text-green-400' : ''}`}>
                                  {item.emplacement_prenant || "-"}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                item.tus === 'FCH' 
                                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' 
                                  : item.tus === 'FEU'
                                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                {item.tus || "-"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
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