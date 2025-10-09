import { Routes, Route } from "react-router-dom";
import HomeVitrine from "./pages/Home";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NewsAdmin from "./pages/admin/NewsAdmin";

export default function VitrineApp() {
  return (
    <Routes>
      <Route path="/" element={<HomeVitrine />} />
      <Route path="login" element={<Login />} />
      <Route path="reset-password" element={<ResetPassword />} />
      <Route path="admin/news" element={<NewsAdmin />} />
    </Routes>
  );
}