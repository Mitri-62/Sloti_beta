import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Maximize2, RotateCcw, ZoomIn, ZoomOut, Info, X } from 'lucide-react';

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
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<StockItem[] | null>(null);
  const [hoveredRack, setHoveredRack] = useState<string | null>(null);

  const mouseRef = useRef({ x: 0, y: 0, isDragging: false, lastX: 0, lastY: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });

  // Groupement par emplacement
  const groupedByLocation = items.reduce((acc, item) => {
    const location = item.emplacement_prenant || 'Non défini';
    if (!acc[location]) acc[location] = [];
    acc[location].push(item);
    return acc;
  }, {} as Record<string, StockItem[]>);

  // Couleurs par type
  const getBoxColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'type 1':
        return 0x3b82f6;
      case 'type 2':
        return 0x10b981;
      case 'type 3':
        return 0xf59e0b;
      default:
        return 0x8b5cf6;
    }
  };

  // Construction des racks industriels
  const createRack = (scene: THREE.Scene, x: number, z: number, location: string, items: StockItem[]) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const isHovered = hoveredRack === location;

    // Structure métallique principale
    const frameColor = isHovered ? 0xe67e22 : 0x2c3e50;
    const frameMaterial = new THREE.MeshStandardMaterial({ 
      color: frameColor, 
      metalness: 0.7, 
      roughness: 0.3 
    });

    // Montants verticaux (4 poteaux)
    const postGeometry = new THREE.BoxGeometry(0.2, 5, 0.2);
    const corners = [[-2, 2.5, -1.2], [2, 2.5, -1.2], [-2, 2.5, 1.2], [2, 2.5, 1.2]];
    corners.forEach(([px, py, pz]) => {
      const post = new THREE.Mesh(postGeometry, frameMaterial);
      post.position.set(px, py, pz);
      post.castShadow = true;
      group.add(post);
    });

    // Traverses horizontales
    const crossbarGeometry = new THREE.BoxGeometry(4.2, 0.1, 0.1);
    for (let i = 0; i < 4; i++) {
      const crossbar = new THREE.Mesh(crossbarGeometry, frameMaterial);
      crossbar.position.set(0, 0.8 + i * 1.2, -1.2);
      crossbar.castShadow = true;
      group.add(crossbar);
      
      const crossbar2 = new THREE.Mesh(crossbarGeometry, frameMaterial);
      crossbar2.position.set(0, 0.8 + i * 1.2, 1.2);
      crossbar2.castShadow = true;
      group.add(crossbar2);
    }

    // Diagonales de renfort
    const diagGeometry = new THREE.BoxGeometry(0.08, 2.5, 0.08);
    const diagMaterial = new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: 0.5 });
    for (let side of [-1, 1]) {
      const diag1 = new THREE.Mesh(diagGeometry, diagMaterial);
      diag1.position.set(side * 2, 2, -1.2);
      diag1.rotation.z = side * Math.PI / 6;
      group.add(diag1);
      
      const diag2 = new THREE.Mesh(diagGeometry, diagMaterial);
      diag2.position.set(side * 2, 2, 1.2);
      diag2.rotation.z = side * Math.PI / 6;
      group.add(diag2);
    }

    // Plateaux métalliques
    const shelfGeometry = new THREE.BoxGeometry(4.1, 0.08, 2.5);
    const shelfMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x7f8c8d, 
      metalness: 0.4,
      roughness: 0.6 
    });
    
    for (let i = 0; i < 4; i++) {
      const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
      shelf.position.set(0, 0.8 + i * 1.2, 0);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      group.add(shelf);
      
      // Grillage sur les plateaux
      const meshGeometry = new THREE.PlaneGeometry(4, 2.4);
      const meshMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x95a5a6, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.3 
      });
      const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, 0.85 + i * 1.2, 0);
      group.add(mesh);
    }

    // Palettes en bois et cartons
    const totalQty = items.reduce((s, it) => s + it.quantity, 0);
    const numPallets = Math.min(Math.ceil(totalQty / 50), 12);
    
    for (let i = 0; i < numPallets; i++) {
      const level = Math.floor(i / 3);
      const pos = i % 3;
      const xOffset = (pos - 1) * 1.2;

      // Palette en bois avec texture
      const palletGroup = new THREE.Group();
      const palletBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.12, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 })
      );
      palletGroup.add(palletBase);
      
      // Lattes de palette
      for (let j = 0; j < 3; j++) {
        const slat = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.04, 0.15),
          new THREE.MeshStandardMaterial({ color: 0x6b3410 })
        );
        slat.position.set(0, -0.04, (j - 1) * 0.35);
        palletGroup.add(slat);
      }
      
      palletGroup.position.set(xOffset, 0.9 + level * 1.2, 0);
      palletGroup.castShadow = true;
      group.add(palletGroup);

      // Cartons empilés
      const numBoxes = Math.min(2 + Math.floor(Math.random() * 2), 3);
      for (let b = 0; b < numBoxes; b++) {
        const boxSize = 0.7 - b * 0.05;
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(boxSize, 0.5, boxSize),
          new THREE.MeshStandardMaterial({ 
            color: getBoxColor(items[i % items.length].type),
            roughness: 0.7
          })
        );
        box.position.set(
          xOffset + (Math.random() - 0.5) * 0.1, 
          1.3 + level * 1.2 + b * 0.5, 
          (Math.random() - 0.5) * 0.1
        );
        box.rotation.y = (Math.random() - 0.5) * 0.2;
        box.castShadow = true;
        group.add(box);
        
        // Adhésif sur cartons
        const tape = new THREE.Mesh(
          new THREE.BoxGeometry(boxSize, 0.02, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xd4af37 })
        );
        tape.position.copy(box.position);
        tape.position.y += 0.25;
        group.add(tape);
      }
    }

    // Plaque d'identification du rack
    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = 512;
    plateCanvas.height = 256;
    const plateCtx = plateCanvas.getContext('2d')!;
    
    plateCtx.fillStyle = '#2c3e50';
    plateCtx.fillRect(0, 0, 512, 256);
    plateCtx.strokeStyle = '#f39c12';
    plateCtx.lineWidth = 8;
    plateCtx.strokeRect(10, 10, 492, 236);
    
    plateCtx.fillStyle = '#ffffff';
    plateCtx.font = 'bold 64px Arial';
    plateCtx.textAlign = 'center';
    plateCtx.fillText(location, 256, 100);
    
    plateCtx.font = '32px Arial';
    plateCtx.fillStyle = '#ecf0f1';
    plateCtx.fillText(`${items.length} références`, 256, 150);
    
    plateCtx.font = 'bold 36px Arial';
    plateCtx.fillStyle = '#f39c12';
    plateCtx.fillText(`${totalQty} unités`, 256, 200);
    
    const plateTexture = new THREE.CanvasTexture(plateCanvas);
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 1.25),
      new THREE.MeshBasicMaterial({ map: plateTexture })
    );
    plate.position.set(0, 5.5, -1.3);
    group.add(plate);

    // Code-barres
    const barcodeCanvas = document.createElement('canvas');
    barcodeCanvas.width = 256;
    barcodeCanvas.height = 64;
    const barcodeCtx = barcodeCanvas.getContext('2d')!;
    barcodeCtx.fillStyle = '#ffffff';
    barcodeCtx.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 40; i++) {
      barcodeCtx.fillStyle = i % 2 === 0 ? '#000000' : '#ffffff';
      barcodeCtx.fillRect(i * 6, 0, 6, 50);
    }
    barcodeCtx.fillStyle = '#000000';
    barcodeCtx.font = '10px Arial';
    barcodeCtx.textAlign = 'center';
    barcodeCtx.fillText(location.replace(/[^0-9]/g, '').padStart(12, '0'), 128, 60);
    
    const barcodeTexture = new THREE.CanvasTexture(barcodeCanvas);
    const barcode = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.25),
      new THREE.MeshBasicMaterial({ map: barcodeTexture })
    );
    barcode.position.set(0, 0.3, 1.3);
    group.add(barcode);

    group.traverse(obj => (obj.userData.location = location));
    scene.add(group);
  };

  // Initialisation 3D
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2c3e50);
    scene.fog = new THREE.Fog(0x2c3e50, 80, 150);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(35, 20, 35);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lumières - Style entrepôt industriel
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    
    // Néons industriels suspendus
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        const light = new THREE.PointLight(0xffffcc, 0.6, 25);
        light.position.set(i * 12, 12, j * 12);
        light.castShadow = true;
        light.shadow.mapSize.set(512, 512);
        scene.add(light);
        
        const neonBox = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 0.1, 0.3),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 0.5 })
        );
        neonBox.position.set(i * 12, 12, j * 12);
        scene.add(neonBox);
      }
    }

    // Sol en béton
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ 
        color: 0x4a5568, 
        roughness: 0.9,
        metalness: 0.1
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Lignes de circulation jaunes
    const lineGeometry = new THREE.BoxGeometry(0.15, 0.02, 100);
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xfbbf24 });
    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.set(i * 10, 0.02, 0);
      scene.add(line);
    }

    // Murs de l'entrepôt
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x34495e, 
      roughness: 0.8,
      metalness: 0.2 
    });
    
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(100, 15, 0.5), wallMaterial);
    backWall.position.set(0, 7.5, -50);
    backWall.receiveShadow = true;
    scene.add(backWall);
    
    const sideWall1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 15, 100), wallMaterial);
    sideWall1.position.set(-50, 7.5, 0);
    sideWall1.receiveShadow = true;
    scene.add(sideWall1);
    
    const sideWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 15, 100), wallMaterial);
    sideWall2.position.set(50, 7.5, 0);
    sideWall2.receiveShadow = true;
    scene.add(sideWall2);

    // Mur avant avec portes
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(30, 15, 0.5), wallMaterial);
    frontWallLeft.position.set(-35, 7.5, 50);
    scene.add(frontWallLeft);
    
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(30, 15, 0.5), wallMaterial);
    frontWallRight.position.set(35, 7.5, 50);
    scene.add(frontWallRight);

    // Portes de chargement
    for (let i = -1; i <= 1; i++) {
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(4, 5, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xe74c3c })
      );
      door.position.set(i * 8, 2.5, 50);
      scene.add(door);
      
      const doorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 5.5, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24 })
      );
      doorFrame.position.set(i * 8, 2.5, 49.9);
      scene.add(doorFrame);
    }

    // Structure du toit avec poutres
    const beamMaterial = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.6, roughness: 0.4 });
    
    for (let i = -4; i <= 4; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 100), beamMaterial);
      beam.position.set(i * 12, 14.5, 0);
      scene.add(beam);
    }
    
    for (let j = -4; j <= 4; j++) {
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(100, 0.3, 0.3), beamMaterial);
      crossBeam.position.set(0, 14.5, j * 12);
      scene.add(crossBeam);
    }

    // Chariots élévateurs
    const forkliftPositions = [
      { x: -15, z: 35, rotation: Math.PI },
      { x: 20, z: -30, rotation: Math.PI / 2 }
    ];
    
    forkliftPositions.forEach(pos => {
      const forklift = new THREE.Group();
      
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1, 2.5),
        new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.6 })
      );
      body.position.y = 0.5;
      forklift.add(body);
      
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.8, 1),
        new THREE.MeshStandardMaterial({ color: 0xc0392b })
      );
      cabin.position.set(0, 1.3, 0.5);
      forklift.add(cabin);
      
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.1, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
      );
      roof.position.set(0, 1.8, 0.5);
      forklift.add(roof);
      
      const forkGeometry = new THREE.BoxGeometry(0.08, 0.08, 1.8);
      const forkMaterial = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.8 });
      [-0.3, 0.3].forEach(offset => {
        const fork = new THREE.Mesh(forkGeometry, forkMaterial);
        fork.position.set(offset, 0.3, -1.5);
        forklift.add(fork);
      });
      
      const mast = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 2.5, 0.15),
        new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: 0.7 })
      );
      mast.position.set(0, 1.25, -0.8);
      forklift.add(mast);
      
      const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
      const wheelPositions = [
        [-0.6, 0.25, 0.8], [0.6, 0.25, 0.8],
        [-0.6, 0.25, -0.8], [0.6, 0.25, -0.8]
      ];
      wheelPositions.forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        forklift.add(wheel);
      });
      
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.15, 8),
        new THREE.MeshStandardMaterial({ color: 0xf39c12, emissive: 0xff6600, emissiveIntensity: 0.8 })
      );
      beacon.position.set(0, 1.95, 0.5);
      forklift.add(beacon);
      
      forklift.position.set(pos.x, 0, pos.z);
      forklift.rotation.y = pos.rotation;
      forklift.castShadow = true;
      forklift.traverse(obj => obj.castShadow = true);
      scene.add(forklift);
    });

    // Transpalettes
    for (let i = 0; i < 3; i++) {
      const palletJack = new THREE.Group();
      
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
      );
      handle.position.y = 0.75;
      handle.rotation.x = Math.PI / 3;
      palletJack.add(handle);
      
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.1, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xf39c12 })
      );
      base.position.y = 0.05;
      palletJack.add(base);
      
      const fork1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x7f8c8d })
      );
      fork1.position.set(-0.15, 0.03, 0);
      palletJack.add(fork1);
      
      const fork2 = fork1.clone();
      fork2.position.x = 0.15;
      palletJack.add(fork2);
      
      palletJack.position.set(-25 + i * 15, 0, 38);
      palletJack.rotation.y = Math.random() * Math.PI / 4;
      scene.add(palletJack);
    }

    // Palettes vides
    for (let i = 0; i < 5; i++) {
      const emptyPallet = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.15, 1),
        new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 })
      );
      emptyPallet.position.set(
        -10 + i * 2.5,
        0.075,
        40 + Math.random() * 2
      );
      emptyPallet.rotation.y = Math.random() * Math.PI / 8;
      emptyPallet.castShadow = true;
      scene.add(emptyPallet);
    }

    // Extincteurs
    const extinguisherPositions = [
      { x: -49, z: -20 }, { x: -49, z: 20 }, 
      { x: 49, z: -20 }, { x: 49, z: 20 }
    ];
    
    extinguisherPositions.forEach(pos => {
      const extinguisher = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.6, 12),
        new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.5 })
      );
      extinguisher.position.set(pos.x, 1, pos.z);
      extinguisher.rotation.z = Math.PI / 2;
      scene.add(extinguisher);
      
      const bracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.3, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
      );
      bracket.position.set(pos.x, 1, pos.z);
      scene.add(bracket);
    });

    // Panneaux de sécurité
    const signPositions = [
      { x: -45, z: -45, text: '⚠️', subtext: 'ZONE\nRÉSERVÉE' },
      { x: 45, z: -45, text: '🚨', subtext: 'ISSUE DE\nSECOURS' },
      { x: -20, z: 48, text: '📦', subtext: 'ZONE DE\nCHARGEMENT' }
    ];
    
    signPositions.forEach(sign => {
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 256;
      signCanvas.height = 256;
      const ctx = signCanvas.getContext('2d')!;
      
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, 236, 236);
      
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(sign.text, 128, 100);
      
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#000000';
      const lines = sign.subtext.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, 128, 150 + i * 30);
      });
      
      const signTexture = new THREE.CanvasTexture(signCanvas);
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 1.5),
        new THREE.MeshBasicMaterial({ map: signTexture })
      );
      signMesh.position.set(sign.x, 3, sign.z);
      scene.add(signMesh);
    });

    // Câbles au plafond
    for (let i = -4; i <= 4; i++) {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 100, 8),
        new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
      );
      cable.rotation.x = Math.PI / 2;
      cable.position.set(i * 5 + 2.5, 14, 0);
      scene.add(cable);
    }

    // Ventilateurs
    for (let i = -2; i <= 2; i += 2) {
      for (let j = -2; j <= 2; j += 2) {
        const vent = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 0.8, 0.2, 6),
          new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.6 })
        );
        vent.position.set(i * 15, 14.2, j * 15);
        scene.add(vent);
        
        const grid = new THREE.Mesh(
          new THREE.CircleGeometry(0.75, 6),
          new THREE.MeshStandardMaterial({ color: 0x34495e, wireframe: true })
        );
        grid.rotation.x = -Math.PI / 2;
        grid.position.set(i * 15, 14.1, j * 15);
        scene.add(grid);
      }
    }

    // Zone de bureaux
    const office = new THREE.Group();
    
    const officeWall = new THREE.Mesh(
      new THREE.BoxGeometry(8, 4, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xecf0f1 })
    );
    officeWall.position.set(-42, 2, -42);
    office.add(officeWall);
    
    const officeWall2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xecf0f1 })
    );
    officeWall2.position.set(-46, 2, -38);
    office.add(officeWall2);
    
    const window = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.5, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x3498db, transparent: true, opacity: 0.5 })
    );
    window.position.set(-42, 2.5, -42.1);
    office.add(window);
    
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.5, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    door.position.set(-44, 1.25, -42.1);
    office.add(door);
    
    const officeSignCanvas = document.createElement('canvas');
    officeSignCanvas.width = 256;
    officeSignCanvas.height = 64;
    const officeCtx = officeSignCanvas.getContext('2d')!;
    officeCtx.fillStyle = '#2c3e50';
    officeCtx.fillRect(0, 0, 256, 64);
    officeCtx.fillStyle = '#ffffff';
    officeCtx.font = 'bold 32px Arial';
    officeCtx.textAlign = 'center';
    officeCtx.fillText('BUREAU', 128, 42);
    const officeSignTexture = new THREE.CanvasTexture(officeSignCanvas);
    const officeSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 0.5),
      new THREE.MeshBasicMaterial({ map: officeSignTexture })
    );
    officeSign.position.set(-42, 4.5, -42);
    office.add(officeSign);
    
    scene.add(office);

    // Zone de réception/expédition
    const loadingZone = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: 0x3498db, transparent: true, opacity: 0.3 })
    );
    loadingZone.position.set(0, 0.03, 42);
    scene.add(loadingZone);
    
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const signCtx = signCanvas.getContext('2d')!;
    signCtx.fillStyle = '#3498db';
    signCtx.fillRect(0, 0, 512, 128);
    signCtx.fillStyle = '#ffffff';
    signCtx.font = 'bold 48px Arial';
    signCtx.textAlign = 'center';
    signCtx.fillText('ZONE DE CHARGEMENT', 256, 80);
    const signTexture = new THREE.CanvasTexture(signCanvas);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 2),
      new THREE.MeshBasicMaterial({ map: signTexture })
    );
    sign.position.set(0, 8, 43);
    scene.add(sign);

    // Création racks - Organisation en rangées avec allées
    const locations = Object.keys(groupedByLocation);
    const racksPerRow = 4;
    const spacingX = 10;
    const spacingZ = 12;

    locations.forEach((loc, i) => {
      const row = Math.floor(i / racksPerRow);
      const col = i % racksPerRow;
      const x = (col - racksPerRow / 2 + 0.5) * spacingX;
      const z = (row - Math.floor(locations.length / racksPerRow) / 2) * spacingZ;
      createRack(scene, x, z, loc, groupedByLocation[loc]);
    });

    // Raycaster pour les clics
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
        const clicked = intersects[0].object;
        const location = clicked.userData?.location;
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
        const hovered = intersects[0].object.userData?.location;
        setHoveredRack(hovered || null);
      } else {
        setHoveredRack(null);
      }
    };

    renderer.domElement.addEventListener('click', handleClick as any);
    renderer.domElement.addEventListener('mousemove', handleHover as any);

    // Animation
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (autoRotate && !mouseRef.current.isDragging) rotationRef.current.y += 0.003;
      const radius = 45;
      camera.position.x = radius * Math.cos(rotationRef.current.y) * Math.cos(rotationRef.current.x);
      camera.position.y = 20 + radius * Math.sin(rotationRef.current.x);
      camera.position.z = radius * Math.sin(rotationRef.current.y) * Math.cos(rotationRef.current.x);
      camera.lookAt(0, 3, 0);
      renderer.render(scene, camera);
    };
    animate();

    // Contrôles souris
    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.isDragging = true;
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
    };
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (!mouseRef.current.isDragging) return;
      const dx = e.clientX - mouseRef.current.lastX;
      const dy = e.clientY - mouseRef.current.lastY;
      rotationRef.current.y += dx * 0.005;
      rotationRef.current.x += dy * 0.005;
      rotationRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.x));
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
    };
    const handleMouseUp = () => (mouseRef.current.isDragging = false);

    renderer.domElement.addEventListener('mousedown', handleMouseDown as any);
    window.addEventListener('mousemove', handleMouseMoveGlobal as any);
    window.addEventListener('mouseup', handleMouseUp as any);

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      if (rendererRef.current) {
        rendererRef.current.domElement.removeEventListener('click', handleClick as any);
        rendererRef.current.domElement.removeEventListener('mousemove', handleHover as any);
        rendererRef.current.domElement.removeEventListener('mousedown', handleMouseDown as any);
      }
      window.removeEventListener('resize', handleResize as any);
      window.removeEventListener('mousemove', handleMouseMoveGlobal as any);
      window.removeEventListener('mouseup', handleMouseUp as any);
      if (containerRef.current && rendererRef.current?.domElement)
        containerRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current?.dispose();
    };
  }, [items, autoRotate, hoveredRack]);

  // Contrôles caméra
  const resetCamera = () => (rotationRef.current = { x: 0, y: 0 });
  const zoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.fov = Math.max(35, cameraRef.current.fov - 5);
      cameraRef.current.updateProjectionMatrix();
    }
  };
  const zoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.fov = Math.min(90, cameraRef.current.fov + 5);
      cameraRef.current.updateProjectionMatrix();
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Contrôles */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-3 rounded-lg shadow-lg transition-colors ${autoRotate ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          title="Rotation automatique"
        >
          <RotateCcw size={20} />
        </button>
        <button onClick={resetCamera} className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-100" title="Réinitialiser la vue">
          <Maximize2 size={20} />
        </button>
        <button onClick={zoomIn} className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-100" title="Zoom avant">
          <ZoomIn size={20} />
        </button>
        <button onClick={zoomOut} className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-100" title="Zoom arrière">
          <ZoomOut size={20} />
        </button>
      </div>

      {/* Infos */}
      <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <div className="flex items-start gap-3">
          <Info className="text-blue-600 mt-1 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Vue 3D de l'entrepôt</p>
            <p className="text-xs text-gray-600">
              <strong>{Object.keys(groupedByLocation).length}</strong> emplacements •{' '}
              <strong>{items.length}</strong> articles •{' '}
              <strong>{items.reduce((a, b) => a + b.quantity, 0)}</strong> unités
            </p>
            <p className="text-xs text-gray-500 mt-2">💡 Glissez pour pivoter • Cliquez sur un rack pour voir les détails</p>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-900 mb-2">Légende des types</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Type 1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Type 2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Type 3</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span>Autres</span>
          </div>
        </div>
      </div>

      {/* Popup rack */}
      {selectedItems && (
        <div className="absolute top-20 right-4 bg-white rounded-lg shadow-2xl p-4 border border-gray-200 max-w-sm z-20">
          <div className="flex justify-between items-center mb-3 border-b pb-2">
            <p className="font-bold text-gray-900 text-lg">{selectedLocation}</p>
            <button onClick={() => setSelectedItems(null)} className="hover:bg-gray-100 rounded p-1">
              <X size={18} className="text-gray-500 hover:text-gray-700" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto text-xs space-y-2">
            {selectedItems.map((item) => (
              <div key={item.id} className="py-2 px-2 border-b last:border-0 hover:bg-gray-50 rounded">
                <p className="font-semibold text-gray-800 mb-1">{item.name}</p>
                <div className="flex gap-3 text-gray-600">
                  <span>Qté: <strong>{item.quantity}</strong></span>
                  <span>•</span>
                  <span>Type: <strong>{item.type}</strong></span>
                </div>
                {item.lot && <p className="text-gray-500 mt-1">Lot: {item.lot}</p>}
                {item.expiration_date && (
                  <p className="text-orange-600 mt-1 font-medium">
                    DLC: {new Date(item.expiration_date).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conteneur 3D */}
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden bg-gray-900" />
    </div>
  );
}