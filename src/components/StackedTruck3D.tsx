// src/components/StackedTruck3D.tsx - AVEC DARK MODE
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, Text, Billboard } from "@react-three/drei";
import { useEffect, useState } from "react";

interface StackedUnit {
  base_pallet: {
    sscc: string;
    sku: string;
    quantity: number;
    status: "full" | "partial";
    height_actual: number;
  };
  stacked_pallets: Array<{
    sscc: string;
    quantity: number;
    height_actual: number;
  }>;
  total_height: number;
  dimensions: { l: number; w: number; h: number };
}

interface PlacedUnit {
  unit: StackedUnit;
  x: number;
  y: number;
  z: number;
}

interface StackedTruck3DProps {
  placedUnits: PlacedUnit[];
  truck: { length: number; width: number; height: number };
  highlightedIndex?: number | null;
}

function StackedPallet({ 
  unit, 
  position, 
  isHighlighted, 
  index 
}: {
  unit: StackedUnit;
  position: [number, number, number];
  isHighlighted: boolean;
  index: number;
}) {
  const { l, w } = unit.dimensions;
  const baseHeight = unit.base_pallet.height_actual;
  const hasStacked = unit.stacked_pallets.length > 0;

  // Couleur selon le statut
  const baseColor = unit.base_pallet.status === "full" 
    ? (hasStacked ? "seagreen" : "steelblue")
    : "orange";

  const highlightColor = isHighlighted ? "yellow" : baseColor;

  let currentY = baseHeight / 2;

  return (
    <group position={position}>
      {/* Palette de base */}
      <mesh position={[0, currentY, 0]} castShadow receiveShadow>
        <boxGeometry args={[l, baseHeight, w]} />
        <meshStandardMaterial 
          color={highlightColor} 
          opacity={0.9} 
          transparent 
        />
        <Edges color="black" linewidth={1} />
      </mesh>

      {/* Label de la palette de base */}
      <Billboard position={[0, currentY + baseHeight / 2 + 0.1, 0]}>
        <Text
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="black"
        >
          {index + 1}
        </Text>
      </Billboard>

      {/* Palettes gerbées au-dessus */}
      {unit.stacked_pallets.map((stacked, idx) => {
        currentY += baseHeight / 2 + stacked.height_actual / 2;
        const stackedY = currentY;
        currentY += stacked.height_actual / 2;

        return (
          <group key={idx}>
            <mesh position={[0, stackedY, 0]} castShadow receiveShadow>
              <boxGeometry args={[l, stacked.height_actual, w]} />
              <meshStandardMaterial 
                color={isHighlighted ? "yellow" : "lightcoral"} 
                opacity={0.8} 
                transparent 
              />
              <Edges color="black" linewidth={1} />
            </mesh>

            {/* Marqueur visuel de gerbage */}
            <mesh position={[0, stackedY - stacked.height_actual / 2 - 0.02, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.04, 8]} />
              <meshStandardMaterial color="darkred" />
            </mesh>

            {/* Label palette gerbée */}
            <Billboard position={[0, stackedY + stacked.height_actual / 2 + 0.08, 0]}>
              <Text
                fontSize={0.15}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="black"
              >
                +{stacked.quantity}
              </Text>
            </Billboard>
          </group>
        );
      })}

      {/* Indicateur de gerbage (flèche) */}
      {hasStacked && (
        <mesh position={[l / 2 + 0.1, unit.total_height / 2, 0]}>
          <coneGeometry args={[0.08, 0.2, 4]} />
          <meshStandardMaterial color="red" />
        </mesh>
      )}
    </group>
  );
}

export default function StackedTruck3D({
  placedUnits,
  truck,
  highlightedIndex = null,
}: StackedTruck3DProps) {
  // Détection du dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Détecte si le dark mode est actif
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    // Vérification initiale
    checkDarkMode();

    // Observer les changements de classe sur l'élément HTML
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Couleurs adaptées au mode
  const backgroundColor = isDarkMode ? '#1f2937' : '#f3f4f6';
  const gridSectionColor = isDarkMode ? '#4b5563' : '#9ca3af';
  const gridCellColor = isDarkMode ? '#374151' : '#d1d5db';
  const groundColor = isDarkMode ? '#374151' : '#e5e7eb';

  return (
    <Canvas
      camera={{ position: [25, 18, 30], fov: 60 }}
      style={{ height: 600 }}
      shadows
    >
      {/* Fond adaptatif */}
      <color attach="background" args={[backgroundColor]} />

      <ambientLight intensity={isDarkMode ? 0.4 : 0.6} />
      <directionalLight 
        position={[10, 15, 5]} 
        intensity={isDarkMode ? 0.6 : 0.8} 
        castShadow 
      />
      <OrbitControls enableDamping dampingFactor={0.05} />

      {/* Contour du camion */}
      <mesh position={[truck.length / 2, truck.height / 2, truck.width / 2]}>
        <boxGeometry args={[truck.length, truck.height, truck.width]} />
        <meshBasicMaterial color="transparent" opacity={0} transparent />
        <Edges color={isDarkMode ? "#9ca3af" : "black"} linewidth={2} />
      </mesh>

      {/* Sol */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[truck.length / 2, -0.01, truck.width / 2]}
        receiveShadow
      >
        <planeGeometry args={[truck.length + 2, truck.width + 2]} />
        <meshStandardMaterial 
          color={groundColor} 
          opacity={0.8} 
          transparent 
        />
      </mesh>

      <Grid
        args={[truck.length + 2, truck.width + 2]}
        sectionColor={gridSectionColor}
        cellColor={gridCellColor}
        infiniteGrid={false}
        position={[truck.length / 2, 0, truck.width / 2]}
        cellSize={0.5}
        fadeDistance={40}
        sectionSize={1}
      />

      {/* Unités gerbées */}
      {placedUnits.map((placed, idx) => (
        <StackedPallet
          key={idx}
          unit={placed.unit}
          position={[placed.x, placed.y, placed.z]}
          isHighlighted={highlightedIndex === idx}
          index={idx}
        />
      ))}

      {/* Ligne de hauteur max */}
      <mesh position={[truck.length / 2, truck.height, truck.width / 2]}>
        <boxGeometry args={[truck.length, 0.02, truck.width]} />
        <meshBasicMaterial color="red" opacity={0.3} transparent />
      </mesh>
    </Canvas>
  );
}