// src/vitrine/VitrineApp.tsx
import { Routes, Route } from "react-router-dom";
import HomeVitrine from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import NewsAdmin from "./pages/admin/NewsAdmin";
import LeadsAdmin from "./pages/admin/LeadsAdmin";

// Pages légales
import MentionsLegales from "./pages/MentionsLegales";
import Confidentialite from "./pages/Confidentialite";
import CGU from "./pages/CGU";

export default function VitrineApp() {
  return (
    <Routes>
      {/* Pages publiques */}
      <Route path="/" element={<HomeVitrine />} />
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="reset-password" element={<ResetPassword />} />
      
      {/* Pages légales */}
      <Route path="mentions-legales" element={<MentionsLegales />} />
      <Route path="confidentialite" element={<Confidentialite />} />
      <Route path="cgu" element={<CGU />} />

      {/* Routes admin protégées */}
      <Route
        path="admin/news"
        element={
          <ProtectedAdminRoute>
            <NewsAdmin />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="admin/leads"
        element={
          <ProtectedAdminRoute>
            <LeadsAdmin />
          </ProtectedAdminRoute>
        }
      />
    </Routes>
  );
}