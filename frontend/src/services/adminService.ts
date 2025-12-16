import { apiFetch, ApiException } from "./apiClient";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "ORGANISATOR" | "FARMER" | "PACKSTELLE" | "PACKBETRIEB" | "EG_ADMIN";
  farmerId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export async function loadAllUsers(): Promise<AdminUser[]> {
  try {
    console.log("Lade User-Liste...");
    const data = await apiFetch<AdminUser[]>(`/admin/users`);
    
    if (!Array.isArray(data)) {
      console.warn("loadAllUsers: Antwort ist kein Array", data);
      return [];
    }
    
    // Validierung der User-Daten
    const validUsers = data.filter((user) => 
      user && 
      typeof user.id === "number" && 
      typeof user.name === "string" &&
      typeof user.email === "string" &&
      typeof user.role === "string"
    );
    
    console.log("User-Liste geladen:", validUsers.length, "User");
    return validUsers;
  } catch (err) {
    if (err instanceof ApiException) {
      console.error("API-Fehler beim Laden der User:", err.message, err.status);
    } else {
      console.error("Unerwarteter Fehler beim Laden der User:", err);
    }
    return [];
  }
}

export async function resetUserPassword(userId: number, newPassword: string): Promise<void> {
  if (!Number.isFinite(userId) || userId < 1) {
    throw new Error("Ungültige userId");
  }
  
  if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length === 0) {
    throw new Error("Ungültiges Passwort");
  }
  
  try {
    await apiFetch(`/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: newPassword.trim() }),
    });
  } catch (err) {
    if (err instanceof ApiException) {
      throw err; // Weiterwerfen für bessere Fehlerbehandlung
    }
    throw new Error(`Fehler beim Zurücksetzen des Passworts: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
  }
}

