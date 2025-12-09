// src/pages/TeamManagement.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  AlertCircle,
  Crown,
  UserCog,
  Wrench,
  User,
  GraduationCap,
  Briefcase,
  Loader,
} from 'lucide-react';

// Types de rôles disponibles
type UserRole = 'admin' | 'team_leader' | 'technician' | 'operator' | 'employee' | 'intern';

// Configuration des rôles
const ROLES_CONFIG: Record<UserRole, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  admin: {
    label: 'Administrateur',
    icon: <Crown className="text-yellow-500" size={18} />,
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  team_leader: {
    label: 'Chef d\'équipe',
    icon: <UserCog className="text-blue-500" size={18} />,
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  technician: {
    label: 'Technicien',
    icon: <Wrench className="text-orange-500" size={18} />,
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
  operator: {
    label: 'Opérateur',
    icon: <Briefcase className="text-purple-500" size={18} />,
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  employee: {
    label: 'Employé',
    icon: <User className="text-green-500" size={18} />,
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  intern: {
    label: 'Stagiaire',
    icon: <GraduationCap className="text-pink-500" size={18} />,
    badgeClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  },
};

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function TeamManagement() {
  const { user } = useAuth();
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'employee' as UserRole
  });
  const [inviting, setInviting] = useState(false);

  // Charger les membres de l'équipe
  const loadTeamMembers = async () => {
    if (!user?.company_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, created_at')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: true });

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

  // Inviter un utilisateur
// Inviter un utilisateur
const handleInvite = async (e: React.FormEvent) => {
  e.preventDefault();

  // Vérifier que l'email n'existe pas déjà dans cette équipe
  const emailExists = members.some(m => m.email.toLowerCase() === inviteForm.email.toLowerCase());
  if (emailExists) {
    toast.error('Cet email existe déjà dans votre équipe');
    return;
  }

  setInviting(true);

  try {
    // Générer un mot de passe temporaire
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: inviteForm.email,
      password: tempPassword,
    });

    // Si l'utilisateur existe déjà dans Auth
    if (authError?.message?.includes('already registered')) {
      toast.error('Cet email a déjà un compte Sloti. Demandez-lui de vous contacter pour rejoindre votre équipe.');
      setInviting(false);
      return;
    }

    if (authError) throw authError;
    if (!authData.user) throw new Error('Impossible de créer l\'utilisateur');

    // Ajouter l'utilisateur dans la table users
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: inviteForm.email,
        full_name: inviteForm.email.split('@')[0],
        company_id: user?.company_id,
        role: inviteForm.role,
      });

    if (userError) {
      console.error('Erreur insertion user:', userError);
      throw userError;
    }

    toast.success(`Invitation envoyée à ${inviteForm.email} ! 📧`);
    setShowInviteModal(false);
    setInviteForm({ email: '', role: 'employee' });
    loadTeamMembers();
  } catch (error: any) {
    console.error('Erreur invitation:', error);
    toast.error(error.message || 'Erreur lors de l\'invitation');
  } finally {
    setInviting(false);
  }
};

  // Supprimer un utilisateur
  const handleRemoveUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer ${userEmail} de l'équipe ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('Utilisateur retiré de l\'équipe');
      loadTeamMembers();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Impossible de retirer cet utilisateur');
    }
  };

  // Obtenir la config d'un rôle (avec fallback)
  const getRoleConfig = (role: string) => {
    return ROLES_CONFIG[role as UserRole] || {
      label: role,
      icon: <Users className="text-gray-500" size={18} />,
      badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // Vérifier que l'utilisateur est admin
  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-red-900 dark:text-red-100 mb-1">
                Accès refusé
              </h3>
              <p className="text-red-700 dark:text-red-300">
                Seuls les administrateurs peuvent gérer l'équipe.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Users size={28} />
            Gestion de l'équipe
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {members.length} membre{members.length > 1 ? 's' : ''} dans votre équipe
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
        >
          <UserPlus size={18} />
          Inviter un membre
        </button>
      </div>

      {/* Liste des membres */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ajouté le
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {members.map((member) => {
                const roleConfig = getRoleConfig(member.role);
                return (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {member.full_name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {member.full_name || 'Sans nom'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Mail size={12} />
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {roleConfig.icon}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleConfig.badgeClass}`}>
                          {roleConfig.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(member.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {member.id !== user?.id && (
                        <button
                          onClick={() => handleRemoveUser(member.id, member.email)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Retirer de l'équipe"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {members.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600 dark:text-gray-400">
              Aucun membre dans l'équipe
            </p>
          </div>
        )}
      </div>

      {/* Modal d'invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UserPlus size={24} />
              Inviter un membre
            </h3>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="nom@entreprise.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rôle
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="employee">👤 Employé</option>
                  <option value="operator">💼 Opérateur</option>
                  <option value="technician">🔧 Technicien</option>
                  <option value="team_leader">👨‍💼 Chef d'équipe</option>
                  <option value="intern">🎓 Stagiaire</option>
                  <option value="admin">👑 Administrateur</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Les admins peuvent gérer l'équipe et les paramètres
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteForm({ email: '', role: 'employee' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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