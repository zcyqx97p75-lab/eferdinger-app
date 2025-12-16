import React from "react";
import type {
  CookingType,
  VarietyQuality,
  CookingFilter,
  QualityFilter,
  Farmer,
  Variety,
  FarmerStock,
  FarmerPackStat,
  CurrentUser,
  ConfirmAction,
} from "../../types";
import { formatKg, formatPercent, getCookingLabel, openDatePickerOnFocus, openSelectOnFocus } from "../../utils";
import { CalcInput } from "../CalcInput";
import { ActionCard } from "../ActionCard";
import { SummaryRow, calcCookingSums } from "../SummaryRow";
import { API_URL } from "../../services";

interface FarmerStockTabProps {
  // Role flags
  isFarmer: boolean;
  isPackbetrieb: boolean;
  isEgAdmin: boolean;
  isOrganizer: boolean;
  currentUser: CurrentUser | null;
  
  // Computed values
  availableVarietiesForSale: Variety[];
  isAdminOrOrg: boolean;
  
  // Data
  farmerStocks: FarmerStock[];
  safeVarieties: Variety[];
  farmers: Farmer[];
  farmerPackStats: FarmerPackStat[];
  
  // Filters
  stockFilterFarmerId: number | "";
  setStockFilterFarmerId: (value: number | "") => void;
  stockCookingFilter: CookingFilter;
  setStockCookingFilter: (value: CookingFilter) => void;
  stockQualityFilter: QualityFilter;
  setStockQualityFilter: (value: QualityFilter) => void;
  stockProductFilterId: "alle" | number;
  setStockProductFilterId: (value: "alle" | number) => void;
  
  // EG Sale Form (Farmer)
  egVarietyId: number | "";
  setEgVarietyId: (value: number | "") => void;
  egQuantityKg: string;
  setEgQuantityKg: (value: string) => void;
  egFieldName: string;
  setEgFieldName: (value: string) => void;
  egHarvestDate: string;
  setEgHarvestDate: (value: string) => void;
  egSortierGroesse: string;
  setEgSortierGroesse: (value: string) => void;
  egQuality: VarietyQuality | "";
  setEgQuality: (value: VarietyQuality | "") => void;
  
  // Packbetrieb Sale Form
  pbFarmerId: number | "";
  setPbFarmerId: (value: number | "") => void;
  pbVarietyId: number | "";
  setPbVarietyId: (value: number | "") => void;
  pbQuantityKg: string;
  setPbQuantityKg: (value: string) => void;
  pbFieldName: string;
  setPbFieldName: (value: string) => void;
  pbHarvestDate: string;
  setPbHarvestDate: (value: string) => void;
  pbSortierGroesse: string;
  setPbSortierGroesse: (value: string) => void;
  pbQuality: VarietyQuality | "";
  setPbQuality: (value: VarietyQuality | "") => void;
  
  // Inventory Form (Farmer)
  invVarietyId: number | "";
  setInvVarietyId: (value: number | "") => void;
  invQuantityKg: string;
  setInvQuantityKg: (value: string) => void;
  
  // Statistics
  statsMaxDeliveries: string;
  setStatsMaxDeliveries: (value: string) => void;
  
  // Handlers
  handleSale: (
    e: React.FormEvent,
    type: "PRIVATE" | "EG",
    varietyId: number | "",
    qtyInput: string,
    clear: () => void,
    fieldName?: string,
    harvestDate?: string,
    sortierGroesse?: string,
    varietyQuality?: string
  ) => void;
  handlePackbetriebSale: (e: React.FormEvent) => void;
  handleInventory: (e: React.FormEvent) => void;
  loadFarmerPackStats: (farmerId: number) => Promise<void>;
  loadFarmerStocksWrapper: (farmerId?: number) => Promise<void>;
  
  // General
  showMessage: (text: string) => void;
  setConfirmAction: (action: ConfirmAction | null) => void;
}

export function FarmerStockTab(props: FarmerStockTabProps) {
  const {
    isFarmer,
    isPackbetrieb,
    currentUser,
    availableVarietiesForSale,
    isAdminOrOrg,
    farmerStocks,
    safeVarieties,
    farmers,
    farmerPackStats,
    stockFilterFarmerId,
    setStockFilterFarmerId,
    stockCookingFilter,
    setStockCookingFilter,
    stockQualityFilter,
    setStockQualityFilter,
    stockProductFilterId,
    setStockProductFilterId,
    egVarietyId,
    setEgVarietyId,
    egQuantityKg,
    setEgQuantityKg,
    egFieldName,
    setEgFieldName,
    egHarvestDate,
    setEgHarvestDate,
    egSortierGroesse,
    setEgSortierGroesse,
    egQuality,
    setEgQuality,
    pbFarmerId,
    setPbFarmerId,
    pbVarietyId,
    setPbVarietyId,
    pbQuantityKg,
    setPbQuantityKg,
    pbFieldName,
    setPbFieldName,
    pbHarvestDate,
    setPbHarvestDate,
    pbSortierGroesse,
    setPbSortierGroesse,
    pbQuality,
    setPbQuality,
    invVarietyId,
    setInvVarietyId,
    invQuantityKg,
    setInvQuantityKg,
    statsMaxDeliveries,
    setStatsMaxDeliveries,
    handleSale,
    handlePackbetriebSale,
    handleInventory,
    loadFarmerPackStats,
    loadFarmerStocksWrapper,
    showMessage,
    setConfirmAction,
  } = props;

  const effectiveFarmerId =
    isFarmer && currentUser?.farmerId
      ? currentUser.farmerId
      : stockFilterFarmerId || undefined;

  let filtered = farmerStocks;

  // 0) Nur Bestände > 0 anzeigen
  filtered = filtered.filter((s) => Number(s.quantityTons ?? (s as any).quantityKg ?? 0) > 0);

  // 1) Nach Bauer filtern
  if (effectiveFarmerId && typeof effectiveFarmerId === "number") {
    filtered = filtered.filter((s) => s.farmerId === effectiveFarmerId);
  }

  // 2) Nach Kocheigenschaft filtern
  if (stockCookingFilter !== "alle") {
    filtered = filtered.filter(
      (s) =>
        s.variety?.cookingType === stockCookingFilter ||
        (s as any).product?.cookingType === stockCookingFilter
    );
  }

  // 3) Nach Qualität / Sortierung filtern
  if (stockQualityFilter !== "alle") {
    filtered = filtered.filter(
      (s) => s.variety?.quality === stockQualityFilter
    );
  }

  // 4) Nach Sorte filtern (wir benutzen stockProductFilterId als variety-Filter)
  if (
    stockProductFilterId !== "alle" &&
    typeof stockProductFilterId === "number"
  ) {
    filtered = filtered.filter((s) => s.varietyId === stockProductFilterId);
  }

  // 5) Sortierung: Bauer -> Sorte -> Qualität
  const sorted = [...filtered].sort((a, b) => {
    const aFarmer = a.farmer?.name ?? "";
    const bFarmer = b.farmer?.name ?? "";
    if (aFarmer !== bFarmer) {
      return aFarmer.localeCompare(bFarmer, "de");
    }

    const aVar = a.variety?.name ?? "";
    const bVar = b.variety?.name ?? "";
    if (aVar !== bVar) {
      return aVar.localeCompare(bVar, "de");
    }

    const aQual = a.variety?.quality ?? "";
    const bQual = b.variety?.quality ?? "";
    return aQual.localeCompare(bQual, "de");
  });

  // 6) Summen nach Kocheigenschaft aus den gefilterten Zeilen
  const cookingSums = calcCookingSums(sorted);

  return (
    <div className="farmer-stock-grid">
      {/* Verkauf an Eferdinger Landl – NUR für Bauer, steht ganz oben */}
      {isFarmer && (
        <ActionCard
          icon="🧾"
          title="Verkauf an Eferdinger Landl"
          variant="primary"
        >
          <form
            onSubmit={(e) =>
              handleSale(
                e,
                "EG",
                egVarietyId,
                egQuantityKg,
                () => {
                  setEgQuantityKg("");
                  setEgVarietyId("");
                  setEgFieldName("");
                  setEgHarvestDate("");
                  setEgSortierGroesse("");
                  setEgQuality("");
                },
                egFieldName,
                egHarvestDate,
                egSortierGroesse,
                egQuality || undefined
              )
            }
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", boxSizing: "border-box" }}
          >
            <div>
              <label>Sorte</label>
              <select
                value={egVarietyId}
                onChange={(e) =>
                  setEgVarietyId(e.target.value ? Number(e.target.value) : "")
                }
                onFocus={openSelectOnFocus}
              >
                <option value="">– Sorte wählen –</option>
                {availableVarietiesForSale.length === 0 ? (
                  <option value="" disabled>
                    {farmerStocks.length === 0 
                      ? "Keine Sorten verfügbar - Liste wird geladen..." 
                      : "Keine Sorten im Lager vorhanden"}
                  </option>
                ) : (
                  availableVarietiesForSale.map((v) => {
                    const stock = farmerStocks.find((s) => s.varietyId === v.id);
                    const stockKg = stock ? Number(stock.quantityTons) : 0;
                    return (
                  <option key={v.id} value={v.id}>
                        {v.name} ({v.quality}) - {formatKg(stockKg)} kg verfügbar
                  </option>
                    );
                  })
                )}
              </select>
            </div>

            <div>
              <label>Qualität (für Lieferschein/Etikett)</label>
              <select
                value={egQuality}
                onChange={(e) => setEgQuality(e.target.value as VarietyQuality | "")}
                required
                onFocus={openSelectOnFocus}
              >
                <option value="">– Qualität wählen –</option>
                <option value="Q1">1. Qualität</option>
                <option value="Q2">2. Qualität</option>
                <option value="UEBERGROESSE">Übergrößen</option>
              </select>
            </div>

            <div>
              <label>Sortiergröße</label>
              <select
                value={egSortierGroesse}
                onChange={(e) => setEgSortierGroesse(e.target.value)}
                onFocus={openSelectOnFocus}
              >
                <option value="">– Sortiergröße wählen –</option>
                <option value="DRILLINGE">Drillinge</option>
                <option value="SIZE_35_55">35/55</option>
                <option value="SIZE_55_65">55/65</option>
                <option value="SIZE_65_70">65/70</option>
                <option value="UEBERGROESSEN">Übergrößen</option>
              </select>
            </div>

            <div>
              <label>Menge (kg)</label>
              <CalcInput
                value={egQuantityKg}
                onChange={setEgQuantityKg}
                label="Menge (kg)"
                step="0.01"
                required
              />
            </div>

            <div>
              <label>Feld / Schlag (optional, für Rückverfolgbarkeit)</label>
              <input
                type="text"
                value={egFieldName}
                onChange={(e) => setEgFieldName(e.target.value)}
                placeholder="z.B. Schlag 7, Parzelle Nord"
              />
            </div>

            <div>
              <label>Erntedatum (optional)</label>
              <input
                type="date"
                value={egHarvestDate}
                onChange={(e) => setEgHarvestDate(e.target.value)}
                onFocus={openDatePickerOnFocus}
              />
            </div>

            <button type="submit" className="btn-action-primary">
              Verkauf an EZG verbuchen
            </button>
          </form>
        </ActionCard>
      )}

      {/* Lagerübersicht – nur Bauer + Organisator/EZG-Admin */}
      {(isFarmer || isAdminOrOrg) && (
        <ActionCard
          icon="📦"
          title="Bauernlager (in kg, nach Sorte)"
          variant="default"
        >

          {isAdminOrOrg && (
            <>
              {/* Summe nach Kocheigenschaft - oberhalb der Filter */}
        <div
          style={{
                  background: "#111827", 
                  borderRadius: "0.75rem", 
                  padding: "1rem", 
                  marginBottom: "1rem",
                  border: "1px solid #374151",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "0.75rem", color: "#10b981" }}>
                  📊 Gesamtübersicht nach Kocheigenschaft
                </div>
                <div 
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{
                    background: "#1e40af",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>festkochend</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{formatKg(cookingSums.FESTKOCHEND)} kg</div>
                  </div>
                  <div style={{
                    background: "#dc2626",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>vorw. festk.</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{formatKg(cookingSums.VORWIEGEND_FESTKOCHEND)} kg</div>
                  </div>
                  <div style={{
                    background: "#eab308",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>mehlig</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{formatKg(cookingSums.MEHLIG)} kg</div>
                  </div>
                  <div style={{
                    background: "#374151",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    textAlign: "center",
                    border: "2px solid #10b981",
                  }}>
                    <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>GESAMT</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10b981" }}>{formatKg(cookingSums.total)} kg</div>
                  </div>
                </div>
              </div>

            <div className="filter-row">
              {/* Bauer-Filter */}
              <div>
                <label>Bauer: </label>
                <select
                  value={stockFilterFarmerId}
                  onChange={(e) =>
                    setStockFilterFarmerId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  onFocus={openSelectOnFocus}
                >
                  <option value="">alle</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kocheigenschaft */}
              <div>
                <label>Kocheigenschaft: </label>
                <select
                  value={stockCookingFilter}
                  onChange={(e) => {
                    const newCookingFilter = e.target.value === "alle"
                      ? "alle"
                      : (e.target.value as CookingType);
                    setStockCookingFilter(newCookingFilter);
                    // Wenn Sorte ausgewählt ist und nicht zur neuen Kocheigenschaft passt, zurücksetzen
                    if (stockProductFilterId !== "alle" && newCookingFilter !== "alle") {
                      const selectedVariety = safeVarieties.find((v) => v.id === stockProductFilterId);
                      if (selectedVariety && selectedVariety.cookingType !== newCookingFilter) {
                        setStockProductFilterId("alle");
                      }
                    }
                  }}
                  onFocus={openSelectOnFocus}
                >
                  <option value="alle">alle</option>
                  {(() => {
                    // Wenn Sorte ausgewählt ist, nur die entsprechende Kocheigenschaft anzeigen
                    if (stockProductFilterId !== "alle") {
                      const selectedVariety = safeVarieties.find((v) => v.id === stockProductFilterId);
                      if (selectedVariety) {
                        return (
                          <option value={selectedVariety.cookingType}>
                            {getCookingLabel(selectedVariety.cookingType)}
                          </option>
                        );
                      }
                    }
                    // Sonst alle Kocheigenschaften anzeigen
                    return (
                      <>
                        <option value="FESTKOCHEND">festkochend</option>
                        <option value="VORWIEGEND_FESTKOCHEND">vorw. festk.</option>
                        <option value="MEHLIG">mehlig</option>
                      </>
                    );
                  })()}
                </select>
              </div>

              {/* Qualität */}
              <div>
                <label>Qualität / Sortierung: </label>
                <select
                  value={stockQualityFilter}
                  onChange={(e) =>
                    setStockQualityFilter(
                      e.target.value === "alle"
                        ? "alle"
                        : (e.target.value as VarietyQuality)
                    )
                  }
                  onFocus={openSelectOnFocus}
                >
                  <option value="alle">alle</option>
                  <option value="Q1">1. Qualität</option>
                  <option value="Q2">2. Qualität</option>
                  <option value="UEBERGROESSE">Übergrößen</option>
                </select>
              </div>

              {/* Sorte */}
              <div>
                <label>Sorte: </label>
                <select
                  value={stockProductFilterId}
                  onChange={(e) => {
                    const newVarietyId = e.target.value ? Number(e.target.value) : "alle";
                    setStockProductFilterId(newVarietyId);
                    // Wenn Sorte ausgewählt wird, Kocheigenschaft automatisch setzen
                    if (newVarietyId !== "alle") {
                      const selectedVariety = safeVarieties.find((v) => v.id === newVarietyId);
                      if (selectedVariety) {
                        setStockCookingFilter(selectedVariety.cookingType);
                      }
                    } else {
                      // Wenn "alle" ausgewählt wird, Kocheigenschaft auf "alle" setzen
                      setStockCookingFilter("alle");
                    }
                  }}
                  onFocus={openSelectOnFocus}
                >
                  <option value="alle">alle</option>
                  {safeVarieties.length === 0 ? (
                    <option value="" disabled>Keine Sorten verfügbar</option>
                  ) : (
                    (() => {
                      // Wenn Kocheigenschaft ausgewählt ist, nur Sorten mit dieser Kocheigenschaft anzeigen
                      const filteredVarieties = stockCookingFilter !== "alle"
                        ? safeVarieties.filter((v) => v.cookingType === stockCookingFilter)
                        : safeVarieties;
                      
                      return filteredVarieties.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.quality})
                        </option>
                      ));
                    })()
                  )}
                </select>
              </div>
            </div>
            </>
          )}

          {isFarmer && (
            <p style={{ fontSize: "0.9375rem", color: "#cbd5e1", marginBottom: "0.75rem", lineHeight: 1.5 }}>
              Du siehst hier nur deinen eigenen Lagerbestand.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
            {sorted.length === 0 ? (
              <p style={{ fontSize: "0.9375rem", color: "#94a3b8", textAlign: "center", padding: "1rem" }}>
                Keine Lagerdaten vorhanden.
              </p>
            ) : (
              sorted.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: "rgba(51, 65, 85, 0.5)",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    border: "1px solid #475569",
                  }}
                >
                  {/* Hauptdaten - prominent */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "#f8fafc", marginBottom: "0.25rem" }}>
                        {s.variety?.name ?? "–"}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#cbd5e1" }}>
                        {s.variety?.cookingType ? getCookingLabel(s.variety.cookingType as CookingType) : "–"} • {s.variety?.quality ?? "–"}
                      </div>
                      {isAdminOrOrg && s.farmer?.name && (
                        <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                          {s.farmer.name}{s.farmer.farmName ? ` (${s.farmer.farmName})` : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", marginLeft: "1rem" }}>
                      <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Lagerstand</div>
                      <div style={{ 
                        fontSize: "1.5rem", 
                        fontWeight: 700, 
                        color: Number(s.quantityTons) > 0 ? "#10b981" : "#64748b"
                      }}>
                        {formatKg(s.quantityTons)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <SummaryRow label="Summe nach Kocheigenschaft" sums={cookingSums} />
        </ActionCard>
      )}

       {/* Auswertung Packstelle – hier nur für Admin/Organisator.
          Für Bauern liegt die Auswertung im Tab "Statistik / Planung". */}
      {isAdminOrOrg && effectiveFarmerId && (
        <section
          style={{
            border: "1px solid #4b5563",
            padding: "1rem",
            marginTop: "1rem",
          }}
        >
          <h2>Ware in der Packstelle & Auswertung</h2>
          <p style={{ fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
            Für den ausgewählten Bauern: angelieferte Rohware, verpackte Menge,
            Sortierabfall, Inventurverluste und Ausbeute/Verlust in Prozent.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fId =
                typeof effectiveFarmerId === "number"
                  ? effectiveFarmerId
                  : currentUser?.farmerId;

              if (fId) {
                loadFarmerPackStats(fId).catch(console.error);
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
              Für diesen Bauern liegen noch keine Packstellen-Daten vor.
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
        </section>
      )}

            {/* NEU: Packbetrieb – Verkauf im Namen des Bauern */}
      {isPackbetrieb && (
        <section
          style={{
            border: "1px solid #4b5563",
            padding: "1rem",
            marginTop: "1rem",
          }}
        >
          <h2>Verkauf an EZG für Bauern verbuchen</h2>

          <form onSubmit={handlePackbetriebSale}>
            <label>Bauer</label>
            <select
              value={pbFarmerId}
              onChange={(e) => {
                const farmerId = e.target.value ? Number(e.target.value) : "";
                setPbFarmerId(farmerId);
                setPbVarietyId(""); // Sorte zurücksetzen, wenn Bauer geändert wird
                if (farmerId) {
                  // FarmerStocks für diesen Bauer laden, falls noch nicht geladen
                  loadFarmerStocksWrapper().catch(console.error);
                }
              }}
              onFocus={openSelectOnFocus}
            >
              <option value="">– Bauer wählen –</option>
              {(() => {
                // Nur Bauern anzeigen, die tatsächlich Lagerbestand haben
                const farmersWithStock = farmers.filter((f) => {
                  return farmerStocks.some(
                    (s) => s.farmerId === f.id && Number(s.quantityTons) > 0
                  );
                });
                
                if (farmersWithStock.length === 0) {
                  return (
                    <option value="" disabled>
                      Keine Bauern mit Lagerbestand verfügbar
                    </option>
                  );
                }
                
                return farmersWithStock.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ));
              })()}
            </select>

            <label>Sorte / Qualität</label>
            <select
              value={pbVarietyId}
              onChange={(e) =>
                setPbVarietyId(e.target.value ? Number(e.target.value) : "")
              }
              onFocus={openSelectOnFocus}
            >
              <option value="">– Sorte wählen –</option>
              {(() => {
                // Nur Sorten anzeigen, die der ausgewählte Bauer in seinem Lager hat
                if (!pbFarmerId) {
                  return safeVarieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.quality})
                </option>
                  ));
                }
                const availableVarieties = safeVarieties.filter((v) => {
                  const stock = farmerStocks.find(
                    (s) => s.farmerId === pbFarmerId && s.varietyId === v.id && Number(s.quantityTons) > 0
                  );
                  return stock !== undefined;
                });
                if (availableVarieties.length === 0) {
                  return (
                    <option value="" disabled>
                      Keine Sorten mit Bestand verfügbar
                    </option>
                  );
                }
                return availableVarieties.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.quality})
                  </option>
                ));
              })()}
            </select>

            <label>Qualität (für Lieferschein/Etikett)</label>
            <select
              value={pbQuality}
              onChange={(e) => setPbQuality(e.target.value as VarietyQuality | "")}
              required
              onFocus={openSelectOnFocus}
            >
              <option value="">– Qualität wählen –</option>
              <option value="Q1">1. Qualität</option>
              <option value="Q2">2. Qualität</option>
              <option value="UEBERGROESSE">Übergrößen</option>
            </select>

            <label>Sortiergröße</label>
            <select
              value={pbSortierGroesse}
              onChange={(e) => setPbSortierGroesse(e.target.value)}
              onFocus={openSelectOnFocus}
            >
              <option value="">– Sortiergröße wählen –</option>
              <option value="DRILLINGE">Drillinge</option>
              <option value="SIZE_35_55">35/55</option>
              <option value="SIZE_55_65">55/65</option>
              <option value="SIZE_65_70">65/70</option>
              <option value="UEBERGROESSEN">Übergrößen</option>
            </select>

            <label>Menge (kg)</label>
            <CalcInput
              value={pbQuantityKg}
              onChange={setPbQuantityKg}
              label="Menge (kg)"
              step="0.01"
              required
            />

            <label>Feld / Schlag (optional)</label>
            <input
              type="text"
              value={pbFieldName}
              onChange={(e) => setPbFieldName(e.target.value)}
              placeholder="z.B. Schlag 7, Parzelle Nord"
            />

            <label>Erntedatum (optional)</label>
            <input
              type="date"
              value={pbHarvestDate}
              onChange={(e) => setPbHarvestDate(e.target.value)}
              onFocus={openDatePickerOnFocus}
            />

            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Verkauf an EZG verbuchen
            </button>
          </form>
        </section>
      )}


      {/* Lager pflegen – nur für Bauer */}
      {isFarmer && (
        <ActionCard
          icon="📝"
          title="Lager pflegen"
          variant="default"
        >
          {/* Inventur */}
          <h3 style={{ marginTop: 0 }}>Inventur</h3>
          <form onSubmit={handleInventory}>
            <label>Sorte</label>
            <select
              value={invVarietyId}
              onChange={(e) =>
                setInvVarietyId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              onFocus={openSelectOnFocus}
            >
              <option value="">– Sorte wählen –</option>
              {safeVarieties.length === 0 ? (
                <option value="" disabled>Keine Sorten verfügbar - Liste wird geladen...</option>
              ) : (
                safeVarieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.quality}, {v.cookingType.toLowerCase()})
                </option>
                ))
              )}
            </select>

            <label>Neuer Bestand (kg)</label>
            <CalcInput
              value={invQuantityKg}
              onChange={setInvQuantityKg}
              label="Neuer Bestand (kg)"
              step="0.01"
              required
            />

            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Inventur speichern
            </button>
          </form>
        </ActionCard>
      )}
    </div>
  );
}

