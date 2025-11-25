import { FC } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Move, RotateCw, RotateCcw, Check, X } from 'lucide-react';
import { RackData } from '../types';

interface EditPanelProps {
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
  isDark: boolean;
}

export const EditPanel: FC<EditPanelProps> = ({
  selectedLoc, selectedRack, moveStep, setMoveStep, canMove,
  moveRack, rotateRack, undo, confirm, cancel, historyLength, isDark
}) => {
  const btnClass = (enabled: boolean) =>
    enabled ? 'bg-blue-500 text-white active:scale-95' : 'bg-slate-200 text-slate-400';

  return (
    <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 ${
      isDark ? 'bg-gray-800/95' : 'bg-white/95'
    } backdrop-blur-sm rounded-2xl shadow-2xl border ${
      isDark ? 'border-gray-700' : 'border-slate-200'
    } p-4`}>
      <div className="flex items-center gap-4 flex-wrap justify-center">
        {/* Rack info */}
        <div className="text-center min-w-[80px]">
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rack</div>
          <div className="text-lg font-bold text-blue-500">{selectedLoc}</div>
          {selectedRack && (
            <div className={`text-xs font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
              X:{selectedRack.x.toFixed(1)} Z:{selectedRack.z.toFixed(1)}
            </div>
          )}
        </div>

        <div className={`w-px h-14 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />

        {/* Step selector */}
        <div className="flex flex-col items-center gap-1">
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pas</div>
          <div className="flex gap-1">
            {[0.5, 1, 2].map(s => (
              <button
                key={s}
                onClick={() => setMoveStep(s)}
                className={`w-7 h-7 rounded text-xs font-medium ${
                  moveStep === s
                    ? 'bg-blue-500 text-white'
                    : isDark ? 'bg-gray-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className={`w-px h-14 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />

        {/* Direction buttons */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => moveRack('up')}
            disabled={!canMove.up}
            className={`w-10 h-8 rounded flex items-center justify-center ${btnClass(canMove.up)}`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => moveRack('left')}
              disabled={!canMove.left}
              className={`w-8 h-10 rounded flex items-center justify-center ${btnClass(canMove.left)}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className={`w-10 h-10 rounded flex items-center justify-center ${
              isDark ? 'bg-gray-700' : 'bg-slate-100'
            }`}>
              <Move className="w-4 h-4 text-slate-500" />
            </div>
            <button
              onClick={() => moveRack('right')}
              disabled={!canMove.right}
              className={`w-8 h-10 rounded flex items-center justify-center ${btnClass(canMove.right)}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => moveRack('down')}
            disabled={!canMove.down}
            className={`w-10 h-8 rounded flex items-center justify-center ${btnClass(canMove.down)}`}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        <div className={`w-px h-14 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />

        {/* Rotate */}
        <button
          onClick={rotateRack}
          disabled={!canMove.rotate}
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            canMove.rotate ? 'bg-purple-500 text-white active:scale-95' : 'bg-slate-200 text-slate-400'
          }`}
        >
          <RotateCw className="w-6 h-6" />
        </button>

        <div className={`w-px h-14 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={!historyLength}
            className={`px-2 py-2 rounded-lg ${
              historyLength ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={confirm}
            className="px-3 py-2 bg-green-500 text-white rounded-lg flex items-center gap-1"
          >
            <Check className="w-4 h-4" /> OK
          </button>
          <button
            onClick={cancel}
            className={`px-3 py-2 rounded-lg ${
              isDark ? 'bg-gray-700 text-slate-300' : 'bg-slate-200 text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};