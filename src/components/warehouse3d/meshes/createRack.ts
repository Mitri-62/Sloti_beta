import * as THREE from 'three';
import { RackData, WarehouseConfig, WarehouseColors } from '../types';
import { PALLET_CONFIG, MAX_POSITIONS, getStockColor } from '../config';
import { createPallet } from './createPallet';

// Géométries partagées
const SHARED_GEOM = {
  upright: new THREE.BoxGeometry(0.08, 1, 0.08),
  beam: new THREE.BoxGeometry(1, 0.1, 0.05),
  deck: new THREE.PlaneGeometry(1, 1),
  box: new THREE.BoxGeometry(1, 1, 1),
};

// Cache de matériaux
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
  heatmapColor?: number | null; // ✅ NOUVEAU: Couleur heatmap optionnelle
  heatmapLabel?: string | null; // ✅ NOUVEAU: Label heatmap optionnel
}

export const createRack = ({
  scene, rackData, config, colors, isEditMode, selectedRackId, hoveredRack, showLabels, labelSprites,
  heatmapColor, heatmapLabel
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
      occupiedPositions++;
    });
  });

  const isHov = hoveredRack === rackCode;
  const isSel = selectedRackId === id;

  // ✅ Couleur frame : heatmap prioritaire, sinon logique normale
  const useHeatmap = heatmapColor != null;
  const frameColor = useHeatmap 
    ? heatmapColor 
    : (hasOverflow ? 0xef4444 : (isSel ? 0x22c55e : colors.rack));
  
  const frameEmissive = useHeatmap
    ? heatmapColor
    : (isSel ? 0x22c55e : (isHov && isEditMode ? 0x60a5fa : (hasOverflow ? 0xef4444 : 0x000000)));
  
  const frameEmissiveIntensity = useHeatmap 
    ? 0.4 
    : (isSel ? 0.5 : (isHov && isEditMode ? 0.3 : (hasOverflow ? 0.3 : 0)));
  
  const frameMat = getMaterial(`frame-${frameColor}-${frameEmissive}-${useHeatmap}`, {
    color: frameColor,
    metalness: useHeatmap ? 0.3 : 0.8,
    roughness: useHeatmap ? 0.7 : 0.2,
    emissive: frameEmissive,
    emissiveIntensity: frameEmissiveIntensity
  });

  // Montants verticaux
  const uprightPositions = [
    [-bayWidth / 2, -rackDepth / 2 + 0.04],
    [-bayWidth / 2, rackDepth / 2 - 0.04],
    [bayWidth / 2, -rackDepth / 2 + 0.04],
    [bayWidth / 2, rackDepth / 2 - 0.04],
  ];

  uprightPositions.forEach(([px, pz]) => {
    const upright = new THREE.Mesh(SHARED_GEOM.upright, frameMat);
    upright.scale.y = rackHeight;
    upright.position.set(px, rackHeight / 2, pz);
    upright.castShadow = true;
    group.add(upright);
  });

  const lvlH = (rackHeight - 0.3) / levelCount;

  // Niveaux
  for (let lv = 1; lv <= levelCount; lv++) {
    const y = 0.3 + lvlH * (lv - 1);
    const alveole = stockByLevel.get(lv);
    
    // Couleur poutre
    const beamColor = useHeatmap
      ? heatmapColor
      : (alveole?.isOverflow ? 0xef4444 : (isSel ? 0x16a34a : colors.beam));
    
    const beamMat = getMaterial(`beam-${beamColor}-${useHeatmap}`, { 
      color: beamColor, 
      metalness: useHeatmap ? 0.3 : 0.7, 
      roughness: useHeatmap ? 0.7 : 0.3 
    });

    // Poutres horizontales
    [-rackDepth / 2 + 0.06, rackDepth / 2 - 0.06].forEach(bz => {
      const beam = new THREE.Mesh(SHARED_GEOM.beam, beamMat);
      beam.scale.x = bayWidth - 0.1;
      beam.position.set(0, y, bz);
      beam.castShadow = true;
      group.add(beam);
    });

    // Deck
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

    // Label niveau
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

          // Box marchandise
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

          // Label collé sur la face avant de la box
          const qtySprite = createQuantitySprite(
            slot.totalQuantity, 
            slot.tus, 
            slot.position, 
            alveole.isOverflow,
            slot.items.map(i => ({ name: i.name, lot: i.lot, designation: i.designation }))
          );
          // Position sur la face avant (Z positif = face avant)
          qtySprite.position.set(posX, y + 0.07 + pCfg.h + h / 2, pCfg.d / 2 + 0.02);
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
    const rackSprite = createRackLabel(
      rackCode, levelCount, totalQty, occupiedPositions, hasOverflow, 
      isSel, isHov, rackHeight, heatmapLabel
    );
    group.add(rackSprite);
    labelSprites.push(rackSprite);
  }

  // Marquer tous les objets
  group.traverse(obj => {
    obj.userData.location = rackCode;
    obj.userData.isRackPart = true;
    obj.userData.rackId = id;
  });

  scene.add(group);
};

// ========== Sprites helpers ==========

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

function createQuantitySprite(
  qty: number, 
  tus: string | null, 
  position: number, 
  isOverflow: boolean,
  items: { name: string; lot?: string | null; ean?: string | null; designation?: string | null }[]
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;
  
  // Fond avec transparence
  ctx.fillStyle = isOverflow ? 'rgba(239,68,68,0.95)' : 'rgba(15,23,42,0.92)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 212, 132, 10);
  ctx.fill();
  
  // Bordure colorée selon type palette
  ctx.strokeStyle = tus === 'CHEP' ? '#3b82f6' : '#f59e0b';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Quantité (gros)
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 34px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${qty}`, 110, 40);
  
  // Type palette + position
  ctx.font = 'bold 13px Arial';
  ctx.fillStyle = tus === 'CHEP' ? '#60a5fa' : '#fbbf24';
  ctx.fillText(`${tus || 'EUR'} • Pos ${position}`, 110, 58);

  // Infos article
  if (items.length > 0) {
    const item = items[0];
    
    // Nom article
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px Arial';
    let name = item.name || 'Article';
    if (name.length > 26) name = name.substring(0, 24) + '…';
    ctx.fillText(name, 110, 78);
    
    // EAN si présent
    if (item.ean) {
      ctx.fillStyle = '#a5b4fc';
      ctx.font = '11px Arial';
      ctx.fillText(`EAN: ${item.ean}`, 110, 94);
    }
    
    // Lot si présent
    if (item.lot) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Arial';
      let lot = `Lot: ${item.lot}`;
      if (lot.length > 28) lot = lot.substring(0, 26) + '…';
      ctx.fillText(lot, 110, item.ean ? 110 : 94);
    }
    
    // Indicateur si plusieurs articles
    if (items.length > 1) {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Arial';
      ctx.fillText(`+${items.length - 1} autre${items.length > 2 ? 's' : ''}`, 110, 128);
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true,
    depthTest: false 
  }));
  sprite.scale.set(1.0, 0.65, 1);
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
  hasOverflow: boolean, isSel: boolean, isHov: boolean, rackHeight: number,
  heatmapLabel?: string | null
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;

  const totalPositions = levelCount * MAX_POSITIONS;
  const pct = totalPositions > 0 ? Math.round((occupiedPositions / totalPositions) * 100) : 0;

  const bgColor = hasOverflow ? '#ef4444' : (isSel ? '#22c55e' : (isHov ? '#3b82f6' : '#ffffff'));
  const bgColorEnd = hasOverflow ? '#dc2626' : (isSel ? '#16a34a' : (isHov ? '#2563eb' : '#f8fafc'));
  const textColor = hasOverflow || isSel || isHov ? '#ffffff' : '#1e293b';
  const subTextColor = hasOverflow || isSel || isHov ? 'rgba(255,255,255,0.8)' : '#64748b';

  const gradient = ctx.createLinearGradient(0, 0, 0, 100);
  gradient.addColorStop(0, bgColor);
  gradient.addColorStop(1, bgColorEnd);

  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.roundRect(8, 8, 264, 84, 14);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = hasOverflow ? '#b91c1c' : (isSel ? '#16a34a' : (isHov ? '#1d4ed8' : '#e2e8f0'));
  ctx.lineWidth = 2;
  ctx.stroke();

  // Nom du rack
  ctx.fillStyle = textColor;
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Rack ${rackCode}`, 140, 42);

  // Stats ligne 2 (ou heatmap label)
  ctx.font = '14px Arial';
  ctx.fillStyle = subTextColor;
  
  if (heatmapLabel) {
    // ✅ Mode Heatmap : afficher le label heatmap
    ctx.font = 'bold 18px Arial';
    ctx.fillText(heatmapLabel, 140, 68);
  } else if (hasOverflow) {
    ctx.fillText(`⚠ DÉPASSEMENT | ${totalQty} unités`, 140, 65);
  } else if (totalQty === 0) {
    ctx.fillText(`${levelCount} niv. × ${MAX_POSITIONS} pos. | Vide`, 140, 65);
  } else {
    ctx.fillText(`${occupiedPositions}/${totalPositions} pos. | ${totalQty} u.`, 140, 65);
  }

  // Barre de progression (sauf en mode heatmap)
  if (!heatmapLabel && !hasOverflow) {
    const barWidth = 200;
    const barHeight = 6;
    const barX = 40;
    const barY = 76;

    ctx.fillStyle = hasOverflow || isSel || isHov ? 'rgba(255,255,255,0.3)' : '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 3);
    ctx.fill();

    const progressWidth = (barWidth * pct) / 100;
    if (progressWidth > 0) {
      const progressColor = pct === 0 ? '#ef4444' : pct < 30 ? '#f59e0b' : pct < 80 ? '#3b82f6' : '#22c55e';
      ctx.fillStyle = hasOverflow || isSel || isHov ? '#ffffff' : progressColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(progressWidth, 6), barHeight, 3);
      ctx.fill();
    }

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

export const clearMaterialCache = (): void => {
  materialCache.forEach(mat => mat.dispose());
  materialCache.clear();
};