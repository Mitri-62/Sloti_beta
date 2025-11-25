import { FC } from 'react';
import { 
  X, Grid, Ruler, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, 
  Move, RotateCw, Undo2, MapPin, Layers, Save, Loader
} from 'lucide-react';
import { RackData, WarehouseConfig } from '../types';
import { Slider } from './UIComponents';

interface EditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  config: WarehouseConfig;
  setConfig: (fn: (c: WarehouseConfig) => WarehouseConfig) => void;
  selectedLoc: string | null;
  selectedRack: RackData | undefined;
  moveStep: number;
  setMoveStep: (step: number) => void;
  canMove: { up: boolean; down: boolean; left: boolean; right: boolean; rotate: boolean };
  moveRack: (dir: 'up' | 'down' | 'left' | 'right') => void;
  rotateRack: () => void;
  undo: () => void;
  confirm: () => void;
  cancel: () => void;
  historyLength: number;
  showEditGrid: boolean;
  setShowEditGrid: (v: boolean) => void;
  // ✅ Nouveaux props pour la sauvegarde
  isSaving?: boolean;
  hasChanges?: boolean;
}

export const EditPanel: FC<EditPanelProps> = ({
  isOpen, onClose, isDark, config, setConfig,
  selectedLoc, selectedRack, moveStep, setMoveStep, canMove,
  moveRack, rotateRack, undo, confirm, cancel, historyLength,
  showEditGrid, setShowEditGrid,
  isSaving = false,
  hasChanges = false
}) => {
  if (!isOpen) return null;

  const sectionClass = `p-4 rounded-xl border ${
    isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-slate-200'
  }`;

  const labelClass = `text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
  
  const btnMove = (enabled: boolean) => `w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
    enabled 
      ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95 cursor-pointer' 
      : `${isDark ? 'bg-gray-700 text-gray-600' : 'bg-slate-100 text-slate-300'} cursor-not-allowed`
  }`;

  return (
    <div className={`w-80 flex-shrink-0 overflow-y-auto border-l ${
      isDark ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-slate-200'
    }`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 p-4 border-b ${
        isDark ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-bold flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-slate-800'
          }`}>
            <Grid className="w-5 h-5 text-amber-500" />
            Éditeur
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* ✅ Indicateur de modifications */}
        {hasChanges && (
          <div className={`mt-2 text-xs px-2 py-1 rounded-lg flex items-center gap-1.5 ${
            isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
          }`}>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Modifications non sauvegardées
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* === SECTION CONFIG ENTREPÔT === */}
        <div className={sectionClass}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
            isDark ? 'text-blue-400' : 'text-blue-600'
          }`}>
            <Layers className="w-4 h-4" />
            Disposition
          </h3>
          <div className="space-y-3">
            <Slider 
              label="Rangées" 
              value={config.rows} 
              min={1} 
              max={10}
              onChange={v => setConfig(c => ({ ...c, rows: v }))} 
            />
            <Slider 
              label="Racks par rangée" 
              value={config.racksPerRow} 
              min={2} 
              max={8} 
              step={2}
              onChange={v => setConfig(c => ({ ...c, racksPerRow: v }))} 
            />
            <Slider 
              label="Largeur allée" 
              value={config.aisleWidth} 
              min={3} 
              max={10} 
              step={0.5}
              onChange={v => setConfig(c => ({ ...c, aisleWidth: v }))} 
              unit="m" 
            />
          </div>
        </div>

        {/* === SECTION DIMENSIONS RACKS === */}
        <div className={sectionClass}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
            isDark ? 'text-blue-400' : 'text-blue-600'
          }`}>
            <Ruler className="w-4 h-4" />
            Dimensions racks
          </h3>
          <div className="space-y-3">
            <Slider 
              label="Hauteur" 
              value={config.rackHeight} 
              min={2} 
              max={12} 
              step={0.5}
              onChange={v => setConfig(c => ({ ...c, rackHeight: v }))} 
              unit="m" 
            />
            <Slider 
              label="Largeur baie" 
              value={config.bayWidth} 
              min={4} 
              max={7} 
              step={0.1}
              onChange={v => setConfig(c => ({ ...c, bayWidth: v }))} 
              unit="m" 
            />
            <Slider 
              label="Niveaux" 
              value={config.levelCount} 
              min={1} 
              max={6}
              onChange={v => setConfig(c => ({ ...c, levelCount: v }))} 
            />
          </div>
        </div>

        {/* === SECTION GRILLE === */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Grille d'alignement
            </span>
            <button
              onClick={() => setShowEditGrid(!showEditGrid)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showEditGrid 
                  ? 'bg-cyan-500 text-white' 
                  : isDark ? 'bg-gray-700 text-slate-400' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {showEditGrid ? 'Visible' : 'Masquée'}
            </button>
          </div>
        </div>

        {/* === SECTION RACK SÉLECTIONNÉ === */}
        {selectedRack ? (
          <div className={`${sectionClass} border-2 ${
            isDark ? 'border-green-600' : 'border-green-500'
          }`}>
            <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
              isDark ? 'text-green-400' : 'text-green-600'
            }`}>
              <MapPin className="w-4 h-4" />
              Rack {selectedLoc}
            </h3>

            {/* Position */}
            <div className={`mb-4 p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-slate-100'}`}>
              <div className={labelClass}>Position actuelle</div>
              <div className={`font-mono text-sm ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                X: {selectedRack.x.toFixed(1)}m &nbsp;|&nbsp; Z: {selectedRack.z.toFixed(1)}m
              </div>
            </div>

            {/* Pas de déplacement */}
            <div className="mb-4">
              <div className={`${labelClass} mb-2`}>Pas de déplacement</div>
              <div className="flex gap-1">
                {[0.5, 1, 2].map(s => (
                  <button
                    key={s}
                    onClick={() => setMoveStep(s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      moveStep === s
                        ? 'bg-blue-500 text-white'
                        : isDark ? 'bg-gray-700 text-slate-300 hover:bg-gray-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s}m
                  </button>
                ))}
              </div>
            </div>

            {/* Contrôles de mouvement */}
            <div className="flex justify-center mb-4">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => moveRack('up')}
                  disabled={!canMove.up}
                  className={btnMove(canMove.up)}
                >
                  <ChevronUp className="w-6 h-6" />
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveRack('left')}
                    disabled={!canMove.left}
                    className={btnMove(canMove.left)}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isDark ? 'bg-gray-700' : 'bg-slate-100'
                  }`}>
                    <Move className="w-5 h-5 text-slate-500" />
                  </div>
                  <button
                    onClick={() => moveRack('right')}
                    disabled={!canMove.right}
                    className={btnMove(canMove.right)}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
                <button
                  onClick={() => moveRack('down')}
                  disabled={!canMove.down}
                  className={btnMove(canMove.down)}
                >
                  <ChevronDown className="w-6 h-6" />
                </button>
              </div>

              {/* Rotation */}
              <div className="ml-4 flex flex-col justify-center">
                <button
                  onClick={rotateRack}
                  disabled={!canMove.rotate}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                    canMove.rotate
                      ? 'bg-purple-500 text-white hover:bg-purple-600 active:scale-95'
                      : isDark ? 'bg-gray-700 text-gray-600' : 'bg-slate-100 text-slate-300'
                  }`}
                >
                  <RotateCw className="w-7 h-7" />
                </button>
                <span className={`text-[10px] text-center mt-1 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Rotation
                </span>
              </div>
            </div>

            {/* Actions rack */}
            <div className="flex gap-2">
              <button
                onClick={undo}
                disabled={!historyLength}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 text-sm font-medium ${
                  historyLength
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : isDark ? 'bg-gray-700 text-gray-600' : 'bg-slate-100 text-slate-300'
                }`}
              >
                <Undo2 className="w-4 h-4" />
                Annuler
              </button>
              <button
                onClick={cancel}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  isDark ? 'bg-gray-700 text-slate-300 hover:bg-gray-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Reset
              </button>
            </div>
          </div>
        ) : (
          <div className={`${sectionClass} text-center`}>
            <MapPin className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Cliquez sur un rack pour le déplacer
            </p>
          </div>
        )}

        {/* === ✅ BOUTON SAUVEGARDER AMÉLIORÉ === */}
        <button
          onClick={confirm}
          disabled={isSaving || !hasChanges}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            isSaving 
              ? 'bg-gray-400 cursor-wait text-white' 
              : hasChanges
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
                : isDark 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {hasChanges ? 'Sauvegarder' : 'Aucune modification'}
            </>
          )}
        </button>

        {/* Raccourcis clavier */}
        <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'} space-y-1`}>
          <p><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-gray-700 text-xs">↑↓←→</kbd> Déplacer</p>
          <p><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-gray-700 text-xs">R</kbd> Rotation</p>
          <p><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-gray-700 text-xs">Ctrl+Z</kbd> Annuler</p>
          <p><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-gray-700 text-xs">Entrée</kbd> Sauvegarder</p>
          <p><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-gray-700 text-xs">Échap</kbd> Annuler tout</p>
        </div>
      </div>
    </div>
  );
};