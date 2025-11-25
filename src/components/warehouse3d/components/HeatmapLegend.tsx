import { FC } from 'react';
import { Flame, Package, AlertTriangle, BarChart3 } from 'lucide-react';
import { HeatmapMetric } from '../hooks/useHeatmapMode';

interface HeatmapLegendProps {
  isEnabled: boolean;
  metric: HeatmapMetric;
  setMetric: (m: HeatmapMetric) => void;
  stats: {
    min: number;
    max: number;
    avg: number;
    total: number;
    filled: number;
  };
  isDark: boolean;
}

export const HeatmapLegend: FC<HeatmapLegendProps> = ({
  isEnabled,
  metric,
  setMetric,
  stats,
  isDark
}) => {
  if (!isEnabled) return null;

  const metricLabels: Record<HeatmapMetric, { label: string; icon: JSX.Element; unit: string }> = {
    fillRate: { label: 'Taux remplissage', icon: <BarChart3 className="w-4 h-4" />, unit: '%' },
    quantity: { label: 'Quantité', icon: <Package className="w-4 h-4" />, unit: ' unités' },
    overflow: { label: 'Dépassements', icon: <AlertTriangle className="w-4 h-4" />, unit: '' }
  };

  return (
    <div className={`absolute bottom-4 right-4 z-20 rounded-xl shadow-lg ${
      isDark ? 'bg-gray-800/95' : 'bg-white/95'
    } backdrop-blur-sm border ${
      isDark ? 'border-gray-700' : 'border-slate-200'
    } p-4 min-w-[220px]`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-orange-500" />
        <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
          Heatmap
        </span>
      </div>

      {/* Metric selector */}
      <div className="flex gap-1 mb-3">
        {(Object.keys(metricLabels) as HeatmapMetric[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              metric === m
                ? 'bg-blue-500 text-white'
                : isDark 
                  ? 'bg-gray-700 text-slate-300 hover:bg-gray-600' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={metricLabels[m].label}
          >
            {metricLabels[m].icon}
          </button>
        ))}
      </div>

      {/* Current metric label */}
      <div className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {metricLabels[metric].label}
      </div>

      {/* Gradient legend */}
      {metric !== 'overflow' && (
        <div className="mb-3">
          <div 
            className="h-3 rounded-full"
            style={{
              background: 'linear-gradient(to right, #22c55e, #84cc16, #facc15, #f59e0b, #ef4444)'
            }}
          />
          <div className="flex justify-between mt-1 text-[10px]">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              0{metricLabels[metric].unit}
            </span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              {metric === 'fillRate' ? '100%' : `${Math.round(stats.max)}${metricLabels[metric].unit}`}
            </span>
          </div>
        </div>
      )}

      {/* Overflow legend */}
      {metric === 'overflow' && (
        <div className="flex gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Dépassé</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={`pt-3 border-t ${isDark ? 'border-gray-700' : 'border-slate-200'}`}>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Racks occupés</span>
            <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {stats.filled}/{stats.total}
            </p>
          </div>
          {metric !== 'overflow' && (
            <div>
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Moyenne</span>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {Math.round(stats.avg)}{metricLabels[metric].unit}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};