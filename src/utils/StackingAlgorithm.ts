// Algorithme de gerbage intelligent pour optimisation du chargement

interface MasterDataItem {
    sku: string;
    qty_per_pallet: number;
    poids_net: number;
    poids_brut: number;
    longueur: number;
    largeur: number;
    hauteur: number;
    hauteur_couche: number;
    nb_couches: number;
    stackable: boolean;
    max_stack_weight?: number;
  }
  
  interface PalletInstance {
    sscc: string;
    sku: string;
    quantity: number;
    status: "full" | "partial";
    height_actual: number;
    weight_actual: number;
    stacked_on?: string;
    is_base?: boolean;
  }
  
  interface StackedUnit {
    base_pallet: PalletInstance;
    stacked_pallets: PalletInstance[];
    total_height: number;
    total_weight: number;
    dimensions: { l: number; w: number; h: number };
  }
  
  /**
   * Reconstruit les palettes réelles depuis un listing avec calculs de hauteur/poids
   */
  export function reconstructPallets(
    listing: Array<{ sscc: string; sku: string; quantity: number }>,
    masterData: Map<string, MasterDataItem>
  ): PalletInstance[] {
    return listing.map(item => {
      const md = masterData.get(item.sku);
      if (!md) throw new Error(`SKU ${item.sku} not found in MasterData`);
  
      const fillRatio = item.quantity / md.qty_per_pallet;
      const height_actual = fillRatio * md.hauteur;
      const weight_actual = fillRatio * md.poids_brut;
      const status = item.quantity >= md.qty_per_pallet ? "full" : "partial";
  
      return {
        sscc: item.sscc,
        sku: item.sku,
        quantity: item.quantity,
        status,
        height_actual,
        weight_actual,
      };
    });
  }
  
  /**
   * Algorithme de gerbage : associe les palettes incomplètes aux pleines
   */
  function computeStacking(
  pallets: PalletInstance[],
  masterData: any,
  truckMaxHeight: number
): StackedUnit[] {
  const stackedUnits: StackedUnit[] = [];
  const used = new Set<string>();
  const fullPallets = pallets.filter(p => p.status === "full");
  const partialPallets = pallets.filter(p => p.status === "partial");

  // Gerbage des palettes pleines
  fullPallets.forEach(basePallet => {
    if (used.has(basePallet.sscc)) return;
    const md = masterData.get(basePallet.sku);
    
    if (!md || !md.stackable || basePallet.height_actual > truckMaxHeight) {
      stackedUnits.push({
        base_pallet: basePallet,
        stacked_pallets: [],
        total_height: basePallet.height_actual,
        total_weight: basePallet.weight_actual,
        dimensions: { l: md!.longueur, w: md!.largeur, h: basePallet.height_actual },
      });
      used.add(basePallet.sscc);
      return;
    }

    used.add(basePallet.sscc);
    stackedUnits.push({
      base_pallet: basePallet,
      stacked_pallets: [],
      total_height: basePallet.height_actual,
      total_weight: basePallet.weight_actual,
      dimensions: { l: md.longueur, w: md.largeur, h: basePallet.height_actual },
    });
  });

  // Trier les palettes incomplètes par hauteur décroissante (plus grande en premier)
  const sortedPartials = [...partialPallets].sort((a, b) => b.height_actual - a.height_actual);

  // Gerbage des palettes incomplètes : base = les plus grandes
  sortedPartials.forEach(basePallet => {
    if (used.has(basePallet.sscc)) return;
    const md = masterData.get(basePallet.sku);
    
    if (!md || !md.stackable || basePallet.height_actual > truckMaxHeight) {
      stackedUnits.push({
        base_pallet: basePallet,
        stacked_pallets: [],
        total_height: basePallet.height_actual,
        total_weight: basePallet.weight_actual,
        dimensions: { l: md!.longueur, w: md!.largeur, h: basePallet.height_actual },
      });
      used.add(basePallet.sscc);
      return;
    }

    const stackedOnThis: PalletInstance[] = [];
    let currentHeight = basePallet.height_actual;
    let currentWeight = basePallet.weight_actual;

    // Chercher d'autres palettes incomplètes à gerber (sans restriction de SKU)
    for (const partial of sortedPartials) {
      if (used.has(partial.sscc)) continue;
      if (partial.sscc === basePallet.sscc) continue;

      const partialMd = masterData.get(partial.sku);
      if (!partialMd) continue;

      const newHeight = currentHeight + partial.height_actual;
      const newWeight = currentWeight + partial.weight_actual;
      const maxWeight = md.max_stack_weight || 1000;

      // CRITIQUE : vérifier la hauteur max du camion
      if (newHeight <= truckMaxHeight && newWeight <= maxWeight) {
        stackedOnThis.push(partial);
        currentHeight = newHeight;
        currentWeight = newWeight;
        used.add(partial.sscc);
      }
    }

    used.add(basePallet.sscc);
    stackedUnits.push({
      base_pallet: basePallet,
      stacked_pallets: stackedOnThis,
      total_height: currentHeight,
      total_weight: currentWeight,
      dimensions: { l: md.longueur, w: md.largeur, h: currentHeight },
    });
  });

  return stackedUnits;
}
  
  function createSingleUnit(
    pallet: PalletInstance,
    md: MasterDataItem
  ): StackedUnit {
    return {
      base_pallet: pallet,
      stacked_pallets: [],
      total_height: pallet.height_actual,
      total_weight: pallet.weight_actual,
      dimensions: {
        l: md.longueur,
        w: md.largeur,
        h: pallet.height_actual,
      },
    };
  }
  
  /**
   * Placement optimisé des unités gerbées dans le camion
   */
  export function placeStackedUnits(
    units: StackedUnit[],
    truck: { length: number; width: number; height: number },
    orientation: "long" | "large" = "long"
  ) {
    const placed: Array<{
      unit: StackedUnit;
      x: number;
      y: number;
      z: number;
    }> = [];
  
    let cursorX = 0;
    let cursorZ = 0;
    let rowMaxHeight = 0;
    let rowMaxLength = 0;
  
    for (const unit of units) {
      let l = unit.dimensions.l;
      let w = unit.dimensions.w;
      if (orientation === "large") [l, w] = [w, l];
  
      // Vérifier si on peut placer dans la rangée actuelle
      if (cursorZ + w > truck.width) {
        // Nouvelle rangée
        cursorX += rowMaxLength;
        cursorZ = 0;
        rowMaxHeight = 0;
        rowMaxLength = 0;
      }
  
      // Vérifier si on dépasse la longueur
      if (cursorX + l > truck.length) {
        console.warn(`Unit ${unit.base_pallet.sscc} ne peut pas être placée`);
        continue;
      }
  
      // Placer l'unité
      placed.push({
        unit,
        x: cursorX + l / 2,
        y: unit.total_height / 2,
        z: cursorZ + w / 2,
      });
  
      cursorZ += w;
      rowMaxHeight = Math.max(rowMaxHeight, unit.total_height);
      rowMaxLength = Math.max(rowMaxLength, l);
    }
  
    return placed;
  }
  
  /*
 Statistiques du chargement
  */
 export function computeLoadingStats(
   stackedUnits: StackedUnit[],
   truck: { length: number; width: number; height: number }
 ) {
   const totalPallets = stackedUnits.reduce(
     (sum, u) => sum + 1 + u.stacked_pallets.length,
     0
   );
   const totalWeight = stackedUnits.reduce((sum, u) => sum + u.total_weight, 0);
   const totalVolume = stackedUnits.reduce(
     (sum, u) => sum + u.dimensions.l * u.dimensions.w * u.total_height,
     0
   );
 
   const truckVolume = truck.length * truck.width * truck.height;
   const volumeUtilization = (totalVolume / truckVolume) * 100;
 
   // NOUVEAU : Calcul du taux de remplissage au sol
   const totalFloorArea = stackedUnits.reduce(
     (sum, u) => sum + u.dimensions.l * u.dimensions.w,
     0
   );
   
   const truckFloorArea = truck.length * truck.width;
   const floorUtilization = (totalFloorArea / truckFloorArea) * 100;
 
   const stackedCount = stackedUnits.filter(u => u.stacked_pallets.length > 0).length;
 
   return {
     totalPallets,
     totalWeight,
     totalVolume,
     volumeUtilization,
     floorUtilization,  // NOUVEAU
     totalFloorArea,    // NOUVEAU
     truckFloorArea,    // NOUVEAU
     stackedCount,
     truckVolume,
   };
 }