import { WarehouseConfig, PalletConfig } from './types';

// Configuration par défaut de l'entrepôt
export const DEFAULT_CONFIG: WarehouseConfig = {
  rows: 3,
  racksPerRow: 4,
  aisleWidth: 6.0,
  rackHeight: 7,
  rackDepth: 1.4,
  bayWidth: 4.0,
  levelCount: 3
};

// Nombre max de positions par alvéole
export const MAX_POSITIONS = 4;

// Dimensions des palettes
export const PALLET_CONFIG: Record<'EUR' | 'CHEP', PalletConfig> = {
  EUR: {
    positions: 1,      // Occupe 1 position logique
    maxPerAlveole: 4,  // Max 4 EUR par alvéole (80cm × 4 = 320cm)
    w: 0.8,            // 80cm de large
    d: 1.2,            // 120cm de profondeur
    h: 0.144,
    color: 0xcd853f,
    name: 'Europe'
  },
  CHEP: {
    positions: 1.33,   // ✅ Occupe ~1.33 positions (100cm vs 80cm EUR)
    maxPerAlveole: 3,  // Max 3 CHEP par alvéole (100cm × 3 = 300cm)
    w: 1.0,            // 100cm de large
    d: 1.2,            // 120cm de profondeur
    h: 0.144,
    color: 0x0066cc,
    name: 'CHEP'
  }
};

// Dimensions calculées des racks
export const RACK_W = DEFAULT_CONFIG.bayWidth + 0.1;
export const RACK_D = DEFAULT_CONFIG.rackDepth + 0.1;

// Configuration First Person
export const FP_CONFIG = {
  eyeHeight: 1.70,
  moveSpeed: 5.0,
  sprintMultiplier: 2.0,
  mouseSensitivity: 0.002,
  collisionRadius: 0.4,
  minPitch: -Math.PI / 3,
  maxPitch: Math.PI / 3,
};

// Couleurs par thème
export const getThemeColors = (isDark: boolean) => ({
  bg: isDark ? 0x1a1a2e : 0xf8fafc,
  floor: isDark ? 0x2d2d44 : 0xe2e8f0,
  fog: isDark ? 0x1a1a2e : 0xf1f5f9,
  rack: isDark ? 0x60a5fa : 0x3b82f6,
  beam: isDark ? 0xfbbf24 : 0xf59e0b,
  grid1: isDark ? 0x4a4a6a : 0x94a3b8,
  grid2: isDark ? 0x3a3a5a : 0xcbd5e1
});

// Couleur selon quantité de stock
export const getStockColor = (quantity: number): number => {
  if (quantity === 0) return 0xef4444;
  if (quantity < 10) return 0xf59e0b;
  if (quantity < 50) return 0x3b82f6;
  return 0x10b981;
};