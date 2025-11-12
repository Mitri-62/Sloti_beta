// src/app/AppApp.tsx - VERSION AVEC DRIVER-APP ET INVITATIONS EN DEHORS DU LAYOUT
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
import InvitePage from "../pages/InvitePage";
import SignupInvitePage from "../pages/SignupInvitePage";
import Inventaire from "../pages/Inventaire";
import HelpCenter from "../pages/HelpCenter";
import DriverApp from "../pages/DriverApp";
import DockManagement from '../pages/DockManagement/DockManagement';

// Pages Administration
import TeamManagement from "../pages/TeamManagement";
import FounderDashboard from "../pages/FounderDashboard";


function AppContent() {
  return (
    <Routes>
      {/* ========================================= */}
      {/* Routes SANS Layout (standalone)          */}
      {/* ========================================= */}
      
      {/* 
        Page de visualisation de l'invitation
        Public - L'utilisateur peut voir les détails avant de se connecter
      */}
      <Route path="/invite/:token" element={<InvitePage />} />
      
      {/* 
        ✅ NOUVELLE ROUTE : Page d'inscription via invitation
        Public - Permet de créer un compte directement lié à l'invitation
        L'utilisateur rejoint automatiquement la company du canal
      */}
      <Route path="/signup-invite/:token" element={<SignupInvitePage />} />
      
      {/* 
        Application chauffeur
        Public (mais protégée par tourId dans l'URL)
      */}
      <Route path="/driver-app/:tourId" element={<DriverApp />} />

      {/* ========================================= */}
      {/* Routes AVEC Layout (interface principale) */}
      {/* ========================================= */}
      
      <Route element={<Layout />}>
        {/* Home */}
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="planning" element={<PrivateRoute><Planning /></PrivateRoute>} />
        
        {/* Stocks */}
        <Route path="stock/entrees" element={<PrivateRoute><StockEntrees /></PrivateRoute>} />
        <Route path="stock/sorties" element={<PrivateRoute><StockSorties /></PrivateRoute>} />
        <Route path="stock/synoptique" element={<PrivateRoute><StockSynoptique /></PrivateRoute>} />
        <Route path="inventaire" element={<PrivateRoute><Inventaire /></PrivateRoute>} />
        <Route path="masterdata" element={<PrivateRoute><MasterData /></PrivateRoute>} />
        
        {/* Chargement 3D */}
        <Route path="loading-view" element={<PrivateRoute><LoadingView /></PrivateRoute>} />
        <Route path="loading-smart" element={<PrivateRoute><AdvancedLoadingSystem /></PrivateRoute>} />
        
        {/* Tournées */}
        <Route path="tour-planning" element={<PrivateRoute><TourPlanning /></PrivateRoute>} />
        <Route path="tour-planning/:tourId" element={<PrivateRoute><TourDetailView /></PrivateRoute>} />
        <Route path="dock-management" element={<PrivateRoute><DockManagement /></PrivateRoute>} />
        
        {/* Paramètres et profil */}
        <Route path="profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

        {/* Centre d'aide */}
        <Route path="help" element={<PrivateRoute><HelpCenter /></PrivateRoute>} />
        <Route path="help/:guideId" element={<PrivateRoute><HelpCenter /></PrivateRoute>} />

        {/* Communication */}
        <Route path="chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="chat/channel/:channelId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="chat/dm/:userId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />

        {/* Administration */}
        <Route path="team" element={<PrivateRoute><TeamManagement /></PrivateRoute>} />
        <Route path="founder/dashboard" element={<PrivateRoute><FounderDashboard /></PrivateRoute>} />
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