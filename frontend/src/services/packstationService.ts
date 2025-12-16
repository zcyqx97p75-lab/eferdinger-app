import { apiFetch, ApiException } from "./apiClient";
import type { PackStationStock } from "../types";

export async function loadPackStationStock(): Promise<PackStationStock[]> {
  try {
    const data = await apiFetch<PackStationStock[]>(`/packstation-stock`);
    if (!Array.isArray(data)) {
      console.warn("loadPackStationStock: Antwort ist kein Array", data);
      return [];
    }
    return data;
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der Packstellen-Lager:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der Packstellen-Lager:", err);
    }
    return [];
  }
}

// Berechne die Anzahl der anzuzeigenden Buchungen basierend auf Bildschirmhöhe
function calculateRecentEntriesLimit(): number {
  // Mindestens 10, maximal basierend auf verfügbarer Höhe
  // Annahme: ~60px pro Eintrag
  if (typeof window === "undefined" || !window.innerHeight) {
    return 10; // Fallback für SSR
  }
  
  const availableHeight = Math.max(0, window.innerHeight - 400); // Platz für Header, Formular, etc.
  const calculatedLimit = Math.floor(availableHeight / 60);
  return Math.max(10, Math.min(calculatedLimit, 50)); // Mindestens 10, maximal 50
}

// Types für Bewegungen definieren
export interface PackagingRun {
  id: number;
  date: string;
  productId: number;
  farmerId: number;
  varietyId: number;
  colli: number;
  wasteKg?: number | null;
  rawInputKg?: number | null;
  finishedKg?: number | null;
  productNameSnapshot?: string | null;
  varietyNameSnapshot?: string | null;
  variety?: { name: string } | null;
  product?: { name: string; unitsPerColli?: number | null } | null;
}

export interface WasteMovement {
  id: number;
  date: string;
  farmerId: number;
  varietyId: number;
  wasteKg: number;
  comment?: string | null;
  varietyNameSnapshot?: string | null;
  variety?: { name: string } | null;
}

export interface InventoryZeroMovement {
  id: number;
  date: string;
  farmerId: number;
  varietyId: number;
  stockKg: number;
  comment?: string | null;
  varietyNameSnapshot?: string | null;
  variety?: { name: string } | null;
}

export async function loadRecentPackagingRuns(): Promise<PackagingRun[]> {
  try {
    const limit = calculateRecentEntriesLimit();
    if (!Number.isFinite(limit) || limit < 1) {
      console.warn("Ungültiger limit für loadRecentPackagingRuns:", limit);
      return [];
    }
    
    const data = await apiFetch<PackagingRun[]>(`/packaging-runs/recent?limit=${limit}`);
    if (!Array.isArray(data)) {
      console.warn("loadRecentPackagingRuns: Antwort ist kein Array", data);
      return [];
    }
    return data;
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der letzten Verpackungsläufe:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der letzten Verpackungsläufe:", err);
    }
    return [];
  }
}

export async function loadRecentWasteMovements(): Promise<WasteMovement[]> {
  try {
    const limit = calculateRecentEntriesLimit();
    if (!Number.isFinite(limit) || limit < 1) {
      console.warn("Ungültiger limit für loadRecentWasteMovements:", limit);
      return [];
    }
    
    const data = await apiFetch<WasteMovement[]>(`/packstation/waste/recent?limit=${limit}`);
    if (!Array.isArray(data)) {
      console.warn("loadRecentWasteMovements: Antwort ist kein Array", data);
      return [];
    }
    return data;
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der letzten Abfall-Bewegungen:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der letzten Abfall-Bewegungen:", err);
    }
    return [];
  }
}

export async function loadRecentInventoryZeroMovements(): Promise<InventoryZeroMovement[]> {
  try {
    const limit = calculateRecentEntriesLimit();
    if (!Number.isFinite(limit) || limit < 1) {
      console.warn("Ungültiger limit für loadRecentInventoryZeroMovements:", limit);
      return [];
    }
    
    const data = await apiFetch<InventoryZeroMovement[]>(`/packstation/inventory-zero/recent?limit=${limit}`);
    if (!Array.isArray(data)) {
      console.warn("loadRecentInventoryZeroMovements: Antwort ist kein Array", data);
      return [];
    }
    return data;
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der letzten Inventur-Null-Bewegungen:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der letzten Inventur-Null-Bewegungen:", err);
    }
    return [];
  }
}

