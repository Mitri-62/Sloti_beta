// src/pages/LoadingView.tsx - AVEC DARK MODE
import { useState, useMemo } from "react";
import Truck3D, { computePacking } from "../components/Truck3D";
import { Plus, Trash2, Download, Search, Truck, Package2, Settings, AlertCircle, Info } from "lucide-react";

const TRUCK_TYPES = {
  "7.5T": { length: 6, width: 2.4, height: 2.4 },
  "19T": { length: 8, width: 2.4, height: 2.6 },
  "Semi 13.6m": { length: 13.6, width: 2.4, height: 2.7 },
};

const PALLET_TYPES = {
  "EUR 120x80": { l: 1.2, w: 0.8, h: 1.2 },
  "US 120x100": { l: 1.2, w: 1.0, h: 1.2 },
  "Demi 80x60": { l: 0.8, w: 0.6, h: 1.0 },
};

const PALETTE_COLORS: Record<string, string> = {
  "EUR 120x80": "seagreen",
  "US 120x100": "saddlebrown",
  "Demi 80x60": "darkorange",
};

export default function LoadingView() {
  const [truckType, setTruckType] = useState<keyof typeof TRUCK_TYPES>("Semi 13.6m");
  const [palettes, setPalettes] = useState<
    { l: number; w: number; h: number; orientation: "long" | "large"; type: string }[]
  >([]);
  const [palletType, setPalletType] = useState<keyof typeof PALLET_TYPES>("EUR 120x80");
  const [doubleStack, setDoubleStack] = useState(false);
  const [orientation, setOrientation] = useState<"long" | "large">("long");
  const [optimized, setOptimized] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfig, setShowConfig] = useState(true);

  const TRUCK = TRUCK_TYPES[truckType];

  // Calcul capacité et pourcentage
  const { maxCapacity, percent } = useMemo(() => {
    if (optimized) {
      return { maxCapacity: palettes.length, percent: 100 };
    }
    const simulated = [
      ...palettes,
      ...Array(200).fill({ ...PALLET_TYPES[palletType], orientation, type: palletType }),
    ];
    const placed = computePacking(simulated, TRUCK, doubleStack, orientation);
    const maxCapacity = placed.length;
    const percent =
      maxCapacity > 0 ? Math.min(100, (palettes.length / maxCapacity) * 100) : 0;
    return { maxCapacity, percent };
  }, [palettes, palletType, TRUCK, doubleStack, orientation, optimized]);

  // Palettes filtrées
  const filteredPalettes = useMemo(() => {
    if (!searchTerm) return palettes.map((p, i) => ({ ...p, index: i }));
    return palettes
      .map((p, i) => ({ ...p, index: i }))
      .filter((p, i) => 
        p.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${i + 1}`.includes(searchTerm)
      );
  }, [palettes, searchTerm]);

  const addPallet = () => {
    if (!optimized && maxCapacity && palettes.length >= maxCapacity) {
      alert(`Capacité maximale atteinte (${maxCapacity} palettes)`);
      return;
    }
    setPalettes([...palettes, { ...PALLET_TYPES[palletType], orientation, type: palletType }]);
  };

  const removePallet = (index: number) => {
    setPalettes(palettes.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    if (palettes.length === 0) return;
    if (confirm("Vider toutes les palettes ?")) {
      setPalettes([]);
    }
  };

  const exportPlan = () => {
    if (palettes.length === 0) {
      alert("Aucune palette à exporter");
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
      })),
      configuration: {
        doubleEtage: doubleStack,
        optimisationAuto: optimized,
        tauxRemplissage: percent.toFixed(1) + "%",
      },
      date: new Date().toLocaleString("fr-FR"),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-chargement-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="text-blue-600 dark:text-blue-400" size={28} />
              Plan de Chargement 3D
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Optimisez le chargement de vos camions</p>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
          >
            <Settings size={18} />
            <span className="hidden sm:inline">{showConfig ? "Masquer" : "Afficher"} config</span>
          </button>
        </div>

        {/* Configuration */}
        {showConfig && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 space-y-4 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
              <Settings size={20} />
              Configuration
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Type de camion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type de camion
                </label>
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value as keyof typeof TRUCK_TYPES)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {Object.keys(TRUCK_TYPES).map((t) => (
                    <option key={t}>{t}</option>
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
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {Object.keys(PALLET_TYPES).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Orientation */}
              {!optimized && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Orientation
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as "long" | "large")}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="long">En long</option>
                    <option value="large">En large</option>
                  </select>
                </div>
              )}

              {/* Options */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Options
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doubleStack}
                    onChange={(e) => setDoubleStack(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-200">Double étage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optimized}
                    onChange={(e) => setOptimized(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-200">Optimisation auto</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={addPallet}
                disabled={!optimized && palettes.length >= maxCapacity}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  !optimized && palettes.length >= maxCapacity
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Plus size={18} /> Ajouter palette
              </button>

              <button
                onClick={clearAll}
                disabled={palettes.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  palettes.length === 0
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <Trash2 size={18} /> Vider tout
              </button>

              <button
                onClick={exportPlan}
                disabled={palettes.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  palettes.length === 0
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Download size={18} /> Exporter plan
              </button>
            </div>
          </div>
        )}

        {/* Barre de progression */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Taux de remplissage</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{percent.toFixed(1)}%</span>
          </div>
          
          <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-4 transition-all duration-500 ${
                percent < 70
                  ? "bg-blue-500"
                  : percent < 90
                  ? "bg-orange-500"
                  : "bg-red-600"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex flex-wrap justify-between items-center mt-3 gap-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">{palettes.length}</span> / {maxCapacity} palettes
              {doubleStack && " (double étage)"}
              {optimized && " (optimisé)"}
            </p>

            {/* Légende */}
            <div className="flex flex-wrap gap-3">
              {Object.entries(PALETTE_COLORS).map(([name, color]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-600" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerte capacité max */}
          {!optimized && percent >= 100 && (
            <div className="mt-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              <span>Capacité maximale atteinte</span>
            </div>
          )}

          {/* Info optimisation */}
          {optimized && (
            <div className="mt-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
              <Info size={16} />
              <span>Mode optimisation : les palettes seront placées automatiquement</span>
            </div>
          )}
        </div>

        {/* Vue 3D + Liste */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vue 3D */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
              <Truck3D
                palettes={palettes}
                truck={TRUCK}
                doubleStack={doubleStack}
                orientation={orientation}
                optimized={optimized}
                highlightedIndex={highlightedIndex}
              />
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
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Liste scrollable */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredPalettes.length === 0 && searchTerm && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                  Aucun résultat pour "{searchTerm}"
                </div>
              )}
              {filteredPalettes.length === 0 && !searchTerm && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <Package2 size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm">Aucune palette chargée</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Cliquez sur "Ajouter palette" pour commencer</p>
                </div>
              )}
              {filteredPalettes.map((p) => (
                <div
                  key={p.index}
                  className={`flex justify-between items-center border rounded-lg px-3 py-3 transition-all cursor-pointer ${
                    highlightedIndex === p.index 
                      ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 shadow-md' 
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'
                  }`}
                  onMouseEnter={() => setHighlightedIndex(p.index)}
                  onMouseLeave={() => setHighlightedIndex(null)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600" 
                        style={{ backgroundColor: PALETTE_COLORS[p.type] }}
                      />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">#{p.index + 1}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {p.type} • {p.l}×{p.w}×{p.h}m
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {p.orientation === "long" ? "En long" : "En large"}
                    </p>
                  </div>
                  <button
                    onClick={() => removePallet(p.index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors"
                    aria-label="Supprimer la palette"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}