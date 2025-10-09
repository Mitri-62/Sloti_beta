// src/pages/Profile.tsx - CORRECTION LIGNE 33
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { User, Mail, Briefcase, Calendar, Save } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "",
    company_name: "",
  });

  const [stats, setStats] = useState({
    toursCompleted: 0,
    stockMovements: 0,
    activeSince: "",
    lastActive: "",
  });

  // ✅ FIX: Charger le téléphone depuis la base de données
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      // Charger les données complètes depuis la BDD
      const { data: userData } = await supabase
        .from("users")
        .select("full_name, email, phone, role")
        .eq("id", user.id)
        .single();

      setFormData({
        full_name: userData?.full_name || user.name || "",
        email: user.email || "",
        phone: userData?.phone || "", // ✅ Depuis la BDD
        role: user.role || "",
        company_name: user.company_name || "",
      });

      loadUserStats();
    };

    loadUserData();
  }, [user]);

  const loadUserStats = async () => {
    if (!user?.id) return;

    try {
      const { count: toursCount } = await supabase
        .from("tours")
        .select("*", { count: "exact", head: true })
        .eq("driver_id", user.id)
        .eq("status", "completed");

      const { count: stockCount } = await supabase
        .from("stock_movements")
        .select("*", { count: "exact", head: true })
        .eq("company_id", user.company_id);

      const { data: userData } = await supabase
        .from("users")
        .select("created_at, last_active")
        .eq("id", user.id)
        .single();

      setStats({
        toursCompleted: toursCount || 0,
        stockMovements: stockCount || 0,
        activeSince: userData?.created_at
          ? new Date(userData.created_at).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })
          : "",
        lastActive: userData?.last_active
          ? new Date(userData.last_active).toLocaleDateString("fr-FR")
          : "Aujourd'hui",
      });
    } catch (error) {
      console.error("Erreur chargement stats:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success("Profil mis à jour avec succès !");
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* En-tête */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg">
            {user?.name?.charAt(0).toUpperCase() || <User size={32} />}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {user?.name || "Mon Profil"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez vos informations personnelles
            </p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Calendar size={20} className="text-blue-600 dark:text-blue-300" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Membre depuis</p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.activeSince}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <User size={20} className="text-green-600 dark:text-green-300" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rôle</p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white capitalize">
              {formData.role || "Utilisateur"}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <User size={20} className="text-purple-600 dark:text-purple-300" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tournées</p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.toursCompleted}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Calendar size={20} className="text-orange-600 dark:text-orange-300" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dernière activité</p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.lastActive}
            </p>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Informations personnelles
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User size={16} className="inline mr-2" />
                Nom complet *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail size={16} className="inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                L'email ne peut pas être modifié
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                📞 Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Briefcase size={16} className="inline mr-2" />
                Entreprise
              </label>
              <input
                type="text"
                value={formData.company_name}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm"
            >
              <Save size={18} />
              {loading ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </div>
        </form>

        {/* Section sécurité */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Sécurité
          </h2>
          <button
            onClick={() => toast.info("Fonctionnalité à venir")}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Changer mon mot de passe
          </button>
        </div>
      </div>
    </div>
  );
}