import { apiFetch, ApiException } from "./apiClient";
import type { OrganizerDelivery, DeliveryPlanRow, CookingType } from "../types";

export async function loadOrganizerDeliveries(weeks: number): Promise<OrganizerDelivery[]> {
  if (!Number.isFinite(weeks) || weeks < 1 || weeks > 104) {
    console.warn("Ungültiger weeks-Parameter:", weeks, "- verwende Standardwert 52");
    weeks = 52;
  }
  
  try {
    const data = await apiFetch<OrganizerDelivery[]>(`/organizer/deliveries?weeks=${weeks}`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der Organizer-Lieferungen:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der Organizer-Lieferungen:", err);
    }
    return [];
  }
}

function getWeekStartDate(year: number, week: number): string {
  // Grobe Berechnung: Montag der ISO-Kalenderwoche
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const day = simple.getDay();           // 0 = So, 1 = Mo, ...
  const diff = (day + 6) % 7;            // Offset bis Montag
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().substring(0, 10); // "YYYY-MM-DD"
}

export async function loadDeliveryPlans(
  year: number,
  farmerId?: number
): Promise<DeliveryPlanRow[]> {
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    console.error("Ungültiges Jahr:", year);
    return [];
  }
  
  if (farmerId !== undefined && (!Number.isFinite(farmerId) || farmerId < 1)) {
    console.warn("Ungültige farmerId:", farmerId);
    farmerId = undefined;
  }
  
  try {
    const params = new URLSearchParams();
    params.set("year", String(year));
    if (farmerId) params.set("farmerId", String(farmerId));

    interface DeliveryPlanResponse {
      id: number;
      year: number;
      week: number;
      farmerId: number;
      farmerNameSnapshot?: string | null;
      farmer?: { name: string } | null;
      cookingType: CookingType;
      plannedKg: number | null;
    }

    const data = await apiFetch<DeliveryPlanResponse[]>(`/delivery-plans?${params.toString()}`);

    const mapped: DeliveryPlanRow[] = (Array.isArray(data) ? data : []).map(
      (p: DeliveryPlanResponse) => {
        if (!p.id || !p.farmerId || !p.cookingType) {
          console.warn("Ungültige DeliveryPlan-Daten:", p);
          return null;
        }
        
        return {
          id: p.id,
          weekStart: getWeekStartDate(p.year, p.week),
          farmerId: p.farmerId,
          farmerName: p.farmerNameSnapshot ?? p.farmer?.name ?? "-",
          cookingType: p.cookingType,
          plannedKg: Number(p.plannedKg ?? 0),
        };
      }
    ).filter((row): row is DeliveryPlanRow => row !== null);

    return mapped;
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der Lieferpläne:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der Lieferpläne:", err);
    }
    return [];
  }
}

