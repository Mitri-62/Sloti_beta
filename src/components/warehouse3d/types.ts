

// Types Exportés
export interface StockItem {
    id: string;
    ean: string | null;
    name: string;
    designation?: string | null;
    quantity: number;
    type?: string | null;
    lot?: string | null;
    expiration_date?: string | null;
    emplacement_prenant?: string | null;
    company_id?: string;
    tus?: 'EUR' | 'CHEP' | 'FCH' | 'FEU' | string | null;
  }
  
  export interface Warehouse3DViewProps {
    items: StockItem[];
    onEmplacementClick?: (emplacement: string, level: number, position: number) => void;
  }
  
  // Types Internes
  export interface ParsedLocation {
    rackCode: string;
    level: number;
    position: number;
  }
  
  export interface SlotStock {
    rackCode: string;
    level: number;
    position: number;
    items: StockItem[];
    totalQuantity: number;
    tus: 'EUR' | 'CHEP' | null;
    positionsUsed: number;
  }
  
  export interface AlveoleStock {
    rackCode: string;
    level: number;
    slots: Map<number, SlotStock>;
    totalPositionsUsed: number;
    isOverflow: boolean;
  }
  
  export interface RackData {
    id: string;
    loc: string;
    rackCode: string;
    stockByLevel: Map<number, AlveoleStock>;
    x: number;
    z: number;
    rotation: number;
  }
  
  export interface WarehouseConfig {
    rows: number;
    racksPerRow: number;
    aisleWidth: number;
    rackHeight: number;
    rackDepth: number;
    bayWidth: number;
    levelCount: number;
  }
  
  export interface WarehouseColors {
    bg: number;
    floor: number;
    fog: number;
    rack: number;
    beam: number;
    grid1: number;
    grid2: number;
  }
  
  export interface WarehouseStats {
    totalQty: number;
    occupied: number;
    empty: number;
    total: number;
    eurCount: number;
    chepCount: number;
    overflowCount: number;
  }
  
  export interface PalletConfig {
    positions: number;
    maxPerAlveole: number;
    w: number;
    d: number;
    h: number;
    color: number;
    name: string;
  }
  
  export type CameraMode = 'orbit' | 'firstPerson';
  export type ViewMode = 'perspective' | 'top' | 'front';