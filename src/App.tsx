import { BrowserRouter, Routes, Route } from "react-router-dom";
import VitrineApp from "./vitrine/VitrineApp";
import AppApp from "./app/AppApp";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "sonner";
import { RealtimeProvider } from "./contexts/RealtimeProvider";
import Login from "./vitrine/pages/Login"; // 🔹 ton vrai composant Login

export default function App() {
  return (
      <BrowserRouter>
        <Routes>
          {/* App interne protégée */}
          <Route
            path="/app/*"
            element={
              <AuthProvider>
                <RealtimeProvider>
                  <AppApp />
                </RealtimeProvider>
              </AuthProvider>
            }
          />

          {/* Page de connexion */}
          <Route
            path="/login"
            element={
              <AuthProvider>
                <Login /> {/* ✅ login uniquement */}
              </AuthProvider>
            }
          />

          {/* Vitrine publique (jamais protégée) */}
          <Route path="/*" element={<VitrineApp />} />
        </Routes>

        {/* Notifications globales */}
        <Toaster position="top-right" richColors />
      </BrowserRouter>
  );
}