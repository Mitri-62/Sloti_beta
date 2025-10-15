// src/components/PrivateRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/Sloti.svg"; // 🔹 mets ton logo ici

export default function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        {/* Logo */}
        <img src={logo} alt="Sloti" className="w-24 h-24 mb-6 animate-pulse" />

        {/* Loader */}
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>

        {/* Texte */}
        <p className="text-gray-600 font-medium mt-4">
          Merci de relancer le navigateur...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}