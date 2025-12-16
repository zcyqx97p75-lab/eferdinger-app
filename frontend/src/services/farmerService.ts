import { apiFetch, ApiException } from "./apiClient";
import type { FarmerStock, FarmerPackStat } from "../types";

export async function loadFarmerStocks(farmerId?: number): Promise<FarmerStock[]> {
  try {
    const url = farmerId
      ? `/farmer-stock?farmerId=${farmerId}`
      : `/farmer-stock`;
    const data = await apiFetch<FarmerStock[]>(url);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der Farmer-Stocks:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der Farmer-Stocks:", err);
    }
    return [];
  }
}

export async function loadFarmerPackStats(farmerId: number): Promise<FarmerPackStat[]> {
  if (!farmerId || !Number.isFinite(farmerId)) {
    console.error("Ungültige farmerId:", farmerId);
    return [];
  }
  
  try {
    const data = await apiFetch<FarmerPackStat[]>(`/farmer-pack-stats?farmerId=${farmerId}`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der Farmer-Pack-Statistiken:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der Farmer-Pack-Statistiken:", err);
    }
    return [];
  }
}

