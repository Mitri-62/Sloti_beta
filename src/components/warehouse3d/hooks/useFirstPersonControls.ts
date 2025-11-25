import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { CameraMode, WarehouseConfig } from '../types';
import { FP_CONFIG } from '../config';

interface RackBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface UseFirstPersonControlsProps {
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  config: WarehouseConfig;
  rackBounds: RackBounds[];
  enableCollision: boolean;
}

export const useFirstPersonControls = ({
  cameraMode,
  setCameraMode,
  config,
  rackBounds,
  enableCollision
}: UseFirstPersonControlsProps) => {
  const fpRef = useRef({
    position: new THREE.Vector3(0, FP_CONFIG.eyeHeight, 15),
    yaw: Math.PI,
    pitch: 0,
    velocity: new THREE.Vector3(),
    isPointerLocked: false,
  });

  const keysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    sprint: false,
  });

  // ✅ Position en REF, pas en state (évite les re-renders)
  const fpPositionRef = useRef({ x: 0, z: 15 });
  
  // ✅ Cache pour les bounds (évite de recalculer)
  const boundsRef = useRef<RackBounds[]>([]);
  
  // ✅ Vecteurs réutilisables (évite les allocations)
  const moveVectors = useRef({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
  });

  // Update bounds cache quand ça change
  useEffect(() => {
    boundsRef.current = rackBounds;
  }, [rackBounds]);

  // ✅ Collision optimisée avec early exit
  const checkCollision = useCallback((newX: number, newZ: number): boolean => {
    if (!enableCollision) return false;
    const r = FP_CONFIG.collisionRadius;
    const rSq = r * r;
    
    for (let i = 0; i < boundsRef.current.length; i++) {
      const bounds = boundsRef.current[i];
      
      // Early exit: skip si clairement hors zone
      if (newX < bounds.minX - r || newX > bounds.maxX + r ||
          newZ < bounds.minZ - r || newZ > bounds.maxZ + r) {
        continue;
      }
      
      const closestX = Math.max(bounds.minX, Math.min(newX, bounds.maxX));
      const closestZ = Math.max(bounds.minZ, Math.min(newZ, bounds.maxZ));
      const dx = newX - closestX;
      const dz = newZ - closestZ;
      
      if (dx * dx + dz * dz < rSq) return true;
    }
    return false;
  }, [enableCollision]);

  // Reset position
  const resetPosition = useCallback(() => {
    const maxD = Math.max(config.rows * config.aisleWidth, config.racksPerRow * config.bayWidth);
    fpRef.current.position.set(0, FP_CONFIG.eyeHeight, maxD * 0.8);
    fpRef.current.yaw = 0;
    fpRef.current.pitch = 0;
    fpPositionRef.current = { x: 0, z: maxD * 0.8 };
  }, [config]);

  // Toggle mode
  const toggleMode = useCallback(() => {
    if (cameraMode === 'orbit') {
      resetPosition();
      setCameraMode('firstPerson');
    } else {
      if (document.pointerLockElement) document.exitPointerLock();
      setCameraMode('orbit');
    }
  }, [cameraMode, setCameraMode, resetPosition]);

  // Keyboard controls
  useEffect(() => {
    if (cameraMode !== 'firstPerson') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const keys = keysRef.current;
      switch (e.code) {
        case 'KeyW': case 'KeyZ': keys.forward = true; break;
        case 'KeyS': keys.backward = true; break;
        case 'KeyA': case 'KeyQ': keys.left = true; break;
        case 'KeyD': keys.right = true; break;
        case 'Space': e.preventDefault(); keys.up = true; break;
        case 'ShiftLeft': case 'ShiftRight': keys.down = true; break;
        case 'KeyF':
          if (document.pointerLockElement) document.exitPointerLock();
          setCameraMode('orbit');
          break;
        case 'Tab':
          e.preventDefault();
          if (document.pointerLockElement) document.exitPointerLock();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const keys = keysRef.current;
      switch (e.code) {
        case 'KeyW': case 'KeyZ': keys.forward = false; break;
        case 'KeyS': keys.backward = false; break;
        case 'KeyA': case 'KeyQ': keys.left = false; break;
        case 'KeyD': keys.right = false; break;
        case 'Space': keys.up = false; break;
        case 'ShiftLeft': case 'ShiftRight': keys.down = false; break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      // Reset keys
      const keys = keysRef.current;
      keys.forward = keys.backward = keys.left = keys.right = keys.up = keys.down = keys.sprint = false;
    };
  }, [cameraMode, setCameraMode]);

  // ✅ Update movement optimisé - PAS de setState dedans !
  const updateMovement = useCallback((delta: number, camera: THREE.PerspectiveCamera) => {
    const keys = keysRef.current;
    const fp = fpRef.current;
    const vecs = moveVectors.current;
    
    const speed = FP_CONFIG.moveSpeed * (keys.sprint ? FP_CONFIG.sprintMultiplier : 1);

    // Réutiliser les vecteurs au lieu d'en créer
    const sinYaw = Math.sin(fp.yaw);
    const cosYaw = Math.cos(fp.yaw);
    
    vecs.forward.set(-sinYaw, 0, -cosYaw);
    vecs.right.set(cosYaw, 0, -sinYaw);

    let moveX = 0, moveZ = 0;
    
    if (keys.forward) { moveX += vecs.forward.x; moveZ += vecs.forward.z; }
    if (keys.backward) { moveX -= vecs.forward.x; moveZ -= vecs.forward.z; }
    if (keys.left) { moveX -= vecs.right.x; moveZ -= vecs.right.z; }
    if (keys.right) { moveX += vecs.right.x; moveZ += vecs.right.z; }

    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const invLen = 1 / len;
      moveX = moveX * invLen * speed * delta;
      moveZ = moveZ * invLen * speed * delta;

      const newX = fp.position.x + moveX;
      const newZ = fp.position.z + moveZ;

      // Check collision X puis Z séparément
      if (!checkCollision(newX, fp.position.z)) {
        fp.position.x = newX;
      }
      if (!checkCollision(fp.position.x, newZ)) {
        fp.position.z = newZ;
      }
    }

    // Vertical movement
    if (keys.up) {
      fp.position.y = Math.min(15, fp.position.y + speed * delta * 0.5);
    }
    if (keys.down) {
      fp.position.y = Math.max(0.5, fp.position.y - speed * delta * 0.5);
    }

    // Apply to camera
    camera.position.copy(fp.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = fp.yaw;
    camera.rotation.x = fp.pitch;

    // ✅ Update ref position (pour minimap) - PAS de setState !
    fpPositionRef.current.x = fp.position.x;
    fpPositionRef.current.z = fp.position.z;
  }, [checkCollision]);

  // Mouse look handler - optimisé
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!document.pointerLockElement) return;
    const fp = fpRef.current;
    fp.yaw -= e.movementX * FP_CONFIG.mouseSensitivity;
    fp.pitch = Math.max(
      FP_CONFIG.minPitch, 
      Math.min(FP_CONFIG.maxPitch, fp.pitch - e.movementY * FP_CONFIG.mouseSensitivity)
    );
  }, []);

  // Sprint with middle click
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      keysRef.current.sprint = true;
    }
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button === 1) {
      keysRef.current.sprint = false;
    }
  }, []);

  return {
    fpRef,
    keysRef,
    fpPosition: fpPositionRef.current, // ✅ Retourne la ref directement
    fpPositionRef, // ✅ Expose aussi la ref pour accès direct
    checkCollision,
    resetPosition,
    toggleMode,
    updateMovement,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp
  };
};