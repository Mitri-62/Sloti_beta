import { useEffect, useRef, useState, FC, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Maximize2, RotateCcw, X, Eye, Truck, Package, Settings, Grid, Ruler, Sun, Moon, Layers, Maximize, Minimize, Download, Edit, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Move, Check, RotateCw, AlertTriangle, User, Orbit } from 'lucide-react';

// --- Types Exportés ---
export interface StockItem {
  id: string;
  ean: string;
  name: string;
  designation?: string | null;
  quantity: number;
  type?: string | null;
  lot?: string | null;
  expiration_date?: string | null;
  emplacement_prenant?: string | null;
  company_id?: string;
  tus?: 'EUR' | 'CHEP' | string | null;
}

export interface Warehouse3DViewProps {
  items: StockItem[];
  onEmplacementClick?: (emplacement: string, level: number, position: number) => void;
}

// --- Types Internes ---
interface ParsedLocation { rackCode: string; level: number; position: number; }
interface SlotStock { 
  rackCode: string; 
  level: number; 
  position: number; 
  items: StockItem[]; 
  totalQuantity: number; 
  tus: 'EUR' | 'CHEP' | null;
  positionsUsed: number;
}
interface AlveoleStock {
  rackCode: string;
  level: number;
  slots: Map<number, SlotStock>;
  totalPositionsUsed: number;
  isOverflow: boolean;
}
interface RackData { 
  id: string; 
  loc: string; 
  rackCode: string; 
  stockByLevel: Map<number, AlveoleStock>; 
  x: number; 
  z: number; 
  rotation: number; 
}

// --- Configuration ---
const DEFAULT_CONFIG = { rows: 3, racksPerRow: 4, aisleWidth: 6.0, rackHeight: 7, rackDepth: 1.4, bayWidth: 4.0, levelCount: 3 };
const MAX_POSITIONS = 4;

// Dimensions palettes
const PALLET_CONFIG = {
  EUR: { positions: 1, maxPerAlveole: 4, w: 0.8, d: 1.2, h: 0.144, color: 0xcd853f, name: 'Europe' },
  CHEP: { positions: 1, maxPerAlveole: 3, w: 1.0, d: 1.2, h: 0.144, color: 0x0066cc, name: 'CHEP' }
};

const RACK_W = DEFAULT_CONFIG.bayWidth + 0.1;
const RACK_D = DEFAULT_CONFIG.rackDepth + 0.1;

// --- First Person Config ---
const FP_CONFIG = {
  eyeHeight: 1.70,        // Hauteur des yeux (m)
  moveSpeed: 5.0,         // Vitesse normale (m/s)
  sprintMultiplier: 2.0,  // Multiplicateur sprint
  mouseSensitivity: 0.002,
  collisionRadius: 0.4,   // Rayon de collision
  minPitch: -Math.PI / 3, // Limite regard bas (-60°)
  maxPitch: Math.PI / 3,  // Limite regard haut (+60°)
};

// --- Utilitaires ---
const genRackCode = (i: number): string => { 
  let c = '', n = i; 
  do { c = String.fromCharCode(65 + (n % 26)) + c; n = Math.floor(n / 26) - 1; } while (n >= 0); 
  return c; 
};

const parseEmplacement = (e: string | null | undefined): ParsedLocation | null => {
  if (!e) return null;
  let m = e.match(/^([A-Za-z]+)[-._\/](\d+)[-._\/](\d+)$/);
  if (m) return { rackCode: m[1].toUpperCase(), level: +m[2], position: +m[3] };
  m = e.match(/^([A-Za-z]+)(\d+)$/);
  if (m) return { rackCode: m[1].toUpperCase(), level: +m[2], position: 1 };
  m = e.match(/^([A-Za-z]+)$/);
  if (m) return { rackCode: m[1].toUpperCase(), level: 1, position: 1 };
  return null;
};

const normalizeTus = (tus: string | null | undefined): 'EUR' | 'CHEP' | null => {
  if (!tus) return null;
  const upper = tus.toUpperCase().trim();
  if (upper === 'EUR' || upper === 'EURO' || upper === 'EUROPE' || upper === 'EPAL' || upper === 'FEU') return 'EUR';
  if (upper === 'CHEP' || upper === 'CP' || upper === 'FCH') return 'CHEP';
  if (upper === 'CAR' || upper === 'BAC') return 'EUR';
  return null;
};

const getPositionsUsed = (tus: 'EUR' | 'CHEP' | null): number => 1;

const checkAlveoleOverflow = (slots: Map<number, SlotStock>): boolean => {
  let eurCount = 0, chepCount = 0;
  slots.forEach(slot => { if (slot.tus === 'CHEP') chepCount++; else eurCount++; });
  return (eurCount * 80) + (chepCount * 100) > 330;
};

// --- Composants UI ---
const Btn: FC<{ icon: React.ReactNode; onClick: () => void; title: string; active?: boolean; variant?: string }> = ({ icon, onClick, title, active, variant }) => (
  <button onClick={onClick} title={title} className={`p-2 rounded-lg shadow-sm transition-all ${variant === 'warning' && active ? 'bg-amber-500 text-white' : variant === 'success' && active ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200'}`}>{icon}</button>
);

const Slider: FC<{ label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }> = ({ label, value, min, max, step = 1, onChange, unit = '' }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}: <span className="font-semibold text-blue-500">{value}{unit}</span></label>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer dark:bg-slate-700" />
  </div>
);

// --- Composant Principal ---
const Warehouse3DView: FC<Warehouse3DViewProps> = ({ items }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelSpritesRef = useRef<THREE.Sprite[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // ✅ Mode caméra
  const [cameraMode, setCameraMode] = useState<'orbit' | 'firstPerson'>('orbit');
  
  // ✅ Contrôles Orbit
  const mouseRef = useRef({ 
    isDragging: false, 
    button: 0,
    lastX: 0, 
    lastY: 0, 
    deltaX: 0, 
    deltaY: 0,
    velocityX: 0,
    velocityY: 0,
    lastMoveTime: 0
  });
  const rotationRef = useRef({ x: 0.3, y: 0.8 });
  const targetRotationRef = useRef({ x: 0.3, y: 0.8 });
  const zoomRef = useRef(1);
  const targetZoomRef = useRef(1);
  const touchRef = useRef({ lastDistance: 0, isPinching: false });
  
  // ✅ Contrôles First Person
  const fpRef = useRef({
    position: new THREE.Vector3(0, FP_CONFIG.eyeHeight, 15),
    yaw: Math.PI,    // Rotation horizontale (regard vers -Z au départ)
    pitch: 0,        // Rotation verticale
    velocity: new THREE.Vector3(),
    isPointerLocked: false,
  });
  const keysRef = useRef({
    forward: false,  // Z ou W
    backward: false, // S
    left: false,     // Q ou A
    right: false,    // D
    up: false,       // Space
    down: false,     // Shift (descendre) ou Ctrl
    sprint: false,   // Shift
  });
  
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseVecRef = useRef(new THREE.Vector2());
  const clockRef = useRef(new THREE.Clock());
  const rackBoundsRef = useRef<{ minX: number; maxX: number; minZ: number; maxZ: number }[]>([]);

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [hoveredRack, setHoveredRack] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [viewMode, setViewMode] = useState<'perspective' | 'top' | 'front'>('perspective');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [rackData, setRackData] = useState<RackData[]>([]);
  const [origRackData, setOrigRackData] = useState<RackData[]>([]);
  const [moveStep, setMoveStep] = useState(1);
  const [showEditGrid, setShowEditGrid] = useState(true);
  const [history, setHistory] = useState<RackData[][]>([]);
  const [showMinimap, setShowMinimap] = useState(true);
  const [enableCollision, setEnableCollision] = useState(true);
  const [fpPosition, setFpPosition] = useState({ x: 0, z: 15 }); // Pour minimap

  const colors = useMemo(() => ({
    bg: isDark ? 0x1a1a2e : 0xf8fafc, floor: isDark ? 0x2d2d44 : 0xe2e8f0, fog: isDark ? 0x1a1a2e : 0xf1f5f9,
    rack: isDark ? 0x60a5fa : 0x3b82f6, beam: isDark ? 0xfbbf24 : 0xf59e0b, grid1: isDark ? 0x4a4a6a : 0x94a3b8, grid2: isDark ? 0x3a3a5a : 0xcbd5e1
  }), [isDark]);

  // Grouper stock par rack/niveau
  const stockByRack = useMemo(() => {
    const res = new Map<string, Map<number, AlveoleStock>>();
    items.forEach(item => {
      const p = parseEmplacement(item.emplacement_prenant);
      if (!p) return;
      const tus = normalizeTus(item.tus);
      const positionsUsed = getPositionsUsed(tus);
      if (!res.has(p.rackCode)) res.set(p.rackCode, new Map());
      const rm = res.get(p.rackCode)!;
      if (!rm.has(p.level)) {
        rm.set(p.level, { rackCode: p.rackCode, level: p.level, slots: new Map(), totalPositionsUsed: 0, isOverflow: false });
      }
      const alveole = rm.get(p.level)!;
      if (!alveole.slots.has(p.position)) {
        alveole.slots.set(p.position, { rackCode: p.rackCode, level: p.level, position: p.position, items: [], totalQuantity: 0, tus, positionsUsed });
      }
      const slot = alveole.slots.get(p.position)!;
      slot.items.push(item);
      slot.totalQuantity += item.quantity;
      if (!slot.tus && tus) { slot.tus = tus; slot.positionsUsed = positionsUsed; }
    });
    res.forEach(levels => {
      levels.forEach(alveole => {
        let totalPos = 0;
        alveole.slots.forEach(slot => { totalPos += slot.positionsUsed; });
        alveole.totalPositionsUsed = totalPos;
        alveole.isOverflow = checkAlveoleOverflow(alveole.slots);
      });
    });
    return res;
  }, [items]);

  // Stats
  const stats = useMemo(() => {
    let totalQty = 0, eurCount = 0, chepCount = 0, overflowCount = 0;
    items.forEach(i => totalQty += i.quantity);
    stockByRack.forEach(levels => {
      levels.forEach(alveole => {
        if (alveole.isOverflow) overflowCount++;
        alveole.slots.forEach(slot => { if (slot.tus === 'CHEP') chepCount++; else eurCount++; });
      });
    });
    const totalSlots = config.rows * config.racksPerRow * config.levelCount * MAX_POSITIONS;
    let occupied = 0;
    stockByRack.forEach(lm => lm.forEach(alv => occupied += alv.slots.size));
    return { totalQty, occupied, empty: totalSlots - occupied, total: totalSlots, eurCount, chepCount, overflowCount };
  }, [items, stockByRack, config]);

  // Collision helpers
  const getBounds = useCallback((x: number, z: number, rot: number) => {
    const isRot = Math.abs(rot % Math.PI) > 0.1;
    const w = isRot ? RACK_D : RACK_W, d = isRot ? RACK_W : RACK_D;
    return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
  }, []);

  const hasCollision = useCallback((id: string, x: number, z: number, rot: number, data: RackData[]) => {
    const b = getBounds(x, z, rot);
    b.minX -= 0.1; b.maxX += 0.1; b.minZ -= 0.1; b.maxZ += 0.1;
    return data.some(r => r.id !== id && (() => { const o = getBounds(r.x, r.z, r.rotation); return b.minX < o.maxX && b.maxX > o.minX && b.minZ < o.maxZ && b.maxZ > o.minZ; })());
  }, [getBounds]);

  // ✅ Collision First Person avec les racks
  const checkFPCollision = useCallback((newX: number, newZ: number): boolean => {
    if (!enableCollision) return false;
    const r = FP_CONFIG.collisionRadius;
    for (const bounds of rackBoundsRef.current) {
      const closestX = Math.max(bounds.minX, Math.min(newX, bounds.maxX));
      const closestZ = Math.max(bounds.minZ, Math.min(newZ, bounds.maxZ));
      const dx = newX - closestX;
      const dz = newZ - closestZ;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }, [enableCollision]);

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
    const d = { up: [0, -moveStep], down: [0, moveStep], left: [-moveStep, 0], right: [moveStep, 0] }[dir];
    setRackData(prev => {
      const next = prev.map(r => r.id !== selectedRackId ? r : (() => { const nx = r.x + d[0], nz = r.z + d[1]; return hasCollision(selectedRackId, nx, nz, r.rotation, prev) ? r : { ...r, x: nx, z: nz }; })());
      if (JSON.stringify(next) !== JSON.stringify(prev)) setHistory(h => [...h.slice(-19), prev]);
      return next;
    });
  }, [selectedRackId, moveStep, hasCollision]);

  const rotateRack = useCallback(() => {
    if (!selectedRackId) return;
    setRackData(prev => {
      const next = prev.map(r => r.id !== selectedRackId ? r : (() => { const nr = (r.rotation + Math.PI / 2) % (Math.PI * 2); return hasCollision(selectedRackId, r.x, r.z, nr, prev) ? r : { ...r, rotation: nr }; })());
      if (JSON.stringify(next) !== JSON.stringify(prev)) setHistory(h => [...h.slice(-19), prev]);
      return next;
    });
  }, [selectedRackId, hasCollision]);

  const undo = useCallback(() => { if (history.length) { setRackData(history[history.length - 1]); setHistory(h => h.slice(0, -1)); } }, [history]);
  const confirm = useCallback(() => { setOrigRackData([...rackData]); setSelectedRackId(null); setSelectedLoc(null); setHistory([]); }, [rackData]);
  const cancel = useCallback(() => { setRackData([...origRackData]); setSelectedRackId(null); setSelectedLoc(null); setHistory([]); }, [origRackData]);

  // Keyboard pour mode édition
  useEffect(() => {
    if (!isEditMode || !selectedRackId) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); moveRack('up'); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveRack('down'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); moveRack('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveRack('right'); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateRack(); }
      else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
      else if (e.key === 'Enter') { e.preventDefault(); confirm(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isEditMode, selectedRackId, moveRack, rotateRack, undo, confirm, cancel]);

  // ✅ Keyboard pour First Person (ZQSD/WASD)
  useEffect(() => {
    if (cameraMode !== 'firstPerson') return;
    
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.code) {
        case 'KeyW': case 'KeyZ': keysRef.current.forward = true; break;
        case 'KeyS': keysRef.current.backward = true; break;
        case 'KeyA': case 'KeyQ': keysRef.current.left = true; break;
        case 'KeyD': keysRef.current.right = true; break;
        case 'Space': e.preventDefault(); keysRef.current.up = true; break; // Monter
        case 'ShiftLeft': case 'ShiftRight': keysRef.current.down = true; break; // Descendre
        case 'KeyF': 
          if (document.pointerLockElement) document.exitPointerLock();
          setCameraMode('orbit'); 
          break;
        // ✅ Tab pour libérer/capturer la souris sans quitter le fullscreen
        case 'Tab':
          e.preventDefault();
          if (document.pointerLockElement) {
            document.exitPointerLock();
          } else if (containerRef.current) {
            containerRef.current.querySelector('canvas')?.requestPointerLock();
          }
          break;
      }
    };
    
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'KeyZ': keysRef.current.forward = false; break;
        case 'KeyS': keysRef.current.backward = false; break;
        case 'KeyA': case 'KeyQ': keysRef.current.left = false; break;
        case 'KeyD': keysRef.current.right = false; break;
        case 'Space': keysRef.current.up = false; break;
        case 'ShiftLeft': case 'ShiftRight': keysRef.current.down = false; break;
      }
    };
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      // Reset keys
      Object.keys(keysRef.current).forEach(k => (keysRef.current as any)[k] = false);
    };
  }, [cameraMode]);

  // Generate racks
  const genRacks = useCallback((curr: RackData[]) => {
    if (curr.length === config.rows * config.racksPerRow) {
      return curr.map(r => ({ ...r, stockByLevel: stockByRack.get(r.rackCode) || new Map() }));
    }
    const data: RackData[] = [];
    // ✅ Spacing dynamique basé sur la largeur de baie actuelle
    const rackWidth = config.bayWidth + 0.1;
    const spacing = rackWidth + 0.3; // Juste un petit gap de 30cm entre racks
    
    for (let i = 0; i < config.rows * config.racksPerRow; i++) {
      const row = Math.floor(i / config.racksPerRow), col = i % config.racksPerRow;
      const code = genRackCode(i);
      const z = (row - config.rows / 2 + 0.5) * (config.aisleWidth + config.rackDepth + 0.1) + config.aisleWidth / 2;
      const side = config.racksPerRow / 2;
      // ✅ Position X basée sur le spacing dynamique
      const totalWidth = side * spacing;
      const x = col < side 
        ? -totalWidth + (col + 0.5) * spacing 
        : (col - side + 0.5) * spacing;
      data.push({ id: `rack-${i}`, loc: code, rackCode: code, stockByLevel: stockByRack.get(code) || new Map(), x, z, rotation: 0 });
    }
    return data;
  }, [config, stockByRack]);

  useEffect(() => {
    // ✅ Forcer la régénération complète quand la config change
    const d = genRacks([]);
    setRackData(d);
    setOrigRackData(d);
    // Update collision bounds
    rackBoundsRef.current = d.map(r => getBounds(r.x, r.z, r.rotation));
  }, [config.rows, config.racksPerRow, config.bayWidth, config.aisleWidth, config.rackDepth, stockByRack]);

  // Update bounds when rack data changes
  useEffect(() => {
    rackBoundsRef.current = rackData.map(r => getBounds(r.x, r.z, r.rotation));
  }, [rackData, getBounds]);

  const getColor = (q: number) => q === 0 ? 0xef4444 : q < 10 ? 0xf59e0b : q < 50 ? 0x3b82f6 : 0x10b981;

  // Create pallet mesh
  const createPallet = useCallback((tus: 'EUR' | 'CHEP' | null) => {
    const cfg = tus === 'CHEP' ? PALLET_CONFIG.CHEP : PALLET_CONFIG.EUR;
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: cfg.color, metalness: 0.1, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const pw = cfg.w / 5 - 0.02;
      const p = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.02, cfg.d), mat);
      p.position.set(-cfg.w / 2 + pw / 2 + i * (cfg.w / 5) + 0.01, cfg.h, 0);
      p.castShadow = true;
      g.add(p);
    }
    const bg = new THREE.BoxGeometry(0.1, cfg.h - 0.02, 0.1);
    const positions = [
      [-cfg.w / 2 + 0.08, cfg.h / 2, -cfg.d / 2 + 0.08], [-cfg.w / 2 + 0.08, cfg.h / 2, cfg.d / 2 - 0.08],
      [0, cfg.h / 2, -cfg.d / 2 + 0.08], [0, cfg.h / 2, cfg.d / 2 - 0.08],
      [cfg.w / 2 - 0.08, cfg.h / 2, -cfg.d / 2 + 0.08], [cfg.w / 2 - 0.08, cfg.h / 2, cfg.d / 2 - 0.08]
    ];
    positions.forEach(([x, y, z]) => { const b = new THREE.Mesh(bg, mat); b.position.set(x, y, z); b.castShadow = true; g.add(b); });
    const sg = new THREE.BoxGeometry(cfg.w, 0.025, 0.08);
    [-cfg.d / 2 + 0.08, 0, cfg.d / 2 - 0.08].forEach(z => { const s = new THREE.Mesh(sg, mat); s.position.set(0, 0.015, z); s.castShadow = true; g.add(s); });
    if (tus === 'CHEP') {
      const logoMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.9 });
      const logo = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.005, 0.1), logoMat);
      logo.position.set(0, cfg.h + 0.01, cfg.d / 2 - 0.2);
      g.add(logo);
    }
    return g;
  }, []);

  // Create rack mesh
  const createRack = useCallback((scene: THREE.Scene, rd: RackData, cfg: typeof DEFAULT_CONFIG, cols: typeof colors, editMode: boolean, selId: string | null) => {
    const { rackCode, stockByLevel, id, rotation } = rd;
    const { rackHeight, rackDepth, bayWidth, levelCount } = cfg;
    const g = new THREE.Group();
    g.position.set(rd.x, 0, rd.z);
    g.rotation.y = rotation;
    g.userData = { rackId: id, location: rackCode, isRack: true };

    let totalQty = 0, hasOverflow = false;
    stockByLevel.forEach(alv => { if (alv.isOverflow) hasOverflow = true; alv.slots.forEach(s => totalQty += s.totalQuantity); });

    const isHov = hoveredRack === rackCode, isSel = selId === id;
    const frameMat = new THREE.MeshStandardMaterial({ 
      color: hasOverflow ? 0xef4444 : (isSel ? 0x22c55e : cols.rack), metalness: 0.8, roughness: 0.2, 
      emissive: isSel ? 0x22c55e : (isHov && editMode ? 0x60a5fa : (hasOverflow ? 0xef4444 : 0)), 
      emissiveIntensity: isSel ? 0.5 : (isHov && editMode ? 0.3 : (hasOverflow ? 0.3 : 0)) 
    });

    [-bayWidth / 2, bayWidth / 2].forEach(px => [-rackDepth / 2 + 0.04, rackDepth / 2 - 0.04].forEach(pz => {
      const u = new THREE.Mesh(new THREE.BoxGeometry(0.08, rackHeight, 0.08), frameMat);
      u.position.set(px, rackHeight / 2, pz); u.castShadow = true; g.add(u);
    }));

    const lvlH = (rackHeight - 0.3) / levelCount;
    for (let lv = 1; lv <= levelCount; lv++) {
      const y = 0.3 + lvlH * (lv - 1);
      const alveole = stockByLevel.get(lv);
      const beamColor = alveole?.isOverflow ? 0xef4444 : (isSel ? 0x16a34a : cols.beam);
      [-rackDepth / 2 + 0.06, rackDepth / 2 - 0.06].forEach(bz => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(bayWidth - 0.1, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: beamColor, metalness: 0.7, roughness: 0.3 }));
        b.position.set(0, y, bz); b.castShadow = true; g.add(b);
      });
      const deckColor = alveole?.isOverflow ? 0xef4444 : 0x6b7280;
      const dk = new THREE.Mesh(new THREE.PlaneGeometry(bayWidth - 0.15, rackDepth - 0.12), new THREE.MeshStandardMaterial({ color: deckColor, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
      dk.rotation.x = -Math.PI / 2; dk.position.set(0, y + 0.06, 0); dk.receiveShadow = true; g.add(dk);

      const lc = document.createElement('canvas'); lc.width = 64; lc.height = 64;
      const lx = lc.getContext('2d')!;
      lx.fillStyle = alveole?.isOverflow ? '#ef4444' : '#3b82f6';
      lx.beginPath(); lx.arc(32, 32, 28, 0, Math.PI * 2); lx.fill();
      lx.fillStyle = '#fff'; lx.font = 'bold 36px Arial'; lx.textAlign = 'center'; lx.textBaseline = 'middle';
      lx.fillText(String(lv), 32, 34);
      const lt = new THREE.CanvasTexture(lc);
      const ls = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, transparent: true }));
      ls.position.set(-bayWidth / 2 - 0.3, y + lvlH / 2, 0); ls.scale.set(0.5, 0.5, 1); g.add(ls);

      if (alveole && alveole.slots.size > 0) {
        const sortedSlots = Array.from(alveole.slots.values()).sort((a, b) => a.position - b.position);
        let currentX = -bayWidth / 2 + 0.2;
        sortedSlots.forEach(slot => {
          const pCfg = slot.tus === 'CHEP' ? PALLET_CONFIG.CHEP : PALLET_CONFIG.EUR;
          const posX = currentX + pCfg.w / 2;
          if (slot.totalQuantity > 0) {
            const pal = createPallet(slot.tus); pal.position.set(posX, y + 0.07, 0); g.add(pal);
            const maxH = lvlH - pCfg.h - 0.25;
            const h = Math.max(0.15, maxH * Math.min(1, slot.totalQuantity / 100));
            const boxColor = alveole.isOverflow ? 0xef4444 : getColor(slot.totalQuantity);
            const box = new THREE.Mesh(new THREE.BoxGeometry(pCfg.w * 0.9, h, pCfg.d * 0.9), new THREE.MeshStandardMaterial({ color: boxColor, metalness: 0.1, roughness: 0.9 }));
            box.position.set(posX, y + 0.07 + pCfg.h + h / 2, 0); box.castShadow = true; g.add(box);
            const qc = document.createElement('canvas'); qc.width = 128; qc.height = 80;
            const qx = qc.getContext('2d')!;
            qx.fillStyle = alveole.isOverflow ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.7)';
            qx.beginPath(); qx.roundRect(4, 4, 120, 72, 8); qx.fill();
            qx.fillStyle = '#fff'; qx.font = 'bold 22px Arial'; qx.textAlign = 'center';
            qx.fillText(`${slot.totalQuantity}`, 64, 32);
            qx.font = '12px Arial'; qx.fillStyle = slot.tus === 'CHEP' ? '#60a5fa' : '#fbbf24';
            qx.fillText(slot.tus || 'EUR', 64, 50);
            qx.fillStyle = '#9ca3af'; qx.font = '10px Arial'; qx.fillText(`Pos ${slot.position}`, 64, 66);
            const qt = new THREE.CanvasTexture(qc);
            const qs = new THREE.Sprite(new THREE.SpriteMaterial({ map: qt, transparent: true }));
            qs.position.set(posX, y + 0.07 + pCfg.h + h + 0.3, rackDepth / 2 + 0.15); qs.scale.set(0.55, 0.35, 1); g.add(qs);
          }
          currentX += pCfg.w + 0.08;
        });
        if (alveole.isOverflow) {
          const wc = document.createElement('canvas'); wc.width = 160; wc.height = 48;
          const wx = wc.getContext('2d')!;
          wx.fillStyle = '#ef4444'; wx.beginPath(); wx.roundRect(4, 4, 152, 40, 8); wx.fill();
          wx.fillStyle = '#fff'; wx.font = 'bold 14px Arial'; wx.textAlign = 'center';
          wx.fillText(`⚠ ${alveole.totalPositionsUsed}/${MAX_POSITIONS} pos.`, 80, 28);
          const wt = new THREE.CanvasTexture(wc);
          const ws = new THREE.Sprite(new THREE.SpriteMaterial({ map: wt, transparent: true }));
          ws.position.set(0, y + lvlH - 0.1, rackDepth / 2 + 0.25); ws.scale.set(0.9, 0.3, 1); g.add(ws);
        }
      }
    }

    if (showLabels) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128;
      const cx = c.getContext('2d')!;
      const gr = cx.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, hasOverflow ? '#ef4444' : (isSel ? '#22c55e' : (isHov ? '#fbbf24' : '#fff')));
      gr.addColorStop(1, hasOverflow ? '#dc2626' : (isSel ? '#16a34a' : (isHov ? '#f59e0b' : '#f1f5f9')));
      cx.beginPath(); cx.roundRect(4, 4, 248, 120, 12); cx.fillStyle = gr; cx.fill();
      cx.strokeStyle = hasOverflow ? '#b91c1c' : (isSel ? '#16a34a' : (isHov ? '#d97706' : '#94a3b8')); 
      cx.lineWidth = 3; cx.stroke();
      cx.fillStyle = hasOverflow || isSel || isHov ? '#fff' : '#1e293b'; 
      cx.font = 'bold 40px Arial'; cx.textAlign = 'center'; 
      cx.fillText(`Rack ${rackCode}`, 128, 50);
      cx.font = '16px Arial'; cx.fillStyle = hasOverflow || isSel || isHov ? '#e0e7ff' : '#64748b';
      cx.fillText(`${levelCount} niv. × ${MAX_POSITIONS} pos. | ${totalQty} u.`, 128, 85);
      if (hasOverflow) { cx.fillStyle = '#fff'; cx.fillText('⚠ DÉPASSEMENT', 128, 108); }
      else {
        const pct = Math.min(100, Math.round((totalQty / (levelCount * MAX_POSITIONS * 100)) * 100));
        cx.fillStyle = totalQty === 0 ? '#ef4444' : pct > 80 ? '#22c55e' : pct > 30 ? '#3b82f6' : '#f59e0b';
        cx.fillText(`${pct}% rempli`, 128, 108);
      }
      const t = new THREE.CanvasTexture(c);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
      sp.position.set(0, rackHeight + 0.8, 0); sp.scale.set(2.5, 1.25, 1); sp.userData.isLabel = true;
      g.add(sp); labelSpritesRef.current.push(sp);
    }

    g.traverse(o => { o.userData.location = rackCode; o.userData.isRackPart = true; o.userData.rackId = id; });
    scene.add(g);
  }, [hoveredRack, showLabels, createPallet]);

  // Three.js setup
  useEffect(() => {
    if (!containerRef.current || !rackData.length) return;
    const old = containerRef.current.querySelector('canvas');
    if (old) { containerRef.current.removeChild(old); rendererRef.current?.dispose(); }
    labelSpritesRef.current = [];
    clockRef.current.start();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.bg);
    scene.fog = new THREE.Fog(colors.fog, 40, 100);

    const cam = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 0.8 : 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lumières
    scene.add(new THREE.AmbientLight(isDark ? 0x404060 : 0xffffff, isDark ? 0.4 : 0.5));
    const sun = new THREE.DirectionalLight(isDark ? 0x8090b0 : 0xffffff, isDark ? 0.8 : 1.2);
    sun.position.set(30, 50, 30); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 150;
    sun.shadow.camera.left = -50; sun.shadow.camera.right = 50; sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
    scene.add(sun);

    // Sol
    const fSize = Math.max(config.rows * config.aisleWidth * 2.5, config.racksPerRow * config.bayWidth * 2.5) * 1.5;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(fSize, fSize), new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 0.9, metalness: 0.1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const grid = new THREE.GridHelper(fSize, Math.floor(fSize / 2), colors.grid1, colors.grid2);
    grid.position.y = 0.01; scene.add(grid);

    if (isEditMode && showEditGrid) {
      const eg = new THREE.GridHelper(fSize, Math.floor(fSize / moveStep), 0x22d3ee, 0x06b6d4);
      eg.position.y = 0.02;
      (eg.material as THREE.Material).opacity = 0.4;
      (eg.material as THREE.Material).transparent = true;
      scene.add(eg);
    }

    rackData.forEach(r => createRack(scene, r, config, colors, isEditMode, selectedRackId));

    // Events helpers
    const findRack = (o: THREE.Object3D | null): THREE.Group | null => { while (o) { if (o.userData.rackId) return o as THREE.Group; o = o.parent; } return null; };
    const updMouse = (e: MouseEvent | TouchEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const cx = (e as MouseEvent).clientX ?? (e as TouchEvent).touches?.[0]?.clientX;
      const cy = (e as MouseEvent).clientY ?? (e as TouchEvent).touches?.[0]?.clientY;
      if (cx != null && cy != null) { mouseVecRef.current.x = ((cx - rect.left) / rect.width) * 2 - 1; mouseVecRef.current.y = -((cy - rect.top) / rect.height) * 2 + 1; }
    };
    const raycast = () => { raycasterRef.current.setFromCamera(mouseVecRef.current, cam); const h = raycasterRef.current.intersectObjects(scene.children, true).find(i => i.object.userData.isRackPart && !i.object.userData.isLabel); return findRack(h?.object || null); };

    // ✅ Click handler
    const onClick = (e: MouseEvent) => { 
      if (cameraMode === 'firstPerson') {
        // En mode FP, clic = demander pointer lock
        if (!document.pointerLockElement) {
          renderer.domElement.requestPointerLock();
        }
        return;
      }
      if (Math.abs(mouseRef.current.deltaX) > 5 || Math.abs(mouseRef.current.deltaY) > 5) return; 
      updMouse(e); 
      const rg = raycast(); 
      if (rg?.userData.rackId) { 
        if (isEditMode) { 
          if (!selectedRackId) setOrigRackData([...rackData]); 
          setSelectedRackId(rg.userData.rackId); 
          setSelectedLoc(rg.userData.location); 
        } else { 
          setSelectedLoc(rg.userData.location); 
        } 
      } else if (!isEditMode) setSelectedLoc(null); 
    };
    
    const onDoubleClick = (e: MouseEvent) => {
      if (cameraMode === 'firstPerson') return;
      updMouse(e);
      const rg = raycast();
      if (rg) { targetZoomRef.current = 0.6; }
      else { targetRotationRef.current = { x: 0.3, y: 0.8 }; targetZoomRef.current = 1; }
    };
    
    const onMove = (e: MouseEvent | TouchEvent) => { 
      if (cameraMode === 'firstPerson') return;
      updMouse(e); 
      if (!mouseRef.current.isDragging && !touchRef.current.isPinching) { 
        const rg = raycast(); 
        setHoveredRack(rg?.userData.location || null); 
        renderer.domElement.style.cursor = rg ? 'pointer' : 'grab'; 
      } 
    };
    
    const onDown = (e: MouseEvent | TouchEvent) => { 
      if (cameraMode === 'firstPerson') {
        // ✅ Clic molette (button 1) = sprint en First Person
        if ((e as MouseEvent).button === 1) {
          e.preventDefault();
          keysRef.current.sprint = true;
        }
        return;
      }
      const touches = (e as TouchEvent).touches;
      if (touches?.length === 2) {
        touchRef.current.isPinching = true;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        touchRef.current.lastDistance = Math.sqrt(dx * dx + dy * dy);
        return;
      }
      if (touches?.length > 1) return; 
      updMouse(e); 
      mouseRef.current.isDragging = true;
      mouseRef.current.button = (e as MouseEvent).button || 0;
      mouseRef.current.lastX = (e as MouseEvent).clientX ?? touches[0].clientX; 
      mouseRef.current.lastY = (e as MouseEvent).clientY ?? touches[0].clientY; 
      mouseRef.current.deltaX = 0; 
      mouseRef.current.deltaY = 0;
      mouseRef.current.velocityX = 0;
      mouseRef.current.velocityY = 0;
      mouseRef.current.lastMoveTime = Date.now();
      renderer.domElement.style.cursor = 'grabbing'; 
    };
    
    const onUp = (e?: MouseEvent | TouchEvent) => { 
      // ✅ Relâcher sprint si clic molette relâché
      if (cameraMode === 'firstPerson' && (e as MouseEvent)?.button === 1) {
        keysRef.current.sprint = false;
        return;
      }
      if (cameraMode === 'firstPerson') return;
      if (mouseRef.current.isDragging) {
        targetRotationRef.current.y = rotationRef.current.y + mouseRef.current.velocityX * 5;
        targetRotationRef.current.x = Math.max(-0.5, Math.min(1.2, rotationRef.current.x + mouseRef.current.velocityY * 5));
      }
      mouseRef.current.isDragging = false; 
      touchRef.current.isPinching = false;
      renderer.domElement.style.cursor = hoveredRack ? 'pointer' : 'grab'; 
    };
    
    const onGlobalMove = (e: MouseEvent | TouchEvent) => { 
      if (cameraMode === 'firstPerson') return;
      const touches = (e as TouchEvent).touches;
      if (touchRef.current.isPinching && touches?.length === 2) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delta = distance - touchRef.current.lastDistance;
        targetZoomRef.current = Math.max(0.3, Math.min(2.5, targetZoomRef.current - delta * 0.005));
        touchRef.current.lastDistance = distance;
        return;
      }
      const cx = (e as MouseEvent).clientX ?? touches?.[0]?.clientX ?? mouseRef.current.lastX; 
      const cy = (e as MouseEvent).clientY ?? touches?.[0]?.clientY ?? mouseRef.current.lastY; 
      if (!mouseRef.current.isDragging) return; 
      const dx = cx - mouseRef.current.lastX;
      const dy = cy - mouseRef.current.lastY;
      const now = Date.now();
      const dt = Math.max(1, now - mouseRef.current.lastMoveTime);
      mouseRef.current.deltaX += Math.abs(dx); 
      mouseRef.current.deltaY += Math.abs(dy); 
      rotationRef.current.y += dx * 0.003; 
      rotationRef.current.x = Math.max(-0.5, Math.min(1.2, rotationRef.current.x + dy * 0.003)); 
      mouseRef.current.velocityX = dx / dt;
      mouseRef.current.velocityY = dy / dt;
      mouseRef.current.lastMoveTime = now;
      targetRotationRef.current.x = rotationRef.current.x;
      targetRotationRef.current.y = rotationRef.current.y;
      mouseRef.current.lastX = cx; 
      mouseRef.current.lastY = cy; 
    };
    
    const onWheel = (e: WheelEvent) => { 
      e.preventDefault();
      // ✅ Molette = zoom dans les deux modes
      const zoomDelta = e.deltaY > 0 ? 1.1 : 0.9;
      targetZoomRef.current = Math.max(0.3, Math.min(2.5, targetZoomRef.current * zoomDelta)); 
    };
    
    // ✅ First Person mouse look (pointer lock)
    const onMouseMoveFP = (e: MouseEvent) => {
      if (cameraMode !== 'firstPerson' || !document.pointerLockElement) return;
      fpRef.current.yaw -= e.movementX * FP_CONFIG.mouseSensitivity;
      fpRef.current.pitch -= e.movementY * FP_CONFIG.mouseSensitivity;
      fpRef.current.pitch = Math.max(FP_CONFIG.minPitch, Math.min(FP_CONFIG.maxPitch, fpRef.current.pitch));
    };
    
    const onPointerLockChange = () => {
      fpRef.current.isPointerLocked = !!document.pointerLockElement;
      if (document.pointerLockElement) {
        renderer.domElement.style.cursor = 'none';
      } else {
        renderer.domElement.style.cursor = cameraMode === 'firstPerson' ? 'crosshair' : 'grab';
      }
    };
    
    // ✅ Context menu (clic droit) - empêcher en mode FP
    const onContextMenu = (e: MouseEvent) => {
      if (cameraMode === 'firstPerson') {
        e.preventDefault();
      }
    };
    
    const onResize = () => { 
      if (!containerRef.current) return; 
      cam.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight; 
      cam.updateProjectionMatrix(); 
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight); 
    };

    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('dblclick', onDoubleClick);
    renderer.domElement.addEventListener('mousemove', onMove);
    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('touchstart', onDown as any, { passive: false });
    renderer.domElement.addEventListener('touchmove', onMove as any, { passive: false });
    renderer.domElement.addEventListener('touchend', onUp);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onGlobalMove);
    window.addEventListener('mousemove', onMouseMoveFP);
    window.addEventListener('touchmove', onGlobalMove as any, { passive: false });
    window.addEventListener('mouseup', onUp as EventListener);
    window.addEventListener('touchend', onUp as EventListener);
    window.addEventListener('resize', onResize);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    let anim: number;
    const loop = () => {
      anim = requestAnimationFrame(loop);
      const delta = clockRef.current.getDelta();
      
      if (cameraMode === 'firstPerson') {
        // ✅ First Person Movement
        const speed = FP_CONFIG.moveSpeed * (keysRef.current.sprint ? FP_CONFIG.sprintMultiplier : 1);
        const forward = new THREE.Vector3(
          -Math.sin(fpRef.current.yaw),
          0,
          -Math.cos(fpRef.current.yaw)
        );
        const right = new THREE.Vector3(
          Math.cos(fpRef.current.yaw),
          0,
          -Math.sin(fpRef.current.yaw)
        );
        
        let moveX = 0, moveZ = 0;
        if (keysRef.current.forward) { moveX += forward.x; moveZ += forward.z; }
        if (keysRef.current.backward) { moveX -= forward.x; moveZ -= forward.z; }
        if (keysRef.current.left) { moveX -= right.x; moveZ -= right.z; }
        if (keysRef.current.right) { moveX += right.x; moveZ += right.z; }
        
        // Normaliser si mouvement diagonal
        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (len > 0) {
          moveX = (moveX / len) * speed * delta;
          moveZ = (moveZ / len) * speed * delta;
          
          // Collision check
          const newX = fpRef.current.position.x + moveX;
          const newZ = fpRef.current.position.z + moveZ;
          
          if (!checkFPCollision(newX, fpRef.current.position.z)) {
            fpRef.current.position.x = newX;
          }
          if (!checkFPCollision(fpRef.current.position.x, newZ)) {
            fpRef.current.position.z = newZ;
          }
        }
        
        // ✅ Monter (Espace) / Descendre (Alt)
        if (keysRef.current.up) {
          fpRef.current.position.y = Math.min(15, fpRef.current.position.y + speed * delta * 0.5);
        }
        if (keysRef.current.down) {
          fpRef.current.position.y = Math.max(0.5, fpRef.current.position.y - speed * delta * 0.5);
        }
        
        // ✅ Zoom fluide en First Person (FOV)
        zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.08;
        cam.fov = 45 * zoomRef.current;
        cam.updateProjectionMatrix();
        
        // Appliquer position caméra
        cam.position.copy(fpRef.current.position);
        cam.rotation.order = 'YXZ';
        cam.rotation.y = fpRef.current.yaw;
        cam.rotation.x = fpRef.current.pitch;
        
        // Update minimap position
        setFpPosition({ x: fpRef.current.position.x, z: fpRef.current.position.z });
        
      } else {
        // ✅ Orbit Mode
        const lerpFactor = 0.08;
        if (!mouseRef.current.isDragging) {
          rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * lerpFactor;
          rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * lerpFactor;
        }
        zoomRef.current += (targetZoomRef.current - zoomRef.current) * lerpFactor;
        
        const maxD = Math.max(config.rows * config.aisleWidth, config.racksPerRow * config.bayWidth);
        const radius = maxD * 1.2 * zoomRef.current;
        if (autoRotate && !isEditMode) targetRotationRef.current.y += 0.003;
        
        let cx = 0, cy = 0, cz = 0;
        const ty = config.rackHeight / 3;
        if (viewMode === 'top') { cx = 0; cy = radius * 1.5; cz = 0.01; }
        else if (viewMode === 'front') { cx = 0; cy = maxD * 0.5; cz = radius * 1.2; }
        else { 
          cx = radius * Math.sin(rotationRef.current.y) * Math.cos(rotationRef.current.x); 
          cy = 8 + radius * 0.5 * Math.sin(rotationRef.current.x); 
          cz = radius * Math.cos(rotationRef.current.y) * Math.cos(rotationRef.current.x); 
        }
        cam.position.set(cx, cy, cz);
        cam.lookAt(0, ty, 0);
      }
      
      labelSpritesRef.current.forEach(s => s.lookAt(cam.position));
      renderer.render(scene, cam);
    };
    loop();

    return () => { 
      cancelAnimationFrame(anim); 
      renderer.domElement.removeEventListener('click', onClick); 
      renderer.domElement.removeEventListener('dblclick', onDoubleClick);
      renderer.domElement.removeEventListener('mousemove', onMove); 
      renderer.domElement.removeEventListener('mousedown', onDown); 
      renderer.domElement.removeEventListener('wheel', onWheel); 
      renderer.domElement.removeEventListener('touchstart', onDown as any); 
      renderer.domElement.removeEventListener('touchmove', onMove as any); 
      renderer.domElement.removeEventListener('touchend', onUp);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mousemove', onGlobalMove); 
      window.removeEventListener('mousemove', onMouseMoveFP);
      window.removeEventListener('touchmove', onGlobalMove as any);
      window.removeEventListener('mouseup', onUp as EventListener); 
      window.removeEventListener('touchend', onUp as EventListener);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      if (document.pointerLockElement) document.exitPointerLock();
      if (containerRef.current?.contains(renderer.domElement)) containerRef.current.removeChild(renderer.domElement); 
      renderer.dispose(); 
    };
  }, [rackData, autoRotate, hoveredRack, showLabels, config, colors, isDark, viewMode, createRack, isEditMode, selectedRackId, showEditGrid, moveStep, cameraMode, checkFPCollision]);

  const resetCam = () => { 
    if (cameraMode === 'firstPerson') {
      const maxD = Math.max(config.rows * config.aisleWidth, config.racksPerRow * config.bayWidth);
      fpRef.current.position.set(0, FP_CONFIG.eyeHeight, maxD * 0.8);
      fpRef.current.yaw = 0; // ✅ Face aux racks
      fpRef.current.pitch = 0;
    } else {
      rotationRef.current = { x: 0.3, y: 0.8 }; 
      targetRotationRef.current = { x: 0.3, y: 0.8 };
      zoomRef.current = 1; 
      targetZoomRef.current = 1;
      setViewMode('perspective');
    }
  };

  const toggleCameraMode = () => {
    if (cameraMode === 'orbit') {
      // Passer en First Person - positionné devant les racks, regardant vers eux
      const maxD = Math.max(config.rows * config.aisleWidth, config.racksPerRow * config.bayWidth);
      fpRef.current.position.set(0, FP_CONFIG.eyeHeight, maxD * 0.8);
      fpRef.current.yaw = 0; // ✅ Regarder vers les racks (vers -Z → 0, vers +Z → PI)
      fpRef.current.pitch = 0;
      setCameraMode('firstPerson');
    } else {
      // Retour Orbit
      if (document.pointerLockElement) document.exitPointerLock();
      setCameraMode('orbit');
    }
  };

  const toggleFS = useCallback(() => { 
    if (!wrapperRef.current) return; 
    if (!document.fullscreenElement) wrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true)); 
    else document.exitFullscreen().then(() => setIsFullscreen(false)); 
  }, []);
  
  useEffect(() => { 
    const h = () => setIsFullscreen(!!document.fullscreenElement); 
    document.addEventListener('fullscreenchange', h); 
    return () => document.removeEventListener('fullscreenchange', h); 
  }, []);
  
  const screenshot = useCallback(() => { 
    if (!rendererRef.current) return; 
    const link = document.createElement('a'); 
    link.download = `entrepot-${new Date().toISOString().slice(0, 10)}.png`; 
    link.href = rendererRef.current.domElement.toDataURL('image/png'); 
    link.click(); 
  }, []);
  
  useEffect(() => { if (!isEditMode) setSelectedRackId(null); }, [isEditMode]);

  const selRack = rackData.find(r => r.id === selectedRackId);

  return (
    <div ref={wrapperRef} className={`relative h-full flex flex-col ${isDark ? 'bg-gray-900 text-slate-100' : 'bg-white text-slate-900'} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <header className={`flex items-center justify-between p-3 shadow-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h1 className="text-lg font-bold flex items-center gap-2 text-blue-600"><Truck className="w-5 h-5" /> Entrepôt 3D</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${cameraMode === 'firstPerson' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
            {cameraMode === 'firstPerson' ? <User className="w-4 h-4" /> : <Orbit className="w-4 h-4" />}
            {cameraMode === 'firstPerson' ? 'First Person' : 'Orbit'}
          </div>
          <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-gray-700' : 'bg-slate-100'}`}>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#cd853f' }} /> EUR: {stats.eurCount}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#0066cc' }} /> CHEP: {stats.chepCount}</span>
            {stats.overflowCount > 0 && (
              <span className="flex items-center gap-1 text-red-500 font-medium">
                <AlertTriangle className="w-4 h-4" /> {stats.overflowCount}
              </span>
            )}
          </div>
          <Btn icon={cameraMode === 'firstPerson' ? <Orbit className="w-5 h-5" /> : <User className="w-5 h-5" />} onClick={toggleCameraMode} title={cameraMode === 'firstPerson' ? 'Mode Orbit (F)' : 'Mode First Person (F)'} active={cameraMode === 'firstPerson'} variant="success" />
          <Btn icon={<Edit className="w-5 h-5" />} onClick={() => setIsEditMode(p => !p)} title="Mode Édition" active={isEditMode} variant="warning" />
          <Btn icon={<Settings className="w-5 h-5" />} onClick={() => setIsConfigOpen(p => !p)} title="Config" active={isConfigOpen} />
          <Btn icon={isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />} onClick={() => setIsDark(p => !p)} title="Thème" />
          <Btn icon={isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />} onClick={toggleFS} title="Plein écran" />
        </div>
      </header>

      {/* First Person Controls Help */}
      {cameraMode === 'firstPerson' && (
        <div className={`px-4 py-2 flex items-center gap-4 text-sm ${isDark ? 'bg-green-900/50 text-green-200' : 'bg-green-100 text-green-800'}`}>
          <User className="w-4 h-4" />
          <span className="font-medium">Mode First Person</span>
          <span className="opacity-75">— Cliquez pour capturer la souris</span>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/20">ZQSD</kbd> Déplacer</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/20">Molette</kbd> Zoom</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/20">Espace</kbd> Monter</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/20">Shift</kbd> Descendre</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/20">Clic molette</kbd> Sprint</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/20">Tab</kbd> Libérer</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/20">F</kbd> Orbit</span>
            <button 
              onClick={() => setEnableCollision(p => !p)} 
              className={`px-2 py-1 rounded text-xs font-medium ${enableCollision ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'}`}
            >
              Collision {enableCollision ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Edit bar */}
      {isEditMode && (
        <div className={`px-4 py-2 flex items-center gap-2 text-sm ${isDark ? 'bg-amber-900/50 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
          <Move className="w-4 h-4" /><span className="font-medium">Mode Édition</span><span className="opacity-75">— Sélectionnez un rack</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setShowEditGrid(p => !p)} className={`px-2 py-1 rounded text-xs font-medium ${showEditGrid ? 'bg-cyan-500 text-white' : isDark ? 'bg-gray-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>Grille</button>
            <button onClick={() => setShowMinimap(p => !p)} className={`px-2 py-1 rounded text-xs font-medium ${showMinimap ? 'bg-cyan-500 text-white' : isDark ? 'bg-gray-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>Minimap</button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* 3D View */}
        <div ref={containerRef} className="flex-1 min-h-full min-w-0 relative">
          <div className="absolute top-4 left-4 z-10 space-y-2">
            <Btn icon={<RotateCcw className="w-5 h-5" />} onClick={resetCam} title="Reset" />
            {cameraMode === 'orbit' && (
              <>
                <Btn icon={<Maximize2 className="w-5 h-5" />} onClick={() => setAutoRotate(p => !p)} title="Auto-rotation" active={autoRotate} />
                <Btn icon={<Eye className="w-5 h-5" />} onClick={() => setViewMode(v => v === 'perspective' ? 'top' : v === 'top' ? 'front' : 'perspective')} title={`Vue: ${viewMode}`} />
              </>
            )}
            <Btn icon={<Layers className="w-5 h-5" />} onClick={() => setShowLabels(p => !p)} title="Labels" active={showLabels} />
            <Btn icon={<Download className="w-5 h-5" />} onClick={screenshot} title="Screenshot" />
          </div>

          {/* Crosshair for First Person */}
          {cameraMode === 'firstPerson' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-6 h-6 relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/50 -translate-y-1/2" />
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 -translate-x-1/2" />
              </div>
            </div>
          )}

          {/* Minimap - Now shows player position in FP mode */}
          {(isEditMode || cameraMode === 'firstPerson') && showMinimap && rackData.length > 0 && (
            <div className={`absolute top-4 right-4 z-10 rounded-lg shadow-lg border ${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-slate-200'}`}>
              <div className={`px-2 py-1 text-xs font-medium border-b ${isDark ? 'border-gray-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                Minimap {cameraMode === 'firstPerson' && <span className="text-green-500">• FP</span>}
              </div>
              <svg width={180} height={120} className="p-2">
                {rackData.map(r => {
                  const sc = 6, ox = 90, oz = 60;
                  const isSel = r.id === selectedRackId;
                  return <rect key={r.id} x={ox + r.x * sc - 12} y={oz + r.z * sc - 5} width={24} height={10} fill={isSel ? '#22c55e' : '#3b82f6'} rx={2} />;
                })}
                {/* Player position indicator in FP mode */}
                {cameraMode === 'firstPerson' && (
                  <>
                    <circle 
                      cx={90 + fpPosition.x * 6} 
                      cy={60 + fpPosition.z * 6} 
                      r={5} 
                      fill="#22c55e" 
                      stroke="#fff" 
                      strokeWidth={2}
                    />
                    {/* Direction indicator */}
                    <line 
                      x1={90 + fpPosition.x * 6} 
                      y1={60 + fpPosition.z * 6} 
                      x2={90 + fpPosition.x * 6 - Math.sin(fpRef.current.yaw) * 10} 
                      y2={60 + fpPosition.z * 6 - Math.cos(fpRef.current.yaw) * 10} 
                      stroke="#22c55e" 
                      strokeWidth={2}
                    />
                  </>
                )}
              </svg>
            </div>
          )}

          {/* FP Position indicator */}
          {cameraMode === 'firstPerson' && (
            <div className={`absolute bottom-4 left-4 z-10 px-3 py-2 rounded-lg ${isDark ? 'bg-gray-800/90' : 'bg-white/90'} shadow-lg text-sm font-mono`}>
              <div className="text-xs text-slate-500 mb-1">Position</div>
              <div>X: {fpPosition.x.toFixed(1)}m</div>
              <div>Z: {fpPosition.z.toFixed(1)}m</div>
              <div>H: {fpRef.current.position.y.toFixed(1)}m</div>
            </div>
          )}

          {/* Arrow Panel (Edit mode) */}
          {isEditMode && selectedRackId && (
            <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 ${isDark ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-sm rounded-2xl shadow-2xl border ${isDark ? 'border-gray-700' : 'border-slate-200'} p-4`}>
              <div className="flex items-center gap-4 flex-wrap justify-center">
                <div className="text-center min-w-[80px]">
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rack</div>
                  <div className="text-lg font-bold text-blue-500">{selectedLoc}</div>
                  {selRack && <div className={`text-xs font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>X:{selRack.x.toFixed(1)} Z:{selRack.z.toFixed(1)}</div>}
                </div>
                <div className={`w-px h-14 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />
                <div className="flex flex-col items-center gap-1">
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pas</div>
                  <div className="flex gap-1">{[0.5, 1, 2].map(s => <button key={s} onClick={() => setMoveStep(s)} className={`w-7 h-7 rounded text-xs font-medium ${moveStep === s ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{s}</button>)}</div>
                </div>
                <div className={`w-px h-14 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />
                <div className="flex flex-col items-center gap-1">
                  <button onClick={() => moveRack('up')} disabled={!canMove.up} className={`w-10 h-8 rounded flex items-center justify-center ${canMove.up ? 'bg-blue-500 text-white active:scale-95' : 'bg-slate-200 text-slate-400'}`}><ChevronUp className="w-5 h-5" /></button>
                  <div className="flex gap-1">
                    <button onClick={() => moveRack('left')} disabled={!canMove.left} className={`w-8 h-10 rounded flex items-center justify-center ${canMove.left ? 'bg-blue-500 text-white active:scale-95' : 'bg-slate-200 text-slate-400'}`}><ChevronLeft className="w-5 h-5" /></button>
                    <div className={`w-10 h-10 rounded flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-slate-100'}`}><Move className="w-4 h-4 text-slate-500" /></div>
                    <button onClick={() => moveRack('right')} disabled={!canMove.right} className={`w-8 h-10 rounded flex items-center justify-center ${canMove.right ? 'bg-blue-500 text-white active:scale-95' : 'bg-slate-200 text-slate-400'}`}><ChevronRight className="w-5 h-5" /></button>
                  </div>
                  <button onClick={() => moveRack('down')} disabled={!canMove.down} className={`w-10 h-8 rounded flex items-center justify-center ${canMove.down ? 'bg-blue-500 text-white active:scale-95' : 'bg-slate-200 text-slate-400'}`}><ChevronDown className="w-5 h-5" /></button>
                </div>
                <div className={`w-px h-14 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />
                <button onClick={rotateRack} disabled={!canMove.rotate} className={`w-12 h-12 rounded-xl flex items-center justify-center ${canMove.rotate ? 'bg-purple-500 text-white active:scale-95' : 'bg-slate-200 text-slate-400'}`}><RotateCw className="w-6 h-6" /></button>
                <div className={`w-px h-14 ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />
                <div className="flex gap-2">
                  <button onClick={undo} disabled={!history.length} className={`px-2 py-2 rounded-lg ${history.length ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}><RotateCcw className="w-4 h-4" /></button>
                  <button onClick={confirm} className="px-3 py-2 bg-green-500 text-white rounded-lg flex items-center gap-1"><Check className="w-4 h-4" /> OK</button>
                  <button onClick={cancel} className={`px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}><X className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className={`p-4 overflow-y-auto w-80 flex-shrink-0 max-h-full ${isConfigOpen || (selectedLoc && !isEditMode) ? 'block' : 'hidden'} ${isDark ? 'bg-gray-800' : 'bg-slate-50'} border-l ${isDark ? 'border-slate-700' : 'border-slate-200'} ${isFullscreen ? 'absolute right-0 top-0 bottom-0 z-30 shadow-2xl' : ''}`}>
          <button className={`absolute top-4 right-4 p-1 rounded-full z-10 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-slate-200 hover:bg-slate-300'}`} onClick={() => { setIsConfigOpen(false); setSelectedLoc(null); }}><X className="w-5 h-5" /></button>

          {isConfigOpen && (
            <div className="space-y-4 mt-4">
              <h2 className="text-xl font-bold text-blue-600">Configuration</h2>
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-blue-500"><Grid className="w-5 h-5" />Disposition</h3>
                <div className="space-y-3">
                  <Slider label="Rangées" value={config.rows} min={1} max={10} onChange={v => setConfig(c => ({ ...c, rows: v }))} />
                  <Slider label="Racks/rangée" value={config.racksPerRow} min={2} max={8} step={2} onChange={v => setConfig(c => ({ ...c, racksPerRow: v }))} />
                  <Slider label="Largeur allée" value={config.aisleWidth} min={3} max={10} step={0.5} onChange={v => setConfig(c => ({ ...c, aisleWidth: v }))} unit="m" />
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-blue-500"><Ruler className="w-5 h-5" />Racks</h3>
                <div className="space-y-3">
                  <Slider label="Hauteur" value={config.rackHeight} min={2} max={12} step={0.5} onChange={v => setConfig(c => ({ ...c, rackHeight: v }))} unit="m" />
                  <Slider label="Largeur baie" value={config.bayWidth} min={4} max={7} step={0.1} onChange={v => setConfig(c => ({ ...c, bayWidth: v }))} unit="m" />
                  <Slider label="Niveaux" value={config.levelCount} min={1} max={6} onChange={v => setConfig(c => ({ ...c, levelCount: v }))} />
                </div>
              </div>
              
              {/* First Person Settings */}
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-green-500"><User className="w-5 h-5" />First Person</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Collision avec racks</span>
                    <button 
                      onClick={() => setEnableCollision(p => !p)}
                      className={`px-3 py-1 rounded text-xs font-medium ${enableCollision ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'}`}
                    >
                      {enableCollision ? 'Activé' : 'Désactivé'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Touche <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-600">F</kbd> pour basculer entre les modes
                  </p>
                </div>
              </div>
              
              {/* Légende palettes */}
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-blue-500"><Package className="w-5 h-5" />Types de palettes</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 rounded bg-amber-50 dark:bg-amber-900/30">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-4 rounded" style={{ backgroundColor: '#cd853f' }} />
                      <span className="font-medium">EUR / EPAL</span>
                    </div>
                    <span className="text-slate-500">80×120cm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-blue-50 dark:bg-blue-900/30">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-4 rounded" style={{ backgroundColor: '#0066cc' }} />
                      <span className="font-medium">CHEP</span>
                    </div>
                    <span className="text-slate-500">100×120cm</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedLoc && !isConfigOpen && !isEditMode && (() => {
            const rack = rackData.find(r => r.rackCode === selectedLoc);
            if (!rack) return null;
            
            let rackEur = 0, rackChep = 0, rackOverflow = 0;
            rack.stockByLevel.forEach(alv => {
              if (alv.isOverflow) rackOverflow++;
              alv.slots.forEach(s => { if (s.tus === 'CHEP') rackChep++; else rackEur++; });
            });
            
            return (
              <div className="space-y-4 mt-4">
                <h2 className="text-xl font-bold text-blue-600">Rack {selectedLoc}</h2>
                
                {rackOverflow > 0 && (
                  <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-semibold">{rackOverflow} alvéole(s) en dépassement</span>
                    </div>
                  </div>
                )}
                
                <div className={`p-4 rounded-lg shadow ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Niveaux:</span> <span className="font-bold">{config.levelCount}</span></div>
                    <div><span className="text-slate-500">Positions:</span> <span className="font-bold">{MAX_POSITIONS}/niv.</span></div>
                    <div><span className="text-slate-500">EUR:</span> <span className="font-bold text-amber-600">{rackEur}</span></div>
                    <div><span className="text-slate-500">CHEP:</span> <span className="font-bold text-blue-600">{rackChep}</span></div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg shadow ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-green-500" />Stock par niveau</h3>
                  <div className="space-y-2">
                    {Array.from({ length: config.levelCount }, (_, i) => i + 1).map(lv => {
                      const alveole = rack.stockByLevel.get(lv);
                      let qty = 0;
                      const items: StockItem[] = [];
                      alveole?.slots.forEach(s => { qty += s.totalQuantity; items.push(...s.items); });
                      
                      return (
                        <div key={lv} className={`p-2 rounded border ${alveole?.isOverflow ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : isDark ? 'border-gray-600 bg-gray-800' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium flex items-center gap-2">
                              Niveau {lv}
                              {alveole?.isOverflow && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${qty > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {qty > 0 ? `${qty} unités` : 'Vide'}
                            </span>
                          </div>
                          
                          {alveole && (
                            <div className="mt-1 text-xs text-slate-500">
                              Positions: {alveole.totalPositionsUsed}/{MAX_POSITIONS}
                            </div>
                          )}
                          
                          {alveole && alveole.slots.size > 0 && (
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {Array.from(alveole.slots.values()).sort((a, b) => a.position - b.position).map((slot, i) => (
                                <div key={i} className={`p-1.5 rounded text-xs text-center min-w-[50px] ${slot.tus === 'CHEP' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300'}`}>
                                  <div className="font-bold">{slot.totalQuantity}</div>
                                  <div className="text-[10px] opacity-75">{slot.tus || 'EUR'}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default Warehouse3DView;