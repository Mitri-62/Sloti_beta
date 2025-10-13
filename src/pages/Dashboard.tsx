// src/pages/Dashboard.tsx - VERSION OPTIMISÉE AVEC CACHE + DARK MODE
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { 
  Package, Truck, Users, Calendar, Download, TrendingUp, TrendingDown,
  Activity, MapPin, AlertTriangle, CheckCircle, Target
} from "lucide-react";
import { Link } from "react-router-dom";
import { startOfWeek, endOfWeek, addWeeks, format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [stats, setStats] = useState({
    stocks: 0,
    chargements: 0,
    receptions: 0,
    utilisateurs: 0,
    tours: 0,
    toursCompleted: 0,
  });

  const [trends, setTrends] = useState({
    stocksTrend: 0,
    chargementsTrend: 0,
    toursTrend: 0,
  });

  const [chartData, setChartData] = useState<
    { day: string; entrees: number; sorties: number }[]
  >([]);

  const [stockByLocation, setStockByLocation] = useState<
    { name: string; value: number }[]
  >([]);

  const [tourStats, setTourStats] = useState<
    { status: string; count: number }[]
  >([]);

  const [activity, setActivity] = useState<
    { id: string; text: string; time: string; type: string }[]
  >([]);

  const [weekOffset, setWeekOffset] = useState(0);

  // Charger les données du cache dès le montage du composant
  useEffect(() => {
    if (!user?.company_id) return;

    try {
      const cachedStats = localStorage.getItem(`dashboard_stats_${user.company_id}`);
      const cachedTrends = localStorage.getItem(`dashboard_trends_${user.company_id}`);
      const cachedChart = localStorage.getItem(`dashboard_chart_${user.company_id}`);

      if (cachedStats) {
        setStats(JSON.parse(cachedStats));
        setLoading(false);
      }
      if (cachedTrends) {
        setTrends(JSON.parse(cachedTrends));
      }
      if (cachedChart) {
        setChartData(JSON.parse(cachedChart));
        setLoadingChart(false);
      }
    } catch (error) {
      console.error("Erreur lecture cache:", error);
    }
  }, [user?.company_id]);

  // Charger les KPI avec tendances
  useEffect(() => {
    const loadStats = async () => {
      if (!user?.company_id) return;
      
      const hasCache = stats.stocks > 0 || stats.chargements > 0 || stats.tours > 0;
      if (!hasCache) {
        setLoading(true);
      }

      try {
        const [
          { data: stockData, error: stockError },
          { data: oldStockData },
          { count: userCount },
          { data: toursData, error: toursError },
          { data: planningsData, error: planningsError }
        ] = await Promise.all([
          supabase.from("stocks").select("ean, quantity").eq("company_id", user.company_id),
          supabase.from("stock_movements").select("quantity").eq("company_id", user.company_id).lt("created_at", subDays(new Date(), 7).toISOString()),
          supabase.from("users").select("*", { count: "exact", head: true }).eq("company_id", user.company_id),
          supabase.from("tours").select("status").eq("company_id", user.company_id).gte("date", subDays(new Date(), 30).toISOString().split('T')[0]),
          supabase.from("plannings").select("type").eq("company_id", user.company_id).gte("date", startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }).toISOString().split("T")[0]).lte("date", endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }).toISOString().split("T")[0])
        ]);

        if (stockError) throw stockError;
        if (toursError) throw toursError;
        if (planningsError) throw planningsError;

        const uniqueSkus = stockData ? new Set(stockData.map((s) => s.ean)).size : 0;
        const totalQuantity = stockData?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
        const oldTotal = oldStockData?.reduce((sum, s) => sum + Math.abs(s.quantity || 0), 0) || 0;
        const stocksTrend = oldTotal > 0 ? ((totalQuantity - oldTotal) / oldTotal) * 100 : 0;

        const totalTours = toursData?.length || 0;
        const completedTours = toursData?.filter(t => t.status === 'completed').length || 0;

        const recepCount = planningsData?.filter((r) => r.type === "Réception").length || 0;
        const loadCount = planningsData?.filter((r) => r.type === "Expédition").length || 0;

        const newStats = {
          stocks: uniqueSkus,
          chargements: loadCount,
          receptions: recepCount,
          utilisateurs: userCount || 0,
          tours: totalTours,
          toursCompleted: completedTours,
        };

        setStats(newStats);
        localStorage.setItem(`dashboard_stats_${user.company_id}`, JSON.stringify(newStats));

        const newTrends = {
          stocksTrend: Math.round(stocksTrend),
          chargementsTrend: 0,
          toursTrend: 0,
        };

        setTrends(newTrends);
        localStorage.setItem(`dashboard_trends_${user.company_id}`, JSON.stringify(newTrends));

        const toursByStatus = [
          { status: 'Planifiée', count: toursData?.filter(t => t.status === 'planned').length || 0 },
          { status: 'En cours', count: toursData?.filter(t => t.status === 'in_progress').length || 0 },
          { status: 'Terminée', count: completedTours },
          { status: 'Annulée', count: toursData?.filter(t => t.status === 'cancelled').length || 0 },
        ];
        setTourStats(toursByStatus);

      } catch (error) {
        console.error("Erreur chargement stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user?.company_id, weekOffset]);

  // Charger distribution des stocks par emplacement
  useEffect(() => {
    const loadStockLocations = async () => {
      if (!user?.company_id) return;

      const { data } = await supabase
        .from("stocks")
        .select("emplacement_prenant, quantity")
        .eq("company_id", user.company_id);

      if (data) {
        const grouped = data.reduce((acc: any, item) => {
          const loc = item.emplacement_prenant || 'Non défini';
          acc[loc] = (acc[loc] || 0) + (item.quantity || 0);
          return acc;
        }, {});

        const chartData = Object.entries(grouped)
          .map(([name, value]) => ({ name, value: value as number }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        setStockByLocation(chartData);
      }
    };

    loadStockLocations();
  }, [user?.company_id]);

  // Charger le graphique avec période variable
  useEffect(() => {
    const loadChartData = async () => {
      if (!user?.company_id) return;

      setLoadingChart(true);

      const today = new Date();
      const currentWeek = addWeeks(today, weekOffset);
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from("plannings")
        .select("date, type")
        .eq("company_id", user.company_id)
        .gte("date", weekStart.toISOString().split("T")[0])
        .lte("date", weekEnd.toISOString().split("T")[0]);

      if (error) {
        console.error("Erreur chargement planning:", error.message);
        setLoadingChart(false);
        return;
      }

      const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      const result = days.map((d) => ({ day: d, entrees: 0, sorties: 0 }));

      data?.forEach((row) => {
        const [year, month, day] = row.date.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        const dayIndex = localDate.getDay();
        const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        
        if (row.type === "Réception") result[mappedIndex].entrees++;
        if (row.type === "Expédition") result[mappedIndex].sorties++;
      });

      setChartData(result);
      localStorage.setItem(`dashboard_chart_${user.company_id}`, JSON.stringify(result));
      setLoadingChart(false);
    };

    loadChartData();
  }, [user?.company_id, weekOffset]);

  // Charger activité récente avec types
  useEffect(() => {
    const loadActivity = async () => {
      if (!user?.company_id) return;

      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("company_id", user.company_id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        setActivity(
          data.map((a) => ({
            id: a.id,
            text: a.message,
            time: new Date(a.created_at).toLocaleString("fr-FR", {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            }),
            type: a.type || 'info'
          }))
        );
      }
    };

    loadActivity();

    const channel = supabase
      .channel("dashboard-activity")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activities",
          filter: `company_id=eq.${user?.company_id}`,
        },
        (payload) => {
          const a = payload.new as any;
          setActivity((prev) => [
            {
              id: a.id,
              text: a.message,
              time: new Date(a.created_at).toLocaleString("fr-FR", {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              }),
              type: a.type || 'info'
            },
            ...prev.slice(0, 9),
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.company_id]);

  const today = new Date();
  const currentWeek = addWeeks(today, weekOffset);
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekRange = `${format(weekStart, "dd MMM", { locale: fr })} - ${format(
    weekEnd,
    "dd MMM yyyy",
    { locale: fr }
  )}`;

  const exportData = async () => {
    const data = {
      period: weekRange,
      stats,
      trends,
      chartData,
      stockByLocation,
      tourStats,
      activity: activity.slice(0, 10),
      companyName: user?.company_name || 'Sloti',
      userName: user?.name || user?.email,
    };
    
    const { downloadDashboardPDF } = await import('../services/dashboardPdfExport');
    await downloadDashboardPDF(data);
  };

  const getActivityIcon = (message: string, type: string) => {
    if (type === 'warning') return <AlertTriangle size={16} className="text-orange-500" />;
    if (type === 'success') return <CheckCircle size={16} className="text-green-500" />;
    if (type === 'error') return <AlertTriangle size={16} className="text-red-500" />;
    
    const msg = message.toLowerCase();
    if (msg.includes('stock')) return <Package size={16} className="text-blue-500" />;
    if (msg.includes('utilisateur')) return <Users size={16} className="text-green-500" />;
    if (msg.includes('tournée') || msg.includes('tour')) return <MapPin size={16} className="text-purple-500" />;
    if (msg.includes('planning') || msg.includes('chargement')) return <Calendar size={16} className="text-indigo-500" />;
    return <Activity size={16} className="text-gray-500" />;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp size={16} className="text-green-500" />;
    if (trend < 0) return <TrendingDown size={16} className="text-red-500" />;
    return <Activity size={16} className="text-gray-400" />;
  };

  const quickLinks = [
    { label: "Planning", path: "/app/planning", icon: Calendar },
    { label: "Stocks", path: "/app/stock/synoptique", icon: Package },
    { label: "Tournées", path: "/app/tour-planning", icon: Truck },
    { label: "Chargements", path: "/app/loading-smart", icon: Target },
  ];

  const KPISkeleton = () => (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3"></div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      
      {/* En-tête avec message de bienvenue */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Tableau de bord
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Bienvenue, {user?.name || user?.email?.split('@')[0]} 👋
          </p>
        </div>
        <button
          onClick={exportData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Download size={18} />
          Exporter
        </button>
      </div>

      {/* KPI Cards avec tendances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && (stats.stocks === 0 && stats.chargements === 0) ? (
          <>
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
          </>
        ) : (
          <>
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-2xl shadow hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-200">Stocks suivis</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-white mt-1">
                    {stats.stocks}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-blue-700 rounded-xl shadow-sm">
                  <Package size={24} className="text-blue-600 dark:text-blue-200" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {getTrendIcon(trends.stocksTrend)}
                <span className={trends.stocksTrend >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                  {Math.abs(trends.stocksTrend)}% vs semaine dernière
                </span>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-2xl shadow hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-200">Chargements</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-white mt-1">
                    {stats.chargements}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-purple-700 rounded-xl shadow-sm">
                  <Truck size={24} className="text-purple-600 dark:text-purple-200" />
                </div>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-300">Cette semaine</p>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-2xl shadow hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-200">Réceptions</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-white mt-1">
                    {stats.receptions}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-green-700 rounded-xl shadow-sm">
                  <Calendar size={24} className="text-green-600 dark:text-green-200" />
                </div>
              </div>
              <p className="text-xs text-green-600 dark:text-green-300">Cette semaine</p>
            </div>

            <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-2xl shadow hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-200">Tournées</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-white mt-1">
                    {stats.tours}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-orange-700 rounded-xl shadow-sm">
                  <MapPin size={24} className="text-orange-600 dark:text-orange-200" />
                </div>
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-300">
                {stats.toursCompleted} terminées
              </p>
            </div>
          </>
        )}
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graphique flux logistiques */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Flux logistiques</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{weekRange}</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                ← Précédente
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Aujourd'hui
              </button>
              <button
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Suivante →
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            {loadingChart ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <BarChart data={chartData}>
                <XAxis dataKey="day" stroke="#6B7280" style={{ fontSize: 12 }} />
                <YAxis stroke="#6B7280" style={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Legend wrapperStyle={{ paddingTop: 16 }} />
                <Bar dataKey="entrees" fill="#10B981" name="Entrées" radius={[8, 8, 0, 0]} />
                <Bar dataKey="sorties" fill="#3B82F6" name="Sorties" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Distribution des stocks */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribution des stocks</h2>
          {stockByLocation.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockByLocation}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stockByLocation.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      {/* Stats des tournées + Activité */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Stats tournées */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">État des tournées (30 derniers jours)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tourStats} layout="vertical">
              <XAxis type="number" stroke="#6B7280" style={{ fontSize: 12 }} />
              <YAxis dataKey="status" type="category" width={100} stroke="#6B7280" style={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activité récente */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activité récente</h2>
          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            {activity.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-3 text-sm p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {getActivityIcon(item.text, item.type)}
                <span className="flex-1 text-gray-700 dark:text-gray-300">{item.text}</span>
                <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{item.time}</span>
              </div>
            ))}
            {activity.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                Aucune activité récente
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accès rapide */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Accès rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="group flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow hover:shadow-xl transition-all hover:scale-105 border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400"
            >
              <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-xl mb-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-800 transition-colors">
                <link.icon size={32} className="text-blue-600 dark:text-blue-300" />
              </div>
              <span className="font-medium text-center text-gray-900 dark:text-white">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}