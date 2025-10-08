// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
// ✅ APRÈS
import { Package, Truck, Users, Calendar, Download, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
} from "date-fns";
import { fr } from "date-fns/locale";

export default function Dashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    stocks: 0,
    chargements: 0,
    receptions: 0,
    utilisateurs: 0,
  });

  const [chartData, setChartData] = useState<
    { day: string; entrees: number; sorties: number }[]
  >([]);

  const [activity, setActivity] = useState<
    { id: string; text: string; time: string }[]
  >([]);

  const [weekOffset, setWeekOffset] = useState(0);

  // Charger les KPI globaux
  useEffect(() => {
    const loadStats = async () => {
      if (!user?.company_id) return;
      
      setLoading(true);

      try {
        // Stocks suivis : nombre de SKU distincts
        const { data: stockData } = await supabase
          .from("stocks")
          .select("ean")
          .eq("company_id", user.company_id);

        const uniqueSkus = stockData
          ? new Set(stockData.map((s) => s.ean)).size
          : 0;

        // Utilisateurs actifs
        const { count: userCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("company_id", user.company_id);

        setStats((prev) => ({
          ...prev,
          stocks: uniqueSkus,
          utilisateurs: userCount || 0,
        }));
      } catch (error) {
        console.error("Erreur chargement stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user?.company_id]);

  // Charger le graphique Entrées vs Sorties
  useEffect(() => {
    const loadChartData = async () => {
      if (!user?.company_id) return;

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
        return;
      }

      const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      const result = days.map((d) => ({ day: d, entrees: 0, sorties: 0 }));

      data?.forEach((row) => {
        // Fix bug timezone : forcer date locale
        const [year, month, day] = row.date.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        const dayIndex = localDate.getDay();
        const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        
        if (row.type === "Réception") result[mappedIndex].entrees++;
        if (row.type === "Expédition") result[mappedIndex].sorties++;
      });

      setChartData(result);

      // Mettre à jour les KPI
      const recepCount = data?.filter((r) => r.type === "Réception").length || 0;
      const loadCount = data?.filter((r) => r.type === "Expédition").length || 0;

      setStats((prev) => ({
        ...prev,
        chargements: loadCount,
        receptions: recepCount,
      }));
    };

    loadChartData();
  }, [user?.company_id, weekOffset]);

  // Charger activité récente
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
          }))
        );
      }
    };

    loadActivity();

    // Realtime
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

  // Calcul période affichée
  const today = new Date();
  const currentWeek = addWeeks(today, weekOffset);
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekRange = `${format(weekStart, "dd MMM", { locale: fr })} - ${format(
    weekEnd,
    "dd MMM yyyy",
    { locale: fr }
  )}`;

  // Export des données
  const exportData = () => {
    const data = {
      period: weekRange,
      stats,
      chartData,
      activity: activity.slice(0, 5),
      exportedAt: new Date().toLocaleString("fr-FR"),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Icônes pour activité
  const getActivityIcon = (message: string) => {
    const msg = message.toLowerCase();
    if (msg.includes('stock')) return <Package size={16} className="text-blue-500" />;
    if (msg.includes('utilisateur') || msg.includes('user')) return <Users size={16} className="text-green-500" />;
    if (msg.includes('planning') || msg.includes('chargement')) return <Calendar size={16} className="text-purple-500" />;
    if (msg.includes('camion') || msg.includes('truck')) return <Truck size={16} className="text-orange-500" />;
    return <TrendingUp size={16} className="text-gray-500" />;
  };

  const quickLinks = [
    { label: "Stocks", icon: Package, path: "/app/stock/synoptique" },
    { label: "Planning", icon: Calendar, path: "/app/planning" },
    { label: "Chargement 3D", icon: Truck, path: "/app/loading-view" },
    { label: "Chat", icon: Users, path: "/app/chat" },
  ];

  // Skeleton loader
  const KPISkeleton = () => (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
    </div>
  );

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">
            Bonjour {user?.name}
          </h1>
          {user?.company_name && (
            <p className="text-gray-500 mt-1">
              Vous êtes connecté à{" "}
              <span className="font-semibold">{user.company_name}</span>
            </p>
          )}
        </div>
        
        <button
          onClick={exportData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          aria-label="Exporter les données du dashboard"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Exporter</span>
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <>
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
          </>
        ) : (
          <>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Stocks suivis</p>
                <Package size={20} className="text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{stats.stocks}</p>
              <p className="text-xs text-gray-400 mt-1">SKU uniques</p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Chargements prévus</p>
                <Truck size={20} className="text-purple-500" />
              </div>
              <p className="text-2xl font-bold">{stats.chargements}</p>
              <p className="text-xs text-gray-400 mt-1">Cette semaine</p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Réceptions prévues</p>
                <Calendar size={20} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold">{stats.receptions}</p>
              <p className="text-xs text-gray-400 mt-1">Cette semaine</p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Utilisateurs actifs</p>
                <Users size={20} className="text-orange-500" />
              </div>
              <p className="text-2xl font-bold">{stats.utilisateurs}</p>
              <p className="text-xs text-gray-400 mt-1">Dans l'entreprise</p>
            </div>
          </>
        )}
      </div>

      {/* Graphique avec navigation */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Flux logistiques</h2>
            <p className="text-sm text-gray-500">{weekRange}</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Semaine précédente"
            >
              ← Précédente
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              aria-label="Revenir à cette semaine"
            >
              Cette semaine
            </button>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Semaine suivante"
            >
              Suivante →
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="entrees" 
              fill="#2792B0" 
              radius={[6, 6, 0, 0]}
              name="Réceptions"
            />
            <Bar 
              dataKey="sorties" 
              fill="#6C63FF" 
              radius={[6, 6, 0, 0]}
              name="Expéditions"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Activité récente */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Activité récente</h2>
        <ul className="space-y-3">
          {activity.map((item) => (
            <li 
              key={item.id} 
              className="flex items-center gap-3 text-sm p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {getActivityIcon(item.text)}
              <span className="flex-1">{item.text}</span>
              <span className="text-gray-500 text-xs whitespace-nowrap">{item.time}</span>
            </li>
          ))}
          {activity.length === 0 && (
            <li className="text-center text-gray-500 py-8">
              Aucune activité récente
            </li>
          )}
        </ul>
      </div>

      {/* Accès rapide */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Accès rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow hover:shadow-lg transition-all hover:scale-105"
            >
              <link.icon size={32} className="text-blue-600 mb-2" />
              <span className="font-medium text-center">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}