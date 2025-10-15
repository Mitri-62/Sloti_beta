// src/components/Layout.tsx - VERSION AVEC SIDEBAR FIXE
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMemo } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ChatSidebar from "./ChatSidebar";
import UsersListSidebar from "./UsersListSidebar";

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  
  // ✅ Détection des pages de chat
  const isChatPage = useMemo(() => {
    const path = location.pathname;
    return path === "/app/chat" || 
           path.startsWith("/app/chat/channel/") || 
           path.startsWith("/app/chat/dm/");
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* ⚠️ CRITIQUE : overflow-hidden sur le container principal */}
      
      {/* Sidebar principale (navigation) - TOUJOURS VISIBLE et FIXE */}
      {user && <Sidebar />}

      {/* Zone principale avec Header global + contenu */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header global TOUJOURS au-dessus */}
        {user && <Header />}
        
        {/* Zone sous le header : ChatSidebar + UsersListSidebar + Contenu */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ⚠️ CRITIQUE : overflow-hidden pour bloquer le scroll au niveau du layout */}
          
          {/* Sidebar des canaux (UNIQUEMENT sur les pages de chat) */}
          {user && isChatPage && <ChatSidebar />}

          {/* Liste des utilisateurs JUSTE APRÈS ChatSidebar */}
          {user && isChatPage && <UsersListSidebar />}

          {/* Zone de contenu - SEUL ÉLÉMENT QUI PEUT SCROLLER */}
          <div className="flex-1 min-h-0 overflow-auto">
            {/* ⚠️ CRITIQUE : overflow-auto ICI SEULEMENT */}
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}