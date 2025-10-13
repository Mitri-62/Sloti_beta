// src/components/ForecastView.tsx - STYLE MONDAY.COM AVEC GRID LAYOUT
import { useState, useMemo } from "react";
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
 ChevronDown, ChevronUp, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Types
type SectionId = 'alerts' | 'kpis' | 'chart' | 'summary' | 'methodology';

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

// Fonctions utilitaires
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

// Layout par défaut
const defaultLayouts = {
  lg: [
    { i: 'alerts', x: 0, y: 0, w: 12, h: 3, minW: 6, minH: 2 },
    { i: 'kpis', x: 0, y: 3, w: 12, h: 4, minW: 6, minH: 3 },
    { i: 'chart', x: 0, y: 7, w: 12, h: 7, minW: 6, minH: 5 },
    { i: 'summary', x: 0, y: 14, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'methodology', x: 6, y: 14, w: 6, h: 5, minW: 3, minH: 3 },
  ],
  md: [
    { i: 'alerts', x: 0, y: 0, w: 10, h: 3, minW: 5, minH: 2 },
    { i: 'kpis', x: 0, y: 3, w: 10, h: 4, minW: 5, minH: 3 },
    { i: 'chart', x: 0, y: 7, w: 10, h: 7, minW: 5, minH: 5 },
    { i: 'summary', x: 0, y: 14, w: 5, h: 5, minW: 3, minH: 3 },
    { i: 'methodology', x: 5, y: 14, w: 5, h: 5, minW: 3, minH: 3 },
  ],
  sm: [
    { i: 'alerts', x: 0, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
    { i: 'kpis', x: 0, y: 3, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'chart', x: 0, y: 7, w: 6, h: 7, minW: 3, minH: 5 },
    { i: 'summary', x: 0, y: 14, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'methodology', x: 0, y: 19, w: 6, h: 5, minW: 3, minH: 3 },
  ],
};

export default function ForecastView({ companyId }: { companyId: string }) {
  const { plannings, loading } = usePlannings(companyId);
  const [weeks, setWeeks] = useState(4);
  const [forecastDays, setForecastDays] = useState(7);
  const [transporterFilter, setTransporterFilter] = useState<string>("Tous");
  const [viewMode, setViewMode] = useState<"bar" | "line" | "area">("bar");

  // Charger layouts et sections depuis localStorage
  const loadFromStorage = () => {
    try {
      const savedLayouts = localStorage.getItem('forecast-layouts');
      const savedSections = localStorage.getItem('forecast-sections');
      
      return {
        layouts: savedLayouts ? JSON.parse(savedLayouts) : defaultLayouts,
        sections: savedSections ? JSON.parse(savedSections) : [
          { id: 'alerts', title: 'Alertes de surcharge', collapsed: false },
          { id: 'kpis', title: 'Indicateurs clés', collapsed: false },
          { id: 'chart', title: 'Graphique prévisionnel', collapsed: false },
          { id: 'summary', title: 'Résumé statistique', collapsed: false },
          { id: 'methodology', title: 'Méthodologie', collapsed: false },
        ]
      };
    } catch (error) {
      return { layouts: defaultLayouts, sections: [] };
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

  const transporters = useMemo(() => {
    return [...new Set(plannings.map(p => p.transporter))].filter(Boolean).sort();
  }, [plannings]);

  const { forecasts, stats, alerts } = useMemo(() => {
    if (plannings.length === 0) {
      return { forecasts: [], stats: null, alerts: [] };
    }

    const today = new Date();
    
    const recAvg = calculateForecast(plannings, weeks, "Réception", transporterFilter);
    const expAvg = calculateForecast(plannings, weeks, "Expédition", transporterFilter);

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

    let filteredPlannings = plannings;
    if (transporterFilter !== "Tous") {
      filteredPlannings = plannings.filter(p => p.transporter === transporterFilter);
    }

    const totalHistoric = filteredPlannings.length;
    const historicReceptions = filteredPlannings.filter(p => p.type === "Réception").length;
    const historicExpeditions = filteredPlannings.filter(p => p.type === "Expédition").length;
    
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
      alerts: alertsList
    };
  }, [plannings, weeks, forecastDays, transporterFilter]);

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

  // Rendu des sections avec header collapse et drag séparés
  const renderSection = (sectionId: SectionId) => {
    if (!stats) return null;

    const section = sections.find(s => s.id === sectionId);
    if (!section) return null;

    const renderContent = () => {
      if (section.collapsed) return null;

      switch (sectionId) {
        case 'alerts':
          return (
            <div className="flex-1 overflow-auto min-h-0">
              {alerts.length > 0 ? (
                <div className="p-4 min-w-0">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={24} />
                    <div className="flex-1 min-w-0">
                      <div className="space-y-1">
                        {alerts.map(alert => (
                          <p key={alert.date} className="text-sm text-red-700 dark:text-red-300 break-words">
                            • <strong>{format(parseDate(alert.date), 'EEEE dd/MM', { locale: fr })}</strong> : 
                            {" "}{alert.total} événements (+{alert.percent}%)
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  ✅ Aucune alerte de surcharge
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
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-3 rounded-lg min-w-0">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-xs font-medium text-blue-900 dark:text-blue-100 truncate">Moyenne/jour</span>
            <Calendar className="text-blue-600 dark:text-blue-300 flex-shrink-0" size={16} />
          </div>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-200">
            {Math.round(stats.historicalAverage)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-3 rounded-lg min-w-0">
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

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 p-3 rounded-lg min-w-0">
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

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-3 rounded-lg min-w-0">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-xs font-medium text-purple-900 dark:text-purple-100 truncate">Pic</span>
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
                    className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                      viewMode === mode 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
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
          
          {/* Bouton collapse - à droite - CLIQUABLE */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(sectionId);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!stats || stats.totalHistoric < 10) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 p-8 rounded-xl">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={32} />
          <div>
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Données insuffisantes
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300">
              Minimum 10 événements requis. Actuellement : {stats?.totalHistoric || 0}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            📊 Prévisions
          </h2>
          
          <div className="flex flex-wrap gap-2">
            <select 
              value={transporterFilter}
              onChange={(e) => setTransporterFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="Tous">Tous</option>
              {transporters.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select 
              value={weeks} 
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value={2}>2 sem</option>
              <option value={4}>4 sem</option>
              <option value={8}>8 sem</option>
            </select>

            <select 
              value={forecastDays} 
              onChange={(e) => setForecastDays(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value={7}>7j</option>
              <option value={14}>14j</option>
              <option value={30}>30j</option>
            </select>

            <button
              onClick={resetLayout}
              className="flex items-center gap-1 bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
            >
              <RotateCcw size={14} /> Reset
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              <Download size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
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

      <style>{`
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
      `}</style>
    </div>
  );
}