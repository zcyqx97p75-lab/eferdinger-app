import { useState } from "react";
import type { Customer } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  async function loadCustomers() {
    try {
      console.log("🔄 Lade Kunden von:", `${API_URL}/customers`);
      const res = await fetch(`${API_URL}/customers`);
      if (!res.ok) {
        console.error("❌ Fehler beim Laden der Kunden:", res.status, res.statusText);
        return;
      }
      const data = await res.json();
      console.log("✅ Kunden geladen:", data.length, "Kunden");
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Fehler in loadCustomers:", err);
      setCustomers([]);
    }
  }

  return {
    customers,
    setCustomers,
    loadCustomers,
  };
}


