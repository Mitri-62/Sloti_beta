import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { WarehouseConfig, WarehouseColors } from '../types';

interface UseSceneProps {
  containerRef: React.RefObject<HTMLDivElement>;
  config: WarehouseConfig;
  colors: WarehouseColors;
  isDark: boolean;
}

interface SceneRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  rackGroup: THREE.Group;
  clock: THREE.Clock;
  raycaster: THREE.Raycaster;
  mouseVec: THREE.Vector2;
}

export const useScene = ({ containerRef, config, colors, isDark }: UseSceneProps) => {
  const sceneRefsRef = useRef<SceneRefs | null>(null);
  const isInitializedRef = useRef(false);
  const animationIdRef = useRef<number>(0);

  // Initialisation unique de la scène
  const initScene = useCallback(() => {
    if (!containerRef.current || isInitializedRef.current) return null;

    // Cleanup ancien canvas si présent
    const oldCanvas = containerRef.current.querySelector('canvas');
    if (oldCanvas) containerRef.current.removeChild(oldCanvas);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.bg);
    scene.fog = new THREE.Fog(colors.fog, 40, 100);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      500
    );

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 0.8 : 1.2;
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(isDark ? 0x404060 : 0xffffff, isDark ? 0.4 : 0.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(isDark ? 0x8090b0 : 0xffffff, isDark ? 0.8 : 1.2);
    sun.position.set(30, 50, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 150;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    scene.add(sun);

    // Floor
    const floorSize = Math.max(
      config.rows * config.aisleWidth * 2.5,
      config.racksPerRow * config.bayWidth * 2.5
    ) * 1.5;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSize, floorSize),
      new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 0.9, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    scene.add(floor);

    // Grid
    const grid = new THREE.GridHelper(floorSize, Math.floor(floorSize / 2), colors.grid1, colors.grid2);
    grid.position.y = 0.01;
    grid.name = 'grid';
    scene.add(grid);

    // Groupe dédié pour les racks (on videra/remplira CE groupe uniquement)
    const rackGroup = new THREE.Group();
    rackGroup.name = 'rackGroup';
    scene.add(rackGroup);

    // Utils
    const clock = new THREE.Clock();
    clock.start();
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    isInitializedRef.current = true;

    return { scene, camera, renderer, rackGroup, clock, raycaster, mouseVec };
  }, [containerRef, config, colors, isDark]);

  // Update thème sans recréer la scène
  const updateTheme = useCallback(() => {
    if (!sceneRefsRef.current) return;
    const { scene, renderer } = sceneRefsRef.current;

    scene.background = new THREE.Color(colors.bg);
    scene.fog = new THREE.Fog(colors.fog, 40, 100);
    renderer.toneMappingExposure = isDark ? 0.8 : 1.2;

    // Update floor
    const floor = scene.getObjectByName('floor') as THREE.Mesh;
    if (floor && floor.material instanceof THREE.MeshStandardMaterial) {
      floor.material.color.setHex(colors.floor);
    }

    // Update grid colors (sans recréer)
    const grid = scene.getObjectByName('grid') as THREE.GridHelper | undefined;
    if (grid) {
      const gridMat = grid.material;
      if (Array.isArray(gridMat)) {
        (gridMat[0] as THREE.LineBasicMaterial).color.setHex(colors.grid1);
        (gridMat[1] as THREE.LineBasicMaterial).color.setHex(colors.grid2);
      } else if (gridMat instanceof THREE.LineBasicMaterial) {
        gridMat.color.setHex(colors.grid1);
      }
    }

    // Update lights
    scene.traverse(obj => {
      if (obj instanceof THREE.AmbientLight) {
        obj.color.setHex(isDark ? 0x404060 : 0xffffff);
        obj.intensity = isDark ? 0.4 : 0.5;
      }
      if (obj instanceof THREE.DirectionalLight) {
        obj.color.setHex(isDark ? 0x8090b0 : 0xffffff);
        obj.intensity = isDark ? 0.8 : 1.2;
      }
    });
  }, [colors, isDark, config]);

  // Resize handler
  const handleResize = useCallback(() => {
    if (!containerRef.current || !sceneRefsRef.current) return;
    const { camera, renderer } = sceneRefsRef.current;
    camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
  }, [containerRef]);

  // Init effect
  useEffect(() => {
    const refs = initScene();
    if (refs) {
      sceneRefsRef.current = refs;
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      
      if (sceneRefsRef.current) {
        const { renderer, scene } = sceneRefsRef.current;
        
        // Dispose all geometries and materials
        scene.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material?.dispose();
            }
          }
          if (obj instanceof THREE.Sprite) {
            obj.material.map?.dispose();
            obj.material.dispose();
          }
        });

        if (containerRef.current?.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
      
      isInitializedRef.current = false;
      sceneRefsRef.current = null;
    };
  }, []); // Uniquement au mount/unmount

  // Theme update effect
  useEffect(() => {
    if (isInitializedRef.current) {
      updateTheme();
    }
  }, [isDark, colors, updateTheme]);

  return {
    sceneRefs: sceneRefsRef,
    animationIdRef,
    handleResize,
    isInitialized: isInitializedRef.current
  };
};