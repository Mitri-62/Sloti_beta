// src/components/Sidebar.tsx - VERSION RÉORGANISÉE AVEC FLOTTE
import { useState, useEffect} from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  MessageSquarePlus,
  BarChart,
  CalendarDays,
  Building,
  Truck,
  Package,
  Layers,
  TrendingDown,
  TrendingUp,
  ClipboardCheck,
  X,
  Moon,
  Sun,
  Book,
  Warehouse,
  Crown,
  Settings,
  TruckIcon,
  UserCog,
  Boxes,
  Send,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import useSuperAdmin from "../hooks/useSuperAdmin";
import logo from "../assets/Sloti.svg";

interface TooltipNavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  isCollapsed: boolean;
  badge?: number;
}

function TooltipNavLink({
  to,
  icon: Icon,
  label,
  end = false,
  isCollapsed,
  badge,
}: TooltipNavLinkProps) {
  return (
    <div className="relative">
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `relative group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
            isCollapsed ? "justify-center" : ""
          } ${
            isActive
              ? "bg-blue-600 text-white shadow-md"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`
        }
      >
        <Icon size={20} className="flex-shrink-0" />
        {!isCollapsed && <span className="font-medium">{label}</span>}
        
        {badge && badge > 0 && (
          <span className={`${isCollapsed ? 'absolute top-1 right-1' : 'ml-auto'} min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold`}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
        
        {isCollapsed && (
          <span className="absolute left-full ml-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-200 whitespace-nowrap z-50 shadow-lg pointer-events-none">
            {label}
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700"></span>
          </span>
        )}
      </NavLink>
    </div>
  );
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [unreadMessages, setUnreadMessages] = useState(0);

  const location = useLocation();
  const { user, logout } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(`sidebar_collapsed_${user?.id}`);
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`sidebar_collapsed_${user.id}`, JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, user?.id]);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadMessages = async () => {
      try {
        const { data } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("company_id", user.company_id)
        .neq("user_id", user.id);

        setUnreadMessages(data?.length || 0);
      } catch (error) {
        console.error('Erreur chargement messages:', error);
      }
    };

    fetchUnreadMessages();

    const messagesChannel = supabase
      .channel("chat_messages_sidebar")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMessage = payload.new;
          if (
            newMessage.user_id !== user.id &&
            newMessage.company_id === user.company_id
          ) {
            setUnreadMessages(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleLogout = async () => {
    if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
      try {
        await logout();
      } catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
      }
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newTheme);
  };

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between min-h-[32px]">
          <div className={`flex items-center gap-2 transition-all duration-300 ${isCollapsed ? 'mx-auto' : ''}`}>
            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
              <img 
                src={logo} 
                alt="Sloti Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap">
                Sloti
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors hidden lg:block"
              aria-label={isCollapsed ? "Agrandir la sidebar" : "Réduire la sidebar"}
              title={`${isCollapsed ? 'Agrandir' : 'Réduire'} (Ctrl+B)`}
            >
              <Menu size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors lg:hidden"
              aria-label="Fermer le menu"
            >
              <X size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* ========== PRINCIPAL ========== */}
        {!isCollapsed && (
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Principal 
            </span>
          </div>
        )}

        <TooltipNavLink
          to="/app"
          icon={LayoutDashboard}
          label="Accueil"
          end
          isCollapsed={isCollapsed}
        />

        <TooltipNavLink
          to="/app/planning"
          icon={CalendarDays}
          label="Planning"
          isCollapsed={isCollapsed}
        />

        <TooltipNavLink
          to="/app/tour-planning"
          icon={Truck}
          label="Tournées"
          isCollapsed={isCollapsed}
        />

        {/* ========== OPÉRATIONS ========== */}
        {!isCollapsed && (
          <div className="px-3 mb-2 mt-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Opérations
            </span>
          </div>
        )}

        <TooltipNavLink
          to="/app/loading-view"
          icon={Boxes}
          label="Chargement 3D"
          isCollapsed={isCollapsed}
        />

        <TooltipNavLink
          to="/app/loading-smart"
          icon={Layers}
          label="Chargement Auto"
          isCollapsed={isCollapsed}
        />

        <TooltipNavLink
          to="/app/dock-management"
          icon={Warehouse}
          label="Gestion des Quais"
          isCollapsed={isCollapsed}
        />

        {/* ========== FLOTTE ========== */}
        {!isCollapsed && (
          <div className="px-3 mb-2 mt-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              🚛 Flotte
            </span>
          </div>
        )}

        <TooltipNavLink
          to="/app/fleet/vehicles"
          icon={TruckIcon}
          label="Véhicules"
          isCollapsed={isCollapsed}
        />

        <TooltipNavLink
          to="/app/fleet/drivers"
          icon={UserCog}
          label="Chauffeurs"
          isCollapsed={isCollapsed}
        />

          <TooltipNavLink
            to="/app/booking"
            icon={Send}
            label="Booking Transport"
            isCollapsed={isCollapsed}
          />

        {/* ========== STOCKS ========== */}
        {!isCollapsed && (
          <div className="px-3 mb-2 mt-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Stocks
            </span>
          </div>
        )}

        <TooltipNavLink
          to="/app/stock/entrees"
          icon={TrendingUp}
          label="Entrées"
          isCollapsed={isCollapsed}
        />

        <TooltipNavLink
          to="/app/stock/sorties"
          icon={TrendingDown}
          label="Sorties"
          isCollapsed={isCollapsed}
        />

        <TooltipNavLink
          to="/app/stock/synoptique"
          icon={Package}
          label="Vue Synoptique"
          isCollapsed={isCollapsed}
        />

        <TooltipNavLink
          to="/app/inventaire"
          icon={ClipboardCheck}
          label="Inventaires"
          isCollapsed={isCollapsed}
        />

        {/* ========== DONNÉES ========== */}
        {!isCollapsed && (
          <div className="px-3 mb-2 mt-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Données
            </span>
          </div>
        )}

        <TooltipNavLink
          to="/app/masterdata"
          icon={BarChart}
          label="MasterData"
          isCollapsed={isCollapsed}
        />

        {/* ========== COMMUNICATION ========== */}
        {!isCollapsed && (
          <div className="px-3 mb-2 mt-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Communication
            </span>
          </div>
        )}

        <TooltipNavLink
          to="/app/chat"
          icon={MessageSquarePlus}
          label="Messages"
          isCollapsed={isCollapsed}
          badge={unreadMessages}
        />

        {/* ========== ADMINISTRATION ========== */}
        {(isAdmin || isSuperAdmin) && !superAdminLoading && (
          <>
            {!isCollapsed && (
              <div className="px-3 mb-2 mt-4">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Administration
                </span>
              </div>
            )}

            {isAdmin && (
              <TooltipNavLink
                to="/app/team"
                icon={Settings}
                label="Gestion d'équipe"
                isCollapsed={isCollapsed}
              />
            )}

            {isSuperAdmin && (
              <TooltipNavLink
                to="/app/founder/dashboard"
                icon={Crown}
                label="Dashboard Fondateur"
                isCollapsed={isCollapsed}
              />
            )}
          </>
        )}

        {/* ========== CENTRE D'AIDE ========== */}
        {!isCollapsed && (
          <div className="px-3 mb-2 mt-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Centre d'aide
            </span>
          </div>
        )}

        <TooltipNavLink
          to="/app/help"
          icon={Book}
          label="Centre d'aide"
          isCollapsed={isCollapsed}
        />
      </nav>

      {/* Footer - Profil utilisateur */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() || <Users size={20} />}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                {user?.name || "Utilisateur"}
              </div>
              {user?.company_name && (
                <div className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 truncate">
                  <Building size={12} /> {user.company_name}
                </div>
              )}
              {user?.role && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
                  {user.role}
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            
            <button
              onClick={handleLogout}
              className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Déconnexion"
              aria-label="Se déconnexter"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        
        {!isCollapsed && (
          <div className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            Sloti v1.0.0
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
        aria-label="Ouvrir le menu"
      >
        <Menu size={24} className="text-gray-700 dark:text-gray-300" />
      </button>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`hidden lg:flex flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarContent />
      </aside>
      
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 w-64 transform transition-transform duration-300 flex flex-col ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}