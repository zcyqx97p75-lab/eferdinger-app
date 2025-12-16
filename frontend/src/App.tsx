import React, { useEffect, useState, useRef } from "react";
import logoImg from "./assets/images/Logo.png";
import bgImg from "./assets/images/IMG_5623.jpeg";
import type {
  CookingType,
  VarietyQuality,
  CookingFilter,
  QualityFilter,
  Farmer,
  FarmerStock,
  FarmerPackStat,
  Variety,
  Product,
  PackPlant,
  PackPlantStock,
  Customer,
  Price,
  PackStationStock,
  OrganizerDelivery,
  DeliveryPlanRow,
  DeliverySummaryRow,
  CurrentUser,
  ConfirmAction,
  Tab,
} from "./types";
import {
  formatCurrency,
  formatKg,
  formatPercent,
  formatAmount,
  parseKg,
  getCookingLabel,
  openDatePickerOnFocus,
  openSelectOnFocus,
} from "./utils";
import { CalcInput } from "./components/CalcInput";
import { ActionCard } from "./components/ActionCard";
import { calcCookingSums, SummaryRow } from "./components/SummaryRow";
import { OrganizerStatsTab } from "./components/tabs/OrganizerStatsTab";
import { PackstationTab } from "./components/tabs/PackstationTab";
import { StammdatenTab } from "./components/tabs/StammdatenTab";
import { FarmerStockTab } from "./components/tabs/FarmerStockTab";
import { FarmerStatsPlanningTab } from "./components/tabs/FarmerStatsPlanningTab";
import { LagerInventurTab } from "./components/tabs/LagerInventurTab";
import { VerkaufTab } from "./components/tabs/VerkaufTab";
import { ReklamationTab } from "./components/tabs/ReklamationTab";
import { StatistikTab } from "./components/tabs/StatistikTab";
import { AbrechnungenTab } from "./components/tabs/AbrechnungenTab";
import { KalkulationenTab } from "./components/tabs/KalkulationenTab";
import {
  useAuth,
  useFarmers,
  useProducts,
  useCustomers,
  useVarieties,
  useTabs,
} from "./hooks";
import {
  loadOrganizerDeliveries as loadOrganizerDeliveriesService,
  loadDeliveryPlans as loadDeliveryPlansService,
  loadPackStations,
  loadPackPlants,
  loadPackPlantStock,
  loadPackStationStock,
  loadFarmerStocks as loadFarmerStocksService,
  loadFarmerPackStats,
  loadPrices as loadPricesService,
  loadQualityPrices,
  loadRecentPackagingRuns,
  loadRecentWasteMovements,
  loadRecentInventoryZeroMovements,
  loadAllUsers,
  resetUserPassword,
  type AdminUser,
  loadManualCosts,
  loadPnl,
  loadTaxRates,
  type TaxRate,
  type ManualCost,
  loadReklCustomers,
  loadReklProducts,
  loadReklSales,
  loadReklRelevantFarmers,
  loadPackbetriebStatistics,
  type PackagingRun,
  type WasteMovement,
  type InventoryZeroMovement,
  type QualityPrice,
} from "./services";
import {
  createOrUpdateFarmer,
  resetFarmerPassword,
  createOrUpdateProduct,
  createOrUpdateCustomer,
  createOrUpdatePrice,
  createUser,
} from "./handlers";

// API_URL wird jetzt von services/apiClient.ts exportiert
import { API_URL } from "./services";
console.log("API_URL FRONTEND =", API_URL);

// ---------------------------------------------
// NumericCalculator - Taschenrechner-Eingabe für Zahlenfelder
// ---------------------------------------------
// (Ausgelagert nach src/components/CalcInput.tsx)

// ---------------------------------------------
// ActionCard - Wiederverwendbare Funktions-Karte
// ---------------------------------------------
// (Ausgelagert nach src/components/ActionCard.tsx)

// ---------------------------------------------
// Summenberechnung und Anzeige nach Kocheigenschaft
// ---------------------------------------------
// (Ausgelagert nach src/components/SummaryRow.tsx)

// ==== Tab-Komponenten ====

function RenderOrganizerStatsTab({
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
}: {
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
}) {
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
                loadDeliveryPlansWrapper(planYear, fId),
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

// ==== App ====

export default function App() {
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  }

  // Custom Hooks für State-Management
  const { tab, setTab } = useTabs("farmerStock");
  const { farmers, setFarmers, loadFarmers } = useFarmers();
  const { products, setProducts, loadProducts } = useProducts();
  const { customers, setCustomers, loadCustomers } = useCustomers();
  const { varieties, setVarieties, loadVarieties } = useVarieties();

  const safeProducts = Array.isArray(products) ? products : [];
  const safeFarmers = Array.isArray(farmers) ? farmers : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeVarieties = Array.isArray(varieties) ? varieties : [];

  const [packStations, setPackStations] = useState<{ id: number; name: string }[]>([]);
  const [farmerStocks, setFarmerStocks] = useState<FarmerStock[]>([]);
  const [farmerPackStats, setFarmerPackStats] = useState<FarmerPackStat[]>([]);
  const [statsMaxDeliveries, setStatsMaxDeliveries] = useState<string>("10");
  const [planYear, setPlanYear] = useState<number>(new Date().getFullYear());
  const [planFarmerId, setPlanFarmerId] = useState<number | "">("");
  const [statsCookingFilter, setStatsCookingFilter] = useState<CookingType | "alle">("alle");
  // Organisator-Statistik
  const [organizerDeliveries, setOrganizerDeliveries] = useState<OrganizerDelivery[]>([]);
  const [deliveryPlans, setDeliveryPlans] = useState<DeliveryPlanRow[]>([]);
  const [deliveryWeeksBack, setDeliveryWeeksBack] = useState<string>("52");
  const [planWeeksForward, setPlanWeeksForward] = useState<string>("2");
   
  // Packstelle: 0-Inventur Formular
  const [packZeroSelection, setPackZeroSelection] = useState<string>("");
  const [packZeroComment, setPackZeroComment] = useState<string>("");

  // Packstelle: Tab-Navigation für Bereiche
  const [packCarouselIndex, setPackCarouselIndex] = useState<number>(0);

  // Packstellen-Lager + Formulare
  const [packStationStocks, setPackStationStocks] = useState<PackStationStock[]>([]);

  // Letzte Buchungen für Packstelle
  const [recentPackagingRuns, setRecentPackagingRuns] = useState<PackagingRun[]>([]);
  const [recentWasteMovements, setRecentWasteMovements] = useState<WasteMovement[]>([]);
  const [recentInventoryZeroMovements, setRecentInventoryZeroMovements] = useState<InventoryZeroMovement[]>([]);

  // Bearbeitung für Packstellen-Buchungen
  const [editingPackagingRunId, setEditingPackagingRunId] = useState<number | null>(null);
  const [editingWasteId, setEditingWasteId] = useState<number | null>(null);
  const [editingInventoryZeroId, setEditingInventoryZeroId] = useState<number | null>(null);
  const [editPackagingRunDate, setEditPackagingRunDate] = useState<string>("");
  const [editPackagingRunProductId, setEditPackagingRunProductId] = useState<number | "">("");
  const [editPackagingRunFarmerId, setEditPackagingRunFarmerId] = useState<number | "">("");
  const [editPackagingRunVarietyId, setEditPackagingRunVarietyId] = useState<number | "">("");
  const [editPackagingRunVarietiesForFarmer, setEditPackagingRunVarietiesForFarmer] = useState<Variety[]>([]);
  const [editPackagingRunColli, setEditPackagingRunColli] = useState<string>("");
  const [editPackagingRunWasteKg, setEditPackagingRunWasteKg] = useState<string>("");
  const [editPackagingRunRawInputKg, setEditPackagingRunRawInputKg] = useState<string>("");
  const [editPackagingRunFinishedKg, setEditPackagingRunFinishedKg] = useState<string>("");
  const [editWasteKg, setEditWasteKg] = useState<string>("");
  const [editWasteComment, setEditWasteComment] = useState<string>("");
  const [editInventoryZeroComment, setEditInventoryZeroComment] = useState<string>("");
  const [editInventoryZeroStockKg, setEditInventoryZeroStockKg] = useState<string>("");

  // Filter für Packstellen-Lager
  const [packLagerFilterFarmer, setPackLagerFilterFarmer] = useState<number | "alle">("alle");
  const [packLagerFilterCooking, setPackLagerFilterCooking] = useState<CookingFilter>("alle");
  const [packLagerFilterVariety, setPackLagerFilterVariety] = useState<number | "alle">("alle");
  const [packLagerFilterQuality, setPackLagerFilterQuality] = useState<QualityFilter>("alle");
  const [packLagerFilterUnder3000, setPackLagerFilterUnder3000] = useState<boolean>(false);

  const [wasteSelection, setWasteSelection] = useState<string>(""); // "farmerId-varietyId"
  const [wasteKg, setWasteKg] = useState<string>("");

  const [packSelection, setPackSelection] = useState<string>("");   // "farmerId-varietyId"
  const [packProductId, setPackProductId] = useState<number | "">("");
  const [packColli, setPackColli] = useState<string>("");   
  const [packUnits, setPackUnits] = useState<string>("");

  const [_zeroSelection, _setZeroSelection] = useState<string>("");   // "farmerId-varietyId" (reserviert für spätere Verwendung)

// Login
  // Auth Hook mit Logout-Callback für State-Reset
  const {
    currentUser,
    setCurrentUser,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    handleLogin,
    handleLogout: authHandleLogout,
  } = useAuth(showMessage, () => {
    // Logout-Callback: Alle relevanten States zurücksetzen
    setFarmerStocks([]);
    setFarmerPackStats([]);
    setPackStationStocks([]);
    setOrganizerDeliveries([]);
    setDeliveryPlans([]);
    setPackZeroSelection("");
    setPackZeroComment("");
    setWasteSelection("");
    setWasteKg("");
    setPackSelection("");
    setPackProductId("");
    setPackColli("");
    setPackUnits("");
  });

     // Stammdaten-Formulare
 // Stammdaten-Formulare – Bauern
  const [farmerName, setFarmerName] = useState("");
  const [farmerStreet, setFarmerStreet] = useState("");
  const [farmerPostalCode, setFarmerPostalCode] = useState("");
  const [farmerCity, setFarmerCity] = useState("");
  const [farmerGGN, setFarmerGGN] = useState("");
  const [farmerLoginEmail, setFarmerLoginEmail] = useState("");
  const [farmerLoginPassword, setFarmerLoginPassword] = useState("");
  const [farmerIsFlatRate, setFarmerIsFlatRate] = useState(false);
  const [farmerFlatRateNote, setFarmerFlatRateNote] = useState("");
  const [editingFarmerId, setEditingFarmerId] = useState<number | null>(null);

  // User anlegen (Admin)
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"EG_ADMIN" | "ORGANISATOR" | "PACKSTELLE" | "PACKBETRIEB">("PACKBETRIEB");
  const [userCreateError, setUserCreateError] = useState<string | null>(null);

  // Passwort-Reset (Admin)
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [selectedFarmerId, setSelectedFarmerId] = useState<number | "">("");
  const [newFarmerPassword, setNewFarmerPassword] = useState("");
  const [farmerPasswordResetError, setFarmerPasswordResetError] = useState<string | null>(null);

  const [productName, setProductName] = useState("");
  const [productCookingType, setProductCookingType] = useState<CookingType>("FESTKOCHEND");
  const [productPackagingType, setProductPackagingType] = useState("");
  const [productNumber, setProductNumber] = useState("");
  const [productUnitKg, setProductUnitKg] = useState("2");
  const [productUnitsPerColli, setProductUnitsPerColli] = useState("");
  const [productCollisPerPallet, setProductCollisPerPallet] = useState("");
  const [productTaxRateId, setProductTaxRateId] = useState<number | "">("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  
  const [varietyName, setVarietyName] = useState("");
  const [varietyCookingType, setVarietyCookingType] = useState<CookingType>("FESTKOCHEND");
  const [varietyQuality, setVarietyQuality] = useState<VarietyQuality>("Q1");
  const [editingVarietyId, setEditingVarietyId] = useState<number | null>(null);
  
  const [customerName, setCustomerName] = useState("");
  const [customerRegion, setCustomerRegion] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [priceCustomerId, setPriceCustomerId] = useState<number | "">("");
  const [priceProductId, setPriceProductId] = useState<number | "">("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [pricePackingCostPerUnit, setPricePackingCostPerUnit] = useState("");
  const [priceValidFrom, setPriceValidFrom] = useState("");

  // Qualitätspreise (Rohware-Ankauf)
  const [qualityPrices, setQualityPrices] = useState<QualityPrice[]>([]);
  const [qpQuality, setQpQuality] = useState<VarietyQuality>("Q1");
  const [qpValidFrom, setQpValidFrom] = useState("");
  const [qpValidTo, setQpValidTo] = useState("");
  const [qpPricePerKg, setQpPricePerKg] = useState("");
  const [qpTaxRateId, setQpTaxRateId] = useState<number | "">("");
  const [editingQualityPriceId, setEditingQualityPriceId] = useState<number | null>(null);
  
  // Tax Rates
  // TaxRate Type aus services/calculationService.ts importiert
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);

  // Planmengen manuell erfassen
  const [planFarmerIdInput, setPlanFarmerIdInput] = useState<number | "">("");
  const [planCookingTypeInput, setPlanCookingTypeInput] = useState<CookingType>("FESTKOCHEND");
  const [planMonthInput, setPlanMonthInput] = useState<number | "">("");
  const [planWeekInput, setPlanWeekInput] = useState<number | "">("");
  const [planQuantityKgInput, setPlanQuantityKgInput] = useState("");

 // Bauernlager-Filter
  const [stockProductFilterId, setStockProductFilterId] = useState<"alle" | number>("alle");
  const [stockFilterFarmerId, setStockFilterFarmerId] = useState<number | "">("");
  const [stockCookingFilter, setStockCookingFilter] = useState<CookingFilter>("alle");
  const [stockQualityFilter, setStockQualityFilter] = useState<QualityFilter>("alle");

// Bauernlager-Formulare (nur Bauer) – jetzt auf Sorte
  const [invVarietyId, setInvVarietyId] = useState<number | "">("");
  const [invQuantityKg, setInvQuantityKg] = useState("");

  const [egVarietyId, setEgVarietyId] = useState<number | "">("");
  const [egQuantityKg, setEgQuantityKg] = useState("");
  const [egFieldName, setEgFieldName] = useState("");
  const [egHarvestDate, setEgHarvestDate] = useState("");
  const [egSortierGroesse, setEgSortierGroesse] = useState<string>("");
  const [egQuality, setEgQuality] = useState<VarietyQuality | "">("");

  // Packbetrieb-Formular (Verkauf an EZG im Namen eines Bauern)
  const [pbFarmerId, setPbFarmerId] = useState<number | "">("");
  const [pbVarietyId, setPbVarietyId] = useState<number | "">("");
  const [pbQuantityKg, setPbQuantityKg] = useState("");
  const [pbFieldName, setPbFieldName] = useState("");
  const [pbHarvestDate, setPbHarvestDate] = useState("");
  const [pbSortierGroesse, setPbSortierGroesse] = useState<string>("");
  const [pbQuality, setPbQuality] = useState<VarietyQuality | "">("");


  // === PACKBETRIEB: Verkauf / Inventur (Fertigware) ===
  const [packPlantStocks, setPackPlantStocks] = useState<PackPlantStock[]>([]);

  // Verkauf verpackter Produkte an Kunden
  const [saleCustomerId, setSaleCustomerId] = useState<number | "">("");
  const [saleProductId, setSaleProductId] = useState<number | "">("");
  const [saleVarietyId, setSaleVarietyId] = useState<number | "">("");
  const [saleFarmerId, setSaleFarmerId] = useState<number | "">("");
  const [saleQuantityUnits, setSaleQuantityUnits] = useState<string>("");
  const [saleDate, setSaleDate] = useState<string>(
    () => new Date().toISOString().substring(0, 10)
  );
  const [salePriceOverride, setSalePriceOverride] = useState<string>("");

  // optional: später für Inventur + Reklamation verwendbar
  const [invProductId, setInvProductId] = useState<number | "">("");
  const [invQuantityUnits, setInvQuantityUnits] = useState<string>("");
  const [invPricePerUnit, setInvPricePerUnit] = useState<string>("");

  // Packbetrieb Statistik
  const [statisticsData, setStatisticsData] = useState<{
    sales: any[];
    complaints: any[];
    inventories: any[];
    packagingRuns: any[];
    wasteMovements: any[];
    inventoryZeroMovements: any[];
  }>({ sales: [], complaints: [], inventories: [], packagingRuns: [], wasteMovements: [], inventoryZeroMovements: [] });
  const [statFilterDateFrom, setStatFilterDateFrom] = useState<string>("");
  const [statFilterDateTo, setStatFilterDateTo] = useState<string>("");
  const [statFilterProductId, setStatFilterProductId] = useState<number | "">("");
  const [statFilterCustomerId, setStatFilterCustomerId] = useState<number | "">("");
  const [statFilterType, setStatFilterType] = useState<"ALL" | "SALE" | "COMPLAINT" | "INVENTORY">("ALL");
  const [statLoading, setStatLoading] = useState(false);

  // Bearbeitungs-States für Statistik
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [editingComplaintId, setEditingComplaintId] = useState<number | null>(null);
  const [editingInventoryId, setEditingInventoryId] = useState<number | null>(null);
  const [editSaleDate, setEditSaleDate] = useState<string>("");
  const [editSaleCustomerId, setEditSaleCustomerId] = useState<number | "">("");
  const [editSaleProductId, setEditSaleProductId] = useState<number | "">("");
  const [editSaleColli, setEditSaleColli] = useState<string>("");
  const [editSalePricePerColli, setEditSalePricePerColli] = useState<string>("");
  const [editSaleComment, setEditSaleComment] = useState<string>("");
  const [editComplaintType, setEditComplaintType] = useState<"RETOURWARE" | "PROZENTABZUG">("RETOURWARE");
  const [editComplaintColli, setEditComplaintColli] = useState<string>("");
  const [editComplaintPercent, setEditComplaintPercent] = useState<string>("");
  const [editComplaintComment, setEditComplaintComment] = useState<string>("");
  const [editComplaintPackStationId, setEditComplaintPackStationId] = useState<number | "">("");
  const [editComplaintVarietyId, setEditComplaintVarietyId] = useState<number | "">("");
  const [editInventoryColli, setEditInventoryColli] = useState<string>("");
  const [editInventoryPricePerUnit, setEditInventoryPricePerUnit] = useState<string>("");
  const [editInventoryComment, setEditInventoryComment] = useState<string>("");


  // === REKLAMATION (CustomerSaleComplaint) ===
  type CustomerSaleWithRemaining = {
    id: number;
    date: string;
    customerId: number;
    productId: number;
    customerNameSnapshot: string;
    productNameSnapshot: string;
    quantityUnits: number;
    complainedQuantity: number;
    remainingQuantity: number;
    customer: { id: number; name: string; region?: string };
    product: { id: number; name: string; cookingType: string; unitKg: number };
    complaints: Array<{
      id: number;
      complaintType: string;
      affectedQuantity: number;
      discountPercent?: number;
      farmerNameSnapshot: string;
      complaintAmount: number;
      comment?: string;
      createdAt: string;
    }>;
  };

  const [reklCustomers, setReklCustomers] = useState<Customer[]>([]);
  const [reklProducts, setReklProducts] = useState<Product[]>([]);
  const [reklSales, setReklSales] = useState<CustomerSaleWithRemaining[]>([]);
  const [reklSelectedCustomerId, setReklSelectedCustomerId] = useState<number | "">("");
  const [reklSelectedProductId, setReklSelectedProductId] = useState<number | "">("");
  const [reklSelectedSaleId, setReklSelectedSaleId] = useState<number | "">("");
  const [reklSelectedSale, setReklSelectedSale] = useState<CustomerSaleWithRemaining | null>(null);
  const [reklRelevantFarmers, setReklRelevantFarmers] = useState<Farmer[]>([]);
  const [reklFarmerId, setReklFarmerId] = useState<number | "">("");
  const [reklType, setReklType] = useState<"RETOURWARE" | "PROZENTABZUG">("RETOURWARE");
  const [reklQuantity, setReklQuantity] = useState<string>("");
  const [reklPercent, setReklPercent] = useState<string>("");
  const [reklDate, setReklDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [reklComment, setReklComment] = useState<string>("");
  const [reklPackStationId, setReklPackStationId] = useState<number | "">("");
  const [reklVarietyId, setReklVarietyId] = useState<number | "">("");
  const [reklLoading, setReklLoading] = useState(false);

  // Stammdaten Tab State
  const [stammdatenSubTab, setStammdatenSubTab] = useState<"benutzer" | "planmengen" | "stammdaten" | "preise">("benutzer");
  const [stammdatenFunction, setStammdatenFunction] = useState<string>("userAnlegen");

  // Abrechnungen Tab State
  const [abrechnungSubTab, setAbrechnungSubTab] = useState<"bauer" | "packbetrieb">("bauer");
  const [abrFarmerId, setAbrFarmerId] = useState<number | "">("");
  const [abrDateFrom, setAbrDateFrom] = useState<string>(() => {
    // Standard: Erster Tag des letzten Monats
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  });
  const [abrDateTo, setAbrDateTo] = useState<string>(() => {
    // Standard: Letzter Tag des letzten Monats
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().substring(0, 10);
  });
  const [abrLoading, setAbrLoading] = useState(false);
  const [abrResult, setAbrResult] = useState<{
    success: boolean;
    message: string;
    statement?: {
      farmerName: string;
      totalAmount: number;
      totalDeliveryKg: number;
      lineCount: number;
    };
    pdf?: {
      filename: string;
      downloadUrl: string;
    };
    farmerEmail?: string | null;
  } | null>(null);

  const [packPlants, setPackPlants] = useState<PackPlant[]>([]);
  const [ppPackPlantId, setPpPackPlantId] = useState<number | "">("");
  const [ppDateFrom, setPpDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  });
  const [ppDateTo, setPpDateTo] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().substring(0, 10);
  });
  const [ppLoadingInvoice, setPpLoadingInvoice] = useState(false);
  const [ppLoadingCredit, setPpLoadingCredit] = useState(false);
  type DocResult = {
    success: boolean;
    document?: any;
    pdf?: { filename: string; downloadUrl: string };
    error?: string;
  };
  const [ppInvoiceResult, setPpInvoiceResult] = useState<DocResult | null>(null);
  const [ppCreditResult, setPpCreditResult] = useState<DocResult | null>(null);

  // === KALKULATIONEN ===
  const [manualCosts, setManualCosts] = useState<ManualCost[]>([]);
  const [pnlData, setPnlData] = useState<any>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [pnlDateFrom, setPnlDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  });
  const [pnlDateTo, setPnlDateTo] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10);
  });
  const [pnlYear, setPnlYear] = useState<number | "">(new Date().getFullYear());
  const [pnlMonth, setPnlMonth] = useState<number | "">("");
  const [pnlWeek, setPnlWeek] = useState<number | "">("");
  const [pnlPackPlantId, setPnlPackPlantId] = useState<number | "">("");
  const [pnlProductId, setPnlProductId] = useState<number | "">("");
  const [pnlCustomerId, setPnlCustomerId] = useState<number | "">("");

  // Manuelle Kosten
  const [mcCostType, setMcCostType] = useState<string>("MARKETING");
  const [mcDescription, setMcDescription] = useState("");
  const [mcPeriodFrom, setMcPeriodFrom] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  });
  const [mcPeriodTo, setMcPeriodTo] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10);
  });
  const [mcPackPlantId, setMcPackPlantId] = useState<number | "">("");
  const [mcValueType, setMcValueType] = useState<"ABSOLUTE" | "PERCENTAGE">("ABSOLUTE");
  const [mcValue, setMcValue] = useState("");
  const [mcComment, setMcComment] = useState("");
  const [mcEditingId, setMcEditingId] = useState<number | null>(null);
  const [mcLoading, setMcLoading] = useState(false);

  // === Rollenlogik ===

  // Rolle auslesen
  const role = currentUser?.role;

  // Bauer = Rolle FARMER (farmerId prüfen wir extra in den Actions)
  const isFarmer = role === "FARMER";

  // EZG-Admin (kann Stammdaten bearbeiten)
  const isEgAdmin = role === "EG_ADMIN";

  // Organisator (nur Übersicht, keine Stammdaten)
  const isOrganizer = role === "ORGANISATOR";

  // Packstelle
  const isPackstelle = role === "PACKSTELLE";

  // Packbetrieb
  const isPackbetrieb = role === "PACKBETRIEB";

  // Für Bauer: Nur Sorten, die im Lager vorhanden sind (quantityTons > 0)
  const availableVarietiesForSale = isFarmer && currentUser?.farmerId
    ? safeVarieties.filter((v) => {
        const stock = farmerStocks.find(
          (s) => s.varietyId === v.id && Number(s.quantityTons) > 0
        );
        return stock !== undefined;
      })
    : safeVarieties;

  // Nutzer, die Stammdaten sehen/bearbeiten dürfen
  const canEditStammdaten = !!currentUser && isEgAdmin;

  // Nutzer, die die große Bauernlager-Übersicht sehen dürfen
  // -> Packstelle & Packbetrieb explizit NICHT
  const isAdminOrOrg =
    !!currentUser && (isEgAdmin || isOrganizer);

  // Meta-Viewport-Tag setzen, um Zoomen zu verhindern
  useEffect(() => {
    // Entferne vorhandene viewport meta tags
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (existingViewport) {
      existingViewport.remove();
    }
    
    // Erstelle neues viewport meta tag, das Zoomen verhindert
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.getElementsByTagName('head')[0].appendChild(viewport);
    
    // CSS hinzufügen, um Zoomen zu verhindern und sicherzustellen, dass nichts über den Rand hinausgeht
    const style = document.createElement('style');
    style.id = 'no-zoom-style';
    style.textContent = `
      * {
        -webkit-tap-highlight-color: transparent;
        box-sizing: border-box;
      }
      html, body {
        overflow-x: hidden;
        max-width: 100vw;
        position: relative;
      }
      body {
        width: 100%;
        margin: 0;
        padding: 0;
      }
      input, select, textarea {
        font-size: 16px !important;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        max-width: 100%;
        box-sizing: border-box;
      }
      input:focus, select:focus, textarea:focus {
        font-size: 16px !important;
        transform: none !important;
        zoom: 1 !important;
        -webkit-transform: scale(1) !important;
        transform: scale(1) !important;
      }
      @media screen and (max-width: 768px) {
        input, select, textarea {
          font-size: 16px !important;
        }
        * {
          max-width: 100vw;
          overflow-x: hidden;
        }
      }
      @supports (-webkit-touch-callout: none) {
        /* iOS Safari spezifisch */
        input, select, textarea {
          font-size: 16px !important;
        }
      }
    `;
    if (!document.getElementById('no-zoom-style')) {
      document.getElementsByTagName('head')[0].appendChild(style);
    }
    
    return () => {
      // Cleanup beim Unmount
      if (viewport.parentNode) {
        viewport.parentNode.removeChild(viewport);
      }
      const styleEl = document.getElementById('no-zoom-style');
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, []);

  // Packstelle-Nutzer automatisch auf den Packstation-Tab setzen
  useEffect(() => {
    if (currentUser?.role === "PACKSTELLE" && tab !== "packstation") {
      setTab("packstation");
    }
  }, [currentUser, tab]);

  useEffect(() => {
    if (isPackbetrieb) {
      loadPackPlantStockWrapper().catch(console.error);
    }
  }, [isPackbetrieb]);

  // Organisatoren müssen immer auf Index 0 (Lager) bleiben
  useEffect(() => {
    if (isOrganizer && packCarouselIndex !== 0) {
      setPackCarouselIndex(0);
    }
  }, [isOrganizer, packCarouselIndex]);

  // Enter-Taste für Bestätigungsdialoge
  useEffect(() => {
    if (!confirmAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmAction.onConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setConfirmAction(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmAction]);

  // Globale Enter-Navigation in Formularen (springt zum nächsten Feld statt Formular abzusenden)
  useEffect(() => {
    const handleGlobalEnter = (e: KeyboardEvent) => {
      // Nur bei Input/Select-Elementen innerhalb von Formularen reagieren
      const target = e.target as HTMLElement;
      if (e.key !== "Enter") return;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      
      // Bei Bestätigungsdialog nicht eingreifen (wird oben behandelt)
      if (confirmAction) return;
      
      const form = target.closest("form");
      if (!form) return;

      // Alle fokussierbaren Elemente im Formular finden
      const focusable = Array.from(
        form.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        )
      );

      const currentIndex = focusable.indexOf(target);
      if (currentIndex !== -1 && currentIndex < focusable.length - 1) {
        // Zum nächsten Element springen
        e.preventDefault();
        focusable[currentIndex + 1].focus();
      }
      // Letztes Feld: Enter lässt normales Submit zu
    };

    document.addEventListener("keydown", handleGlobalEnter);
    return () => document.removeEventListener("keydown", handleGlobalEnter);
  }, [confirmAction]);

  // === Organisator-Statistik / Planmengen ===


  // === Nachrichten-Helfer ===
  // (showMessage bereits oben definiert)

  // === Datenladen ===

  // === Admin: User-Verwaltung ===
  // (loadAllUsers ausgelagert nach src/services/adminService.ts)
  async function loadAllUsersWrapper() {
    const data = await loadAllUsers();
    setAllUsers(data);
  }

  async function handleResetUserPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordResetError(null);

    if (!selectedUserId || !newUserPassword.trim()) {
      setPasswordResetError("Bitte wählen Sie einen User und geben Sie ein neues Passwort ein");
      return;
    }

    const user = allUsers.find((u) => u.id === selectedUserId);

    setConfirmAction({
      title: "Passwort zurücksetzen?",
      message: `Möchten Sie das Passwort für User "${user?.name || ""}" (${user?.email || ""}) wirklich zurücksetzen?`,
      confirmLabel: "Ja, zurücksetzen",
      cancelLabel: "Nein, abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await resetUserPassword(selectedUserId, newUserPassword);
          // Erfolg: Formular leeren
          setSelectedUserId("");
          setNewUserPassword("");
          setPasswordResetError(null);
          showMessage("Passwort wurde erfolgreich zurückgesetzt");
          await loadAllUsersWrapper();
        } catch (err: any) {
          console.error(err);
          setPasswordResetError(`Fehler: ${err.message || "Verbindung zum Server fehlgeschlagen"}`);
        }
      },
    });
  }

  async function handleResetFarmerPassword(e: React.FormEvent) {
    e.preventDefault();
    setFarmerPasswordResetError(null);

    if (!selectedFarmerId || !newFarmerPassword.trim()) {
      setFarmerPasswordResetError("Bitte wählen Sie einen Bauern und geben Sie ein neues Passwort ein");
      return;
    }

    const farmer = farmers.find((f: Farmer) => f.id === selectedFarmerId);

    setConfirmAction({
      title: "Passwort zurücksetzen?",
      message: `Möchten Sie das Passwort für Bauer "${farmer?.name || ""}" wirklich zurücksetzen?`,
      confirmLabel: "Ja, zurücksetzen",
      cancelLabel: "Nein, abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await resetFarmerPassword(selectedFarmerId, newFarmerPassword);

          // Erfolg: Formular leeren
          setSelectedFarmerId("");
          setNewFarmerPassword("");
          setFarmerPasswordResetError(null);
          showMessage("Passwort wurde erfolgreich zurückgesetzt");
        } catch (err: any) {
          console.error(err);
          setFarmerPasswordResetError(err.message || "Verbindung zum Server fehlgeschlagen");
        }
      },
    });
  }

  // loadFarmers ausgelagert nach src/hooks/useFarmers.ts

  // loadPackStations und loadPackPlants ausgelagert nach src/services/packService.ts
  async function loadPackStationsWrapper() {
    const data = await loadPackStations();
    setPackStations(data);
  }

  async function loadPackPlantsWrapper() {
    const data = await loadPackPlants();
    setPackPlants(data);
  }

  // === KALKULATIONEN ===
  async function loadManualCosts() {
    try {
      const params = new URLSearchParams();
      if (pnlPackPlantId) params.append("packPlantId", String(pnlPackPlantId));
      if (pnlDateFrom) params.append("dateFrom", pnlDateFrom);
      if (pnlDateTo) params.append("dateTo", pnlDateTo);
      
      const res = await fetch(`${API_URL}/admin/manual-costs?${params}`);
      const data = await res.json();
      setManualCosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadManualCosts error:", err);
    }
  }

  // Hilfsfunktion: Zeitraum aus Jahr/Monat/Woche berechnen
  function calculatePeriodFromShortcuts(): { from: string; to: string } | null {
    if (pnlYear === "") return null;
    
    const year = Number(pnlYear);
    
    if (pnlWeek !== "" && pnlMonth !== "") {
      // Jahr + Monat + Woche: Diese Woche
      const month = Number(pnlMonth);
      const week = Number(pnlWeek);
      
      // Ersten Tag des Monats finden
      const firstDay = new Date(year, month - 1, 1);
      const dayOfWeek = firstDay.getDay(); // 0 = Sonntag, 1 = Montag, ...
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Auf Montag normalisieren
      
      // Start der gewählten Woche
      const weekStart = new Date(firstDay);
      weekStart.setDate(firstDay.getDate() + mondayOffset + (week - 1) * 7);
      
      // Ende der Woche (Sonntag)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      return {
        from: weekStart.toISOString().substring(0, 10),
        to: weekEnd.toISOString().substring(0, 10),
      };
    } else if (pnlMonth !== "") {
      // Jahr + Monat: Dieser Monat
      const month = Number(pnlMonth);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0); // Letzter Tag des Monats
      
      return {
        from: firstDay.toISOString().substring(0, 10),
        to: lastDay.toISOString().substring(0, 10),
      };
    } else {
      // Nur Jahr: Gesamtes Kalenderjahr
      const firstDay = new Date(year, 0, 1);
      const lastDay = new Date(year, 11, 31);
      
      return {
        from: firstDay.toISOString().substring(0, 10),
        to: lastDay.toISOString().substring(0, 10),
      };
    }
  }

  async function loadPnl() {
    // Zeitraum aus Shortcuts oder manuellen Daten
    const shortcutPeriod = calculatePeriodFromShortcuts();
    const dateFrom = shortcutPeriod ? shortcutPeriod.from : pnlDateFrom;
    const dateTo = shortcutPeriod ? shortcutPeriod.to : pnlDateTo;
    
    if (!dateFrom || !dateTo) {
      showMessage("Zeitraum wählen (Shortcuts oder Von/Bis)");
      return;
    }
    
    setPnlLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("dateFrom", dateFrom);
      params.append("dateTo", dateTo);
      if (pnlPackPlantId) params.append("packPlantId", String(pnlPackPlantId));
      if (pnlProductId) params.append("productId", String(pnlProductId));
      if (pnlCustomerId) params.append("customerId", String(pnlCustomerId));
      
      const res = await fetch(`${API_URL}/admin/pnl?${params}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Laden der GuV");
      }
      setPnlData(data);
    } catch (err: any) {
      console.error(err);
      showMessage(err.message || "Fehler beim Laden der GuV");
    } finally {
      setPnlLoading(false);
    }
  }

  async function saveManualCost(e: React.FormEvent) {
    e.preventDefault();
    
    if (!mcDescription || !mcPeriodFrom || !mcPeriodTo || !mcValue) {
      showMessage("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    
    setMcLoading(true);
    try {
      const url = mcEditingId 
        ? `${API_URL}/admin/manual-costs/${mcEditingId}`
        : `${API_URL}/admin/manual-costs`;
      const method = mcEditingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costType: mcCostType,
          description: mcDescription,
          periodFrom: mcPeriodFrom,
          periodTo: mcPeriodTo,
          packPlantId: mcPackPlantId || null,
          valueType: mcValueType,
          value: parseKg(mcValue),
          comment: mcComment || null,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Speichern");
      }
      
      showMessage(mcEditingId ? "Kosten aktualisiert" : "Kosten erstellt");
      setMcDescription("");
      setMcValue("");
      setMcComment("");
      setMcEditingId(null);
      await loadManualCosts();
      await loadPnl();
    } catch (err: any) {
      console.error(err);
      showMessage(err.message || "Fehler beim Speichern");
    } finally {
      setMcLoading(false);
    }
  }

  async function deleteManualCost(id: number) {
    if (!confirm("Kosten wirklich löschen?")) return;
    
    try {
      const res = await fetch(`${API_URL}/admin/manual-costs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Löschen");
      }
      showMessage("Kosten gelöscht");
      await loadManualCosts();
      await loadPnl();
    } catch (err: any) {
      console.error(err);
      showMessage(err.message || "Fehler beim Löschen");
    }
  }

  function editManualCost(cost: any) {
    setMcCostType(cost.costType);
    setMcDescription(cost.description);
    setMcPeriodFrom(cost.periodFrom.substring(0, 10));
    setMcPeriodTo(cost.periodTo.substring(0, 10));
    setMcPackPlantId(cost.packPlantId || "");
    setMcValueType(cost.valueType);
    setMcValue(String(cost.value));
    setMcComment(cost.comment || "");
    setMcEditingId(cost.id);
  }

  async function loadTaxRates() {
    try {
      const res = await fetch(`${API_URL}/tax-rates`);
      if (!res.ok) {
        console.error("Fehler beim Laden der Steuersätze");
        return;
      }
      const data = await res.json();
      setTaxRates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fehler beim Laden der Steuersätze:", err);
    }
  }

  // loadProducts ausgelagert nach src/hooks/useProducts.ts

  async function loadOrganizerDeliveries(weeks: number) {
    const data = await loadOrganizerDeliveriesService(weeks);
    setOrganizerDeliveries(data);
  }

  // loadCustomers ausgelagert nach src/hooks/useCustomers.ts

  async function loadPrices(customerId?: number, productId?: number) {
    const data = await loadPricesService(customerId, productId);
    setPrices(data);
  }

  async function loadQualityPricesWrapper() {
    const data = await loadQualityPrices();
    setQualityPrices(data);
  }

async function loadFarmerPackStatsWrapper(farmerId: number) {
  try {
    const max = Number(statsMaxDeliveries || "0");

    let url = `${API_URL}/farmer-packstation-stats?farmerId=${farmerId}`;
    if (Number.isFinite(max) && max > 0) {
      url += `&maxDeliveries=${max}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      console.error(
        "Fehler beim Laden farmer-packstation-stats",
        await res.text()
      );
      setFarmerPackStats([]);
      return;
    }
    const data = await res.json();
    setFarmerPackStats(Array.isArray(data) ? data : []);
  } catch (err) {
      console.error(err);
      setFarmerPackStats([]);
    }
  }

  // loadVarieties ausgelagert nach src/hooks/useVarieties.ts

  // Packbetrieb: Lager fertiger Produkte laden
  // (loadPackPlantStock und loadPackStationStock ausgelagert nach src/services/)
  async function loadPackPlantStockWrapper() {
    const data = await loadPackPlantStock();
    setPackPlantStocks(data);
  }

  async function loadPackStationStockWrapper() {
    const data = await loadPackStationStock();
    setPackStationStocks(data);
  }

  // (loadRecentPackagingRuns, loadRecentWasteMovements, loadRecentInventoryZeroMovements ausgelagert nach src/services/packstationService.ts)
  async function loadRecentPackagingRunsWrapper() {
    const data = await loadRecentPackagingRuns();
    setRecentPackagingRuns(data);
  }

  async function loadRecentWasteMovementsWrapper() {
    const data = await loadRecentWasteMovements();
    setRecentWasteMovements(data);
  }

  async function loadRecentInventoryZeroMovementsWrapper() {
    const data = await loadRecentInventoryZeroMovements();
    setRecentInventoryZeroMovements(data);
  }

  // (loadDeliveryPlans und loadFarmerStocks ausgelagert nach src/services/)
  async function loadDeliveryPlansWrapper(year: number, farmerId?: number) {
    const data = await loadDeliveryPlansService(year, farmerId);
    setDeliveryPlans(data);
  }

  async function loadFarmerStocksWrapper(farmerId?: number) {
    const data = await loadFarmerStocksService(farmerId);
    setFarmerStocks(data);
  }

  // initial Stammdaten laden
  useEffect(() => {
    loadFarmers().catch(console.error);
    loadProducts().catch(console.error);
    loadCustomers().catch(console.error);
    loadVarieties().catch(console.error);
    loadPrices().catch(console.error);
    loadQualityPrices().catch(console.error);
    loadTaxRates().catch(console.error);
  }, []);

  // User-Liste laden, wenn Admin eingeloggt ist
  useEffect(() => {
    if (isEgAdmin && currentUser) {
      console.log("Admin eingeloggt - lade User-Liste");
      loadAllUsersWrapper().catch(console.error);
    }
  }, [isEgAdmin, currentUser]);

  // Sorten neu laden, wenn User eingeloggt ist (falls sie noch nicht geladen wurden)
  useEffect(() => {
    if (currentUser && varieties.length === 0) {
      console.log("User eingeloggt, aber keine Sorten - lade Sorten");
      loadVarieties().catch(console.error);
    }
  }, [currentUser, varieties.length]);

  // Packbetriebe laden (Admin/Organisator) initial
  useEffect(() => {
    if (isEgAdmin || isOrganizer) {
      loadPackPlantsWrapper().catch(console.error);
    }
  }, [isEgAdmin, isOrganizer]);

  // Standardwerte für Organisator setzen
  useEffect(() => {
    if (isOrganizer) {
      if (deliveryWeeksBack === "4") {
        setDeliveryWeeksBack("52");
      }
      if (planWeeksForward === "4" || planWeeksForward === "0") {
        setPlanWeeksForward("2");
      }
    }
  }, [isOrganizer]);

  // Standard-Auswahl für Packbetrieb setzen
  useEffect(() => {
    if (packPlants.length > 0 && !ppPackPlantId) {
      setPpPackPlantId(packPlants[0].id);
    }
  }, [packPlants, ppPackPlantId]);

  // nach Login Lager + ggf. Packstellen-Auswertung laden
  useEffect(() => {
    if (!currentUser) {
      setFarmerStocks([]);
      setFarmerPackStats([]);
      return;
    }

    if (currentUser.role === "FARMER" && currentUser.farmerId) {
      // Bauer: eigenes Lager + eigene Packstellen-Auswertung
      loadFarmerStocksWrapper(currentUser.farmerId).catch(console.error);
      loadFarmerPackStatsWrapper(currentUser.farmerId).catch(console.error);
    } else {
      // Admin / Organisator / Packstelle / Packbetrieb: Lagerübersicht (alle)
      loadFarmerStocksWrapper().catch(console.error);
      setFarmerPackStats([]);
    }
  }, [currentUser]);

  // Packbetriebsabrechnung: Packbetrieb automatisch setzen
  useEffect(() => {
    if (packPlants.length > 0 && !ppPackPlantId) {
      setPpPackPlantId(packPlants[0].id);
    }
  }, [packPlants, ppPackPlantId]);

  // Admin/Organisator: Packstellen-Auswertung passend zum Bauern-Filter laden
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "FARMER") return; // Bauer wird schon im Effekt oben behandelt

    const fId =
      typeof stockFilterFarmerId === "number" ? stockFilterFarmerId : undefined;

    if (fId) {
      loadFarmerPackStats(fId).catch(console.error);
    } else {
      setFarmerPackStats([]);
    }
  }, [currentUser, stockFilterFarmerId]);

  // nach Login: Packstellenlager laden (für Packstelle, Packbetrieb, EZG-Admin und Organisator)
  useEffect(() => {
    if (!currentUser) {
      setPackStationStocks([]);
      return;
    }

    if (
      currentUser.role === "PACKSTELLE" ||
      currentUser.role === "PACKBETRIEB" ||
      currentUser.role === "EG_ADMIN" ||
      currentUser.role === "ORGANISATOR"
    ) {
      loadPackStationStockWrapper().catch(console.error);
      // Lade auch die letzten Buchungen, wenn Packstelle/Packbetrieb
      if (currentUser.role === "PACKSTELLE" || currentUser.role === "PACKBETRIEB") {
        loadRecentPackagingRunsWrapper().catch(console.error);
        loadRecentWasteMovementsWrapper().catch(console.error);
        loadRecentInventoryZeroMovementsWrapper().catch(console.error);
      }
    } else {
      setPackStationStocks([]);
    }
  }, [currentUser]);

  useEffect(() => {
    if (tab !== "stats") return;

    const w = Number(deliveryWeeksBack || "52");

    // Organisator / EZG-Admin: wie bisher, mit optionalem Bauernfilter
    if (isOrganizer || isEgAdmin) {
      const fId =
        typeof planFarmerId === "number" ? planFarmerId : undefined;

      Promise.all([
        loadOrganizerDeliveries(w),
        loadDeliveryPlansWrapper(planYear, fId),
      ]).catch(console.error);
    }

    // Bauer: eigene Lieferungen + eigene Planmengen
    if (isFarmer && currentUser?.farmerId) {
      Promise.all([
        loadOrganizerDeliveries(w),
        loadDeliveryPlansWrapper(planYear, currentUser.farmerId),
      ]).catch(console.error);
    }
  }, [
  tab,
  isOrganizer,
  isEgAdmin,
  isFarmer,
  currentUser,
  planYear,
  planFarmerId,
  deliveryWeeksBack,
]);

// === Login/Logout ===
// (Ausgelagert nach src/hooks/useAuth.ts)


  // === Stammdaten: Bauern, Produkte, Kunden ===

   async function handleCreateFarmer(e: React.FormEvent) {
  e.preventDefault();
  
  if (!farmerName.trim()) {
    showMessage("Bitte geben Sie einen Namen ein");
    return;
  }

  const isEditing = editingFarmerId !== null;
  setConfirmAction({
    title: isEditing ? "Bauer ändern?" : "Bauer anlegen?",
    message: isEditing
      ? `Möchten Sie den Bauer "${farmerName}" wirklich ändern?`
      : `Möchten Sie den Bauer "${farmerName}" wirklich anlegen?`,
    confirmLabel: isEditing ? "Ja, ändern" : "Ja, anlegen",
    onConfirm: async () => {
      try {
        await createOrUpdateFarmer(
          {
            name: farmerName,
            street: farmerStreet,
            postalCode: farmerPostalCode,
            city: farmerCity,
            ggnNumber: farmerGGN,
            loginEmail: farmerLoginEmail,
            loginPassword: farmerLoginPassword,
            isFlatRate: farmerIsFlatRate,
            flatRateNote: farmerFlatRateNote || null,
          },
          editingFarmerId
        );

        // Felder leeren
        setFarmerName("");
        setFarmerStreet("");
        setFarmerPostalCode("");
        setFarmerCity("");
        setFarmerGGN("");
        setFarmerLoginEmail("");
        setFarmerLoginPassword("");
        setFarmerIsFlatRate(false);
        setFarmerFlatRateNote("");
        setEditingFarmerId(null);

        await loadFarmers();
        showMessage(isEditing ? "Bauer geändert" : "Bauer gespeichert");
        setConfirmAction(null);
      } catch (err: any) {
        console.error(err);
        showMessage(err.message || (isEditing ? "Fehler beim Ändern des Bauern" : "Fehler beim Anlegen des Bauern"));
        setConfirmAction(null);
      }
    },
  });
}

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();

    // einfache Pflichtfeld-Checks
    if (!productName.trim()) {
      showMessage("Produktname fehlt");
      return;
    }
    if (!productUnitKg.trim()) {
      showMessage("Packungsgröße (kg) fehlt");
      return;
    }

    const unitKgNum = Number(productUnitKg.replace(",", "."));
    const unitsPerColliNum = productUnitsPerColli
      ? Number(productUnitsPerColli.replace(",", "."))
      : undefined;
    const collisPerPalletNum = productCollisPerPallet
      ? Number(productCollisPerPallet.replace(",", "."))
      : undefined;

    const isEditing = editingProductId !== null;
    setConfirmAction({
      title: isEditing ? "Produkt ändern?" : "Produkt anlegen?",
      message: isEditing
        ? `Möchten Sie das Produkt "${productName}" wirklich ändern?`
        : `Möchten Sie das Produkt "${productName}" wirklich anlegen?`,
      confirmLabel: isEditing ? "Ja, ändern" : "Ja, anlegen",
      cancelLabel: "Nein, abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await createOrUpdateProduct(
            {
              name: productName,
              cookingType: productCookingType,
              unitKg: unitKgNum,
              unitsPerColli: unitsPerColliNum,
              collisPerPallet: collisPerPalletNum,
              packagingType: productPackagingType,
              productNumber: productNumber,
              taxRateId: productTaxRateId ? Number(productTaxRateId) : null,
            },
            editingProductId
          );

          // Felder leeren / Defaults setzen
          setProductName("");
          setProductCookingType("FESTKOCHEND");
          setProductPackagingType("");
          setProductNumber("");
          setProductUnitKg("2");
          setProductUnitsPerColli("");
          setProductCollisPerPallet("");
          setEditingProductId(null);

          await loadProducts();
          showMessage(isEditing ? "Produkt geändert" : "Produkt gespeichert");
        } catch (err: any) {
          console.error(err);
          showMessage(err.message || (isEditing ? "Fehler beim Ändern des Produkts" : "Fehler beim Anlegen des Produkts"));
        }
      },
    });
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    
    if (!customerName.trim()) {
      showMessage("Bitte geben Sie einen Kundennamen ein");
      return;
    }

    const isEditing = editingCustomerId !== null;
    setConfirmAction({
      title: isEditing ? "Kunde ändern?" : "Kunde anlegen?",
      message: isEditing
        ? `Möchten Sie den Kunden "${customerName}" wirklich ändern?`
        : `Möchten Sie den Kunden "${customerName}" wirklich anlegen?`,
      confirmLabel: isEditing ? "Ja, ändern" : "Ja, anlegen",
      cancelLabel: "Nein, abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await createOrUpdateCustomer(
            {
              name: customerName.trim(),
              region: customerRegion.trim() || undefined,
            },
            editingCustomerId
          );

          setCustomerName("");
          setCustomerRegion("");
          setEditingCustomerId(null);
          await loadCustomers();
          showMessage(isEditing ? "Kunde geändert" : "Kunde gespeichert");
        } catch (err) {
          console.error(err);
          const errorMessage = err instanceof Error ? err.message : (isEditing ? "Fehler beim Ändern des Kunden" : "Fehler beim Anlegen des Kunden");
          showMessage(errorMessage);
        }
      },
    });
  }

    async function handleCreatePrice(e: React.FormEvent) {
    e.preventDefault();

    if (!priceCustomerId) {
      showMessage("Kunde wählen");
      return;
    }
    if (!priceProductId) {
      showMessage("Produkt wählen");
      return;
    }
    if (!pricePerUnit.trim()) {
      showMessage("Preis fehlt");
      return;
    }

    if (!pricePackingCostPerUnit.trim()) {
      showMessage("Abpackkosten fehlen");
      return;
    }

    const priceNum = Number(pricePerUnit.replace(",", "."));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      showMessage("Preis ist ungültig");
      return;
    }

    const packingCostNum = Number(pricePackingCostPerUnit.replace(",", "."));
    if (!Number.isFinite(packingCostNum) || packingCostNum < 0) {
      showMessage("Abpackkosten sind ungültig");
      return;
    }

    const customer = customers.find((c) => c.id === priceCustomerId);
    const product = safeProducts.find((p) => p.id === priceProductId);

    const isEditing = editingPriceId !== null;
    setConfirmAction({
      title: isEditing ? "Preis ändern?" : "Preis anlegen?",
      message: isEditing
        ? `Möchten Sie den Preis von ${formatAmount(priceNum)} € (Abpackkosten: ${formatAmount(packingCostNum)} €) für "${product?.name || "Produkt"}" bei "${customer?.name || "Kunde"}" wirklich ändern? Alle Verknüpfungen werden neu berechnet.`
        : `Möchten Sie einen Preis von ${formatAmount(priceNum)} € (Abpackkosten: ${formatAmount(packingCostNum)} €) für "${product?.name || "Produkt"}" bei "${customer?.name || "Kunde"}" wirklich anlegen?`,
      confirmLabel: isEditing ? "Ja, ändern" : "Ja, anlegen",
      cancelLabel: "Nein, abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);
    try {
      const packingCostNum = Number(pricePackingCostPerUnit.replace(",", "."));
      
      const url = isEditing
        ? `${API_URL}/product-prices/${editingPriceId}`
        : `${API_URL}/product-prices`;
      const method = isEditing ? "PUT" : "POST";
      
      const body: any = {
        customerId: priceCustomerId,
        productId: priceProductId,
        pricePerUnit: priceNum,
        packingCostPerUnit: packingCostNum,
      };

      if (priceValidFrom) {
        body.validFrom = priceValidFrom; // yyyy-mm-dd aus input[type=date]
      }

          await createOrUpdatePrice(
            {
              customerId: priceCustomerId as number,
              productId: priceProductId as number,
              pricePerUnit: priceNum,
              packingCostPerUnit: packingCostNum,
              validFrom: priceValidFrom || undefined,
            },
            editingPriceId
          );

          // Formular leeren
          setEditingPriceId(null);
          setPriceCustomerId("");
          setPriceProductId("");
          setPricePerUnit("");
          setPricePackingCostPerUnit("");
          setPriceValidFrom("");

          // Preise (mit aktuellen Filtern) neu laden
          const cId =
            typeof priceCustomerId === "number" ? priceCustomerId : undefined;
          const pId =
            typeof priceProductId === "number" ? priceProductId : undefined;

          await loadPrices(cId, pId);
          showMessage(isEditing ? "Preis geändert" : "Preis gespeichert");
        } catch (err: any) {
          console.error(err);
          showMessage(err.message || (isEditing ? "Fehler beim Ändern des Preises" : "Fehler beim Anlegen des Preises"));
        }
      },
    });
  }

  // === Admin: User anlegen ===
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("handleCreateUser aufgerufen");
    setUserCreateError(null);

    // Trim alle Felder
    const trimmedName = userName.trim();
    const trimmedEmail = userEmail.trim();
    const trimmedPassword = userPassword.trim();

    console.log("User anlegen - Eingaben:", { trimmedName, trimmedEmail, trimmedPassword: "***", userRole });

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      const missing = [];
      if (!trimmedName) missing.push("Name");
      if (!trimmedEmail) missing.push("E-Mail");
      if (!trimmedPassword) missing.push("Passwort");
      setUserCreateError(`Bitte füllen Sie folgende Felder aus: ${missing.join(", ")}`);
      return;
    }

    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setUserCreateError("Bitte geben Sie eine gültige E-Mail-Adresse ein (Format: name@domain.com)");
      return;
    }

    setConfirmAction({
      title: "User anlegen?",
      message: `Möchten Sie den User "${trimmedName}" (${trimmedEmail}) mit der Rolle "${userRole}" wirklich anlegen?`,
      confirmLabel: "Ja, anlegen",
      cancelLabel: "Nein, abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          const requestBody = {
            name: trimmedName,
            email: trimmedEmail,
            password: trimmedPassword,
            role: userRole,
          };
          
          console.log("Sende Request an:", `${API_URL}/admin/users/simple-create`, requestBody);

          const data = await createUser({
            name: trimmedName,
            email: trimmedEmail,
            password: trimmedPassword,
            role: userRole,
          });

          // Erfolg: Formular leeren
          setUserName("");
          setUserEmail("");
          setUserPassword("");
          setUserRole("PACKBETRIEB");
          setUserCreateError(null);
          
          // User-Liste neu laden
          await loadAllUsersWrapper();
          
          showMessage(`User "${data.user?.name || trimmedName}" wurde erfolgreich angelegt`);
        } catch (err: any) {
          console.error("Fehler beim Anlegen des Users:", err);
          setUserCreateError(err.message || "Verbindung zum Server fehlgeschlagen");
        }
      },
    });
  }

   // === Bauernlager: Inventur + Verkäufe (nur Bauer) ===

  // „echte" Inventur – wird NUR aus der Confirm-Box aufgerufen
  async function doInventory(varietyId: number, qtyKg: number) {
    if (!currentUser?.farmerId) {
      showMessage("Kein Bauer zugeordnet");
      return;
    }

    console.log("🔍 doInventory aufgerufen:", { 
      farmerId: currentUser.farmerId, 
      varietyId, 
      qtyKg,
      API_URL 
    });

    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const requestBody = {
        farmerId: currentUser.farmerId,
        varietyId,
        newQuantityTons: qtyKg,
      };

      console.log("📤 Sende Request:", {
        url: `${API_URL}/farmer-stock/inventory`,
        method: "POST",
        body: requestBody,
        headers: { ...headers, Authorization: token ? "Bearer ***" : "none" }
      });

      const res = await fetch(`${API_URL}/farmer-stock/inventory`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Response erhalten:", {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries())
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        let errorMessage = "Fehler bei Inventur";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error("❌ Inventur-Fehler:", res.status, errorMessage, errorText);
        showMessage(`Fehler bei Inventur: ${errorMessage}`);
        return;
      }

      const responseData = await res.json().catch(() => null);
      console.log("✅ Inventur erfolgreich:", responseData);

      setInvQuantityKg("");
      setInvVarietyId("");
      await loadFarmerStocksWrapper(currentUser.farmerId);
      showMessage("Inventur gespeichert");
    } catch (err) {
      console.error("❌ Inventur-Exception:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      console.error("❌ Fehler-Details:", {
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined
      });
      showMessage(`Fehler bei Inventur: ${errorMessage}`);
    }
  }

  // wird vom Formular aufgerufen – öffnet NUR die Bestätigungsbox
  function handleInventory(e: React.FormEvent) {
    e.preventDefault();

    console.log("🔍 handleInventory aufgerufen:", {
      currentUser: currentUser ? { id: currentUser.id, farmerId: currentUser.farmerId } : null,
      invVarietyId,
      invQuantityKg,
      safeVarietiesCount: safeVarieties.length
    });

    if (!currentUser?.farmerId) {
      console.warn("⚠️ Kein Bauer zugeordnet");
      showMessage("Kein Bauer zugeordnet");
      return;
    }
    if (!invVarietyId) {
      console.warn("⚠️ Keine Sorte ausgewählt");
      showMessage("Sorte wählen");
      return;
    }

    // Werte hier speichern, damit sie im onConfirm-Callback korrekt verwendet werden
    const varietyIdNum = Number(invVarietyId);
    const qtyKg = parseKg(invQuantityKg);
    const variety = safeVarieties.find((v) => v.id === varietyIdNum);

    console.log("📋 Bestätigungsbox wird geöffnet:", {
      varietyIdNum,
      qtyKg,
      varietyName: variety?.name
    });

    setConfirmAction({
      title: "Inventur speichern?",
      message: `Sorte ${variety?.name ?? ""} auf ${formatKg(qtyKg)} kg setzen. Sind Sie sicher?`,
      confirmLabel: "Ja, Inventur speichern",
      cancelLabel: "Nein, abbrechen",
      onConfirm: () => {
        console.log("✅ Bestätigung erhalten, rufe doInventory auf");
        setConfirmAction(null);
        // Verwende die gespeicherten Werte, nicht die State-Variablen
        doInventory(varietyIdNum, qtyKg);
      },
    });
  }

// === Packstelle: Lager auf 0 setzen ===
// Wrapper-Funktion, die die neue Handler-Funktion verwendet
function handlePackstationInventoryZero(e: React.FormEvent) {
  e.preventDefault();

  if (!packZeroSelection) {
    showMessage("Bitte Bauer und Sorte wählen");
    return;
  }

  const [farmerIdStr, varietyIdStr] = packZeroSelection.split("-");
  const farmerId = Number(farmerIdStr);
  const varietyId = Number(varietyIdStr);

  if (!farmerId || !varietyId) {
    showMessage("Ungültige Auswahl");
    return;
  }

  // Namen für Anzeige finden
  const farmer = farmers.find((f: Farmer) => f.id === farmerId);
  const variety = safeVarieties.find((v) => v.id === varietyId);
  
  // Lagermenge finden
  const stock = packStationStocks.find((s) => s.farmerId === farmerId && s.varietyId === varietyId);
  const stockKg = stock ? (stock.quantityKg ?? stock.quantityTons ?? 0) : 0;

  setConfirmAction({
    title: "⚠️ Bestand auf 0 setzen?",
    message: (
      <div>
        <p>Den gesamten Bestand von <strong>{farmer?.name ?? "Bauer"}</strong> (<strong>{variety?.name ?? "Sorte"}</strong>) im Packstellenlager auf 0 setzen?</p>
        <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#dc2626", margin: "1rem 0", textAlign: "center" }}>
          {formatKg(stockKg)} kg werden ausgebucht
        </p>
        <p style={{ color: "#dc2626", fontWeight: 600 }}>Diese Aktion kann nicht rückgängig gemacht werden.</p>
      </div>
    ),
    confirmLabel: "Ja, auf 0 setzen",
    cancelLabel: "Abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          const token = localStorage.getItem("authToken");
          const headers: HeadersInit = {
            "Content-Type": "application/json",
          };
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const res = await fetch(`${API_URL}/packstation/inventory-zero`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              farmerId,
              varietyId,
              comment: packZeroComment || null,
            }),
          });

          if (!res.ok) {
            const errorText = await res.text().catch(() => "");
            let errorMessage = "Fehler beim 0-Setzen im Packstellenlager";
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
            console.error("Inventory-Zero-Fehler:", res.status, errorMessage);
            showMessage(`Fehler beim 0-Setzen im Packstellenlager: ${errorMessage}`);
            return;
          }

        setPackZeroSelection("");
        setPackZeroComment("");
        await loadPackStationStock();
        await loadRecentInventoryZeroMovements();
        showMessage("Bestand im Packstellenlager auf 0 gesetzt");
      } catch (err) {
        console.error(err);
        showMessage("Fehler beim 0-Setzen im Packstellenlager");
      }
    },
  });
}

  // „echter" Verkauf – wird nur aus Confirm-Box aufgerufen
  async function doSale(
    type: "PRIVATE" | "EG",
    varietyId: number,
    qtyKg: number,
    fieldName?: string,
    harvestDate?: string,
    farmerIdOverride?: number,
    sortierGroesse?: string,
    varietyQuality?: string
  ) {
    const farmerId = farmerIdOverride ?? currentUser?.farmerId;

    if (!farmerId) {
      showMessage("Kein Bauer zugeordnet");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/farmer-stock/direct-sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId, // jetzt: entweder currentUser.farmerId oder Override
          varietyId, // Sorte
          quantityTons: qtyKg, // Backend erwartet dieses Feld, Wert in kg
          saleType: type,
          fieldName: type === "EG" ? fieldName ?? null : null,
          harvestDate: type === "EG" && harvestDate ? harvestDate : null,
          sortierGroesse: type === "EG" && sortierGroesse ? sortierGroesse : null,
          varietyQuality: type === "EG" && varietyQuality ? varietyQuality : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
        console.error("Fehler beim Verbuchen des Verkaufs:", res.status, errorData);
        showMessage(`Fehler beim Verbuchen: ${errorData.error || "Unbekannter Fehler"}`);
        return;
      }

      const result = await res.json().catch(() => null);
      if (!result || !result.ok) {
        console.error("Unerwartete Antwort vom Server:", result);
        showMessage("Fehler: Verkauf wurde nicht erfolgreich verbucht");
        return;
      }

      // Für Packbetrieb: Alle FarmerStocks neu laden (ohne farmerId), damit die Bauernliste aktualisiert wird
      // Für Farmer: Nur die eigenen FarmerStocks neu laden
      if (farmerIdOverride !== undefined) {
        // Packbetrieb-Verkauf: Alle FarmerStocks neu laden
        await loadFarmerStocksWrapper();
      } else {
        // Farmer-Verkauf: Nur eigene FarmerStocks neu laden
        await loadFarmerStocksWrapper(farmerId);
        // Auch FarmerPackStats neu laden, damit die Statistik aktualisiert wird
        if (currentUser?.farmerId) {
          await loadFarmerPackStatsWrapper(currentUser.farmerId);
        }
      }
      
      showMessage(
        type === "PRIVATE"
          ? "Privatverkauf verbucht"
          : "Verkauf an Eferdinger Landl verbucht"
      );
    } catch (err) {
      console.error("Fehler beim Verbuchen des Verkaufs:", err);
      showMessage(`Fehler beim Verbuchen: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
    }
  }

  // wird vom Formular aufgerufen – öffnet NUR die Bestätigungsbox (Bauer)
  function handleSale(
    e: React.FormEvent,
    type: "PRIVATE" | "EG",
    varietyId: number | "",
    qtyInput: string,
    clear: () => void,
    fieldName?: string,
    harvestDate?: string,
    sortierGroesse?: string,
    varietyQuality?: string
  ) {
    e.preventDefault();

    if (!currentUser?.farmerId) {
      showMessage("Kein Bauer zugeordnet");
      return;
    }
    if (!varietyId) {
      showMessage("Sorte wählen");
      return;
    }

    const qtyKg = parseKg(qtyInput);
    if (qtyKg <= 0) {
      showMessage("Menge muss > 0 sein");
      return;
    }

    const variety = safeVarieties.find((v) => v.id === varietyId);
    
    // Sortiergröße-Label für Bestätigungsmeldung
    const sortierGroesseLabels: Record<string, string> = {
      DRILLINGE: "Drillinge",
      SIZE_35_55: "35/55",
      SIZE_55_65: "55/65",
      SIZE_65_70: "65/70",
      UEBERGROESSEN: "Übergrößen",
    };
    const sortierLabel = sortierGroesse ? sortierGroesseLabels[sortierGroesse] ?? sortierGroesse : "";

    // Qualität-Label für Bestätigungsmeldung
    const qualityLabels: Record<string, string> = {
      Q1: "1. Qualität",
      Q2: "2. Qualität",
      UEBERGROESSE: "Übergrößen",
    };
    const qualityLabel = varietyQuality ? qualityLabels[varietyQuality] ?? varietyQuality : "";

    setConfirmAction({
      title:
        type === "PRIVATE"
          ? "Privatverkauf verbuchen?"
          : "Verkauf an Eferdinger Landl verbuchen?",
      message: `Sorte ${variety?.name ?? ""}, Menge ${formatKg(
        qtyKg
      )} kg${sortierLabel ? `, Größe: ${sortierLabel}` : ""}${qualityLabel ? `, Qualität: ${qualityLabel}` : ""}. Sind Sie sicher?`,
      confirmLabel:
        type === "PRIVATE"
          ? "Ja, Privatverkauf verbuchen"
          : "Ja, Verkauf an EZG verbuchen",
      cancelLabel: "Nein, abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);
        clear(); // Felder leeren
        await doSale(type, varietyId as number, qtyKg, fieldName, harvestDate, undefined, sortierGroesse, varietyQuality);
      },
    });
  }

  // Packbetrieb: Verkauf an EZG im Namen eines Bauern verbuchen
  function handlePackbetriebSale(e: React.FormEvent) {
    e.preventDefault();

    if (!isPackbetrieb) {
      showMessage("Keine Berechtigung");
      return;
    }

    if (!pbFarmerId) {
      showMessage("Bauer wählen");
      return;
    }

    if (!pbVarietyId) {
      showMessage("Sorte wählen");
      return;
    }

    const qtyKg = parseKg(pbQuantityKg);
    if (qtyKg <= 0) {
      showMessage("Menge muss > 0 sein");
      return;
    }

    const farmer = farmers.find((f) => f.id === pbFarmerId);
    const variety = safeVarieties.find((v) => v.id === pbVarietyId);
    
    // Sortiergröße-Label für Bestätigungsmeldung
    const sortierGroesseLabels: Record<string, string> = {
      DRILLINGE: "Drillinge",
      SIZE_35_55: "35/55",
      SIZE_55_65: "55/65",
      SIZE_65_70: "65/70",
      UEBERGROESSEN: "Übergrößen",
    };
    const sortierLabel = pbSortierGroesse ? sortierGroesseLabels[pbSortierGroesse] ?? pbSortierGroesse : "";

    // Qualität-Label für Bestätigungsmeldung
    const qualityLabels: Record<string, string> = {
      Q1: "1. Qualität",
      Q2: "2. Qualität",
      UEBERGROESSE: "Übergrößen",
    };
    const qualityLabel = pbQuality ? qualityLabels[pbQuality] ?? pbQuality : "";

    setConfirmAction({
      title: "Verkauf an EZG verbuchen?",
      message: `Bauer ${farmer?.name ?? ""}, Sorte ${
        variety?.name ?? ""
      }, Menge ${formatKg(qtyKg)} kg${sortierLabel ? `, Größe: ${sortierLabel}` : ""}${qualityLabel ? `, Qualität: ${qualityLabel}` : ""}. Sind Sie sicher?`,
      confirmLabel: "Ja, Verkauf an EZG verbuchen",
      cancelLabel: "Nein, abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);

        await doSale(
          "EG",
          pbVarietyId as number,
          qtyKg,
          pbFieldName,
          pbHarvestDate,
          pbFarmerId as number,
          pbSortierGroesse,
          pbQuality || undefined
        );

        // Felder leeren
        setPbFarmerId("");
        setPbVarietyId("");
        setPbQuantityKg("");
        setPbFieldName("");
        setPbHarvestDate("");
        setPbSortierGroesse("");
        setPbQuality("");
        
        // Alle FarmerStocks neu laden, damit die Bauernliste aktualisiert wird
        if (isPackbetrieb) {
          await loadFarmerStocksWrapper();
        }
      },
    });
  }

// === Packbetrieb: Statistik/Auswertung ===
async function handleUpdateSale(e: React.FormEvent) {
  e.preventDefault();
  if (!editingSaleId) return;

  const product = safeProducts.find((p) => p.id === Number(editSaleProductId));
  const unitsPerColli = product?.unitsPerColli;
  if (!unitsPerColli || unitsPerColli <= 0) {
    showMessage("Produkt hat keine 'Einheiten je Colli' definiert");
    return;
  }

  const colli = Number(editSaleColli);
  if (!Number.isFinite(colli) || colli <= 0) {
    showMessage("Ungültige Menge (Colli)");
    return;
  }

  const quantityUnits = colli * unitsPerColli;
  const pricePerUnit = editSalePricePerColli ? parseKg(editSalePricePerColli) : undefined;

  setConfirmAction({
    title: "Verkauf ändern?",
    message: `Möchten Sie diesen Verkauf wirklich ändern?`,
    confirmLabel: "Ja, ändern",
    cancelLabel: "Abbrechen",
    onConfirm: async () => {
      setConfirmAction(null);
      try {
        const res = await fetch(`${API_URL}/customer-sales/${editingSaleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: editSaleDate,
            customerId: editSaleCustomerId,
            productId: editSaleProductId,
            quantityUnits,
            unitPrice: pricePerUnit,
            comment: editSaleComment || null,
          }),
        });
        if (!res.ok) {
          showMessage("Fehler beim Ändern des Verkaufs");
          return;
        }
        setEditingSaleId(null);
        setEditSaleDate("");
        setEditSaleCustomerId("");
        setEditSaleProductId("");
        setEditSaleColli("");
        setEditSalePricePerColli("");
        setEditSaleComment("");
        await Promise.allSettled([
          loadPackbetriebStatistics().catch(console.error),
          loadPackPlantStock().catch(console.error), // Lager auch neu laden
        ]);
        showMessage("Verkauf geändert");
      } catch (err) {
        console.error(err);
        showMessage("Fehler beim Ändern des Verkaufs");
      }
    },
  });
}

async function handleUpdateComplaint(e: React.FormEvent) {
  e.preventDefault();
  if (!editingComplaintId) return;

  const complaint = statisticsData.complaints.find((c) => c.id === editingComplaintId);
  if (!complaint) return;

  const sale = complaint.customerSale;
  const product = safeProducts.find((p) => p.id === sale?.productId);
  const unitsPerColli = product?.unitsPerColli;
  if (!unitsPerColli || unitsPerColli <= 0) {
    showMessage("Produkt hat keine 'Einheiten je Colli' definiert");
    return;
  }

  const colli = Number(editComplaintColli);
  if (!Number.isFinite(colli) || colli <= 0) {
    showMessage("Ungültige Menge (Colli)");
    return;
  }

  const affectedQuantity = colli * unitsPerColli;

  if (editComplaintType === "PROZENTABZUG") {
    const pct = Number(editComplaintPercent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      showMessage("Prozentsatz muss zwischen 0 und 100 liegen");
      return;
    }
  }

  if (editComplaintType === "RETOURWARE" && (!editComplaintPackStationId || !editComplaintVarietyId)) {
    showMessage("Bei Retourware bitte Packstation und Sorte auswählen");
    return;
  }

  setConfirmAction({
    title: "Reklamation ändern?",
    message: `Möchten Sie diese Reklamation wirklich ändern?`,
    confirmLabel: "Ja, ändern",
    cancelLabel: "Abbrechen",
    onConfirm: async () => {
      setConfirmAction(null);
      try {
        const res = await fetch(`${API_URL}/customer-sale-complaints/${editingComplaintId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            complaintType: editComplaintType,
            affectedQuantity,
            discountPercent: editComplaintType === "PROZENTABZUG" ? Number(editComplaintPercent) : undefined,
            comment: editComplaintComment || null,
          }),
        });
        if (!res.ok) {
          showMessage("Fehler beim Ändern der Reklamation");
          return;
        }
        setEditingComplaintId(null);
        setEditComplaintType("RETOURWARE");
        setEditComplaintColli("");
        setEditComplaintPercent("");
        setEditComplaintComment("");
        await Promise.allSettled([
          loadPackbetriebStatistics().catch(console.error),
          loadPackStationStock().catch(console.error), // Falls Retourware, Packstellenlager auch neu laden
        ]);
        showMessage("Reklamation geändert");
      } catch (err) {
        console.error(err);
        showMessage("Fehler beim Ändern der Reklamation");
      }
    },
  });
}

async function handleUpdateInventory(e: React.FormEvent) {
  e.preventDefault();
  if (!editingInventoryId) return;

  const inventory = statisticsData.inventories.find((i) => i.id === editingInventoryId);
  if (!inventory) return;

  const product = safeProducts.find((p) => p.id === inventory.productId);
  const unitsPerColli = product?.unitsPerColli;
  if (!unitsPerColli || unitsPerColli <= 0) {
    showMessage("Produkt hat keine 'Einheiten je Colli' definiert");
    return;
  }

  const colli = Number(editInventoryColli);
  if (!Number.isFinite(colli)) {
    showMessage("Ungültige Menge (Colli)");
    return;
  }

  const changeUnits = colli * unitsPerColli;
  const pricePerUnit = editInventoryPricePerUnit ? parseKg(editInventoryPricePerUnit) : undefined;

  setConfirmAction({
    title: "Inventur ändern?",
    message: `Möchten Sie diese Inventur wirklich ändern?`,
    confirmLabel: "Ja, ändern",
    cancelLabel: "Abbrechen",
    onConfirm: async () => {
      setConfirmAction(null);
      try {
        const res = await fetch(`${API_URL}/packplant-stock-movements/${editingInventoryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            changeUnits,
            pricePerUnitSnapshot: pricePerUnit,
            comment: editInventoryComment || null,
          }),
        });
        if (!res.ok) {
          showMessage("Fehler beim Ändern der Inventur");
          return;
        }
        setEditingInventoryId(null);
        setEditInventoryColli("");
        setEditInventoryPricePerUnit("");
        setEditInventoryComment("");
        await Promise.allSettled([
          loadPackbetriebStatistics().catch(console.error),
          loadPackPlantStock().catch(console.error), // Lager auch neu laden
        ]);
        showMessage("Inventur geändert");
      } catch (err) {
        console.error(err);
        showMessage("Fehler beim Ändern der Inventur");
      }
    },
  });
}

// Wrapper-Funktion, die die neue Handler-Funktion verwendet
async function handleUpdatePackagingRun(e: React.FormEvent) {
  e.preventDefault();
  if (!editingPackagingRunId) return;

  if (!editPackagingRunProductId) {
    showMessage("Bitte Produkt wählen");
    return;
  }

  if (!editPackagingRunFarmerId) {
    showMessage("Bitte Bauer wählen");
    return;
  }

  if (!editPackagingRunVarietyId) {
    showMessage("Bitte Sorte wählen");
    return;
  }

  const product = safeProducts.find((p) => p.id === Number(editPackagingRunProductId));
  if (!product) {
    showMessage("Produkt nicht gefunden");
    return;
  }

  const unitsPerColli = product.unitsPerColli;
  if (!unitsPerColli || unitsPerColli <= 0) {
    showMessage("Produkt hat keine 'Einheiten je Colli' definiert");
    return;
  }

  if (!editPackagingRunColli || editPackagingRunColli.trim() === "") {
    showMessage("Bitte Anzahl Colli eingeben");
    return;
  }

  const colli = Number(editPackagingRunColli.replace(",", "."));
  if (!Number.isFinite(colli) || colli < 0) {
    showMessage("Ungültige Anzahl Colli");
    return;
  }

  const quantityUnits = colli * unitsPerColli;
  const wasteKg = editPackagingRunWasteKg ? parseKg(editPackagingRunWasteKg) : 0;
  
  // WICHTIG: Fertigware immer neu berechnen basierend auf Colli und unitKg
  // Dies stellt sicher, dass bei Colli-Änderung die Werte korrekt sind
  const calculatedFinishedKg = Number(product.unitKg) * quantityUnits;
  
  // Wenn Fertigware manuell geändert wurde, verwende den manuellen Wert
  // Sonst verwende die automatisch berechnete Fertigware
  const finishedKg = editPackagingRunFinishedKg && editPackagingRunFinishedKg.trim() !== ""
    ? parseKg(editPackagingRunFinishedKg)
    : calculatedFinishedKg;
  
  // Rohware immer neu berechnen basierend auf Fertigware + Abfall
  // Dies stellt sicher, dass bei Änderungen die Werte konsistent sind
  const calculatedRawInputKg = finishedKg + wasteKg;
  
  // Wenn Rohware manuell geändert wurde, verwende den manuellen Wert
  // Sonst verwende die automatisch berechnete Rohware
  const rawInputKg = editPackagingRunRawInputKg && editPackagingRunRawInputKg.trim() !== ""
    ? parseKg(editPackagingRunRawInputKg)
    : calculatedRawInputKg;

  // Finde Namen für Anzeige
  const selectedFarmer = safeFarmers.find((f) => f.id === Number(editPackagingRunFarmerId));
  const selectedVariety = editPackagingRunVarietiesForFarmer.find((v) => v.id === Number(editPackagingRunVarietyId));
  const farmerName = selectedFarmer?.name || "Unbekannt";
  const varietyName = selectedVariety?.name || "Unbekannt";

  // Debug-Logging für Testzwecke
  console.log("Update Packaging Run:", {
    productId: editPackagingRunProductId,
    farmerId: editPackagingRunFarmerId,
    varietyId: editPackagingRunVarietyId,
    varietyName,
    colli,
    quantityUnits,
    wasteKg,
    rawInputKg,
    finishedKg,
    productUnitKg: product.unitKg,
    unitsPerColli: product.unitsPerColli,
  });

  setConfirmAction({
    message: `Verpackungsbuchung #${editingPackagingRunId} wirklich ändern?\n\nNeue Werte:\n- Produkt: ${product.name}\n- Bauer: ${farmerName}\n- Sorte: ${varietyName}\n- Colli: ${colli}\n- Einheiten: ${quantityUnits}\n- Fertigware: ${formatKg(finishedKg)} kg\n- Rohware: ${formatKg(rawInputKg)} kg\n- Abfall: ${formatKg(wasteKg)} kg`,
    onConfirm: async () => {
      try {
        const res = await fetch(`${API_URL}/packaging-runs/${editingPackagingRunId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: editPackagingRunDate || undefined,
            productId: editPackagingRunProductId ? Number(editPackagingRunProductId) : undefined,
            farmerId: editPackagingRunFarmerId ? Number(editPackagingRunFarmerId) : undefined,
            varietyId: editPackagingRunVarietyId && editPackagingRunVarietyId !== "" ? Number(editPackagingRunVarietyId) : undefined,
            quantityUnits: quantityUnits || undefined,
            wasteKg: wasteKg || undefined,
            rawInputKg: rawInputKg || undefined,
            finishedKg: finishedKg || undefined,
          }),
        });
        if (!res.ok) {
          let errorText = "";
          try {
            errorText = await res.text();
          } catch (e) {
            errorText = "Unbekannter Fehler";
          }
          console.error("Fehler beim Ändern der Verpackungsbuchung:", res.status, errorText);
          showMessage(`Fehler beim Ändern der Verpackungsbuchung: ${errorText}`);
          setConfirmAction(null);
          return;
        }
        
        let updatedRun;
        try {
          updatedRun = await res.json();
          console.log("Verpackungsbuchung erfolgreich geändert:", updatedRun);
        } catch (parseErr) {
          console.error("Fehler beim Parsen der Response:", parseErr);
          // Auch wenn das Parsen fehlschlägt, war die Anfrage erfolgreich
          updatedRun = null;
        }
        
        // State zurücksetzen - IMMER, auch bei Fehlern beim Laden
        setEditingPackagingRunId(null);
        setEditPackagingRunDate("");
        setEditPackagingRunProductId("");
        setEditPackagingRunFarmerId("");
        setEditPackagingRunVarietyId("");
        setEditPackagingRunColli("");
        setEditPackagingRunWasteKg("");
        setEditPackagingRunRawInputKg("");
        setEditPackagingRunFinishedKg("");
        setEditPackagingRunVarietiesForFarmer([]);
        setConfirmAction(null);
        
        // Daten neu laden - Fehlerbehandlung für jede einzelne Funktion
        try {
          await Promise.allSettled([
            loadRecentPackagingRuns().catch((err) => {
              console.error("Fehler beim Laden der Verpackungsbuchungen:", err);
            }),
            loadPackStationStock().catch((err) => {
              console.error("Fehler beim Laden der Packstellen-Bestände:", err);
            }),
            loadPackPlantStock().catch((err) => {
              console.error("Fehler beim Laden der Packbetriebs-Bestände:", err);
            }),
          ]);
        } catch (loadErr) {
          console.error("Fehler beim Neuladen der Daten:", loadErr);
          // Trotzdem Erfolgsmeldung anzeigen, da die Änderung erfolgreich war
        }
        
        showMessage("Verpackungsbuchung geändert");
      } catch (err: any) {
        console.error("Unerwarteter Fehler beim Ändern der Verpackungsbuchung:", err);
        showMessage(`Fehler beim Ändern der Verpackungsbuchung: ${err?.message || "Unbekannter Fehler"}`);
        setConfirmAction(null);
      }
    },
  });
}

async function handleUpdateWaste(e: React.FormEvent) {
  e.preventDefault();
  if (!editingWasteId) return;

  const wasteKg = editWasteKg ? parseKg(editWasteKg) : 0;

  setConfirmAction({
    message: `Abfallbuchung #${editingWasteId} wirklich ändern?\n\nNeue Abfallmenge: ${formatKg(wasteKg)} kg`,
    onConfirm: async () => {
      try {
        const res = await fetch(`${API_URL}/packstation/waste/${editingWasteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            changeKg: -wasteKg, // Abfall ist negativ
            comment: editWasteComment || null,
          }),
        });
        
        if (!res.ok) {
          let errorText = "";
          try {
            errorText = await res.text();
          } catch (e) {
            errorText = "Unbekannter Fehler";
          }
          console.error("Fehler beim Ändern der Abfallbuchung:", errorText);
          showMessage("Fehler beim Ändern der Abfallbuchung");
          return;
        }

        const updatedMovement = await res.json();
        console.log("Abfallbuchung erfolgreich geändert:", updatedMovement);

        // States zurücksetzen
        setEditingWasteId(null);
        setEditWasteKg("");
        setEditWasteComment("");
        
        // Bestätigungsdialog schließen
        setConfirmAction(null);

        // Daten neu laden - Fehlerbehandlung für jede einzelne Funktion
        try {
          await Promise.allSettled([
            loadRecentWasteMovements().catch((err) => {
              console.error("Fehler beim Laden der Abfallbuchungen:", err);
            }),
            loadPackStationStock().catch((err) => {
              console.error("Fehler beim Laden der Packstellen-Bestände:", err);
            }),
          ]);
        } catch (loadErr) {
          console.error("Fehler beim Neuladen der Daten:", loadErr);
        }

        showMessage("Abfallbuchung geändert");
      } catch (err) {
        console.error("Fehler beim Ändern der Abfallbuchung:", err);
        showMessage("Fehler beim Ändern der Abfallbuchung");
        setConfirmAction(null);
      }
    },
  });
}

async function handleUpdateInventoryZero(e: React.FormEvent) {
  e.preventDefault();
  if (!editingInventoryZeroId) return;

  // Lagerstand ist optional - wenn nicht angegeben, bleibt die ursprüngliche Buchung unverändert
  const stockKg = editInventoryZeroStockKg && editInventoryZeroStockKg.trim() !== "" 
    ? parseKg(editInventoryZeroStockKg) 
    : null;

  const message = stockKg != null
    ? `'Auf 0'-Buchung #${editingInventoryZeroId} wirklich ändern?\n\nNeuer Lagerstand: ${formatKg(stockKg)} kg\n(Der Lagerstand wird auf ${formatKg(stockKg)} kg gesetzt)`
    : `'Auf 0'-Buchung #${editingInventoryZeroId} wirklich ändern?`;

  setConfirmAction({
    message,
    onConfirm: async () => {
      try {
        const res = await fetch(`${API_URL}/packstation/inventory-zero/${editingInventoryZeroId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comment: editInventoryZeroComment || null,
            stockKg: stockKg != null ? stockKg : undefined,
          }),
        });
        
        if (!res.ok) {
          let errorText = "";
          try {
            errorText = await res.text();
          } catch (e) {
            errorText = "Unbekannter Fehler";
          }
          console.error("Fehler beim Ändern der 'Auf 0'-Buchung:", errorText);
          showMessage("Fehler beim Ändern der 'Auf 0'-Buchung");
          return;
        }

        const updatedMovement = await res.json();
        console.log("'Auf 0'-Buchung erfolgreich geändert:", updatedMovement);

        // States zurücksetzen
        setEditingInventoryZeroId(null);
        setEditInventoryZeroComment("");
        setEditInventoryZeroStockKg("");
        
        // Bestätigungsdialog schließen
        setConfirmAction(null);

        // Daten neu laden - Fehlerbehandlung für jede einzelne Funktion
        try {
          await Promise.allSettled([
            loadRecentInventoryZeroMovements().catch((err) => {
              console.error("Fehler beim Laden der 'Auf 0'-Buchungen:", err);
            }),
            loadPackStationStock().catch((err) => {
              console.error("Fehler beim Laden der Packstellen-Bestände:", err);
            }),
          ]);
        } catch (loadErr) {
          console.error("Fehler beim Neuladen der Daten:", loadErr);
        }

        showMessage("'Auf 0'-Buchung geändert");
      } catch (err) {
        console.error("Fehler beim Ändern der 'Auf 0'-Buchung:", err);
        showMessage("Fehler beim Ändern der 'Auf 0'-Buchung");
        setConfirmAction(null);
      }
    },
  });
}

async function loadPackbetriebStatistics() {
  setStatLoading(true);
  try {
    const params = new URLSearchParams();
    if (statFilterDateFrom) params.append("dateFrom", statFilterDateFrom);
    if (statFilterDateTo) params.append("dateTo", statFilterDateTo);
    if (statFilterProductId) params.append("productId", String(statFilterProductId));
    if (statFilterCustomerId) params.append("customerId", String(statFilterCustomerId));
    if (statFilterType !== "ALL") params.append("type", statFilterType);

    const res = await fetch(`${API_URL}/packbetrieb/statistics?${params.toString()}`);
    if (!res.ok) throw new Error("Fehler beim Laden der Statistik");
    const data = await res.json();
    setStatisticsData(data);
  } catch (err) {
    console.error("loadPackbetriebStatistics error:", err);
    showMessage("Fehler beim Laden der Statistik");
  } finally {
    setStatLoading(false);
  }
}





// === Packbetrieb: Lager & Inventur-Tab ===

// === Packbetrieb: Verkauf-Tab ===

  // === Bauernlager-Ansicht (Sorten) ===


  // === PACKSTELLE: Abfall verbuchen ===
  // Wrapper-Funktion, die die neue Handler-Funktion verwendet
  function handlePackstationWaste(e: React.FormEvent) {
    e.preventDefault();

    if (!wasteSelection) {
      showMessage("Bitte Bauer/Sorte auswählen");
      return;
    }
    const qty = parseKg(wasteKg);
    if (qty <= 0) {
      showMessage("Menge muss > 0 sein");
      return;
    }

    const [farmerIdStr, varietyIdStr] = wasteSelection.split("-");
    const farmerId = Number(farmerIdStr);
    const varietyId = Number(varietyIdStr);

    // Namen für Anzeige finden
    const farmer = farmers.find((f: Farmer) => f.id === farmerId);
    const variety = safeVarieties.find((v) => v.id === varietyId);

    setConfirmAction({
      title: "🗑️ Abfall verbuchen?",
      message: `${formatKg(qty)} kg Sortierabfall von ${farmer?.name ?? "Bauer"} (${variety?.name ?? "Sorte"}) verbuchen?`,
      confirmLabel: "Ja, verbuchen",
      cancelLabel: "Abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          const token = localStorage.getItem("authToken");
          const headers: HeadersInit = {
            "Content-Type": "application/json",
          };
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const res = await fetch(`${API_URL}/packstation/waste`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              farmerId,
              varietyId,
              wasteKg: qty,
            }),
          });

          if (!res.ok) {
            const errorText = await res.text().catch(() => "");
            let errorMessage = "Fehler beim Verbuchen des Abfalls";
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
            console.error("Waste-Fehler:", res.status, errorMessage);
            showMessage(`Fehler beim Verbuchen des Abfalls: ${errorMessage}`);
            return;
          }

          setWasteKg("");
          setWasteSelection("");
          await loadPackStationStock();
          await loadRecentWasteMovements();
          showMessage("Abfall verbucht");
        } catch (err) {
          console.error(err);
          showMessage("Fehler beim Verbuchen des Abfalls");
        }
      },
    });
  }
// === Packbetrieb: Verkauf verpackter Produkte an Kunden ===
function handleProductSale(e: React.FormEvent) {
  e.preventDefault();

  if (!isPackbetrieb) {
    showMessage("Keine Berechtigung (nur Packbetrieb).");
    return;
  }

  if (!saleCustomerId) {
    showMessage("Bitte Kunde wählen.");
    return;
  }
  if (!saleProductId) {
    showMessage("Bitte Produkt wählen.");
    return;
  }

  // IDs als echte Zahlen
  const customerIdNum =
    typeof saleCustomerId === "number"
      ? saleCustomerId
      : Number(saleCustomerId);

  const productIdNum =
    typeof saleProductId === "number"
      ? saleProductId
      : Number(saleProductId);

  if (!Number.isFinite(customerIdNum) || !Number.isFinite(productIdNum)) {
    showMessage("Kunde oder Produkt ist ungültig.");
    return;
  }

  // Produkt holen für unitsPerColli
  const product = safeProducts.find((p) => p.id === productIdNum);
  const unitsPerColli = product?.unitsPerColli;
  
  if (!unitsPerColli || unitsPerColli <= 0) {
    showMessage("Dieses Produkt hat keine 'Einheiten je Colli' definiert. Bitte zuerst im Stammdaten-Bereich anpassen.");
    return;
  }

  // Colli in Einheiten umrechnen
  const colli = Number(saleQuantityUnits.replace(",", "."));
  if (!Number.isFinite(colli) || colli <= 0) {
    showMessage("Menge (Colli) ist ungültig.");
    return;
  }
  
  const units = colli * unitsPerColli;

  const dateToUse =
    saleDate && saleDate.trim().length > 0
      ? saleDate
      : new Date().toISOString().substring(0, 10);

  // passenden Preis aus prices suchen (neueste Zeile passend zu Kunde+Produkt)
  let effectivePrice: number | null = null;

  // Hilfsfunktion: validFrom sicher in String umwandeln
  const toDateStr = (val: unknown): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (val instanceof Date) return val.toISOString();
    if (typeof val === "object" && val !== null && "toISOString" in val) {
      return String((val as { toISOString: () => string }).toISOString());
    }
    return String(val);
  };

  try {
    const relevantPrices = prices.filter(
      (p) => p.customerId === customerIdNum && p.productId === productIdNum
    );

    if (relevantPrices.length > 0) {
      // nach gültig ab sortieren, neueste zuerst
      relevantPrices.sort((a, b) =>
        toDateStr(b.validFrom).localeCompare(toDateStr(a.validFrom))
      );

      // erste Zeile nehmen, die nicht in der Zukunft liegt
      const fromPrice =
        relevantPrices.find(
          (p) => toDateStr(p.validFrom).substring(0, 10) <= dateToUse
        ) ?? relevantPrices[0];

      effectivePrice = fromPrice?.pricePerUnit ?? null;
    }
  } catch (err) {
    console.error("Fehler bei Preisermittlung:", err);
    effectivePrice = null;
  }

  // falls kein Preis gefunden, manuelle Eingabe verwenden
  if (effectivePrice == null) {
    if (!salePriceOverride.trim()) {
      showMessage(
        "Kein Preis für Kunde/Produkt gefunden. Bitte Preis manuell eingeben."
      );
      return;
    }
    const manual = Number(salePriceOverride.replace(",", "."));
    if (!Number.isFinite(manual) || manual < 0) {
      showMessage("Manueller Preis ist ungültig.");
      return;
    }
    effectivePrice = manual;
  }

  // Bestätigungsdialog zeigen
  const customer = customers.find((c: Customer) => c.id === customerIdNum);
  const finalPrice = effectivePrice;

  setConfirmAction({
    title: "Produktverkauf verbuchen?",
    message: `${colli} Colli (${units} Einheiten) × ${product?.name ?? "Produkt"} an ${customer?.name ?? "Kunde"} verkaufen?`,
    confirmLabel: "Ja, verbuchen",
    cancelLabel: "Abbrechen",
    onConfirm: async () => {
      setConfirmAction(null);
      try {
        const res = await fetch(`${API_URL}/packplant-stock/sale`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packPlantId: 1,
            productId: productIdNum,
            customerId: customerIdNum,
            units,
            date: dateToUse,
            pricePerUnit: finalPrice,
            comment: null,
            varietyId: null,
            farmerId: null,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Fehler beim Verbuchen des Produktverkaufs", res.status, errorText);
          try {
            const errorJson = JSON.parse(errorText);
            showMessage(errorJson.error || errorJson.detail || "Fehler beim Verbuchen des Produktverkaufs");
          } catch {
            showMessage(`Fehler beim Verbuchen des Produktverkaufs: ${errorText}`);
          }
          return;
        }
        
        const result = await res.json();
        console.log("Verkauf erfolgreich:", result);

        setSaleCustomerId("");
        setSaleProductId("");
        setSaleVarietyId("");
        setSaleFarmerId("");
        setSaleQuantityUnits("");
        setSalePriceOverride("");
        setSaleDate(new Date().toISOString().substring(0, 10));
        
        // Lager neu laden, damit der aktuelle Stand angezeigt wird
        await loadPackPlantStock();
        
        showMessage("Produktverkauf verbucht");
      } catch (err) {
        console.error(err);
        showMessage("Fehler beim Verbuchen des Produktverkaufs");
      }
    },
  });
}

// Inventur verpackter Produkte im Packbetrieb
async function handleProductInventory(e: React.FormEvent) {
  e.preventDefault();

  if (!isPackbetrieb) {
    showMessage("Inventur verpackter Produkte ist nur im Packbetrieb möglich.");
    return;
  }

  if (!invProductId) {
    showMessage("Bitte ein Produkt für die Inventur auswählen.");
    return;
  }

  const product = safeProducts.find((p) => p.id === invProductId);
  const unitsPerColli = product?.unitsPerColli;
  
  if (!unitsPerColli || unitsPerColli <= 0) {
    showMessage("Dieses Produkt hat keine 'Einheiten je Colli' definiert. Bitte zuerst im Stammdaten-Bereich anpassen.");
    return;
  }

  const targetColli = invQuantityUnits
    ? Number(invQuantityUnits.replace(",", "."))
    : 0;

  if (!Number.isFinite(targetColli)) {
    showMessage("Neuer Bestand (Colli) muss eine gültige Zahl sein.");
    return;
  }

  const targetUnits = targetColli * unitsPerColli;
  const confirmText = `Bestand für dieses Produkt auf ${targetColli} Colli (${targetUnits} Einheiten) setzen?${targetColli < 0 ? " (Negativer Bestand erlaubt)" : ""}`;
  if (!window.confirm(confirmText)) {
    return;
  }

  // Preis ermitteln: Manuelle Eingabe hat Vorrang, sonst neuesten Preis für das Produkt verwenden
  let priceValue: number | null = null;

  if (invPricePerUnit && invPricePerUnit.trim()) {
    // Manuell eingegebener Preis
    priceValue = Number(invPricePerUnit.replace(",", "."));
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      showMessage("Eingegebener Preis ist ungültig.");
      return;
    }
  } else {
    // Automatisch neuesten Preis für das Produkt suchen (wie beim Verkauf)
    const today = new Date().toISOString().substring(0, 10);

    // Hilfsfunktion: validFrom sicher in String umwandeln
    const toDateStr = (val: unknown): string => {
      if (!val) return "";
      if (typeof val === "string") return val;
      if (val instanceof Date) return val.toISOString();
      if (typeof val === "object" && val !== null && "toISOString" in val) {
        return String((val as { toISOString: () => string }).toISOString());
      }
      return String(val);
    };

    // Alle Preise für dieses Produkt suchen (unabhängig vom Kunden)
    const relevantPrices = prices.filter(
      (p) => p.productId === invProductId
    );

    if (relevantPrices.length > 0) {
      // nach gültig ab sortieren, neueste zuerst
      relevantPrices.sort((a, b) =>
        toDateStr(b.validFrom).localeCompare(toDateStr(a.validFrom))
      );

      // erste Zeile nehmen, die nicht in der Zukunft liegt
      const foundPrice =
        relevantPrices.find(
          (p) => toDateStr(p.validFrom).substring(0, 10) <= today
        ) ?? relevantPrices[0];

      priceValue = foundPrice?.pricePerUnit ?? null;
    }
  }

  try {
    const res = await fetch(`${API_URL}/packplant-stock/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: invProductId,
        newQuantityUnits: targetUnits,
        pricePerUnit: priceValue,
        comment: "Inventur Packbetrieb (Frontend)",
      }),
    });

    if (!res.ok) {
      console.error(
        "Fehler bei Inventur Packbetrieb",
        await res.text().catch(() => "")
      );
      showMessage("Fehler beim Buchen der Inventur im Packbetrieb.");
      return;
    }

    // Lager neu laden, damit du den aktuellen Stand siehst
    await loadPackPlantStock();

    setInvProductId("");
    setInvQuantityUnits("");
    setInvPricePerUnit("");
    showMessage("Inventur der verpackten Produkte wurde verbucht.");
  } catch (err) {
    console.error(err);
    showMessage("Fehler beim Buchen der Inventur.");
  }
}


// === REKLAMATION: Funktionen ===

// Kunden mit Sales laden
async function loadReklCustomers() {
  try {
    const res = await fetch(`${API_URL}/customer-sales/customers`);
    if (!res.ok) throw new Error("Fehler beim Laden der Kunden");
    const data = await res.json();
    setReklCustomers(data);
  } catch (err) {
    console.error("loadReklCustomers error:", err);
  }
}

// Produkte für Kunden laden
async function loadReklProducts(customerId: number) {
  try {
    const res = await fetch(`${API_URL}/customer-sales/products/${customerId}`);
    if (!res.ok) throw new Error("Fehler beim Laden der Produkte");
    const data = await res.json();
    setReklProducts(data);
  } catch (err) {
    console.error("loadReklProducts error:", err);
  }
}

// Sales für Kunde + Produkt laden (nur mit Restmenge > 0)
async function loadReklSales(customerId: number, productId: number) {
  try {
    const res = await fetch(
      `${API_URL}/customer-sales?customerId=${customerId}&productId=${productId}&onlyWithRemaining=true`
    );
    if (!res.ok) throw new Error("Fehler beim Laden der Lieferungen");
    const data = await res.json();
    setReklSales(data);
  } catch (err) {
    console.error("loadReklSales error:", err);
  }
}

// Relevante Bauern für einen Verkauf laden (Bauern, deren Ware für diesen Verkauf verwendet wurde)
async function loadReklRelevantFarmers(saleId: number) {
  try {
    console.log(`Loading relevant farmers for sale ${saleId}...`);
    const res = await fetch(`${API_URL}/customer-sales/${saleId}/farmers`);
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Failed to load relevant farmers: ${res.status} ${errorText}`);
      throw new Error(`Fehler beim Laden der relevanten Bauern: ${res.status}`);
    }
    const data = await res.json();
    console.log(`Loaded ${data.length} relevant farmers for sale ${saleId}:`, data);
    setReklRelevantFarmers(data);
    // Wenn der aktuell ausgewählte Bauer nicht mehr in der Liste ist, zurücksetzen
    if (reklFarmerId && !data.find((f: Farmer) => f.id === reklFarmerId)) {
      setReklFarmerId("");
    }
  } catch (err) {
    console.error("loadReklRelevantFarmers error:", err);
    setReklRelevantFarmers([]);
    showMessage("Fehler beim Laden der relevanten Bauern. Bitte versuchen Sie es erneut.");
  }
}

// Reklamation anlegen
function handleReklamationSubmit(e: React.FormEvent) {
  e.preventDefault();
  
  if (!reklSelectedSaleId || !reklFarmerId || !reklQuantity) {
    showMessage("Bitte alle Pflichtfelder ausfüllen (Kunde, Produkt, Lieferung, Bauer, Menge)");
    return;
  }

  // Prüfe, ob ein Bauer ausgewählt wurde
  if (!reklFarmerId || reklFarmerId === "") {
    showMessage("Bitte einen Bauer auswählen");
    return;
  }

  // Prüfe, ob relevante Bauern geladen wurden
  if (reklRelevantFarmers.length === 0) {
    showMessage("Keine relevanten Bauern gefunden. Bitte warten Sie, bis die Bauern geladen sind, oder wählen Sie einen anderen Verkauf.");
    return;
  }

  // Produkt holen für unitsPerColli
  const product = safeProducts.find((p) => p.id === Number(reklSelectedProductId));
  const unitsPerColli = product?.unitsPerColli;
  
  if (!unitsPerColli || unitsPerColli <= 0) {
    showMessage("Dieses Produkt hat keine 'Einheiten je Colli' definiert. Bitte zuerst im Stammdaten-Bereich anpassen.");
    return;
  }

  // Colli in Einheiten umrechnen
  const colli = Number(reklQuantity);
  if (!Number.isFinite(colli) || colli <= 0) {
    showMessage("Ungültige Menge (Colli)");
    return;
  }
  
  const qty = colli * unitsPerColli;
  const remainingColli = Math.floor(reklSelectedSale.remainingQuantity / unitsPerColli);
  
  if (reklSelectedSale && colli > remainingColli) {
    showMessage(`Menge darf Restmenge (${remainingColli} Colli = ${reklSelectedSale.remainingQuantity} Einheiten) nicht übersteigen`);
    return;
  }

  if (reklType === "PROZENTABZUG") {
    const pct = Number(reklPercent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      showMessage("Prozentsatz muss zwischen 0 und 100 liegen");
      return;
    }
  }


  // Bestätigungsdialog zeigen
  const typeLabel = reklType === "PROZENTABZUG" 
    ? `${reklPercent}% Abzug` 
    : "Retourware";
  const customer = customers.find((c: Customer) => c.id === Number(reklSelectedCustomerId));

  setConfirmAction({
    title: "Reklamation anlegen?",
    message: `${colli} Colli (${qty} Einheiten) von ${product?.name ?? "Produkt"} (${customer?.name ?? "Kunde"}) als ${typeLabel} reklamieren?`,
    confirmLabel: "Ja, reklamieren",
    cancelLabel: "Abbrechen",
    onConfirm: async () => {
      setConfirmAction(null);
      setReklLoading(true);

      try {
        // Validierung: Prüfe, ob farmerId eine gültige Zahl ist
        const farmerIdNum = Number(reklFarmerId);
        if (!Number.isFinite(farmerIdNum) || farmerIdNum <= 0) {
          showMessage("Bitte einen gültigen Bauer auswählen");
          setReklLoading(false);
          return;
        }

        const body: any = {
          customerSaleId: Number(reklSelectedSaleId),
          farmerId: farmerIdNum,
          complaintType: reklType,
          affectedQuantity: qty,
          comment: reklComment || undefined,
        };

        if (reklType === "PROZENTABZUG") {
          body.discountPercent = Number(reklPercent);
        }

        console.log("Submitting complaint with body:", body);
        const res = await fetch(`${API_URL}/customer-sale-complaints`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Fehler beim Anlegen");
        }

        showMessage(data.message || "Reklamation erfolgreich angelegt");

        // Formular vollständig zurücksetzen
        setReklSelectedCustomerId("");
        setReklSelectedProductId("");
        setReklSelectedSaleId("");
        setReklSelectedSale(null);
        setReklRelevantFarmers([]);
        setReklFarmerId("");
        setReklType("RETOURWARE");
        setReklQuantity("");
        setReklPercent("");
        setReklComment("");
        setReklDate(new Date().toISOString().substring(0, 10));

        // Sales neu laden (Restmenge aktualisiert)
        if (reklSelectedCustomerId && reklSelectedProductId) {
          await loadReklSales(Number(reklSelectedCustomerId), Number(reklSelectedProductId));
        }
        
        // Statistik neu laden, falls im Statistik-Tab
        if (tab === "statistik") {
          await loadPackbetriebStatistics();
        }

      } catch (err: any) {
        showMessage(err.message || "Fehler beim Anlegen der Reklamation");
      } finally {
        setReklLoading(false);
      }
    },
  });
}

// === PACKSTELLE: Verpackung verbuchen ===
// Wrapper-Funktion, die die neue Handler-Funktion verwendet
function handlePackstationPacking(e: React.FormEvent) {
  e.preventDefault();

  if (!packSelection) {
    showMessage("Bitte Bauer/Sorte auswählen");
    return;
  }
  if (!packProductId) {
    showMessage("Bitte Produkt auswählen");
    return;
  }

  const product = safeProducts.find((p) => p.id === packProductId);
  if (!product) {
    showMessage("Produkt nicht gefunden");
    return;
  }

  const [farmerIdStr, varietyIdStr] = packSelection.split("-");
  const farmerId = Number(farmerIdStr);
  const varietyId = Number(varietyIdStr);

  if (!farmerId || !varietyId) {
    showMessage("Ungültige Auswahl Bauer/Sorte");
    return;
  }

  const selectedStock = packStationStocks.find(
    (s) => s.farmerId === farmerId && s.varietyId === varietyId
  );
  const targetCooking = selectedStock?.variety?.cookingType;
  if (
    targetCooking &&
    product.cookingType &&
    product.cookingType !== targetCooking
  ) {
    showMessage(
      `Produkt passt nicht zur Kocheigenschaft (${getCookingLabel(
        product.cookingType as CookingType
      )} vs ${getCookingLabel(targetCooking as CookingType)})`
    );
    return;
  }

  const unitsPerColli = product.unitsPerColli ?? 0;

  // Colli und Einzelpackungen einlesen
  const colli = packColli ? Number(packColli.replace(",", ".")) : 0;
  const extraUnits = packUnits ? Number(packUnits.replace(",", ".")) : 0;

  if (!Number.isFinite(colli) || colli < 0) {
    showMessage("Anzahl Colli ist ungültig");
    return;
  }
  if (!Number.isFinite(extraUnits) || extraUnits < 0) {
    showMessage("Anzahl Packungen ist ungültig");
    return;
  }

  if (colli > 0 && (!Number.isFinite(unitsPerColli) || unitsPerColli <= 0)) {
    showMessage(
      "Für Colli muss beim Produkt 'Einheiten je Colli' gepflegt sein"
    );
    return;
  }

  const units =
    colli * (unitsPerColli > 0 ? unitsPerColli : 0) + extraUnits;

  if (units <= 0) {
    showMessage("Es muss mindestens eine Packung verbucht werden");
    return;
  }

  const parts: string[] = [];
  if (colli > 0) {
    parts.push(
      unitsPerColli > 0
        ? `${colli} Colli à ${unitsPerColli}`
        : `${colli} Colli`
    );
  }
  if (extraUnits > 0) {
    parts.push(`${extraUnits} Einzelpackungen`);
  }

  const confirmMessage =
    parts.length > 0
      ? `${units} Packungen (${parts.join(" + ")}) von ${product.name} verpacken?`
      : `${units} Packungen von ${product.name} verpacken?`;

  setConfirmAction({
    title: "📦 Verpackung verbuchen?",
    message: confirmMessage,
    confirmLabel: "Ja, verbuchen",
    cancelLabel: "Abbrechen",
    onConfirm: async () => {
      setConfirmAction(null);
      try {
        const token = localStorage.getItem("authToken");
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/packaging-runs`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            productId: packProductId,
            quantityUnits: units,
            farmerId,
            varietyId,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          let errorMessage = "Fehler beim Verbuchen der Verpackung";
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          console.error("Verpackungs-Fehler:", res.status, errorMessage);
          showMessage(`Fehler beim Verbuchen der Verpackung: ${errorMessage}`);
          return;
        }

        setPackSelection("");
        setPackProductId("");
        setPackColli("");
        setPackUnits("");
        await loadPackStationStock();
        await loadPackPlantStock(); // Packbetriebslager auch neu laden
        await loadRecentPackagingRuns();
        showMessage("Verpackung verbucht");
      } catch (err) {
        console.error(err);
        showMessage("Fehler beim Verbuchen der Verpackung");
      }
    },
  });
}

async function handleImportPlansFromCsv() {
  try {
    const res = await fetch(`${API_URL}/delivery-plans/import-from-csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Fehler beim Import:", text);
      showMessage("Fehler beim Import der Planmengen");
      return;
    }

    const data = await res.json();
    
    // Planmengen neu laden
    const currentYear = new Date().getFullYear();
    await loadDeliveryPlansWrapper(currentYear);
    
    showMessage(
      `Import abgeschlossen: ${data.importedCount} Zeilen, Fehler: ${data.errorCount}`
    );
  } catch (err) {
    console.error(err);
    showMessage("Fehler beim Import der Planmengen");
  }
}

async function handleSavePlanmenge(e: React.FormEvent) {
  e.preventDefault();

  if (!planFarmerIdInput || !planCookingTypeInput || !planQuantityKgInput) {
    showMessage("Bitte Bauer, Kochtyp und Menge ausfüllen");
    return;
  }

  // Entweder Monat oder Kalenderwoche muss gewählt sein
  if (!planMonthInput && !planWeekInput) {
    showMessage("Bitte entweder Monat oder Kalenderwoche auswählen");
    return;
  }

  const currentYear = new Date().getFullYear();

  try {
    const body: any = {
      farmerId: planFarmerIdInput,
      year: currentYear,
      cookingType: planCookingTypeInput,
      plannedKg: planQuantityKgInput.replace(",", "."),
    };

    // Wenn KW ausgewählt: direkt diese Woche setzen
    if (planWeekInput) {
      body.week = planWeekInput;
    } else if (planMonthInput) {
      // Wenn Monat: auf Wochen aufteilen
      body.month = planMonthInput;
    }

    const res = await fetch(`${API_URL}/delivery-plans/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showMessage(err.error || "Fehler beim Speichern der Planmenge");
      return;
    }

    const data = await res.json();
    showMessage(data.message || "Planmenge gespeichert");

    // Formular zurücksetzen (nur Menge und Woche/Monat)
    setPlanQuantityKgInput("");
    setPlanWeekInput("");
    setPlanMonthInput("");

    // Planmengen neu laden
    await loadDeliveryPlansWrapper(currentYear);
  } catch (err) {
    console.error(err);
    showMessage("Fehler beim Speichern der Planmenge");
  }
}

// === Stammdaten-Tab ===

 

  // === Login-Seite (wenn nicht eingeloggt) ===
  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          position: "relative",
          padding: "1rem",
        }}
      >
        {/* Hintergrundbild */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${bgImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            zIndex: 0,
          }}
        />
        
        {/* Overlay für bessere Lesbarkeit */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(15, 23, 42, 0.70) 0%, rgba(30, 41, 59, 0.80) 100%)",
            zIndex: 1,
          }}
        />

        {/* Login-Container */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            maxWidth: "480px",
            padding: "2rem 1.5rem",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "2rem",
            }}
          >
            <img
              src={logoImg}
              alt="Eferdinger Landl Erdäpfel"
              style={{
                maxWidth: "400px",
                width: "100%",
                height: "auto",
                marginBottom: "2rem",
                filter: "drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4))",
                display: "block",
              }}
              onError={(e) => {
                console.error("Logo konnte nicht geladen werden:", e);
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <h1
              style={{
                margin: 0,
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "#f8fafc",
                textAlign: "center",
                letterSpacing: "-0.02em",
              }}
            >
              Eferdinger Landl App
            </h1>
            <p
              style={{
                margin: "0.5rem 0 0 0",
                fontSize: "0.9375rem",
                color: "#cbd5e1",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Zentrale Plattform der Erzeugergemeinschaft
            </p>
          </div>

          {/* Login-Formular Card */}
          <div
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
              padding: "2rem",
            }}
          >
            <form
              onSubmit={handleLogin}
              autoComplete="off"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div>
                <label
                  htmlFor="login-email"
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#e2e8f0",
                    marginBottom: "0.5rem",
                  }}
                >
                  E-Mail
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="ihre.email@beispiel.at"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="username"
                  name="email"
                  required
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    fontSize: "16px", // Verhindert Zoom auf iOS
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    borderRadius: "0.5rem",
                    color: "#f8fafc",
                    boxSizing: "border-box",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.background = "rgba(15, 23, 42, 0.8)";
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
                    e.currentTarget.style.background = "rgba(15, 23, 42, 0.6)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#e2e8f0",
                    marginBottom: "0.5rem",
                  }}
                >
                  Passwort
                </label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  name="password"
                  required
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    fontSize: "16px", // Verhindert Zoom auf iOS
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    borderRadius: "0.5rem",
                    color: "#f8fafc",
                    boxSizing: "border-box",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.background = "rgba(15, 23, 42, 0.8)";
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
                    e.currentTarget.style.background = "rgba(15, 23, 42, 0.6)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "0.875rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  border: "none",
                  borderRadius: "0.5rem",
                  color: "#ffffff",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px -3px rgba(59, 130, 246, 0.5)",
                  transition: "all 0.2s",
                  marginTop: "0.5rem",
                  minHeight: "48px", // Touch-optimiert
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px -3px rgba(59, 130, 246, 0.6)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px -3px rgba(59, 130, 246, 0.5)";
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = "scale(0.98)";
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                Anmelden
              </button>
            </form>

            {/* Fehlermeldung */}
            {message && (
              <div
                style={{
                  marginTop: "1.25rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "0.5rem",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  fontSize: "0.875rem",
                  color: "#fca5a5",
                  textAlign: "center",
                }}
              >
                {message}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: "2rem",
              textAlign: "center",
              fontSize: "0.8125rem",
              color: "#94a3b8",
            }}
          >
            <p style={{ margin: 0 }}>
              Interne Plattform für Erzeuger, Packstellen und Organisation
            </p>
          </div>
        </div>
      </div>
    );
  }

  // === Hauptlayout & Tabs (wenn eingeloggt) ===
  return (
    <div className="app-layout">
      <div className="app-container">
        <header className="app-header">
          <div>
            <h1 style={{ margin: 0 }}>Eferdinger Landl App</h1>
            {currentUser && (
              <div className="user-info" style={{ fontSize: "0.9375rem", color: "#e2e8f0" }}>
                Eingeloggt als {currentUser.name} ({currentUser.role})
              </div>
            )}
          </div>

          <div>
            <button type="button" onClick={authHandleLogout}>
              Logout
            </button>
          </div>
        </header>

      {message && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.875rem 1rem",
            borderRadius: "0.5rem",
            background: "#1e3a5f",
            border: "1px solid #3b82f6",
            fontSize: "1rem",
            color: "#e0f2fe",
          }}
        >
          {message}
        </div>
      )}

      {currentUser && (
        <>
          <nav className="app-nav">
            {isEgAdmin && (
              <button
                type="button"
                onClick={() => setTab("stamm")}
                className={tab === "stamm" ? "active" : ""}
              >
                📋 Stammdaten
              </button>
            )}

            {/* Bauernlager/Bauernlieferschein - nicht für Packstelle */}
            {!isPackstelle && (
              <button
                type="button"
                onClick={() => setTab("farmerStock")}
                className={tab === "farmerStock" ? "active" : ""}
              >
                {isPackbetrieb ? "📄 Bauernlieferschein" : "🌾 Bauernlager"}
              </button>
            )}

            {(isPackstelle || isEgAdmin || isPackbetrieb || isOrganizer) && (
              <button
                type="button"
                onClick={() => setTab("packstation")}
                className={tab === "packstation" ? "active" : ""}
              >
                📦 Packstelle
              </button>
            )}

            {/* Statistik/Planung - nicht für Packstelle und nicht für Packbetrieb */}
             {!isPackbetrieb && !isPackstelle && (
              <button
                type="button"
                onClick={() => setTab("stats")}
                className={tab === "stats" ? "active" : ""}
              >
                📊 Statistik / Planung
              </button>
            )}

            {isPackbetrieb && (
              <>
              <button
                type="button"
                onClick={() => setTab("verkauf")}
                className={tab === "verkauf" ? "active" : ""}
              >
                  💰 Verkauf
              </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("lagerInventur");
                    loadPackPlantStock();
                  }}
                  className={tab === "lagerInventur" ? "active" : ""}
                >
                  📦 Lager & Inventur
                </button>
              </>
            )}

            {isPackbetrieb && (
              <button
                type="button"
                onClick={() => {
                  setTab("reklamation");
                  loadReklCustomers();
                  loadPackStations();
                  loadFarmers();
                }}
                className={tab === "reklamation" ? "active" : ""}
              >
                🚨 Reklamation
              </button>
            )}

            {isPackbetrieb && (
              <button
                type="button"
                onClick={() => {
                  setTab("statistik");
                  loadPackbetriebStatistics();
                }}
                className={tab === "statistik" ? "active" : ""}
              >
                📊 Statistik
              </button>
            )}

            {isEgAdmin && (
              <button
                type="button"
                onClick={() => {
                  setTab("abrechnungen");
                  loadFarmers();
                }}
                className={tab === "abrechnungen" ? "active" : ""}
              >
                💵 Abrechnungen
              </button>
            )}

            {isEgAdmin && (
              <button
                type="button"
                onClick={() => {
                  setTab("kalkulationen");
                  if (packPlants.length === 0) {
                    loadPackPlants();
                  }
                  if (products.length === 0) {
                    loadProducts();
                  }
                  if (customers.length === 0) {
                    loadCustomers();
                  }
                  loadManualCosts();
                }}
                className={tab === "kalkulationen" ? "active" : ""}
              >
                🧮 Kalkulationen
              </button>
            )}
          </nav>

          <main className="app-main">
            {tab === "stamm" && (
              <StammdatenTab
                canEditStammdaten={canEditStammdaten}
                isEgAdmin={isEgAdmin}
                stammdatenSubTab={stammdatenSubTab}
                setStammdatenSubTab={setStammdatenSubTab}
                stammdatenFunction={stammdatenFunction}
                setStammdatenFunction={setStammdatenFunction}
                userName={userName}
                setUserName={setUserName}
                userEmail={userEmail}
                setUserEmail={setUserEmail}
                userPassword={userPassword}
                setUserPassword={setUserPassword}
                userRole={userRole}
                setUserRole={setUserRole}
                userCreateError={userCreateError}
                handleCreateUser={handleCreateUser}
                allUsers={allUsers}
                selectedUserId={selectedUserId}
                setSelectedUserId={setSelectedUserId}
                newUserPassword={newUserPassword}
                setNewUserPassword={setNewUserPassword}
                passwordResetError={passwordResetError}
                handleResetUserPassword={handleResetUserPassword}
                selectedFarmerId={selectedFarmerId}
                setSelectedFarmerId={setSelectedFarmerId}
                newFarmerPassword={newFarmerPassword}
                setNewFarmerPassword={setNewFarmerPassword}
                farmerPasswordResetError={farmerPasswordResetError}
                handleResetFarmerPassword={handleResetFarmerPassword}
                planFarmerIdInput={planFarmerIdInput}
                setPlanFarmerIdInput={setPlanFarmerIdInput}
                planCookingTypeInput={planCookingTypeInput}
                setPlanCookingTypeInput={setPlanCookingTypeInput}
                planMonthInput={planMonthInput}
                setPlanMonthInput={setPlanMonthInput}
                planWeekInput={planWeekInput}
                setPlanWeekInput={setPlanWeekInput}
                planQuantityKgInput={planQuantityKgInput}
                setPlanQuantityKgInput={setPlanQuantityKgInput}
                handleImportPlansFromCsv={handleImportPlansFromCsv}
                handleSavePlanmenge={handleSavePlanmenge}
                loadDeliveryPlans={loadDeliveryPlansWrapper}
                farmers={farmers}
                farmerName={farmerName}
                setFarmerName={setFarmerName}
                farmerStreet={farmerStreet}
                setFarmerStreet={setFarmerStreet}
                farmerPostalCode={farmerPostalCode}
                setFarmerPostalCode={setFarmerPostalCode}
                farmerCity={farmerCity}
                setFarmerCity={setFarmerCity}
                farmerGGN={farmerGGN}
                setFarmerGGN={setFarmerGGN}
                farmerIsFlatRate={farmerIsFlatRate}
                setFarmerIsFlatRate={setFarmerIsFlatRate}
                farmerFlatRateNote={farmerFlatRateNote}
                setFarmerFlatRateNote={setFarmerFlatRateNote}
                farmerLoginEmail={farmerLoginEmail}
                setFarmerLoginEmail={setFarmerLoginEmail}
                farmerLoginPassword={farmerLoginPassword}
                setFarmerLoginPassword={setFarmerLoginPassword}
                editingFarmerId={editingFarmerId}
                setEditingFarmerId={setEditingFarmerId}
                handleCreateFarmer={handleCreateFarmer}
                safeProducts={safeProducts}
                productName={productName}
                setProductName={setProductName}
                productCookingType={productCookingType}
                setProductCookingType={setProductCookingType}
                productPackagingType={productPackagingType}
                setProductPackagingType={setProductPackagingType}
                productUnitKg={productUnitKg}
                setProductUnitKg={setProductUnitKg}
                productUnitsPerColli={productUnitsPerColli}
                setProductUnitsPerColli={setProductUnitsPerColli}
                productCollisPerPallet={productCollisPerPallet}
                setProductCollisPerPallet={setProductCollisPerPallet}
                productNumber={productNumber}
                setProductNumber={setProductNumber}
                productTaxRateId={productTaxRateId}
                setProductTaxRateId={setProductTaxRateId}
                editingProductId={editingProductId}
                setEditingProductId={setEditingProductId}
                handleCreateProduct={handleCreateProduct}
                safeVarieties={safeVarieties}
                varietyName={varietyName}
                setVarietyName={setVarietyName}
                varietyCookingType={varietyCookingType}
                setVarietyCookingType={setVarietyCookingType}
                varietyQuality={varietyQuality}
                setVarietyQuality={setVarietyQuality}
                editingVarietyId={editingVarietyId}
                setEditingVarietyId={setEditingVarietyId}
                loadVarieties={loadVarieties}
                customers={customers}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerRegion={customerRegion}
                setCustomerRegion={setCustomerRegion}
                editingCustomerId={editingCustomerId}
                setEditingCustomerId={setEditingCustomerId}
                handleCreateCustomer={handleCreateCustomer}
                prices={prices}
                priceCustomerId={priceCustomerId}
                setPriceCustomerId={setPriceCustomerId}
                priceProductId={priceProductId}
                setPriceProductId={setPriceProductId}
                pricePerUnit={pricePerUnit}
                setPricePerUnit={setPricePerUnit}
                pricePackingCostPerUnit={pricePackingCostPerUnit}
                setPricePackingCostPerUnit={setPricePackingCostPerUnit}
                priceValidFrom={priceValidFrom}
                setPriceValidFrom={setPriceValidFrom}
                editingPriceId={editingPriceId}
                setEditingPriceId={setEditingPriceId}
                handleCreatePrice={handleCreatePrice}
                loadPrices={loadPricesService}
                qualityPrices={qualityPrices}
                qpQuality={qpQuality}
                setQpQuality={setQpQuality}
                qpValidFrom={qpValidFrom}
                setQpValidFrom={setQpValidFrom}
                qpValidTo={qpValidTo}
                setQpValidTo={setQpValidTo}
                qpPricePerKg={qpPricePerKg}
                setQpPricePerKg={setQpPricePerKg}
                qpTaxRateId={qpTaxRateId}
                setQpTaxRateId={setQpTaxRateId}
                editingQualityPriceId={editingQualityPriceId}
                setEditingQualityPriceId={setEditingQualityPriceId}
                loadQualityPrices={loadQualityPrices}
                taxRates={taxRates}
                showMessage={showMessage}
                setConfirmAction={setConfirmAction}
              />
            )}
            {tab === "farmerStock" && (
              <FarmerStockTab
                isFarmer={isFarmer}
                isPackbetrieb={isPackbetrieb}
                isEgAdmin={isEgAdmin}
                isOrganizer={isOrganizer}
                currentUser={currentUser}
                availableVarietiesForSale={availableVarietiesForSale}
                isAdminOrOrg={isAdminOrOrg}
                farmerStocks={farmerStocks}
                safeVarieties={safeVarieties}
                farmers={farmers}
                farmerPackStats={farmerPackStats}
                stockFilterFarmerId={stockFilterFarmerId}
                setStockFilterFarmerId={setStockFilterFarmerId}
                stockCookingFilter={stockCookingFilter}
                setStockCookingFilter={setStockCookingFilter}
                stockQualityFilter={stockQualityFilter}
                setStockQualityFilter={setStockQualityFilter}
                stockProductFilterId={stockProductFilterId}
                setStockProductFilterId={setStockProductFilterId}
                egVarietyId={egVarietyId}
                setEgVarietyId={setEgVarietyId}
                egQuantityKg={egQuantityKg}
                setEgQuantityKg={setEgQuantityKg}
                egFieldName={egFieldName}
                setEgFieldName={setEgFieldName}
                egHarvestDate={egHarvestDate}
                setEgHarvestDate={setEgHarvestDate}
                egSortierGroesse={egSortierGroesse}
                setEgSortierGroesse={setEgSortierGroesse}
                egQuality={egQuality}
                setEgQuality={setEgQuality}
                pbFarmerId={pbFarmerId}
                setPbFarmerId={setPbFarmerId}
                pbVarietyId={pbVarietyId}
                setPbVarietyId={setPbVarietyId}
                pbQuantityKg={pbQuantityKg}
                setPbQuantityKg={setPbQuantityKg}
                pbFieldName={pbFieldName}
                setPbFieldName={setPbFieldName}
                pbHarvestDate={pbHarvestDate}
                setPbHarvestDate={setPbHarvestDate}
                pbSortierGroesse={pbSortierGroesse}
                setPbSortierGroesse={setPbSortierGroesse}
                pbQuality={pbQuality}
                setPbQuality={setPbQuality}
                invVarietyId={invVarietyId}
                setInvVarietyId={setInvVarietyId}
                invQuantityKg={invQuantityKg}
                setInvQuantityKg={setInvQuantityKg}
                statsMaxDeliveries={statsMaxDeliveries}
                setStatsMaxDeliveries={setStatsMaxDeliveries}
                handleSale={handleSale}
                handlePackbetriebSale={handlePackbetriebSale}
                handleInventory={handleInventory}
                loadFarmerPackStats={loadFarmerPackStats}
                loadFarmerStocksWrapper={loadFarmerStocksWrapper}
                showMessage={showMessage}
                setConfirmAction={setConfirmAction}
              />
            )}
            {tab === "packstation" && (
              <PackstationTab
                isPackstelle={isPackstelle}
                isPackbetrieb={isPackbetrieb}
                isOrganizer={isOrganizer}
                packStationStocks={packStationStocks}
                safeProducts={safeProducts}
                safeFarmers={safeFarmers}
                safeVarieties={safeVarieties}
                farmers={farmers}
                recentPackagingRuns={recentPackagingRuns}
                recentWasteMovements={recentWasteMovements}
                recentInventoryZeroMovements={recentInventoryZeroMovements}
                packCarouselIndex={packCarouselIndex}
                setPackCarouselIndex={setPackCarouselIndex}
                packSelection={packSelection}
                setPackSelection={setPackSelection}
                packProductId={packProductId}
                setPackProductId={setPackProductId}
                packColli={packColli}
                setPackColli={setPackColli}
                packUnits={packUnits}
                setPackUnits={setPackUnits}
                wasteSelection={wasteSelection}
                setWasteSelection={setWasteSelection}
                wasteKg={wasteKg}
                setWasteKg={setWasteKg}
                packZeroSelection={packZeroSelection}
                setPackZeroSelection={setPackZeroSelection}
                packZeroComment={packZeroComment}
                setPackZeroComment={setPackZeroComment}
                packLagerFilterFarmer={packLagerFilterFarmer}
                setPackLagerFilterFarmer={setPackLagerFilterFarmer}
                packLagerFilterCooking={packLagerFilterCooking}
                setPackLagerFilterCooking={setPackLagerFilterCooking}
                packLagerFilterVariety={packLagerFilterVariety}
                setPackLagerFilterVariety={setPackLagerFilterVariety}
                packLagerFilterQuality={packLagerFilterQuality}
                setPackLagerFilterQuality={setPackLagerFilterQuality}
                packLagerFilterUnder3000={packLagerFilterUnder3000}
                setPackLagerFilterUnder3000={setPackLagerFilterUnder3000}
                editingPackagingRunId={editingPackagingRunId}
                setEditingPackagingRunId={setEditingPackagingRunId}
                editPackagingRunDate={editPackagingRunDate}
                setEditPackagingRunDate={setEditPackagingRunDate}
                editPackagingRunProductId={editPackagingRunProductId}
                setEditPackagingRunProductId={setEditPackagingRunProductId}
                editPackagingRunFarmerId={editPackagingRunFarmerId}
                setEditPackagingRunFarmerId={setEditPackagingRunFarmerId}
                editPackagingRunVarietyId={editPackagingRunVarietyId}
                setEditPackagingRunVarietyId={setEditPackagingRunVarietyId}
                editPackagingRunVarietiesForFarmer={editPackagingRunVarietiesForFarmer}
                setEditPackagingRunVarietiesForFarmer={setEditPackagingRunVarietiesForFarmer}
                editPackagingRunColli={editPackagingRunColli}
                setEditPackagingRunColli={setEditPackagingRunColli}
                editPackagingRunWasteKg={editPackagingRunWasteKg}
                setEditPackagingRunWasteKg={setEditPackagingRunWasteKg}
                editPackagingRunRawInputKg={editPackagingRunRawInputKg}
                setEditPackagingRunRawInputKg={setEditPackagingRunRawInputKg}
                editPackagingRunFinishedKg={editPackagingRunFinishedKg}
                setEditPackagingRunFinishedKg={setEditPackagingRunFinishedKg}
                editingWasteId={editingWasteId}
                setEditingWasteId={setEditingWasteId}
                editWasteKg={editWasteKg}
                setEditWasteKg={setEditWasteKg}
                editWasteComment={editWasteComment}
                setEditWasteComment={setEditWasteComment}
                editingInventoryZeroId={editingInventoryZeroId}
                setEditingInventoryZeroId={setEditingInventoryZeroId}
                editInventoryZeroStockKg={editInventoryZeroStockKg}
                setEditInventoryZeroStockKg={setEditInventoryZeroStockKg}
                editInventoryZeroComment={editInventoryZeroComment}
                setEditInventoryZeroComment={setEditInventoryZeroComment}
                handlePackstationPacking={handlePackstationPacking}
                handlePackstationWaste={handlePackstationWaste}
                handlePackstationInventoryZero={handlePackstationInventoryZero}
                handleUpdatePackagingRun={handleUpdatePackagingRun}
                handleUpdateWaste={handleUpdateWaste}
                handleUpdateInventoryZero={handleUpdateInventoryZero}
                loadPackStationStock={loadPackStationStockWrapper}
              />
            )}
            {tab === "stats" &&
              (isOrganizer || isEgAdmin
                ? <RenderOrganizerStatsTab
                    isOrganizer={isOrganizer}
                    isEgAdmin={isEgAdmin}
                    deliveryWeeksBack={deliveryWeeksBack}
                    setDeliveryWeeksBack={setDeliveryWeeksBack}
                    planWeeksForward={planWeeksForward}
                    setPlanWeeksForward={setPlanWeeksForward}
                    planFarmerId={planFarmerId}
                    setPlanFarmerId={setPlanFarmerId}
                    deliveryPlans={deliveryPlans}
                    organizerDeliveries={organizerDeliveries}
                    statsCookingFilter={statsCookingFilter}
                    setStatsCookingFilter={setStatsCookingFilter}
                    planYear={planYear}
                    setPlanYear={setPlanYear}
                    farmers={farmers}
                    loadOrganizerDeliveries={loadOrganizerDeliveries}
                    loadDeliveryPlans={loadDeliveryPlansWrapper}
                    showMessage={showMessage}
                  />
                : <FarmerStatsPlanningTab
                    isFarmer={isFarmer}
                    currentUser={currentUser}
                    farmers={farmers}
                    organizerDeliveries={organizerDeliveries}
                    deliveryPlans={deliveryPlans}
                    deliveryWeeksBack={deliveryWeeksBack}
                    setDeliveryWeeksBack={setDeliveryWeeksBack}
                    planWeeksForward={planWeeksForward}
                    setPlanWeeksForward={setPlanWeeksForward}
                    statsCookingFilter={statsCookingFilter}
                    setStatsCookingFilter={setStatsCookingFilter}
                    planYear={planYear}
                    farmerPackStats={farmerPackStats}
                    statsMaxDeliveries={statsMaxDeliveries}
                    setStatsMaxDeliveries={setStatsMaxDeliveries}
                    loadFarmerPackStats={loadFarmerPackStats}
                    loadOrganizerDeliveries={loadOrganizerDeliveries}
                    loadDeliveryPlans={loadDeliveryPlansWrapper}
                    showMessage={showMessage}
                  />)}
            {tab === "verkauf" && (
              <VerkaufTab
                isPackbetrieb={isPackbetrieb}
                saleCustomerId={saleCustomerId}
                setSaleCustomerId={setSaleCustomerId}
                saleProductId={saleProductId}
                setSaleProductId={setSaleProductId}
                saleQuantityUnits={saleQuantityUnits}
                setSaleQuantityUnits={setSaleQuantityUnits}
                saleDate={saleDate}
                setSaleDate={setSaleDate}
                salePriceOverride={salePriceOverride}
                setSalePriceOverride={setSalePriceOverride}
                handleProductSale={handleProductSale}
                customers={customers}
                safeProducts={safeProducts}
                packPlantStocks={packPlantStocks}
                prices={prices}
                priceCustomerId={priceCustomerId}
                setPriceCustomerId={setPriceCustomerId}
                priceProductId={priceProductId}
                setPriceProductId={setPriceProductId}
                pricePerUnit={pricePerUnit}
                setPricePerUnit={setPricePerUnit}
                pricePackingCostPerUnit={pricePackingCostPerUnit}
                setPricePackingCostPerUnit={setPricePackingCostPerUnit}
                priceValidFrom={priceValidFrom}
                setPriceValidFrom={setPriceValidFrom}
                editingPriceId={editingPriceId}
                setEditingPriceId={setEditingPriceId}
                handleCreatePrice={handleCreatePrice}
                loadPrices={loadPrices}
              />
            )}
            {tab === "lagerInventur" && (
              <LagerInventurTab
                isPackbetrieb={isPackbetrieb}
                packPlantStocks={packPlantStocks}
                safeProducts={safeProducts}
                invProductId={invProductId}
                setInvProductId={setInvProductId}
                invQuantityUnits={invQuantityUnits}
                setInvQuantityUnits={setInvQuantityUnits}
                invPricePerUnit={invPricePerUnit}
                setInvPricePerUnit={setInvPricePerUnit}
                handleProductInventory={handleProductInventory}
              />
            )}
            {tab === "reklamation" && (
              <ReklamationTab
                isPackbetrieb={isPackbetrieb}
                reklCustomers={reklCustomers}
                reklProducts={reklProducts}
                reklSales={reklSales}
                reklSelectedCustomerId={reklSelectedCustomerId}
                setReklSelectedCustomerId={setReklSelectedCustomerId}
                reklSelectedProductId={reklSelectedProductId}
                setReklSelectedProductId={setReklSelectedProductId}
                reklSelectedSaleId={reklSelectedSaleId}
                setReklSelectedSaleId={setReklSelectedSaleId}
                reklSelectedSale={reklSelectedSale}
                setReklSelectedSale={setReklSelectedSale}
                reklRelevantFarmers={reklRelevantFarmers}
                reklFarmerId={reklFarmerId}
                setReklFarmerId={setReklFarmerId}
                reklType={reklType}
                setReklType={setReklType}
                reklQuantity={reklQuantity}
                setReklQuantity={setReklQuantity}
                reklPercent={reklPercent}
                setReklPercent={setReklPercent}
                reklDate={reklDate}
                setReklDate={setReklDate}
                reklComment={reklComment}
                setReklComment={setReklComment}
                reklLoading={reklLoading}
                handleReklamationSubmit={handleReklamationSubmit}
                safeProducts={safeProducts}
                setReklProducts={setReklProducts}
                setReklSales={setReklSales}
                setReklRelevantFarmers={setReklRelevantFarmers}
                loadReklProducts={loadReklProducts}
                loadReklSales={loadReklSales}
                loadReklRelevantFarmers={loadReklRelevantFarmers}
              />
            )}
            {tab === "statistik" && (
              <StatistikTab
                isPackbetrieb={isPackbetrieb}
                statisticsData={statisticsData}
                statFilterDateFrom={statFilterDateFrom}
                setStatFilterDateFrom={setStatFilterDateFrom}
                statFilterDateTo={statFilterDateTo}
                setStatFilterDateTo={setStatFilterDateTo}
                statFilterProductId={statFilterProductId}
                setStatFilterProductId={setStatFilterProductId}
                statFilterCustomerId={statFilterCustomerId}
                setStatFilterCustomerId={setStatFilterCustomerId}
                statFilterType={statFilterType}
                setStatFilterType={setStatFilterType}
                statLoading={statLoading}
                safeProducts={safeProducts}
                customers={customers}
                editingSaleId={editingSaleId}
                setEditingSaleId={setEditingSaleId}
                editSaleDate={editSaleDate}
                setEditSaleDate={setEditSaleDate}
                editSaleCustomerId={editSaleCustomerId}
                setEditSaleCustomerId={setEditSaleCustomerId}
                editSaleProductId={editSaleProductId}
                setEditSaleProductId={setEditSaleProductId}
                editSaleColli={editSaleColli}
                setEditSaleColli={setEditSaleColli}
                editSalePricePerColli={editSalePricePerColli}
                setEditSalePricePerColli={setEditSalePricePerColli}
                editSaleComment={editSaleComment}
                setEditSaleComment={setEditSaleComment}
                editingComplaintId={editingComplaintId}
                setEditingComplaintId={setEditingComplaintId}
                editComplaintType={editComplaintType}
                setEditComplaintType={setEditComplaintType}
                editComplaintColli={editComplaintColli}
                setEditComplaintColli={setEditComplaintColli}
                editComplaintPercent={editComplaintPercent}
                setEditComplaintPercent={setEditComplaintPercent}
                editComplaintComment={editComplaintComment}
                setEditComplaintComment={setEditComplaintComment}
                editingInventoryId={editingInventoryId}
                setEditingInventoryId={setEditingInventoryId}
                editInventoryColli={editInventoryColli}
                setEditInventoryColli={setEditInventoryColli}
                editInventoryPricePerUnit={editInventoryPricePerUnit}
                setEditInventoryPricePerUnit={setEditInventoryPricePerUnit}
                editInventoryComment={editInventoryComment}
                setEditInventoryComment={setEditInventoryComment}
                handleUpdateSale={handleUpdateSale}
                handleUpdateComplaint={handleUpdateComplaint}
                handleUpdateInventory={handleUpdateInventory}
                loadPackbetriebStatistics={loadPackbetriebStatistics}
                loadPackPlantStock={loadPackPlantStock}
                showMessage={showMessage}
                setConfirmAction={setConfirmAction}
              />
            )}
            {tab === "abrechnungen" && (
              <AbrechnungenTab
                isEgAdmin={isEgAdmin}
                currentUser={currentUser}
                safeFarmers={safeFarmers}
                packPlants={packPlants}
                abrechnungSubTab={abrechnungSubTab}
                setAbrechnungSubTab={setAbrechnungSubTab}
                abrFarmerId={abrFarmerId}
                setAbrFarmerId={setAbrFarmerId}
                abrDateFrom={abrDateFrom}
                setAbrDateFrom={setAbrDateFrom}
                abrDateTo={abrDateTo}
                setAbrDateTo={setAbrDateTo}
                abrLoading={abrLoading}
                setAbrLoading={setAbrLoading}
                abrResult={abrResult}
                setAbrResult={setAbrResult}
                ppPackPlantId={ppPackPlantId}
                setPpPackPlantId={setPpPackPlantId}
                ppDateFrom={ppDateFrom}
                setPpDateFrom={setPpDateFrom}
                ppDateTo={ppDateTo}
                setPpDateTo={setPpDateTo}
                ppLoadingInvoice={ppLoadingInvoice}
                setPpLoadingInvoice={setPpLoadingInvoice}
                ppLoadingCredit={ppLoadingCredit}
                setPpLoadingCredit={setPpLoadingCredit}
                ppInvoiceResult={ppInvoiceResult}
                setPpInvoiceResult={setPpInvoiceResult}
                ppCreditResult={ppCreditResult}
                setPpCreditResult={setPpCreditResult}
                loadPackPlants={loadPackPlants}
                showMessage={showMessage}
                setConfirmAction={setConfirmAction}
              />
            )}
            {tab === "kalkulationen" && (
              <KalkulationenTab
                isEgAdmin={isEgAdmin}
                pnlData={pnlData}
                pnlLoading={pnlLoading}
                pnlDateFrom={pnlDateFrom}
                setPnlDateFrom={setPnlDateFrom}
                pnlDateTo={pnlDateTo}
                setPnlDateTo={setPnlDateTo}
                pnlYear={pnlYear}
                setPnlYear={setPnlYear}
                pnlMonth={pnlMonth}
                setPnlMonth={setPnlMonth}
                pnlWeek={pnlWeek}
                setPnlWeek={setPnlWeek}
                pnlPackPlantId={pnlPackPlantId}
                setPnlPackPlantId={setPnlPackPlantId}
                pnlProductId={pnlProductId}
                setPnlProductId={setPnlProductId}
                pnlCustomerId={pnlCustomerId}
                setPnlCustomerId={setPnlCustomerId}
                packPlants={packPlants}
                safeProducts={safeProducts}
                customers={customers}
                manualCosts={manualCosts}
                mcCostType={mcCostType}
                setMcCostType={setMcCostType}
                mcDescription={mcDescription}
                setMcDescription={setMcDescription}
                mcPeriodFrom={mcPeriodFrom}
                setMcPeriodFrom={setMcPeriodFrom}
                mcPeriodTo={mcPeriodTo}
                setMcPeriodTo={setMcPeriodTo}
                mcPackPlantId={mcPackPlantId}
                setMcPackPlantId={setMcPackPlantId}
                mcValueType={mcValueType}
                setMcValueType={setMcValueType}
                mcValue={mcValue}
                setMcValue={setMcValue}
                mcComment={mcComment}
                setMcComment={setMcComment}
                mcEditingId={mcEditingId}
                setMcEditingId={setMcEditingId}
                mcLoading={mcLoading}
                loadPnl={loadPnl}
                loadManualCosts={loadManualCosts}
                saveManualCost={saveManualCost}
                editManualCost={editManualCost}
                deleteManualCost={deleteManualCost}
                showMessage={showMessage}
                setConfirmAction={setConfirmAction}
              />
            )}
          </main>
        </>
      )}

      {confirmAction && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            animation: "fadeIn 0.15s ease-out",
          }}
          onClick={() => confirmAction.cancelLabel && setConfirmAction(null)}
        >
          <div
            style={{
              background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
              color: "#f9fafb",
              padding: "1.5rem",
              borderRadius: "1rem",
              border: "1px solid #334155",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(148, 163, 184, 0.1)",
              maxWidth: "420px",
              width: "90%",
              animation: "slideUp 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
              }}>
                ❓
              </div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>{confirmAction.title}</h3>
            </div>
            <p style={{ 
              fontSize: "0.95rem", 
              color: "#cbd5e1", 
              lineHeight: 1.5,
              margin: "0 0 1.25rem 0",
              paddingLeft: "0.5rem",
            }}>
              {confirmAction.message}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              {confirmAction.cancelLabel && (
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  style={{
                    padding: "0.625rem 1.25rem",
                    borderRadius: "0.5rem",
                    background: "transparent",
                    border: "1px solid #475569",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontWeight: 500,
                    transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#1e293b";
                    e.currentTarget.style.borderColor = "#64748b";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "#475569";
                  }}
                >
                  {confirmAction.cancelLabel}
                </button>
              )}
              <button
                type="button"
                onClick={confirmAction.onConfirm}
                autoFocus
                style={{
                  padding: "0.625rem 1.5rem",
                  borderRadius: "0.5rem",
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                  boxShadow: "0 4px 14px -3px rgba(59, 130, 246, 0.5)",
                  transition: "all 0.15s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px -3px rgba(59, 130, 246, 0.6)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px -3px rgba(59, 130, 246, 0.5)";
                }}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}