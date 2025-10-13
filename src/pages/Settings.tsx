// src/pages/Settings.tsx - VERSION AVEC DARK MODE FONCTIONNEL
import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Bell, Moon, Sun, Globe, Database, Download } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";

interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  language: string;
  autoBackup: boolean;
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    pushNotifications: true,
    language: "fr",
    autoBackup: true,
  });

  const [loading, setLoading] = useState(false);

  // Charger les paramètres depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`userSettings_${user?.id}`);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (error) {
        console.error("Erreur chargement settings:", error);
      }
    }
  }, [user?.id]);

  const handleSave = () => {
    localStorage.setItem(`userSettings_${user?.id}`, JSON.stringify(settings));
    toast.success("Paramètres sauvegardés !");
  };

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Export des données
  const handleExportData = async () => {
    if (!user?.company_id) {
      toast.error("Aucune entreprise associée");
      return;
    }

    setLoading(true);
    toast.info("Export en cours...");

    try {
      // Récupérer toutes les données de l'entreprise
      const [stocks, tours, plannings, activities] = await Promise.all([
        supabase.from("stocks").select("*").eq("company_id", user.company_id),
        supabase.from("tours").select("*").eq("company_id", user.company_id),
        supabase.from("plannings").select("*").eq("company_id", user.company_id),
        supabase.from("activities").select("*").eq("company_id", user.company_id),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        company: user.company_name,
        data: {
          stocks: stocks.data || [],
          tours: tours.data || [],
          plannings: plannings.data || [],
          activities: activities.data || [],
        },
      };

      // Créer et télécharger le fichier JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sloti-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export réussi !");
    } catch (error) {
      console.error("Erreur export:", error);
      toast.error("Erreur lors de l'export");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <SettingsIcon size={32} className="text-blue-600 dark:text-blue-400" />
            Paramètres
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Personnalisez votre expérience
          </p>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell size={20} />
            Notifications
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Notifications par email</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recevoir des emails pour les événements importants</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Notifications push</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recevoir des notifications dans le navigateur</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => updateSetting('pushNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Apparence */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
            Apparence
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Mode sombre</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Thème actuel : {theme === "dark" ? "Sombre" : "Clair"}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={theme === "dark"}
                  onChange={toggleTheme}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Aperçu du thème */}
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aperçu</p>
              <div className="flex gap-2">
                <div className="flex-1 h-20 bg-white dark:bg-gray-800 rounded shadow flex items-center justify-center text-gray-900 dark:text-white text-sm">
                  Contenu
                </div>
                <div className="w-20 h-20 bg-blue-600 rounded shadow flex items-center justify-center text-white text-sm">
                  Bouton
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Langue */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe size={20} />
            Langue et région
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Langue de l'interface
            </label>
            <select
              value={settings.language}
              onChange={(e) => updateSetting('language', e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>

        {/* Données */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database size={20} />
            Données et sauvegarde
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Sauvegarde automatique</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sauvegarder automatiquement vos données</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoBackup}
                  onChange={(e) => updateSetting('autoBackup', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <button
              onClick={handleExportData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              {loading ? "Export en cours..." : "Exporter toutes mes données"}
            </button>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm"
          >
            Sauvegarder les paramètres
          </button>
        </div>
      </div>
    </div>
  );
}