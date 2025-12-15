// src/vitrine/pages/admin/LeadsAdmin.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { 
  Mail, User, Calendar, MessageSquare, ArrowLeft, Building, Phone, 
  Trash2, Loader, Search, Filter, Download, ExternalLink,
  Globe, Linkedin, Users, AtSign, MoreHorizontal, CalendarClock,
  AlertTriangle, CheckCircle, Clock, XCircle
} from "lucide-react";
import useVitrineAdmin from "../../hooks/useVitrineAdmin";

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  message: string;
  created_at: string;
  status?: string;
  source?: string;
  notes?: string;
  next_followup?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: "Nouveau", color: "blue", icon: Clock },
  contacted: { label: "Contacté", color: "yellow", icon: Phone },
  testing: { label: "En test", color: "purple", icon: Users },
  client: { label: "Client", color: "green", icon: CheckCircle },
  lost: { label: "Perdu", color: "red", icon: XCircle },
};

const sourceConfig: Record<string, { label: string; icon: any }> = {
  site: { label: "Site web", icon: Globe },
  linkedin: { label: "LinkedIn", icon: Linkedin },
  referral: { label: "Recommandation", icon: Users },
  email: { label: "Email", icon: AtSign },
  other: { label: "Autre", icon: MoreHorizontal },
};

export default function LeadsAdmin() {
  const { user } = useVitrineAdmin();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error("Erreur:", err);
      alert("Erreur lors du chargement des demandes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette demande définitivement ?")) return;

    try {
      setDeleting(id);
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setLeads(leads.filter(l => l.id !== id));
    } catch (err: any) {
      console.error("Erreur:", err);
      alert("Erreur lors de la suppression: " + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
    } catch (err: any) {
      console.error("Erreur:", err);
      alert("Erreur lors de la mise à jour");
    }
  };

  const exportCSV = () => {
    const headers = ["Nom", "Email", "Entreprise", "Téléphone", "Message", "Statut", "Source", "Date"];
    const rows = filteredLeads.map(lead => [
      lead.name,
      lead.email,
      lead.company || "",
      lead.phone || "",
      lead.message.replace(/"/g, '""'),
      statusConfig[lead.status || 'new']?.label || lead.status,
      sourceConfig[lead.source || 'site']?.label || lead.source,
      formatDate(lead.created_at)
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sloti-leads-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: leads.length,
    new: leads.filter(l => !l.status || l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    testing: leads.filter(l => l.status === 'testing').length,
    client: leads.filter(l => l.status === 'client').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                Demandes de bêta
              </h1>
              <p className="text-gray-600">
                {leads.length} demande{leads.length > 1 ? 's' : ''} reçue{leads.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Download size={18} />
                Exporter CSV
              </button>
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:inline">Retour</span>
              </Link>
            </div>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 shadow-sm border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
              <div className="text-xs text-blue-600">Nouveaux</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 shadow-sm border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{stats.contacted}</div>
              <div className="text-xs text-yellow-600">Contactés</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 shadow-sm border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{stats.testing}</div>
              <div className="text-xs text-purple-600">En test</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 shadow-sm border border-green-200">
              <div className="text-2xl font-bold text-green-600">{stats.client}</div>
              <div className="text-xs text-green-600">Clients</div>
            </div>
          </div>

          {/* Info admin */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3 text-sm">
            <span className="text-blue-600">ℹ️</span>
            <span className="text-blue-800">
              <strong>Connecté :</strong> {user?.email}
            </span>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher par nom, email, entreprise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste des demandes */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
            <p className="text-gray-600">Chargement des demandes...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <MessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg">
              {searchTerm || statusFilter !== "all" 
                ? "Aucun résultat pour ces critères" 
                : "Aucune demande de devis pour le moment"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeads.map((lead) => {
              const status = statusConfig[lead.status || 'new'] || statusConfig.new;
              const source = sourceConfig[lead.source || 'site'] || sourceConfig.site;
              const StatusIcon = status.icon;
              const SourceIcon = source.icon;

              return (
                <div
                  key={lead.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 border border-gray-100"
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{lead.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(lead.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <SourceIcon size={14} />
                            {source.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Sélecteur de statut */}
                      <select
                        value={lead.status || 'new'}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 focus:outline-none focus:ring-2 focus:ring-offset-1
                          ${status.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-300 focus:ring-blue-500' : ''}
                          ${status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300 focus:ring-yellow-500' : ''}
                          ${status.color === 'purple' ? 'bg-purple-100 text-purple-800 border-purple-300 focus:ring-purple-500' : ''}
                          ${status.color === 'green' ? 'bg-green-100 text-green-800 border-green-300 focus:ring-green-500' : ''}
                          ${status.color === 'red' ? 'bg-red-100 text-red-800 border-red-300 focus:ring-red-500' : ''}
                        `}
                      >
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>

                      {/* Bouton supprimer */}
                      <button
                        onClick={() => handleDelete(lead.id)}
                        disabled={deleting === lead.id}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Supprimer"
                      >
                        {deleting === lead.id ? (
                          <Loader className="animate-spin" size={20} />
                        ) : (
                          <Trash2 size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="grid sm:grid-cols-3 gap-3 mb-4">
                    <a 
                      href={`mailto:${lead.email}`} 
                      className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <Mail size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{lead.email}</span>
                      <ExternalLink size={14} className="text-gray-400 flex-shrink-0" />
                    </a>
                    
                    {lead.company && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Building size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{lead.company}</span>
                      </div>
                    )}
                    
                    {lead.phone && (
                      <a 
                        href={`tel:${lead.phone}`} 
                        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        <Phone size={16} className="text-gray-400 flex-shrink-0" />
                        <span>{lead.phone}</span>
                        <ExternalLink size={14} className="text-gray-400 flex-shrink-0" />
                      </a>
                    )}
                  </div>

                  {/* Message */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                      <MessageSquare size={16} className="text-gray-400" />
                      Message
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                      {lead.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}