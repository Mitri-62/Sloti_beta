import { FC } from 'react';
import { Truck, User, Orbit, Edit, Maximize, Minimize, AlertTriangle } from 'lucide-react';
import { CameraMode, WarehouseStats } from '../types';
import { Btn } from './UIComponents';

interface HeaderProps {
  cameraMode: CameraMode;
  stats: WarehouseStats;
  isEditMode: boolean;
  isDark: boolean;
  isFullscreen: boolean;
  onToggleCameraMode: () => void;
  onToggleEditMode: () => void;
  onToggleDark: () => void;
  onToggleFullscreen: () => void;
}

export const Header: FC<HeaderProps> = ({
  cameraMode, stats, isEditMode, isDark, isFullscreen,
  onToggleCameraMode, onToggleEditMode, onToggleFullscreen
}) => (
  <header className={`flex items-center justify-between p-3 shadow-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
    <h1 className="text-lg font-bold flex items-center gap-2 text-blue-600">
      <Truck className="w-5 h-5" /> Entrepôt 3D
    </h1>

    <div className="flex items-center gap-2 flex-wrap">
      {/* Mode indicator */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
        cameraMode === 'firstPerson'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
      }`}>
        {cameraMode === 'firstPerson' ? <User className="w-4 h-4" /> : <Orbit className="w-4 h-4" />}
        {cameraMode === 'firstPerson' ? 'First Person' : 'Orbit'}
      </div>

      {/* Stats */}
      <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm ${
        isDark ? 'bg-gray-700' : 'bg-slate-100'
      }`}>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#cd853f' }} />
          EUR: {stats.eurCount}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#0066cc' }} />
          CHEP: {stats.chepCount}
        </span>
        {stats.overflowCount > 0 && (
          <span className="flex items-center gap-1 text-red-500 font-medium">
            <AlertTriangle className="w-4 h-4" /> {stats.overflowCount}
          </span>
        )}
      </div>

      {/* Buttons */}
      <Btn
        icon={cameraMode === 'firstPerson' ? <Orbit className="w-5 h-5" /> : <User className="w-5 h-5" />}
        onClick={onToggleCameraMode}
        title={cameraMode === 'firstPerson' ? 'Mode Orbit (F)' : 'Mode First Person (F)'}
        active={cameraMode === 'firstPerson'}
        variant="success"
      />
      <Btn
        icon={<Edit className="w-5 h-5" />}
        onClick={onToggleEditMode}
        title="Mode Édition"
        active={isEditMode}
        variant="warning"
      />
      
      <Btn
        icon={isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        onClick={onToggleFullscreen}
        title="Plein écran"
      />
    </div>
  </header>
);