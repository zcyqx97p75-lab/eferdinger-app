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

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customerData),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Fehler beim Speichern des Kunden");
  }

  return res.json();
}

