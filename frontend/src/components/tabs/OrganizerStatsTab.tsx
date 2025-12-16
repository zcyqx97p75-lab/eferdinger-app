import React from "react";
import type {
  CookingType,
  Farmer,
  OrganizerDelivery,
  DeliveryPlanRow,
  DeliverySummaryRow,
} from "../../types";
import { formatKg, formatPercent } from "../../utils";

interface OrganizerStatsTabProps {
  isOrganizer: boolean;
  isEgAdmin: boolean;
  deliveryWeeksBack: string;
  setDeliveryWeeksBack: (value: string) => void;
  planWeeksForward: string;
  setPlanWeeksForward: (value: string) => void;
  planFarmerId: number | "";
  setPlanFarmerId: (value: number | "") => void;
  deliveryPlans: DeliveryPlanRow[];
  organizerDeliveries: OrganizerDelivery[];
  statsCookingFilter: CookingType | "alle";
  setStatsCookingFilter: (value: CookingType | "alle") => void;
  planYear: number;
  setPlanYear: (value: number) => void;
  farmers: Farmer[];
  loadOrganizerDeliveries: (weeks: number) => Promise<void>;
  loadDeliveryPlans: (year: number, farmerId?: number) => Promise<void>;
  showMessage: (text: string) => void;
}

export function OrganizerStatsTab({
  isOrganizer,
  isEgAdmin,
  deliveryWeeksBack,
  setDeliveryWeeksBack,
  planWeeksForward,
  setPlanWeeksForward,
  planFarmerId,
  setPlanFarmerId,
  deliveryPlans,
  organizerDeliveries,
  statsCookingFilter,
  setStatsCookingFilter,
  planYear,
  setPlanYear,
  farmers,
  loadOrganizerDeliveries,
  loadDeliveryPlans,
  showMessage,
}: OrganizerStatsTabProps) {
  if (!isOrganizer && !isEgAdmin) {
    return <p>Nur für Organisator / EZG-Admin sichtbar.</p>;
  }

  const weeksBackNum = Number(deliveryWeeksBack || "52");
  const weeksForwardNum = Number(planWeeksForward || "2");

  const now = new Date();
  const minDate = new Date(now);
  minDate.setDate(now.getDate() - weeksBackNum * 7);
  minDate.setHours(0, 0, 0, 0);

  const maxDate = new Date(now);
  maxDate.setDate(now.getDate() + weeksForwardNum * 7);
  maxDate.setHours(23, 59, 59, 999);

  // Montag der Kalenderwoche bestimmen
  function weekStartOf(dateStr: string): string {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0=So, 1=Mo, ...
    const diff = (day + 6) % 7; // Abstand zu Montag
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().substring(0, 10); // YYYY-MM-DD
  }

  // 1) Planmengen in Map (nur Zeitfenster, optional nach Bauer)
  const planMap = new Map<string, DeliveryPlanRow[]>();
  for (const p of deliveryPlans) {
    if (typeof planFarmerId === "number" && p.farmerId !== planFarmerId) {
      continue;
    }

    const d = new Date(p.weekStart);
    if (d < minDate || d > maxDate) continue;

    const key = `${p.weekStart}|${p.farmerId}|${p.cookingType}`;
    const list = planMap.get(key) ?? [];
    list.push(p);
    planMap.set(key, list);
  }

  // 2) Lieferungen in summaryMap aggregieren (Zeitfenster, optional Bauer)
  const summaryMap = new Map<string, DeliverySummaryRow>();

  for (const d of organizerDeliveries) {
    const dateObj = new Date(d.date);
    if (dateObj < minDate || dateObj > maxDate) continue;

    if (typeof planFarmerId === "number" && d.farmerId !== planFarmerId) {
      continue;
    }

    const weekStart = weekStartOf(d.date);
    const cookingKey: CookingType | "UNBEKANNT" =
      d.cookingType === "FESTKOCHEND" ||
      d.cookingType === "VORWIEGEND_FESTKOCHEND" ||
      d.cookingType === "MEHLIG"
        ? d.cookingType
        : "UNBEKANNT";

    const key = `${weekStart}|${d.farmerId}|${cookingKey}`;

    let row = summaryMap.get(key);
    if (!row) {
      row = {
        key,
        weekStart,
        farmerId: d.farmerId,
        farmerName: d.farmerName,
        cookingType: cookingKey,
        deliveredKg: 0,
        plannedKg: 0,
        diffKg: 0,
        coveragePercent: null,
      };
      summaryMap.set(key, row);
    }

    row.deliveredKg += d.quantityKg;
  }

  // 3) Planmengen auf bestehende Zeilen legen
  for (const [key, row] of summaryMap.entries()) {
    const plans = planMap.get(key);
    const planned = plans
      ? plans.reduce((sum, p) => sum + p.plannedKg, 0)
      : 0;

    row.plannedKg = planned;
    row.diffKg = row.deliveredKg - planned;
    row.coveragePercent =
      planned > 0 ? (row.deliveredKg / planned) * 100 : null;
  }

  // 4) Plan-only-Zeilen ergänzen (Zukunft, noch keine Lieferung)
  for (const [key, plans] of planMap.entries()) {
    if (summaryMap.has(key)) continue;

    const sample = plans[0];
    const planned = plans.reduce((sum, p) => sum + p.plannedKg, 0);

    summaryMap.set(key, {
      key,
      weekStart: sample.weekStart,
      farmerId: sample.farmerId,
      farmerName: sample.farmerName,
      cookingType: sample.cookingType,
      deliveredKg: 0,
      plannedKg: planned,
      diffKg: -planned,
      coveragePercent: planned > 0 ? 0 : null,
    });
  }

  // 5) Filter nach Kochtyp
  let summaryRows = Array.from(summaryMap.values());
  if (statsCookingFilter !== "alle") {
    summaryRows = summaryRows.filter(
      (r) => r.cookingType === statsCookingFilter
    );
  }

  // 6) Sortierung: Woche -> Bauer -> Kochtyp
  summaryRows = summaryRows.sort((a, b) => {
    if (a.weekStart !== b.weekStart) {
      return a.weekStart.localeCompare(b.weekStart);
    }
    if (a.farmerName !== b.farmerName) {
      return a.farmerName.localeCompare(b.farmerName, "de");
    }
    return a.cookingType.localeCompare(b.cookingType);
  });

  // 7) Laufender Saldo & Erfüllungs-% je Bauer+Kochtyp
  type DeliverySummaryRowWithSaldo = DeliverySummaryRow & {
    saldoKg: number;
    fulfillmentPercent: number | null;
  };

  const rowsWithSaldo: DeliverySummaryRowWithSaldo[] = [];
  const saldoMap = new Map<string, number>(); // key = farmerId|cookingType

  for (const r of summaryRows) {
    const key = `${r.farmerId}|${r.cookingType}`;

    // Saldo kg kumuliert: Überlieferung = +, Unterlieferung = -
    const prevSaldo = saldoMap.get(key) ?? 0;
    const newSaldo = prevSaldo + (r.deliveredKg - r.plannedKg);
    saldoMap.set(key, newSaldo);

    // Erfüllung % nur für diese Woche (nicht kumuliert)
    let fulfillmentPercent: number | null = null;
    if (r.plannedKg > 0) {
      fulfillmentPercent = (r.deliveredKg / r.plannedKg) * 100;
    }

    rowsWithSaldo.push({
      ...r,
      saldoKg: newSaldo,
      fulfillmentPercent,
    });
  }

  // 8) Summen je Kocheigenschaft bis zur aktuellen Woche
  const currentWeekStart = weekStartOf(now.toISOString().substring(0, 10));
  
  // Saldo-Summen je Kocheigenschaft
  const saldoSumsByCooking: Record<CookingType | "UNBEKANNT", number> = {
    FESTKOCHEND: 0,
    VORWIEGEND_FESTKOCHEND: 0,
    MEHLIG: 0,
    UNBEKANNT: 0,
  };

  // Finde für jeden Bauer+Kochtyp die letzte Zeile bis zur aktuellen Woche
  const farmerCookingKeys = new Set<string>();
  for (const r of rowsWithSaldo) {
    if (r.weekStart <= currentWeekStart) {
      farmerCookingKeys.add(`${r.farmerId}|${r.cookingType}`);
    }
  }

  for (const key of farmerCookingKeys) {
    const [, cookingTypeStr] = key.split("|");
    const cookingType = cookingTypeStr as CookingType | "UNBEKANNT";
    
    // Finde die neueste Zeile für diesen Bauer+Kochtyp bis zur aktuellen Woche
    const relevantRows = rowsWithSaldo.filter(
      (r) => `${r.farmerId}|${r.cookingType}` === key && r.weekStart <= currentWeekStart
    );
    if (relevantRows.length > 0) {
      // Sortiere nach Woche (neueste zuerst) und nimm den Saldo der neuesten
      const sorted = relevantRows.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
      const lastSaldo = sorted[0].saldoKg;
      
      if (cookingType in saldoSumsByCooking) {
        saldoSumsByCooking[cookingType] += lastSaldo;
      } else {
        saldoSumsByCooking.UNBEKANNT += lastSaldo;
      }
    }
  }

  return (
    <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
      {/* Steuerung oben */}
      <section className="content-card">
        <h2>Lieferungen & Planmengen (Rohware in Packstelle)</h2>
        <p style={{ fontSize: "0.9375rem" }}>
          Aggregiert nach Woche, Bauer und Kocheigenschaft. Grundlage sind
          Bewegungen mit Grund <code>RAW_IN_FROM_FARMER</code> und die
          hinterlegten Planmengen.
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <label>Rückblick (Wochen)</label>
            <input
              type="number"
              min={1}
              max={52}
              value={deliveryWeeksBack}
              onChange={(e) => setDeliveryWeeksBack(e.target.value)}
              style={{ width: "5rem", marginLeft: "0.5rem" }}
            />
          </div>

          <div>
            <label>Vorschau (Wochen)</label>
            <input
              type="number"
              min={0}
              max={52}
              value={planWeeksForward}
              onChange={(e) => setPlanWeeksForward(e.target.value)}
              style={{ width: "5rem", marginLeft: "0.5rem" }}
            />
          </div>

          <div>
            <label style={{ marginRight: "0.5rem" }}>Jahr (für Pläne)</label>
            <input
              type="number"
              value={planYear}
              onChange={(e) =>
                setPlanYear(
                  Number(e.target.value) || new Date().getFullYear()
                )
              }
              style={{ width: "6rem" }}
            />
          </div>

          <div>
            <label style={{ marginRight: "0.5rem" }}>Bauer</label>
            <select
              value={planFarmerId}
              onChange={(e) =>
                setPlanFarmerId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
            >
              <option value="">alle</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ marginRight: "0.5rem" }}>
              Kocheigenschaft
            </label>
            <select
              value={statsCookingFilter}
              onChange={(e) =>
                setStatsCookingFilter(
                  e.target.value === "alle"
                    ? "alle"
                    : (e.target.value as CookingType)
                )
              }
            >
              <option value="alle">alle</option>
              <option value="FESTKOCHEND">festkochend</option>
              <option value="VORWIEGEND_FESTKOCHEND">
                vorw. festk.
              </option>
              <option value="MEHLIG">mehlig</option>
            </select>
          </div>

          <button
            type="button"
            onClick={async () => {
              const w = Number(deliveryWeeksBack || "52");
              const fId =
                typeof planFarmerId === "number" ? planFarmerId : undefined;

              await Promise.all([
                loadOrganizerDeliveries(w),
                loadDeliveryPlans(planYear, fId),
              ]);
              showMessage("Statistik aktualisiert");
            }}
          >
            Daten laden / aktualisieren
          </button>
        </div>
      </section>

      {/* Summenzeile je Kocheigenschaft (bis zur aktuellen Woche) */}
      {rowsWithSaldo.length > 0 && (
        <section className="content-card">
          <h3>Saldo-Summen je Kocheigenschaft (bis zur aktuellen Woche)</h3>
          <div 
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            {(["FESTKOCHEND", "VORWIEGEND_FESTKOCHEND", "MEHLIG"] as CookingType[]).map((cookingType) => {
              const saldo = saldoSumsByCooking[cookingType] || 0;
              const isNegative = saldo < 0;
              const isPositive = saldo > 0;
              
              return (
                <div
                  key={cookingType}
                  style={{
                    background: isNegative 
                      ? "#7f1d1d" 
                      : isPositive 
                      ? "#064e3b" 
                      : "#374151",
                    color: isNegative 
                      ? "#fee2e2" 
                      : isPositive 
                      ? "#d1fae5" 
                      : "#f9fafb",
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    textAlign: "center",
                    border: saldo === 0 ? "1px solid #4b5563" : "none",
                  }}
                >
                  <div style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "0.5rem" }}>
                    {cookingType === "FESTKOCHEND" 
                      ? "festkochend" 
                      : cookingType === "VORWIEGEND_FESTKOCHEND"
                      ? "vorw. festk."
                      : "mehlig"}
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                    {saldo >= 0 ? "+" : ""}{formatKg(saldo)} kg
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tabelle: Wochenübersicht */}
      <section className="content-card">
        <h3>Wochenübersicht (je Bauer & Kochtyp)</h3>

        {rowsWithSaldo.length === 0 ? (
          <p style={{ fontSize: "0.9375rem" }}>
            Noch keine Daten im gewählten Zeitraum.
          </p>
        ) : (
          <table style={{ width: "100%", fontSize: "0.9375rem" }}>
            <thead>
              <tr>
                <th>KW-Beginn</th>
                <th>Bauer</th>
                <th>Kocheigenschaft</th>
                <th>Planmenge kg</th>
                <th>geliefert kg</th>
                <th>Diff kg</th>
                <th>Erfüllung %</th>
                <th>Saldo kg</th>
              </tr>
            </thead>
            <tbody>
              {rowsWithSaldo.map((r) => (
                <tr key={r.key}>
                  <td>{r.weekStart}</td>
                  <td>{r.farmerName}</td>
                  <td>{r.cookingType}</td>
                  <td>{formatKg(r.plannedKg)}</td>
                  <td>{formatKg(r.deliveredKg)}</td>
                  <td>{formatKg(r.diffKg)}</td>
                  <td>
                    {r.fulfillmentPercent == null
                      ? "-"
                      : formatPercent(r.fulfillmentPercent)}
                  </td>
                  <td
                    style={{
                      backgroundColor: r.saldoKg < 0 ? "#7f1d1d" : r.saldoKg > 0 ? "#064e3b" : "transparent",
                      color: r.saldoKg < 0 ? "#fee2e2" : r.saldoKg > 0 ? "#d1fae5" : "inherit",
                      fontWeight: r.saldoKg !== 0 ? 600 : 400,
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      textAlign: "right",
                    }}
                  >
                    {r.saldoKg >= 0 ? "+" : ""}{formatKg(r.saldoKg)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Rohdaten-Liste, wie gehabt */}
      <section className="content-card">
        <h3>Rohdaten Lieferungen (Bewegungen RAW_IN_FROM_FARMER)</h3>
        <table style={{ width: "100%", fontSize: "0.9375rem" }}>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Bauer</th>
              <th>Sorte</th>
              <th>Kochtyp</th>
              <th>Qualität</th>
              <th>Menge kg</th>
            </tr>
          </thead>
          <tbody>
            {organizerDeliveries.map((d) => (
              <tr key={d.id}>
                <td>{d.date.substring(0, 10)}</td>
                <td>{d.farmerName}</td>
                <td>{d.varietyName}</td>
                <td>{d.cookingType ?? "-"}</td>
                <td>{d.quality ?? "-"}</td>
                <td>{formatKg(d.quantityKg)}</td>
              </tr>
            ))}
            {organizerDeliveries.length === 0 && (
              <tr>
                <td colSpan={6}>Keine Lieferungen im Zeitraum.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

