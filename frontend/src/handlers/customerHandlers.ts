import { API_URL } from "../services";
import type { Customer } from "../types";

export async function createOrUpdateCustomer(
  customerData: {
    name: string;
    region?: string;
  },
  editingId: number | null
): Promise<Customer> {
  const url = editingId ? `${API_URL}/customers/${editingId}` : `${API_URL}/customers`;
  const method = editingId ? "PUT" : "POST";

  const token = localStorage.getItem("authToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(customerData),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    let errorMessage = "Fehler beim Speichern des Kunden";
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

