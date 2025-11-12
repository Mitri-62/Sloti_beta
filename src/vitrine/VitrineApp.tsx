import { Routes, Route } from "react-router-dom";
import HomeVitrine from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup"; // ← AJOUTER CET IMPORT
import ResetPassword from "./pages/ResetPassword";
import NewsAdmin from "./pages/admin/NewsAdmin";

export default function VitrineApp() {
  return (
    <Routes>
      <Route path="/" element={<HomeVitrine />} />
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} /> {/* ← AJOUTER CETTE ROUTE */}
      <Route path="reset-password" element={<ResetPassword />} />
      <Route path="admin/news" element={<NewsAdmin />} />
    </Routes>
  );
}