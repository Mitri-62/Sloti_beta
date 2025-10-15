// src/components/Layout.tsx - VERSION OPTIMISÉE
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMemo } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ChatSidebar from "./ChatSidebar";

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  
  // ✅ Mémoriser le calcul de isChatPage
  const isChatPage = useMemo(() => {
    return location.pathname.includes("/chat");
  }, [location.pathname]);

  // ✅ Logger uniquement en mode dev et de manière throttlée
  if (import.meta.env.DEV) {
    // Ne logger que si nécessaire pour debug
    // console.log("📍 location:", location.pathname);
    // console.log("💬 isChatPage:", isChatPage);
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar principale (navigation) - cachée sur les pages de chat */}
      {user && !isChatPage && <Sidebar />}

      {/* Sidebar des canaux (uniquement sur les pages de chat) */}
      {user && isChatPage && <ChatSidebar />}

      {/* Zone de contenu principale */}
      <div className="flex-1 overflow-auto">
        {user && <Header />}
        <Outlet />
      </div>
    </div>
  );
}