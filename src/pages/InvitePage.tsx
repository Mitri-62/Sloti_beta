// src/pages/InvitePage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { 
  CheckCircle, XCircle, Loader, Mail, Shield, 
  Calendar, AlertTriangle, LogIn, UserPlus 
} from "lucide-react";
import { toast } from "sonner";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [channel, setChannel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token]);

  const loadInvitation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger l'invitation (accès public pour validation)
      const { data: invitationData, error: invitationError } = await supabase
        .from("external_invitations")
        .select("*")
        .eq("token", token)
        .single();

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

      setInvitation(invitationData);

      // Charger les infos du canal (accès public limité)
      const { data: channelData, error: channelError } = await supabase
        .from("channels")
        .select("id, name, description, type, company_id")
        .eq("id", invitationData.channel_id)
        .single();

      if (channelError) throw channelError;
      setChannel(channelData);

    } catch (error: any) {
      console.error("Erreur chargement invitation:", error);
      setError("Erreur lors du chargement de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!user) {
      toast.info("Vous devez être connecté pour accepter l'invitation");
      // Rediriger vers login avec retour sur cette page
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }

    // Vérifier que l'email correspond
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      toast.error(`Cette invitation a été envoyée à ${invitation.email}. Connectez-vous avec ce compte.`);
      return;
    }

    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc("accept_external_invitation", {
        p_token: token,
      });

      if (error) throw error;

      toast.success("Invitation acceptée ! Bienvenue dans le canal 🎉");
      
      // Rediriger vers le canal
      setTimeout(() => {
        navigate(`/app/chat/channel/${data.channel_id}`);
      }, 1000);

    } catch (error: any) {
      console.error("Erreur acceptation invitation:", error);
      toast.error(error.message || "Erreur lors de l'acceptation");
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invitation à rejoindre un canal
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Vous avez été invité(e) à rejoindre
          </p>
        </div>

        {/* Canal info */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl font-bold">
                #{channel?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                #{channel?.name}
              </h2>
              {channel?.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {channel.description}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Mail size={14} />
              <span>Invité: <strong>{invitation?.email}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Shield size={14} />
              <span>Rôle: <strong className="capitalize">{invitation?.role}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar size={14} />
              <span>Expire: <strong>{formatDate(invitation?.expires_at)}</strong></span>
            </div>
          </div>
        </div>

        {/* Permissions info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 text-sm">
            Vos permissions
          </h3>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
            {invitation?.role === 'guest' ? (
              <>
                <li>✅ Voir les messages du canal</li>
                <li>❌ Envoyer des messages</li>
                <li>❌ Inviter d'autres personnes</li>
              </>
            ) : (
              <>
                <li>✅ Voir les messages du canal</li>
                <li>✅ Envoyer des messages</li>
                <li>❌ Inviter d'autres personnes</li>
              </>
            )}
          </ul>
        </div>

        {/* Actions */}
        {user ? (
          user.email?.toLowerCase() === invitation?.email.toLowerCase() ? (
            <div className="space-y-3">
              <button
                onClick={acceptInvitation}
                disabled={accepting}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center gap-2"
              >
                {accepting ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Acceptation en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Accepter l'invitation
                  </>
                )}
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Refuser
              </button>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                    Email incorrect
                  </p>
                  <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-3">
                    Vous êtes connecté avec <strong>{user.email}</strong>, mais cette invitation a été envoyée à <strong>{invitation?.email}</strong>.
                  </p>
                  <button
                    onClick={() => {
                      // Déconnexion et redirection vers login
                      supabase.auth.signOut();
                      navigate(`/login?redirect=/invite/${token}`);
                    }}
                    className="text-xs bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700 transition-colors"
                  >
                    Se connecter avec le bon compte
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/login?redirect=/invite/${token}`)}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold flex items-center justify-center gap-2"
            >
              <LogIn size={20} />
              Se connecter pour accepter
            </button>
            <button
              onClick={() => navigate(`/register?redirect=/invite/${token}`)}
              className="w-full px-6 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <UserPlus size={20} />
              Créer un compte
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            En acceptant, vous acceptez les conditions d'utilisation
          </p>
        </div>
      </div>
    </div>
  );
}