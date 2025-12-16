import { apiFetch, API_URL } from "./apiClient";

export async function loadPackbetriebStatistics(params?: {
  dateFrom?: string;
  dateTo?: string;
  productId?: number | "";
  customerId?: number | "";
  type?: string;
}): Promise<any> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.dateFrom) searchParams.append("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.append("dateTo", params.dateTo);
    if (params?.productId) searchParams.append("productId", String(params.productId));
    if (params?.customerId) searchParams.append("customerId", String(params.customerId));
    if (params?.type && params.type !== "ALL") searchParams.append("type", params.type);
    
    const endpoint = searchParams.toString() 
      ? `/packbetrieb/statistics?${searchParams}` 
      : `/packbetrieb/statistics`;
    
    return await apiFetch<any>(endpoint);
  } catch (err) {
    console.error("Fehler beim Laden der Packbetrieb-Statistiken:", err);
    throw err;
  }
}

