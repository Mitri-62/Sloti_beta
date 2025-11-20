import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // 👈 AJOUTER CET IMPORT
import { supabase } from "../../../supabaseClient";
import { Mail, User, Calendar, MessageSquare, ArrowLeft, Building, Phone, Trash2 } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  message: string;
  created_at: string;
}

export default function LeadsAdmin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user;
    
    if (!currentUser || currentUser.email !== 'dimitri.deremarque@gmail.com') {
      window.location.href = '/login';
      return;
    }
    
    setUser(currentUser);
    fetchLeads();
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur lors du chargement des demandes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette demande ?")) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLeads();
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur lors de la suppression");
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Demandes de devis
              </h1>
              <p className="text-gray-600">
                {leads.length} demande{leads.length > 1 ? 's' : ''} reçue{leads.length > 1 ? 's' : ''}
              </p>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              Retour à la vitrine
            </Link>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <div className="text-blue-600 mt-0.5">ℹ️</div>
            <div className="text-sm text-blue-800">
              <strong>Connecté en tant que :</strong> {user?.email}
            </div>
          </div>
        </div>

        {/* Liste des demandes */}
        {leads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <MessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg">Aucune demande de devis pour le moment</p>
          </div>
        ) : (
          <div className="space-y-6">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{lead.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={14} />
                        {formatDate(lead.created_at)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(lead.id)}
                    className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail size={16} className="text-gray-400" />
                    <a href={`mailto:${lead.email}`} className="hover:text-blue-600 hover:underline">
                      {lead.email}
                    </a>
                  </div>
                  
                  {lead.company && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Building size={16} className="text-gray-400" />
                      {lead.company}
                    </div>
                  )}
                  
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone size={16} className="text-gray-400" />
                      <a href={`tel:${lead.phone}`} className="hover:text-blue-600 hover:underline">
                        {lead.phone}
                      </a>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-start gap-2 mb-2">
                    <MessageSquare size={16} className="text-gray-400 mt-1" />
                    <span className="font-semibold text-gray-700">Message :</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap pl-6">
                    {lead.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}