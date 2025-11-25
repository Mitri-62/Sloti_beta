import { useState, useCallback, useMemo, useEffect } from 'react';
import { RackData, WarehouseConfig, AlveoleStock } from '../types';
import { RACK_W, RACK_D } from '../config';
import { genRackCode, getRackBounds } from '../utils';

interface UseRackEditorProps {
  config: WarehouseConfig;
  stockByRack: Map<string, Map<number, AlveoleStock>>;
  isEditMode: boolean;
}

export const useRackEditor = ({ config, stockByRack, isEditMode }: UseRackEditorProps) => {
  const [rackData, setRackData] = useState<RackData[]>([]);
  const [origRackData, setOrigRackData] = useState<RackData[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [moveStep, setMoveStep] = useState(1);
  const [history, setHistory] = useState<RackData[][]>([]);

  // Générer les racks
  const generateRacks = useCallback(() => {
    const data: RackData[] = [];
    const rackWidth = config.bayWidth + 0.1;
    const spacing = rackWidth + 0.3;

    for (let i = 0; i < config.rows * config.racksPerRow; i++) {
      const row = Math.floor(i / config.racksPerRow);
      const col = i % config.racksPerRow;
      const code = genRackCode(i);
      const z = (row - config.rows / 2 + 0.5) * (config.aisleWidth + config.rackDepth + 0.1) + config.aisleWidth / 2;
      const side = config.racksPerRow / 2;
      const totalWidth = side * spacing;
      const x = col < side
        ? -totalWidth + (col + 0.5) * spacing
        : (col - side + 0.5) * spacing;

      data.push({
        id: `rack-${i}`,
        loc: code,
        rackCode: code,
        stockByLevel: stockByRack.get(code) || new Map(),
        x,
        z,
        rotation: 0
      });
    }
    return data;
  }, [config, stockByRack]);

  // Initialiser/mettre à jour les racks quand la config change
  useEffect(() => {
    const d = generateRacks();
    setRackData(d);
    setOrigRackData(d);
  }, [config.rows, config.racksPerRow, config.bayWidth, config.aisleWidth, config.rackDepth, stockByRack]);

  // Collision helpers
  const getBounds = useCallback((x: number, z: number, rot: number) => {
    return getRackBounds(x, z, rot, RACK_W, RACK_D);
  }, []);

  const hasCollision = useCallback((id: string, x: number, z: number, rot: number, data: RackData[]) => {
    const b = getBounds(x, z, rot);
    b.minX -= 0.1; b.maxX += 0.1; b.minZ -= 0.1; b.maxZ += 0.1;
    return data.some(r => {
      if (r.id === id) return false;
      const o = getBounds(r.x, r.z, r.rotation);
      return b.minX < o.maxX && b.maxX > o.minX && b.minZ < o.maxZ && b.maxZ > o.minZ;
    });
  }, [getBounds]);

  // Possibilités de mouvement
  const canMove = useMemo(() => {
    if (!selectedRackId) return { up: false, down: false, left: false, right: false, rotate: false };
    const r = rackData.find(x => x.id === selectedRackId);
    if (!r) return { up: false, down: false, left: false, right: false, rotate: false };
    return {
      up: !hasCollision(selectedRackId, r.x, r.z - moveStep, r.rotation, rackData),
      down: !hasCollision(selectedRackId, r.x, r.z + moveStep, r.rotation, rackData),
      left: !hasCollision(selectedRackId, r.x - moveStep, r.z, r.rotation, rackData),
      right: !hasCollision(selectedRackId, r.x + moveStep, r.z, r.rotation, rackData),
      rotate: !hasCollision(selectedRackId, r.x, r.z, (r.rotation + Math.PI / 2) % (Math.PI * 2), rackData)
    };
  }, [selectedRackId, rackData, moveStep, hasCollision]);

  // Actions
  const moveRack = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedRackId) return;
    const delta = { up: [0, -moveStep], down: [0, moveStep], left: [-moveStep, 0], right: [moveStep, 0] }[dir];
    setRackData(prev => {
      const next = prev.map(r => {
        if (r.id !== selectedRackId) return r;
        const nx = r.x + delta[0], nz = r.z + delta[1];
        return hasCollision(selectedRackId, nx, nz, r.rotation, prev) ? r : { ...r, x: nx, z: nz };
      });
      if (JSON.stringify(next) !== JSON.stringify(prev)) {
        setHistory(h => [...h.slice(-19), prev]);
      }
      return next;
    });
  }, [selectedRackId, moveStep, hasCollision]);

  const rotateRack = useCallback(() => {
    if (!selectedRackId) return;
    setRackData(prev => {
      const next = prev.map(r => {
        if (r.id !== selectedRackId) return r;
        const nr = (r.rotation + Math.PI / 2) % (Math.PI * 2);
        return hasCollision(selectedRackId, r.x, r.z, nr, prev) ? r : { ...r, rotation: nr };
      });
      if (JSON.stringify(next) !== JSON.stringify(prev)) {
        setHistory(h => [...h.slice(-19), prev]);
      }
      return next;
    });
  }, [selectedRackId, hasCollision]);

  const undo = useCallback(() => {
    if (history.length) {
      setRackData(history[history.length - 1]);
      setHistory(h => h.slice(0, -1));
    }
  }, [history]);

  const confirm = useCallback(() => {
    setOrigRackData([...rackData]);
    setSelectedRackId(null);
    setSelectedLoc(null);
    setHistory([]);
  }, [rackData]);

  const cancel = useCallback(() => {
    setRackData([...origRackData]);
    setSelectedRackId(null);
    setSelectedLoc(null);
    setHistory([]);
  }, [origRackData]);

  // Reset selection quand on quitte le mode édition
  useEffect(() => {
    if (!isEditMode) setSelectedRackId(null);
  }, [isEditMode]);

  // Keyboard shortcuts pour édition
  useEffect(() => {
    if (!isEditMode || !selectedRackId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); moveRack('up'); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveRack('down'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); moveRack('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveRack('right'); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateRack(); }
      else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
      else if (e.key === 'Enter') { e.preventDefault(); confirm(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditMode, selectedRackId, moveRack, rotateRack, undo, confirm, cancel]);

  return {
    rackData,
    setRackData,
    selectedRackId,
    setSelectedRackId,
    selectedLoc,
    setSelectedLoc,
    moveStep,
    setMoveStep,
    history,
    canMove,
    moveRack,
    rotateRack,
    undo,
    confirm,
    cancel,
    getBounds,
    origRackData,
    setOrigRackData
  };
};