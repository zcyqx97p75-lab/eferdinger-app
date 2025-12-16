import { apiFetch, ApiException } from "./apiClient";
import type { PackPlant, PackPlantStock } from "../types";

export async function loadPackStations(): Promise<{ id: number; name: string }[]> {
  try {
    const data = await apiFetch<{ id: number; name: string }[]>(`/pack-stations`);
    if (!Array.isArray(data)) {
      console.warn("loadPackStations: Antwort ist kein Array", data);
      return [];
    }
    // Validierung der Daten
    return data.filter((item) => 
      item && 
      typeof item.id === "number" && 
      typeof item.name === "string"
    );
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der Packstationen:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der Packstationen:", err);
    }
    return [];
  }
}

export async function loadPackPlants(): Promise<PackPlant[]> {
  try {
    const data = await apiFetch<PackPlant[]>(`/pack-plants`);
    if (!Array.isArray(data)) {
      console.warn("loadPackPlants: Antwort ist kein Array", data);
      return [];
    }
    // Validierung der Daten
    return data.filter((item) => 
      item && 
      typeof item.id === "number" && 
      typeof item.name === "string"
    );
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der Packbetriebe:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der Packbetriebe:", err);
    }
    return [];
  }
}

export async function loadPackPlantStock(): Promise<PackPlantStock[]> {
  try {
    const data = await apiFetch<PackPlantStock[]>(`/packplant-stock`);
    if (!Array.isArray(data)) {
      console.warn("loadPackPlantStock: Antwort ist kein Array", data);
      return [];
    }
    return data;
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden des Packbetriebs-Lagers:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden des Packbetriebs-Lagers:", err);
    }
    return [];
  }
}

