// src/pages/FounderDashboard.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import useSuperAdmin from '../hooks/useSuperAdmin';
import useImpersonate from '../hooks/useImpersonate';
import { CompanyWithStats, CompanyStats } from '../types/company.types';
import { toast } from 'sonner';
import {
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  Search,
  Loader,
  Crown,
  Mail,
  Calendar,
  BarChart3,
  Trash2,
  ExternalLink,
  Activity,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Truck,
  Boxes,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  LogIn,
  Plus,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

interface ExtendedCompanyStats {
  total_companies: number;
  total_users: number;
  active_users_7d: number;
  active_companies: number; // Companies avec activité récente
  new_companies_this_month: number;
  avg_users_per_company: number;
  companies_using_tours: number;
  companies_using_3d: number;
  inactive_companies_7d: number;
  retention_rate: number;
}

interface CompanyAlert {
  type: 'inactive' | 'no_users' | 'single_user';
  company: CompanyWithStats;
  message: string;
}

export default function FounderDashboard() {
  const { user } = useAuth();
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const { startImpersonate } = useImpersonate();
  
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [stats, setStats] = useState<ExtendedCompanyStats | null>(null);
  const [alerts, setAlerts] = useState<CompanyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // États pour le modal de création
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    adminEmail: ''
  });
  const [creatingCompany, setCreatingCompany] = useState(false);

  // Charger toutes les companies avec leurs dernières activités
  const loadAllCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies_with_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setCompanies(data || []);
      await calculateExtendedStats(data || []);
      calculateAlerts(data || []);
    } catch (error) {
      console.error('Erreur chargement companies:', error);
      toast.error('Impossible de charger les companies');
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques étendues
  const calculateExtendedStats = async (companiesList: CompanyWithStats[]) => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Utilisateurs actifs dans les 7 derniers jours
      const { data: activeUsersData } = await supabase
        .from('users')
        .select('id')
        .gte('updated_at', sevenDaysAgo.toISOString());

      const activeUsersCount = activeUsersData?.length || 0;

      // Companies avec activité récente (au moins 1 tournée créée)
      const { data: activeTours } = await supabase
        .from('tours')
        .select('company_id')
        .gte('created_at', sevenDaysAgo.toISOString());

      const activeCompanyIds = new Set(activeTours?.map(t => t.company_id) || []);

      // Nouvelles companies ce mois
      const newCompaniesThisMonth = companiesList.filter(
        c => new Date(c.created_at) >= startOfMonth
      ).length;

      // Companies utilisant les tournées
      const companiesWithTours = companiesList.filter(c => (c.tours_count || 0) > 0).length;

      // Companies utilisant le stock (proxy pour la 3D)
      const companiesWithStocks = companiesList.filter(c => (c.stocks_count || 0) > 0).length;

      // Companies inactives (aucune activité depuis 7j)
      const inactiveCompanies = companiesList.filter(
        c => !activeCompanyIds.has(c.id)
      ).length;

      // Taux de rétention (companies actives / total)
      const retentionRate = companiesList.length > 0
        ? Math.round((activeCompanyIds.size / companiesList.length) * 100)
        : 100;

      const totalUsers = companiesList.reduce((sum, c) => sum + (c.users_count || 0), 0);
      const avgUsersPerCompany = companiesList.length > 0
        ? Math.round((totalUsers / companiesList.length) * 10) / 10
        : 0;

      const stats: ExtendedCompanyStats = {
        total_companies: companiesList.length,
        total_users: totalUsers,
        active_users_7d: activeUsersCount,
        active_companies: activeCompanyIds.size,
        new_companies_this_month: newCompaniesThisMonth,
        avg_users_per_company: avgUsersPerCompany,
        companies_using_tours: companiesWithTours,
        companies_using_3d: companiesWithStocks,
        inactive_companies_7d: inactiveCompanies,
        retention_rate: retentionRate,
      };

      setStats(stats);
    } catch (error) {
      console.error('Erreur calcul stats:', error);
    }
  };

  // Calculer les alertes
  const calculateAlerts = (companiesList: CompanyWithStats[]) => {
    const newAlerts: CompanyAlert[] = [];

    companiesList.forEach(company => {
      // Alerte: aucun utilisateur
      if ((company.users_count || 0) === 0) {
        newAlerts.push({
          type: 'no_users',
          company,
          message: `${company.name} n'a aucun utilisateur`,
        });
      }
      // Alerte: un seul utilisateur
      else if ((company.users_count || 0) === 1) {
        newAlerts.push({
          type: 'single_user',
          company,
          message: `${company.name} n'a qu'un seul utilisateur`,
        });
      }

      // Alerte: aucune activité (pas de tournées et pas de stocks)
      if ((company.tours_count || 0) === 0 && (company.stocks_count || 0) === 0) {
        newAlerts.push({
          type: 'inactive',
          company,
          message: `${company.name} n'a aucune activité`,
        });
      }
    });

    setAlerts(newAlerts);
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadAllCompanies();
    }
  }, [isSuperAdmin]);

  // Filtrer les companies
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         company.billing_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Supprimer une company (avec toutes les données liées)
const handleDeleteCompany = async (companyId: string, companyName: string) => {
  if (!confirm(`⚠️ ATTENTION : Êtes-vous sûr de vouloir supprimer "${companyName}" ?\n\nCela supprimera TOUTES les données associées. Cette action est IRRÉVERSIBLE.`)) {
    return;
  }

  try {
    toast.loading('Suppression en cours...', { id: 'delete-company' });

    // Debug : Supprimer chaque table et logger le résultat
    const tables = [
      'transport_bookings',
      'carriers', 
      'tour_stops',
      'tours',
      'planning_events',
      'stock_movements',
      'products',
      'inventory_items',
      'docks',
      'warehouse_zones',
      'drivers',
      'vehicles',
      'messages',
      'chat_channels',
      'loading_plans',
      'clients',
      'contacts',
      'users',
    ];

    for (const table of tables) {
      const { error, count } = await supabase
        .from(table)
        .delete()
        .eq('company_id', companyId);
      
      if (error) {
        console.warn(`⚠️ Erreur suppression ${table}:`, error.message);
      } else {
        console.log(`✅ ${table} supprimé`);
      }
    }

    // Enfin, supprimer la company
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (error) throw error;

    toast.success(`Company "${companyName}" supprimée avec succès`, { id: 'delete-company' });
    loadAllCompanies();
  } catch (error: any) {
    console.error('Erreur suppression company:', error);
    toast.error(`Erreur: ${error.message}`, { id: 'delete-company' });
  }
};

  // Se connecter en tant qu'admin de la company
  const handleImpersonate = async (companyId: string, companyName: string) => {
    if (!confirm(`🔓 Voulez-vous vous connecter en tant qu'admin de "${companyName}" ?\n\nVous verrez l'application exactement comme leurs utilisateurs.`)) {
      return;
    }

    toast.loading('Connexion en cours...');
    const success = await startImpersonate(companyId, companyName);
    
    if (success) {
      toast.success(`Connecté en tant qu'admin de ${companyName}`);
    } else {
      toast.error('Impossible de se connecter');
    }
  };

  // Créer une nouvelle company et envoyer email d'invitation
  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) {
      toast.error('Le nom de la company est requis');
      return;
    }

    if (!newCompany.adminEmail.trim()) {
      toast.error("L'email de l'admin est requis");
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCompany.adminEmail)) {
      toast.error('Email invalide');
      return;
    }

    setCreatingCompany(true);
    try {
      // 1. Créer la company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([{ 
          name: newCompany.name.trim(),
          billing_email: newCompany.adminEmail.trim()
        }])
        .select()
        .single();

      if (companyError) throw companyError;

      // 2. Envoyer un email d'invitation (magic link)
      const { error: inviteError } = await supabase.auth.signInWithOtp({
        email: newCompany.adminEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/signup?company_id=${company.id}&company_name=${encodeURIComponent(company.name)}`,
          data: {
            company_id: company.id,
            company_name: company.name,
            role: 'admin'
          }
        }
      });

      if (inviteError) {
        console.warn('Erreur envoi email:', inviteError);
        // On ne bloque pas la création si l'email échoue
      }

      toast.success(`✅ Company "${newCompany.name}" créée ! Email d'invitation envoyé.`);
      setShowCreateModal(false);
      setNewCompany({ name: '', adminEmail: '' });
      
      // Recharger les données
      loadAllCompanies();
    } catch (err: any) {
      console.error('Erreur création company:', err);
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setCreatingCompany(false);
    }
  };

  // Badge d'alerte
  const getAlertBadge = (type: 'inactive' | 'no_users' | 'single_user') => {
    const styles = {
      inactive: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', icon: AlertTriangle },
      no_users: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', icon: AlertCircle },
      single_user: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', icon: Users },
    };

    const style = styles[type];
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon size={12} />
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!isSuperAdmin) {
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
                Cette page est réservée aux fondateurs de Sloti.
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
            <Crown className="text-yellow-500" size={28} />
            Dashboard Fondateur
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Vue d'ensemble de toutes les companies Sloti
          </p>
        </div>

        {/* Bouton Créer une company */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Créer une company</span>
          <span className="sm:hidden">Créer</span>
        </button>
      </div>

      {/* Statistiques principales */}
      {stats && (
        <>
          {/* Métriques Business */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Building2 size={24} />
                <span className="text-2xl font-bold">{stats.total_companies}</span>
              </div>
              <div className="text-blue-100 text-sm font-medium mb-1">Companies totales</div>
              {stats.new_companies_this_month > 0 && (
                <div className="flex items-center gap-1 text-xs text-blue-200">
                  <ArrowUpRight size={14} />
                  +{stats.new_companies_this_month} ce mois
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Users size={24} />
                <span className="text-2xl font-bold">{stats.total_users}</span>
              </div>
              <div className="text-green-100 text-sm font-medium mb-1">Utilisateurs totaux</div>
              <div className="flex items-center gap-1 text-xs text-green-200">
                <UserCheck size={14} />
                {stats.avg_users_per_company} par company
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Activity size={24} />
                <span className="text-2xl font-bold">{stats.active_users_7d}</span>
              </div>
              <div className="text-purple-100 text-sm font-medium mb-1">Utilisateurs actifs (7j)</div>
              <div className="flex items-center gap-1 text-xs text-purple-200">
                <TrendingUp size={14} />
                {Math.round((stats.active_users_7d / stats.total_users) * 100)}% du total
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Target size={24} />
                <span className="text-2xl font-bold">{stats.retention_rate}%</span>
              </div>
              <div className="text-orange-100 text-sm font-medium mb-1">Taux de rétention</div>
              <div className="flex items-center gap-1 text-xs text-orange-200">
                <CheckCircle size={14} />
                {stats.active_companies} companies actives
              </div>
            </div>
          </div>

          {/* Adoption des fonctionnalités */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Adoption */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Zap className="text-yellow-500" size={20} />
                Adoption des fonctionnalités
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Truck size={16} className="text-blue-500" />
                      <span>Tournées</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {stats.companies_using_tours} / {stats.total_companies}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(stats.companies_using_tours / stats.total_companies) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Boxes size={16} className="text-purple-500" />
                      <span>Gestion 3D / Stocks</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {stats.companies_using_3d} / {stats.total_companies}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(stats.companies_using_3d / stats.total_companies) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Alertes */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" size={20} />
                Alertes ({alerts.length})
              </h3>
              
              {alerts.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Aucune alerte ! Tout va bien 🎉
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {alerts.slice(0, 5).map((alert, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                    >
                      {getAlertBadge(alert.type)}
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {alert.message}
                      </span>
                    </div>
                  ))}
                  {alerts.length > 5 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                      +{alerts.length - 5} autres alertes
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Recherche */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher une company par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Liste des companies */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Statistiques
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Créée le
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCompanies.map((company) => {
                const companyAlerts = alerts.filter(a => a.company.id === company.id);
                
                return (
                  <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Building2 size={16} className="text-blue-500" />
                          {company.name}
                          {companyAlerts.length > 0 && (
                            <span className="ml-2 flex gap-1">
                              {companyAlerts.map((alert, idx) => (
                                <span key={idx}>{getAlertBadge(alert.type)}</span>
                              ))}
                            </span>
                          )}
                        </div>
                        {company.billing_email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                            <Mail size={10} />
                            {company.billing_email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-gray-400" />
                          <span className="text-gray-900 dark:text-white">
                            <strong>{company.users_count || 0}</strong> utilisateur{(company.users_count || 0) > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Truck size={14} className="text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {company.tours_count || 0} tournée{(company.tours_count || 0) > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {company.stocks_count || 0} article{(company.stocks_count || 0) > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar size={14} />
                        {new Date(company.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleImpersonate(company.id, company.name)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded transition-colors"
                          title="Se connecter comme admin"
                        >
                          <LogIn size={18} />
                        </button>

                        <button
                          onClick={() => window.open(`/app?company_id=${company.id}`, '_blank')}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Voir en détail"
                        >
                          <ExternalLink size={18} />
                        </button>

                        <button
                          onClick={() => handleDeleteCompany(company.id, company.name)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'Aucune company trouvée' : 'Aucune company enregistrée'}
            </p>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
        Affichage de {filteredCompanies.length} sur {companies.length} companies
      </div>

      {/* Modal de création de company */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Créer une nouvelle company
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCompany({ name: '', adminEmail: '' });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Formulaire */}
            <div className="space-y-4">
              {/* Nom de la company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom de la company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="Ex: TechCorp Solutions"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Email de l'admin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email du futur administrateur <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={newCompany.adminEmail}
                    onChange={(e) => setNewCompany({ ...newCompany, adminEmail: e.target.value })}
                    placeholder="admin@techcorp.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Mail className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-semibold mb-1">📧 Email d'invitation</p>
                    <p>
                      Un email sera envoyé à cette adresse avec un lien d'inscription. 
                      L'admin pourra créer son compte et commencer à utiliser Sloti.
                    </p>
                  </div>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCompany({ name: '', adminEmail: '' });
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateCompany}
                  disabled={
                    creatingCompany || 
                    !newCompany.name.trim() || 
                    !newCompany.adminEmail.trim()
                  }
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creatingCompany ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Créer et inviter
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}