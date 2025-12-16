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

  const token = localStorage.getItem("authToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  console.log("📤 Bauer speichern:", { url, method, body: farmerData, hasToken: !!token });

  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(farmerData),
  });

  console.log("📥 Bauer Response:", { status: res.status, statusText: res.statusText, ok: res.ok });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    let errorMessage = "Fehler beim Speichern des Bauern";
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    console.error("❌ Bauer-Fehler:", res.status, errorMessage, errorText);
    throw new Error(errorMessage);
  }

  const result = await res.json();
  console.log("✅ Bauer gespeichert:", result);
  return result;
}

export async function resetFarmerPassword(
  farmerId: number,
  newPassword: string
): Promise<void> {
  const token = localStorage.getItem("authToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/farmers/${farmerId}/reset-password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ newPassword: newPassword.trim() }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    let errorMessage = "Fehler beim Zurücksetzen des Passworts";
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }
}

