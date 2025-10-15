import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../assets/Sloti.svg";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      // Étape 1 : création de l'utilisateur Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Impossible de créer l'utilisateur");

      // Étape 2 : création de la company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({ name: companyName })
        .select()
        .single();

      if (companyError) throw companyError;

      // Étape 3 : ajout de l'utilisateur dans `users` avec company_id
      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        email,
        company_id: company.id,
        role: "admin", // premier inscrit → admin
      });

      if (userError) throw userError;

      setSuccess("✅ Vérifie ta boîte mail pour confirmer ton inscription 📩");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      console.error("Erreur signup:", err);
      setError("Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-xl">
        {/* Logo + Titre */}
        <div className="text-center mb-8">
          <img src={logo} alt="Sloti Logo" className="mx-auto h-16 w-auto mb-4" />
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Créer un compte
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Rejoignez <span className="font-semibold">Sloti</span> dès aujourd’hui 🚀
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm text-center">
            {success}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Nom de la société"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:outline-none 
                       dark:bg-gray-700 dark:text-white"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:outline-none 
                       dark:bg-gray-700 dark:text-white"
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:outline-none 
                       dark:bg-gray-700 dark:text-white"
            required
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:outline-none 
                       dark:bg-gray-700 dark:text-white"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-medium 
                       bg-gradient-to-r from-green-500 to-emerald-600 
                       hover:from-green-600 hover:to-emerald-700 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 
                       focus:ring-green-500 disabled:opacity-50 
                       transition-all shadow-md"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        {/* Lien vers Login */}
        <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}