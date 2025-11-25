import { useCallback, useRef } from 'react';
import * as THREE from 'three';

interface UseCameraAnimationProps {
  camera: THREE.PerspectiveCamera | null;
  orbitControls: {
    targetRotationRef: React.MutableRefObject<{ x: number; y: number }>;
    targetZoomRef: React.MutableRefObject<number>;
    rotationRef: React.MutableRefObject<{ x: number; y: number }>;
    zoomRef: React.MutableRefObject<number>;
  };
}

interface FlyToOptions {
  position: { x: number; z: number };
  duration?: number;
  zoom?: number;
  onComplete?: () => void;
}

export const useCameraAnimation = ({ camera, orbitControls }: UseCameraAnimationProps) => {
  const isAnimatingRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  // Calcule l'angle Y pour regarder une position depuis la caméra
  const getAngleToTarget = useCallback((targetX: number, targetZ: number): number => {
    return Math.atan2(targetX, targetZ);
  }, []);

  // Animation fluide vers un rack
  const flyToRack = useCallback(({ position, duration = 1200, zoom = 0.5, onComplete }: FlyToOptions) => {
    if (!camera || isAnimatingRef.current) return;

    isAnimatingRef.current = true;

    const startRotation = { ...orbitControls.rotationRef.current };
    const startZoom = orbitControls.zoomRef.current;

    // Calculer l'angle cible pour centrer sur le rack
    const targetAngleY = getAngleToTarget(position.x, position.z) + Math.PI;
    const targetAngleX = 0.4; // Légère plongée

    // Normaliser l'angle pour éviter les rotations de 360°
    let deltaY = targetAngleY - startRotation.y;
    while (deltaY > Math.PI) deltaY -= Math.PI * 2;
    while (deltaY < -Math.PI) deltaY += Math.PI * 2;

    const targetRotation = {
      x: targetAngleX,
      y: startRotation.y + deltaY
    };

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing: easeInOutCubic
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Interpoler rotation
      orbitControls.rotationRef.current = {
        x: startRotation.x + (targetRotation.x - startRotation.x) * eased,
        y: startRotation.y + (targetRotation.y - startRotation.y) * eased
      };
      orbitControls.targetRotationRef.current = { ...orbitControls.rotationRef.current };

      // Interpoler zoom
      orbitControls.zoomRef.current = startZoom + (zoom - startZoom) * eased;
      orbitControls.targetZoomRef.current = orbitControls.zoomRef.current;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
        animationRef.current = null;
        onComplete?.();
      }
    };

    // Cancel previous animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [camera, orbitControls, getAngleToTarget]);

  // Reset vers vue globale
  const flyToOverview = useCallback((duration = 800) => {
    if (isAnimatingRef.current) return;

    isAnimatingRef.current = true;

    const startRotation = { ...orbitControls.rotationRef.current };
    const startZoom = orbitControls.zoomRef.current;

    const targetRotation = { x: 0.3, y: 0.8 };
    const targetZoom = 1;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      orbitControls.rotationRef.current = {
        x: startRotation.x + (targetRotation.x - startRotation.x) * eased,
        y: startRotation.y + (targetRotation.y - startRotation.y) * eased
      };
      orbitControls.targetRotationRef.current = { ...orbitControls.rotationRef.current };

      orbitControls.zoomRef.current = startZoom + (targetZoom - startZoom) * eased;
      orbitControls.targetZoomRef.current = orbitControls.zoomRef.current;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
        animationRef.current = null;
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [orbitControls]);

  // Stop animation
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    isAnimatingRef.current = false;
  }, []);

  return {
    flyToRack,
    flyToOverview,
    stopAnimation,
    isAnimating: isAnimatingRef.current
  };
};