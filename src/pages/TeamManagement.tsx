// src/pages/TeamManagement.tsx
// 🔒 SÉCURITÉ: Defense-in-depth avec filtre company_id sur UPDATE/DELETE users
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  UserCog,
  Wrench,
  Briefcase,
  User,
  GraduationCap,
  Loader,
  Trash2,
  X,
  Shield,
  AlertCircle,
  CheckCircle,
  Search,
} from 'lucide-react';

// Types
interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  avatar_url?: string;
}

// Configuration des rôles
const ROLES = {
  admin: { label: 'Administrateur', icon: Crown, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  team_leader: { label: 'Chef d\'équipe', icon: UserCog, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  technician: { label: 'Technicien', icon: Wrench, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  operator: { label: 'Opérateur', icon: Briefcase, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  employee: { label: 'Employé', icon: User, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  intern: { label: 'Stagiaire', icon: GraduationCap, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
};

export default function TeamManagement() {
  const { user } = useAuth();
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal d'invitation
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'employee', fullName: '' });
  const [inviting, setInviting] = useState(false);

  // Charger les membres de l'équipe
  const loadTeamMembers = async () => {
    if (!user?.company_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Erreur chargement équipe:', error);
      toast.error('Impossible de charger l\'équipe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, [user?.company_id]);

  // Filtrer les membres
  const filteredMembers = members.filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      member.email.toLowerCase().includes(query) ||
      member.full_name?.toLowerCase().includes(query) ||
      member.role?.toLowerCase().includes(query)
    );
  });

  // ✅ INVITER UN MEMBRE VIA EDGE FUNCTION
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteForm.email.trim()) {
      toast.error('L\'email est requis');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteForm.email)) {
      toast.error('Email invalide');
      return;
    }

    // Vérifier si l'email existe déjà dans l'équipe
    const emailExists = members.some(m => m.email.toLowerCase() === inviteForm.email.toLowerCase());
    if (emailExists) {
      toast.error('Cet email existe déjà dans votre équipe');
      return;
    }

    setInviting(true);
    try {
      // Inviter via Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: inviteForm.email.toLowerCase().trim(),
            company_id: user?.company_id,
            role: inviteForm.role,
            full_name: inviteForm.fullName.trim() || inviteForm.email.split('@')[0],
            redirect_url: `${window.location.origin}/signup`,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'invitation');
      }

      console.log('✅ Invitation envoyée:', result);

      toast.success(`📧 Invitation envoyée à ${inviteForm.email} !`, { duration: 5000 });
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'employee', fullName: '' });
      loadTeamMembers();

    } catch (error: any) {
      console.error('Erreur invitation:', error);
      toast.error(error.message || 'Erreur lors de l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  // 🔒 SÉCURITÉ: Changer le rôle d'un membre AVEC filtre company_id
  const handleChangeRole = async (memberId: string, newRole: string) => {
    // Ne pas permettre de changer son propre rôle
    if (memberId === user?.id) {
      toast.error('Vous ne pouvez pas modifier votre propre rôle');
      return;
    }

    if (!user?.company_id) return; // 🔒 Guard clause

    try {
      // 🔒 SÉCURITÉ: Defense-in-depth - Ajout du filtre company_id sur UPDATE
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('company_id', user.company_id); // 🔒 Defense-in-depth

      if (error) throw error;

      toast.success('Rôle mis à jour');
      loadTeamMembers();
    } catch (error: any) {
      console.error('Erreur changement rôle:', error);
      toast.error('Erreur lors du changement de rôle');
    }
  };

  // 🔒 SÉCURITÉ: Supprimer un membre AVEC filtre company_id
  const handleRemoveMember = async (member: TeamMember) => {
    if (member.id === user?.id) {
      toast.error('Vous ne pouvez pas vous supprimer vous-même');
      return;
    }

    if (!user?.company_id) return; // 🔒 Guard clause

    if (!confirm(`Supprimer ${member.full_name || member.email} de l'équipe ?`)) {
      return;
    }

    try {
      // 🔒 SÉCURITÉ: Defense-in-depth - Ajout du filtre company_id sur DELETE
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', member.id)
        .eq('company_id', user.company_id); // 🔒 Defense-in-depth

      if (error) throw error;

      toast.success(`${member.full_name || member.email} supprimé de l'équipe`);
      loadTeamMembers();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Badge de rôle
  const RoleBadge = ({ role }: { role: string }) => {
    const config = ROLES[role as keyof typeof ROLES] || ROLES.employee;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  // Avatar
  const Avatar = ({ member }: { member: TeamMember }) => {
    const initials = (member.full_name || member.email)
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
        {initials}
      </div>
    );
  };

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Users className="text-blue-500" size={28} />
            Gestion de l'équipe
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {members.length} membre{members.length > 1 ? 's' : ''} dans votre équipe
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <UserPlus size={20} />
          <span>Inviter un membre</span>
        </button>
      </div>

      {/* Recherche */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Liste des membres */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'Aucun membre trouvé' : 'Aucun membre dans l\'équipe'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <Avatar member={member} />

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {member.full_name || 'Sans nom'}
                      </h3>
                      {member.id === user?.id && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          (Vous)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      <Mail size={12} />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>

                  {/* Rôle */}
                  <div className="hidden sm:block">
                    {member.id === user?.id ? (
                      <RoleBadge role={member.role} />
                    ) : (
                      <select
                        value={member.role || 'employee'}
                        onChange={(e) => handleChangeRole(member.id, e.target.value)}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(ROLES).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Actions */}
                  {member.id !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(member)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                {/* Rôle mobile */}
                <div className="mt-3 sm:hidden">
                  {member.id === user?.id ? (
                    <RoleBadge role={member.role} />
                  ) : (
                    <select
                      value={member.role || 'employee'}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:text-white"
                    >
                      {Object.entries(ROLES).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="text-blue-500" size={24} />
                Inviter un membre
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteForm({ email: '', role: 'employee', fullName: '' });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="collegue@entreprise.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Nom (optionnel) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom complet <span className="text-gray-400">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={inviteForm.fullName}
                  onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rôle
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {Object.entries(ROLES).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Mail className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Un email d'invitation sera envoyé automatiquement. Le membre pourra créer son mot de passe et rejoindre votre équipe.
                  </p>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteForm({ email: '', role: 'employee', fullName: '' });
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteForm.email.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {inviting ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      Envoyer l'invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}