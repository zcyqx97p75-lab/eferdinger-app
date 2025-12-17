import React from "react";
import type {
  CookingType,
  Farmer,
  OrganizerDelivery,
  DeliveryPlanRow,
  DeliverySummaryRow,
  CurrentUser,
  FarmerPackStat,
} from "../../types";
import { formatKg, formatPercent } from "../../utils";
import { ActionCard } from "../ActionCard";

interface FarmerStatsPlanningTabProps {
  isFarmer: boolean;
  currentUser: CurrentUser | null;
  farmers: Farmer[];
  organizerDeliveries: OrganizerDelivery[];
  deliveryPlans: DeliveryPlanRow[];
  deliveryWeeksBack: string;
  setDeliveryWeeksBack: (value: string) => void;
  planWeeksForward: string;
  setPlanWeeksForward: (value: string) => void;
  statsCookingFilter: CookingType | "alle";
  setStatsCookingFilter: (value: CookingType | "alle") => void;
  planYear: number;
  farmerPackStats: FarmerPackStat[];
  statsMaxDeliveries: string;
  setStatsMaxDeliveries: (value: string) => void;
  loadFarmerPackStats: (farmerId: number) => Promise<void>;
  loadOrganizerDeliveries: (weeks: number) => Promise<void>;
  loadDeliveryPlans: (year: number, farmerId?: number) => Promise<void>;
  showMessage: (text: string) => void;
}

function getSeasonStart(year: number): string {
  // fixer Neustart der Saison: 15.05. des Jahres
  const safeYear =
    Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();

  // YYYY-05-15
  return `${safeYear}-05-15`;
}

export const FarmerStatsPlanningTab: React.FC<FarmerStatsPlanningTabProps> = ({
  isFarmer,
  currentUser,
  farmers,
  organizerDeliveries,
  deliveryPlans,
  deliveryWeeksBack,
  setDeliveryWeeksBack,
  planWeeksForward,
  setPlanWeeksForward,
  statsCookingFilter,
  setStatsCookingFilter,
  planYear,
  farmerPackStats,
  statsMaxDeliveries,
  setStatsMaxDeliveries,
  loadFarmerPackStats,
  loadOrganizerDeliveries,
  loadDeliveryPlans,
  showMessage,
}) => {
  if (!isFarmer || !currentUser?.farmerId) {
    return <p>Nur für eingeloggte Bauern sichtbar.</p>;
  }

  const farmerId = currentUser.farmerId;
  const farmerName =
    farmers.find((f) => f.id === farmerId)?.name ?? "dein Betrieb";

  // Lieferungen & Pläne nur für diesen Bauern
  const farmerDeliveries = organizerDeliveries.filter(
    (d) => d.farmerId === farmerId
  );
  const farmerPlans = deliveryPlans.filter((p) => p.farmerId === farmerId);

  const weeksBackNum = Number(deliveryWeeksBack || "52");
  const weeksForwardNum = Number(planWeeksForward || "2");

  const now = new Date();
  const minDate = new Date(now);
  minDate.setDate(now.getDate() - weeksBackNum * 7);
  minDate.setHours(0, 0, 0, 0);

  const maxDate = new Date(now);
  maxDate.setDate(now.getDate() + weeksForwardNum * 7);
  maxDate.setHours(23, 59, 59, 999);

  function weekStartOf(dateStr: string): string {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0=So
    const diff = (day + 6) % 7; // Montag
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().substring(0, 10);
  }

  // Planmengen-Map (nur im Zeitfenster)
  const planMap = new Map<string, DeliveryPlanRow[]>();
  for (const p of farmerPlans) {
    const d = new Date(p.weekStart);
    if (d < minDate || d > maxDate) continue;

    const key = `${p.weekStart}|${p.farmerId}|${p.cookingType}`;
    const list = planMap.get(key) ?? [];
    list.push(p);
    planMap.set(key, list);
  }

  // Zusammenfassung: Woche + Kochtyp
  const summaryMap = new Map<string, DeliverySummaryRow>();

  // Lieferungen (nur im Zeitfenster)
  for (const d of farmerDeliveries) {
    const dateObj = new Date(d.date);
    if (dateObj < minDate || dateObj > maxDate) continue;

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

  // Planmengen auf bestehende Zeilen legen
  for (const [key, row] of summaryMap.entries()) {
    const plans = planMap.get(key);
    const planned = plans
      ? plans.reduce((sum, p) => sum + p.plannedKg, 0)
      : 0;

    row.plannedKg = planned;
    row.diffKg = row.deliveredKg - planned;
    if (planned > 0) {
      row.coveragePercent = (row.deliveredKg / planned) * 100;
    } else {
      row.coveragePercent = null;
    }
  }

  // Zeilen, die nur Planmengen (Zukunft) haben, ergänzen
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
      coveragePercent: null,
    });
  }

  // in Array umwandeln
  let summaryRows = Array.from(summaryMap.values());

  // Kocheigenschaft filtern
  if (statsCookingFilter !== "alle") {
    summaryRows = summaryRows.filter(
      (r) => r.cookingType === statsCookingFilter
    );
  }

  // Saisonstart (fix 15.05. des Jahres) berücksichtigen
  const seasonStart = getSeasonStart(planYear);
  summaryRows = summaryRows.filter((r) => r.weekStart >= seasonStart);

  // Sortierung: Woche -> Kochtyp
  summaryRows = summaryRows.sort((a, b) => {
    if (a.weekStart !== b.weekStart) {
      return a.weekStart.localeCompare(b.weekStart);
    }
    return a.cookingType.localeCompare(b.cookingType);
  });

  // Laufender Saldo pro Kochtyp (für diesen Bauern) + Erfüllungs-%
  type DeliverySummaryRowWithSaldo = DeliverySummaryRow & {
    saldoKg: number;
    fulfillmentPercent: number | null;
  };

  const rowsWithSaldo: DeliverySummaryRowWithSaldo[] = [];
  const saldoMap = new Map<string, number>(); // kg-Saldo kumuliert

  for (const r of summaryRows) {
    const key = String(r.cookingType);

    // 1) Saldo kg kumuliert: Überlieferung = +, Unterlieferung = -
    const prevSaldo = saldoMap.get(key) ?? 0;
    const newSaldo = prevSaldo + (r.deliveredKg - r.plannedKg);
    saldoMap.set(key, newSaldo);

    // 2) Erfüllung % nur für diese Woche (nicht kumuliert)
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

  return (
    <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
      {/* Packstellen-Auswertung (für Bauer) */}
      <ActionCard
        icon="📊"
        title={`Packstelle – Auswertung für ${farmerName}`}
        variant="default"
      >
        <p style={{ fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
          Angelieferte Rohware, verpackte Menge, Sortierabfall, Inventurverluste
          und Ausbeute/Verlust in Prozent. Begrenze die Anzahl der Lieferungen
          (Partien), die berücksichtigt werden sollen.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (farmerId) {
              loadFarmerPackStats(farmerId).catch(console.error);
            }
          }}
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "0.75rem",
            fontSize: "0.9375rem",
          }}
        >
          <label>
            Anzahl Lieferungen (Partien):
            <input
              type="number"
              min={1}
              step={1}
              style={{ width: "4rem", marginLeft: "0.25rem" }}
              value={statsMaxDeliveries}
              onChange={(e) => setStatsMaxDeliveries(e.target.value)}
            />
          </label>
          <button type="submit">Übernehmen</button>
          <span style={{ opacity: 0.85, color: "#cbd5e1" }}>
            leer oder 0 = alle Lieferungen
          </span>
        </form>

        {farmerPackStats.length === 0 ? (
          <p style={{ fontSize: "0.9375rem" }}>
            Es liegen noch keine Packstellen-Daten vor.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
            {farmerPackStats.map((r) => (
              <div
                key={r.varietyId}
                style={{
                  background: "rgba(51, 65, 85, 0.5)",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  border: "1px solid #475569",
                }}
              >
                {/* Hauptdaten - prominent */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "#f8fafc", marginBottom: "0.25rem" }}>
                      {r.varietyName}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#cbd5e1" }}>
                      {r.cookingType} • {r.quality}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Lagerstand</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#10b981" }}>
                      {formatKg(r.currentKg)}
                    </div>
                  </div>
                </div>

                {/* Ausbeute - prominent */}
                <div style={{ 
                  background: r.yieldPercent && r.yieldPercent >= 80 ? "rgba(16, 185, 129, 0.2)" : r.yieldPercent && r.yieldPercent >= 60 ? "rgba(234, 179, 8, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                  marginBottom: "0.75rem",
                  border: `1px solid ${r.yieldPercent && r.yieldPercent >= 80 ? "#10b981" : r.yieldPercent && r.yieldPercent >= 60 ? "#eab308" : "#ef4444"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.875rem", color: "#cbd5e1", marginBottom: "0.25rem" }}>Ausbeute</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: r.yieldPercent && r.yieldPercent >= 80 ? "#10b981" : r.yieldPercent && r.yieldPercent >= 60 ? "#eab308" : "#ef4444" }}>
                        {formatPercent(r.yieldPercent)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.875rem", color: "#cbd5e1", marginBottom: "0.25rem" }}>Verlust</div>
                      <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "#ef4444" }}>
                        {formatPercent(r.lossPercent)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details - kompakt */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(2, 1fr)", 
                  gap: "0.5rem",
                  fontSize: "0.8125rem",
                  color: "#94a3b8",
                }}>
                  <div>
                    <span style={{ color: "#64748b" }}>Angeliefert:</span> {formatKg(r.deliveredKg)}
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Verpackt:</span> {formatKg(r.packedKg)}
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Ausschuss:</span> {formatKg(r.wasteKg)}
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Verlust ges.:</span> {formatKg(r.totalLossKg)}
                  </div>
                  {r.inventoryZeroKg > 0 && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ color: "#64748b" }}>Inventur 0:</span> {formatKg(r.inventoryZeroKg)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ActionCard>

      {/* Planung: Lieferungen vs. Planmengen */}
      <ActionCard
        icon="📅"
        title="Planung – Lieferungen & Planmengen"
        variant="default"
      >
        <p style={{ fontSize: "0.9375rem" }}>
          Hier siehst du, wie viel Rohware du je Woche liefern sollst
          (Planmenge) und wie viel tatsächlich angeliefert wurde.
          Positive Diff = mehr geliefert als geplant, negative Diff =
          weniger geliefert. Der Saldo zeigt, wie viel Planmenge seit
          Saisonstart (15.05.) noch offen ist (positiv) oder bereits
          übererfüllt wurde (negativ).
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <label>Rückblick (Wochen)</label>
            <input
              type="number"
              min={0}
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
              await Promise.all([
                loadOrganizerDeliveries(w),
                loadDeliveryPlans(planYear, farmerId),
              ]);
              showMessage("Planung aktualisiert");
            }}
          >
            Daten laden / aktualisieren
          </button>
        </div>

        {/* Saldo-Summen je Kocheigenschaft (bis zur aktuellen Woche) */}
        {rowsWithSaldo.length > 0 && (() => {
          const now = new Date();
          const currentWeekStart = weekStartOf(now.toISOString().substring(0, 10));
          
          // Saldo-Summen je Kocheigenschaft
          const saldoSumsByCooking: Record<CookingType | "UNBEKANNT", number> = {
            FESTKOCHEND: 0,
            VORWIEGEND_FESTKOCHEND: 0,
            MEHLIG: 0,
            UNBEKANNT: 0,
          };

          // Finde für jeden Kochtyp die letzte Zeile bis zur aktuellen Woche
          const cookingKeys = new Set<string>();
          for (const r of rowsWithSaldo) {
            if (r.weekStart <= currentWeekStart) {
              cookingKeys.add(r.cookingType);
            }
          }

          for (const cookingTypeStr of cookingKeys) {
            const cookingType = cookingTypeStr as CookingType | "UNBEKANNT";
            
            // Finde die neueste Zeile für diesen Kochtyp bis zur aktuellen Woche
            const relevantRows = rowsWithSaldo.filter(
              (r) => r.cookingType === cookingTypeStr && r.weekStart <= currentWeekStart
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
            <ActionCard
              icon="📊"
              title="Saldo-Summen je Kocheigenschaft (bis zur aktuellen Woche)"
              variant="default"
            >
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
            </ActionCard>
          );
        })()}

        {rowsWithSaldo.length === 0 ? (
          <p style={{ fontSize: "0.9375rem" }}>
            Im gewählten Zeitraum liegen noch keine Daten vor.
          </p>
        ) : (
          <table style={{ width: "100%", fontSize: "0.9375rem" }}>
            <thead>
              <tr>
                <th>KW-Beginn</th>
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
                  <td>{r.cookingType}</td>
                  <td>{formatKg(r.plannedKg)}</td>
                  <td>{formatKg(r.deliveredKg)}</td>
                  <td>{formatKg(r.diffKg)}</td>
                  <td>
                    {r.fulfillmentPercent == null
                      ? "-"
                      : formatPercent(r.fulfillmentPercent)}
                  </td>
                  <td style={{ textAlign: "left" }}>{r.saldoKg >= 0 ? "+" : ""}{formatKg(r.saldoKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ActionCard>
    </div>
  );
};

