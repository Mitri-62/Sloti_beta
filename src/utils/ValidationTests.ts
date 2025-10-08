/**
 * Utilitaires de validation et tests pour le système de gerbage
 */

interface MasterDataItem {
    sku: string;
    qty_per_pallet: number;
    poids_brut: number;
    longueur: number;
    largeur: number;
    hauteur: number;
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
  }
  
  interface StackedUnit {
    base_pallet: PalletInstance;
    stacked_pallets: PalletInstance[];
    total_height: number;
    total_weight: number;
  }
  
  interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
  }
  
  /**
   * Valide les données MasterData
   */
  export function validateMasterData(
    masterData: Map<string, MasterDataItem>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
  
    if (masterData.size === 0) {
      errors.push("MasterData vide");
      return { valid: false, errors, warnings };
    }
  
    masterData.forEach((item, sku) => {
      // Vérifications obligatoires
      if (!item.sku || item.sku !== sku) {
        errors.push(`SKU invalide: ${sku}`);
      }
      if (!item.qty_per_pallet || item.qty_per_pallet <= 0) {
        errors.push(`${sku}: qty_per_pallet doit être > 0`);
      }
      if (!item.poids_brut || item.poids_brut <= 0) {
        errors.push(`${sku}: poids_brut doit être > 0`);
      }
      if (!item.longueur || item.longueur <= 0) {
        errors.push(`${sku}: longueur doit être > 0`);
      }
      if (!item.largeur || item.largeur <= 0) {
        errors.push(`${sku}: largeur doit être > 0`);
      }
      if (!item.hauteur || item.hauteur <= 0) {
        errors.push(`${sku}: hauteur doit être > 0`);
      }
  
      // Avertissements
      if (item.stackable && !item.max_stack_weight) {
        warnings.push(
          `${sku}: stackable=true mais max_stack_weight non défini (utilisation de 2×poids_brut)`
        );
      }
      if (item.hauteur > 3) {
        warnings.push(`${sku}: hauteur > 3m (vérifier unité de mesure)`);
      }
      if (item.longueur > 2 || item.largeur > 2) {
        warnings.push(`${sku}: dimensions > 2m (vérifier dimensions palette)`);
      }
    });
  
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Valide le listing de palettes
   */
  export function validatePalletListing(
    listing: Array<{ sscc: string; sku: string; quantity: number }>,
    masterData: Map<string, MasterDataItem>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
  
    if (listing.length === 0) {
      errors.push("Listing de palettes vide");
      return { valid: false, errors, warnings };
    }
  
    const ssccSet = new Set<string>();
  
    listing.forEach((pallet, idx) => {
      const rowNum = idx + 1;
  
      // SSCC unique
      if (!pallet.sscc || pallet.sscc.trim() === "") {
        errors.push(`Ligne ${rowNum}: SSCC manquant`);
      } else if (ssccSet.has(pallet.sscc)) {
        errors.push(`Ligne ${rowNum}: SSCC ${pallet.sscc} en double`);
      } else {
        ssccSet.add(pallet.sscc);
      }
  
      // SKU existe
      if (!pallet.sku || !masterData.has(pallet.sku)) {
        errors.push(
          `Ligne ${rowNum}: SKU ${pallet.sku} introuvable dans MasterData`
        );
      }
  
      // Quantité valide
      if (!pallet.quantity || pallet.quantity <= 0) {
        errors.push(`Ligne ${rowNum}: quantité doit être > 0`);
      }
  
      // Vérifier quantité vs capacité
      const md = masterData.get(pallet.sku);
      if (md && pallet.quantity > md.qty_per_pallet * 1.5) {
        warnings.push(
          `Ligne ${rowNum}: quantité ${pallet.quantity} > 150% capacité palette (${md.qty_per_pallet})`
        );
      }
    });
  
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Valide le résultat du gerbage
   */
  export function validateStackedUnits(
    units: StackedUnit[],
    truck: { length: number; width: number; height: number },
    masterData: Map<string, MasterDataItem>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
  
    units.forEach((unit, idx) => {
      const md = masterData.get(unit.base_pallet.sku);
      if (!md) {
        errors.push(`Unité ${idx + 1}: SKU introuvable`);
        return;
      }
  
      // Vérifier hauteur
      if (unit.total_height > truck.height) {
        errors.push(
          `Unité ${idx + 1}: hauteur ${unit.total_height.toFixed(2)}m > camion ${truck.height}m`
        );
      }
  
      // Vérifier poids
      const maxWeight = md.max_stack_weight || md.poids_brut * 2;
      if (unit.total_weight > maxWeight) {
        errors.push(
          `Unité ${idx + 1}: poids ${unit.total_weight.toFixed(1)}kg > max ${maxWeight}kg`
        );
      }
  
      // Vérifier cohérence SKU
      unit.stacked_pallets.forEach((stacked) => {
        if (stacked.sku !== unit.base_pallet.sku) {
          errors.push(
            `Unité ${idx + 1}: SKU gerbé ${stacked.sku} ≠ base ${unit.base_pallet.sku}`
          );
        }
      });
  
      // Avertissements
      if (unit.stacked_pallets.length > 2) {
        warnings.push(`Unité ${idx + 1}: ${unit.stacked_pallets.length} palettes gerbées (>2)`);
      }
  
      if (unit.total_height > truck.height * 0.95) {
        warnings.push(
          `Unité ${idx + 1}: hauteur ${unit.total_height.toFixed(2)}m proche de la limite`
        );
      }
    });
  
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Génère un rapport de validation complet
   */
  export function generateValidationReport(
    masterData: Map<string, MasterDataItem>,
    palletListing: Array<{ sscc: string; sku: string; quantity: number }>,
    stackedUnits: StackedUnit[],
    truck: { length: number; width: number; height: number }
  ): string {
    let report = "=== RAPPORT DE VALIDATION ===\n\n";
  
    // Validation MasterData
    const mdValidation = validateMasterData(masterData);
    report += "1. MASTERDATA\n";
    report += `   Statut: ${mdValidation.valid ? "✓ OK" : "✗ ERREUR"}\n`;
    report += `   ${masterData.size} SKU chargés\n`;
    if (mdValidation.errors.length > 0) {
      report += `   Erreurs:\n`;
      mdValidation.errors.forEach((e) => (report += `     - ${e}\n`));
    }
    if (mdValidation.warnings.length > 0) {
      report += `   Avertissements:\n`;
      mdValidation.warnings.forEach((w) => (report += `     - ${w}\n`));
    }
    report += "\n";
  
    // Validation listing
    const listValidation = validatePalletListing(palletListing, masterData);
    report += "2. LISTING PALETTES\n";
    report += `   Statut: ${listValidation.valid ? "✓ OK" : "✗ ERREUR"}\n`;
    report += `   ${palletListing.length} palettes\n`;
    if (listValidation.errors.length > 0) {
      report += `   Erreurs:\n`;
      listValidation.errors.forEach((e) => (report += `     - ${e}\n`));
    }
    if (listValidation.warnings.length > 0) {
      report += `   Avertissements:\n`;
      listValidation.warnings.forEach((w) => (report += `     - ${w}\n`));
    }
    report += "\n";
  
    // Validation gerbage
    const stackValidation = validateStackedUnits(stackedUnits, truck, masterData);
    report += "3. RÉSULTAT GERBAGE\n";
    report += `   Statut: ${stackValidation.valid ? "✓ OK" : "✗ ERREUR"}\n`;
    report += `   ${stackedUnits.length} unités de chargement\n`;
    if (stackValidation.errors.length > 0) {
      report += `   Erreurs:\n`;
      stackValidation.errors.forEach((e) => (report += `     - ${e}\n`));
    }
    if (stackValidation.warnings.length > 0) {
      report += `   Avertissements:\n`;
      stackValidation.warnings.forEach((w) => (report += `     - ${w}\n`));
    }
    report += "\n";
  
    // Résumé
    const allValid =
      mdValidation.valid && listValidation.valid && stackValidation.valid;
    report += "=== RÉSUMÉ ===\n";
    report += allValid
      ? "✓ VALIDATION RÉUSSIE - Prêt pour le chargement\n"
      : "✗ VALIDATION ÉCHOUÉE - Corrections nécessaires\n";
  
    return report;
  }
  
  /**
   * Tests automatisés
   */
  export function runAutomatedTests(): void {
    console.log("🧪 Lancement des tests automatisés...\n");
  
    // Test 1: MasterData valide
    const validMD = new Map<string, MasterDataItem>([
      [
        "TEST001",
        {
          sku: "TEST001",
          qty_per_pallet: 100,
          poids_brut: 200,
          longueur: 1.2,
          largeur: 0.8,
          hauteur: 1.4,
          stackable: true,
          max_stack_weight: 400,
        },
      ],
    ]);
  
    const test1 = validateMasterData(validMD);
    console.log(
      `Test 1 - MasterData valide: ${test1.valid ? "✓ PASS" : "✗ FAIL"}`
    );
  
    // Test 2: MasterData invalide
    const invalidMD = new Map<string, MasterDataItem>([
      [
        "TEST002",
        {
          sku: "TEST002",
          qty_per_pallet: -10, // Invalide
          poids_brut: 0, // Invalide
          longueur: 1.2,
          largeur: 0.8,
          hauteur: 1.4,
          stackable: false,
        },
      ],
    ]);
  
    const test2 = validateMasterData(invalidMD);
    console.log(
      `Test 2 - MasterData invalide: ${!test2.valid ? "✓ PASS" : "✗ FAIL"}`
    );
  
    // Test 3: Listing valide
    const validListing = [
      { sscc: "SSCC001", sku: "TEST001", quantity: 100 },
      { sscc: "SSCC002", sku: "TEST001", quantity: 50 },
    ];
  
    const test3 = validatePalletListing(validListing, validMD);
    console.log(
      `Test 3 - Listing valide: ${test3.valid ? "✓ PASS" : "✗ FAIL"}`
    );
  
    // Test 4: Listing avec SKU manquant
    const invalidListing = [
      { sscc: "SSCC003", sku: "UNKNOWN", quantity: 100 },
    ];
  
    const test4 = validatePalletListing(invalidListing, validMD);
    console.log(
      `Test 4 - Listing invalide: ${!test4.valid ? "✓ PASS" : "✗ FAIL"}`
    );
  
    console.log("\n✅ Tests terminés");
  }