// src/components/OptimizationResultModal.tsx
import { CheckCircle, TrendingDown, Clock, Target, X, Home, RotateCcw } from 'lucide-react';

interface OptimizationResult {
  totalDistance: number;
  previousDistance?: number;
  totalDuration: number;
  feasibilityScore: number;
  stopsCount: number;
  savedKm?: number;
  savedPercent?: number;
  // ✅ NOUVEAU: Infos retour dépôt
  returnToDepot?: boolean;
  returnDistance?: number;
  returnTime?: string;
  startLocationSource?: string;
}

interface OptimizationResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: OptimizationResult;
  tourName: string;
}

export default function OptimizationResultModal({ 
  isOpen, 
  onClose, 
  result, 
  tourName 
}: OptimizationResultModalProps) {
  if (!isOpen) return null;

  // ✅ ARRONDIS PROPRES
  const hours = Math.floor(result.totalDuration / 60);
  const minutes = Math.round(result.totalDuration % 60);
  const totalDistanceRounded = result.totalDistance.toFixed(1);
  const previousDistanceRounded = result.previousDistance ? result.previousDistance.toFixed(1) : null;
  const savedKmRounded = result.savedKm ? result.savedKm.toFixed(1) : null;
  const feasibilityScoreRounded = Math.round(result.feasibilityScore);
  const returnDistanceRounded = result.returnDistance ? result.returnDistance.toFixed(1) : null;

  // ✅ Label pour la source de départ
  const getStartLocationLabel = () => {
    switch (result.startLocationSource) {
      case 'driver_gps': return '🚚 GPS temps réel';
      case 'vehicle': return '🅿️ Position véhicule';
      case 'driver': return '👤 Position chauffeur';
      case 'estimated': return '📍 Position estimée';
      default: return '📍 Point de départ';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <CheckCircle size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Optimisation réussie !</h2>
                <p className="text-green-100 text-sm mt-1">{tourName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4">
          {/* Économies */}
          {savedKmRounded && parseFloat(savedKmRounded) > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border-2 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 text-white p-3 rounded-full">
                  <TrendingDown size={24} />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    -{savedKmRounded} km
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-500">
                    Économisé ({result.savedPercent}% de réduction)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats principales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Target className="text-blue-600 dark:text-blue-400" size={20} />
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Distance totale</span>
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {totalDistanceRounded} km
              </div>
              {previousDistanceRounded && (
                <div className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                  Avant: {previousDistanceRounded} km
                </div>
              )}
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-purple-600 dark:text-purple-400" size={20} />
                <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">Durée totale</span>
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {hours > 0 && `${hours}h`}{minutes > 0 && `${String(minutes).padStart(2, '0')}`}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                {result.stopsCount} arrêts
              </div>
            </div>
          </div>

          {/* ✅ NOUVEAU: Info retour dépôt */}
          {result.returnToDepot && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 text-white p-2 rounded-full">
                  <RotateCcw size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Retour à l'entrepôt inclus
                    </span>
                    <Home size={16} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    {returnDistanceRounded && (
                      <span className="text-orange-700 dark:text-orange-300">
                        📏 {returnDistanceRounded} km
                      </span>
                    )}
                    {result.returnTime && (
                      <span className="text-orange-700 dark:text-orange-300">
                        🕐 Arrivée dépôt : <strong>{result.returnTime}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info point de départ */}
          {result.startLocationSource && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <span className="text-xs text-gray-600 dark:text-gray-400">Point de départ :</span>
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                {getStartLocationLabel()}
              </span>
            </div>
          )}

          {/* Score */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Score de faisabilité
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {feasibilityScoreRounded}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  feasibilityScoreRounded >= 80
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : feasibilityScoreRounded >= 60
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    : 'bg-gradient-to-r from-red-500 to-pink-500'
                }`}
                style={{ width: `${feasibilityScoreRounded}%` }}
              />
            </div>
            
            {/* Détails selon le score */}
            <div className="mt-3 space-y-2">
              {feasibilityScoreRounded >= 80 ? (
                <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                  <span className="text-green-600 dark:text-green-400">✅</span>
                  <div>
                    <p className="font-medium">Excellent : Toutes les contraintes respectées</p>
                    <ul className="text-xs mt-1 space-y-1 ml-4 list-disc">
                      <li>Créneaux horaires respectés</li>
                      <li>Capacité du véhicule optimale</li>
                      <li>Priorités prises en compte</li>
                      {result.returnToDepot && <li>Retour dépôt planifié</li>}
                    </ul>
                  </div>
                </div>
              ) : feasibilityScoreRounded >= 60 ? (
                <div className="flex items-start gap-2 text-sm text-orange-700 dark:text-orange-300">
                  <span className="text-orange-600 dark:text-orange-400">⚠️</span>
                  <div>
                    <p className="font-medium">Acceptable : Quelques ajustements possibles</p>
                    <ul className="text-xs mt-1 space-y-1 ml-4 list-disc">
                      <li>Certains créneaux horaires serrés</li>
                      <li>Charge du véhicule élevée (&gt;80%)</li>
                      <li>Temps de trajet optimisable</li>
                      <li>Considérer une pause supplémentaire</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                  <span className="text-red-600 dark:text-red-400">❌</span>
                  <div>
                    <p className="font-medium">À améliorer : Certaines contraintes non respectées</p>
                    <ul className="text-xs mt-1 space-y-1 ml-4 list-disc">
                      <li>Plusieurs créneaux horaires dépassés</li>
                      <li>Risque de surcharge du véhicule</li>
                      <li>Amplitude de travail excessive</li>
                      <li>Recommandation : diviser en 2 tournées</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info algorithme */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>ℹ️ Algorithme :</strong> Plus proche voisin + 2-opt
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              Optimisé selon les créneaux horaires, priorités et capacité.
              {result.returnToDepot && ' Inclut le trajet retour au dépôt.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl"
          >
            Parfait, continuer !
          </button>
        </div>
      </div>
    </div>
  );
}