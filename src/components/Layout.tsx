import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout() {
  const { user } = useAuth();
  console.log("👤 user dans Layout:", user);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {user && <Sidebar />}
      <div className="flex-1 overflow-auto">
        {user && <Header />}
        {/* Ici React Router injecte la page courante */}
        <Outlet />
      </div>
    </div>
  );
}
