// src/pages/DockManagement/DockDashboard.tsx
import { useState } from 'react';
import { useDockDashboard, useTransporterPerformance } from '../../hooks/useDockStats';
import { 
  TrendingUp, Package, Clock, 
  AlertCircle, CheckCircle, XCircle, Calendar 
} from 'lucide-react';
import { format, subDays, startOfMonth,} from 'date-fns';


interface DockDashboardProps {
  companyId?: string;
}

export default function DockDashboard({ companyId }: DockDashboardProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const { stats, loading,} = useDockDashboard(companyId);
  
  const today = new Date();
  const startDate = period === 'week' 
    ? format(subDays(today, 7), 'yyyy-MM-dd')
    : format(startOfMonth(today), 'yyyy-MM-dd');
  const endDate = format(today, 'yyyy-MM-dd');

  const { performance, loading: perfLoading } = useTransporterPerformance(
    companyId,
    startDate,
    endDate
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-sm text-gray-600 mt-1">
            Vue d'ensemble de l'activité des quais
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 derniers jours
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ce mois
          </button>
        </div>
      </div>

      {/* KPIs PRINCIPAUX */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* QUAIS TOTAUX */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Total</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.total_docks}
          </div>
          <div className="text-sm text-gray-600">Quais configurés</div>
          <div className="mt-3 text-xs text-gray-500">
            {stats.available_docks} disponibles · {stats.occupied_docks} occupés
          </div>
        </div>

        {/* RÉSERVATIONS DU JOUR */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Aujourd'hui</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.today_bookings}
          </div>
          <div className="text-sm text-gray-600">Réservations</div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-green-600">✓ {stats.today_completed} terminées</span>
            <span className="text-blue-600">⏳ {stats.today_in_progress} en cours</span>
          </div>
        </div>

        {/* TAUX D'OCCUPATION */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm text-gray-500">Moyenne</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.average_occupancy_rate}%
          </div>
          <div className="text-sm text-gray-600">Taux d'occupation</div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.average_occupancy_rate}%` }}
              />
            </div>
          </div>
        </div>

        {/* HEBDOMADAIRE */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Cette semaine</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.total_weekly_bookings}
          </div>
          <div className="text-sm text-gray-600">Réservations totales</div>
          <div className="mt-3 text-xs text-gray-500">
            ~{Math.round(stats.total_weekly_bookings / 7)} par jour en moyenne
          </div>
        </div>
      </div>

      {/* GRAPHIQUE STATUTS */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Statut des quais</h3>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats.available_docks}
            </div>
            <div className="text-sm text-gray-600">Disponibles</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.total_docks > 0 ? Math.round((stats.available_docks / stats.total_docks) * 100) : 0}%
            </div>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {stats.occupied_docks}
            </div>
            <div className="text-sm text-gray-600">Occupés</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.total_docks > 0 ? Math.round((stats.occupied_docks / stats.total_docks) * 100) : 0}%
            </div>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {stats.maintenance_docks}
            </div>
            <div className="text-sm text-gray-600">Maintenance</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.total_docks > 0 ? Math.round((stats.maintenance_docks / stats.total_docks) * 100) : 0}%
            </div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-600 mb-2">
              {stats.total_docks - stats.available_docks - stats.occupied_docks - stats.maintenance_docks}
            </div>
            <div className="text-sm text-gray-600">Fermés</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.total_docks > 0 ? Math.round(((stats.total_docks - stats.available_docks - stats.occupied_docks - stats.maintenance_docks) / stats.total_docks) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* PERFORMANCE TRANSPORTEURS */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Performance des transporteurs</h3>
          <span className="text-sm text-gray-500">
            {period === 'week' ? '7 derniers jours' : 'Ce mois'}
          </span>
        </div>

        {perfLoading ? (
          <div className="text-center py-8 text-gray-500">
            Chargement des performances...
          </div>
        ) : performance.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune donnée disponible pour cette période
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Transporteur
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    Réservations
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    À l'heure
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    En retard
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    Absents
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    Ponctualité
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    Retard moyen
                  </th>
                </tr>
              </thead>
              <tbody>
                {performance.map((perf, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {perf.transporter_name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-gray-900 font-medium">
                        {perf.total_bookings}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          {perf.completed_on_time}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-orange-600 font-medium">
                          {perf.late_arrivals}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600 font-medium">
                          {perf.no_shows}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              perf.punctuality_rate >= 80
                                ? 'bg-green-600'
                                : perf.punctuality_rate >= 60
                                ? 'bg-orange-600'
                                : 'bg-red-600'
                            }`}
                            style={{ width: `${perf.punctuality_rate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {perf.punctuality_rate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-gray-700">
                        {perf.average_delay_minutes > 0
                          ? `${perf.average_delay_minutes} min`
                          : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* POINTS POSITIFS */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-green-900">Points forts</h3>
          </div>
          <ul className="space-y-2 text-sm text-green-800">
            {stats.average_occupancy_rate > 70 && (
              <li>✓ Excellent taux d'occupation ({stats.average_occupancy_rate}%)</li>
            )}
            {stats.today_completed > stats.today_bookings * 0.8 && (
              <li>✓ Très bon taux de réalisation aujourd'hui</li>
            )}
            {stats.available_docks > stats.total_docks * 0.3 && (
              <li>✓ Bonne disponibilité des quais</li>
            )}
            {performance.length > 0 && performance[0].punctuality_rate > 85 && (
              <li>✓ Excellente ponctualité du meilleur transporteur</li>
            )}
          </ul>
        </div>

        {/* POINTS D'ATTENTION */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-orange-900">Points d'attention</h3>
          </div>
          <ul className="space-y-2 text-sm text-orange-800">
            {stats.maintenance_docks > 0 && (
              <li>⚠ {stats.maintenance_docks} quai(s) en maintenance</li>
            )}
            {stats.average_occupancy_rate < 40 && (
              <li>⚠ Taux d'occupation faible ({stats.average_occupancy_rate}%)</li>
            )}
            {stats.occupied_docks === stats.total_docks && (
              <li>⚠ Tous les quais sont occupés</li>
            )}
            {performance.some(p => p.no_shows > 2) && (
              <li>⚠ Certains transporteurs ont plusieurs absences</li>
            )}
            {performance.length === 0 && (
              <li>⚠ Aucune donnée de performance disponible</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}