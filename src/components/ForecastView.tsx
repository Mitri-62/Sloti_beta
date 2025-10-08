// src/components/ForecastView.tsx
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { usePlannings, Planning } from "../hooks/usePlannings";
import { format, getWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ForecastData {
  date: string;
  receptions: number;
  expeditions: number;
  total: number;
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
  type: "Réception" | "Expédition"
): Record<number, number> {
  const today = new Date();
  const limit = new Date();
  limit.setDate(today.getDate() - weeks * 7);

  // Filtrer historique par type
  const past = plannings.filter(
    (p) => p.type === type && parseDate(p.date) >= limit && parseDate(p.date) < today
  );

  // Grouper par jour de semaine ET par semaine
  const byDayOfWeek: Record<number, WeekStats> = {};

  past.forEach((ev) => {
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

  // Calcul des prévisions mémorisé
  const { forecasts, stats } = useMemo(() => {
    if (plannings.length === 0) {
      return { forecasts: [], stats: null };
    }

    const today = new Date();
    
    // Calculer prévisions pour chaque type
    const recAvg = calculateForecast(plannings, weeks, "Réception");
    const expAvg = calculateForecast(plannings, weeks, "Expédition");

    // Générer prévisions pour les 7 prochains jours
    const data: ForecastData[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dow = d.getDay();
      
      const rec = Math.round(recAvg[dow] || 0);
      const exp = Math.round(expAvg[dow] || 0);
      
      data.push({
        date: d.toISOString().split("T")[0],
        receptions: rec,
        expeditions: exp,
        total: rec + exp,
      });
    }

    // Stats globales
    const totalHistoric = plannings.length;
    const historicReceptions = plannings.filter(p => p.type === "Réception").length;
    const historicExpeditions = plannings.filter(p => p.type === "Expédition").length;
    
    const recTrend = detectTrend(Object.values(recAvg));
    const expTrend = detectTrend(Object.values(expAvg));

    return { 
      forecasts: data, 
      stats: {
        totalHistoric,
        historicReceptions,
        historicExpeditions,
        recTrend,
        expTrend,
      }
    };
  }, [plannings, weeks]);

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
      <div className="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-lg">
        <h3 className="font-semibold text-yellow-800 text-lg mb-2">
          ⚠️ Données insuffisantes
        </h3>
        <p className="text-yellow-700 mb-2">
          Minimum 10 événements historiques requis pour générer des prévisions fiables.
        </p>
        <p className="text-yellow-600 text-sm">
          Actuellement : <strong>{stats?.totalHistoric || 0}</strong> événements dans l'historique
        </p>
        <p className="text-yellow-600 text-sm mt-2">
          Continuez à créer des événements dans votre planning pour activer les prévisions.
        </p>
      </div>
    );
  }

  const historicalAverage = stats.totalHistoric / weeks / 7;

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    if (trend === 'increasing') return <TrendingUp className="text-green-600" size={20} />;
    if (trend === 'decreasing') return <TrendingDown className="text-red-600" size={20} />;
    return <Minus className="text-gray-600" size={20} />;
  };

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Prévisions (7 prochains jours)</h2>
            <p className="text-sm text-gray-500">
              Basé sur {weeks} semaines d'historique ({stats.totalHistoric} événements)
            </p>
          </div>

          <select 
            value={weeks} 
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value={2}>2 semaines</option>
            <option value={4}>4 semaines (1 mois)</option>
            <option value={8}>8 semaines (2 mois)</option>
            <option value={12}>12 semaines (3 mois)</option>
          </select>
        </div>
      </div>

      {/* Stats & Tendances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Réceptions */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-blue-900">Réceptions</h3>
            {getTrendIcon(stats.recTrend.trend)}
          </div>
          <p className="text-2xl font-bold text-blue-700">
            {stats.historicReceptions} événements
          </p>
          <p className="text-sm text-blue-600 mt-1">
            {stats.recTrend.trend === 'increasing' && `📈 En hausse de ${stats.recTrend.percent}%`}
            {stats.recTrend.trend === 'decreasing' && `📉 En baisse de ${stats.recTrend.percent}%`}
            {stats.recTrend.trend === 'stable' && '➡️ Tendance stable'}
          </p>
        </div>

        {/* Expéditions */}
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-orange-900">Expéditions</h3>
            {getTrendIcon(stats.expTrend.trend)}
          </div>
          <p className="text-2xl font-bold text-orange-700">
            {stats.historicExpeditions} événements
          </p>
          <p className="text-sm text-orange-600 mt-1">
            {stats.expTrend.trend === 'increasing' && `📈 En hausse de ${stats.expTrend.percent}%`}
            {stats.expTrend.trend === 'decreasing' && `📉 En baisse de ${stats.expTrend.percent}%`}
            {stats.expTrend.trend === 'stable' && '➡️ Tendance stable'}
          </p>
        </div>
      </div>

      {/* Graphique */}
      <div className="bg-white p-6 rounded-lg shadow">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={forecasts}>
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => format(parseDate(value), 'EEE dd', { locale: fr })}
            />
            <YAxis />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded shadow-lg">
                      <p className="font-medium mb-2">
                        {format(parseDate(data.date), 'EEEE dd MMMM yyyy', { locale: fr })}
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
              y={historicalAverage} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ value: 'Moyenne historique', position: 'right', fill: '#ef4444', fontSize: 12 }}
            />
            <Bar 
              dataKey="receptions" 
              fill="#3b82f6" 
              name="Réceptions prévues"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="expeditions" 
              fill="#f97316" 
              name="Expéditions prévues"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Note méthodologie */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-sm text-gray-600">
        <p className="font-medium mb-1">📊 Méthodologie</p>
        <p>
          Les prévisions sont calculées en analysant la moyenne d'événements par jour de semaine 
          sur les {weeks} dernières semaines. Les tendances détectent les variations significatives (&gt;10%) 
          entre la première et la seconde moitié de la période analysée.
        </p>
      </div>
    </div>
  );
}