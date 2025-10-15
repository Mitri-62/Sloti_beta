import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../../supabaseClient";
import logo from "../../assets/Sloti.svg";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) {
      navigate("/reset-password", { replace: true });
    }
  }, [navigate]);

  // Calcul de la force du mot de passe
  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-red-500";
    if (passwordStrength <= 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return "Faible";
    if (passwordStrength <= 3) return "Moyen";
    return "Fort";
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessage("Votre mot de passe a été mis à jour avec succès !");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-2xl shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logo} alt="Sloti Logo" className="mx-auto h-16 w-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Réinitialiser le mot de passe
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Choisissez un nouveau mot de passe sécurisé
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
        
        {message && (
          <div 
            className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-start gap-3"
            role="status"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{message}</span>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-6">
          {/* Nouveau mot de passe */}
          <div>
            <label 
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={20}
              />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-12 w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
                aria-describedby="password-strength"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Indicateur de force */}
            {password && (
              <div id="password-strength" className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded ${
                        i < passwordStrength ? getStrengthColor() : 'bg-gray-200'
                      } transition-colors duration-300`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Force du mot de passe : <span className="font-semibold">{getStrengthText()}</span>
                </p>
              </div>
            )}

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Minimum 8 caractères, incluez majuscules, minuscules, chiffres et caractères spéciaux
            </p>
          </div>

          {/* Confirmer mot de passe */}
          <div>
            <label 
              htmlFor="confirm"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={20}
              />
              <input
                type={showConfirm ? "text" : "password"}
                id="confirm"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pl-10 pr-12 w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Indicateur de correspondance */}
            {confirm && (
              <p className={`mt-2 text-xs flex items-center gap-1 ${
                password === confirm ? 'text-green-600' : 'text-red-600'
              }`}>
                {password === confirm ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Les mots de passe correspondent</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} />
                    <span>Les mots de passe ne correspondent pas</span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Bouton submit */}
          <button
            type="submit"
            disabled={loading || password !== confirm || password.length < 8}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 sm:py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Mise à jour...</span>
              </div>
            ) : (
              "Mettre à jour le mot de passe"
            )}
          </button>
        </form>

        {/* Lien retour */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
          >
            ← Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}