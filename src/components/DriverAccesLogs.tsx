// src/components/DriverAccessLogs.tsx - Affichage des logs d'accès
import { useState, useEffect } from 'react';
import { Activity, Check, MapPin, Navigation, Eye, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface AccessLog {
  id: string;
  accessed_at: string;
  action: string;
  metadata: any;
}

interface DriverAccessLogsProps {
  tourId: string;
}

const actionIcons: Record<string, any> = {
  opened: Eye,
  gps_enabled: Navigation,
  gps_disabled: Navigation,
  stop_arrived: MapPin,
  stop_completed: Check,
};

const actionLabels: Record<string, string> = {
  opened: 'Lien ouvert',
  gps_enabled: 'GPS activé',
  gps_disabled: 'GPS désactivé',
  stop_arrived: 'Arrivé à un arrêt',
  stop_completed: 'Livraison complétée',
};

const actionColors: Record<string, string> = {
  opened: 'text-blue-600 bg-blue-50',
  gps_enabled: 'text-green-600 bg-green-50',
  gps_disabled: 'text-orange-600 bg-orange-50',
  stop_arrived: 'text-purple-600 bg-purple-50',
  stop_completed: 'text-green-600 bg-green-50',
};

export default function DriverAccessLogs({ tourId }: DriverAccessLogsProps) {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();

    // Realtime subscription
    const channel = supabase
      .channel(`access-logs-${tourId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'driver_access_logs',
        filter: `tour_id=eq.${tourId}`
      }, loadLogs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tourId]);

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from('driver_access_logs')
      .select('*')
      .eq('tour_id', tourId)
      .order('accessed_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Moins de 1 minute
    if (diff < 60000) {
      return 'À l\'instant';
    }
    
    // Moins de 1 heure
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Il y a ${minutes} min`;
    }
    
    // Moins de 24h
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `Il y a ${hours}h`;
    }
    
    // Format complet
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <Activity size={32} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Aucune activité enregistrée
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Les actions du chauffeur apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Activité du chauffeur
          </h3>
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {logs.length} action{logs.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {logs.map((log) => {
          const Icon = actionIcons[log.action] || Activity;
          const label = actionLabels[log.action] || log.action;
          const colorClass = actionColors[log.action] || 'text-gray-600 bg-gray-50';

          return (
            <div key={log.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {label}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(log.accessed_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}