// src/vitrine/pages/admin/NewsAdmin.tsx
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X, ArrowLeft } from "lucide-react";
import { supabase } from "../../../supabaseClient";

interface NewsItem {
  id?: string;
  title: string;
  description: string;
  icon: string;
  icon_color: string;
  link: string;
  link_text: string;
  published: boolean;
  order: number;
}

const initialFormState: NewsItem = {
  title: "",
  description: "",
  icon: "Package",
  icon_color: "blue",
  link: "#features",
  link_text: "En savoir plus",
  published: true,
  order: 0,
};

const iconOptions = [
  "Package", "Zap", "Handshake", "Truck", "Users", 
  "Award", "TrendingUp", "Sparkles"
];

const colorOptions = [
  "blue", "yellow", "green", "red", 
  "purple", "orange", "indigo", "pink"
];

export default function NewsAdmin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewsItem>(initialFormState);
  const [isCreating, setIsCreating] = useState(false);

  // Vérification de l'authentification et autorisation
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentUser = data.session?.user;
        
        setUser(currentUser);
        
        // Vérifier si l'email est le vôtre
        if (currentUser?.email === 'dimitri.deremarque@gmail.com') {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        console.error("Erreur d'authentification:", err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Charger les actualités si autorisé
  useEffect(() => {
    if (authorized) {
      fetchNews();
    }
  }, [authorized]);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("order", { ascending: true });

      if (error) throw error;
      setNews(data || []);
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur lors du chargement des actualités");
    }
  };

  const handleCreate = async () => {
    try {
      const { error } = await supabase
        .from("news")
        .insert([formData]);

      if (error) throw error;

      alert("Actualité créée avec succès !");
      setFormData(initialFormState);
      setIsCreating(false);
      fetchNews();
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur lors de la création");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("news")
        .update(formData)
        .eq("id", id);

      if (error) throw error;

      alert("Actualité mise à jour !");
      setEditingId(null);
      setFormData(initialFormState);
      fetchNews();
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette actualité ?")) return;

    try {
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", id);

      if (error) throw error;

      alert("Actualité supprimée !");
      fetchNews();
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur lors de la suppression");
    }
  };

  const togglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("news")
        .update({ published: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      fetchNews();
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur lors du changement de statut");
    }
  };

  const startEdit = (item: NewsItem) => {
    setEditingId(item.id || null);
    setFormData(item);
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData(initialFormState);
  };

  // État de chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des autorisations...</p>
        </div>
      </div>
    );
  }

  // Pas connecté - Redirection
  if (!user) {
    window.location.href = '/login';
    return null;
  }

  // Pas autorisé
  if (!authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <X className="text-red-600" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Accès refusé</h1>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas l'autorisation d'accéder à cette page.<br />
            Seul le super-administrateur peut gérer les actualités.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={20} />
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Interface d'administration (autorisé)
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gestion des Actualités
              </h1>
              <p className="text-gray-600">
                Créez, modifiez et gérez les actualités de votre vitrine
              </p>
            </div>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              Retour à la vitrine
            </a>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <div className="text-blue-600 mt-0.5">ℹ️</div>
            <div className="text-sm text-blue-800">
              <strong>Connecté en tant que :</strong> {user?.email}
              <br />
              Vous êtes le super-administrateur de la plateforme.
            </div>
          </div>
        </div>

        {/* Bouton Créer */}
        <div className="mb-6">
          <button
            onClick={() => {
              setIsCreating(true);
              setEditingId(null);
              setFormData(initialFormState);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Nouvelle actualité
          </button>
        </div>

        {/* Formulaire de création/édition */}
        {(isCreating || editingId) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {isCreating ? "Créer une actualité" : "Modifier l'actualité"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ex: Nouvelle fonctionnalité"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Décrivez l'actualité..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icône
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {iconOptions.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Couleur
                  </label>
                  <select
                    value={formData.icon_color}
                    onChange={(e) => setFormData({ ...formData, icon_color: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {colorOptions.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lien
                  </label>
                  <input
                    type="text"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="#features"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texte du lien
                  </label>
                  <input
                    type="text"
                    value={formData.link_text}
                    onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="En savoir plus"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordre d'affichage
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.published}
                      onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Publier immédiatement</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => isCreating ? handleCreate() : handleUpdate(editingId!)}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save size={18} />
                  {isCreating ? "Créer" : "Enregistrer"}
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  <X size={18} />
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des actualités */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ordre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Titre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Icône/Couleur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {news.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.order}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-500 line-clamp-1">{item.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs bg-${item.icon_color}-100 text-${item.icon_color}-800`}>
                          {item.icon}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>{item.icon_color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => togglePublished(item.id!, item.published)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          item.published
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.published ? <Eye size={14} /> : <EyeOff size={14} />}
                        {item.published ? "Publié" : "Brouillon"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id!)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {news.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Aucune actualité. Créez-en une pour commencer !
            </div>
          )}
        </div>
      </div>
    </div>
  );
}