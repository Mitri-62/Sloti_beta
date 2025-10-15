// src/components/Truck3D.tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, Text, Billboard } from "@react-three/drei";
import { useMemo } from "react";

interface Pallet {
  l: number;
  w: number;
  h: number;
  type?: string;
  orientation?: "long" | "large";
}

interface Truck3DProps {
  palettes: Pallet[];
  truck: { length: number; width: number; height: number };
  doubleStack: boolean;
  orientation: "long" | "large";
  optimized?: boolean;
  highlightedIndex?: number | null;
}

// ------------------------------------
// 🔹 Algo manuel (VOTRE VERSION ORIGINALE - INCHANGÉE)
// ------------------------------------
export function computePacking(
  palettes: Pallet[],
  truck: { length: number; width: number; height: number },
  doubleStack: boolean,
  defaultOrientation: "long" | "large"
) {
  const placed: any[] = [];
  if (palettes.length === 0) return placed;

  let cursorX = 0;
  let row: Pallet[] = [];

  palettes.forEach((p, index) => {
    const orientation = p.orientation || defaultOrientation;
    let l = p.l;
    let w = p.w;
    if (orientation === "large") [l, w] = [w, l];

    row.push({ ...p, l, w });

    let maxCols = 0;
    if (p.type === "EUR 120x80") maxCols = orientation === "large" ? 2 : 3;
    else if (p.type === "US 120x100") maxCols = 2;
    else if (p.type === "Demi 80x60") maxCols = orientation === "large" ? 3 : 4;

    if (row.length === maxCols || index === palettes.length - 1) {
      if (cursorX + l > truck.length) return;

      row.forEach((rp, i) => {
        let xPos = cursorX + l / 2;
        let zPos = 0;

        if (rp.type === "EUR 120x80") {
          if (rp.orientation === "large") {
            zPos = i === 0 ? rp.w / 2 : truck.width - rp.w / 2;
          } else {
            const spacing = (truck.width - 3 * rp.w) / 2;
            zPos = spacing + i * rp.w + rp.w / 2;
          }
        } else if (rp.type === "US 120x100") {
          zPos = i === 0 ? rp.w / 2 : truck.width - rp.w / 2;
        } else if (rp.type === "Demi 80x60") {
          if (rp.orientation === "long") {
            const spacing = (truck.width - 4 * rp.w) / 2;
            zPos = spacing + i * rp.w + rp.w / 2;
          } else {
            const spacing = (truck.width - 3 * rp.w) / 2;
            zPos = spacing + i * rp.w + rp.w / 2;
          }
        }

        placed.push({ x: xPos, y: rp.h / 2, z: zPos, l: rp.l, w: rp.w, h: rp.h, type: rp.type });

        if (doubleStack) {
          placed.push({ ...placed[placed.length - 1], y: rp.h + rp.h / 2 });
        }
      });

      if (row[0].type === "Demi 80x60") {
        cursorX += row[0].orientation === "long" ? 0.8 : 0.6;
      } else {
        cursorX += row[0].l;
      }

      row = [];
    }
  });

  return placed;
}

// ------------------------------------
// 🔹 Algo auto optimisé (VOTRE VERSION ORIGINALE - INCHANGÉE)
// ------------------------------------
export function computeOptimizedPacking(
  palettes: Pallet[],
  truck: { length: number; width: number; height: number },
  doubleStack: boolean
) {
  const placed: any[] = [];
  let cursorX = 0;

  const eur = palettes.filter(p => p.type === "EUR 120x80");
  const chep = palettes.filter(p => p.type === "US 120x100");
  const demi = palettes.filter(p => p.type === "Demi 80x60");

  // EUR → 2 par rangée
  while (eur.length >= 2 && cursorX + 1.2 <= truck.length) {
    for (let i = 0; i < 2; i++) {
      const p = eur.pop()!;
      placed.push({
        x: cursorX + p.l / 2,
        y: p.h / 2,
        z: i === 0 ? p.w / 2 : truck.width - p.w / 2,
        l: p.l, w: p.w, h: p.h, type: p.type,
      });
      if (doubleStack) placed.push({ ...placed[placed.length - 1], y: p.h + p.h / 2 });
    }
    cursorX += 1.2;
  }

  // CHEP → 2 par rangée
  while (chep.length >= 2 && cursorX + 1.2 <= truck.length) {
    for (let i = 0; i < 2; i++) {
      const p = chep.pop()!;
      placed.push({
        x: cursorX + p.l / 2,
        y: p.h / 2,
        z: i === 0 ? p.w / 2 : truck.width - p.w / 2,
        l: p.l, w: p.w, h: p.h, type: p.type,
      });
      if (doubleStack) placed.push({ ...placed[placed.length - 1], y: p.h + p.h / 2 });
    }
    cursorX += 1.2;
  }

  // Demi → 4 par rangée
  while (demi.length >= 4 && cursorX + 0.8 <= truck.length) {
    for (let i = 0; i < 4; i++) {
      const p = demi.pop()!;
      const col = i % 2;
      const rowIndex = Math.floor(i / 2);
      const spacing = (truck.width - 2 * p.w) / 2;

      placed.push({
        x: cursorX + rowIndex * p.l + p.l / 2,
        y: p.h / 2,
        z: spacing + col * p.w + p.w / 2,
        l: p.l, w: p.w, h: p.h, type: p.type,
      });
    }
    cursorX += 0.8;
  }

  return placed;
}

// ------------------------------------
// 🔹 Composant avec améliorations visuelles
// ------------------------------------
export default function Truck3D({
  palettes,
  truck,
  doubleStack,
  orientation,
  optimized = false,
  highlightedIndex = null,
}: Truck3DProps) {
  const positions = useMemo(() => {
    return optimized
      ? computeOptimizedPacking(palettes, truck, doubleStack)
      : computePacking(palettes, truck, doubleStack, orientation);
  }, [palettes, truck, doubleStack, orientation, optimized]);

  const getColor = (p: any, i: number) => {
    if (highlightedIndex === i) return "yellow";
    if (p.type === "EUR 120x80") return "seagreen";
    if (p.type === "US 120x100") return "saddlebrown";
    if (p.type === "Demi 80x60") return "darkorange";
    return "gray";
  };

  return (
    <Canvas 
      camera={{ position: [25, 18, 30], fov: 60 }} 
      style={{ height: 500 }}
      shadows
    >
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.8}
        castShadow
      />
      <OrbitControls 
        enableDamping
        dampingFactor={0.05}
      />

      {/* Contour camion */}
      <mesh position={[truck.length / 2, truck.height / 2, truck.width / 2]}>
        <boxGeometry args={[truck.length, truck.height, truck.width]} />
        <meshBasicMaterial opacity={0} transparent />
        <Edges color="black" linewidth={2} />
      </mesh>

       {/* Sol amélioré */}
       <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[truck.length / 2, -0.01, truck.width / 2]}
        receiveShadow
      >
        <planeGeometry args={[truck.length + 2, truck.width + 2]} />
        <meshStandardMaterial color="#d1d5db" opacity={0.5} transparent />
      </mesh>
      
      <Grid
        args={[truck.length + 2, truck.width + 2]}
        sectionColor="#9ca3af"
        cellColor="#d1d5db"
        infiniteGrid={false}
        position={[truck.length / 2, 0, truck.width / 2]}
        cellSize={0.5}
        fadeDistance={30}
        sectionSize={1}
      />

      {/* Palettes */}
      {positions.map((pos, i) => (
        <group key={i}>
          <mesh 
            position={[pos.x, pos.y, pos.z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[pos.l, pos.h, pos.w]} />
            <meshStandardMaterial color={getColor(pos, i)} />
            <Edges color="black" />
          </mesh>
          <Billboard position={[pos.x, pos.y + pos.h / 2 + 0.05, pos.z]}>
            <Text 
              fontSize={0.25} 
              color="white" 
              anchorX="center" 
              anchorY="middle"
              outlineWidth={0.04} 
              outlineColor="black"
            >
              {i + 1}
            </Text>
          </Billboard>
        </group>
      ))}
    </Canvas>
  );
}