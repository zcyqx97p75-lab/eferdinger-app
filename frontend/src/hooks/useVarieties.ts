import { useState } from "react";
import type { Variety } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export function useVarieties() {
  const [varieties, setVarieties] = useState<Variety[]>([]);

  async function loadVarieties() {
    try {
      const res = await fetch(`${API_URL}/varieties`);
      if (!res.ok) {
        console.error(`Failed to load varieties: ${res.status}`);
        return;
      }
      const data = await res.json();
      setVarieties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading varieties:", err);
      setVarieties([]);
    }
  }

  return {
    varieties,
    setVarieties,
    loadVarieties,
  };
}


