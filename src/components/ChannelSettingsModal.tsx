// src/components/ChannelSettingsModal.tsx
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { 
  X, Users, UserPlus, Trash2, Shield, Eye, Edit2, 
  Mail, Clock, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import InviteExternalModal from "./InviteExternalModal";

interface ChannelSettingsModalProps {
  channelId: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  can_write: boolean;
  can_invite: boolean;
  joined_at: string;
  users: {
    name: string;
    email: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export default function ChannelSettingsModal({ 
  channelId, 
  onClose, 
  onUpdate 
}: ChannelSettingsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'settings'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [channelId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger le canal
      const { data: channelData, error: channelError } = await supabase
        .from("channels")
        .select("*")
        .eq("id", channelId)
        .single();

      if (channelError) throw channelError;
      setChannel(channelData);

      // Charger les membres
      const { data: membersData, error: membersError } = await supabase
        .from("channel_members")
        .select(`
          *,
          users(name, email)
        `)
        .eq("channel_id", channelId)
        .order("joined_at", { ascending: false });

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Charger les invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("external_invitations")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false });

      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);

    } catch (error: any) {
      console.error("Erreur chargement:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberUserId: string) => {
    if (!confirm("Voulez-vous vraiment retirer ce membre ?")) return;

    try {
      const { error } = await supabase.rpc("revoke_channel_access", {
        p_channel_id: channelId,
        p_user_id: memberUserId,
      });

      if (error) throw error;

      toast.success("Membre retiré");
      loadData();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du retrait");
    }
  };

  const changeRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("channel_members")
        .update({ 
          role: newRole,
          can_invite: newRole === 'admin',
          can_write: newRole !== 'guest'
        })
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Rôle modifié");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la modification");
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    if (!confirm("Voulez-vous vraiment révoquer cette invitation ?")) return;

    try {
      const { error } = await supabase.rpc("revoke_invitation", {
        p_invitation_id: invitationId,
      });

      if (error) throw error;

      toast.success("Invitation révoquée");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la révocation");
    }
  };

  const deleteChannel = async () => {
    const confirm1 = confirm(`Voulez-vous vraiment supprimer le canal "${channel?.name}" ?`);
    if (!confirm1) return;

    const confirm2 = confirm("Cette action est irréversible. Tous les messages seront perdus. Continuer ?");
    if (!confirm2) return;

    try {
      const { error } = await supabase
        .from("channels")
        .delete()
        .eq("id", channelId);

      if (error) throw error;

      toast.success("Canal supprimé");
      onClose();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.revoked_at) {
      return { icon: XCircle, text: "Révoquée", color: "text-red-600 dark:text-red-400" };
    }
    if (invitation.used_at) {
      return { icon: CheckCircle, text: "Acceptée", color: "text-green-600 dark:text-green-400" };
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return { icon: Clock, text: "Expirée", color: "text-gray-600 dark:text-gray-400" };
    }
    return { icon: Clock, text: "En attente", color: "text-blue-600 dark:text-blue-400" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Paramètres du canal
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              #{channel?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              Membres ({members.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'invitations'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Mail size={16} />
              Invitations ({invitations.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Edit2 size={16} />
              Paramètres
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Tab Membres */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {members.length} membre{members.length > 1 ? 's' : ''}
                </p>
                {(channel?.type === 'external' || channel?.type === 'public') && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UserPlus size={16} />
                    Inviter
                  </button>
                )}
              </div>

              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {member.users.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {member.users.name}
                        {member.user_id === user?.id && (
                          <span className="text-xs text-gray-500 ml-2">(vous)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {member.users.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'admin' && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-medium">
                          <Shield size={12} />
                          Admin
                        </span>
                      )}
                      {member.role === 'guest' && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full font-medium">
                          <Eye size={12} />
                          Invité
                        </span>
                      )}
                    </div>
                  </div>

                  {member.user_id !== user?.id && (
                    <div className="flex items-center gap-2 ml-3">
                      <select
                        value={member.role}
                        onChange={(e) => changeRole(member.id, e.target.value)}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Membre</option>
                        <option value="guest">Invité</option>
                      </select>
                      <button
                        onClick={() => removeMember(member.id)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Retirer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tab Invitations */}
          {activeTab === 'invitations' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {invitations.length} invitation{invitations.length > 1 ? 's' : ''}
                </p>
                {channel?.type === 'external' && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UserPlus size={16} />
                    Nouvelle invitation
                  </button>
                )}
              </div>

              {invitations.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Mail size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune invitation</p>
                </div>
              ) : (
                invitations.map((invitation) => {
                  const status = getInvitationStatus(invitation);
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {invitation.email}
                          </p>
                          <span className={`flex items-center gap-1 text-xs ${status.color}`}>
                            <StatusIcon size={12} />
                            {status.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>Rôle: {invitation.role}</span>
                          <span>•</span>
                          <span>Expire: {formatDate(invitation.expires_at)}</span>
                        </div>
                      </div>

                      {!invitation.used_at && !invitation.revoked_at && new Date(invitation.expires_at) > new Date() && (
                        <button
                          onClick={() => revokeInvitation(invitation.id)}
                          className="ml-3 p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Révoquer"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab Paramètres */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom du canal
                </label>
                <input
                  type="text"
                  value={channel?.name || ''}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={channel?.description || ''}
                  readOnly
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <input
                  type="text"
                  value={channel?.type || ''}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white capitalize"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Zone de danger
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  La suppression du canal est irréversible. Tous les messages seront perdus.
                </p>
                <button
                  onClick={deleteChannel}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Supprimer le canal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'invitation */}
      {showInviteModal && (
        <InviteExternalModal
          channelId={channelId}
          onClose={() => {
            setShowInviteModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}