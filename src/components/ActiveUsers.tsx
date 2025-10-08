import { User, Circle } from 'lucide-react';

interface ActiveUsersProps {
  users: Array<{
    id: string;
    name: string;
    lastActive: string;
    currentAction?: string;
  }>;
}

export default function ActiveUsers({ users }: ActiveUsersProps) {
  const activeUsers = users.filter(user => {
    const lastActive = new Date(user.lastActive);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastActive > fiveMinutesAgo;
  });

  if (activeUsers.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 min-w-[200px]">
      <div className="p-3 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {activeUsers.length} utilisateur{activeUsers.length > 1 ? 's' : ''} actif{activeUsers.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="p-2 max-h-[200px] overflow-y-auto">
        {activeUsers.map(user => (
          <div key={user.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
            <Circle size={8} className="text-green-500 fill-green-500" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.name}
              </div>
              {user.currentAction && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.currentAction}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}