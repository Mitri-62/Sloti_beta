import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Maximize2, RotateCcw, ZoomIn, ZoomOut, Info, X, Eye } from 'lucide-react';

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  emplacement_prenant?: string | null;
  type: string;
  lot?: string | null;
  expiration_date?: string | null;
}

interface Warehouse3DViewProps {
  items: StockItem[];
}

export default function Warehouse3DView({ items }: Warehouse3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<StockItem[] | null>(null);
  const [hoveredRack, setHoveredRack] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  const mouseRef = useRef({ x: 0, y: 0, isDragging: false, lastX: 0, lastY: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });

  // Groupement par emplacement
  const groupedByLocation = items.reduce((acc, item) => {
    const location = item.emplacement_prenant || 'Non défini';
    if (!acc[location]) acc[location] = [];
    acc[location].push(item);
    return acc;
  }, {} as Record<string, StockItem[]>);

  // Couleurs par niveau de stock
  const getStockColor = (quantity: number) => {
    if (quantity === 0) return 0xef4444; // Rouge
    if (quantity < 10) return 0xf59e0b; // Orange
    if (quantity < 50) return 0x3b82f6; // Bleu
    return 0x10b981; // Vert
  };

  // Construction des racks avec étiquettes
  const createRack = (scene: THREE.Scene, x: number, z: number, location: string, items: StockItem[]) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const isHovered = hoveredRack === location;
    const stockColor = getStockColor(totalQty);

    // Structure métallique principale
    const frameColor = isHovered ? 0xfbbf24 : 0x64748b;
    const frameMaterial = new THREE.MeshStandardMaterial({ 
      color: frameColor, 
      metalness: 0.7, 
      roughness: 0.3 
    });

    // Montants verticaux
    const poleGeometry = new THREE.BoxGeometry(0.1, 3, 0.1);
    const poles = [
      [-1.5, 1.5, -0.75], [1.5, 1.5, -0.75],
      [-1.5, 1.5, 0.75], [1.5, 1.5, 0.75]
    ];
    poles.forEach(([x, y, z]) => {
      const pole = new THREE.Mesh(poleGeometry, frameMaterial);
      pole.position.set(x, y, z);
      pole.castShadow = true;
      group.add(pole);
    });

    // Traverses horizontales (3 niveaux)
    for (let level = 0; level < 3; level++) {
      const y = 0.5 + level * 1;
      
      // Traverses avant-arrière
      [-0.75, 0.75].forEach(z => {
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(3, 0.08, 0.08),
          frameMaterial
        );
        beam.position.set(0, y, z);
        group.add(beam);
      });

      // Traverses latérales
      [-1.5, 1.5].forEach(x => {
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, 1.5),
          frameMaterial
        );
        beam.position.set(x, y, 0);
        group.add(beam);
      });

      // Plateaux de stockage avec couleur selon niveau
      const shelfMaterial = new THREE.MeshStandardMaterial({ 
        color: stockColor,
        metalness: 0.3,
        roughness: 0.7,
        emissive: stockColor,
        emissiveIntensity: isHovered ? 0.3 : 0.1
      });
      
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.05, 1.4),
        shelfMaterial
      );
      shelf.position.set(0, y, 0);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      group.add(shelf);

      // Boîtes représentant les articles
      if (level < items.length) {
        const boxCount = Math.min(3, Math.ceil(items[level].quantity / 10));
        for (let b = 0; b < boxCount; b++) {
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.4, 0.6),
            new THREE.MeshStandardMaterial({ 
              color: stockColor,
              metalness: 0.2,
              roughness: 0.8
            })
          );
          box.position.set(
            -0.8 + b * 0.8,
            y + 0.25,
            0
          );
          box.castShadow = true;
          group.add(box);
        }
      }
    }

    // Étiquette avec canvas
    if (showLabels) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Fond blanc semi-transparent
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(0, 0, 512, 256);
      
      // Bordure
      ctx.strokeStyle = isHovered ? '#f59e0b' : '#64748b';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 504, 248);
      
      // Texte emplacement
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(location, 256, 80);
      
      // Ligne séparatrice
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 110);
      ctx.lineTo(462, 110);
      ctx.stroke();
      
      // Détails stock
      ctx.font = '32px Arial';
      ctx.fillStyle = '#475569';
      ctx.fillText(`${items.length} article${items.length > 1 ? 's' : ''}`, 256, 160);
      
      ctx.font = 'bold 36px Arial';
      const color = totalQty === 0 ? '#ef4444' : totalQty < 10 ? '#f59e0b' : '#10b981';
      ctx.fillStyle = color;
      ctx.fillText(`${totalQty} unités`, 256, 210);
      
      const labelTexture = new THREE.CanvasTexture(canvas);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 1),
        new THREE.MeshBasicMaterial({ 
          map: labelTexture, 
          transparent: true,
          side: THREE.DoubleSide
        })
      );
      label.position.set(0, 3.5, 0);
      label.lookAt(0, 3.5, 10);
      group.add(label);
    }

    group.traverse(obj => (obj.userData.location = location));
    scene.add(group);
  };

  // Initialisation 3D
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    // 🟢 Fond clair pour meilleure visibilité
    scene.background = new THREE.Color(0xf0f4f8);
    scene.fog = new THREE.Fog(0xe0e7ef, 50, 120);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(30, 25, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 🟢 Éclairage amélioré
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Lumière principale directionnelle
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(20, 30, 20);
    mainLight.castShadow = true;
    mainLight.shadow.camera.left = -50;
    mainLight.shadow.camera.right = 50;
    mainLight.shadow.camera.top = 50;
    mainLight.shadow.camera.bottom = -50;
    mainLight.shadow.mapSize.set(2048, 2048);
    scene.add(mainLight);

    // Lumières d'appoint
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight1.position.set(-20, 20, -20);
    scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight2.position.set(0, 30, -30);
    scene.add(fillLight2);

    // Sol
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xdde4ed,
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grille au sol
    const gridHelper = new THREE.GridHelper(100, 20, 0x94a3b8, 0xcbd5e1);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Lignes de circulation jaunes
    const lineGeometry = new THREE.BoxGeometry(0.2, 0.02, 100);
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xfbbf24 });
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.set(i * 12, 0.02, 0);
      scene.add(line);
    }

    // Axes de repère (optionnel)
    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.position.set(-45, 0, -45);
    scene.add(axesHelper);

    // Création des racks
    const locations = Object.keys(groupedByLocation);
    const racksPerRow = 4;
    const spacingX = 12;
    const spacingZ = 14;

    locations.forEach((loc, i) => {
      const row = Math.floor(i / racksPerRow);
      const col = i % racksPerRow;
      const x = (col - racksPerRow / 2 + 0.5) * spacingX;
      const z = (row - Math.floor(locations.length / racksPerRow) / 2) * spacingZ;
      createRack(scene, x, z, loc, groupedByLocation[loc]);
    });

    // Gestion des interactions
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
      
      if (intersects.length > 0) {
        const location = intersects[0].object.userData.location;
        if (location && groupedByLocation[location]) {
          setSelectedLocation(location);
          setSelectedItems(groupedByLocation[location]);
        }
      }
    };

    const handleHover = (event: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
      
      if (intersects.length > 0) {
        const location = intersects[0].object.userData.location;
        if (location && location !== hoveredRack) {
          setHoveredRack(location);
          rendererRef.current!.domElement.style.cursor = 'pointer';
        }
      } else {
        if (hoveredRack !== null) {
          setHoveredRack(null);
          rendererRef.current!.domElement.style.cursor = 'grab';
        }
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      mouseRef.current.isDragging = true;
      mouseRef.current.lastX = event.clientX;
      mouseRef.current.lastY = event.clientY;
      if (rendererRef.current) {
        rendererRef.current.domElement.style.cursor = 'grabbing';
      }
    };

    const handleMouseMoveGlobal = (event: MouseEvent) => {
      if (mouseRef.current.isDragging) {
        const deltaX = event.clientX - mouseRef.current.lastX;
        const deltaY = event.clientY - mouseRef.current.lastY;
        rotationRef.current.y += deltaX * 0.005;
        rotationRef.current.x += deltaY * 0.005;
        rotationRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.x));
        mouseRef.current.lastX = event.clientX;
        mouseRef.current.lastY = event.clientY;
      }
    };

    const handleMouseUp = () => {
      mouseRef.current.isDragging = false;
      if (rendererRef.current) {
        rendererRef.current.domElement.style.cursor = hoveredRack ? 'pointer' : 'grab';
      }
    };

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    rendererRef.current.domElement.addEventListener('click', handleClick);
    rendererRef.current.domElement.addEventListener('mousemove', handleHover);
    rendererRef.current.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (cameraRef.current) {
        const radius = 40;
        if (autoRotate) {
          rotationRef.current.y += 0.003;
        }
        
        const camX = radius * Math.sin(rotationRef.current.y) * Math.cos(rotationRef.current.x);
        const camY = 25 + radius * Math.sin(rotationRef.current.x);
        const camZ = radius * Math.cos(rotationRef.current.y) * Math.cos(rotationRef.current.x);
        
        cameraRef.current.position.set(camX, camY, camZ);
        cameraRef.current.lookAt(0, 0, 0);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      if (rendererRef.current) {
        rendererRef.current.domElement.removeEventListener('click', handleClick);
        rendererRef.current.domElement.removeEventListener('mousemove', handleHover);
        rendererRef.current.domElement.removeEventListener('mousedown', handleMouseDown);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUp);
      if (containerRef.current && rendererRef.current?.domElement) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, [items, autoRotate, hoveredRack, showLabels]);

  // Contrôles caméra
  const resetCamera = () => {
    rotationRef.current = { x: 0, y: 0 };
  };

  const zoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.fov = Math.max(20, cameraRef.current.fov - 5);
      cameraRef.current.updateProjectionMatrix();
    }
  };

  const zoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.fov = Math.min(80, cameraRef.current.fov + 5);
      cameraRef.current.updateProjectionMatrix();
    }
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Contrôles */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-3 rounded-lg shadow-lg transition-all ${
            autoRotate 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Rotation automatique"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`p-3 rounded-lg shadow-lg transition-all ${
            showLabels 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Afficher/Masquer les étiquettes"
        >
          <Eye size={20} />
        </button>
        <button
          onClick={resetCamera}
          className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-100 text-gray-700"
          title="Réinitialiser la vue"
        >
          <Maximize2 size={20} />
        </button>
        <button
          onClick={zoomIn}
          className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-100 text-gray-700"
          title="Zoom avant"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={zoomOut}
          className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-100 text-gray-700"
          title="Zoom arrière"
        >
          <ZoomOut size={20} />
        </button>
      </div>

      {/* Infos générales */}
      <div className="absolute bottom-4 left-4 z-10 bg-white rounded-xl shadow-xl p-4 max-w-xs border border-slate-200">
        <div className="flex items-start gap-3">
          <Info className="text-blue-600 mt-1 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Vue 3D de l'entrepôt</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p><strong className="text-gray-900">{Object.keys(groupedByLocation).length}</strong> emplacements</p>
              <p><strong className="text-gray-900">{items.length}</strong> articles</p>
              <p><strong className="text-gray-900">{items.reduce((sum, item) => sum + item.quantity, 0)}</strong> unités totales</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-gray-500 italic">💡 Cliquez sur un rack pour voir les détails</p>
            </div>
          </div>
        </div>
      </div>

      {/* Légende couleurs */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-xl shadow-xl p-3 border border-slate-200">
        <p className="text-xs font-semibold text-gray-900 mb-2">Niveau de stock</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-xs text-gray-600">Vide (0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span className="text-xs text-gray-600">Faible (&lt;10)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-xs text-gray-600">Moyen (10-49)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-xs text-gray-600">Bon (≥50)</span>
          </div>
        </div>
      </div>

      {/* Canvas 3D */}
      <div ref={containerRef} className="w-full h-full" style={{ cursor: 'grab' }} />

      {/* Panneau détails de l'emplacement sélectionné */}
      {selectedLocation && selectedItems && (
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-20 bg-white rounded-xl shadow-2xl p-4 w-80 max-h-96 overflow-y-auto border border-slate-200">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{selectedLocation}</h3>
              <p className="text-sm text-gray-500">{selectedItems.length} article(s)</p>
            </div>
            <button
              onClick={() => {
                setSelectedLocation(null);
                setSelectedItems(null);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="space-y-2">
            {selectedItems.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                <div className="mt-1 space-y-1 text-xs text-gray-600">
                  <p>Quantité: <span className="font-semibold text-gray-900">{item.quantity}</span></p>
                  {item.type && <p>Type: {item.type}</p>}
                  {item.lot && <p>Lot: {item.lot}</p>}
                  {item.expiration_date && <p>Expiration: {item.expiration_date}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}