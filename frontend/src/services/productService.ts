import { apiFetch, ApiException } from "./apiClient";
import type { Price } from "../types";

export async function loadPrices(
  customerId?: number,
  productId?: number
): Promise<Price[]> {
  // Validierung der Parameter
  if (customerId !== undefined && (!Number.isFinite(customerId) || customerId < 1)) {
    console.warn("Ungültige customerId:", customerId);
    customerId = undefined;
  }
  
  if (productId !== undefined && (!Number.isFinite(productId) || productId < 1)) {
    console.warn("Ungültige productId:", productId);
    productId = undefined;
  }
  
  try {
    const params = new URLSearchParams();
    if (customerId) params.set("customerId", String(customerId));
    if (productId) params.set("productId", String(productId));

    const qs = params.toString();
    const endpoint = qs ? `/product-prices?${qs}` : `/product-prices`;

    const data = await apiFetch<Price[]>(endpoint);
    if (!Array.isArray(data)) {
      console.warn("loadPrices: Antwort ist kein Array", data);
      return [];
    }
    return data;
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler in loadPrices:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler in loadPrices:", err);
    }
    return [];
  }
}

// Type für Qualitätspreise definieren
export interface QualityPrice {
  id: number;
  quality: "Q1" | "Q2" | "UEBERGROESSE";
  validFrom: string;
  validTo: string | null;
  pricePerKg: number;
  taxRateId?: number | null;
}

export async function loadQualityPrices(): Promise<QualityPrice[]> {
  try {
    const data = await apiFetch<QualityPrice[]>(`/variety-quality-prices`);
    if (!Array.isArray(data)) {
      console.warn("loadQualityPrices: Antwort ist kein Array", data);
      return [];
    }
    return data;
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der Qualitätspreise:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der Qualitätspreise:", err);
    }
    return [];
  }
}

