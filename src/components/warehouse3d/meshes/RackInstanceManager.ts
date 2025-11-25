import * as THREE from 'three';
import { WarehouseColors } from '../types';

// Géométries partagées (créées une seule fois)
const GEOMETRIES = {
  upright: new THREE.BoxGeometry(0.08, 1, 0.08), // Hauteur = 1, sera scalé
  beam: new THREE.BoxGeometry(1, 0.1, 0.05),     // Largeur = 1, sera scalé
  deck: new THREE.PlaneGeometry(1, 1),           // Sera scalé
  palletPlank: new THREE.BoxGeometry(0.14, 0.02, 1.2),
  palletBlock: new THREE.BoxGeometry(0.1, 0.12, 0.1),
  palletSlat: new THREE.BoxGeometry(1, 0.025, 0.08),
  box: new THREE.BoxGeometry(1, 1, 1),           // Sera scalé
};

// Matériaux partagés
const createMaterials = (colors: WarehouseColors, isDark: boolean) => ({
  frame: new THREE.MeshStandardMaterial({ 
    color: colors.rack, 
    metalness: 0.8, 
    roughness: 0.2 
  }),
  frameSelected: new THREE.MeshStandardMaterial({ 
    color: 0x22c55e, 
    metalness: 0.8, 
    roughness: 0.2,
    emissive: 0x22c55e,
    emissiveIntensity: 0.5
  }),
  frameOverflow: new THREE.MeshStandardMaterial({ 
    color: 0xef4444, 
    metalness: 0.8, 
    roughness: 0.2,
    emissive: 0xef4444,
    emissiveIntensity: 0.3
  }),
  beam: new THREE.MeshStandardMaterial({ 
    color: colors.beam, 
    metalness: 0.7, 
    roughness: 0.3 
  }),
  beamSelected: new THREE.MeshStandardMaterial({ 
    color: 0x16a34a, 
    metalness: 0.7, 
    roughness: 0.3 
  }),
  deck: new THREE.MeshStandardMaterial({ 
    color: 0x6b7280, 
    metalness: 0.6, 
    roughness: 0.4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  }),
  palletEUR: new THREE.MeshStandardMaterial({ 
    color: 0xcd853f, 
    metalness: 0.1, 
    roughness: 0.8 
  }),
  palletCHEP: new THREE.MeshStandardMaterial({ 
    color: 0x0066cc, 
    metalness: 0.1, 
    roughness: 0.8 
  }),
  boxGreen: new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.1, roughness: 0.9 }),
  boxBlue: new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.1, roughness: 0.9 }),
  boxOrange: new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.1, roughness: 0.9 }),
  boxRed: new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.1, roughness: 0.9 }),
});

export type MaterialSet = ReturnType<typeof createMaterials>;

export class RackInstanceManager {
  private scene: THREE.Scene;
  private materials: MaterialSet;
  
  // Instanced meshes pour les éléments répétitifs
  private uprightInstances: THREE.InstancedMesh | null = null;
  private beamInstances: THREE.InstancedMesh | null = null;
  
  // Compteurs pour les instances
  private uprightCount = 0;
  private beamCount = 0;
  
  // Matrices temporaires pour positionnement
  private tempMatrix = new THREE.Matrix4();
  private tempPosition = new THREE.Vector3();
  private tempQuaternion = new THREE.Quaternion();
  private tempScale = new THREE.Vector3();

  constructor(scene: THREE.Scene, colors: WarehouseColors, isDark: boolean, maxRacks: number = 100) {
    this.scene = scene;
    this.materials = createMaterials(colors, isDark);
    
    // Pré-allouer les instanced meshes
    // 4 montants par rack × maxRacks
    const maxUprights = maxRacks * 4;
    this.uprightInstances = new THREE.InstancedMesh(
      GEOMETRIES.upright,
      this.materials.frame,
      maxUprights
    );
    this.uprightInstances.castShadow = true;
    this.uprightInstances.receiveShadow = true;
    this.uprightInstances.count = 0; // Commence à 0
    this.scene.add(this.uprightInstances);
    
    // 2 poutres par niveau × 6 niveaux max × maxRacks
    const maxBeams = maxRacks * 6 * 2;
    this.beamInstances = new THREE.InstancedMesh(
      GEOMETRIES.beam,
      this.materials.beam,
      maxBeams
    );
    this.beamInstances.castShadow = true;
    this.beamInstances.count = 0;
    this.scene.add(this.beamInstances);
  }

  // Ajouter un montant vertical
  addUpright(x: number, y: number, z: number, height: number, rackRotation: number = 0): void {
    if (!this.uprightInstances) return;
    
    // Position dans l'espace monde (avec rotation du rack)
    this.tempPosition.set(x, y + height / 2, z);
    
    // Rotation (juste autour de Y pour le rack)
    this.tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rackRotation);
    
    // Scale (hauteur variable)
    this.tempScale.set(1, height, 1);
    
    this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
    
    this.uprightInstances.setMatrixAt(this.uprightCount, this.tempMatrix);
    this.uprightCount++;
    this.uprightInstances.count = this.uprightCount;
    this.uprightInstances.instanceMatrix.needsUpdate = true;
  }

  // Ajouter une poutre horizontale
  addBeam(x: number, y: number, z: number, width: number, rackRotation: number = 0): void {
    if (!this.beamInstances) return;
    
    this.tempPosition.set(x, y, z);
    this.tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rackRotation);
    this.tempScale.set(width, 1, 1);
    
    this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
    
    this.beamInstances.setMatrixAt(this.beamCount, this.tempMatrix);
    this.beamCount++;
    this.beamInstances.count = this.beamCount;
    this.beamInstances.instanceMatrix.needsUpdate = true;
  }

  // Reset pour reconstruire la scène
  reset(): void {
    this.uprightCount = 0;
    this.beamCount = 0;
    if (this.uprightInstances) this.uprightInstances.count = 0;
    if (this.beamInstances) this.beamInstances.count = 0;
  }

  // Mettre à jour les matrices après tous les ajouts
  updateMatrices(): void {
    if (this.uprightInstances) {
      this.uprightInstances.instanceMatrix.needsUpdate = true;
      this.uprightInstances.computeBoundingSphere();
    }
    if (this.beamInstances) {
      this.beamInstances.instanceMatrix.needsUpdate = true;
      this.beamInstances.computeBoundingSphere();
    }
  }

  // Obtenir les matériaux pour usage externe
  getMaterials(): MaterialSet {
    return this.materials;
  }

  // Obtenir les géométries partagées
  static getGeometries() {
    return GEOMETRIES;
  }

  // Cleanup
  dispose(): void {
    this.uprightInstances?.dispose();
    this.beamInstances?.dispose();
    Object.values(this.materials).forEach(mat => mat.dispose());
  }
}