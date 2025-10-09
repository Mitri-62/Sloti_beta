// src/pages/Notifications.tsx - VERSION CORRIGÉE
import { useState, useEffect } from "react";
import { Bell, MessageSquare, Package, Truck, Calendar, Trash2, CheckCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { toast } from "sonner";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'messages' | 'activity'>('all');
  const [loading, setLoading] = useState(true);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Charger les notifications lues depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`notifications_read_${user?.id}`);
    if (stored) {
      setReadNotifications(new Set(JSON.parse(stored)));
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel("all_notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        loadNotifications
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        loadNotifications
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user?.company_id) return;

    setLoading(true);
    try {
      // Messages
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("company_id", user.company_id)
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Activités
      const { data: activities } = await supabase
        .from("activities")
        .select("*")
        .eq("company_id", user.company_id)
        .order("created_at", { ascending: false })
        .limit(30);

      const all = [
        ...(messages?.map(m => ({ ...m, type: 'message' })) || []),
        ...(activities?.map(a => ({ ...a, type: 'activity' })) || [])
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(all);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les notifications NON lues
  const unreadNotifications = notifications.filter(n => !readNotifications.has(n.id));

  const filteredNotifications = unreadNotifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter.replace('s', '');
  });

  const markAsRead = (id: string) => {
    const newRead = new Set(readNotifications);
    newRead.add(id);
    setReadNotifications(newRead);
    
    // Persister dans localStorage
    localStorage.setItem(
      `notifications_read_${user?.id}`,
      JSON.stringify(Array.from(newRead))
    );
  };

  const deleteNotification = async (id: string) => {
    markAsRead(id);
    toast.success('Notification marquée comme lue');
  };

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadNotifications(allIds);
    
    // Persister
    localStorage.setItem(
      `notifications_read_${user?.id}`,
      JSON.stringify(Array.from(allIds))
    );
    
    toast.success('Toutes les notifications ont été marquées comme lues');
  };

  const getIcon = (notif: any) => {
    if (notif.type === 'message') return <MessageSquare size={20} className="text-blue-500" />;
    const msg = notif.message?.toLowerCase() || '';
    if (msg.includes('tour')) return <Truck size={20} className="text-purple-500" />;
    if (msg.includes('stock')) return <Package size={20} className="text-green-500" />;
    if (msg.includes('planning')) return <Calendar size={20} className="text-orange-500" />;
    return <Bell size={20} className="text-gray-500" />;
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Bell size={32} className="text-blue-600" />
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {filteredNotifications.length} notification{filteredNotifications.length > 1 ? 's' : ''} non lue{filteredNotifications.length > 1 ? 's' : ''}
            </p>
          </div>

          {filteredNotifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CheckCheck size={18} />
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'messages', 'activity'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'all' && 'Toutes'}
              {f === 'messages' && 'Messages'}
              {f === 'activity' && 'Activités'}
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
              <Bell size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Aucune notification non lue</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notif) => (
                <li
                  key={notif.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getIcon(notif)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {notif.type === 'message' 
                          ? `${notif.username}: ${notif.content}`
                          : notif.message
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notif.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Marquer comme lu"
                    >
                      <Trash2 size={16} className="text-gray-400" />
                    </button>
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