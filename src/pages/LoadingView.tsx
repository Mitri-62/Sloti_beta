// src/pages/LoadingView_10_10.tsx
// VERSION ULTIME : Toutes fonctionnalités avancées
import { useState, useMemo, useRef, useCallback } from "react";
import Truck3D, { computePacking } from "../components/Truck3D";
import { 
  Plus, Trash2, Download, Search, Truck, Package2, Settings, 
  AlertCircle, Info, Save, Upload, RotateCcw, RotateCw,
  FileText, Lightbulb, Camera, BarChart3, Archive
} from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ============================================
// TYPES & CONSTANTES
// ============================================

const TRUCK_TYPES = {
  "7.5T": { length: 6, width: 2.4, height: 2.4 },
  "19T": { length: 8, width: 2.4, height: 2.6 },
  "Semi 13.6m": { length: 13.6, width: 2.4, height: 2.7 },
};

const PALLET_TYPES = {
  "EUR 120x80": { l: 1.2, w: 0.8, h: 1.2, weight: 25 },
  "US 120x100": { l: 1.2, w: 1.0, h: 1.2, weight: 30 },
  "Demi 80x60": { l: 0.8, w: 0.6, h: 1.0, weight: 15 },
};

const PALETTE_COLORS: Record<string, string> = {
  "EUR 120x80": "seagreen",
  "US 120x100": "saddlebrown",
  "Demi 80x60": "darkorange",
};

// ============================================
// ALGORITHME D'OPTIMISATION INTELLIGENT 3D
// ============================================

/**
 * Algorithme de bin packing 3D optimisé
 * Utilise une approche First-Fit Decreasing avec rotation automatique
 */
function computeIntelligentPacking(
  palettes: Palette[],
  truck: { length: number; width: number; height: number },
  doubleStack: boolean
): any[] {
  if (palettes.length === 0) return [];

  const placed: any[] = [];
  const spaces: { x: number; y: number; z: number; l: number; w: number; h: number }[] = [
    { x: 0, y: 0, z: 0, l: truck.length, w: truck.width, h: truck.height }
  ];

  // Trier les palettes par volume décroissant (plus grandes d'abord)
  const sortedPalettes = [...palettes].sort((a, b) => {
    const volA = a.l * a.w * a.h;
    const volB = b.l * b.w * b.h;
    return volB - volA;
  });

  for (const palette of sortedPalettes) {
    let placed_flag = false;

    // Essayer toutes les orientations possibles
    const orientations = [
      { l: palette.l, w: palette.w, h: palette.h },
      { l: palette.w, w: palette.l, h: palette.h },
    ];

    for (let i = 0; i < spaces.length && !placed_flag; i++) {
      const space = spaces[i];

      for (const orient of orientations) {
        // Vérifier si la palette rentre dans cet espace
        if (
          orient.l <= space.l &&
          orient.w <= space.w &&
          orient.h <= space.h
        ) {
          // Placer la palette
          const pos = {
            x: space.x + orient.l / 2,
            y: space.y + orient.h / 2,
            z: space.z + orient.w / 2,
            l: orient.l,
            w: orient.w,
            h: orient.h,
            type: palette.type
          };

          placed.push(pos);

          // Si double étage activé ET qu'il reste de la hauteur
          if (doubleStack && space.y + orient.h + orient.h <= truck.height) {
            placed.push({
              ...pos,
              y: space.y + orient.h + orient.h / 2
            });
          }

          // Créer de nouveaux espaces libres
          const newSpaces = [];

          // Espace à droite
          if (space.l - orient.l > 0.1) {
            newSpaces.push({
              x: space.x + orient.l,
              y: space.y,
              z: space.z,
              l: space.l - orient.l,
              w: space.w,
              h: space.h
            });
          }

          // Espace au fond
          if (space.w - orient.w > 0.1) {
            newSpaces.push({
              x: space.x,
              y: space.y,
              z: space.z + orient.w,
              l: orient.l,
              w: space.w - orient.w,
              h: space.h
            });
          }

          // Espace au-dessus
          if (space.h - orient.h > 0.1) {
            newSpaces.push({
              x: space.x,
              y: space.y + orient.h,
              z: space.z,
              l: orient.l,
              w: orient.w,
              h: space.h - orient.h
            });
          }

          // Retirer l'espace utilisé et ajouter les nouveaux
          spaces.splice(i, 1);
          spaces.push(...newSpaces);

          // Trier les espaces par position (de bas en haut, de gauche à droite)
          spaces.sort((a, b) => {
            if (Math.abs(a.y - b.y) > 0.01) return a.y - b.y;
            if (Math.abs(a.x - b.x) > 0.01) return a.x - b.x;
            return a.z - b.z;
          });

          placed_flag = true;
          break;
        }
      }
    }
  }

  return placed;
}

interface Palette {
  l: number;
  w: number;
  h: number;
  orientation: "long" | "large";
  type: string;
  weight: number;
}

interface Template {
  name: string;
  truckType: keyof typeof TRUCK_TYPES;
  palettes: Palette[];
  doubleStack: boolean;
  optimized: boolean;
  createdAt: string;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function LoadingView_10_10() {
  // États principaux
  const [truckType, setTruckType] = useState<keyof typeof TRUCK_TYPES>("Semi 13.6m");
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [palletType, setPalletType] = useState<keyof typeof PALLET_TYPES>("EUR 120x80");
  const [doubleStack, setDoubleStack] = useState(false);
  const [orientation, setOrientation] = useState<"long" | "large">("long");
  const [optimized, setOptimized] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfig, setShowConfig] = useState(true);

  // États avancés
  const [history, setHistory] = useState<Palette[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const TRUCK = TRUCK_TYPES[truckType];

  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveToHistory = useCallback((newPalettes: Palette[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPalettes);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // ============================================
  // CALCULS ET STATISTIQUES
  // ============================================

  const stats = useMemo(() => {
    if (palettes.length === 0) {
      return {
        maxCapacity: 0,
        percent: 0,
        totalWeight: 0,
        volumeUsed: 0,
        volumePercent: 0,
        palettesPlaced: 0,
        suggestions: []
      };
    }

    let placed;
    if (optimized) {
      // Algorithme d'optimisation intelligent 3D
      placed = computeIntelligentPacking(palettes, TRUCK, doubleStack);
    } else {
      placed = computePacking(palettes, TRUCK, doubleStack, orientation);
    }

    const palettesPlaced = placed.length;
    const totalWeight = palettes.reduce((sum, p) => sum + p.weight, 0);
    const volumeUsed = placed.reduce((sum: number, p: any) => sum + (p.l * p.w * p.h), 0);
    const truckVolume = TRUCK.length * TRUCK.width * TRUCK.height;
    const volumePercent = (volumeUsed / truckVolume) * 100;

    // Calcul capacité maximale
    const simulated = [
      ...palettes,
      ...Array(200).fill({ ...PALLET_TYPES[palletType], orientation, type: palletType }),
    ];
    const simulatedPlaced = optimized 
      ? computeIntelligentPacking(simulated, TRUCK, doubleStack)
      : computePacking(simulated, TRUCK, doubleStack, orientation);
    const maxCapacity = simulatedPlaced.length;
    const percent = maxCapacity > 0 ? (palettesPlaced / maxCapacity) * 100 : 0;

    // Suggestions intelligentes
    const suggestions: string[] = [];
    if (percent < 70 && !optimized) {
      suggestions.push("💡 Activez l'optimisation auto pour gagner jusqu'à 30% d'espace");
    }
    if (!doubleStack && TRUCK.height > 2.4) {
      suggestions.push("💡 Le double étage pourrait augmenter la capacité de 50%");
    }
    if (volumePercent < 60) {
      suggestions.push("💡 Essayez de mixer différents types de palettes pour optimiser l'espace");
    }
    if (totalWeight > 15000) {
      suggestions.push("⚠️ Attention au poids total ! Vérifiez les limites légales");
    }

    return {
      maxCapacity,
      percent,
      totalWeight,
      volumeUsed,
      volumePercent,
      palettesPlaced,
      suggestions
    };
  }, [palettes, TRUCK, doubleStack, orientation, optimized, palletType]);

  // ============================================
  // ACTIONS PRINCIPALES
  // ============================================

  const addPalette = () => {
    const newPalette = { 
      ...PALLET_TYPES[palletType], 
      orientation, 
      type: palletType,
      weight: PALLET_TYPES[palletType].weight 
    };
    const newPalettes = [...palettes, newPalette];
    setPalettes(newPalettes);
    saveToHistory(newPalettes);
    showToast(`Palette ${palletType} ajoutée`, 'success');
  };

  const removePalette = (index: number) => {
    const newPalettes = palettes.filter((_, i) => i !== index);
    setPalettes(newPalettes);
    saveToHistory(newPalettes);
    if (highlightedIndex === index) setHighlightedIndex(null);
    showToast('Palette supprimée', 'info');
  };

  const clearAll = () => {
    if (palettes.length === 0) {
      showToast('Aucune palette à supprimer', 'error');
      return;
    }
    if (confirm(`Supprimer toutes les ${palettes.length} palettes ?`)) {
      setPalettes([]);
      saveToHistory([]);
      setHighlightedIndex(null);
      showToast('Toutes les palettes ont été supprimées', 'success');
    }
  };

  // ============================================
  // UNDO / REDO
  // ============================================

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPalettes(history[newIndex]);
      showToast('Action annulée', 'info');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPalettes(history[newIndex]);
      showToast('Action rétablie', 'info');
    }
  };

  // ============================================
  // TEMPLATES
  // ============================================

  const saveTemplate = () => {
    if (palettes.length === 0) {
      showToast('Aucune palette à sauvegarder', 'error');
      return;
    }

    const name = prompt('Nom du template :');
    if (!name) return;

    const template: Template = {
      name,
      truckType,
      palettes: [...palettes],
      doubleStack,
      optimized,
      createdAt: new Date().toISOString()
    };

    const newTemplates = [...templates, template];
    setTemplates(newTemplates);
    localStorage.setItem('loadingTemplates', JSON.stringify(newTemplates));
    showToast(`Template "${name}" sauvegardé`, 'success');
  };

  const loadTemplate = (template: Template) => {
    setTruckType(template.truckType);
    setPalettes(template.palettes);
    setDoubleStack(template.doubleStack);
    setOptimized(template.optimized);
    saveToHistory(template.palettes);
    setShowTemplates(false);
    showToast(`Template "${template.name}" chargé`, 'success');
  };

  const deleteTemplate = (index: number) => {
    const template = templates[index];
    if (confirm(`Supprimer le template "${template.name}" ?`)) {
      const newTemplates = templates.filter((_, i) => i !== index);
      setTemplates(newTemplates);
      localStorage.setItem('loadingTemplates', JSON.stringify(newTemplates));
      showToast('Template supprimé', 'info');
    }
  };

  // ============================================
  // IMPORT / EXPORT
  // ============================================

  const exportJSON = () => {
    if (palettes.length === 0) {
      showToast('Aucune palette à exporter', 'error');
      return;
    }

    const data = {
      truck: truckType,
      dimensions: `${TRUCK.length}×${TRUCK.width}×${TRUCK.height}m`,
      palettes: palettes.map((p, i) => ({
        numero: i + 1,
        type: p.type,
        dimensions: `${p.l}×${p.w}×${p.h}m`,
        orientation: p.orientation,
        weight: `${p.weight}kg`,
      })),
      configuration: {
        doubleEtage: doubleStack,
        optimisationAuto: optimized,
        tauxRemplissage: stats.percent.toFixed(1) + "%",
        poidsTotal: `${stats.totalWeight}kg`,
        volumeUtilise: stats.volumePercent.toFixed(1) + "%",
      },
      statistiques: {
        palettesPlacees: stats.palettesPlaced,
        capaciteMax: stats.maxCapacity,
        volumeUtilise: stats.volumeUsed.toFixed(2) + "m³",
        poidsTotal: stats.totalWeight + "kg",
      },
      date: new Date().toLocaleString("fr-FR"),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-chargement-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Plan exporté en JSON', 'success');
  };

  const importJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.palettes || !Array.isArray(json.palettes)) {
          throw new Error('Format JSON invalide');
        }

        // Conversion des palettes importées
        const importedPalettes: Palette[] = json.palettes.map((p: any) => {
          const [l, w, h] = p.dimensions.split('×').map((d: string) => parseFloat(d));
          return {
            l, w, h,
            type: p.type,
            orientation: p.orientation || 'long',
            weight: parseInt(p.weight) || 25,
          };
        });

        setPalettes(importedPalettes);
        saveToHistory(importedPalettes);
        if (json.truck) setTruckType(json.truck);
        if (json.configuration) {
          setDoubleStack(json.configuration.doubleEtage);
          setOptimized(json.configuration.optimisationAuto);
        }

        showToast(`${importedPalettes.length} palettes importées`, 'success');
      } catch (error) {
        showToast('Erreur lors de l\'import du fichier', 'error');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  // ============================================
  // EXPORT PDF AVEC CAPTURE 3D
  // ============================================

  const exportPDF = async () => {
    if (palettes.length === 0) {
      showToast('Aucune palette à exporter', 'error');
      return;
    }

    setIsExporting(true);
    showToast('Génération du PDF en cours...', 'info');

    try {
      // Capture de la vue 3D
      const canvas3D = canvasRef.current;
      if (!canvas3D) throw new Error('Impossible de capturer la vue 3D');

      const canvasImage = await html2canvas(canvas3D, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Création du PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // En-tête
      pdf.setFontSize(20);
      pdf.setTextColor(37, 99, 235); // blue-600
      pdf.text('Plan de Chargement 3D', 20, 20);

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 20, 28);

      // Image 3D
      const imgData = canvasImage.toDataURL('image/png');
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvasImage.height * imgWidth) / canvasImage.width;
      pdf.addImage(imgData, 'PNG', 20, 35, imgWidth, imgHeight);

      // Informations du camion
      let yPos = 35 + imgHeight + 15;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Informations du Camion', 20, yPos);

      pdf.setFontSize(10);
      yPos += 8;
      pdf.text(`Type: ${truckType}`, 25, yPos);
      yPos += 6;
      pdf.text(`Dimensions: ${TRUCK.length}m × ${TRUCK.width}m × ${TRUCK.height}m`, 25, yPos);
      yPos += 6;
      pdf.text(`Volume total: ${(TRUCK.length * TRUCK.width * TRUCK.height).toFixed(2)} m³`, 25, yPos);

      // Statistiques
      yPos += 12;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Statistiques de Chargement', 20, yPos);

      pdf.setFontSize(10);
      yPos += 8;
      pdf.text(`Palettes chargées: ${stats.palettesPlaced} / ${stats.maxCapacity}`, 25, yPos);
      yPos += 6;
      pdf.text(`Taux de remplissage: ${stats.percent.toFixed(1)}%`, 25, yPos);
      yPos += 6;
      pdf.text(`Volume utilisé: ${stats.volumeUsed.toFixed(2)} m³ (${stats.volumePercent.toFixed(1)}%)`, 25, yPos);
      yPos += 6;
      pdf.text(`Poids total: ${stats.totalWeight} kg`, 25, yPos);
      yPos += 6;
      pdf.text(`Double étage: ${doubleStack ? 'Oui' : 'Non'}`, 25, yPos);
      yPos += 6;
      pdf.text(`Optimisation auto: ${optimized ? 'Oui' : 'Non'}`, 25, yPos);

      // Liste des palettes (nouvelle page si nécessaire)
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        yPos = 20;
      } else {
        yPos += 12;
      }

      pdf.setFontSize(14);
      pdf.text('Liste des Palettes', 20, yPos);

      pdf.setFontSize(9);
      yPos += 8;

      palettes.forEach((p, i) => {
        if (yPos > pageHeight - 20) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.text(`${i + 1}. ${p.type} - ${p.l}×${p.w}×${p.h}m - ${p.orientation} - ${p.weight}kg`, 25, yPos);
        yPos += 5;
      });

      // Pied de page
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i}/${totalPages}`, pageWidth - 30, pageHeight - 10);
        pdf.text('Généré par Sloti - Plan de Chargement 3D', 20, pageHeight - 10);
      }

      // Téléchargement
      pdf.save(`plan-chargement-${Date.now()}.pdf`);
      showToast('PDF généré avec succès !', 'success');

    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      showToast('Erreur lors de la génération du PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Chargement des templates au démarrage
  useState(() => {
    const saved = localStorage.getItem('loadingTemplates');
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Erreur lors du chargement des templates');
      }
    }
  });

  // ============================================
  // RENDU
  // ============================================

  const filteredPalettes = palettes.filter((p, i) =>
    searchTerm === "" || 
    p.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i + 1).toString().includes(searchTerm)
  );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Toast Notifications */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.type === 'success' && '✓'}
          {toast.type === 'error' && '✗'}
          {toast.type === 'info' && 'ℹ'}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="text-blue-600 dark:text-blue-400" size={28} />
              Plan de Chargement 3D - Version Ultimate
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Optimisez le chargement avec toutes les fonctionnalités avancées
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Undo/Redo */}
            <button
              onClick={undo}
              disabled={historyIndex === 0}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Annuler (Ctrl+Z)"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Rétablir (Ctrl+Y)"
            >
              <RotateCw size={18} />
            </button>

            {/* Templates */}
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Archive size={18} />
              <span className="hidden sm:inline">Templates</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
            >
              <Settings size={18} />
              <span className="hidden sm:inline">{showConfig ? 'Masquer' : 'Afficher'} Config</span>
            </button>
          </div>
        </div>

        {/* Templates Modal */}
        {showTemplates && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Mes Templates
                  </h2>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Aucun template sauvegardé
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map((template, index) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {template.name}
                            </h3>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              <div>Camion: {template.truckType}</div>
                              <div>Palettes: {template.palettes.length}</div>
                              <div>Double étage: {template.doubleStack ? 'Oui' : 'Non'}</div>
                              <div>Optimisé: {template.optimized ? 'Oui' : 'Non'}</div>
                              <div className="text-xs mt-1">
                                Créé le {new Date(template.createdAt).toLocaleString('fr-FR')}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => loadTemplate(template)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                            >
                              Charger
                            </button>
                            <button
                              onClick={() => deleteTemplate(index)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Statistiques en haut */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600 dark:text-gray-400">Palettes chargées</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.palettesPlaced} / {stats.maxCapacity}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Capacité: {stats.percent.toFixed(1)}%
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-600 dark:text-gray-400">Volume utilisé</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.volumePercent.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.volumeUsed.toFixed(2)} m³
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="text-sm text-gray-600 dark:text-gray-400">Poids total</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalWeight} kg
            </div>
            <div className={`text-xs mt-1 ${stats.totalWeight > 15000 ? 'text-red-500' : 'text-gray-500'}`}>
              {stats.totalWeight > 15000 ? '⚠️ Limite dépassée' : '✓ Dans les limites'}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="text-sm text-gray-600 dark:text-gray-400">Camion</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {truckType}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {TRUCK.length}×{TRUCK.width}×{TRUCK.height}m
            </div>
          </div>
        </div>

        {/* Suggestions intelligentes */}
        {stats.suggestions.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Suggestions d'optimisation
                </h3>
                <ul className="space-y-1">
                  {stats.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-yellow-700 dark:text-yellow-300">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Configuration */}
        {showConfig && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Type de camion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type de camion
                </label>
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value as keyof typeof TRUCK_TYPES)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {Object.keys(TRUCK_TYPES).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type de palette */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type de palette
                </label>
                <select
                  value={palletType}
                  onChange={(e) => setPalletType(e.target.value as keyof typeof PALLET_TYPES)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {Object.keys(PALLET_TYPES).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orientation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Orientation
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as "long" | "large")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={optimized}
                >
                  <option value="long">Longueur</option>
                  <option value="large">Largeur</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              {/* Double étage */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doubleStack}
                  onChange={(e) => setDoubleStack(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Double étage
                </span>
              </label>

              {/* Optimisation auto */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optimized}
                  onChange={(e) => setOptimized(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Optimisation automatique
                </span>
              </label>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-wrap gap-2 mt-6">
              <button
                onClick={addPalette}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                Ajouter palette
              </button>

              <button
                onClick={clearAll}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                disabled={palettes.length === 0}
              >
                <Trash2 size={18} />
                Tout supprimer
              </button>

              <button
                onClick={saveTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                disabled={palettes.length === 0}
              >
                <Save size={18} />
                Sauvegarder template
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload size={18} />
                Importer JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={importJSON}
                className="hidden"
              />

              <button
                onClick={exportJSON}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                disabled={palettes.length === 0}
              >
                <FileText size={18} />
                Exporter JSON
              </button>

              <button
                onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                disabled={palettes.length === 0 || isExporting}
              >
                <Camera size={18} />
                {isExporting ? 'Génération...' : 'Exporter PDF'}
              </button>
            </div>

            {optimized && (
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                <Info size={16} />
                <span>Mode optimisation : les palettes seront placées automatiquement</span>
              </div>
            )}
          </div>
        )}

        {/* Vue 3D + Liste */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vue 3D */}
          <div className="lg:col-span-2">
            <div 
              ref={canvasRef}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <Truck3D
                palettes={palettes}
                truck={TRUCK}
                doubleStack={doubleStack}
                orientation={orientation}
                optimized={optimized}
                highlightedIndex={highlightedIndex}
              />
            </div>

            {/* Légende */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Package2 size={18} />
                Légende des couleurs
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(PALETTE_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Liste des palettes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col h-[600px] border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <Package2 size={20} />
                Palettes ({palettes.length})
              </h3>
            </div>

            {/* Barre de recherche */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Liste scrollable */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredPalettes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'Aucun résultat' : 'Aucune palette ajoutée'}
                </div>
              ) : (
                filteredPalettes.map((palette, index) => {
                  const realIndex = palettes.indexOf(palette);
                  return (
                    <div
                      key={realIndex}
                      onMouseEnter={() => setHighlightedIndex(realIndex)}
                      onMouseLeave={() => setHighlightedIndex(null)}
                      className={`p-3 border rounded-lg transition-all cursor-pointer ${
                        highlightedIndex === realIndex
                          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: PALETTE_COLORS[palette.type] }}
                            />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              #{realIndex + 1}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {palette.type}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {palette.l}×{palette.w}×{palette.h}m
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Orientation: {palette.orientation === 'long' ? 'Longueur' : 'Largeur'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Poids: {palette.weight}kg
                          </div>
                        </div>
                        <button
                          onClick={() => removePalette(realIndex)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Aide */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
            <Info size={18} />
            Comment utiliser cette interface ?
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• <strong>Ajouter des palettes</strong> : Configurez le type et l'orientation, puis cliquez sur "Ajouter palette"</li>
            <li>• <strong>Optimisation auto</strong> : Active un algorithme intelligent pour maximiser l'espace</li>
            <li>• <strong>Double étage</strong> : Permet d'empiler les palettes en hauteur</li>
            <li>• <strong>Templates</strong> : Sauvegardez vos configurations favorites pour les réutiliser</li>
            <li>• <strong>Export PDF</strong> : Génère un rapport complet avec capture 3D du chargement</li>
            <li>• <strong>Undo/Redo</strong> : Utilisez les flèches ou Ctrl+Z / Ctrl+Y pour annuler/rétablir</li>
            <li>• <strong>Survolez une palette</strong> dans la liste pour la mettre en surbrillance en 3D</li>
          </ul>
        </div>
      </div>

      {/* Raccourcis clavier */}
      <div className="hidden">
        <div
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === 'z') {
              e.preventDefault();
              undo();
            }
            if (e.ctrlKey && e.key === 'y') {
              e.preventDefault();
              redo();
            }
          }}
          tabIndex={-1}
        />
      </div>
    </div>
  );
}