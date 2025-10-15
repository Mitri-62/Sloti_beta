// src/components/InviteExternalModal.tsx
import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Mail, Link as LinkIcon, Copy, Check, X, Calendar} from "lucide-react";
import { toast } from "sonner";

interface InviteExternalModalProps {
  channelId: string;
  onClose: () => void;
}

export default function InviteExternalModal({ channelId, onClose }: InviteExternalModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "guest">("guest");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const createInvitation = async () => {
    if (!email) {
      toast.error("Email requis");
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Email invalide");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_external_invitation", {
        p_channel_id: channelId,
        p_email: email.trim().toLowerCase(),
        p_role: role,
        p_expires_in_days: expiresInDays,
      });

      if (error) throw error;

      // Récupérer le token
      const { data: invitation, error: fetchError } = await supabase
        .from("external_invitations")
        .select("token")
        .eq("id", data)
        .single();

      if (fetchError) throw fetchError;

      if (invitation) {
        // Nettoyer le token ET ajouter /app
        const cleanToken = invitation.token.replace(/\//g, '');
        const link = `${window.location.origin}/app/invite/${cleanToken}`;
        setInvitationLink(link);
        toast.success("Invitation créée !");
      }
      
    } catch (error: any) {
      console.error("Erreur création invitation:", error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success("Lien copié dans le presse-papier !");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendByEmail = () => {
    if (!invitationLink) return;
    
    const subject = encodeURIComponent("Invitation à rejoindre un canal");
    const body = encodeURIComponent(
      `Bonjour,\n\nVous avez été invité(e) à rejoindre un canal.\n\nCliquez sur le lien ci-dessous pour accepter l'invitation :\n${invitationLink}\n\nCette invitation expire dans ${expiresInDays} jour(s).\n\nCordialement`
    );
    
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Inviter un utilisateur externe
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!invitationLink ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rôle
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="guest"
                      checked={role === 'guest'}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white text-sm">
                        👁️ Invité (Lecture seule)
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Peut uniquement lire les messages
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="member"
                      checked={role === 'member'}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white text-sm">
                        ✏️ Membre (Lecture + Écriture)
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Peut lire et envoyer des messages
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expiration
                </label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 jour</option>
                    <option value={3}>3 jours</option>
                    <option value={7}>7 jours</option>
                    <option value={14}>14 jours</option>
                    <option value={30}>30 jours</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  ℹ️ Un lien d'invitation unique sera généré. L'invité devra utiliser l'email <strong>{email || '...'}</strong> pour accepter.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createInvitation}
                  disabled={loading || !email}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? "Création..." : "Créer l'invitation"}
                </button>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-300 mb-2 font-medium">
                  ✅ Invitation créée avec succès !
                </p>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Envoyez ce lien à <strong>{email}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lien d'invitation
                </label>
                <div className="relative">
                  <LinkIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={invitationLink}
                    readOnly
                    className="w-full pl-10 pr-24 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1 transition-colors"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copié" : "Copier"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={sendByEmail}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Mail size={16} />
                  Envoyer par email
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}