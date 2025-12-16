import { CookingType, VarietyQuality } from "./common";

// Adresse eines Bauern
export type FarmerAddress = {
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
};

// Bauern
export type Farmer = {
  id: number;
  name: string;
  farmName?: string | null;          // Hofname für Anzeige
  address?: FarmerAddress | null;    // Straße/PLZ/Ort
  fullAddress?: string | null;
  ggnNumber?: string | null;
  loginEmail?: string | null;
  loginPassword?: string | null;
  isFlatRate?: boolean;
  flatRateNote?: string | null;
};

// Bauernlager
export type FarmerStock = {
  id: number;
  farmerId: number;
  varietyId: number;
  quantityTons: number;  // wir verwenden kg, Name lassen wir vorerst
  farmer?: Farmer;
  variety?: {
    id: number;
    name: string;
    cookingType: CookingType;
    quality: VarietyQuality;
  };
};

// Bauern-Statistik
export type FarmerPackStat = {
  varietyId: number;
  varietyName: string;
  cookingType: string;
  quality: string;
  deliveredKg: number;
  packedKg: number;
  currentKg: number;
  wasteKg: number;
  inventoryZeroKg: number;
  totalLossKg: number;
  yieldPercent: number | null;
  lossPercent: number | null;
  stockPercent: number | null; // NEU
};

