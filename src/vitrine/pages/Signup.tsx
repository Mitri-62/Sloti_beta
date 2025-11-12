import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader } from "lucide-react";
import logo from "../../assets/Sloti.svg";

export default function Signup() {
  console.log('🚀 === SIGNUP COMPONENT RENDER ===');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Récupérer les paramètres de l'invitation
  const companyId = searchParams.get('company_id');
  const companyName = searchParams.get('company_name');
  
  console.log('📋 URL params:', { companyId, companyName });
  console.log('🌐 Full URL:', window.location.href);
  console.log('🔗 Search string:', searchParams.toString());
  
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('🎯 Current verifying state:', verifying);

  useEffect(() => {
    console.log('⚡ useEffect RUNNING');
    
    const checkInvitation = () => {
      console.log('🔍 checkInvitation called');
      console.log('🔍 Checking params:', { companyId, companyName });
      
      // Vérifier si c'est une invitation valide (paramètres présents)
      if (!companyId || !companyName) {
        console.log('❌ Missing params → Redirect to devis form');
        window.location.href = '/#DevisForm';
        return;
      }

      console.log('✅ Params OK → Setting verifying to FALSE');
      setVerifying(false);
      console.log('✅ setVerifying(false) called');
    };

    checkInvitation();
  }, [companyId, companyName]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!fullName.trim()) {
      setError("Le nom complet est requis.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Starting signup process...');
      
      // 1. Récupérer l'utilisateur actuel (créé par le magic link)
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user);
      
      if (!user) {
        throw new Error("Session invalide. Veuillez cliquer à nouveau sur le lien d'invitation.");
      }

      // 2. Mettre à jour le mot de passe et le profil
      console.log('📝 Updating user password and profile...');
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          full_name: fullName,
        }
      });

      if (updateError) throw updateError;
      console.log('✅ User updated');

      // 3. Ajouter dans la table users
      console.log('💾 Inserting into users table...');
      const { error: userError } = await supabase.from("users").insert({
        id: user.id,
        email: user.email!,
        company_id: companyId,
        role: "admin",
        full_name: fullName,
      });

      if (userError) {
        console.log('⚠️ Insert error:', userError);
        // Si l'utilisateur existe déjà, c'est peut-être une re-invitation
        if (userError.code === '23505') { // Duplicate key
          console.log('🔄 User exists, updating instead...');
          const { error: updateUserError } = await supabase
            .from("users")
            .update({
              full_name: fullName,
              company_id: companyId,
              role: "admin"
            })
            .eq('id', user.id);

          if (updateUserError) throw updateUserError;
          console.log('✅ User updated in table');
        } else {
          throw userError;
        }
      } else {
        console.log('✅ User inserted in table');
      }

      // 4. Rediriger vers l'app
      console.log('🚀 Redirecting to /app...');
      navigate("/app");
    } catch (err: any) {
      console.error("❌ Signup error:", err);
      setError(err.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  // Afficher un loader pendant la vérification
  console.log('🎨 Rendering... verifying =', verifying);
  
  if (verifying) {
    console.log('🔄 Showing loader screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-blue-600" size={48} />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Vérification de votre invitation...
          </p>
          <p className="mt-2 text-xs text-gray-400">
            (Debug: verifying={verifying ? 'true' : 'false'})
          </p>
        </div>
      </div>
    );
  }

  console.log('📝 Showing signup form');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-2xl shadow-xl">
        {/* Logo + Titre */}
        <div className="text-center mb-8">
          <img src={logo} alt="Sloti Logo" className="mx-auto h-16 w-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Bienvenue chez Sloti
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Finalisez votre inscription pour{" "}
            <span className="font-semibold text-blue-600">{companyName}</span>
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSignup} className="space-y-5">
          {/* Nom complet */}
          <div>
            <label 
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Jean Dupont"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:outline-none 
                         dark:bg-gray-700 dark:text-white"
              required
              autoFocus
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label 
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Choisissez un mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg 
                           focus:ring-2 focus:ring-blue-500 focus:outline-none 
                           dark:bg-gray-700 dark:text-white"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum 8 caractères recommandés
            </p>
          </div>

          {/* Confirmation mot de passe */}
          <div>
            <label 
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Confirmez le mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                className={`w-full px-4 py-3 pr-12 border rounded-lg 
                           focus:ring-2 focus:outline-none 
                           dark:bg-gray-700 dark:text-white ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Feedback visuel */}
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle size={12} />
                Les mots de passe ne correspondent pas
              </p>
            )}
            {confirmPassword && password === confirmPassword && password.length >= 8 && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle size={12} />
                Les mots de passe correspondent
              </p>
            )}
          </div>

          {/* Bouton submit */}
          <button
            type="submit"
            disabled={loading || !fullName.trim() || password.length < 8 || password !== confirmPassword}
            className="w-full py-3 sm:py-4 rounded-lg text-white font-semibold 
                       bg-gradient-to-r from-green-500 to-emerald-600 
                       hover:from-green-600 hover:to-emerald-700 
                       focus:outline-none focus:ring-4 focus:ring-green-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Création...</span>
              </div>
            ) : (
              "Créer mon compte"
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            En créant votre compte, vous acceptez nos{" "}
            <a href="#" className="text-blue-600 hover:underline">
              conditions d'utilisation
            </a>{" "}
            et notre{" "}
            <a href="#" className="text-blue-600 hover:underline">
              politique de confidentialité
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}