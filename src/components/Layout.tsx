// src/components/Layout.tsx - VERSION CORRIGÉE
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ChatSidebar from "./ChatSidebar";

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  
  // ✅ Correction : vérifier /app/chat au lieu de /chat
  const isChatPage = location.pathname.includes("/chat");

  console.log("📍 location:", location.pathname);
  console.log("💬 isChatPage:", isChatPage);

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