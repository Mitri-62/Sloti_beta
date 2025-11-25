import { ParsedLocation, SlotStock } from './types';

// Génère un code de rack (A, B, ..., Z, AA, AB, ...)
export const genRackCode = (index: number): string => {
  let code = '';
  let n = index;
  do {
    code = String.fromCharCode(65 + (n % 26)) + code;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return code;
};

// Parse un emplacement (ex: "A-1-4", "H01", "A1")
export const parseEmplacement = (e: string | null | undefined): ParsedLocation | null => {
  if (!e) return null;

  // Format A-1-4 ou A.1.4 ou A/1/4
  let m = e.match(/^([A-Za-z]+)[-._\/](\d+)[-._\/](\d+)$/);
  if (m) return { rackCode: m[1].toUpperCase(), level: +m[2], position: +m[3] };

  // Format A-1 (rack-niveau, position 1 par défaut)
  m = e.match(/^([A-Za-z]+)[-._\/](\d+)$/);
  if (m) return { rackCode: m[1].toUpperCase(), level: +m[2], position: 1 };

  // Format H01, K01 (lettre + 2 chiffres = rack + niveau)
  m = e.match(/^([A-Za-z])(\d)(\d)$/);
  if (m) return { rackCode: m[1].toUpperCase(), level: +m[2] || 1, position: +m[3] || 1 };

  // Format KBF, ABC (lettres seulement = rack, niveau 1, position 1)
  m = e.match(/^([A-Za-z]+)$/);
  if (m) return { rackCode: m[1].substring(0, 1).toUpperCase(), level: 1, position: 1 };

  // Format A1 (lettre + chiffre)
  m = e.match(/^([A-Za-z]+)(\d+)$/);
  if (m) return { rackCode: m[1].toUpperCase(), level: +m[2], position: 1 };

  return null;
};

// Normalise le type de palette
export const normalizeTus = (tus: string | null | undefined): 'EUR' | 'CHEP' | null => {
  if (!tus) return null;
  const upper = tus.toUpperCase().trim();
  if (['EUR', 'EURO', 'EUROPE', 'EPAL', 'FEU'].includes(upper)) return 'EUR';
  if (['CHEP', 'CP', 'FCH'].includes(upper)) return 'CHEP';
  if (['CAR', 'BAC'].includes(upper)) return 'EUR';
  return null;
};

// Nombre de positions utilisées par type de palette
export const getPositionsUsed = (tus: 'EUR' | 'CHEP' | null): number => {
  // CHEP (100cm) prend plus de place que EUR (80cm)
  // Sur une baie de ~330cm : 4 EUR max ou 3 CHEP max
  if (tus === 'CHEP') return 1.33; // 4/3 = 1.33 positions équivalentes
  return 1;
};

// Vérifie si une alvéole est en dépassement
// Baie de ~330cm : 4 EUR (80cm) ou 3 CHEP (100cm) max
export const checkAlveoleOverflow = (slots: Map<number, SlotStock>): boolean => {
  let totalWidth = 0;
  slots.forEach(slot => {
    if (slot.tus === 'CHEP') totalWidth += 100; // 100cm
    else totalWidth += 80; // 80cm EUR par défaut
  });
  return totalWidth > 330; // Baie de 330cm max
};

// ✅ Calcule le taux de remplissage d'une alvéole (0-100%)
export const getAlveoleFillRate = (slots: Map<number, SlotStock>): number => {
  let totalWidth = 0;
  slots.forEach(slot => {
    if (slot.tus === 'CHEP') totalWidth += 100;
    else totalWidth += 80;
  });
  return Math.min(100, Math.round((totalWidth / 330) * 100));
};

// Calcule les bounds d'un rack pour collision
export const getRackBounds = (
  x: number,
  z: number,
  rotation: number,
  rackW: number,
  rackD: number
) => {
  const isRotated = Math.abs(rotation % Math.PI) > 0.1;
  const w = isRotated ? rackD : rackW;
  const d = isRotated ? rackW : rackD;
  return {
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2
  };
};