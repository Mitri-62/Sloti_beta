// src/app/AppApp.tsx - VERSION COMPLÈTE AVEC CANAUX
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { Toaster } from "sonner";

// Layout Components
import Layout from "../components/Layout";
import PrivateRoute from "../components/PrivateRoute";

// Pages
import ChatPage from "../pages/ChatPage";
import Planning from "../pages/Planning";
import LoadingView from "../pages/LoadingView";
import TourPlanning from "../pages/TourPlanning";
import StockSynoptique from "../pages/StockSynoptique";
import StockEntrees from "../pages/StockEntrees";
import StockSorties from "../pages/StockSorties";
import Dashboard from "../pages/Dashboard";
import TourDetailView from "../pages/TourDetailView";
import MasterData from "../pages/MasterData";
import AdvancedLoadingSystem from "../views/AdvancedLoadingSystem";
import ToastProvider from '../components/ToastProvider';
import Profile from "../pages/Profile";
import Settings from "../pages/Settings";
import Notifications from "../pages/Notifications";
import InvitePage from "../pages/InvitePage"; // NOUVEAU

function AppContent() {
  return (
    <Routes>
      {/* Route publique pour les invitations - EN DEHORS du Layout */}
      <Route path="/invite/:token" element={<InvitePage />} />

      {/* Routes avec Layout */}
      <Route element={<Layout />}>
        {/* Home */}
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="planning" element={<PrivateRoute><Planning /></PrivateRoute>} />
        
        {/* Stocks */}
        <Route path="stock/entrees" element={<PrivateRoute><StockEntrees /></PrivateRoute>} />
        <Route path="stock/sorties" element={<PrivateRoute><StockSorties /></PrivateRoute>} />
        <Route path="stock/synoptique" element={<PrivateRoute><StockSynoptique /></PrivateRoute>} />
        <Route path="masterdata" element={<PrivateRoute><MasterData /></PrivateRoute>} />
        
        {/* Chargement 3D */}
        <Route path="loading-view" element={<PrivateRoute><LoadingView /></PrivateRoute>} />
        <Route path="loading-smart" element={<PrivateRoute><AdvancedLoadingSystem /></PrivateRoute>} />
        
        {/* Tournées */}
        <Route path="tour-planning" element={<PrivateRoute><TourPlanning /></PrivateRoute>} />
        <Route path="tour-planning/:tourId" element={<PrivateRoute><TourDetailView /></PrivateRoute>} />
        
        {/* Paramètres et profil */}
        <Route path="profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

        {/* Communication - ROUTES MISES À JOUR */}
        <Route path="chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="chat/channel/:channelId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="chat/dm/:userId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}

export default function AppApp() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider />
        <AppContent />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}