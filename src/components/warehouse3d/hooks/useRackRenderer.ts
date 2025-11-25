import { useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { RackData, WarehouseConfig, WarehouseColors } from '../types';
import { createRack, clearMaterialCache } from '../meshes/createRack';

interface UseRackRendererProps {
  rackGroup: THREE.Group | null;
  rackData: RackData[];
  config: WarehouseConfig;
  colors: WarehouseColors;
  isEditMode: boolean;
  selectedRackId: string | null;
  hoveredRack: string | null;
  showLabels: boolean;
  showEditGrid: boolean;
  editMoveStep: number;
}

interface RackMeshCache {
  meshes: Map<string, THREE.Group>;
  labels: THREE.Sprite[];
}

export const useRackRenderer = ({
  rackGroup,
  rackData,
  config,
  colors,
  isEditMode,
  selectedRackId,
  hoveredRack,
  showLabels,
  showEditGrid,
  editMoveStep
}: UseRackRendererProps) => {
  const cacheRef = useRef<RackMeshCache>({ meshes: new Map(), labels: [] });
  const animatingRacksRef = useRef<Set<string>>(new Set());
  const prevRackIdsRef = useRef<Set<string>>(new Set());

  // Clear le groupe de racks
  const clearRacks = useCallback(() => {
    if (!rackGroup) return;

    // Dispose proprement
    rackGroup.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        // Ne pas dispose les matériaux cachés
      }
      if (obj instanceof THREE.Sprite) {
        obj.material.map?.dispose();
        obj.material.dispose();
      }
    });

    rackGroup.clear();
    cacheRef.current.meshes.clear();
    cacheRef.current.labels = [];
  }, [rackGroup]);

  // Animation d'entrée pour un rack
  const animateRackEntry = useCallback((group: THREE.Group, delay: number) => {
    const targetY = 0;
    const startY = -2;
    const duration = 600; // ms
    
    group.position.y = startY;
    group.traverse(obj => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        (obj as any).__originalOpacity = obj.material.opacity ?? 1;
        obj.material.transparent = true;
        obj.material.opacity = 0;
      }
    });

    const startTime = performance.now() + delay;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed < 0) {
        requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      // Easing: easeOutBack
      const eased = 1 + 2.7 * Math.pow(progress - 1, 3) + 1.7 * Math.pow(progress - 1, 2);
      
      group.position.y = startY + (targetY - startY) * eased;
      
      group.traverse(obj => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
          const origOpacity = (obj as any).__originalOpacity ?? 1;
          obj.material.opacity = progress * origOpacity;
        }
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        group.position.y = targetY;
        animatingRacksRef.current.delete(group.userData.rackId);
      }
    };

    animatingRacksRef.current.add(group.userData.rackId);
    requestAnimationFrame(animate);
  }, []);

  // Render tous les racks
  const renderRacks = useCallback((animate: boolean = false) => {
    if (!rackGroup) return;

    clearRacks();

    const newRackIds = new Set(rackData.map(r => r.id));
    const isNewRack = (id: string) => !prevRackIdsRef.current.has(id);

    rackData.forEach((rack, index) => {
      // Créer un groupe temporaire pour capturer le rack
      const tempScene = new THREE.Scene();
      const labelSprites: THREE.Sprite[] = [];

      createRack({
        scene: tempScene,
        rackData: rack,
        config,
        colors,
        isEditMode,
        selectedRackId,
        hoveredRack,
        showLabels,
        labelSprites
      });

      // Récupérer le groupe créé et l'ajouter à notre rackGroup
      tempScene.children.forEach(child => {
        if (child instanceof THREE.Group && child.userData.rackId) {
          rackGroup.add(child);
          cacheRef.current.meshes.set(rack.id, child);

          // Animation d'entrée pour les nouveaux racks
          if (animate && isNewRack(rack.id)) {
            animateRackEntry(child, index * 50); // Délai progressif
          }
        }
      });

      cacheRef.current.labels.push(...labelSprites);
    });

    // Grille d'édition
    if (isEditMode && showEditGrid) {
      const floorSize = Math.max(
        config.rows * config.aisleWidth * 2.5,
        config.racksPerRow * config.bayWidth * 2.5
      ) * 1.5;
      
      const editGrid = new THREE.GridHelper(
        floorSize,
        Math.floor(floorSize / editMoveStep),
        0x22d3ee,
        0x06b6d4
      );
      editGrid.position.y = 0.02;
      
      // Fix TypeScript: material peut être Material | Material[]
      const applyGridMaterial = (mat: THREE.Material) => {
        mat.opacity = 0.4;
        mat.transparent = true;
      };
      if (Array.isArray(editGrid.material)) {
        editGrid.material.forEach(applyGridMaterial);
      } else {
        applyGridMaterial(editGrid.material);
      }
      
      editGrid.name = 'editGrid';
      rackGroup.add(editGrid);
    }

    prevRackIdsRef.current = newRackIds;
  }, [
    rackGroup, rackData, config, colors, isEditMode, 
    selectedRackId, hoveredRack, showLabels, showEditGrid, 
    editMoveStep, clearRacks, animateRackEntry
  ]);

  // Update uniquement le hover/selection sans tout recréer
  const updateRackHighlight = useCallback((rackId: string | null, type: 'hover' | 'select') => {
    if (!rackGroup) return;

    rackGroup.traverse(obj => {
      if (obj instanceof THREE.Group && obj.userData.rackId) {
        const isTarget = obj.userData.rackId === rackId;
        
        obj.traverse(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            if (type === 'hover') {
              if (isTarget) {
                child.material.emissive.setHex(0x60a5fa);
                child.material.emissiveIntensity = 0.3;
              } else if (!child.userData.isSelected) {
                child.material.emissiveIntensity = 0;
              }
            }
          }
        });
      }
    });
  }, [rackGroup]);

  // Pulse animation pour les racks en overflow
  const pulseOverflowRacks = useCallback((time: number) => {
    if (!rackGroup) return;

    rackGroup.traverse(obj => {
      if (obj instanceof THREE.Group && obj.userData.hasOverflow) {
        const pulse = 0.3 + Math.sin(time * 3) * 0.2;
        obj.traverse(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            if (child.userData.isOverflowPart) {
              child.material.emissiveIntensity = pulse;
            }
          }
        });
      }
    });
  }, [rackGroup]);

  // Obtenir les labels pour le lookAt camera
  const getLabels = useCallback(() => cacheRef.current.labels, []);

  // Cleanup au changement de thème
  useEffect(() => {
    return () => {
      clearMaterialCache();
    };
  }, [colors]);

  return {
    renderRacks,
    clearRacks,
    updateRackHighlight,
    pulseOverflowRacks,
    getLabels,
    animatingRacks: animatingRacksRef.current
  };
};