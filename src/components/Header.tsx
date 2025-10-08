import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Bell, Search, User } from "lucide-react";
//import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { useEffect, useState } from "react";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isHomePage = location.pathname === "/app";

  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, user_id, username, content, created_at, company_id")
        .eq("company_id", user.company_id) // 🔒 même entreprise
        .neq("user_id", user.id) // pas mes propres messages
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data) setNotifications(data);
    };

    fetchMessages();

    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMessage = payload.new;
          if (
            newMessage.user_id !== user.id &&
            newMessage.company_id === user.company_id // 🔒 sécurité
          ) {
            setNotifications((prev) => [newMessage, ...prev].slice(0, 5));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-4">
            {!isHomePage && (
              <Link
                to="/app"
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Retour à l'accueil"
              >
                <Home size={18} />
                <span className="hidden sm:inline text-sm font-medium">
                  Accueil
                </span>
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 relative">
            {/* Recherche */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors hidden sm:block"
              title="Rechercher"
            >
              <Search size={20} />
            </button>

            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors hidden sm:block"
              title="Notifications"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {/* Toggle thème 
            <ThemeToggle />*/}

            {/* Avatar utilisateur */}
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={user?.name || "Profil"}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase() || <User size={16} />}
              </div>
            </button>

            {/* === Dropdowns === */}
            {showNotifications && (
              <div className="absolute top-14 right-16 bg-white dark:bg-gray-800 shadow-lg rounded-lg w-80 p-4 z-50">
                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">
                  Nouveaux messages
                </h4>
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun nouveau message</p>
                ) : (
                  <ul className="space-y-2">
                    {notifications.map((msg) => (
                      <li
                        key={msg.id}
                        onClick={() => {
                          setShowNotifications(false);
                          navigate(`/app/chat/${msg.user_id}`);
                        }}
                        className="cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {msg.username || "Utilisateur"}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {msg.content}
                        </p>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {showProfile && (
              <div className="absolute top-14 right-0 bg-white dark:bg-gray-800 shadow-lg rounded-lg w-40">
                <ul className="text-sm text-gray-700 dark:text-gray-300">
                  <li
                    onClick={() => navigate("/app/profile")}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    Mon profil
                  </li>
                  <li
                    onClick={() => navigate("/app/settings")}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    Paramètres
                  </li>
                  <li
                    onClick={logout}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-red-500"
                  >
                    Déconnexion
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}