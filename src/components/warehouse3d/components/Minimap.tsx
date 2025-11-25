import { FC, MutableRefObject, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { RackData, CameraMode } from '../types';

interface MinimapProps {
  rackData: RackData[];
  selectedRackId: string | null;
  cameraMode: CameraMode;
  fpPositionRef: MutableRefObject<{ x: number; z: number }>;
  fpRef: MutableRefObject<{ yaw: number; position: THREE.Vector3 }>;
  isDark: boolean;
}

export const Minimap: FC<MinimapProps> = ({
  rackData,
  selectedRackId,
  cameraMode,
  fpPositionRef,
  fpRef,
  isDark
}) => {
  const scale = 6;
  const offsetX = 90;
  const offsetZ = 60;
  
  // ✅ Local state pour la position FP, mis à jour par interval (pas à chaque frame)
  const [fpPos, setFpPos] = useState({ x: 0, z: 0, yaw: 0 });
  const animRef = useRef<number>(0);

  // ✅ Update position à 10fps (suffisant pour la minimap, pas 60fps)
  useEffect(() => {
    if (cameraMode !== 'firstPerson') return;

    const updatePos = () => {
      setFpPos({
        x: fpPositionRef.current.x,
        z: fpPositionRef.current.z,
        yaw: fpRef.current.yaw
      });
    };

    // Update immédiat puis interval
    updatePos();
    const interval = setInterval(updatePos, 100); // 10fps

    return () => clearInterval(interval);
  }, [cameraMode, fpPositionRef, fpRef]);

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
              cx={offsetX + fpPos.x * scale}
              cy={offsetZ + fpPos.z * scale}
              r={5}
              fill="#22c55e"
              stroke="#fff"
              strokeWidth={2}
            />
            {/* Direction indicator */}
            <line
              x1={offsetX + fpPos.x * scale}
              y1={offsetZ + fpPos.z * scale}
              x2={offsetX + fpPos.x * scale - Math.sin(fpPos.yaw) * 10}
              y2={offsetZ + fpPos.z * scale - Math.cos(fpPos.yaw) * 10}
              stroke="#22c55e"
              strokeWidth={2}
            />
          </>
        )}
      </svg>
    </div>
  );
};