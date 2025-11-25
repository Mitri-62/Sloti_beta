import { FC } from 'react';
import { X, Grid, Ruler, Package, User, AlertTriangle, ExternalLink, Boxes } from 'lucide-react';
import { RackData, WarehouseConfig, StockItem } from '../types';
import { MAX_POSITIONS } from '../config';
import { Slider } from './UIComponents';

interface SidePanelProps {
  isConfigOpen: boolean;
  selectedLoc: string | null;
  isEditMode: boolean;
  isDark: boolean;
  isFullscreen: boolean;
  config: WarehouseConfig;
  setConfig: (fn: (c: WarehouseConfig) => WarehouseConfig) => void;
  enableCollision: boolean;
  setEnableCollision: (fn: (v: boolean) => boolean) => void;
  rackData: RackData[];
  items: StockItem[]; // ✅ NOUVEAU: Liste des articles
  onClose: () => void;
  onViewInTable?: (emplacement: string) => void; // ✅ NOUVEAU: Callback pour voir dans le tableau
}

export const SidePanel: FC<SidePanelProps> = ({
  isConfigOpen, selectedLoc, isEditMode, isDark, isFullscreen,
  config, setConfig, enableCollision, setEnableCollision, rackData, items, onClose, onViewInTable
}) => {
  const isVisible = isConfigOpen || (selectedLoc && !isEditMode);
  if (!isVisible) return null;

  const rack = rackData.find(r => r.rackCode === selectedLoc);

  // ✅ NOUVEAU: Filtrer les articles de ce rack
  const rackItems = selectedLoc ? items.filter(item => {
    if (!item.emplacement_prenant) return false;
    const emp = item.emplacement_prenant.toUpperCase();
    return emp.startsWith(selectedLoc.toUpperCase());
  }) : [];

  return (
    <div className={`p-4 overflow-y-auto w-80 flex-shrink-0 max-h-full ${
      isDark ? 'bg-gray-800' : 'bg-slate-50'
    } border-l ${isDark ? 'border-slate-700' : 'border-slate-200'} ${
      isFullscreen ? 'absolute right-0 top-0 bottom-0 z-30 shadow-2xl' : ''
    }`}>
      <button
        className={`absolute top-4 right-4 p-1 rounded-full z-10 ${
          isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-slate-200 hover:bg-slate-300'
        }`}
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>

      {isConfigOpen && (
        <div className="space-y-4 mt-4">
          <h2 className="text-xl font-bold text-blue-600">Configuration</h2>

          {/* Disposition */}
          <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-blue-500">
              <Grid className="w-5 h-5" />Disposition
            </h3>
            <div className="space-y-3">
              <Slider label="Rangées" value={config.rows} min={1} max={10}
                onChange={v => setConfig(c => ({ ...c, rows: v }))} />
              <Slider label="Racks/rangée" value={config.racksPerRow} min={2} max={8} step={2}
                onChange={v => setConfig(c => ({ ...c, racksPerRow: v }))} />
              <Slider label="Largeur allée" value={config.aisleWidth} min={3} max={10} step={0.5}
                onChange={v => setConfig(c => ({ ...c, aisleWidth: v }))} unit="m" />
            </div>
          </div>

          {/* Racks */}
          <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-blue-500">
              <Ruler className="w-5 h-5" />Racks
            </h3>
            <div className="space-y-3">
              <Slider label="Hauteur" value={config.rackHeight} min={2} max={12} step={0.5}
                onChange={v => setConfig(c => ({ ...c, rackHeight: v }))} unit="m" />
              <Slider label="Largeur baie" value={config.bayWidth} min={4} max={7} step={0.1}
                onChange={v => setConfig(c => ({ ...c, bayWidth: v }))} unit="m" />
              <Slider label="Niveaux" value={config.levelCount} min={1} max={6}
                onChange={v => setConfig(c => ({ ...c, levelCount: v }))} />
            </div>
          </div>

          {/* First Person */}
          <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-green-500">
              <User className="w-5 h-5" />First Person
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Collision avec racks</span>
                <button
                  onClick={() => setEnableCollision(p => !p)}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    enableCollision ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'
                  }`}
                >
                  {enableCollision ? 'Activé' : 'Désactivé'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Touche <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-600">F</kbd> pour basculer
              </p>
            </div>
          </div>

          {/* Légende palettes */}
          <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-blue-500">
              <Package className="w-5 h-5" />Types de palettes
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 rounded bg-amber-50 dark:bg-amber-900/30">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 rounded" style={{ backgroundColor: '#cd853f' }} />
                  <span className="font-medium">EUR / EPAL</span>
                </div>
                <span className="text-slate-500">80×120cm</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-blue-50 dark:bg-blue-900/30">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 rounded" style={{ backgroundColor: '#0066cc' }} />
                  <span className="font-medium">CHEP</span>
                </div>
                <span className="text-slate-500">100×120cm</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedLoc && !isConfigOpen && !isEditMode && rack && (
        <RackDetails 
          rack={rack} 
          config={config} 
          isDark={isDark} 
          rackItems={rackItems}
          onViewInTable={onViewInTable}
        />
      )}
    </div>
  );
};

// ✅ Composant détails rack - AVEC ARTICLES PAR NIVEAU
const RackDetails: FC<{ 
  rack: RackData; 
  config: WarehouseConfig; 
  isDark: boolean;
  rackItems: StockItem[];
  onViewInTable?: (emplacement: string) => void;
}> = ({ rack, config, isDark, rackItems, onViewInTable }) => {
  let rackEur = 0, rackChep = 0, rackOverflow = 0;
  rack.stockByLevel.forEach(alv => {
    if (alv.isOverflow) rackOverflow++;
    alv.slots.forEach(s => { if (s.tus === 'CHEP') rackChep++; else rackEur++; });
  });

  const totalQty = rackItems.reduce((sum, item) => sum + item.quantity, 0);

  // ✅ Grouper les articles par niveau
  const itemsByLevel = new Map<number, StockItem[]>();
  rackItems.forEach(item => {
    if (!item.emplacement_prenant) return;
    // Parser le niveau depuis l'emplacement (ex: "A-2-1" → niveau 2)
    const match = item.emplacement_prenant.match(/^[A-Za-z]+[-._\/]?(\d+)/);
    const level = match ? parseInt(match[1]) : 1;
    if (!itemsByLevel.has(level)) itemsByLevel.set(level, []);
    itemsByLevel.get(level)!.push(item);
  });

  return (
    <div className="space-y-4 mt-4">
      <h2 className="text-xl font-bold text-blue-600">Rack {rack.rackCode}</h2>

      {rackOverflow > 0 && (
        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">{rackOverflow} alvéole(s) en dépassement</span>
          </div>
        </div>
      )}

      {/* Résumé du rack */}
      <div className={`p-4 rounded-lg shadow ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-slate-500">Niveaux:</span> <span className="font-bold">{config.levelCount}</span></div>
          <div><span className="text-slate-500">Positions:</span> <span className="font-bold">{MAX_POSITIONS}/niv.</span></div>
          <div><span className="text-slate-500">EUR:</span> <span className="font-bold text-amber-600">{rackEur}</span></div>
          <div><span className="text-slate-500">CHEP:</span> <span className="font-bold text-blue-600">{rackChep}</span></div>
          <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-gray-600 mt-2">
            <span className="text-slate-500">Total articles:</span>{' '}
            <span className="font-bold text-indigo-600">{rackItems.length}</span>
            <span className="text-slate-400 mx-2">|</span>
            <span className="font-bold text-green-600">{totalQty} unités</span>
          </div>
        </div>
      </div>

      {/* Stock par niveau AVEC ARTICLES */}
      <div className={`p-4 rounded-lg shadow ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-green-500" />Stock par niveau
        </h3>
        <div className="space-y-3">
          {Array.from({ length: config.levelCount }, (_, i) => i + 1).map(lv => {
            const alveole = rack.stockByLevel.get(lv);
            const levelItems = itemsByLevel.get(lv) || [];
            let qty = 0;
            alveole?.slots.forEach(s => { qty += s.totalQuantity; });

            return (
              <div key={lv} className={`rounded-lg border overflow-hidden ${
                alveole?.isOverflow
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                  : isDark ? 'border-gray-600 bg-gray-800' : 'border-slate-200 bg-slate-50'
              }`}>
                {/* Header du niveau */}
                <div className={`p-2 flex justify-between items-center ${
                  alveole?.isOverflow 
                    ? 'bg-red-100 dark:bg-red-900/30' 
                    : isDark ? 'bg-gray-700' : 'bg-slate-100'
                }`}>
                  <span className="font-medium flex items-center gap-2 text-sm">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      alveole?.isOverflow 
                        ? 'bg-red-500 text-white' 
                        : qty > 0 
                          ? 'bg-green-500 text-white' 
                          : 'bg-slate-300 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                    }`}>
                      {lv}
                    </span>
                    Niveau {lv}
                    {alveole?.isOverflow && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  </span>
                  <div className="flex items-center gap-2">
                    {alveole && (
                      <span className="text-xs text-slate-500">
                        {alveole.totalPositionsUsed}/{MAX_POSITIONS} pos.
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      qty > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400'
                    }`}>
                      {qty > 0 ? `${qty} u.` : 'Vide'}
                    </span>
                  </div>
                </div>

                {/* Slots (palettes) */}
                {alveole && alveole.slots.size > 0 && (
                  <div className="p-2 flex gap-1 flex-wrap border-b border-slate-200 dark:border-gray-600">
                    {Array.from(alveole.slots.values()).sort((a, b) => a.position - b.position).map((slot, i) => (
                      <div key={i} className={`p-1.5 rounded text-xs text-center min-w-[50px] ${
                        slot.tus === 'CHEP'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300'
                      }`}>
                        <div className="font-bold">{slot.totalQuantity}</div>
                        <div className="text-[10px] opacity-75">{slot.tus || 'EUR'}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ✅ Articles de ce niveau */}
                {levelItems.length > 0 && (
                  <div className="p-2 space-y-1.5 max-h-40 overflow-y-auto">
                    {levelItems.map((item, idx) => (
                      <div 
                        key={item.id || idx} 
                        className={`p-2 rounded text-xs flex justify-between items-center ${
                          isDark ? 'bg-gray-900/50' : 'bg-white'
                        }`}
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {item.name}
                          </p>
                          {item.designation && (
                            <p className="text-[10px] text-slate-500 truncate">{item.designation}</p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.lot && (
                              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1 rounded">
                                Lot: {item.lot}
                              </span>
                            )}
                            {item.emplacement_prenant && (
                              <span className="text-[10px] text-slate-400">
                                {item.emplacement_prenant}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-base text-gray-900 dark:text-white">
                            {item.quantity}
                          </span>
                          {item.tus && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              item.tus === 'CHEP' || item.tus === 'FCH'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                            }`}>
                              {item.tus}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Niveau vide */}
                {(!alveole || alveole.slots.size === 0) && levelItems.length === 0 && (
                  <div className="p-2 text-center text-xs text-slate-400">
                    Aucun stock
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ Bouton pour voir dans le tableau */}
      {onViewInTable && rackItems.length > 0 && (
        <button
          onClick={() => onViewInTable(rack.rackCode)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium shadow"
        >
          <ExternalLink className="w-4 h-4" />
          Voir les {rackItems.length} articles dans le tableau
        </button>
      )}

      {/* Message si rack vide */}
      {rackItems.length === 0 && (
        <div className={`p-4 rounded-lg shadow text-center ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
          <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-500">Aucun article dans ce rack</p>
        </div>
      )}
    </div>
  );
};