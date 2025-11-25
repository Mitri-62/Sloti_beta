import { FC, MutableRefObject, useState, useEffect } from 'react';
import * as THREE from 'three';

interface FPPositionDisplayProps {
  fpRef: MutableRefObject<{ position: THREE.Vector3 }>;
  fpPositionRef: MutableRefObject<{ x: number; z: number }>;
  isDark: boolean;
}

export const FPPositionDisplay: FC<FPPositionDisplayProps> = ({
  fpRef,
  fpPositionRef,
  isDark
}) => {
  const [pos, setPos] = useState({ x: 0, z: 0, y: 1.7 });

  // Update à 10fps (suffisant pour l'affichage)
  useEffect(() => {
    const interval = setInterval(() => {
      setPos({
        x: fpPositionRef.current.x,
        z: fpPositionRef.current.z,
        y: fpRef.current.position.y
      });
    }, 100);

    return () => clearInterval(interval);
  }, [fpRef, fpPositionRef]);

  return (
    <div className={`absolute bottom-4 left-4 z-10 px-3 py-2 rounded-lg ${
      isDark ? 'bg-gray-800/90' : 'bg-white/90'
    } shadow-lg text-sm font-mono`}>
      <div className="text-xs text-slate-500 mb-1">Position</div>
      <div>X: {pos.x.toFixed(1)}m</div>
      <div>Z: {pos.z.toFixed(1)}m</div>
      <div>H: {pos.y.toFixed(1)}m</div>
    </div>
  );
};