import { useMemo } from 'react';
import { StockItem, AlveoleStock, WarehouseConfig, WarehouseStats } from '../types';
import { MAX_POSITIONS } from '../config';
import { parseEmplacement, normalizeTus, getPositionsUsed, checkAlveoleOverflow } from '../utils';

export const useWarehouseData = (items: StockItem[], config: WarehouseConfig) => {
  // Grouper stock par rack/niveau
  const stockByRack = useMemo(() => {
    const res = new Map<string, Map<number, AlveoleStock>>();
    if (!items || !Array.isArray(items)) return res;

    items.forEach(item => {
      const p = parseEmplacement(item.emplacement_prenant);
      if (!p) return;

      const tus = normalizeTus(item.tus);
      const positionsUsed = getPositionsUsed(tus);

      if (!res.has(p.rackCode)) res.set(p.rackCode, new Map());
      const rm = res.get(p.rackCode)!;

      if (!rm.has(p.level)) {
        rm.set(p.level, {
          rackCode: p.rackCode,
          level: p.level,
          slots: new Map(),
          totalPositionsUsed: 0,
          isOverflow: false
        });
      }

      const alveole = rm.get(p.level)!;
      if (!alveole.slots.has(p.position)) {
        alveole.slots.set(p.position, {
          rackCode: p.rackCode,
          level: p.level,
          position: p.position,
          items: [],
          totalQuantity: 0,
          tus,
          positionsUsed
        });
      }

      const slot = alveole.slots.get(p.position)!;
      slot.items.push(item);
      slot.totalQuantity += item.quantity;
      if (!slot.tus && tus) {
        slot.tus = tus;
        slot.positionsUsed = positionsUsed;
      }
    });

    // Calculer les totaux et débordements
    res.forEach(levels => {
      levels.forEach(alveole => {
        let totalPos = 0;
        alveole.slots.forEach(slot => {
          totalPos += slot.positionsUsed;
        });
        alveole.totalPositionsUsed = totalPos;
        alveole.isOverflow = checkAlveoleOverflow(alveole.slots);
      });
    });

    return res;
  }, [items]);

  // Statistiques
  const stats: WarehouseStats = useMemo(() => {
    let totalQty = 0, eurCount = 0, chepCount = 0, overflowCount = 0;

    if (items && Array.isArray(items)) {
      items.forEach(i => totalQty += i.quantity);
    }

    stockByRack.forEach(levels => {
      levels.forEach(alveole => {
        if (alveole.isOverflow) overflowCount++;
        alveole.slots.forEach(slot => {
          if (slot.tus === 'CHEP') chepCount++;
          else eurCount++;
        });
      });
    });

    const totalSlots = config.rows * config.racksPerRow * config.levelCount * MAX_POSITIONS;
    let occupied = 0;
    stockByRack.forEach(lm => lm.forEach(alv => occupied += alv.slots.size));

    return {
      totalQty,
      occupied,
      empty: totalSlots - occupied,
      total: totalSlots,
      eurCount,
      chepCount,
      overflowCount
    };
  }, [items, stockByRack, config]);

  return { stockByRack, stats };
};