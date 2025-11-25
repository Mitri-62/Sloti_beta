import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ViewMode, WarehouseConfig } from '../types';

interface UseOrbitControlsProps {
  config: WarehouseConfig;
  viewMode: ViewMode;
  autoRotate: boolean;
  isEditMode: boolean;
}

export const useOrbitControls = ({ config, viewMode, autoRotate, isEditMode }: UseOrbitControlsProps) => {
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

  // Reset camera
  const reset = useCallback(() => {
    rotationRef.current = { x: 0.3, y: 0.8 };
    targetRotationRef.current = { x: 0.3, y: 0.8 };
    zoomRef.current = 1;
    targetZoomRef.current = 1;
  }, []);

  // Update camera in animation loop
  const updateCamera = useCallback((camera: THREE.PerspectiveCamera) => {
    const lerpFactor = 0.08;

    if (!mouseRef.current.isDragging) {
      rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * lerpFactor;
      rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * lerpFactor;
    }
    zoomRef.current += (targetZoomRef.current - zoomRef.current) * lerpFactor;

    const maxD = Math.max(config.rows * config.aisleWidth, config.racksPerRow * config.bayWidth);
    const radius = maxD * 1.2 * zoomRef.current;

    if (autoRotate && !isEditMode) {
      targetRotationRef.current.y += 0.003;
    }

    let cx = 0, cy = 0, cz = 0;
    const ty = config.rackHeight / 3;

    if (viewMode === 'top') {
      cx = 0;
      cy = radius * 1.5;
      cz = 0.01;
    } else if (viewMode === 'front') {
      cx = 0;
      cy = maxD * 0.5;
      cz = radius * 1.2;
    } else {
      cx = radius * Math.sin(rotationRef.current.y) * Math.cos(rotationRef.current.x);
      cy = 8 + radius * 0.5 * Math.sin(rotationRef.current.x);
      cz = radius * Math.cos(rotationRef.current.y) * Math.cos(rotationRef.current.x);
    }

    camera.position.set(cx, cy, cz);
    camera.lookAt(0, ty, 0);
  }, [config, viewMode, autoRotate, isEditMode]);

  // Mouse/Touch handlers
  const handleMouseDown = useCallback((e: MouseEvent | TouchEvent) => {
    const touches = (e as TouchEvent).touches;

    if (touches?.length === 2) {
      touchRef.current.isPinching = true;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      touchRef.current.lastDistance = Math.sqrt(dx * dx + dy * dy);
      return;
    }

    if (touches?.length > 1) return;

    mouseRef.current.isDragging = true;
    mouseRef.current.button = (e as MouseEvent).button || 0;
    mouseRef.current.lastX = (e as MouseEvent).clientX ?? touches[0].clientX;
    mouseRef.current.lastY = (e as MouseEvent).clientY ?? touches[0].clientY;
    mouseRef.current.deltaX = 0;
    mouseRef.current.deltaY = 0;
    mouseRef.current.velocityX = 0;
    mouseRef.current.velocityY = 0;
    mouseRef.current.lastMoveTime = Date.now();
  }, []);

  const handleMouseUp = useCallback(() => {
    if (mouseRef.current.isDragging) {
      targetRotationRef.current.y = rotationRef.current.y + mouseRef.current.velocityX * 5;
      targetRotationRef.current.x = Math.max(-0.5, Math.min(1.2, rotationRef.current.x + mouseRef.current.velocityY * 5));
    }
    mouseRef.current.isDragging = false;
    touchRef.current.isPinching = false;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
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
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? 1.1 : 0.9;
    targetZoomRef.current = Math.max(0.3, Math.min(2.5, targetZoomRef.current * zoomDelta));
  }, []);

  const handleDoubleClick = useCallback((hasTarget: boolean) => {
    if (hasTarget) {
      targetZoomRef.current = 0.6;
    } else {
      targetRotationRef.current = { x: 0.3, y: 0.8 };
      targetZoomRef.current = 1;
    }
  }, []);

  // Check if it was a click (not drag)
  const wasClick = useCallback(() => {
    return Math.abs(mouseRef.current.deltaX) <= 5 && Math.abs(mouseRef.current.deltaY) <= 5;
  }, []);

  return {
    mouseRef,
    rotationRef,
    targetRotationRef,
    zoomRef,
    targetZoomRef,
    touchRef,
    reset,
    updateCamera,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleWheel,
    handleDoubleClick,
    wasClick
  };
};