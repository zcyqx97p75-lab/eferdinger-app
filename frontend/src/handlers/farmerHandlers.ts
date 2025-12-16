import { API_URL } from "../services";
import type { Farmer } from "../types";

export async function createOrUpdateFarmer(
  farmerData: {
    name: string;
    street?: string;
    postalCode?: string;
    city?: string;
    ggnNumber?: string;
    loginEmail?: string;
    loginPassword?: string;
    isFlatRate?: boolean;
    flatRateNote?: string;
  },
  editingId: number | null
): Promise<Farmer> {
  const url = editingId ? `${API_URL}/farmers/${editingId}` : `${API_URL}/farmers`;
  const method = editingId ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(farmerData),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Fehler beim Speichern des Bauern");
  }

  return res.json();
}

export async function resetFarmerPassword(
  farmerId: number,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${API_URL}/farmers/${farmerId}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword: newPassword.trim() }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Fehler beim Zurücksetzen des Passworts");
  }
}

