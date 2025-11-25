import { FC, MutableRefObject } from 'react';
import * as THREE from 'three';
import { RackData, CameraMode } from '../types';

interface MinimapProps {
  rackData: RackData[];
  selectedRackId: string | null;
  cameraMode: CameraMode;
  fpPosition: { x: number; z: number };
  fpRef: MutableRefObject<{ yaw: number; position: THREE.Vector3 }>;
  isDark: boolean;
}

export const Minimap: FC<MinimapProps> = ({
  rackData,
  selectedRackId,
  cameraMode,
  fpPosition,
  fpRef,
  isDark
}) => {
  const scale = 6;
  const offsetX = 90;
  const offsetZ = 60;

  return (
    <div className={`absolute top-4 right-4 z-10 rounded-lg shadow-lg border ${
      isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-slate-200'
    }`}>
      <div className={`px-2 py-1 text-xs font-medium border-b ${
        isDark ? 'border-gray-700 text-slate-300' : 'border-slate-200 text-slate-600'
      }`}>
        Minimap {cameraMode === 'firstPerson' && <span className="text-green-500">• FP</span>}
      </div>
      <svg width={180} height={120} className="p-2">
        {/* Racks */}
        {rackData.map(r => {
          const isSel = r.id === selectedRackId;
          return (
            <rect
              key={r.id}
              x={offsetX + r.x * scale - 12}
              y={offsetZ + r.z * scale - 5}
              width={24}
              height={10}
              fill={isSel ? '#22c55e' : '#3b82f6'}
              rx={2}
            />
          );
        })}

        {/* Player position in First Person mode */}
        {cameraMode === 'firstPerson' && (
          <>
            <circle
              cx={offsetX + fpPosition.x * scale}
              cy={offsetZ + fpPosition.z * scale}
              r={5}
              fill="#22c55e"
              stroke="#fff"
              strokeWidth={2}
            />
            {/* Direction indicator */}
            <line
              x1={offsetX + fpPosition.x * scale}
              y1={offsetZ + fpPosition.z * scale}
              x2={offsetX + fpPosition.x * scale - Math.sin(fpRef.current.yaw) * 10}
              y2={offsetZ + fpPosition.z * scale - Math.cos(fpRef.current.yaw) * 10}
              stroke="#22c55e"
              strokeWidth={2}
            />
          </>
        )}
      </svg>
    </div>
  );
};