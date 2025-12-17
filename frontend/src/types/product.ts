import { CookingType } from "./common";

// Sorten
export interface Variety {
  id: number;
  name: string;
  cookingType: CookingType;
  quality: "Q1" | "Q2" | "UEBERGROESSE";
}

// Produkte
export type Product = {
  id: number;
  name: string;
  cookingType: CookingType;
  packagingType: string;
  productNumber?: string | null;
  unitKg?: number | null;            // Packungsgröße
  unitsPerColli?: number | null;     // Einheiten je Colli
  collisPerPallet?: number | null;   // Colli je Palette
};

// Kunden
export type Customer = {
  id: number;
  name: string;
  region?: string | null;
};

// Preise
export type Price = {
  id: number;
  customerId: number;
  productId: number;
  pricePerUnit: number;
  packingCostPerUnit?: number | null;
  validFrom: string; // ISO-String
  customer?: Customer | null;
  product?: Product | null;
};

// Packbetrieb
export type PackPlant = {
  id: number;
  name: string;
  vatId?: string | null;
};

export type PackPlantStock = {
  id: number;
  packPlantId: number;
  productId: number;
  quantityUnits: number;

  // Snapshots aus applyPackPlantStockChange
  cookingTypeSnapshot: string | null;
  packPlantNameSnapshot: string | null;
  productNameSnapshot: string | null;

  // echte Relationen, falls vom Backend mitgeschickt
  packPlant?: {
    id: number;
    name: string;
  } | null;

  product?: {
    id: number;
    name: string;
    unitKg: number;
    cookingType?: string; // optional, weil nicht immer geladen
    packagingType?: string;
  } | null;
};


