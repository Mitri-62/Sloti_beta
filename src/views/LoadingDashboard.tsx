import { useState } from "react";
import { Truck, Package, Database, FileText, Play, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function LoadingDashboard() {
  const [step, setStep] = useState(1);
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);
  const [palletsLoaded, setPalletsLoaded] = useState(false);
  const [optimizationDone, setOptimizationDone] = useState(false);

  const steps = [
    {
      id: 1,
      title: "Import MasterData",
      description: "Charger les données produits",
      icon: Database,
      status: masterDataLoaded ? "complete" : step === 1 ? "active" : "pending",
    },
    {
      id: 2,
      title: "Import Palettes",
      description: "Charger le listing des palettes",
      icon: Package,
      status: palletsLoaded ? "complete" : step === 2 ? "active" : "pending",
    },
    {
      id: 3,
      title: "Configuration",
      description: "Paramétrer le chargement",
      icon: Truck,
      status: step === 3 ? "active" : step > 3 ? "complete" : "pending",
    },
    {
      id: 4,
      title: "Optimisation",
      description: "Calculer le gerbage optimal",
      icon: Play,
      status: optimizationDone ? "complete" : step === 4 ? "active" : "pending",
    },
    {
      id: 5,
      title: "Export",
      description: "Télécharger le plan",
      icon: FileText,
      status: step === 5 ? "active" : "pending",
    },
  ];

  const getStepIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="text-green-600" size={24} />;
      case "active":
        return <div className="w-6 h-6 rounded-full bg-blue-600 animate-pulse" />;
      case "pending":
        return <div className="w-6 h-6 rounded-full bg-gray-300" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4">
            <Truck className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Système de Chargement Intelligent
          </h1>
          <p className="text-lg text-gray-600">
            Optimisation automatique avec gerbage et MasterData
          </p>
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex justify-between relative">
            {/* Ligne de connexion */}
            <div className="absolute top-12 left-0 right-0 h-0.5 bg-gray-200" style={{ zIndex: 0 }} />
            
            {steps.map((stepItem, idx) => (
              <div key={stepItem.id} className="flex flex-col items-center relative" style={{ zIndex: 1 }}>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-3 transition-all ${
                  stepItem.status === "complete" 
                    ? "bg-green-100" 
                    : stepItem.status === "active"
                    ? "bg-blue-100"
                    : "bg-gray-100"
                }`}>
                  {getStepIcon(stepItem.status)}
                </div>
                <div className="text-center">
                  <p className={`font-semibold text-sm mb-1 ${
                    stepItem.status === "active" ? "text-blue-600" : "text-gray-700"
                  }`}>
                    {stepItem.title}
                  </p>
                  <p className="text-xs text-gray-500">{stepItem.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contenu selon l'étape */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {step === 1 && (
            <div className="text-center">
              <Database className="mx-auto mb-4 text-blue-600" size={64} />
              <h2 className="text-2xl font-bold mb-4">Import MasterData</h2>
              <p className="text-gray-600 mb-6">
                Chargez les données produits depuis Supabase ou importez un fichier Excel/CSV
              </p>
              <div className="space-y-4 max-w-md mx-auto">
                <button
                  onClick={() => {
                    setMasterDataLoaded(true);
                    setStep(2);
                  }}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Charger depuis Supabase
                </button>
                <button className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">
                  Importer fichier Excel/CSV
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <Package className="mx-auto mb-4 text-green-600" size={64} />
              <h2 className="text-2xl font-bold mb-4">Import Listing Palettes</h2>
              <p className="text-gray-600 mb-6">
                Importez votre listing de palettes (SSCC, SKU, Quantité)
              </p>
              <div className="space-y-4 max-w-md mx-auto">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    id="file-upload"
                    onChange={() => {
                      setPalletsLoaded(true);
                      setStep(3);
                    }}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FileText className="mx-auto mb-2 text-gray-400" size={48} />
                    <p className="text-sm font-medium text-gray-700">
                      Glissez-déposez ou cliquez pour importer
                    </p>
                    <p className="text-xs text-gray-500 mt-1">CSV, XLSX, XLS</p>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <Truck className="mx-auto mb-4 text-orange-600" size={64} />
              <h2 className="text-2xl font-bold mb-6 text-center">Configuration du chargement</h2>
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de camion
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-4 py-3">
                    <option>7.5T - 6m × 2.4m × 2.4m</option>
                    <option>19T - 8m × 2.4m × 2.6m</option>
                    <option>Semi 13.6m - 13.6m × 2.4m × 2.7m</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Orientation par défaut
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="orientation" defaultChecked />
                      <span>En long</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="orientation" />
                      <span>En large</span>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1" defaultChecked />
                    <div>
                      <p className="font-medium text-blue-900">Activer le gerbage automatique</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Les palettes incomplètes seront automatiquement empilées sur les palettes pleines du même SKU
                      </p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={() => setStep(4)}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Continuer vers l'optimisation
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-purple-100 rounded-full mb-6">
                <Play className="text-purple-600" size={48} />
              </div>
              <h2 className="text-2xl font-bold mb-4">Optimisation en cours...</h2>
              <p className="text-gray-600 mb-8">
                Calcul du plan de chargement optimal avec gerbage
              </p>

              <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">Reconstruction des palettes</span>
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">Analyse du gerbage</span>
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm text-gray-700 font-medium">Placement dans le camion</span>
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50">
                  <span className="text-sm text-gray-700">Génération du rapport</span>
                  <div className="w-5 h-5 rounded-full bg-gray-300" />
                </div>
              </div>

              <button
                onClick={() => {
                  setOptimizationDone(true);
                  setStep(5);
                }}
                className="mt-8 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Simuler fin de calcul
              </button>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="text-green-600" size={56} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Plan de chargement optimisé</h2>
                <p className="text-gray-600">Votre plan est prêt à être exporté</p>
              </div>

              {/* Résumé */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">24</p>
                  <p className="text-sm text-gray-600 mt-1">Palettes total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">6</p>
                  <p className="text-sm text-gray-600 mt-1">Unités gerbées</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-orange-600">3.2T</p>
                  <p className="text-sm text-gray-600 mt-1">Poids total</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">87%</p>
                  <p className="text-sm text-gray-600 mt-1">Taux remplissage</p>
                </div>
              </div>

              {/* Alertes */}
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium text-green-900">Chargement validé</p>
                    <p className="text-sm text-green-700 mt-1">
                      Toutes les palettes respectent les contraintes de hauteur et de poids
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium text-yellow-900">Optimisation possible</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      3 palettes incomplètes pourraient être gerbées pour gagner de l'espace
                    </p>
                  </div>
                </div>
              </div>

              {/* Export */}
              <div className="grid grid-cols-3 gap-4">
                <button className="flex flex-col items-center gap-2 p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <FileText className="text-blue-600" size={32} />
                  <span className="font-medium">JSON</span>
                  <span className="text-xs text-gray-500">Données complètes</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
                  <FileText className="text-green-600" size={32} />
                  <span className="font-medium">CSV</span>
                  <span className="text-xs text-gray-500">Excel compatible</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
                  <FileText className="text-purple-600" size={32} />
                  <span className="font-medium">HTML</span>
                  <span className="text-xs text-gray-500">Rapport visuel</span>
                </button>
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Nouveau chargement
                </button>
                <button className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Voir la visualisation 3D
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Comment ça fonctionne ?</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>MasterData</strong> : Contient les caractéristiques de chaque produit (dimensions, poids, capacité palette)</p>
            <p>• <strong>Listing palettes</strong> : Inventaire des palettes à charger avec leur quantité réelle</p>
            <p>• <strong>Gerbage</strong> : Empile automatiquement les palettes incomplètes sur les pleines pour optimiser l'espace</p>
            <p>• <strong>Contraintes</strong> : Respect de la hauteur max du camion et du poids supportable par palette</p>
          </div>
        </div>
      </div>
    </div>
  );
}