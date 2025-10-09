import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  MessageSquarePlus,
  ChevronDown,
  BarChart,
  CalendarDays,
  Building,
  Truck,
  Package,
  Layers,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/sloti.svg";


function TooltipNavLink({
  to,
  icon: Icon,
  label,
  end = false,
  isCollapsed,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  isCollapsed: boolean;
}) {
  return (
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
      {isCollapsed && (
        <span className="absolute left-full ml-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
          {label}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></span>
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stocksExpanded, setStocksExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const location = useLocation();
  const { user, logout } = useAuth();
  const stocksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const path = location.pathname;
    setStocksExpanded(path.startsWith("/app/stock"));
  }, [location.pathname]);

  // Fermer mobile menu lors du changement de page
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Ferme le sous-menu si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        stocksRef.current &&
        !stocksRef.current.contains(event.target as Node)
      ) {
        setStocksExpanded(false);
      }
    };
    if (stocksExpanded && isCollapsed) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [stocksExpanded, isCollapsed]);

  const stocksMenuItems = [
    { icon: TrendingUp, label: "Entrées", path: "/app/stock/entrees" },
    { icon: TrendingDown, label: "Sorties", path: "/app/stock/sorties" },
    { icon: Package, label: "Vue Synoptique", path: "/app/stock/synoptique" },
  ];

  const handleLogout = async () => {
    if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
      try {
        await logout();
      } catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
      }
    }
  };

  // src/components/Sidebar.tsx - Section Header COMPLÈTE ET CORRIGÉE

const SidebarContent = () => (
  <>
    {/* Header - VERSION CORRIGÉE SANS SAUT */}
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between min-h-[32px]"> {/* ✅ min-h au lieu de h */}
        {/* Logo + Texte */}
        <div className={`flex items-center gap-2 transition-all duration-300 ${isCollapsed ? 'mx-auto' : ''}`}>
          <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center"> {/* ✅ Conteneur fixe */}
            <img 
              src={logo} 
              alt="Sloti Logo" 
              className="w-full h-full object-contain" // ✅ object-contain pour éviter la déformation
            />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap">
              Sloti
            </span>
          )}
        </div>
        
        {/* Boutons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors hidden lg:block"
              aria-label="Réduire la sidebar"
            >
              <Menu size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
          )}
          
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
      {/* Section Principale */}
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
        to="/app/loading-view"
        icon={Truck}
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
        to="/app/tour-planning"
        icon={Truck}
        label="Tournées"
        isCollapsed={isCollapsed}
      />

      {/* Section Stocks */}
      {!isCollapsed && (
        <div className="px-3 mb-2 mt-4">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Stocks
          </span>
        </div>
      )}

      <div ref={stocksRef}>
        <button
          onClick={() => setStocksExpanded(!stocksExpanded)}
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center" : "justify-between"
          } px-3 py-2 rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700`}
        >
          <div className="flex items-center gap-3">
            <Package size={20} className="flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">Gestion Stocks</span>}
          </div>
          {!isCollapsed && (
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${
                stocksExpanded ? "rotate-180" : ""
              }`}
            />
          )}
        </button>

        {stocksExpanded && (
          <div className={`mt-1 ${isCollapsed ? "ml-0" : "ml-6"} space-y-1`}>
            {stocksMenuItems.map((item) => (
              <TooltipNavLink
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        )}
      </div>

      <TooltipNavLink
        to="/app/masterdata"
        icon={BarChart}
        label="MasterData"
        isCollapsed={isCollapsed}
      />

      {/* Section Communication */}
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
      />
    </nav>

    {/* Footer - Profil utilisateur */}
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
          {user?.name?.charAt(0).toUpperCase() || <Users size={20} />}
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
        <button
          onClick={handleLogout}
          className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
          title="Déconnexion"
          aria-label="Se déconnecter"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  </>
);

  return (
    <>
      {/* Bouton hamburger mobile */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
        aria-label="Ouvrir le menu"
      >
        <Menu size={24} className="text-gray-700 dark:text-gray-300" />
      </button>

      {/* Overlay mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Desktop */}
      <aside
        className={`hidden lg:flex bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen flex-col transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar Mobile */}
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