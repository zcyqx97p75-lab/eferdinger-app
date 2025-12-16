import { apiFetch, ApiException } from "./apiClient";

export interface ManualCost {
  id: number;
  costType: string;
  description: string;
  periodFrom: string;
  periodTo: string;
  packPlantId?: number | null;
  valueType: "ABSOLUTE" | "PERCENTAGE";
  value: number;
  comment?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export async function loadManualCosts(params?: {
  packPlantId?: number | "";
  dateFrom?: string;
  dateTo?: string;
}): Promise<ManualCost[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.packPlantId && params.packPlantId !== "") {
      const packPlantId = typeof params.packPlantId === "number" ? params.packPlantId : Number(params.packPlantId);
      if (Number.isFinite(packPlantId) && packPlantId > 0) {
        searchParams.append("packPlantId", String(packPlantId));
      }
    }
    if (params?.dateFrom) searchParams.append("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.append("dateTo", params.dateTo);
    
    const endpoint = searchParams.toString() 
      ? `/admin/manual-costs?${searchParams}` 
      : `/admin/manual-costs`;
    
    const data = await apiFetch<ManualCost[]>(endpoint);
    if (!Array.isArray(data)) {
      console.warn("loadManualCosts: Antwort ist kein Array", data);
      return [];
    }
    return data;
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler in loadManualCosts:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler in loadManualCosts:", err);
    }
    return [];
  }
}

export async function loadPnl(params?: {
  year?: number | "";
  month?: number | "";
  week?: number | "";
  packPlantId?: number | "";
  productId?: number | "";
  customerId?: number | "";
  dateFrom?: string;
  dateTo?: string;
}): Promise<any> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.year) searchParams.append("year", String(params.year));
    if (params?.month) searchParams.append("month", String(params.month));
    if (params?.week) searchParams.append("week", String(params.week));
    if (params?.packPlantId) searchParams.append("packPlantId", String(params.packPlantId));
    if (params?.productId) searchParams.append("productId", String(params.productId));
    if (params?.customerId) searchParams.append("customerId", String(params.customerId));
    if (params?.dateFrom) searchParams.append("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.append("dateTo", params.dateTo);
    
    const endpoint = searchParams.toString() 
      ? `/admin/pnl?${searchParams}` 
      : `/admin/pnl`;
    
    return await apiFetch<any>(endpoint);
  } catch (err) {
    console.error("loadPnl error:", err);
    return null;
  }
}

export interface TaxRate {
  id: number;
  name: string;
  ratePercent: number;
  description?: string | null;
}

export async function loadTaxRates(): Promise<TaxRate[]> {
  try {
    const data = await apiFetch<TaxRate[]>(`/tax-rates`);
    if (!Array.isArray(data)) {
      console.warn("loadTaxRates: Antwort ist kein Array", data);
      return [];
    }
    return data;
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der Steuersätze:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der Steuersätze:", err);
    }
    return [];
  }
}

