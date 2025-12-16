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
    body: JSON.stringify({
      ...productData,
      packagingType: productData.packagingType || null,
      productNumber: productData.productNumber || null,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    let errorMessage = "Fehler beim Speichern des Produkts";
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

