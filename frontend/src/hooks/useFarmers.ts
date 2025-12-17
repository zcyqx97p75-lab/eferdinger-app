import { useState } from "react";
import type { Farmer } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export function useFarmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);

  async function loadFarmers() {
    try {
      const res = await fetch(`${API_URL}/farmers`);
      if (!res.ok) {
        console.error(`Failed to load farmers: ${res.status}`);
        return;
      }
      const data = await res.json();
      // Mappe 'email' zu 'loginEmail' für Frontend-Kompatibilität
      const mappedData = data.map((farmer: any) => ({
        ...farmer,
        loginEmail: farmer.email || farmer.loginEmail || null,
      }));
      setFarmers(Array.isArray(mappedData) ? mappedData : []);
    } catch (err) {
      console.error("Error loading farmers:", err);
      setFarmers([]);
    }
  }

  return {
    farmers,
    setFarmers,
    loadFarmers,
  };
}


