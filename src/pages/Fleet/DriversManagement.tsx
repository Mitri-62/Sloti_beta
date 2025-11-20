// src/pages/Fleet/DriversManagement.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { 
  UserCog, Plus, Edit2, Trash2, Search, Phone, Mail,
  CheckCircle, XCircle, Clock, AlertTriangle, Calendar,
  Award, FileText, AlertCircle as AlertIcon, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

interface Driver {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string;
  status: 'available' | 'on_tour' | 'unavailable' | 'on_leave';
  license_number: string;
  license_type: string;
  license_expiry: string;
  fimo_expiry?: string;
  fco_expiry?: string;
  adr_expiry?: string;
  medical_exam_expiry?: string;
  hire_date?: string;
  notes?: string;
  created_at: string;
}

type DriverFormData = Omit<Driver, 'id' | 'company_id' | 'created_at'>;

const DRIVER_STATUS = [
  { value: 'available', label: 'Disponible', color: 'green', icon: CheckCircle },
  { value: 'on_tour', label: 'En tournée', color: 'blue', icon: Clock },
  { value: 'unavailable', label: 'Indisponible', color: 'red', icon: XCircle },
  { value: 'on_leave', label: 'En congé', color: 'orange', icon: Calendar }
];

const LICENSE_TYPES = [
  { value: 'B', label: 'Permis B (≤ 3.5T)' },
  { value: 'C', label: 'Permis C (> 3.5T)' },
  { value: 'C1', label: 'Permis C1 (3.5T - 7.5T)' },
  { value: 'CE', label: 'Permis CE (> 3.5T + remorque)' },
  { value: 'C1E', label: 'Permis C1E (3.5T - 7.5T + remorque)' }
];

export default function DriversManagement() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState<DriverFormData>({
    name: '',
    email: '',
    phone: '',
    status: 'available',
    license_number: '',
    license_type: 'C',
    license_expiry: '',
    fimo_expiry: '',
    fco_expiry: '',
    adr_expiry: '',
    medical_exam_expiry: '',
    hire_date: '',
    notes: ''
  });

  useEffect(() => {
    loadDrivers();
  }, [user?.company_id]);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchTerm, statusFilter]);

  const loadDrivers = async () => {
    if (!user?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Erreur chargement chauffeurs:', error);
      toast.error('Erreur lors du chargement des chauffeurs');
    } finally {
      setLoading(false);
    }
  };

  const filterDrivers = () => {
    let filtered = [...drivers];

    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    setFilteredDrivers(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.company_id) return;

    try {
      // Nettoyer les dates vides en les convertissant en null
      const cleanedData = {
        ...formData,
        fimo_expiry: formData.fimo_expiry || null,
        fco_expiry: formData.fco_expiry || null,
        adr_expiry: formData.adr_expiry || null,
        medical_exam_expiry: formData.medical_exam_expiry || null,
        hire_date: formData.hire_date || null,
        notes: formData.notes || null
      };

      if (editingDriver) {
        const { error } = await supabase
          .from('drivers')
          .update(cleanedData)
          .eq('id', editingDriver.id);

        if (error) throw error;
        toast.success('Chauffeur mis à jour avec succès');
      } else {
        const { error } = await supabase
          .from('drivers')
          .insert({
            ...cleanedData,
            company_id: user.company_id
          });

        if (error) throw error;
        toast.success('Chauffeur ajouté avec succès');
      }

      loadDrivers();
      closeModal();
    } catch (error) {
      console.error('Erreur sauvegarde chauffeur:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce chauffeur ?')) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Chauffeur supprimé');
      loadDrivers();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openModal = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        status: driver.status,
        license_number: driver.license_number,
        license_type: driver.license_type,
        license_expiry: driver.license_expiry,
        fimo_expiry: driver.fimo_expiry || '',
        fco_expiry: driver.fco_expiry || '',
        adr_expiry: driver.adr_expiry || '',
        medical_exam_expiry: driver.medical_exam_expiry || '',
        hire_date: driver.hire_date || '',
        notes: driver.notes || ''
      });
    } else {
      setEditingDriver(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        status: 'available',
        license_number: '',
        license_type: 'C',
        license_expiry: '',
        fimo_expiry: '',
        fco_expiry: '',
        adr_expiry: '',
        medical_exam_expiry: '',
        hire_date: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDriver(null);
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = DRIVER_STATUS.find(s => s.value === status);
    if (!statusInfo) return null;

    const Icon = statusInfo.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-700 dark:bg-${statusInfo.color}-900/30 dark:text-${statusInfo.color}-300`}>
        <Icon size={14} />
        {statusInfo.label}
      </span>
    );
  };

  const getExpiryWarning = (expiryDate: string) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { color: 'red', icon: XCircle, label: 'Expiré' };
    } else if (daysUntilExpiry <= 30) {
      return { color: 'orange', icon: AlertTriangle, label: `Expire dans ${daysUntilExpiry}j` };
    } else if (daysUntilExpiry <= 90) {
      return { color: 'yellow', icon: AlertIcon, label: `Expire dans ${daysUntilExpiry}j` };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <UserCog size={32} className="text-blue-600 dark:text-blue-400" />
                Gestion des Chauffeurs
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {drivers.length} chauffeur{drivers.length > 1 ? 's' : ''} dans votre équipe
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2 font-medium transition-colors"
            >
              <Plus size={20} />
              Ajouter un chauffeur
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un chauffeur..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtre statut */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              {DRIVER_STATUS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste des chauffeurs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map(driver => {
            const licenseWarning = getExpiryWarning(driver.license_expiry);
            const fimoWarning = driver.fimo_expiry ? getExpiryWarning(driver.fimo_expiry) : null;
            const fcoWarning = driver.fco_expiry ? getExpiryWarning(driver.fco_expiry) : null;
            const medicalWarning = driver.medical_exam_expiry ? getExpiryWarning(driver.medical_exam_expiry) : null;

            const hasWarnings = licenseWarning || fimoWarning || fcoWarning || medicalWarning;

            return (
              <div
                key={driver.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 ${
                  hasWarnings ? 'border-2 border-orange-500 dark:border-orange-400' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                      {driver.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{driver.name}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <CreditCard size={12} />
                        {driver.license_type}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(driver.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail size={14} className="flex-shrink-0" />
                    <span className="truncate">{driver.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone size={14} className="flex-shrink-0" />
                    <span>{driver.phone}</span>
                  </div>
                </div>

                {/* Alertes validités */}
                {hasWarnings && (
                  <div className="space-y-1 mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-2">
                      ⚠️ Validités à vérifier
                    </p>
                    {licenseWarning && (
                      <div className="flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300">
                        <licenseWarning.icon size={12} />
                        <span>Permis : {licenseWarning.label}</span>
                      </div>
                    )}
                    {fimoWarning && (
                      <div className="flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300">
                        <fimoWarning.icon size={12} />
                        <span>FIMO : {fimoWarning.label}</span>
                      </div>
                    )}
                    {fcoWarning && (
                      <div className="flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300">
                        <fcoWarning.icon size={12} />
                        <span>FCO : {fcoWarning.label}</span>
                      </div>
                    )}
                    {medicalWarning && (
                      <div className="flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300">
                        <medicalWarning.icon size={12} />
                        <span>Visite médicale : {medicalWarning.label}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Certifications */}
                <div className="flex flex-wrap gap-1 mb-4">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    Permis {driver.license_type}
                  </span>
                  {driver.fimo_expiry && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                      FIMO
                    </span>
                  )}
                  {driver.fco_expiry && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                      FCO
                    </span>
                  )}
                  {driver.adr_expiry && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
                      ADR
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(driver)}
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Edit2 size={16} />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(driver.id)}
                    className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredDrivers.length === 0 && (
          <div className="text-center py-12">
            <UserCog size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all'
                ? 'Aucun chauffeur ne correspond aux filtres'
                : 'Aucun chauffeur enregistré'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Ajout/Édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingDriver ? 'Modifier le chauffeur' : 'Nouveau chauffeur'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Informations personnelles */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Informations personnelles</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Jean Dupont"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="jean.dupont@example.com"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="06 12 34 56 78"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Statut *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      {DRIVER_STATUS.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date d'embauche
                    </label>
                    <input
                      type="date"
                      value={formData.hire_date || ''}
                      onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Permis de conduire */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Permis de conduire</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Numéro de permis *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.license_number}
                      onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                      placeholder="Ex: 123456789"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type de permis *
                    </label>
                    <select
                      required
                      value={formData.license_type}
                      onChange={(e) => setFormData({...formData, license_type: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      {LICENSE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date d'expiration du permis *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.license_expiry}
                      onChange={(e) => setFormData({...formData, license_expiry: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Formations obligatoires */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Formations & Certifications</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      FIMO (expiration)
                    </label>
                    <input
                      type="date"
                      value={formData.fimo_expiry || ''}
                      onChange={(e) => setFormData({...formData, fimo_expiry: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Formation Initiale Minimale Obligatoire
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      FCO (expiration)
                    </label>
                    <input
                      type="date"
                      value={formData.fco_expiry || ''}
                      onChange={(e) => setFormData({...formData, fco_expiry: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Formation Continue Obligatoire
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ADR (expiration)
                    </label>
                    <input
                      type="date"
                      value={formData.adr_expiry || ''}
                      onChange={(e) => setFormData({...formData, adr_expiry: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Transport de matières dangereuses
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Visite médicale (expiration)
                    </label>
                    <input
                      type="date"
                      value={formData.medical_exam_expiry || ''}
                      onChange={(e) => setFormData({...formData, medical_exam_expiry: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  placeholder="Notes supplémentaires..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
                >
                  {editingDriver ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}