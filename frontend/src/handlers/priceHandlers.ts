import { API_URL } from "../services";
import type { Price } from "../types";

export async function createOrUpdatePrice(
  priceData: {
    customerId: number;
    productId: number;
    pricePerUnit: number;
    packingCostPerUnit?: number;
    validFrom?: string;
  },
  editingId: number | null
): Promise<Price> {
  const url = editingId ? `${API_URL}/product-prices/${editingId}` : `${API_URL}/product-prices`;
  const method = editingId ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(priceData),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Fehler beim Speichern des Preises");
  }

  return res.json();
}

