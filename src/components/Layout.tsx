// src/components/Layout.tsx - VERSION AVEC SIDEBAR FIXE + GUEST RESTRICTION + IMPERSONATE
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMemo, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ChatSidebar from "./ChatSidebar";
import UsersListSidebar from "./UsersListSidebar";
import ImpersonateBanner from "./ImpersonateBanner";
import useImpersonate from "../hooks/useImpersonate";

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const { isImpersonating } = useImpersonate();
  
  // ✅ Détection des pages de chat
  const isChatPage = useMemo(() => {
    const path = location.pathname;
    return path === "/app/chat" || 
           path.startsWith("/app/chat/channel/") || 
           path.startsWith("/app/chat/dm/");
  }, [location.pathname]);

  // ✅ Gestion des guests : redirection automatique vers chat
  const isGuest = user?.role === 'guest';

  useEffect(() => {
    if (isGuest && !isChatPage) {
      console.log("🚫 Guest tentant d'accéder à:", location.pathname);
      console.log("➡️ Redirection vers /app/chat");
    }
  }, [isGuest, isChatPage, location.pathname]);

  // Si guest et pas sur chat, rediriger
  if (isGuest && !isChatPage) {
    return <Navigate to="/app/chat" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* ⚠️ CRITIQUE : overflow-hidden sur le container principal */}
      
      {/* Sidebar principale (navigation) - CACHÉE pour les guests */}
      {user && !isGuest && <Sidebar />}

      {/* Zone principale avec Header global + contenu */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 🔓 Banner d'impersonate si actif - AU-DESSUS DU HEADER */}
        {isImpersonating && <ImpersonateBanner />}
        
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