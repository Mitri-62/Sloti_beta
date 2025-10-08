import { Clock } from 'lucide-react';

interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
}

interface ActivityLogProps {
  activities: Activity[];
}

export default function ActivityLog({ activities }: ActivityLogProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Activité récente</h2>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="mt-1">
              <Clock size={16} className="text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-900">
                <span className="font-medium">{activity.user}</span> {activity.action}{' '}
                <span className="font-medium">{activity.target}</span>
              </p>
              <p className="text-xs text-gray-500">
                {new Date(activity.timestamp).toLocaleString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}