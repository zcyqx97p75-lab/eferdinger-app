import { API_URL } from "../services";
import type { Product, CookingType } from "../types";

export async function createOrUpdateProduct(
  productData: {
    name: string;
    cookingType: CookingType;
    unitKg: number;
    unitsPerColli?: number;
    collisPerPallet?: number;
    packagingType?: string;
    productNumber?: string;
    taxRateId?: number | null;
  },
  editingId: number | null
): Promise<Product> {
  const url = editingId ? `${API_URL}/products/${editingId}` : `${API_URL}/products`;
  const method = editingId ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...productData,
      packagingType: productData.packagingType || null,
      productNumber: productData.productNumber || null,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Fehler beim Speichern des Produkts");
  }

  return res.json();
}

