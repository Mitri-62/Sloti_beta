// src/components/ForecastView.tsx - VERSION 10/10 COMPLETE
import { useState, useMemo, useEffect } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Area, AreaChart
} from "recharts";
import { usePlannings, Planning } from "../hooks/usePlannings";
import { format, getWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  TrendingUp, TrendingDown, Minus, AlertTriangle, Calendar,
  TrendingUpIcon, Package, Truck, Download, 
  ChevronDown, ChevronUp, RotateCcw, CheckCircle,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

// ============================================================
// TYPES
// ============================================================

type SectionId = 'insights' | 'alerts' | 'kpis' | 'chart' | 'summary' | 'methodology';

interface GridSection {
  id: SectionId;
  title: string;
  collapsed: boolean;
}

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

interface Insight {
  type: 'warning' | 'info' | 'success';
  icon: string;
  title: string;
  message: string;
  action: string;
}

// ============================================================
// HOOKS
// ============================================================

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getWeekKey = (date: Date): string => {
  const year = date.getFullYear();
  const week = getWeek(date, { weekStartsOn: 1 });
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

function calculateForecast(
  plannings: Planning[], 
  weeks: number,
  type: "Réception" | "Expédition",
  transporterFilter?: string
): Record<number, number> {
  const today = new Date();
  const limit = new Date();
  limit.setDate(today.getDate() - weeks * 7);

  let filtered = plannings.filter(
    (p) => p.type === type && parseDate(p.date) >= limit && parseDate(p.date) < today
  );

  if (transporterFilter && transporterFilter !== "Tous") {
    filtered = filtered.filter(p => p.transporter === transporterFilter);
  }

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

  const averages: Record<number, number> = {};
  Object.keys(byDayOfWeek).forEach((dow) => {
    const weekCounts = Object.values(byDayOfWeek[+dow]);
    const counts = weekCounts.map(w => type === "Réception" ? w.receptions : w.expeditions);
    const sum = counts.reduce((a, b) => a + b, 0);
    averages[+dow] = counts.length > 0 ? sum / counts.length : 0;
  });

  return averages;
}

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

function generateInsights(stats: any, alerts: any[]): Insight[] {
  const insights: Insight[] = [];
  
  // Insight 1 : Jour le plus chargé
  if (stats.peakDay.total > stats.historicalAverage * 1.3) {
    const percentAbove = Math.round(((stats.peakDay.total - stats.historicalAverage) / stats.historicalAverage) * 100);
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Pic de charge prévu',
      message: `${stats.peakDay.dayName} sera ${percentAbove}% plus chargé que la moyenne (${stats.peakDay.total} événements)`,
      action: 'Envisagez d\'ajouter +2 quais ou de réorganiser les créneaux horaires'
    });
  }
  
  // Insight 2 : Tendance croissante
  if (stats.recTrend.trend === 'increasing' && stats.recTrend.percent > 20) {
    insights.push({
      type: 'info',
      icon: '📈',
      title: 'Croissance des réceptions',
      message: `Les réceptions sont en hausse de ${stats.recTrend.percent}% sur la période`,
      action: 'Anticipez une augmentation des besoins en espace de stockage (+30%)'
    });
  }
  
  if (stats.expTrend.trend === 'increasing' && stats.expTrend.percent > 20) {
    insights.push({
      type: 'info',
      icon: '📦',
      title: 'Hausse des expéditions',
      message: `Les expéditions augmentent de ${stats.expTrend.percent}%`,
      action: 'Prévoyez du personnel supplémentaire pour la préparation des commandes'
    });
  }
  
  // Insight 3 : Jour calme - opportunité
  if (stats.calmDay.total < stats.historicalAverage * 0.6) {
    insights.push({
      type: 'success',
      icon: '💡',
      title: 'Opportunité d\'optimisation',
      message: `${stats.calmDay.dayName} est peu chargé avec seulement ${stats.calmDay.total} événements`,
      action: 'Planifiez maintenance, inventaires ou formations sur ce créneau'
    });
  }
  
  // Insight 4 : Charge équilibrée
  if (alerts.length === 0 && Math.abs(stats.peakDay.total - stats.calmDay.total) < stats.historicalAverage * 0.5) {
    insights.push({
      type: 'success',
      icon: '✅',
      title: 'Charge bien équilibrée',
      message: 'La répartition des événements sur la semaine est optimale',
      action: 'Maintenez cette organisation pour maximiser l\'efficacité'
    });
  }
  
  return insights;
}

// ============================================================
// LAYOUTS PAR DÉFAUT
// ============================================================

const defaultLayouts = {
  lg: [
    { i: 'insights', x: 0, y: 0, w: 12, h: 4, minW: 6, minH: 3 },
    { i: 'alerts', x: 0, y: 4, w: 12, h: 3, minW: 6, minH: 2 },
    { i: 'kpis', x: 0, y: 7, w: 12, h: 4, minW: 6, minH: 3 },
    { i: 'chart', x: 0, y: 11, w: 12, h: 7, minW: 6, minH: 5 },
    { i: 'summary', x: 0, y: 18, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'methodology', x: 6, y: 18, w: 6, h: 5, minW: 3, minH: 3 },
  ],
  md: [
    { i: 'insights', x: 0, y: 0, w: 10, h: 4, minW: 5, minH: 3 },
    { i: 'alerts', x: 0, y: 4, w: 10, h: 3, minW: 5, minH: 2 },
    { i: 'kpis', x: 0, y: 7, w: 10, h: 4, minW: 5, minH: 3 },
    { i: 'chart', x: 0, y: 11, w: 10, h: 7, minW: 5, minH: 5 },
    { i: 'summary', x: 0, y: 18, w: 5, h: 5, minW: 3, minH: 3 },
    { i: 'methodology', x: 5, y: 18, w: 5, h: 5, minW: 3, minH: 3 },
  ],
  sm: [
    { i: 'insights', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'alerts', x: 0, y: 4, w: 6, h: 3, minW: 3, minH: 2 },
    { i: 'kpis', x: 0, y: 7, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'chart', x: 0, y: 11, w: 6, h: 7, minW: 3, minH: 5 },
    { i: 'summary', x: 0, y: 18, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'methodology', x: 0, y: 23, w: 6, h: 5, minW: 3, minH: 3 },
  ],
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

interface ForecastViewProps {
  companyId: string;
  onCreateEvent?: () => void;
}

export default function ForecastView({ companyId, onCreateEvent }: ForecastViewProps) {
  const { plannings, loading } = usePlannings(companyId);
  const [weeks, setWeeks] = useState(4);
  const [forecastDays, setForecastDays] = useState(7);
  const [viewMode, setViewMode] = useState<"bar" | "line" | "area">("bar");
  const isMobile = useIsMobile();

  // Charger layouts et sections depuis localStorage
  const loadFromStorage = () => {
    try {
      const savedLayouts = localStorage.getItem('forecast-layouts');
      const savedSections = localStorage.getItem('forecast-sections');
      
      return {
        layouts: savedLayouts ? JSON.parse(savedLayouts) : defaultLayouts,
        sections: savedSections ? JSON.parse(savedSections) : [
          { id: 'insights', title: '💡 Insights IA', collapsed: false },
          { id: 'alerts', title: 'Alertes de surcharge', collapsed: false },
          { id: 'kpis', title: 'Indicateurs clés', collapsed: false },
          { id: 'chart', title: 'Graphique prévisionnel', collapsed: false },
          { id: 'summary', title: 'Résumé statistique', collapsed: false },
          { id: 'methodology', title: 'Méthodologie', collapsed: false },
        ]
      };
    } catch (error) {
      return { 
        layouts: defaultLayouts, 
        sections: [
          { id: 'insights', title: '💡 Insights IA', collapsed: false },
          { id: 'alerts', title: 'Alertes de surcharge', collapsed: false },
          { id: 'kpis', title: 'Indicateurs clés', collapsed: false },
          { id: 'chart', title: 'Graphique prévisionnel', collapsed: false },
          { id: 'summary', title: 'Résumé statistique', collapsed: false },
          { id: 'methodology', title: 'Méthodologie', collapsed: false },
        ]
      };
    }
  };

  const [layouts, setLayouts] = useState(loadFromStorage().layouts);
  const [sections, setSections] = useState<GridSection[]>(loadFromStorage().sections);

  // Sauvegarder dans localStorage
  const saveToStorage = (newLayouts: any, newSections: GridSection[]) => {
    try {
      localStorage.setItem('forecast-layouts', JSON.stringify(newLayouts));
      localStorage.setItem('forecast-sections', JSON.stringify(newSections));
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  const { forecasts, stats, alerts, insights } = useMemo(() => {
    if (plannings.length === 0) {
      return { forecasts: [], stats: null, alerts: [], insights: [] };
    }

    const today = new Date();
    
    const recAvg = calculateForecast(plannings, weeks, "Réception");
    const expAvg = calculateForecast(plannings, weeks, "Expédition");

    const historicalTotal = Object.values(recAvg).reduce((a, b) => a + b, 0) + 
                           Object.values(expAvg).reduce((a, b) => a + b, 0);
    const historicalAverage = historicalTotal / 7;

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

    const totalHistoric = plannings.length;
    const historicReceptions = plannings.filter(p => p.type === "Réception").length;
    const historicExpeditions = plannings.filter(p => p.type === "Expédition").length;
    
    const recTrend = detectTrend(Object.values(recAvg));
    const expTrend = detectTrend(Object.values(expAvg));

    const peakDay = data.reduce((max, day) => day.total > max.total ? day : max, data[0]);
    const calmDay = data.reduce((min, day) => day.total < min.total ? day : min, data[0]);

    const overloadThreshold = historicalAverage * 1.5;
    const alertsList = data
      .filter(day => day.total > overloadThreshold)
      .map(day => ({
        date: day.date,
        dayName: day.dayName,
        total: day.total,
        percent: Math.round(((day.total - historicalAverage) / historicalAverage) * 100)
      }));

    const statsData = {
      totalHistoric,
      historicReceptions,
      historicExpeditions,
      recTrend,
      expTrend,
      peakDay,
      calmDay,
      historicalAverage,
      totalForecast: data.reduce((sum, day) => sum + day.total, 0),
    };

    const insightsData = generateInsights(statsData, alertsList);

    return { 
      forecasts: data, 
      stats: statsData,
      alerts: alertsList,
      insights: insightsData
    };
  }, [plannings, weeks, forecastDays]);

  const handleLayoutChange = (_newLayout: Layout[], allLayouts: any) => {
    setLayouts(allLayouts);
    saveToStorage(allLayouts, sections);
  };

  const toggleCollapse = (id: SectionId) => {
    const newSections = sections.map(s => 
      s.id === id ? { ...s, collapsed: !s.collapsed } : s
    );
    setSections(newSections);
    saveToStorage(layouts, newSections);
  };

  const resetLayout = () => {
    setLayouts(defaultLayouts);
    const defaultSections = [
      { id: 'insights', title: '💡 Insights IA', collapsed: false },
      { id: 'alerts', title: 'Alertes de surcharge', collapsed: false },
      { id: 'kpis', title: 'Indicateurs clés', collapsed: false },
      { id: 'chart', title: 'Graphique prévisionnel', collapsed: false },
      { id: 'summary', title: 'Résumé statistique', collapsed: false },
      { id: 'methodology', title: 'Méthodologie', collapsed: false },
    ] as GridSection[];
    setSections(defaultSections);
    saveToStorage(defaultLayouts, defaultSections);
    toast.success("Layout réinitialisé");
  };

  const handleExportPDF = () => {
    if (!stats) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Prévisions Planning", 14, 20);
    doc.setFontSize(11);
    doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm")}`, 14, 28);
    
    const tableData = forecasts.map(f => [
      format(parseDate(f.date), 'dd/MM/yyyy'),
      f.dayName,
      f.receptions.toString(),
      f.expeditions.toString(),
      f.total.toString()
    ]);

    (doc as any).autoTable({
      startY: 35,
      head: [["Date", "Jour", "Réceptions", "Expéditions", "Total"]],
      body: tableData,
    });

    doc.save(`previsions_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Export PDF réussi");
  };

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    if (trend === 'increasing') return <TrendingUp className="text-green-600 dark:text-green-400" size={20} />;
    if (trend === 'decreasing') return <TrendingDown className="text-red-600 dark:text-red-400" size={20} />;
    return <Minus className="text-gray-600 dark:text-gray-400" size={20} />;
  };

  // ============================================================
  // RENDER SECTIONS
  // ============================================================

  const renderSection = (sectionId: SectionId) => {
    if (!stats) return null;

    const section = sections.find(s => s.id === sectionId);
    if (!section) return null;

    const renderContent = () => {
      if (section.collapsed) return null;

      switch (sectionId) {
        case 'insights':
          return (
            <div className="flex-1 overflow-auto min-h-0 p-4">
              <div className="space-y-3 animate-slide-in">
                {insights.map((insight, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-xl border-2 shadow-sm hover:shadow-lg transition-all duration-300 ${
                      insight.type === 'warning' 
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-400 dark:border-yellow-600'
                        : insight.type === 'info'
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-400 dark:border-blue-600'
                        : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-400 dark:border-green-600'
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl flex-shrink-0">{insight.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                          {insight.title}
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {insight.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-lg">
                          <Lightbulb size={14} className="flex-shrink-0" />
                          <span className="truncate">{insight.action}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );

        case 'alerts':
          return (
            <div className="flex-1 overflow-auto min-h-0 p-4">
              {alerts.length > 0 ? (
                <div className="relative">
                  {/* Fond animé */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl animate-pulse"></div>
                  
                  {/* Contenu */}
                  <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-red-500 dark:border-red-400 rounded-xl p-6 shadow-lg animate-pulse-border">
                    {/* Icône et titre */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400 animate-bounce" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full animate-ping"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-red-800 dark:text-red-200">
                          ⚠️ {alerts.length} jour{alerts.length > 1 ? 's' : ''} de surcharge détecté{alerts.length > 1 ? 's' : ''}
                        </h3>
                        <p className="text-sm text-red-600 dark:text-red-300">
                          Dépassement du seuil de +50% de la moyenne
                        </p>
                      </div>
                    </div>
                    
                    {/* Liste des alertes */}
                    <div className="space-y-2">
                      {alerts.map((alert, idx) => (
                        <div 
                          key={alert.date}
                          className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700 hover:shadow-md transition-all animate-slide-in"
                          style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                            <div>
                              <p className="font-semibold text-red-800 dark:text-red-200 capitalize">
                                {format(parseDate(alert.date), 'EEEE dd MMMM', { locale: fr })}
                              </p>
                              <p className="text-sm text-red-600 dark:text-red-300">
                                {alert.total} événements prévus
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="px-3 py-1 bg-red-600 text-white rounded-full font-bold text-sm">
                              +{alert.percent}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                    ✅ Aucune surcharge détectée
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    La charge est équilibrée sur la période
                  </p>
                </div>
              )}
            </div>
          );

        case 'kpis':
          return (
            <div className="flex-1 overflow-auto min-h-0 p-4">
              <div className="grid gap-3 min-h-full" style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))'
              }}>
                <div className="kpi-card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-3 rounded-lg min-w-0 shadow-sm">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100 truncate">Moyenne/jour</span>
                    <Calendar className="text-blue-600 dark:text-blue-300 flex-shrink-0" size={16} />
                  </div>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-200">
                    {Math.round(stats.historicalAverage)}
                  </p>
                </div>

                <div className="kpi-card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-3 rounded-lg min-w-0 shadow-sm">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-xs font-medium text-green-900 dark:text-green-100 truncate">Réceptions</span>
                    <Package className="text-green-600 dark:text-green-300 flex-shrink-0" size={16} />
                  </div>
                  <p className="text-xl font-bold text-green-700 dark:text-green-200">
                    {stats.historicReceptions}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(stats.recTrend.trend)}
                    <span className="text-xs text-green-600 dark:text-green-300 truncate">
                      {stats.recTrend.trend === 'stable' ? 'Stable' : 
                       `${stats.recTrend.trend === 'increasing' ? '+' : '-'}${stats.recTrend.percent}%`}
                    </span>
                  </div>
                </div>

                <div className="kpi-card bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 p-3 rounded-lg min-w-0 shadow-sm">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-xs font-medium text-orange-900 dark:text-orange-100 truncate">Expéditions</span>
                    <Truck className="text-orange-600 dark:text-orange-300 flex-shrink-0" size={16} />
                  </div>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-200">
                    {stats.historicExpeditions}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(stats.expTrend.trend)}
                    <span className="text-xs text-orange-600 dark:text-orange-300 truncate">
                      {stats.expTrend.trend === 'stable' ? 'Stable' : 
                       `${stats.expTrend.trend === 'increasing' ? '+' : '-'}${stats.expTrend.percent}%`}
                    </span>
                  </div>
                </div>

                <div className="kpi-card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-3 rounded-lg min-w-0 shadow-sm">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-xs font-medium text-purple-900 dark:text-purple-100 truncate">Jour Pic</span>
                    <TrendingUpIcon className="text-purple-600 dark:text-purple-300 flex-shrink-0" size={16} />
                  </div>
                  <p className="text-base font-bold text-purple-700 dark:text-purple-200 capitalize truncate">
                    {stats.peakDay.dayName}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                    {stats.peakDay.total} événements
                  </p>
                </div>
              </div>
            </div>
          );

        case 'chart':
          return (
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <div className="flex gap-2 mb-4 flex-shrink-0 flex-wrap">
                {['bar', 'line', 'area'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as any)}
                    className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-all ${
                      viewMode === mode 
                        ? "bg-blue-600 text-white shadow-md" 
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {mode === 'bar' ? 'Barres' : mode === 'line' ? 'Courbe' : 'Aires'}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === "bar" ? (
                    <BarChart data={forecasts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="dayName" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', fontSize: '12px' }} />
                      <Bar dataKey="receptions" fill="#3b82f6" name="Réceptions" />
                      <Bar dataKey="expeditions" fill="#f97316" name="Expéditions" />
                    </BarChart>
                  ) : viewMode === "line" ? (
                    <LineChart data={forecasts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="dayName" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="receptions" stroke="#3b82f6" strokeWidth={2} name="Réceptions" />
                      <Line type="monotone" dataKey="expeditions" stroke="#f97316" strokeWidth={2} name="Expéditions" />
                    </LineChart>
                  ) : (
                    <AreaChart data={forecasts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="dayName" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="receptions" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="expeditions" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          );

        case 'summary':
          return (
            <div className="flex-1 overflow-auto min-h-0 p-4">
              <div className="space-y-3 min-w-0">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📈 Analyse</h4>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600 dark:text-gray-400 truncate">Période :</span>
                      <span className="font-medium text-gray-900 dark:text-white flex-shrink-0">{weeks} semaines</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600 dark:text-gray-400 truncate">Total historique :</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">{stats.totalHistoric}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">🔮 Prévision</h4>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600 dark:text-gray-400 truncate">Période :</span>
                      <span className="font-medium text-gray-900 dark:text-white flex-shrink-0">{forecastDays} jours</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600 dark:text-gray-400 truncate">Total prévu :</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">{stats.totalForecast}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        case 'methodology':
          return (
            <div className="flex-1 overflow-auto min-h-0 p-4">
              <div className="text-xs sm:text-sm text-blue-900 dark:text-blue-200 min-w-0">
                <p className="font-semibold mb-2">📊 Méthodologie</p>
                <p className="text-blue-700 dark:text-blue-300 text-xs">
                  Prévisions basées sur la moyenne d'événements par jour de semaine sur {weeks} semaines. 
                  Alertes déclenchées au-delà de 150% de la charge moyenne.
                </p>
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div className="h-full w-full flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Header avec zone drag séparée */}
        <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
          {/* Zone de drag - à gauche */}
          {!isMobile && (
            <div className="drag-handle flex items-center gap-2 cursor-move flex-1 mr-2 min-w-0">
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <div className="w-3 sm:w-4 h-0.5 bg-gray-400 dark:bg-gray-500 rounded"></div>
                <div className="w-3 sm:w-4 h-0.5 bg-gray-400 dark:bg-gray-500 rounded"></div>
                <div className="w-3 sm:w-4 h-0.5 bg-gray-400 dark:bg-gray-500 rounded"></div>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                {section.title}
              </h3>
            </div>
          )}
          
          {isMobile && (
            <h3 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm truncate flex-1">
              {section.title}
            </h3>
          )}
          
          {/* Bouton collapse - à droite - CLIQUABLE */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(sectionId);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
            aria-label={section.collapsed ? "Déplier" : "Replier"}
            aria-expanded={!section.collapsed}
          >
            {section.collapsed ? (
              <ChevronDown size={16} className="text-gray-600 dark:text-gray-300" />
            ) : (
              <ChevronUp size={16} className="text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>
        
        {/* Contenu avec hauteur et largeur dynamique */}
        {renderContent()}
      </div>
    );
  };

  // ============================================================
  // ONBOARDING
  // ============================================================

  if (!stats || stats.totalHistoric < 10) {
    const progress = stats?.totalHistoric || 0;
    const remaining = 10 - progress;
    
    return (
      <div className="space-y-6">
        {/* Header simplifié */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Prévisions Planning
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyse prédictive basée sur l'historique
          </p>
        </div>

        {/* Hero onboarding */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8 border-2 border-purple-200 dark:border-purple-700 shadow-xl animate-slide-in">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Illustration */}
              <div className="text-7xl animate-bounce">📊</div>
              
              {/* Contenu */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Construisez vos prévisions intelligentes
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Créez encore <span className="font-bold text-purple-600 dark:text-purple-400">{remaining} événement{remaining > 1 ? 's' : ''}</span> pour débloquer l'analyse prédictive
                </p>
                
                {/* Barre de progression */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progression
                    </span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      {progress}/10
                    </span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                      style={{ width: `${(progress / 10) * 100}%` }}
                    >
                      {progress > 2 && (
                        <span className="text-xs font-bold text-white">
                          {Math.round((progress / 10) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Bénéfices */}
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    🎯 Ce que vous débloquerez :
                  </p>
                  <div className="space-y-2 text-sm">
                    {[
                      { icon: '🚨', text: 'Alertes de surcharge automatiques', done: progress >= 3 },
                      { icon: '📊', text: 'Graphiques de tendances', done: progress >= 5 },
                      { icon: '💡', text: 'Insights IA actionnables', done: progress >= 7 },
                      { icon: '🔮', text: 'Prévisions sur 14 jours', done: progress >= 10 },
                    ].map((benefit, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center gap-3 ${
                          benefit.done 
                            ? 'text-green-700 dark:text-green-400' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <span className="text-xl">{benefit.icon}</span>
                        <span className={benefit.done ? 'font-semibold' : ''}>
                          {benefit.text}
                        </span>
                        {benefit.done && <CheckCircle size={16} className="ml-auto text-green-600" />}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* CTA */}
                <button
                  onClick={() => {
                    if (onCreateEvent) {
                      onCreateEvent();
                    }
                  }}
                  className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  ➕ Créer mon premier événement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Prévisions Planning
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Analyse prédictive basée sur {stats?.totalHistoric || 0} événements historiques
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
          
          {!isMobile && (
            <button
              onClick={resetLayout}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Période historique
          </label>
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            {[2, 4, 6, 8, 12].map(w => (
              <option key={w} value={w}>{w} semaines</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Prévision
          </label>
          <select
            value={forecastDays}
            onChange={(e) => setForecastDays(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            {[1, 3, 7, 14].map(d => (
              <option key={d} value={d}>{d} jour{d > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Layout ou Mobile View */}
      {isMobile ? (
        <div className="space-y-4">
          {sections.map(section => (
            <div key={section.id}>
              {renderSection(section.id)}
            </div>
          ))}
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 10, sm: 6 }}
          rowHeight={60}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          isDraggable={true}
          isResizable={true}
        >
          {sections.map(section => (
            <div key={section.id} className="h-full w-full">
              {renderSection(section.id)}
            </div>
          ))}
        </ResponsiveGridLayout>
      )}

      {/* Styles */}
      <style>{`
        /* Grid Layout */
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }
        .react-grid-item.resizing {
          transition: none;
          z-index: 100;
        }
        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .react-grid-placeholder {
          background: #3b82f6;
          opacity: 0.2;
          transition-duration: 100ms;
          z-index: 2;
          border-radius: 0.5rem;
        }
        .drag-handle {
          cursor: move !important;
        }

        /* Animations personnalisées */
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-border {
          0%, 100% {
            border-color: rgba(239, 68, 68, 0.5);
          }
          50% {
            border-color: rgba(239, 68, 68, 1);
          }
        }
        
        .animate-slide-in {
          animation: slideInUp 0.5s ease-out;
        }
        
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
        
        /* Hover effect sur les KPIs */
        .kpi-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .kpi-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}