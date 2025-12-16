import React from "react";
import { formatKg } from "../utils";

type CookingKey = "FESTKOCHEND" | "VORWIEGEND_FESTKOCHEND" | "MEHLIG" | "UNBEKANNT";

export function calcCookingSums(rows: any[]) {
  const sums: Record<CookingKey | "total", number> = {
    FESTKOCHEND: 0,
    VORWIEGEND_FESTKOCHEND: 0,
    MEHLIG: 0,
    UNBEKANNT: 0,
    total: 0,
  };

  for (const r of rows) {
    // im Bauernlager ist quantityTons = kg
    const kg = Number(r.quantityTons ?? r.quantityKg ?? 0);

    // zuerst nach Sorte schauen, falls nicht vorhanden auf Produkt zurückfallen
    const cookingTypeRaw = r.variety?.cookingType || r.product?.cookingType;
    const cookingTypeStr = String(cookingTypeRaw || "").trim().toUpperCase();

    let key: CookingKey = "UNBEKANNT";
    if (cookingTypeStr === "FESTKOCHEND") {
      key = "FESTKOCHEND";
    } else if (cookingTypeStr === "VORWIEGEND_FESTKOCHEND") {
      key = "VORWIEGEND_FESTKOCHEND";
    } else if (cookingTypeStr === "MEHLIG") {
      key = "MEHLIG";
    }

    sums[key] += kg;
    sums.total += kg;
  }

  return sums;
}

export function SummaryRow({ label, sums }: { label: string; sums: ReturnType<typeof calcCookingSums> }) {
  const boxStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "0.5rem",
    marginTop: "0.5rem",
  };
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{label}</div>
      <div style={boxStyle}>
        <div style={{
          background: "#1e40af",
          color: "#f9fafb",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.9rem",
        }}>
          <span>festkochend</span><span>{formatKg(sums.FESTKOCHEND)} kg</span>
        </div>
        <div style={{
          background: "#dc2626",
          color: "#f9fafb",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.9rem",
        }}>
          <span>vorw. festk.</span><span>{formatKg(sums.VORWIEGEND_FESTKOCHEND)} kg</span>
        </div>
        <div style={{
          background: "#eab308",
          color: "#000",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.9rem",
        }}>
          <span>mehlig</span><span>{formatKg(sums.MEHLIG)} kg</span>
        </div>
        <div style={{
          background: "#374151",
          color: "#f9fafb",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          border: "1px solid #10b981",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.9rem",
        }}>
          <span>Gesamt</span><span style={{ color: "#10b981", fontWeight: 700 }}>{formatKg(sums.total)} kg</span>
        </div>
      </div>
    </div>
  );
}

