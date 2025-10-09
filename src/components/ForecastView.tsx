// src/components/ForecastView.tsx
import { useState, useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  ReferenceLine,
  CartesianGrid,
  Area,
  AreaChart
} from "recharts";
import { usePlannings, Planning } from "../hooks/usePlannings";
import { format, getWeek, addDays, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle,
  Calendar,
  TrendingUpIcon,
  Package,
  Truck,
  Download
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface ForecastData {
  date: string;
  dayName: string;
  receptions: number;
  expeditions: number;
  total: number;
  historicalAvg: number;
}

interface WeekStats {
  [weekKey: string]: {
    receptions: number;
    expeditions: number;
  };
}

// Parser date correctement (fix timezone)
const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Obtenir la clé de semaine
const getWeekKey = (date: Date): string => {
  const year = date.getFullYear();
  const week = getWeek(date, { weekStartsOn: 1 });
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

// Calculer les prévisions par type
function calculateForecast(
  plannings: Planning[], 
  weeks: number,
  type: "Réception" | "Expédition",
  transporterFilter?: string
): Record<number, number> {
  const today = new Date();
  const limit = new Date();
  limit.setDate(today.getDate() - weeks * 7);

  // Filtrer historique par type et transporteur
  let filtered = plannings.filter(
    (p) => p.type === type && parseDate(p.date) >= limit && parseDate(p.date) < today
  );

  if (transporterFilter && transporterFilter !== "Tous") {
    filtered = filtered.filter(p => p.transporter === transporterFilter);
  }

  // Grouper par jour de semaine ET par semaine
  const byDayOfWeek: Record<number, WeekStats> = {};

  filtered.forEach((ev) => {
    const date = parseDate(ev.date);
    const dow = date.getDay();
    const weekKey = getWeekKey(date);

    if (!byDayOfWeek[dow]) byDayOfWeek[dow] = {};
    if (!byDayOfWeek[dow][weekKey]) {
      byDayOfWeek[dow][weekKey] = { receptions: 0, expeditions: 0 };
    }

    if (type === "Réception") {
      byDayOfWeek[dow][weekKey].receptions++;
    } else {
      byDayOfWeek[dow][weekKey].expeditions++;
    }
  });

  // Calculer moyenne par jour de semaine
  const averages: Record<number, number> = {};
  Object.keys(byDayOfWeek).forEach((dow) => {
    const weekCounts = Object.values(byDayOfWeek[+dow]);
    const counts = weekCounts.map(w => type === "Réception" ? w.receptions : w.expeditions);
    const sum = counts.reduce((a, b) => a + b, 0);
    averages[+dow] = counts.length > 0 ? sum / counts.length : 0;
  });

  return averages;
}

// Détecter tendance
function detectTrend(data: number[]): { trend: 'increasing' | 'decreasing' | 'stable'; percent: number } {
  if (data.length < 4) return { trend: 'stable', percent: 0 };
  
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  
  const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const diff = avg1 > 0 ? ((avg2 - avg1) / avg1) * 100 : 0;
  
  if (diff > 10) return { trend: 'increasing', percent: Math.round(diff) };
  if (diff < -10) return { trend: 'decreasing', percent: Math.round(Math.abs(diff)) };
  return { trend: 'stable', percent: 0 };
}

export default function ForecastView({ companyId }: { companyId: string }) {
  const { plannings, loading } = usePlannings(companyId);
  const [weeks, setWeeks] = useState(4);
  const [forecastDays, setForecastDays] = useState(7);
  const [transporterFilter, setTransporterFilter] = useState<string>("Tous");
  const [viewMode, setViewMode] = useState<"bar" | "line" | "area">("bar");

  // Liste des transporteurs
  const transporters = useMemo(() => {
    return [...new Set(plannings.map(p => p.transporter))].filter(Boolean).sort();
  }, [plannings]);

  // Calcul des prévisions mémorisé
  const { forecasts, stats, alerts } = useMemo(() => {
    if (plannings.length === 0) {
      return { forecasts: [], stats: null, alerts: [] };
    }

    const today = new Date();
    
    // Calculer prévisions pour chaque type
    const recAvg = calculateForecast(plannings, weeks, "Réception", transporterFilter);
    const expAvg = calculateForecast(plannings, weeks, "Expédition", transporterFilter);

    // Calculer moyenne historique globale
    const historicalTotal = Object.values(recAvg).reduce((a, b) => a + b, 0) + 
                           Object.values(expAvg).reduce((a, b) => a + b, 0);
    const historicalAverage = historicalTotal / 7;

    // Générer prévisions pour les N prochains jours
    const data: ForecastData[] = [];
    for (let i = 1; i <= forecastDays; i++) {
      const d = addDays(today, i);
      const dow = d.getDay();
      
      const rec = Math.round(recAvg[dow] || 0);
      const exp = Math.round(expAvg[dow] || 0);
      
      data.push({
        date: format(d, 'yyyy-MM-dd'),
        dayName: format(d, 'EEEE', { locale: fr }),
        receptions: rec,
        expeditions: exp,
        total: rec + exp,
        historicalAvg: Math.round(historicalAverage),
      });
    }

    // Stats globales
    let filteredPlannings = plannings;
    if (transporterFilter !== "Tous") {
      filteredPlannings = plannings.filter(p => p.transporter === transporterFilter);
    }

    const totalHistoric = filteredPlannings.length;
    const historicReceptions = filteredPlannings.filter(p => p.type === "Réception").length;
    const historicExpeditions = filteredPlannings.filter(p => p.type === "Expédition").length;
    
    const recTrend = detectTrend(Object.values(recAvg));
    const expTrend = detectTrend(Object.values(expAvg));

    // Identifier les jours de pointe
    const peakDay = data.reduce((max, day) => day.total > max.total ? day : max, data[0]);
    const calmDay = data.reduce((min, day) => day.total < min.total ? day : min, data[0]);

    // Alertes de surcharge (>150% de la moyenne)
    const overloadThreshold = historicalAverage * 1.5;
    const alerts = data
      .filter(day => day.total > overloadThreshold)
      .map(day => ({
        date: day.date,
        dayName: day.dayName,
        total: day.total,
        percent: Math.round(((day.total - historicalAverage) / historicalAverage) * 100)
      }));

    return { 
      forecasts: data, 
      stats: {
        totalHistoric,
        historicReceptions,
        historicExpeditions,
        recTrend,
        expTrend,
        peakDay,
        calmDay,
        historicalAverage,
        totalForecast: data.reduce((sum, day) => sum + day.total, 0),
      },
      alerts
    };
  }, [plannings, weeks, forecastDays, transporterFilter]);

  /**
   * Export PDF des prévisions
   */
  const handleExportPDF = () => {
    if (!stats) return;

    const doc = new jsPDF();
    
    // En-tête
    doc.setFontSize(18);
    doc.text("Prévisions Planning", 14, 20);
    doc.setFontSize(11);
    doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm")}`, 14, 28);
    doc.text(`Période d'analyse : ${weeks} semaines`, 14, 34);
    if (transporterFilter !== "Tous") {
      doc.text(`Transporteur : ${transporterFilter}`, 14, 40);
    }

    // KPIs
    doc.setFontSize(14);
    doc.text("Indicateurs clés", 14, 50);
    doc.setFontSize(10);
    doc.text(`• Total événements historiques : ${stats.totalHistoric}`, 14, 58);
    doc.text(`• Réceptions : ${stats.historicReceptions} (${stats.recTrend.trend})`, 14, 64);
    doc.text(`• Expéditions : ${stats.historicExpeditions} (${stats.expTrend.trend})`, 14, 70);
    doc.text(`• Moyenne journalière : ${Math.round(stats.historicalAverage)} événements`, 14, 76);

    // Tableau prévisions
    const tableData = forecasts.map(f => [
      format(parseDate(f.date), 'dd/MM/yyyy'),
      f.dayName,
      f.receptions.toString(),
      f.expeditions.toString(),
      f.total.toString()
    ]);

    (doc as any).autoTable({
      startY: 85,
      head: [["Date", "Jour", "Réceptions", "Expéditions", "Total"]],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    // Alertes
    if (alerts.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.text("⚠️ Alertes de surcharge", 14, finalY);
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      alerts.forEach((alert, i) => {
        doc.text(
          `• ${format(parseDate(alert.date), 'dd/MM')} (${alert.dayName}) : ${alert.total} événements (+${alert.percent}%)`,
          14,
          finalY + 8 + (i * 6)
        );
      });
    }

    doc.save(`previsions_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Export PDF réussi");
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement des prévisions...</p>
      </div>
    );
  }

  // Données insuffisantes
  if (!stats || stats.totalHistoric < 10) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 p-8 rounded-xl">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-yellow-600 flex-shrink-0" size={32} />
          <div>
            <h3 className="font-semibold text-yellow-800 text-lg mb-2">
              Données insuffisantes
            </h3>
            <p className="text-yellow-700 mb-2">
              Minimum <strong>10 événements</strong> historiques requis pour générer des prévisions fiables.
            </p>
            <p className="text-yellow-600 text-sm">
              Actuellement : <strong>{stats?.totalHistoric || 0}</strong> événements dans l'historique
            </p>
            <p className="text-yellow-600 text-sm mt-2">
              💡 Continuez à créer des événements dans votre planning pour activer les prévisions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    if (trend === 'increasing') return <TrendingUp className="text-green-600" size={20} />;
    if (trend === 'decreasing') return <TrendingDown className="text-red-600" size={20} />;
    return <Minus className="text-gray-600" size={20} />;
  };

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              📊 Prévisions & Analytics
            </h2>
            <p className="text-sm text-gray-500">
              Basé sur {weeks} semaines d'historique • {stats.totalHistoric} événements analysés
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select 
              value={transporterFilter}
              onChange={(e) => setTransporterFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="Tous">Tous les transporteurs</option>
              {transporters.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select 
              value={weeks} 
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value={2}>2 semaines</option>
              <option value={4}>4 semaines</option>
              <option value={8}>8 semaines</option>
              <option value={12}>12 semaines</option>
            </select>

            <select 
              value={forecastDays} 
              onChange={(e) => setForecastDays(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={30}>30 jours</option>
            </select>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={16} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Alertes de surcharge */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">
                ⚠️ Alerte : Jours de forte charge détectés
              </h3>
              <div className="space-y-1">
                {alerts.map(alert => (
                  <p key={alert.date} className="text-sm text-red-700">
                    • <strong>{format(parseDate(alert.date), 'EEEE dd MMMM', { locale: fr })}</strong> : 
                    {" "}{alert.total} événements prévus 
                    {" "}({alert.percent > 0 ? '+' : ''}{alert.percent}% vs moyenne)
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Moyenne journalière */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-900">Moyenne / jour</h3>
            <Calendar className="text-blue-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-blue-700">
            {Math.round(stats.historicalAverage)}
          </p>
          <p className="text-xs text-blue-600 mt-1">événements</p>
        </div>

        {/* Réceptions */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-900">Réceptions</h3>
            <Package className="text-green-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-green-700">
            {stats.historicReceptions}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {getTrendIcon(stats.recTrend.trend)}
            <span className="text-xs text-green-600">
              {stats.recTrend.trend === 'stable' ? 'Stable' : 
               `${stats.recTrend.trend === 'increasing' ? '+' : '-'}${stats.recTrend.percent}%`}
            </span>
          </div>
        </div>

        {/* Expéditions */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-orange-900">Expéditions</h3>
            <Truck className="text-orange-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-orange-700">
            {stats.historicExpeditions}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {getTrendIcon(stats.expTrend.trend)}
            <span className="text-xs text-orange-600">
              {stats.expTrend.trend === 'stable' ? 'Stable' : 
               `${stats.expTrend.trend === 'increasing' ? '+' : '-'}${stats.expTrend.percent}%`}
            </span>
          </div>
        </div>

        {/* Jour de pointe */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-purple-900">Jour de pointe</h3>
            <TrendingUpIcon className="text-purple-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-purple-700 capitalize">
            {stats.peakDay.dayName}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            {stats.peakDay.total} événements prévus
          </p>
        </div>
      </div>

      {/* Sélecteur de type de graphique */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("bar")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "bar" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Barres
        </button>
        <button
          onClick={() => setViewMode("line")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "line" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Courbe
        </button>
        <button
          onClick={() => setViewMode("area")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "area" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Aires
        </button>
      </div>

      {/* Graphique principal */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">
          Prévisions pour les {forecastDays} prochains jours
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          {viewMode === "bar" ? (
            <BarChart data={forecasts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="dayName" 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-4 border rounded-lg shadow-lg">
                        <p className="font-semibold mb-2 capitalize">
                          {data.dayName} {format(parseDate(data.date), 'dd/MM', { locale: fr })}
                        </p>
                        <p className="text-sm text-blue-600">
                          Réceptions : <strong>{data.receptions}</strong>
                        </p>
                        <p className="text-sm text-orange-600">
                          Expéditions : <strong>{data.expeditions}</strong>
                        </p>
                        <p className="text-sm text-gray-600 mt-1 pt-1 border-t">
                          Total : <strong>{data.total}</strong>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <ReferenceLine 
                y={stats.historicalAverage} 
                stroke="#ef4444" 
                strokeDasharray="3 3" 
                label={{ 
                  value: `Moyenne: ${Math.round(stats.historicalAverage)}`, 
                  position: 'right', 
                  fill: '#ef4444', 
                  fontSize: 11 
                }}
              />
              <Bar 
                dataKey="receptions" 
                fill="#3b82f6" 
                name="Réceptions"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="expeditions" 
                fill="#f97316" 
                name="Expéditions"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : viewMode === "line" ? (
            <LineChart data={forecasts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dayName" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <ReferenceLine 
                y={stats.historicalAverage} 
                stroke="#ef4444" 
                strokeDasharray="3 3" 
              />
              <Line 
                type="monotone" 
                dataKey="receptions" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Réceptions"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="expeditions" 
                stroke="#f97316" 
                strokeWidth={3}
                name="Expéditions"
                dot={{ r: 4 }}
              />
            </LineChart>
          ) : (
            <AreaChart data={forecasts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dayName" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <ReferenceLine 
                y={stats.historicalAverage} 
                stroke="#ef4444" 
                strokeDasharray="3 3" 
              />
              <Area 
                type="monotone" 
                dataKey="receptions" 
                stackId="1"
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Réceptions"
              />
              <Area 
                type="monotone" 
                dataKey="expeditions" 
                stackId="1"
                stroke="#f97316" 
                fill="#f97316"
                fillOpacity={0.6}
                name="Expéditions"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Résumé statistique */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">📈 Période analysée</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Début :</span>
              <span className="font-medium">
                {format(addDays(new Date(), -weeks * 7), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fin :</span>
              <span className="font-medium">
                {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">Événements totaux :</span>
              <span className="font-bold text-blue-600">{stats.totalHistoric}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">🔮 Période de prévision</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Début :</span>
              <span className="font-medium">
                {format(addDays(new Date(), 1), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fin :</span>
              <span className="font-medium">
                {format(addDays(new Date(), forecastDays), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">Total prévu :</span>
              <span className="font-bold text-purple-600">{stats.totalForecast}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Note méthodologie */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-900">
        <p className="font-semibold mb-2">📊 Méthodologie de calcul</p>
        <p className="text-blue-700">
          Les prévisions sont calculées en analysant la moyenne d'événements par jour de semaine 
          sur les {weeks} dernières semaines. Les tendances détectent les variations significatives (&gt;10%) 
          entre la première et la seconde moitié de la période analysée. Les alertes sont générées 
          lorsqu'un jour dépasse 150% de la charge moyenne.
        </p>
      </div>
    </div>
  );
}