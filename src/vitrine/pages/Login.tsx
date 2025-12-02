import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { User, Lock, Eye, EyeOff, Mail, AlertCircle } from "lucide-react";
import { supabase } from "../../supabaseClient";
import logo from "../../assets/Sloti.svg";

export default function Login() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    if (user && location.pathname === "/login") {
      navigate("/app", { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await login(formData.email, formData.password);
    } catch (err: any) {
      setError(err.message || "Erreur de connexion. Vérifiez vos identifiants.");
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Veuillez saisir votre email avant de réinitialiser votre mot de passe.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Veuillez saisir une adresse email valide.");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetEmailSent(true);
      setError(null);
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi de l'email.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-2xl shadow-2xl">
        
        {/* Logo + Titre */}
        <div className="text-center mb-8">
          <img src={logo} alt="Sloti Logo" className="mx-auto h-16 w-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Connexion
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Accédez à votre espace <span className="font-semibold">Sloti</span>
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div 
            className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {resetEmailSent && (
          <div 
            className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-start gap-3"
            role="status"
          >
            <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">
              Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.
            </span>
          </div>
        )}

        {/* Formulaire */}
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {/* Champ Email */}
          <div>
            <label 
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
                aria-hidden="true"
              />
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value }));
                  setError(null);
                }}
                className="pl-10 w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 
                           dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="email@exemple.com"
                autoComplete="email"
                aria-required="true"
              />
            </div>
          </div>

          {/* Champ Mot de passe */}
          <div>
            <label 
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Mot de passe
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
                aria-hidden="true"
              />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                required
                value={formData.password}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, password: e.target.value }));
                  setError(null);
                }}
                className="pl-10 pr-12 w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 
                           dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Lien mot de passe oublié */}
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              >
                Mot de passe oublié ?
              </button>
            </div>
          </div>

          {/* Bouton Connexion */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 sm:py-4 rounded-lg text-white font-semibold 
                       bg-gradient-to-r from-blue-600 to-indigo-600 
                       hover:from-blue-700 hover:to-indigo-700 
                       focus:outline-none focus:ring-4 focus:ring-blue-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Connexion en cours...</span>
              </div>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>

        {/* Séparateur */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">ou</span>
          </div>
        </div>

        {/* Lien vers demande de démo */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Vous n'avez pas encore de compte ?{" "}
            <a 
              href="/#DevisForm"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
            >
              Rejoindre la bêta gratuite
            </a>
          </p>
        </div>

        {/* Lien retour accueil */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}