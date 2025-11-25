import * as THREE from 'three';
import { PALLET_CONFIG } from '../config';

// ✅ Géométries partagées pour les palettes (créées UNE SEULE FOIS)
const PALLET_GEOM = {
  plankEUR: new THREE.BoxGeometry(0.14, 0.02, 1.2),   // Planche EUR
  plankCHEP: new THREE.BoxGeometry(0.18, 0.02, 1.2),  // Planche CHEP
  block: new THREE.BoxGeometry(0.1, 0.12, 0.1),       // Bloc support
  slatEUR: new THREE.BoxGeometry(0.8, 0.025, 0.08),   // Traverse EUR
  slatCHEP: new THREE.BoxGeometry(1.0, 0.025, 0.08),  // Traverse CHEP
  logo: new THREE.BoxGeometry(0.2, 0.005, 0.1),       // Logo CHEP
};

// ✅ Matériaux partagés
const PALLET_MATERIALS = {
  EUR: new THREE.MeshStandardMaterial({ color: 0xcd853f, metalness: 0.1, roughness: 0.8 }),
  CHEP: new THREE.MeshStandardMaterial({ color: 0x0066cc, metalness: 0.1, roughness: 0.8 }),
  logo: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.9 }),
};

export const createPallet = (tus: 'EUR' | 'CHEP' | null): THREE.Group => {
  const isChep = tus === 'CHEP';
  const cfg = isChep ? PALLET_CONFIG.CHEP : PALLET_CONFIG.EUR;
  const mat = isChep ? PALLET_MATERIALS.CHEP : PALLET_MATERIALS.EUR;
  const plankGeom = isChep ? PALLET_GEOM.plankCHEP : PALLET_GEOM.plankEUR;
  const slatGeom = isChep ? PALLET_GEOM.slatCHEP : PALLET_GEOM.slatEUR;
  
  const group = new THREE.Group();

  // Planches du dessus (5 planches)
  const plankWidth = cfg.w / 5;
  for (let i = 0; i < 5; i++) {
    const plank = new THREE.Mesh(plankGeom, mat);
    plank.position.set(-cfg.w / 2 + plankWidth / 2 + i * plankWidth + 0.01, cfg.h, 0);
    plank.castShadow = true;
    group.add(plank);
  }

  // Blocs de support (6 blocs en 2 rangées de 3)
  const blockPositions = [
    [-cfg.w / 2 + 0.08, -cfg.d / 2 + 0.08],
    [-cfg.w / 2 + 0.08, cfg.d / 2 - 0.08],
    [0, -cfg.d / 2 + 0.08],
    [0, cfg.d / 2 - 0.08],
    [cfg.w / 2 - 0.08, -cfg.d / 2 + 0.08],
    [cfg.w / 2 - 0.08, cfg.d / 2 - 0.08],
  ];
  
  blockPositions.forEach(([x, z]) => {
    const block = new THREE.Mesh(PALLET_GEOM.block, mat);
    block.position.set(x, cfg.h / 2, z);
    block.castShadow = true;
    group.add(block);
  });

  // Traverses du bas (3 traverses)
  const slatPositions = [-cfg.d / 2 + 0.08, 0, cfg.d / 2 - 0.08];
  slatPositions.forEach(z => {
    const slat = new THREE.Mesh(slatGeom, mat);
    slat.position.set(0, 0.015, z);
    slat.castShadow = true;
    group.add(slat);
  });

  // Logo CHEP (petit rectangle blanc)
  if (isChep) {
    const logo = new THREE.Mesh(PALLET_GEOM.logo, PALLET_MATERIALS.logo);
    logo.position.set(0, cfg.h + 0.01, cfg.d / 2 - 0.2);
    group.add(logo);
  }

  return group;
};

// ✅ Fonction pour disposer les ressources
export const disposePalletResources = (): void => {
  Object.values(PALLET_GEOM).forEach(geom => geom.dispose());
  Object.values(PALLET_MATERIALS).forEach(mat => mat.dispose());
};