import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { RackData, WarehouseConfig, AlveoleStock } from '../types';
import { RACK_W, RACK_D } from '../config';
import { genRackCode, getRackBounds } from '../utils';

export interface RackPosition {
  id: string;
  rackCode: string;
  x: number;
  z: number;
  rotation: number;
}

interface UseRackEditorProps {
  config: WarehouseConfig;
  stockByRack: Map<string, Map<number, AlveoleStock>>;
  isEditMode: boolean;
  savedPositions?: RackPosition[];
  onSave?: (positions: RackPosition[]) => Promise<boolean>;
}

export const useRackEditor = ({ 
  config, 
  stockByRack, 
  isEditMode,
  savedPositions = [],
  onSave
}: UseRackEditorProps) => {
  const [rackData, setRackData] = useState<RackData[]>([]);
  const [origRackData, setOrigRackData] = useState<RackData[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [moveStep, setMoveStep] = useState(1);
  const [history, setHistory] = useState<RackData[][]>([]);
  
  // Ref pour éviter les re-renders constants
  const savedPositionsRef = useRef<RackPosition[]>(savedPositions);
  const initializedRef = useRef(false);

  // Mettre à jour la ref seulement si les positions ont vraiment changé
  useEffect(() => {
    const currentJson = JSON.stringify(savedPositionsRef.current);
    const newJson = JSON.stringify(savedPositions);
    if (currentJson !== newJson) {
      savedPositionsRef.current = savedPositions;
    }
  }, [savedPositions]);

  // Générer les racks - appelé seulement lors de l'init ou changement de config
  const generateRacks = useCallback((positions: RackPosition[]) => {
    const data: RackData[] = [];
    const rackWidth = config.bayWidth + 0.1;
    const spacing = rackWidth + 0.3;

    const savedPosMap = new Map<string, RackPosition>();
    positions.forEach(pos => savedPosMap.set(pos.rackCode, pos));

    for (let i = 0; i < config.rows * config.racksPerRow; i++) {
      const row = Math.floor(i / config.racksPerRow);
      const col = i % config.racksPerRow;
      const code = genRackCode(i);
      const rackId = `rack-${i}`;

      const savedPos = savedPosMap.get(code);
      
      let x: number, z: number, rotation: number;

      if (savedPos) {
        x = savedPos.x;
        z = savedPos.z;
        rotation = savedPos.rotation;
      } else {
        z = (row - config.rows / 2 + 0.5) * (config.aisleWidth + config.rackDepth + 0.1) + config.aisleWidth / 2;
        const side = config.racksPerRow / 2;
        const totalWidth = side * spacing;
        x = col < side
          ? -totalWidth + (col + 0.5) * spacing
          : (col - side + 0.5) * spacing;
        rotation = 0;
      }

      data.push({
        id: rackId,
        loc: code,
        rackCode: code,
        stockByLevel: stockByRack.get(code) || new Map(),
        x,
        z,
        rotation
      });
    }
    return data;
  }, [config.rows, config.racksPerRow, config.bayWidth, config.aisleWidth, config.rackDepth, stockByRack]);

  // Initialisation une seule fois au chargement des savedPositions
  useEffect(() => {
    if (initializedRef.current && savedPositions.length === 0) return;
    
    const d = generateRacks(savedPositionsRef.current);
    setRackData(d);
    setOrigRackData(d);
    initializedRef.current = true;
  }, [generateRacks, savedPositions.length]);

  // Mise à jour du stock sans régénérer les positions
  useEffect(() => {
    if (!initializedRef.current) return;
    
    setRackData(prev => prev.map(rack => ({
      ...rack,
      stockByLevel: stockByRack.get(rack.rackCode) || new Map()
    })));
  }, [stockByRack]);

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

  const confirm = useCallback(async () => {
    const positions: RackPosition[] = rackData.map(r => ({
      id: r.id,
      rackCode: r.rackCode,
      x: r.x,
      z: r.z,
      rotation: r.rotation
    }));

    if (onSave) {
      const success = await onSave(positions);
      if (!success) return;
    }

    setOrigRackData([...rackData]);
    setSelectedRackId(null);
    setSelectedLoc(null);
    setHistory([]);
  }, [rackData, onSave]);

  const cancel = useCallback(() => {
    setRackData([...origRackData]);
    setSelectedRackId(null);
    setSelectedLoc(null);
    setHistory([]);
  }, [origRackData]);

  useEffect(() => {
    if (!isEditMode) setSelectedRackId(null);
  }, [isEditMode]);

  // Keyboard shortcuts avec refs pour éviter les re-bindings
  const moveRackRef = useRef(moveRack);
  const rotateRackRef = useRef(rotateRack);
  const undoRef = useRef(undo);
  const confirmRef = useRef(confirm);
  const cancelRef = useRef(cancel);

  useEffect(() => {
    moveRackRef.current = moveRack;
    rotateRackRef.current = rotateRack;
    undoRef.current = undo;
    confirmRef.current = confirm;
    cancelRef.current = cancel;
  }, [moveRack, rotateRack, undo, confirm, cancel]);

  useEffect(() => {
    if (!isEditMode || !selectedRackId) return;
    
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); moveRackRef.current('up'); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveRackRef.current('down'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); moveRackRef.current('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveRackRef.current('right'); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateRackRef.current(); }
      else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undoRef.current(); }
      else if (e.key === 'Enter') { e.preventDefault(); confirmRef.current(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelRef.current(); }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditMode, selectedRackId]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(rackData) !== JSON.stringify(origRackData);
  }, [rackData, origRackData]);

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
    setOrigRackData,
    hasChanges
  };
};