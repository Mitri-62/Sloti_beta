import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
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


function AppContent() {
  return (
    <Routes>
      <Route element={<Layout />}>
        
        {/* Home */}
        <Route path="/" element={<PrivateRoute><Dashboard/></PrivateRoute>} />
        <Route path="planning" element={<Planning />} />
        
        {/* Stocks */}
        <Route path="stock/entrees" element={<PrivateRoute><StockEntrees /></PrivateRoute>} />
        <Route path="stock/sorties" element={<PrivateRoute><StockSorties /></PrivateRoute>} />
        <Route path="stock/synoptique" element={<PrivateRoute><StockSynoptique /></PrivateRoute>} />
        <Route path="masterdata" element={<PrivateRoute><MasterData /></PrivateRoute>} />
        
        {/* Chargement 3D */}
        <Route path="loading-view" element={<LoadingView />} />
        <Route path="loading-smart" element={<AdvancedLoadingSystem />} />
        
        {/* Tournées - UNIQUEMENT TourPlanning */}
        <Route path="tour-planning" element={<PrivateRoute><TourPlanning /></PrivateRoute>} />
        <Route path="tour-planning/:tourId" element={<PrivateRoute><TourDetailView /></PrivateRoute>} />
        
        <Route path="profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
<Route path="settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
<Route path="notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />


        {/* Communication */}
        <Route path="chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="chat/:userId" element={<ChatPage />} />
      </Route>
    </Routes>
  );
}

export default function AppApp() {
  return (
    <AuthProvider>
      <ToastProvider />
      <AppContent />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}