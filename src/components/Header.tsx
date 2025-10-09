// src/components/Header.tsx - VERSION AMÉLIORÉE
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, Bell, Search, User, Settings, LogOut, 
  MessageSquare,Package, Truck, X, Check
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";


export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isHomePage = location.pathname === "/app";

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Charger les notifications lues depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`notifications_read_${user?.id}`);
    if (stored) {
      setReadNotifications(new Set(JSON.parse(stored)));
    }
  }, [user?.id]);

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Charger les notifications TOUTES les notifications (messages, tours, stocks, etc.)
  useEffect(() => {
    if (!user) return;

    const fetchAllNotifications = async () => {
      try {
        // Messages
        const { data: messages } = await supabase
          .from("chat_messages")
          .select("id, user_id, username, content, created_at")
          .eq("company_id", user.company_id)
          .neq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        // Activités
        const { data: activities } = await supabase
          .from("activities")
          .select("*")
          .eq("company_id", user.company_id)
          .order("created_at", { ascending: false })
          .limit(10);

        const allNotifs = [
          ...(messages?.map(m => ({ ...m, type: 'message' })) || []),
          ...(activities?.map(a => ({ ...a, type: 'activity' })) || [])
        ].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setAllNotifications(allNotifs);
        setNotifications(messages || []);
      } catch (error) {
        console.error('Erreur chargement notifications:', error);
      }
    };

    fetchAllNotifications();

    // Rechargement périodique pour synchroniser avec localStorage
    const intervalId = setInterval(fetchAllNotifications, 5000);

    // Realtime pour messages
    const messagesChannel = supabase
      .channel("chat_messages_header")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMessage = payload.new;
          if (
            newMessage.user_id !== user.id &&
            newMessage.company_id === user.company_id
          ) {
            setNotifications((prev) => [newMessage, ...prev].slice(0, 5));
            setAllNotifications(prev => [{ ...newMessage, type: 'message' }, ...prev]);
            toast.info(`Nouveau message de ${newMessage.username}`);
          }
        }
      )
      .subscribe();

    // Realtime pour activités
    const activitiesChannel = supabase
      .channel("activities_header")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activities" },
        (payload) => {
          const newActivity = payload.new;
          if (newActivity.company_id === user.company_id) {
            setAllNotifications(prev => [{ ...newActivity, type: 'activity' }, ...prev].slice(0, 15));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [user]);

  // Recherche globale
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results: any[] = [];

      // Recherche dans les stocks
      const { data: stocks } = await supabase
        .from("stocks")
        .select("ean, name, quantity")
        .eq("company_id", user?.company_id)
        .or(`ean.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(5);

      if (stocks) {
        results.push(...stocks.map(s => ({ ...s, type: 'stock', icon: Package })));
      }

      // Recherche dans les tournées
      const { data: tours } = await supabase
        .from("tours")
        .select("id, name, date, status")
        .eq("company_id", user?.company_id)
        .ilike("name", `%${query}%`)
        .limit(5);

      if (tours) {
        results.push(...tours.map(t => ({ ...t, type: 'tour', icon: Truck })));
      }

      // Recherche dans les utilisateurs
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("company_id", user?.company_id)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);

      if (users) {
        results.push(...users.map(u => ({ ...u, type: 'user', icon: User })));
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  };

  const handleResultClick = (result: any) => {
    setShowSearch(false);
    setSearchQuery("");
    
    switch (result.type) {
      case 'stock':
        navigate('/app/stock/synoptique');
        break;
      case 'tour':
        navigate(`/app/tour-planning/${result.id}`);
        break;
      case 'user':
        navigate(`/app/chat/${result.id}`);
        break;
    }
  };

  const getNotificationIcon = (notif: any) => {
    if (notif.type === 'message') return <MessageSquare size={16} className="text-blue-500" />;
    const msg = (notif.message || '').toLowerCase();
    if (msg.includes('tour')) return <Truck size={16} className="text-purple-500" />;
    if (msg.includes('stock')) return <Package size={16} className="text-green-500" />;
    return <Bell size={16} className="text-gray-500" />;
  };

  const markAsRead = async (notifId: string) => {
    const newRead = new Set(readNotifications);
    newRead.add(notifId);
    setReadNotifications(newRead);
    
    // Persister dans localStorage
    localStorage.setItem(
      `notifications_read_${user?.id}`,
      JSON.stringify(Array.from(newRead))
    );
    
    setAllNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  const handleLogout = async () => {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        toast.error('Erreur lors de la déconnexion');
      }
    }
  };

  const unreadCount = allNotifications.filter(n => !readNotifications.has(n.id)).length;
  const unreadNotifications = allNotifications.filter(n => !readNotifications.has(n.id));

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Breadcrumb - Amélioré avec espacement */}
          <div className="flex items-center gap-4">
            {!isHomePage && (
              <Link
                to="/app"
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ml-12 sm:ml-0"
                title="Retour à l'accueil"
              >
                <Home size={18} />
                <span className="hidden md:inline text-sm font-medium">
                  Accueil
                </span>
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* Recherche */}
            <div ref={searchRef} className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Rechercher"
              >
                <Search size={20} />
              </button>

              {showSearch && (
                <div className="absolute top-12 right-0 bg-white dark:bg-gray-800 shadow-xl rounded-lg w-80 sm:w-96 p-4 z-50 border border-gray-200 dark:border-gray-700">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Rechercher stocks, tournées, utilisateurs..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {searchResults.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.map((result, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <result.icon size={20} className="text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {result.name || result.full_name || result.ean}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {result.type === 'stock' && `Quantité: ${result.quantity}`}
                              {result.type === 'tour' && `Date: ${result.date} - ${result.status}`}
                              {result.type === 'user' && result.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Aucun résultat trouvé
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Tapez au moins 2 caractères pour rechercher
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Notifications - Améliorées */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-12 right-0 bg-white dark:bg-gray-800 shadow-xl rounded-lg w-80 sm:w-96 z-50 border border-gray-200 dark:border-gray-700 max-h-[500px] overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => setAllNotifications([])}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {unreadNotifications.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        Aucune notification non lue
                      </p>
                    ) : (
                      <ul>
                        {unreadNotifications.map((notif) => (
                          <li
                            key={notif.id}
                            className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="p-3 flex items-start gap-3">
                              <div className="mt-1">
                                {getNotificationIcon(notif)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-white">
                                  {notif.type === 'message' 
                                    ? `${notif.username}: ${notif.content}`
                                    : notif.message
                                  }
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(notif.created_at).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <button
                                onClick={() => markAsRead(notif.id)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                title="Marquer comme lu"
                              >
                                <Check size={14} className="text-gray-400" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/app/notifications');
                      }}
                      className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium text-center"
                    >
                      Voir toutes les notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profil - Amélioré */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={user?.name || "Profil"}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {user?.name?.charAt(0).toUpperCase() || <User size={16} />}
                </div>
                <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.name?.split(' ')[0] || user?.email?.split('@')[0]}
                </span>
              </button>

              {showProfile && (
                <div className="absolute top-12 right-0 bg-white dark:bg-gray-800 shadow-xl rounded-lg w-56 z-50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* En-tête profil */}
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {user?.name || 'Utilisateur'}
                        </p>
                        <p className="text-xs opacity-90 truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu */}
                  <ul className="py-2">
                    <li>
                      <button
                        onClick={() => {
                          setShowProfile(false);
                          navigate("/app/profile");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <User size={16} />
                        Mon profil
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setShowProfile(false);
                          navigate("/app/settings");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Settings size={16} />
                        Paramètres
                      </button>
                    </li>
                    <li className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut size={16} />
                        Déconnexion
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}