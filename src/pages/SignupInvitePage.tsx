// src/pages/SignupInvitePage.tsx - VERSION AVEC TRIGGER
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { 
  CheckCircle, XCircle, Loader, Mail, Lock, 
  UserPlus, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";

export default function SignupInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [channel, setChannel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Formulaire
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    console.log("🚀 Chargement invitation pour signup");
    setLoading(true);
    setError(null);

    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("⏱️ Timeout")), 15000)
      );
      
      const queryPromise = supabase
        .from("external_invitations")
        .select("*, channels(id, name, description, company_id)")
        .eq("token", token)
        .single();
      
      const { data: invitationData, error: invitationError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;

      if (invitationError) {
        setError("Invitation introuvable");
        setLoading(false);
        return;
      }
      
      // Vérifications
      if (invitationData.revoked_at) {
        setError("Cette invitation a été révoquée");
        setLoading(false);
        return;
      }

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
      setChannel(invitationData.channels);

    } catch (error: any) {
      console.error("❌ Erreur chargement invitation:", error);
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
      console.log("🎯 Création du compte et acceptation de l'invitation...");

      // Étape 1: Créer le compte Auth Supabase
      // Le trigger va automatiquement créer l'entrée dans public.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          data: {
            name: name.trim(),
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Impossible de créer l'utilisateur");

      console.log("✅ Compte auth créé:", authData.user.id);
      console.log("✅ Trigger a créé l'entrée dans public.users");

      // Étape 2: Attendre que le trigger s'exécute
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Étape 3: Accepter l'invitation
      // La fonction RPC gère tout : company_id + ajout au canal
      console.log("📨 Acceptation de l'invitation...");
      const { data: acceptData, error: acceptError } = await supabase.rpc("accept_external_invitation", {
        p_token: token,
      });

      if (acceptError) {
        console.error("❌ Erreur acceptation:", acceptError);
        throw acceptError;
      }

      console.log("✅ Invitation acceptée:", acceptData);

      toast.success("🎉 Compte créé ! Bienvenue dans le canal !");

      // Connexion automatique pour établir la session
      console.log("🔑 Connexion automatique...");
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: password,
      });

      if (signInError) {
        // Si la connexion échoue (email non confirmé), rediriger vers login
        console.log("⚠️ Connexion impossible, redirection vers login");
        toast.info("Veuillez confirmer votre email puis vous connecter");
        setTimeout(() => {
          navigate(`/login?redirect=/app/chat/channel/${channel.id}`);
        }, 2000);
      } else {
        // Connexion réussie, redirection vers le canal
        console.log("✅ Connexion réussie, redirection...");
        setTimeout(() => {
          // Utiliser window.location pour forcer un reload complet et rafraîchir le contexte
          window.location.href = `/app/chat/channel/${channel.id}`;
        }, 1500);
      }

    } catch (error: any) {
      console.error("❌ Erreur création compte:", error);
      
      if (error.message?.includes("User already registered")) {
        toast.error("Un compte existe déjà avec cet email. Connectez-vous plutôt.");
        setTimeout(() => {
          navigate(`/login?redirect=/app/invite/${token}`);
        }, 2000);
      } else {
        toast.error(error.message || "Erreur lors de la création du compte");
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <Loader size={48} className="mx-auto text-blue-600 dark:text-blue-400 mb-4 animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">Vérification de l'invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <XCircle size={64} className="mx-auto text-red-600 dark:text-red-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Invitation invalide
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Sloti
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Créer votre compte
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pour rejoindre le canal <strong>#{channel?.name}</strong>
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Mail size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-blue-900 dark:text-blue-200 font-medium mb-1">
                Invitation pour
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300 truncate">
                {invitation?.email}
              </p>
              {channel?.description && (
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                  {channel.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Votre nom *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={accepting}
            />
          </div>

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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Email de l'invitation (non modifiable)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mot de passe *
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={accepting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmer le mot de passe *
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={accepting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {password && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Critères du mot de passe :
              </p>
              <div className="space-y-1 text-xs">
                <div className={`flex items-center gap-2 ${passwordValidation.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {passwordValidation.length ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  <span>Au moins 8 caractères</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {passwordValidation.uppercase ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  <span>Une majuscule</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.lowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {passwordValidation.lowercase ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  <span>Une minuscule</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {passwordValidation.number ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  <span>Un chiffre</span>
                </div>
                {confirmPassword && (
                  <div className={`flex items-center gap-2 ${passwordValidation.match ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {passwordValidation.match ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    <span>Les mots de passe correspondent</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={accepting || !isPasswordValid || !name.trim()}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center gap-2"
          >
            {accepting ? (
              <>
                <Loader size={20} className="animate-spin" />
                Création du compte...
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Créer mon compte et rejoindre
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Vous avez déjà un compte ?{" "}
            <button
              onClick={() => navigate(`/login?redirect=/app/invite/${token}`)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Se connecter
            </button>
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            En créant un compte, vous acceptez les conditions d'utilisation
          </p>
        </div>
      </div>
    </div>
  );
}