import { BrowserRouter, Routes, Route } from "react-router-dom";
import VitrineApp from "./vitrine/VitrineApp";
import AppApp from "./app/AppApp";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "sonner";
import { RealtimeProvider } from "./contexts/RealtimeProvider";
import Login from "./vitrine/pages/Login";
import Signup from "./vitrine/pages/Signup"; // ✅ AJOUTER
import JoinTeamPage from "./pages/JoinTeamPage";


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
          <Route path="/login" element={<AuthProvider><Login /></AuthProvider>} />

          {/* ✅ Page d'inscription (invitation) */}
          <Route path="/signup" element={<Signup />} />

          {/* Page d'invitation par token */}
          <Route path="/join-team/:token" element={<AuthProvider><JoinTeamPage /></AuthProvider>} />

          {/* Vitrine publique - TOUJOURS EN DERNIER */}
          <Route path="/*" element={<VitrineApp />} />
        </Routes>

        <Toaster position="top-right" richColors />
      </BrowserRouter>
  );
}