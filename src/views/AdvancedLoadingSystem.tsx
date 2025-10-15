// src/views/AdvancedLoadingSystem.tsx - VERSION OPTIMISÉE COMPLÈTE
import { 
  useState, 
  useMemo, 
  useEffect
} from "react";
import {  
  Package, 
  Layers, 
  Upload, 
  TrendingUp, 
  Loader2, 
  Trash2,
  X,
  Maximize2,
  Weight,
  AlertTriangle,
  Eye,
  List
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, Text } from "@react-three/drei";
import { useMasterData } from "../hooks/useMasterData";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient"; 

interface PalletInstance {
  sscc: string;
  sku: string;
  quantity: number;
  status: "full" | "partial";
  height_actual: number;
  weight_actual: number;
}

interface StackedUnit {
  base_pallet: PalletInstance;
  stacked_pallets: PalletInstance[];
  total_height: number;
  total_weight: number;
  dimensions: { l: number; w: number; h: number };
  pallet_type?: string;
}

const TRUCK_TYPES = {
  "7.5T": { length: 6, width: 2.4, height: 2.4 },
  "19T": { length: 8, width: 2.4, height: 2.6 },
  "Semi 13.6m": { length: 13.6, width: 2.4, height: 2.7 },
};

const STORAGE_KEY = "sloti_truck_loading";

function reconstructPallets(
  listing: Array<{ sscc: string; sku: string; quantity: number }>,
  masterData: any
): PalletInstance[] {
  return listing.map(item => {
    const md = masterData.get(item.sku);
    if (!md) throw new Error(`SKU ${item.sku} introuvable dans MasterData`);

    const nb_couches_reel = Math.ceil((item.quantity / md.qty_per_pallet) * md.nb_couches);
    const height_actual = nb_couches_reel * md.hauteur_couche;
    const weight_actual = item.quantity * md.poids_brut;
    const status = item.quantity >= md.qty_per_pallet ? "full" : "partial";

    return { 
      sscc: item.sscc, 
      sku: item.sku, 
      quantity: item.quantity, 
      status, 
      height_actual, 
      weight_actual 
    };
  });
}

function computeStacking(
  pallets: PalletInstance[],
  masterData: any,
  truckMaxHeight: number
): StackedUnit[] {
  const stackedUnits: StackedUnit[] = [];
  const used = new Set<string>();
  const palletSupportHeight = 0.15;

  pallets.forEach(basePallet => {
    if (used.has(basePallet.sscc)) return;

    const stackedOnThis: PalletInstance[] = [];
    let currentHeight = basePallet.height_actual;
    let currentWeight = basePallet.weight_actual;

    const mdBase = masterData.get(basePallet.sku);
    if (!mdBase) return;
    const maxWeight = mdBase.max_stack_weight || 1000;

    for (const otherPallet of pallets) {
      if (used.has(otherPallet.sscc)) continue;
      if (otherPallet.sscc === basePallet.sscc) continue;

      const mdOther = masterData.get(otherPallet.sku);
      if (!mdOther) continue;

      const newHeight = currentHeight + palletSupportHeight + otherPallet.height_actual;
      const newWeight = currentWeight + otherPallet.weight_actual;

      const canFitOnTop =
        mdOther.longueur <= mdBase.longueur &&
        mdOther.largeur <= mdBase.largeur;

      if (
        canFitOnTop &&
        newHeight <= truckMaxHeight * 1.02 &&
        newWeight <= maxWeight &&
        stackedOnThis.length < 1
      ) {
        stackedOnThis.push(otherPallet);
        currentHeight = newHeight;
        currentWeight = newWeight;
        used.add(otherPallet.sscc);
      }
    }

    used.add(basePallet.sscc);
    stackedUnits.push({
      base_pallet: basePallet,
      stacked_pallets: stackedOnThis,
      total_height: currentHeight,
      total_weight: currentWeight,
      dimensions: { l: mdBase.longueur, w: mdBase.largeur, h: currentHeight },
      pallet_type: mdBase.tus || "FEU",
    });
  });

  return stackedUnits;
}

function StackedPallet({ unit, position, isHighlighted, index }: any) {
  const { l, w } = unit.dimensions;
  const baseHeight = unit.base_pallet.height_actual;
  const hasStacked = unit.stacked_pallets.length > 0;
  const baseColor = unit.base_pallet.status === "full" 
    ? (hasStacked ? "#2e7d32" : "#1976d2")
    : "#f57c00";
  const highlightColor = isHighlighted ? "#ffeb3b" : baseColor;

  const palletSupportHeight = 0.15;
  const palletSupportColor = "#8B4513";

  const stackPositions: Array<{
    y: number;
    height: number;
    stacked: PalletInstance;
  }> = [];
  let cumulativeHeight = baseHeight;
  
  unit.stacked_pallets.forEach((stacked: PalletInstance) => {
    stackPositions.push({
      y: cumulativeHeight + palletSupportHeight + stacked.height_actual / 2,
      height: stacked.height_actual,
      stacked
    });
    cumulativeHeight += palletSupportHeight + stacked.height_actual;
  });

  return (
    <group position={position}>
      <group position={[0, palletSupportHeight / 2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[l, palletSupportHeight, w]} />
          <meshStandardMaterial 
            color={palletSupportColor}
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>
        <mesh position={[0, palletSupportHeight / 4, 0]}>
          <boxGeometry args={[l * 0.95, 0.02, w * 0.15]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
        <mesh position={[0, palletSupportHeight / 4, w * 0.35]}>
          <boxGeometry args={[l * 0.95, 0.02, w * 0.15]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
        <mesh position={[0, palletSupportHeight / 4, -w * 0.35]}>
          <boxGeometry args={[l * 0.95, 0.02, w * 0.15]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
      </group>

      <mesh position={[0, palletSupportHeight + baseHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[l, baseHeight, w]} />
        <meshStandardMaterial 
          color={highlightColor} 
          roughness={0.7}
          metalness={0.1}
        />
        <Edges color="#000000" linewidth={1.5} />
      </mesh>
      
      <Text 
        position={[0, palletSupportHeight + baseHeight / 2, w / 2 + 0.02]}
        rotation={[0, 0, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="black"
      >
        {index + 1}
      </Text>
      <Text 
        position={[0, palletSupportHeight + baseHeight / 2, -w / 2 - 0.02]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="black"
      >
        {index + 1}
      </Text>
      <Text 
        position={[l / 2 + 0.02, palletSupportHeight + baseHeight / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="black"
      >
        {index + 1}
      </Text>
      <Text 
        position={[-l / 2 - 0.02, palletSupportHeight + baseHeight / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="black"
      >
        {index + 1}
      </Text>

      {stackPositions.map((pos, idx) => (
        <group key={idx}>
          <group position={[0, pos.y - pos.height / 2 - palletSupportHeight / 2, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[l, palletSupportHeight, w]} />
              <meshStandardMaterial 
                color={palletSupportColor}
                roughness={0.9}
                metalness={0.0}
              />
            </mesh>
          </group>

          <mesh position={[0, pos.y, 0]} castShadow receiveShadow>
            <boxGeometry args={[l, pos.height, w]} />
            <meshStandardMaterial 
              color={isHighlighted ? "#ffeb3b" : "#e57373"} 
              roughness={0.7}
              metalness={0.1}
            />
            <Edges color="#000000" linewidth={1.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function placeUnitsOptimized(units: StackedUnit[], truck: any) {
  const placed: any[] = [];
  const unplaced: StackedUnit[] = [];
  if (units.length === 0) return { placed, unplaced };

  const sortedUnits = [...units].sort((a, b) => {
    if (Math.abs(a.dimensions.l - b.dimensions.l) > 0.01) {
      return a.dimensions.l - b.dimensions.l;
    }
    return b.total_height - a.total_height;
  });

  let cursorX = 0;
  let currentRow: StackedUnit[] = [];

  sortedUnits.forEach((unit, index) => {
    const { l, w } = unit.dimensions;
    const maxCols = Math.floor((truck.width + 0.01) / w);
    
    currentRow.push(unit);

    const isRowComplete = currentRow.length === maxCols;
    const isLastUnit = index === sortedUnits.length - 1;
    const nextUnitDifferentLength = index < sortedUnits.length - 1 && 
                                    Math.abs(sortedUnits[index + 1].dimensions.l - l) > 0.01;

    if (isRowComplete || isLastUnit || nextUnitDifferentLength) {
      if (cursorX + l > truck.length) {
        currentRow.forEach(u => unplaced.push(u));
        currentRow = [];
        return;
      }

      currentRow.sort((a, b) => b.total_height - a.total_height);

      currentRow.forEach((rUnit, colIdx) => {
        const xPos = cursorX + l / 2;
        let zPos = 0;
        const numInRow = currentRow.length;

        if (numInRow === 1) {
          zPos = truck.width / 2;
        } else if (numInRow === 2) {
          zPos = colIdx === 0 ? w / 2 : truck.width - w / 2;
        } else {
          zPos = w / 2 + (colIdx * w);
        }

        placed.push({
          unit: rUnit,
          x: xPos,
          y: 0,
          z: zPos,
        });
      });

      cursorX += l;
      currentRow = [];
    }
  });

  return { placed, unplaced };
}

export default function AdvancedLoadingSystem() {
  const { user } = useAuth();
  
  const [truckType, setTruckType] = useState<keyof typeof TRUCK_TYPES>("Semi 13.6m");
  const [palletListing, setPalletListing] = useState<Array<{ sscc: string; sku: string; quantity: number }>>([]);
  const [enableStacking, setEnableStacking] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [view3D, setView3D] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const uniqueSKUs = useMemo(() => {
    return [...new Set(palletListing.map(p => p.sku))];
  }, [palletListing]);

  const { masterData, loading: mdLoading } = useMasterData({
    skuFilter: uniqueSKUs.length > 0 ? uniqueSKUs : [],
    companyId: user?.company_id
  });

  const truck = TRUCK_TYPES[truckType];

  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setPalletListing(data.palletListing || []);
        setTruckType(data.truckType || "Semi 13.6m");
        setEnableStacking(data.enableStacking !== undefined ? data.enableStacking : true);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (palletListing.length > 0) {
      const dataToSave = {
        palletListing,
        truckType,
        enableStacking,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [palletListing, truckType, enableStacking]);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      
      if (lines.length < 2) {
        alert("Fichier vide ou invalide");
        return;
      }

      const pallets = lines.slice(1).map(line => {
        const [sscc, sku, quantity] = line.split(",").map(v => v.trim());
        return {
          sscc: sscc || "",
          sku: sku || "",
          quantity: parseFloat(quantity) || 0,
        };
      }).filter(p => p.sscc && p.sku && p.quantity > 0);

      // ✅ AJOUTE CETTE VALIDATION ICI
    if (pallets.length === 0) {
      alert("⚠️ Aucune palette valide trouvée dans le fichier");
      return;
    }

    // ✅ Vérifier que les SKU existent dans MasterData
    const skusInFile = [...new Set(pallets.map(p => p.sku))];
    
    const { data: existingSKUs, error } = await supabase
      .from("masterdata")
      .select("sku")
      .eq("company_id", user?.company_id)
      .in("sku", skusInFile);

    if (error) {
      console.error("Erreur vérification SKU:", error);
      alert("Erreur lors de la vérification des SKU");
      return;
    }

    const validSKUs = new Set(existingSKUs?.map((s: any) => s.sku) || []);
    const missingSKUs = skusInFile.filter(sku => !validSKUs.has(sku));

    if (missingSKUs.length > 0) {
      const shouldContinue = confirm(
        `⚠️ ATTENTION: ${missingSKUs.length} SKU n'existent pas dans MasterData:\n\n` +
        missingSKUs.slice(0, 10).join(", ") + 
        (missingSKUs.length > 10 ? `\n... et ${missingSKUs.length - 10} autres` : "") +
        `\n\nVoulez-vous continuer quand même ? (Les palettes avec ces SKU ne pourront pas être chargées)`
      );
      
      if (!shouldContinue) {
        return;
      }
    }
    // ✅ FIN DE LA VALIDATION


      setPalletListing(pallets);

      if (pallets.length > 0) {
        alert(`✓ ${pallets.length} palettes importées avec succès`);
      } else {
        alert("⚠️ Aucune palette valide trouvée dans le fichier");
      }
    } catch (error) {
      alert("Erreur lors de la lecture du fichier");
      console.error(error);
    }
  };

  const handleClearTruck = () => {
    if (confirm("Voulez-vous vraiment vider le camion ?")) {
      setPalletListing([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleRemovePallet = (ssccToRemove: string) => {
    if (confirm(`Supprimer la palette ${ssccToRemove} ?`)) {
      const updatedListing = palletListing.filter(p => p.sscc !== ssccToRemove);
      setPalletListing(updatedListing);
    }
  };

  const { stackedUnits, placedUnits, unplacedUnits, stats } = useMemo(() => {
    if (palletListing.length === 0 || masterData.size === 0) {
      return { stackedUnits: [], placedUnits: [], unplacedUnits: [], stats: null };
    }

    try {
      const pallets = reconstructPallets(palletListing, masterData);
      const units = enableStacking
        ? computeStacking(pallets, masterData, truck.height)
        : pallets.map(p => {
            const md = masterData.get(p.sku)!;
            return {
              base_pallet: p,
              stacked_pallets: [],
              total_height: p.height_actual,
              total_weight: p.weight_actual,
              dimensions: { l: md.longueur, w: md.largeur, h: p.height_actual },
              pallet_type: md.tus || "FEU",
            };
          });

      const unitsWithType = units.map(u => {
        const md = masterData.get(u.base_pallet.sku)!;
        return {
          ...u,
          pallet_type: md.tus || "FEU",
        };
      });

      const { placed, unplaced } = placeUnitsOptimized(unitsWithType, truck);
      const totalPallets = placed.reduce((sum: number, p: any) => sum + 1 + p.unit.stacked_pallets.length, 0);
      const totalWeight = placed.reduce((sum: number, p: any) => sum + p.unit.total_weight, 0);
      const totalVolume = placed.reduce((sum: number, p: any) => sum + p.unit.dimensions.l * p.unit.dimensions.w * p.unit.total_height, 0);
      const volumeUtilization = (totalVolume / (truck.length * truck.width * truck.height)) * 100;
      
      const totalFloorArea = placed.reduce((sum: number, p: any) => sum + p.unit.dimensions.l * p.unit.dimensions.w, 0);
      const truckFloorArea = truck.length * truck.width;
      const floorUtilization = (totalFloorArea / truckFloorArea) * 100;
      
      const stackedCount = placed.filter((p: any) => p.unit.stacked_pallets.length > 0).length;

      return {
        stackedUnits: unitsWithType,
        placedUnits: placed,
        unplacedUnits: unplaced,
        stats: { 
          totalPallets, 
          totalWeight, 
          volumeUtilization, 
          floorUtilization,
          totalFloorArea,
          truckFloorArea,
          stackedCount 
        },
      };
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
      return { stackedUnits: [], placedUnits: [], unplacedUnits: [], stats: null };
    }
  }, [palletListing, masterData, truck, enableStacking]);

  if (mdLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={48} />
      </div>
    );
  }

  const Canvas3DContent = () => (
    <>
      <color attach="background" args={[isDarkMode ? '#1f2937' : '#f3f4f6']} />
      <ambientLight intensity={isDarkMode ? 0.4 : 0.6} />
      <directionalLight position={[10, 10, 5]} intensity={isDarkMode ? 0.6 : 0.8} castShadow />
      <OrbitControls enableDamping dampingFactor={0.05} />
      
      <mesh position={[truck.length / 2, truck.height / 2, truck.width / 2]}>
        <boxGeometry args={[truck.length, truck.height, truck.width]} />
        <meshBasicMaterial visible={false} />
        <Edges color={isDarkMode ? "#9ca3af" : "#000000"} linewidth={2.5} />
      </mesh>
      
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[truck.length / 2, -0.01, truck.width / 2]} 
        receiveShadow
      >
        <planeGeometry args={[truck.length + 2, truck.width + 2]} />
        <meshStandardMaterial color={isDarkMode ? "#374151" : "#d1d5db"} roughness={0.8} metalness={0.2} />
      </mesh>
      
      <Grid 
        args={[truck.length + 2, truck.width + 2]} 
        sectionColor={isDarkMode ? "#4b5563" : "#9ca3af"} 
        cellColor={isDarkMode ? "#374151" : "#d1d5db"} 
        infiniteGrid={false} 
        position={[truck.length / 2, 0, truck.width / 2]} 
        cellSize={0.5} 
        fadeDistance={30} 
        sectionSize={1} 
      />
      
      {placedUnits.map((placed: any, idx: number) => (
        <StackedPallet 
          key={idx} 
          unit={placed.unit} 
          position={[placed.x, placed.y, placed.z]} 
          isHighlighted={highlightedIndex === idx} 
          index={idx} 
        />
      ))}

      {unplacedUnits.map((unit, idx) => {
        const { l, w } = unit.dimensions;
        const h = unit.total_height;
        const xPos = truck.length + 2 + (idx % 3) * 1.5;
        const zPos = Math.floor(idx / 3) * 1.5 + w / 2;
        
        return (
          <group key={`unplaced-${idx}`} position={[xPos, h / 2, zPos]}>
            <mesh castShadow>
              <boxGeometry args={[l, h, w]} />
              <meshStandardMaterial 
                color="#ef4444" 
                transparent
                opacity={0.6}
                roughness={0.7}
                metalness={0.1}
              />
              <Edges color="#dc2626" linewidth={2} />
            </mesh>
            <Text 
              position={[0, h * 0.3, w / 2 + 0.02]}
              fontSize={0.25}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="red"
            >
              ✗ NON CHARGÉ
            </Text>
          </group>
        );
      })}
    </>
  );

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Layers className="text-blue-600 dark:text-blue-400" size={32} />
            Chargement Intelligent
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {masterData.size} SKU chargés depuis MasterData
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Import palettes</h2>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="hidden"
                id="file-upload"
              />
              <label 
                htmlFor="file-upload" 
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              >
                <Upload size={18} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm">Choisir un fichier CSV</span>
              </label>
              
              {palletListing.length > 0 && (
                <button
                  onClick={handleClearTruck}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={18} />
                  <span className="text-sm">Vider le camion</span>
                </button>
              )}
            </div>
            {palletListing.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-md">
                <span className="font-medium">✓ {palletListing.length} palettes importées</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type de camion</label>
              <select
                value={truckType}
                onChange={(e) => setTruckType(e.target.value as keyof typeof TRUCK_TYPES)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.keys(TRUCK_TYPES).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options</label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enableStacking}
                  onChange={(e) => setEnableStacking(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-900 dark:text-gray-200">Gerbage automatique</span>
              </label>
            </div>
          </div>
        </div>

        {stats && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <Package className="text-blue-600 dark:text-blue-400 mb-2" size={24} />
                <p className="text-sm text-gray-600 dark:text-gray-400">Total palettes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPallets}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <Layers className="text-green-600 dark:text-green-400 mb-2" size={24} />
                <p className="text-sm text-gray-600 dark:text-gray-400">Unités gerbées</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.stackedCount}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <Weight className="text-orange-600 dark:text-orange-400 mb-2" size={24} />
                <p className="text-sm text-gray-600 dark:text-gray-400">Poids total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalWeight.toFixed(0)} kg</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <TrendingUp className="text-purple-600 dark:text-purple-400 mb-2" size={24} />
                <p className="text-sm text-gray-600 dark:text-gray-400">Taux volume</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.volumeUtilization.toFixed(1)}%</p>
              </div>
              <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border ${
                stats.floorUtilization >= 95 ? 'ring-2 ring-red-500 border-red-500 dark:border-red-600' : 
                stats.floorUtilization >= 85 ? 'ring-2 ring-orange-500 border-orange-500 dark:border-orange-600' : 
                'border-gray-200 dark:border-gray-700'
              }`}>
                <Maximize2 className={`mb-2 ${
                  stats.floorUtilization >= 95 ? 'text-red-600 dark:text-red-400' : 
                  stats.floorUtilization >= 85 ? 'text-orange-600 dark:text-orange-400' : 
                  'text-blue-600 dark:text-blue-400'
                }`} size={24} />
                <p className="text-sm text-gray-600 dark:text-gray-400">Taux sol</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.floorUtilization.toFixed(1)}%</p>
                {stats.floorUtilization >= 95 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">Sol saturé !</p>
                )}
              </div>
            </div>

            {stats.floorUtilization >= 90 && stats.volumeUtilization < 80 && unplacedUnits.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-orange-900 dark:text-orange-200">Optimisation possible</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Le sol est occupé à <strong>{stats.floorUtilization.toFixed(1)}%</strong> mais le volume n'est utilisé qu'à <strong>{stats.volumeUtilization.toFixed(1)}%</strong>.
                    <br />
                    Le gerbage automatique pourrait améliorer l'utilisation de l'espace en hauteur.
                  </p>
                </div>
              </div>
            )}

            {unplacedUnits.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-medium text-red-900 dark:text-red-200">
                    ⚠️ {unplacedUnits.length} palette(s) ne peuvent pas être chargées
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {placedUnits.length} palette(s) chargée(s) sur {stackedUnits.length} au total.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {placedUnits.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {view3D ? (
              <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vue 3D du chargement</h3>
                  <button
                    onClick={() => setView3D(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <List size={18} />
                    <span>Retour à la vue liste</span>
                  </button>
                </div>
                <Canvas 
                  camera={{ position: [25, 18, 30], fov: 60 }} 
                  style={{ height: 800 }} 
                  shadows={placedUnits.length < 50}
                  gl={{ alpha: false, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
                >
                  <Canvas3DContent />
                </Canvas>
              </div>
            ) : (
              <>
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aperçu 3D</h3>
                    <button
                      onClick={() => setView3D(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye size={18} />
                      <span>Vue 3D complète</span>
                    </button>
                  </div>
                  <Canvas 
                    camera={{ position: [25, 18, 30], fov: 60 }} 
                    style={{ height: 600 }} 
                    shadows={placedUnits.length < 50}
                    gl={{ alpha: false, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
                  >
                    <Canvas3DContent />
                  </Canvas>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col h-[600px] border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Unités ({placedUnits.length}/{stackedUnits.length})
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {placedUnits.map((placed: any, idx: number) => {
                      const unit = placed.unit;
                      
                      return (
                        <div
                          key={idx}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            unit.stacked_pallets.length > 0 
                              ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" 
                              : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                          } ${
                            highlightedIndex === idx ? "ring-2 ring-blue-500" : ""
                          }`}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          onMouseLeave={() => setHighlightedIndex(null)}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">#{idx + 1} - {unit.base_pallet.sscc}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePallet(unit.base_pallet.sscc);
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                            >
                              <X size={16} className="text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{unit.base_pallet.sku} - {unit.base_pallet.quantity} unités</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {unit.dimensions.l.toFixed(2)}m × {unit.dimensions.w.toFixed(2)}m × {unit.total_height.toFixed(2)}m
                          </p>
                          
                          {unit.stacked_pallets.length > 0 && (
                            <div className="mt-2 pl-3 border-l-2 border-green-500 dark:border-green-600">
                              <p className="text-xs font-medium text-green-700 dark:text-green-400">↑ Gerbé ({unit.stacked_pallets.length})</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {stackedUnits.length === 0 && !mdLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center border border-gray-200 dark:border-gray-700">
            <Package size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucune palette importée</h3>
            <p className="text-gray-600 dark:text-gray-400">Importez un fichier CSV pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}