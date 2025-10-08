import { 
    useState, 
    useMemo, 
    useEffect, 
    JSXElementConstructor, 
    Key, 
    ReactElement, 
    ReactNode, 
    ReactPortal 
  } from "react";
  import { 
    Truck, 
    Package, 
    Layers, 
    Upload, 
    TrendingUp, 
    Loader2, 
    Trash2,
    X
  } from "lucide-react";
  import { Canvas } from "@react-three/fiber";
  import { OrbitControls, Edges, Grid, Text } from "@react-three/drei";
  import { useMasterData } from "../hooks/useMasterData";
  
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
  
  // ------------------- Reconstruction des palettes -------------------
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
  
  // ------------------- Calcul du gerbage -------------------
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
          position={[-l * 0.35, palletSupportHeight + baseHeight * 0.2, w / 2 + 0.02]}
          rotation={[0, 0, 0]}
          fontSize={0.3}
          color="white"
          anchorX="left"
          anchorY="bottom"
          outlineWidth={0.04}
          outlineColor="black"
        >
          {index + 1}
        </Text>
        <Text 
          position={[l * 0.35, palletSupportHeight + baseHeight * 0.2, -w / 2 - 0.02]}
          rotation={[0, Math.PI, 0]}
          fontSize={0.3}
          color="white"
          anchorX="left"
          anchorY="bottom"
          outlineWidth={0.04}
          outlineColor="black"
        >
          {index + 1}
        </Text>
        <Text 
          position={[l / 2 + 0.02, palletSupportHeight + baseHeight * 0.2, -w * 0.35]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.3}
          color="white"
          anchorX="left"
          anchorY="bottom"
          outlineWidth={0.04}
          outlineColor="black"
        >
          {index + 1}
        </Text>
        <Text 
          position={[-l / 2 - 0.02, palletSupportHeight + baseHeight * 0.2, w * 0.35]}
          rotation={[0, -Math.PI / 2, 0]}
          fontSize={0.3}
          color="white"
          anchorX="left"
          anchorY="bottom"
          outlineWidth={0.04}
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
              <mesh position={[0, palletSupportHeight / 4, 0]}>
                <boxGeometry args={[l * 0.95, 0.02, w * 0.15]} />
                <meshStandardMaterial color="#654321" />
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
  
        {hasStacked && (
          <mesh position={[l / 2 + 0.15, (palletSupportHeight + baseHeight + cumulativeHeight) / 2, 0]}>
            <coneGeometry args={[0.1, 0.25, 4]} />
            <meshStandardMaterial color="#d32f2f" />
          </mesh>
        )}
      </group>
    );
  }
  
  function placeUnitsOptimized(units: StackedUnit[], truck: any) {
    const placed: any[] = [];
    if (units.length === 0) return placed;
  
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
          console.warn(`Palette dépassant la longueur du camion`);
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
          } else if (numInRow === 3) {
            zPos = w / 2 + (colIdx * w);
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
  
    return placed;
  }
  
  export default function AdvancedLoadingSystem() {
    const { masterData, loading: mdLoading } = useMasterData();
    const [truckType, setTruckType] = useState<keyof typeof TRUCK_TYPES>("Semi 13.6m");
    const [palletListing, setPalletListing] = useState<Array<{ sscc: string; sku: string; quantity: number }>>([]);
    const [enableStacking, setEnableStacking] = useState(true);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  
    const truck = TRUCK_TYPES[truckType];
  
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
  
    const { stackedUnits, placedUnits, stats } = useMemo(() => {
      if (palletListing.length === 0 || masterData.size === 0) {
        return { stackedUnits: [], placedUnits: [], stats: null };
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
  
        const placed = placeUnitsOptimized(unitsWithType, truck);
        const totalPallets = unitsWithType.reduce((sum, u) => sum + 1 + u.stacked_pallets.length, 0);
        const totalWeight = unitsWithType.reduce((sum, u) => sum + u.total_weight, 0);
        const totalVolume = unitsWithType.reduce((sum, u) => sum + u.dimensions.l * u.dimensions.w * u.total_height, 0);
        const volumeUtilization = (totalVolume / (truck.length * truck.width * truck.height)) * 100;
        const stackedCount = unitsWithType.filter(u => u.stacked_pallets.length > 0).length;
  
        return {
          stackedUnits: unitsWithType,
          placedUnits: placed,
          stats: { totalPallets, totalWeight, volumeUtilization, stackedCount },
        };
      } catch (error: any) {
        alert(`Erreur: ${error.message}`);
        return { stackedUnits: [], placedUnits: [], stats: null };
      }
    }, [palletListing, masterData, truck, enableStacking]);
  
    if (mdLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      );
    }
  
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Layers className="text-blue-600" size={32} />
              Chargement Intelligent
            </h1>
            <p className="text-gray-600 mt-2">
              {masterData.size} SKU chargés depuis MasterData
            </p>
          </div>
  
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold">Import palettes</h2>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileImport}
                  className="hidden"
                  id="file-upload"
                />
                <label 
                  htmlFor="file-upload" 
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Upload size={18} className="text-gray-500" />
                  <span className="text-sm text-gray-700">Choisir un fichier CSV</span>
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
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-md">
                  <span className="font-medium">✓ {palletListing.length} palettes importées</span>
                </div>
              )}
            </div>
          </div>
  
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de camion</label>
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value as keyof typeof TRUCK_TYPES)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {Object.keys(TRUCK_TYPES).map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enableStacking}
                    onChange={(e) => setEnableStacking(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Gerbage automatique</span>
                </label>
              </div>
            </div>
          </div>
  
          {stats && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <Package className="text-blue-600 mb-2" size={24} />
                <p className="text-sm text-gray-600">Total palettes</p>
                <p className="text-2xl font-bold">{stats.totalPallets}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <Layers className="text-green-600 mb-2" size={24} />
                <p className="text-sm text-gray-600">Unités gerbées</p>
                <p className="text-2xl font-bold">{stats.stackedCount}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <TrendingUp className="text-orange-600 mb-2" size={24} />
                <p className="text-sm text-gray-600">Poids total</p>
                <p className="text-2xl font-bold">{stats.totalWeight.toFixed(0)} kg</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <TrendingUp className="text-purple-600 mb-2" size={24} />
                <p className="text-sm text-gray-600">Taux remplissage</p>
                <p className="text-2xl font-bold">{stats.volumeUtilization.toFixed(1)}%</p>
              </div>
            </div>
          )}
  
          {placedUnits.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
                <Canvas 
                  camera={{ position: [25, 18, 30], fov: 60 }} 
                  style={{ height: 600 }} 
                  shadows
                  gl={{ 
                    alpha: false, 
                    antialias: true,
                    powerPreference: "high-performance"
                  }}
                >
                  <color attach="background" args={['#f3f4f6']} />
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
                  
                  <mesh position={[truck.length / 2, truck.height / 2, truck.width / 2]}>
                    <boxGeometry args={[truck.length, truck.height, truck.width]} />
                    <meshBasicMaterial visible={false} />
                    <Edges color="#000000" linewidth={2.5} />
                  </mesh>
                  
                  <mesh 
                    rotation={[-Math.PI / 2, 0, 0]} 
                    position={[truck.length / 2, -0.01, truck.width / 2]} 
                    receiveShadow
                  >
                    <planeGeometry args={[truck.length + 2, truck.width + 2]} />
                    <meshStandardMaterial 
                      color="#d1d5db" 
                      roughness={0.8} 
                      metalness={0.2}
                    />
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
                  
                  {placedUnits.map((placed: any, idx: number) => (
                    <StackedPallet 
                      key={idx} 
                      unit={placed.unit} 
                      position={[placed.x, placed.y, placed.z]} 
                      isHighlighted={highlightedIndex === idx} 
                      index={idx} 
                    />
                  ))}
                </Canvas>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4 flex flex-col h-[600px]">
                <h3 className="text-lg font-semibold mb-4">Unités ({stackedUnits.length})</h3>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {placedUnits.map((placed, idx) => {
                    const unit = placed.unit;
                    const orientation = unit.dimensions.l > unit.dimensions.w ? "Long" : "Large";
                    
                    return (
                      <div
                        key={idx}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${unit.stacked_pallets.length > 0 ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-200"} ${highlightedIndex === idx ? "ring-2 ring-blue-500" : ""}`}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onMouseLeave={() => setHighlightedIndex(null)}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">#{idx + 1}</span>
                            <span className="text-xs text-gray-600">{unit.base_pallet.sscc}</span>
                            {unit.base_pallet.status === "partial" && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">Incomplète</span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePallet(unit.base_pallet.sscc);
                            }}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                            title="Supprimer cette palette"
                          >
                            <X size={16} className="text-red-600" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-600">{unit.base_pallet.sku} - {unit.base_pallet.quantity} unités</p>
                        <p className="text-xs text-gray-500">
                          {unit.dimensions.l.toFixed(2)}m × {unit.dimensions.w.toFixed(2)}m × {unit.total_height.toFixed(2)}m • {unit.total_weight.toFixed(0)}kg
                        </p>
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          {unit.pallet_type || "FEU"} - {orientation}
                        </p>
                        
                        {unit.stacked_pallets.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-green-500 space-y-1">
                            <p className="text-xs font-medium text-green-700">↑ Gerbé ({unit.stacked_pallets.length})</p>
                            {unit.stacked_pallets.map((s: PalletInstance, i: Key | null | undefined) => {
                              const stackedMd = masterData.get(s.sku);
                              return (
                                <div key={i} className="bg-white/50 rounded p-2 space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-gray-700">{s.sscc}</p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemovePallet(s.sscc);
                                    }}
                                    className="p-0.5 hover:bg-red-100 rounded transition-colors"
                                    title="Supprimer cette palette"
                                  >
                                    <X size={12} className="text-red-600" />
                                  </button>
                                </div>
                                <p className="text-xs text-gray-600">{s.sku} - {s.quantity} unités</p>
                                {stackedMd && (
                                  <>
                                    <p className="text-xs text-gray-500">
                                      {stackedMd.longueur.toFixed(2)}m × {stackedMd.largeur.toFixed(2)}m × {s.height_actual.toFixed(2)}m
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {s.weight_actual.toFixed(0)}kg • {s.status === "full" ? "Complète" : "Incomplète"}
                                    </p>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {stackedUnits.length === 0 && !mdLoading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Package size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune palette importée</h3>
            <p className="text-gray-600">Importez un fichier CSV depuis SortiesStock</p>
          </div>
        )}
      </div>
    </div>
  );
}