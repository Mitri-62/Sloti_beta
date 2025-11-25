import * as THREE from 'three';
import { RackData, WarehouseConfig, WarehouseColors } from '../types';
import { PALLET_CONFIG, MAX_POSITIONS, getStockColor } from '../config';
import { createPallet } from './createPallet';

// ✅ Géométries partagées (créées UNE SEULE FOIS)
const SHARED_GEOM = {
  upright: new THREE.BoxGeometry(0.08, 1, 0.08),
  beam: new THREE.BoxGeometry(1, 0.1, 0.05),
  deck: new THREE.PlaneGeometry(1, 1),
  box: new THREE.BoxGeometry(1, 1, 1),
};

// ✅ Cache de matériaux (évite de recréer)
const materialCache = new Map<string, THREE.MeshStandardMaterial>();

const getMaterial = (key: string, props: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => {
  const cacheKey = `${key}-${JSON.stringify(props)}`;
  if (!materialCache.has(cacheKey)) {
    materialCache.set(cacheKey, new THREE.MeshStandardMaterial(props));
  }
  return materialCache.get(cacheKey)!;
};

interface CreateRackOptions {
  scene: THREE.Scene;
  rackData: RackData;
  config: WarehouseConfig;
  colors: WarehouseColors;
  isEditMode: boolean;
  selectedRackId: string | null;
  hoveredRack: string | null;
  showLabels: boolean;
  labelSprites: THREE.Sprite[];
}

export const createRack = ({
  scene, rackData, config, colors, isEditMode, selectedRackId, hoveredRack, showLabels, labelSprites
}: CreateRackOptions): void => {
  const { rackCode, stockByLevel, id, rotation } = rackData;
  const { rackHeight, rackDepth, bayWidth, levelCount } = config;
  const group = new THREE.Group();

  group.position.set(rackData.x, 0, rackData.z);
  group.rotation.y = rotation;
  group.userData = { rackId: id, location: rackCode, isRack: true };

  // Calculer les stats du rack
  let totalQty = 0, hasOverflow = false, occupiedPositions = 0;
  stockByLevel.forEach(alv => {
    if (alv.isOverflow) hasOverflow = true;
    alv.slots.forEach(s => {
      totalQty += s.totalQuantity;
      occupiedPositions++; // ✅ Compter les positions occupées
    });
  });

  const isHov = hoveredRack === rackCode;
  const isSel = selectedRackId === id;

  // ✅ Matériau frame avec cache
  const frameColor = hasOverflow ? 0xef4444 : (isSel ? 0x22c55e : colors.rack);
  const frameEmissive = isSel ? 0x22c55e : (isHov && isEditMode ? 0x60a5fa : (hasOverflow ? 0xef4444 : 0x000000));
  const frameEmissiveIntensity = isSel ? 0.5 : (isHov && isEditMode ? 0.3 : (hasOverflow ? 0.3 : 0));
  
  const frameMat = getMaterial(`frame-${frameColor}-${frameEmissive}`, {
    color: frameColor,
    metalness: 0.8,
    roughness: 0.2,
    emissive: frameEmissive,
    emissiveIntensity: frameEmissiveIntensity
  });

  // ✅ Montants verticaux (4 par rack) - Utilise géométrie partagée + scale
  const uprightPositions = [
    [-bayWidth / 2, -rackDepth / 2 + 0.04],
    [-bayWidth / 2, rackDepth / 2 - 0.04],
    [bayWidth / 2, -rackDepth / 2 + 0.04],
    [bayWidth / 2, rackDepth / 2 - 0.04],
  ];

  uprightPositions.forEach(([px, pz]) => {
    const upright = new THREE.Mesh(SHARED_GEOM.upright, frameMat);
    upright.scale.y = rackHeight; // Scale au lieu de nouvelle géométrie
    upright.position.set(px, rackHeight / 2, pz);
    upright.castShadow = true;
    group.add(upright);
  });

  const lvlH = (rackHeight - 0.3) / levelCount;

  // Niveaux
  for (let lv = 1; lv <= levelCount; lv++) {
    const y = 0.3 + lvlH * (lv - 1);
    const alveole = stockByLevel.get(lv);
    
    // ✅ Couleur poutre
    const beamColor = alveole?.isOverflow ? 0xef4444 : (isSel ? 0x16a34a : colors.beam);
    const beamMat = getMaterial(`beam-${beamColor}`, { 
      color: beamColor, 
      metalness: 0.7, 
      roughness: 0.3 
    });

    // Poutres horizontales (2 par niveau)
    [-rackDepth / 2 + 0.06, rackDepth / 2 - 0.06].forEach(bz => {
      const beam = new THREE.Mesh(SHARED_GEOM.beam, beamMat);
      beam.scale.x = bayWidth - 0.1;
      beam.position.set(0, y, bz);
      beam.castShadow = true;
      group.add(beam);
    });

    // ✅ Deck (plateau)
    const deckColor = alveole?.isOverflow ? 0xef4444 : 0x6b7280;
    const deckMat = getMaterial(`deck-${deckColor}`, {
      color: deckColor,
      metalness: 0.6,
      roughness: 0.4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    
    const deck = new THREE.Mesh(SHARED_GEOM.deck, deckMat);
    deck.scale.set(bayWidth - 0.15, rackDepth - 0.12, 1);
    deck.rotation.x = -Math.PI / 2;
    deck.position.set(0, y + 0.06, 0);
    deck.receiveShadow = true;
    group.add(deck);

    // Label niveau (sprite léger)
    const levelSprite = createLevelSprite(lv, alveole?.isOverflow || false);
    levelSprite.position.set(-bayWidth / 2 - 0.3, y + lvlH / 2, 0);
    group.add(levelSprite);

    // Stock sur ce niveau
    if (alveole && alveole.slots.size > 0) {
      const sortedSlots = Array.from(alveole.slots.values()).sort((a, b) => a.position - b.position);
      let currentX = -bayWidth / 2 + 0.2;

      sortedSlots.forEach(slot => {
        const pCfg = slot.tus === 'CHEP' ? PALLET_CONFIG.CHEP : PALLET_CONFIG.EUR;
        const posX = currentX + pCfg.w / 2;

        if (slot.totalQuantity > 0) {
          // Palette
          const pallet = createPallet(slot.tus);
          pallet.position.set(posX, y + 0.07, 0);
          group.add(pallet);

          // ✅ Box marchandise - géométrie partagée + scale
          const maxH = lvlH - pCfg.h - 0.25;
          const h = Math.max(0.15, maxH * Math.min(1, slot.totalQuantity / 100));
          const boxColor = alveole.isOverflow ? 0xef4444 : getStockColor(slot.totalQuantity);
          const boxMat = getMaterial(`box-${boxColor}`, { 
            color: boxColor, 
            metalness: 0.1, 
            roughness: 0.9 
          });
          
          const box = new THREE.Mesh(SHARED_GEOM.box, boxMat);
          box.scale.set(pCfg.w * 0.9, h, pCfg.d * 0.9);
          box.position.set(posX, y + 0.07 + pCfg.h + h / 2, 0);
          box.castShadow = true;
          group.add(box);

          // Label quantité (sprite)
          const qtySprite = createQuantitySprite(slot.totalQuantity, slot.tus, slot.position, alveole.isOverflow);
          qtySprite.position.set(posX, y + 0.07 + pCfg.h + h + 0.3, rackDepth / 2 + 0.15);
          group.add(qtySprite);
        }
        currentX += pCfg.w + 0.08;
      });

      // Warning overflow
      if (alveole.isOverflow) {
        const warnSprite = createWarningSprite(alveole.totalPositionsUsed);
        warnSprite.position.set(0, y + lvlH - 0.1, rackDepth / 2 + 0.25);
        group.add(warnSprite);
      }
    }
  }

  // Label du rack
  if (showLabels) {
    const rackSprite = createRackLabel(rackCode, levelCount, totalQty, occupiedPositions, hasOverflow, isSel, isHov, rackHeight);
    group.add(rackSprite);
    labelSprites.push(rackSprite);
  }

  // Marquer tous les objets du rack
  group.traverse(obj => {
    obj.userData.location = rackCode;
    obj.userData.isRackPart = true;
    obj.userData.rackId = id;
  });

  scene.add(group);
};

// ========== Fonctions helper pour les sprites ==========

function createLevelSprite(level: number, isOverflow: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = isOverflow ? '#ef4444' : '#3b82f6';
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(level), 32, 34);
  
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(0.5, 0.5, 1);
  return sprite;
}

function createQuantitySprite(qty: number, tus: string | null, position: number, isOverflow: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = isOverflow ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 120, 72, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${qty}`, 64, 32);
  ctx.font = '12px Arial';
  ctx.fillStyle = tus === 'CHEP' ? '#60a5fa' : '#fbbf24';
  ctx.fillText(tus || 'EUR', 64, 50);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px Arial';
  ctx.fillText(`Pos ${position}`, 64, 66);
  
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(0.55, 0.35, 1);
  return sprite;
}

function createWarningSprite(positionsUsed: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.roundRect(4, 4, 152, 40, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`⚠ ${positionsUsed}/${MAX_POSITIONS} pos.`, 80, 28);
  
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(0.9, 0.3, 1);
  return sprite;
}

function createRackLabel(
  rackCode: string, levelCount: number, totalQty: number, occupiedPositions: number,
  hasOverflow: boolean, isSel: boolean, isHov: boolean, rackHeight: number
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;

  // ✅ Calcul correct du taux d'occupation (positions utilisées / positions totales)
  const totalPositions = levelCount * MAX_POSITIONS;
  const pct = totalPositions > 0 ? Math.round((occupiedPositions / totalPositions) * 100) : 0;

  // Couleur de fond selon état
  const bgColor = hasOverflow ? '#ef4444' : (isSel ? '#22c55e' : (isHov ? '#3b82f6' : '#ffffff'));
  const bgColorEnd = hasOverflow ? '#dc2626' : (isSel ? '#16a34a' : (isHov ? '#2563eb' : '#f8fafc'));
  const textColor = hasOverflow || isSel || isHov ? '#ffffff' : '#1e293b';
  const subTextColor = hasOverflow || isSel || isHov ? 'rgba(255,255,255,0.8)' : '#64748b';

  // Fond avec dégradé
  const gradient = ctx.createLinearGradient(0, 0, 0, 100);
  gradient.addColorStop(0, bgColor);
  gradient.addColorStop(1, bgColorEnd);

  // Ombre portée
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.roundRect(8, 8, 264, 84, 14);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Bordure
  ctx.strokeStyle = hasOverflow ? '#b91c1c' : (isSel ? '#16a34a' : (isHov ? '#1d4ed8' : '#e2e8f0'));
  ctx.lineWidth = 2;
  ctx.stroke();

  // Nom du rack
  ctx.fillStyle = textColor;
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Rack ${rackCode}`, 140, 42);

  // Stats ligne 2
  ctx.font = '14px Arial';
  ctx.fillStyle = subTextColor;
  
  if (hasOverflow) {
    ctx.fillText(`⚠ DÉPASSEMENT | ${totalQty} unités`, 140, 65);
  } else if (totalQty === 0) {
    ctx.fillText(`${levelCount} niv. × ${MAX_POSITIONS} pos. | Vide`, 140, 65);
  } else {
    ctx.fillText(`${occupiedPositions}/${totalPositions} pos. | ${totalQty} u.`, 140, 65);
  }

  // Barre de progression en bas
  if (!hasOverflow) {
    const barWidth = 200;
    const barHeight = 6;
    const barX = 40;
    const barY = 76;

    // Fond de la barre
    ctx.fillStyle = hasOverflow || isSel || isHov ? 'rgba(255,255,255,0.3)' : '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 3);
    ctx.fill();

    // Progression
    const progressWidth = (barWidth * pct) / 100;
    if (progressWidth > 0) {
      const progressColor = pct === 0 ? '#ef4444' : pct < 30 ? '#f59e0b' : pct < 80 ? '#3b82f6' : '#22c55e';
      ctx.fillStyle = hasOverflow || isSel || isHov ? '#ffffff' : progressColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(progressWidth, 6), barHeight, 3);
      ctx.fill();
    }

    // Pourcentage à droite de la barre
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = subTextColor;
    ctx.textAlign = 'right';
    ctx.fillText(`${pct}%`, barX + barWidth + 18, barY + 6);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.position.set(0, rackHeight + 0.7, 0);
  sprite.scale.set(2.8, 1.0, 1);
  sprite.userData.isLabel = true;
  return sprite;
}

// ✅ Fonction pour nettoyer le cache (à appeler si changement de thème)
export const clearMaterialCache = (): void => {
  materialCache.forEach(mat => mat.dispose());
  materialCache.clear();
};