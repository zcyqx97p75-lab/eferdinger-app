// Zentraler API-Client mit Base-URL und verbesserter Fehlerbehandlung
const API_URL = import.meta.env.VITE_API_URL || "/api";

export { API_URL };

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
  details?: unknown;
}

export class ApiException extends Error {
  status?: number;
  statusText?: string;
  details?: unknown;

  constructor(message: string, status?: number, statusText?: string, details?: unknown) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.statusText = statusText;
    this.details = details;
  }
}

/**
 * Zentraler API-Fetch-Wrapper mit verbesserter Fehlerbehandlung
 * @throws {ApiException} Bei API-Fehlern
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    
    // Versuche JSON zu parsen, auch bei Fehlern
    let errorData: unknown = null;
    let responseText = "";
    
    try {
      responseText = await response.text();
      if (responseText) {
        errorData = JSON.parse(responseText);
      }
    } catch {
      // Wenn kein JSON, verwende Text als Fehlermeldung
      errorData = responseText || null;
    }
    
    if (!response.ok) {
      const errorMessage = 
        (errorData && typeof errorData === "object" && "error" in errorData)
          ? String(errorData.error)
          : (typeof errorData === "string" ? errorData : null)
          || `API Error: ${response.status} ${response.statusText}`;
      
      throw new ApiException(
        errorMessage,
        response.status,
        response.statusText,
        errorData
      );
    }
    
    // Bei erfolgreicher Antwort JSON parsen
    if (!responseText) {
      return {} as T; // Leere Antwort
    }
    
    try {
      return JSON.parse(responseText) as T;
    } catch (parseError) {
      throw new ApiException(
        "Ungültige JSON-Antwort vom Server",
        response.status,
        response.statusText,
        { parseError, responseText }
      );
    }
  } catch (error) {
    // Wenn es bereits eine ApiException ist, weiterwerfen
    if (error instanceof ApiException) {
      throw error;
    }
    
    // Bei Netzwerkfehlern oder anderen Fehlern
    if (error instanceof Error) {
      throw new ApiException(
        `Netzwerkfehler: ${error.message}`,
        undefined,
        undefined,
        { originalError: error }
      );
    }
    
    throw new ApiException(
      "Unbekannter Fehler beim API-Aufruf",
      undefined,
      undefined,
      { error }
    );
  }
}
