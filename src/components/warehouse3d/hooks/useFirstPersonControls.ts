import { useRef, useEffect, useCallback, useState } from 'react';
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

  const [fpPosition, setFpPosition] = useState({ x: 0, z: 15 });

  // Collision check
  const checkCollision = useCallback((newX: number, newZ: number): boolean => {
    if (!enableCollision) return false;
    const r = FP_CONFIG.collisionRadius;
    for (const bounds of rackBounds) {
      const closestX = Math.max(bounds.minX, Math.min(newX, bounds.maxX));
      const closestZ = Math.max(bounds.minZ, Math.min(newZ, bounds.maxZ));
      const dx = newX - closestX;
      const dz = newZ - closestZ;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }, [enableCollision, rackBounds]);

  // Reset position
  const resetPosition = useCallback(() => {
    const maxD = Math.max(config.rows * config.aisleWidth, config.racksPerRow * config.bayWidth);
    fpRef.current.position.set(0, FP_CONFIG.eyeHeight, maxD * 0.8);
    fpRef.current.yaw = 0;
    fpRef.current.pitch = 0;
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
      switch (e.code) {
        case 'KeyW': case 'KeyZ': keysRef.current.forward = true; break;
        case 'KeyS': keysRef.current.backward = true; break;
        case 'KeyA': case 'KeyQ': keysRef.current.left = true; break;
        case 'KeyD': keysRef.current.right = true; break;
        case 'Space': e.preventDefault(); keysRef.current.up = true; break;
        case 'ShiftLeft': case 'ShiftRight': keysRef.current.down = true; break;
        case 'KeyF':
          if (document.pointerLockElement) document.exitPointerLock();
          setCameraMode('orbit');
          break;
        case 'Tab':
          e.preventDefault();
          if (document.pointerLockElement) {
            document.exitPointerLock();
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
      Object.keys(keysRef.current).forEach(k => (keysRef.current as any)[k] = false);
    };
  }, [cameraMode, setCameraMode]);

  // Update camera position in animation loop
  const updateMovement = useCallback((delta: number, camera: THREE.PerspectiveCamera) => {
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

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0) {
      moveX = (moveX / len) * speed * delta;
      moveZ = (moveZ / len) * speed * delta;

      const newX = fpRef.current.position.x + moveX;
      const newZ = fpRef.current.position.z + moveZ;

      if (!checkCollision(newX, fpRef.current.position.z)) {
        fpRef.current.position.x = newX;
      }
      if (!checkCollision(fpRef.current.position.x, newZ)) {
        fpRef.current.position.z = newZ;
      }
    }

    // Vertical movement
    if (keysRef.current.up) {
      fpRef.current.position.y = Math.min(15, fpRef.current.position.y + speed * delta * 0.5);
    }
    if (keysRef.current.down) {
      fpRef.current.position.y = Math.max(0.5, fpRef.current.position.y - speed * delta * 0.5);
    }

    // Apply to camera
    camera.position.copy(fpRef.current.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = fpRef.current.yaw;
    camera.rotation.x = fpRef.current.pitch;

    // Update position state for minimap
    setFpPosition({ x: fpRef.current.position.x, z: fpRef.current.position.z });
  }, [checkCollision]);

  // Mouse look handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!document.pointerLockElement) return;
    fpRef.current.yaw -= e.movementX * FP_CONFIG.mouseSensitivity;
    fpRef.current.pitch -= e.movementY * FP_CONFIG.mouseSensitivity;
    fpRef.current.pitch = Math.max(FP_CONFIG.minPitch, Math.min(FP_CONFIG.maxPitch, fpRef.current.pitch));
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
    fpPosition,
    checkCollision,
    resetPosition,
    toggleMode,
    updateMovement,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp
  };
};