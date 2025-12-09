// src/pages/Notifications.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageSquare, Package, Truck, Calendar, CheckCheck, ChevronRight } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import { toast } from "sonner";

export default function Notifications() {
  const navigate = useNavigate();
  const { 
    unreadNotifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();
  
  const [filter, setFilter] = useState<'all' | 'messages' | 'activity'>('all');

  const filteredNotifications = unreadNotifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'messages') return n.type === 'message';
    if (filter === 'activity') return n.type === 'activity';
    return true;
  });

  const handleNotificationClick = (notif: any) => {
    markAsRead(notif.id);

    if (notif.type === 'message') {
      if (notif.channel_id) {
        navigate(`/app/chat/channel/${notif.channel_id}`);
      } else if (notif.user_id) {
        navigate(`/app/chat/dm/${notif.user_id}`);
      } else {
        navigate('/app/chat');
      }
      return;
    }

    // Activités
    if (notif.entity_type) {
      const routes: Record<string, string> = {
        'tour': `/app/tour-planning/${notif.entity_id || ''}`,
        'tours': '/app/tour-planning',
        'stock': '/app/stock/synoptique',
        'planning': '/app/planning',
        'vehicle': '/app/fleet/vehicles',
        'driver': '/app/fleet/drivers',
      };

      const route = routes[notif.entity_type.toLowerCase()];
      if (route) {
        navigate(route);
        return;
      }
    }

    // Fallback
    if (notif.message) {
      const msg = notif.message.toLowerCase();
      if (msg.includes('tour')) navigate('/app/tour-planning');
      else if (msg.includes('stock')) navigate('/app/stock/synoptique');
      else if (msg.includes('planning')) navigate('/app/planning');
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    toast.success('Toutes les notifications ont été marquées comme lues');
  };

  const getIcon = (notif: any) => {
    if (notif.type === 'message') return <MessageSquare size={20} className="text-blue-500" />;
    
    const msg = notif.message?.toLowerCase() || '';
    const entity = notif.entity_type?.toLowerCase() || '';
    
    if (entity.includes('tour') || msg.includes('tour')) 
      return <Truck size={20} className="text-purple-500" />;
    if (entity.includes('stock') || msg.includes('stock')) 
      return <Package size={20} className="text-green-500" />;
    if (entity.includes('planning') || msg.includes('planning') || msg.includes('réservation')) 
      return <Calendar size={20} className="text-orange-500" />;
    
    return <Bell size={20} className="text-gray-500" />;
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return notifDate.toLocaleDateString('fr-FR');
  };

  // Compter par type
  const messageCount = unreadNotifications.filter(n => n.type === 'message').length;
  const activityCount = unreadNotifications.filter(n => n.type === 'activity').length;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Bell size={28} className="text-blue-600" />
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {unreadCount === 0 
                ? "Vous êtes à jour !" 
                : `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
              }
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CheckCheck size={18} />
              Tout marquer lu
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'Toutes', count: unreadCount },
            { key: 'messages', label: 'Messages', count: messageCount },
            { key: 'activity', label: 'Activités', count: activityCount },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filter === f.key 
                    ? 'bg-white/20 text-white' 
                    : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune notification</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Vous êtes à jour !</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredNotifications.map((notif) => (
                <li
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className="p-4 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    {/* Icône */}
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                      {getIcon(notif)}
                    </div>
                    
                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                        {notif.type === 'message' 
                          ? <><span className="text-blue-600 dark:text-blue-400">{notif.username}</span> : {notif.content}</>
                          : notif.message
                        }
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {getTimeAgo(notif.created_at)}
                      </p>
                    </div>

                    {/* Flèche */}
                    <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}