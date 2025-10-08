import { Routes, Route } from "react-router-dom";
import HomeVitrine from "./pages/Home";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";



export default function VitrineApp() {
  return (
    <Routes>
      <Route path="/" element={<HomeVitrine />} />
      <Route path="login" element={<Login />} />
      <Route path="reset-password" element={<ResetPassword />} />
    </Routes>
  );
}
