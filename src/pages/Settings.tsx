// src/pages/Settings.tsx - VERSION AVEC DÉPÔT
import { useState, useEffect, useCallback } from "react";
import { Settings as SettingsIcon, Bell, Moon, Sun, Database, Download, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { withErrorHandling } from "../services/errorService";
import DepotSettings from "../components/DepotSettings";

// ✅ Types stricts
interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  autoBackup: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  emailNotifications: true,
  pushNotifications: true,
  autoBackup: true,
};

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ✅ Charger les paramètres avec gestion d'erreur
  useEffect(() => {
    if (!user?.id) return;

    const loadSettings = () => {
      const stored = localStorage.getItem(`userSettings_${user.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (error) {
          console.error("Erreur parsing settings:", error);
          toast.error("Erreur de chargement des paramètres");
        }
      }
    };

    loadSettings();
  }, [user?.id]);

  // ✅ Mise à jour d'un paramètre avec optimisation
  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Sauvegarder immédiatement dans localStorage
      if (user?.id) {
        localStorage.setItem(`userSettings_${user.id}`, JSON.stringify(newSettings));
      }
      
      return newSettings;
    });
  }, [user?.id]);

  // ✅ Sauvegarde avec feedback
  const handleSave = useCallback(() => {
    if (!user?.id) {
      toast.error("Utilisateur non connecté");
      return;
    }

    localStorage.setItem(`userSettings_${user.id}`, JSON.stringify(settings));
    toast.success("Paramètres sauvegardés !");
  }, [settings, user?.id]);

  // ✅ Export des données avec gestion d'erreur
  const handleExportData = async () => {
    if (!user?.company_id) {
      toast.error("Entreprise non trouvée");
      return;
    }

    setExporting(true);

    const result = await withErrorHandling(async () => {
      // Récupérer toutes les données de l'utilisateur
      const [masterData, plannings, stocks] = await Promise.all([
        supabase
          .from("masterdata")
          .select("*")
          .eq("company_id", user.company_id),
        supabase
          .from("plannings")
          .select("*")
          .eq("company_id", user.company_id),
        supabase
          .from("stocks")
          .select("*")
          .eq("company_id", user.company_id),
      ]);

      // Créer un objet JSON avec toutes les données
      const exportData = {
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        data: {
          masterdata: masterData.data || [],
          plannings: plannings.data || [],
          stocks: stocks.data || [],
        },
      };

      // Télécharger le fichier JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `export_sloti_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      return true;
    }, "Export données");

    setExporting(false);

    if (result) {
      toast.success("Données exportées avec succès !");
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="text-gray-700 dark:text-gray-300" size={28} />
            Paramètres
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez vos préférences et paramètres de compte
          </p>
        </div>

        {/* ✅ NOUVEAU: Adresse du dépôt */}
        <div className="mb-6">
          <DepotSettings />
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
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
              <button
                onClick={toggleTheme}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {theme === "dark" ? (
                  <Sun size={20} className="text-yellow-500" />
                ) : (
                  <Moon size={20} className="text-blue-500" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Données */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database size={20} />
            Gestion des Données
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={20} />
                {exporting ? "Export en cours..." : "Exporter toutes mes données"}
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Format JSON - Conforme RGPD
              </p>
            </div>
          </div>
        </div>

        {/* Bouton Sauvegarder */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm disabled:opacity-50"
          >
            {loading ? "Sauvegarde..." : "Sauvegarder les paramètres"}
          </button>
        </div>
      </div>
    </div>
  );
}