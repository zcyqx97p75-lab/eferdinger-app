import { useState } from "react";
import type { Product } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  async function loadProducts() {
    try {
      console.log("🔄 Lade Produkte von:", `${API_URL}/products`);
      const res = await fetch(`${API_URL}/products`);
      if (!res.ok) {
        console.error("❌ Fehler beim Laden der Produkte:", res.status, res.statusText);
        return;
      }
      const data = await res.json();
      console.log("✅ Produkte geladen:", data.length, "Produkte");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Fehler in loadProducts:", err);
      setProducts([]);
    }
  }

  return {
    products,
    setProducts,
    loadProducts,
  };
}


