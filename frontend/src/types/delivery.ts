import { CookingType } from "./common";

// Organisator-Lieferungen
export type OrganizerDelivery = {
  id: number;
  date: string;
  farmerId: number;
  farmerName: string;
  varietyId: number;
  varietyName: string;
  cookingType: CookingType | null;
  quality: "Q1" | "Q2" | "UEBERGROESSE" | null;
  quantityKg: number;
};

// Planmengen
export type DeliveryPlanRow = {
  id: number;
  weekStart: string;
  farmerId: number;
  farmerName: string;
  cookingType: CookingType;
  plannedKg: number;
};

// Aggregierte Zeile: Woche + Bauer + Kochtyp
export type DeliverySummaryRow = {
  key: string;
  weekStart: string;
  farmerId: number;
  farmerName: string;
  cookingType: CookingType | "UNBEKANNT";
  deliveredKg: number;
  plannedKg: number;
  diffKg: number;
  coveragePercent: number | null;
};

