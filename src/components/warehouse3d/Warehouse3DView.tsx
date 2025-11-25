import { useEffect, useRef, useState, FC, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { RotateCcw, Maximize2, Eye, Layers, User, Move, MousePointer, Flame, FileImage } from 'lucide-react';

// Types & Config
import { Warehouse3DViewProps, CameraMode, ViewMode } from './types';
import { DEFAULT_CONFIG, getThemeColors } from './config';

// Hooks
import { useWarehouseData } from './hooks/useWarehouseData';
import { useRackEditor } from './hooks/useRackEditor';
import { useOrbitControls } from './hooks/useOrbitControls';
import { useFirstPersonControls } from './hooks/useFirstPersonControls';
import { useRackSearch } from './hooks/useRackSearch';
import { useCameraAnimation } from './hooks/useCameraAnimation';
import { useHeatmapMode } from './hooks/useHeatmapMode';

// Meshes
import { createRack } from './meshes/createRack';

// Utils
import { exportWarehousePNG } from './utils/exportPNG';

// Components
import { Btn } from './components/UIComponents';
import { Header } from './components/Header';
import { SidePanel } from './components/SidePanel';
import { EditPanel } from './components/EditPanel';
import { Minimap } from './components/Minimap';
import { SearchOverlay } from './components/SearchOverlay';
import { HeatmapLegend } from './components/HeatmapLegend';
import { FPPositionDisplay } from './components/FPPositionDisplay';

const Warehouse3DView: FC<Warehouse3DViewProps> = ({ items, onEmplacementClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const labelSpritesRef = useRef<THREE.Sprite[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef(new THREE.Clock());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseVecRef = useRef(new THREE.Vector2());

  // State
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [viewMode, setViewMode] = useState<ViewMode>('perspective');
  const [autoRotate, setAutoRotate] = useState(false);
  const [hoveredRack, setHoveredRack] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showEditGrid, setShowEditGrid] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [enableCollision, setEnableCollision] = useState(true);
  const [clickFeedback, setClickFeedback] = useState<string | null>(null);

  // Derived
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);
  const { stockByRack, stats } = useWarehouseData(items, config);

  // Editor hook
  const editor = useRackEditor({ config, stockByRack, isEditMode });
  const { rackData, selectedRackId, setSelectedRackId, selectedLoc, setSelectedLoc, getBounds } = editor;

  // Rack bounds for collision
  const rackBounds = useMemo(() => rackData.map(r => getBounds(r.x, r.z, r.rotation)), [rackData, getBounds]);

  // Camera controls
  const orbitControls = useOrbitControls({ config, viewMode, autoRotate, isEditMode });
  const fpControls = useFirstPersonControls({ cameraMode, setCameraMode, config, rackBounds, enableCollision });

  // Search hook
  const search = useRackSearch({ items, rackData });

  // Camera animation hook
  const cameraAnimation = useCameraAnimation({
    camera: cameraRef.current,
    orbitControls
  });

  // Heatmap mode
  const heatmap = useHeatmapMode({ rackData, config });

  // Effective hovered rack (search highlight OR normal hover)
  const effectiveHoveredRack = search.highlightedRackId 
    ? rackData.find(r => r.id === search.highlightedRackId)?.rackCode || null
    : hoveredRack;

  // Fly to search result
  const handleFlyToResult = useCallback((result: { rack: { x: number; z: number; id: string; rackCode: string }; item: any }) => {
    if (cameraMode === 'firstPerson') {
      fpControls.fpRef.current.position.set(result.rack.x, fpControls.fpRef.current.position.y, result.rack.z + 5);
    } else {
      cameraAnimation.flyToRack({
        position: { x: result.rack.x, z: result.rack.z },
        zoom: 0.45,
        duration: 1000,
        onComplete: () => {
          setSelectedLoc(result.rack.rackCode);
        }
      });
    }
    search.selectResult(result as any);
  }, [cameraMode, cameraAnimation, fpControls, search, setSelectedLoc]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) wrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    else document.exitFullscreen().then(() => setIsFullscreen(false));
  }, []);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // Screenshot / Export PNG
  const screenshot = useCallback(() => {
    if (!rendererRef.current) return;
    exportWarehousePNG({
      canvas: rendererRef.current.domElement,
      stats,
      config,
      title: 'Vue Entrepôt 3D',
      companyName: 'Sloti'
    });
  }, [stats, config]);

  // Reset camera
  const resetCamera = useCallback(() => {
    if (cameraMode === 'firstPerson') fpControls.resetPosition();
    else { orbitControls.reset(); setViewMode('perspective'); }
  }, [cameraMode, fpControls, orbitControls]);

  const toggleCameraMode = useCallback(() => fpControls.toggleMode(), [fpControls]);
  const selectedRack = rackData.find(r => r.id === selectedRackId);

  // === THREE.JS SETUP ===
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
    cameraRef.current = cam; // Store camera ref
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 0.8 : 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(isDark ? 0x404060 : 0xffffff, isDark ? 0.4 : 0.5));
    const sun = new THREE.DirectionalLight(isDark ? 0x8090b0 : 0xffffff, isDark ? 0.8 : 1.2);
    sun.position.set(30, 50, 30); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.near = 1; sun.shadow.camera.far = 150;
    sun.shadow.camera.left = -50; sun.shadow.camera.right = 50; sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
    scene.add(sun);

    const fSize = Math.max(config.rows * config.aisleWidth * 2.5, config.racksPerRow * config.bayWidth * 2.5) * 1.5;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(fSize, fSize), new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 0.9, metalness: 0.1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const grid = new THREE.GridHelper(fSize, Math.floor(fSize / 2), colors.grid1, colors.grid2);
    grid.position.y = 0.01; scene.add(grid);

    if (isEditMode && showEditGrid) {
      const eg = new THREE.GridHelper(fSize, Math.floor(fSize / editor.moveStep), 0x22d3ee, 0x06b6d4);
      eg.position.y = 0.02;
      const mat = eg.material;
      if (Array.isArray(mat)) {
        mat.forEach(m => { m.opacity = 0.4; m.transparent = true; });
      } else {
        mat.opacity = 0.4;
        mat.transparent = true;
      }
      scene.add(eg);
    }

    // Use effectiveHoveredRack for highlight (includes search highlight)
    rackData.forEach(r => createRack({ 
      scene, 
      rackData: r, 
      config, 
      colors, 
      isEditMode, 
      selectedRackId: search.highlightedRackId || selectedRackId, 
      hoveredRack: effectiveHoveredRack, 
      showLabels, 
      labelSprites: labelSpritesRef.current,
      heatmapColor: heatmap.getColorForRack(r.id),
      heatmapLabel: heatmap.getLabelForRack(r.id)
    }));

    const findRack = (o: THREE.Object3D | null): THREE.Group | null => { while (o) { if (o.userData.rackId) return o as THREE.Group; o = o.parent; } return null; };
    const updMouse = (e: MouseEvent | TouchEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const cx = (e as MouseEvent).clientX ?? (e as TouchEvent).touches?.[0]?.clientX;
      const cy = (e as MouseEvent).clientY ?? (e as TouchEvent).touches?.[0]?.clientY;
      if (cx != null && cy != null) { mouseVecRef.current.x = ((cx - rect.left) / rect.width) * 2 - 1; mouseVecRef.current.y = -((cy - rect.top) / rect.height) * 2 + 1; }
    };
    const raycast = () => { raycasterRef.current.setFromCamera(mouseVecRef.current, cam); return findRack(raycasterRef.current.intersectObjects(scene.children, true).find(i => i.object.userData.isRackPart && !i.object.userData.isLabel)?.object || null); };

    const onClick = (e: MouseEvent) => {
      if (cameraMode === 'firstPerson') { if (!document.pointerLockElement) renderer.domElement.requestPointerLock(); return; }
      if (!orbitControls.wasClick()) return;
      updMouse(e);
      const rg = raycast();
      if (rg?.userData.rackId) {
        const rackCode = rg.userData.location;
        if (isEditMode) { 
          if (!selectedRackId) editor.setOrigRackData([...rackData]); 
          setSelectedRackId(rg.userData.rackId); 
          setSelectedLoc(rackCode); 
        } else {
          setSelectedLoc(rackCode);
          setClickFeedback(rackCode);
          setTimeout(() => setClickFeedback(null), 1500);
        }
      } else if (!isEditMode) setSelectedLoc(null);
    };
    const onDblClick = (e: MouseEvent) => { if (cameraMode === 'firstPerson') return; updMouse(e); orbitControls.handleDoubleClick(!!raycast()); };
    const onMove = (e: MouseEvent | TouchEvent) => { if (cameraMode === 'firstPerson') return; updMouse(e); if (!orbitControls.mouseRef.current.isDragging && !orbitControls.touchRef.current.isPinching) { const rg = raycast(); setHoveredRack(rg?.userData.location || null); renderer.domElement.style.cursor = rg ? 'pointer' : 'grab'; } };
    const onDown = (e: MouseEvent | TouchEvent) => { if (cameraMode === 'firstPerson') { fpControls.handleMouseDown(e as MouseEvent); return; } orbitControls.handleMouseDown(e); renderer.domElement.style.cursor = 'grabbing'; };
    const onUp = (e?: MouseEvent | TouchEvent) => { if (cameraMode === 'firstPerson') { fpControls.handleMouseUp(e as MouseEvent); return; } orbitControls.handleMouseUp(); renderer.domElement.style.cursor = effectiveHoveredRack ? 'pointer' : 'grab'; };
    const onGlobalMove = (e: MouseEvent | TouchEvent) => { if (cameraMode === 'firstPerson') fpControls.handleMouseMove(e as MouseEvent); else orbitControls.handleMouseMove(e); };
    const onWheel = (e: WheelEvent) => orbitControls.handleWheel(e);
    const onCtxMenu = (e: MouseEvent) => { if (cameraMode === 'firstPerson') e.preventDefault(); };
    const onPtrLock = () => { fpControls.fpRef.current.isPointerLocked = !!document.pointerLockElement; renderer.domElement.style.cursor = document.pointerLockElement ? 'none' : cameraMode === 'firstPerson' ? 'crosshair' : 'grab'; };
    const onResize = () => { if (!containerRef.current) return; cam.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight; cam.updateProjectionMatrix(); renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight); };

    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('dblclick', onDblClick);
    renderer.domElement.addEventListener('mousemove', onMove);
    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('touchstart', onDown as any, { passive: false });
    renderer.domElement.addEventListener('touchmove', onMove as any, { passive: false });
    renderer.domElement.addEventListener('touchend', onUp);
    renderer.domElement.addEventListener('contextmenu', onCtxMenu);
    window.addEventListener('mousemove', onGlobalMove);
    window.addEventListener('touchmove', onGlobalMove as any, { passive: false });
    window.addEventListener('mouseup', onUp as EventListener);
    window.addEventListener('touchend', onUp as EventListener);
    window.addEventListener('resize', onResize);
    document.addEventListener('pointerlockchange', onPtrLock);

    let anim: number;
    const loop = () => {
      anim = requestAnimationFrame(loop);
      const dt = clockRef.current.getDelta();
      if (cameraMode === 'firstPerson') {
        fpControls.updateMovement(dt, cam);
        orbitControls.zoomRef.current += (orbitControls.targetZoomRef.current - orbitControls.zoomRef.current) * 0.08;
        cam.fov = 45 * orbitControls.zoomRef.current; cam.updateProjectionMatrix();
      } else orbitControls.updateCamera(cam);
      labelSpritesRef.current.forEach(s => s.lookAt(cam.position));
      renderer.render(scene, cam);
    };
    loop();

    return () => {
      cancelAnimationFrame(anim);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('dblclick', onDblClick);
      renderer.domElement.removeEventListener('mousemove', onMove);
      renderer.domElement.removeEventListener('mousedown', onDown);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('touchstart', onDown as any);
      renderer.domElement.removeEventListener('touchmove', onMove as any);
      renderer.domElement.removeEventListener('touchend', onUp);
      renderer.domElement.removeEventListener('contextmenu', onCtxMenu);
      window.removeEventListener('mousemove', onGlobalMove);
      window.removeEventListener('touchmove', onGlobalMove as any);
      window.removeEventListener('mouseup', onUp as EventListener);
      window.removeEventListener('touchend', onUp as EventListener);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerlockchange', onPtrLock);
      if (document.pointerLockElement) document.exitPointerLock();
      if (containerRef.current?.contains(renderer.domElement)) containerRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [rackData, autoRotate, effectiveHoveredRack, showLabels, config, colors, isDark, viewMode, isEditMode, selectedRackId, showEditGrid, cameraMode, editor.moveStep, orbitControls, fpControls, search.highlightedRackId, heatmap.isEnabled, heatmap.metric]);

  return (
    <div ref={wrapperRef} className={`relative h-full flex flex-col ${isDark ? 'bg-gray-900 text-slate-100' : 'bg-white text-slate-900'} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <Header cameraMode={cameraMode} stats={stats} isEditMode={isEditMode} isDark={isDark} isFullscreen={isFullscreen} onToggleCameraMode={toggleCameraMode} onToggleEditMode={() => setIsEditMode(p => !p)} onToggleDark={() => setIsDark(p => !p)} onToggleFullscreen={toggleFullscreen} />
      {cameraMode === 'firstPerson' && (
        <div className={`px-4 py-2 flex items-center gap-4 text-sm ${isDark ? 'bg-green-900/50 text-green-200' : 'bg-green-100 text-green-800'}`}>
          <User className="w-4 h-4" /><span className="font-medium">Mode First Person</span><span className="opacity-75">— Cliquez pour capturer</span>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/20">ZQSD</kbd> Déplacer</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/20">Espace</kbd> Monter</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/20">Shift</kbd> Descendre</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/20">F</kbd> Orbit</span>
            <button onClick={() => setEnableCollision(p => !p)} className={`px-2 py-1 rounded text-xs font-medium ${enableCollision ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'}`}>Collision {enableCollision ? 'ON' : 'OFF'}</button>
          </div>
        </div>
      )}
      {isEditMode && (
        <div className={`px-4 py-2 flex items-center gap-2 text-sm ${isDark ? 'bg-amber-900/50 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
          <Move className="w-4 h-4" /><span className="font-medium">Mode Édition</span><span className="opacity-75">— Cliquez sur un rack ou modifiez la config à droite</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setShowMinimap(p => !p)} className={`px-2 py-1 rounded text-xs font-medium ${showMinimap ? 'bg-cyan-500 text-white' : isDark ? 'bg-gray-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>Minimap</button>
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 min-h-full min-w-0 relative">
          <div className="absolute top-4 left-4 z-10 space-y-2">
            <Btn icon={<RotateCcw className="w-5 h-5" />} onClick={resetCamera} title="Reset" />
            {cameraMode === 'orbit' && (<><Btn icon={<Maximize2 className="w-5 h-5" />} onClick={() => setAutoRotate(p => !p)} title="Auto-rotation" active={autoRotate} /><Btn icon={<Eye className="w-5 h-5" />} onClick={() => setViewMode(v => v === 'perspective' ? 'top' : v === 'top' ? 'front' : 'perspective')} title={`Vue: ${viewMode}`} /></>)}
            <Btn icon={<Layers className="w-5 h-5" />} onClick={() => setShowLabels(p => !p)} title="Labels" active={showLabels} />
            <Btn icon={<Flame className="w-5 h-5" />} onClick={heatmap.toggle} title="Heatmap" active={heatmap.isEnabled} variant="warning" />
            <Btn icon={<FileImage className="w-5 h-5" />} onClick={screenshot} title="Export PNG" />
          </div>

          {/* 🔍 Search Overlay */}
          {!isEditMode && cameraMode === 'orbit' && (
            <SearchOverlay
              query={search.query}
              setQuery={search.setQuery}
              results={search.results}
              selectedResult={search.selectedResult}
              onSelectResult={(r) => {
                search.selectResult(r);
                setSelectedLoc(r.rack.rackCode);
              }}
              onHoverResult={search.highlightRack}
              onClear={() => {
                search.clearSearch();
                cameraAnimation.flyToOverview();
              }}
              onFlyTo={handleFlyToResult}
              isDark={isDark}
            />
          )}

          {/* 🔥 Heatmap Legend */}
          <HeatmapLegend
            isEnabled={heatmap.isEnabled}
            metric={heatmap.metric}
            setMetric={heatmap.setMetric}
            stats={heatmap.stats}
            isDark={isDark}
          />

          {cameraMode === 'firstPerson' && (<div className="absolute inset-0 pointer-events-none flex items-center justify-center"><div className="w-6 h-6 relative"><div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/50 -translate-y-1/2" /><div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 -translate-x-1/2" /></div></div>)}
          
          {clickFeedback && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 animate-pulse">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${isDark ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
                <MousePointer className="w-4 h-4" />
                <span className="font-medium">Rack {clickFeedback}</span>
                <span className="text-blue-200">→ Détails à droite</span>
              </div>
            </div>
          )}
          {(isEditMode || cameraMode === 'firstPerson') && showMinimap && rackData.length > 0 && <Minimap rackData={rackData} selectedRackId={selectedRackId} cameraMode={cameraMode} fpPositionRef={fpControls.fpPositionRef} fpRef={fpControls.fpRef} isDark={isDark} />}
          {cameraMode === 'firstPerson' && (
            <FPPositionDisplay 
              fpRef={fpControls.fpRef} 
              fpPositionRef={fpControls.fpPositionRef} 
              isDark={isDark} 
            />
          )}
        </div>

        {/* EditPanel (mode édition) OU SidePanel (détails rack) */}
        {isEditMode ? (
          <EditPanel
            isOpen={isEditMode}
            onClose={() => setIsEditMode(false)}
            isDark={isDark}
            config={config}
            setConfig={setConfig}
            selectedLoc={selectedLoc}
            selectedRack={selectedRack}
            moveStep={editor.moveStep}
            setMoveStep={editor.setMoveStep}
            canMove={editor.canMove}
            moveRack={editor.moveRack}
            rotateRack={editor.rotateRack}
            undo={editor.undo}
            confirm={editor.confirm}
            cancel={editor.cancel}
            historyLength={editor.history.length}
            showEditGrid={showEditGrid}
            setShowEditGrid={setShowEditGrid}
          />
        ) : (
          <SidePanel 
            isConfigOpen={false} 
            selectedLoc={selectedLoc} 
            isEditMode={false} 
            isDark={isDark} 
            isFullscreen={isFullscreen} 
            config={config} 
            setConfig={setConfig} 
            enableCollision={enableCollision} 
            setEnableCollision={setEnableCollision} 
            rackData={rackData} 
            items={items}
            onClose={() => setSelectedLoc(null)} 
            onViewInTable={onEmplacementClick ? (emplacement) => {
              const rack = rackData.find(r => r.rackCode === emplacement);
              const level = rack?.stockByLevel?.size ? Math.max(...Array.from(rack.stockByLevel.keys())) : 1;
              onEmplacementClick(emplacement, level, 1);
            } : undefined}
          />
        )}
      </div>
    </div>
  );
};

export default Warehouse3DView;
export type { Warehouse3DViewProps, StockItem } from './types';