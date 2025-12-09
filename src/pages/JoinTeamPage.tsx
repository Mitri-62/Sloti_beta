// src/pages/JoinTeamPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { 
  CheckCircle, XCircle, Loader, Mail, Lock, 
  UserPlus, Eye, EyeOff, Building2
} from "lucide-react";
import { toast } from "sonner";
import logo from "../assets/Sloti.svg";

export default function JoinTeamPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Formulaire
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Validation du mot de passe
  const passwordValidation = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  const isPasswordValid = Object.values(passwordValidation).every(v => v);

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token]);

  const loadInvitation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger l'invitation avec les infos de la company
      const { data: invitationData, error: invitationError } = await supabase
        .from("team_invitations")
        .select("*, companies(id, name)")
        .eq("token", token)
        .single();

      if (invitationError || !invitationData) {
        setError("Invitation introuvable ou invalide");
        setLoading(false);
        return;
      }

      // Vérifications
      if (invitationData.used_at) {
        setError("Cette invitation a déjà été utilisée");
        setLoading(false);
        return;
      }

      if (new Date(invitationData.expires_at) < new Date()) {
        setError("Cette invitation a expiré");
        setLoading(false);
        return;
      }

      console.log("✅ Invitation valide:", invitationData);
      setInvitation(invitationData);
      setCompany(invitationData.companies);

    } catch (error: any) {
      console.error("Erreur chargement invitation:", error);
      setError("Erreur lors du chargement de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error("Veuillez remplir tous les critères du mot de passe");
      return;
    }

    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setAccepting(true);

    try {
      console.log("🎯 Création du compte...");

      // 1. Créer le compte Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
      });

      if (authError) {
        if (authError.message?.includes("already registered")) {
          toast.error("Un compte existe déjà avec cet email. Connectez-vous plutôt.");
          setTimeout(() => navigate("/login"), 2000);
          return;
        }
        throw authError;
      }

      if (!authData.user) throw new Error("Impossible de créer l'utilisateur");

      console.log("✅ Compte auth créé:", authData.user.id);

      // 2. Créer l'entrée dans la table users
      const { error: userError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: invitation.email,
          full_name: name.trim(),
          company_id: invitation.company_id,
          role: invitation.role,
        });

      if (userError) {
        console.error("Erreur création user:", userError);
        // Si duplicate, essayer update
        if (userError.code === '23505') {
          await supabase
            .from("users")
            .update({
              full_name: name.trim(),
              company_id: invitation.company_id,
              role: invitation.role,
            })
            .eq('id', authData.user.id);
        }
      }

      console.log("✅ User créé dans la table");

      // 3. Marquer l'invitation comme utilisée
      await supabase
        .from("team_invitations")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invitation.id);

      console.log("✅ Invitation marquée comme utilisée");

      toast.success("🎉 Compte créé avec succès !");

      // 4. Connexion automatique
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: password,
      });

      if (signInError) {
        toast.info("Veuillez vous connecter");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        console.log("✅ Connexion réussie, redirection...");
        setTimeout(() => {
          window.location.href = "/app";
        }, 1500);
      }

    } catch (error: any) {
      console.error("Erreur création compte:", error);
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setAccepting(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <Loader size={48} className="mx-auto text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <XCircle size={64} className="mx-auto text-red-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invitation invalide
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Formulaire
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={logo} alt="Sloti" className="mx-auto h-16 w-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Rejoindre l'équipe
          </h1>
        </div>

        {/* Info company */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Building2 size={24} className="text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
                Vous êtes invité(e) à rejoindre
              </p>
              <p className="text-lg font-bold text-blue-800 dark:text-blue-300">
                {company?.name}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Votre nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
              disabled={accepting}
              autoFocus
            />
          </div>

          {/* Email (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={invitation?.email || ""}
                readOnly
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Email de l'invitation (non modifiable)</p>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                disabled={accepting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirmer mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmer le mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                disabled={accepting}
              />
            </div>
          </div>

          {/* Validation mot de passe */}
          {password && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Critères du mot de passe :
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className={`flex items-center gap-1 ${passwordValidation.length ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordValidation.length ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  <span>8+ caractères</span>
                </div>
                <div className={`flex items-center gap-1 ${passwordValidation.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordValidation.uppercase ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  <span>1 majuscule</span>
                </div>
                <div className={`flex items-center gap-1 ${passwordValidation.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordValidation.lowercase ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  <span>1 minuscule</span>
                </div>
                <div className={`flex items-center gap-1 ${passwordValidation.number ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordValidation.number ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  <span>1 chiffre</span>
                </div>
              </div>
              {confirmPassword && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${passwordValidation.match ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordValidation.match ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  <span>Les mots de passe correspondent</span>
                </div>
              )}
            </div>
          )}

          {/* Bouton submit */}
          <button
            type="submit"
            disabled={accepting || !isPasswordValid || !name.trim()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition-all"
          >
            {accepting ? (
              <>
                <Loader size={20} className="animate-spin" />
                Création du compte...
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Créer mon compte
              </>
            )}
          </button>
        </form>

        {/* Lien login */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Vous avez déjà un compte ?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-blue-600 hover:underline font-medium"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}