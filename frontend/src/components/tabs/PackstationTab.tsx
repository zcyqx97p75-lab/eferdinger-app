import React from "react";
import type {
  CookingType,
  VarietyQuality,
  CookingFilter,
  QualityFilter,
  Farmer,
  Variety,
  Product,
  PackStationStock,
  PackagingRun,
  WasteMovement,
  InventoryZeroMovement,
} from "../../types";
import { formatKg, parseKg, getCookingLabel, openDatePickerOnFocus } from "../../utils";
import { CalcInput } from "../CalcInput";
import { calcCookingSums } from "../SummaryRow";
import { API_URL } from "../../services";

interface PackstationTabProps {
  // Role flags
  isPackstelle: boolean;
  isPackbetrieb: boolean;
  isOrganizer: boolean;

  // Data
  packStationStocks: PackStationStock[];
  safeProducts: Product[];
  safeFarmers: Farmer[];
  safeVarieties: Variety[];
  farmers: Farmer[];
  recentPackagingRuns: PackagingRun[];
  recentWasteMovements: WasteMovement[];
  recentInventoryZeroMovements: InventoryZeroMovement[];

  // State - Carousel
  packCarouselIndex: number;
  setPackCarouselIndex: (index: number) => void;

  // State - Packing form
  packSelection: string;
  setPackSelection: (value: string) => void;
  packProductId: number | "";
  setPackProductId: (value: number | "") => void;
  packColli: string;
  setPackColli: (value: string) => void;
  packUnits: string;
  setPackUnits: (value: string) => void;

  // State - Waste form
  wasteSelection: string;
  setWasteSelection: (value: string) => void;
  wasteKg: string;
  setWasteKg: (value: string) => void;

  // State - Inventory zero form
  packZeroSelection: string;
  setPackZeroSelection: (value: string) => void;
  packZeroComment: string;
  setPackZeroComment: (value: string) => void;

  // State - Filters
  packLagerFilterFarmer: number | "alle";
  setPackLagerFilterFarmer: (value: number | "alle") => void;
  packLagerFilterCooking: CookingFilter;
  setPackLagerFilterCooking: (value: CookingFilter) => void;
  packLagerFilterVariety: number | "alle";
  setPackLagerFilterVariety: (value: number | "alle") => void;
  packLagerFilterQuality: QualityFilter;
  setPackLagerFilterQuality: (value: QualityFilter) => void;
  packLagerFilterUnder3000: boolean;
  setPackLagerFilterUnder3000: (value: boolean) => void;

  // State - Edit Packaging Run
  editingPackagingRunId: number | null;
  setEditingPackagingRunId: (value: number | null) => void;
  editPackagingRunDate: string;
  setEditPackagingRunDate: (value: string) => void;
  editPackagingRunProductId: number | "";
  setEditPackagingRunProductId: (value: number | "") => void;
  editPackagingRunFarmerId: number | "";
  setEditPackagingRunFarmerId: (value: number | "") => void;
  editPackagingRunVarietyId: number | "";
  setEditPackagingRunVarietyId: (value: number | "") => void;
  editPackagingRunVarietiesForFarmer: Variety[];
  setEditPackagingRunVarietiesForFarmer: (value: Variety[]) => void;
  editPackagingRunColli: string;
  setEditPackagingRunColli: (value: string) => void;
  editPackagingRunWasteKg: string;
  setEditPackagingRunWasteKg: (value: string) => void;
  editPackagingRunRawInputKg: string;
  setEditPackagingRunRawInputKg: (value: string) => void;
  editPackagingRunFinishedKg: string;
  setEditPackagingRunFinishedKg: (value: string) => void;

  // State - Edit Waste
  editingWasteId: number | null;
  setEditingWasteId: (value: number | null) => void;
  editWasteKg: string;
  setEditWasteKg: (value: string) => void;
  editWasteComment: string;
  setEditWasteComment: (value: string) => void;

  // State - Edit Inventory Zero
  editingInventoryZeroId: number | null;
  setEditingInventoryZeroId: (value: number | null) => void;
  editInventoryZeroStockKg: string;
  setEditInventoryZeroStockKg: (value: string) => void;
  editInventoryZeroComment: string;
  setEditInventoryZeroComment: (value: string) => void;

  // Handlers
  handlePackstationPacking: (e: React.FormEvent) => void;
  handlePackstationWaste: (e: React.FormEvent) => void;
  handlePackstationInventoryZero: (e: React.FormEvent) => void;
  handleUpdatePackagingRun: (e: React.FormEvent) => Promise<void>;
  handleUpdateWaste: (e: React.FormEvent) => Promise<void>;
  handleUpdateInventoryZero: (e: React.FormEvent) => Promise<void>;

  // Load functions
  loadPackStationStock: () => Promise<void>;
}

export function PackstationTab({
  isPackstelle,
  isPackbetrieb,
  isOrganizer,
  packStationStocks,
  safeProducts,
  safeFarmers,
  safeVarieties,
  farmers,
  recentPackagingRuns,
  recentWasteMovements,
  recentInventoryZeroMovements,
  packCarouselIndex,
  setPackCarouselIndex,
  packSelection,
  setPackSelection,
  packProductId,
  setPackProductId,
  packColli,
  setPackColli,
  packUnits,
  setPackUnits,
  wasteSelection,
  setWasteSelection,
  wasteKg,
  setWasteKg,
  packZeroSelection,
  setPackZeroSelection,
  packZeroComment,
  setPackZeroComment,
  packLagerFilterFarmer,
  setPackLagerFilterFarmer,
  packLagerFilterCooking,
  setPackLagerFilterCooking,
  packLagerFilterVariety,
  setPackLagerFilterVariety,
  packLagerFilterQuality,
  setPackLagerFilterQuality,
  packLagerFilterUnder3000,
  setPackLagerFilterUnder3000,
  editingPackagingRunId,
  setEditingPackagingRunId,
  editPackagingRunDate,
  setEditPackagingRunDate,
  editPackagingRunProductId,
  setEditPackagingRunProductId,
  editPackagingRunFarmerId,
  setEditPackagingRunFarmerId,
  editPackagingRunVarietyId,
  setEditPackagingRunVarietyId,
  editPackagingRunVarietiesForFarmer,
  setEditPackagingRunVarietiesForFarmer,
  editPackagingRunColli,
  setEditPackagingRunColli,
  editPackagingRunWasteKg,
  setEditPackagingRunWasteKg,
  editPackagingRunRawInputKg,
  setEditPackagingRunRawInputKg,
  editPackagingRunFinishedKg,
  setEditPackagingRunFinishedKg,
  editingWasteId,
  setEditingWasteId,
  editWasteKg,
  setEditWasteKg,
  editWasteComment,
  setEditWasteComment,
  editingInventoryZeroId,
  setEditingInventoryZeroId,
  editInventoryZeroStockKg,
  setEditInventoryZeroStockKg,
  editInventoryZeroComment,
  setEditInventoryZeroComment,
  handlePackstationPacking,
  handlePackstationWaste,
  handlePackstationInventoryZero,
  handleUpdatePackagingRun,
  handleUpdateWaste,
  handleUpdateInventoryZero,
  loadPackStationStock,
}: PackstationTabProps) {
  // Sortierung nach Bauer -> Sorte
  const sorted = [...packStationStocks].sort((a, b) => {
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

    return 0;
  });

  const cookingSums = calcCookingSums(sorted);
  // Organisatoren sehen nur "Lager", Packstelle/Packbetrieb sehen alle Tabs
  const tabLabels = (isPackstelle || isPackbetrieb) 
    ? ["Lager", "Verpackung", "Abfall", "Auf 0"]
    : ["Lager"];

  // Aktuelle Auswahl für Verpackung: wir filtern Produkte nach Kocheigenschaft der Sorte
  const selectedPackStock = (() => {
    if (!packSelection) return null;
    const [farmerIdStr, varietyIdStr] = packSelection.split("-");
    const farmerIdNum = Number(farmerIdStr);
    const varietyIdNum = Number(varietyIdStr);
    if (!Number.isFinite(farmerIdNum) || !Number.isFinite(varietyIdNum)) {
      return null;
    }
    return (
      packStationStocks.find(
        (s) => s.farmerId === farmerIdNum && s.varietyId === varietyIdNum
      ) ?? null
    );
  })();

  const selectedCookingTypeForPacking =
    selectedPackStock?.variety?.cookingType ?? null;

  const filteredProductsForPacking =
    selectedCookingTypeForPacking == null
      ? safeProducts
      : safeProducts.filter(
          (p) =>
            (p.cookingType as CookingType | undefined) ===
            selectedCookingTypeForPacking
        );

  const goToSlide = (index: number) => {
    // Organisatoren können nur auf Index 0 (Lager) zugreifen
    if (isOrganizer && index !== 0) {
      return;
    }
    setPackCarouselIndex(index);
  };

  return (
    <div 
      className="packstation-carousel"
      style={{ marginTop: "1rem" }}
    >
      {/* Karussell-Navigation (Punkte + Labels) */}
      <div 
        className="packstation-carousel-nav"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        {tabLabels.map((label, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => goToSlide(idx)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              border: packCarouselIndex === idx ? "2px solid #10b981" : "1px solid #4b5563",
              background: packCarouselIndex === idx ? "#10b981" : "#1f2937",
              color: packCarouselIndex === idx ? "#000" : "#f9fafb",
              fontWeight: packCarouselIndex === idx ? 700 : 400,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Slide 0: Packstellenlager */}
      {packCarouselIndex === 0 && (() => {
        // Eindeutige Werte für Filter-Dropdowns ermitteln
        const uniqueFarmers = Array.from(
          new Map(
            packStationStocks
              .filter((s) => s.farmer)
              .map((s) => [s.farmer!.id, s.farmer!])
          ).values()
        ).sort((a, b) => a.name.localeCompare(b.name, "de"));

        // Nur Sorten mit Lagerstand > 0 für Filter anzeigen
        const uniqueVarieties = Array.from(
          new Map(
            packStationStocks
              .filter((s) => s.variety && Number(s.quantityKg) > 0)
              .map((s) => [s.variety!.id, s.variety!])
          ).values()
        ).sort((a, b) => a.name.localeCompare(b.name, "de"));

        // Nur Kocheigenschaften von Sorten mit Lagerstand > 0 anzeigen
        const uniqueCookingTypes: CookingType[] = Array.from(
          new Set(
            packStationStocks
              .filter((s) => s.variety?.cookingType && Number(s.quantityKg) > 0)
              .map((s) => s.variety!.cookingType)
          )
        );

        // Nur Qualitäten von Sorten mit Lagerstand > 0 anzeigen
        const uniqueQualities: VarietyQuality[] = Array.from(
          new Set(
            packStationStocks
              .filter((s) => s.variety?.quality && Number(s.quantityKg) > 0)
              .map((s) => s.variety!.quality)
          )
        );

        // Gefilterte Bestände
        const filteredStocks = sorted.filter((s) => {
          // Nur Bestände > 0 anzeigen
          if (Number(s.quantityKg) <= 0) {
            return false;
          }
          // Bauer-Filter
          if (packLagerFilterFarmer !== "alle" && s.farmerId !== packLagerFilterFarmer) {
            return false;
          }
          // Kocheigenschaft-Filter
          if (packLagerFilterCooking !== "alle" && s.variety?.cookingType !== packLagerFilterCooking) {
            return false;
          }
          // Sorte-Filter
          if (packLagerFilterVariety !== "alle" && s.varietyId !== packLagerFilterVariety) {
            return false;
          }
          // Qualität-Filter
          if (packLagerFilterQuality !== "alle" && s.variety?.quality !== packLagerFilterQuality) {
            return false;
          }
          // Lagerbestände unter 3000 kg
          if (packLagerFilterUnder3000 && Number(s.quantityKg) >= 3000) {
            return false;
          }
          return true;
        });

        // Summen für gefilterte Bestände
        const filteredCookingSums = calcCookingSums(filteredStocks);

        const getQualityLabel = (q: VarietyQuality) => {
          switch (q) {
            case "Q1":
              return "Q1";
            case "Q2":
              return "Q2";
            case "UEBERGROESSE":
              return "Übergröße";
            default:
              return q;
          }
        };

        // Filter-Reset Funktion
        const resetFilters = () => {
          setPackLagerFilterFarmer("alle");
          setPackLagerFilterCooking("alle");
          setPackLagerFilterVariety("alle");
          setPackLagerFilterQuality("alle");
          setPackLagerFilterUnder3000(false);
        };

        const hasActiveFilter = 
          packLagerFilterFarmer !== "alle" || 
          packLagerFilterCooking !== "alle" || 
          packLagerFilterVariety !== "alle" || 
          packLagerFilterQuality !== "alle" || 
          packLagerFilterUnder3000;

        return (
        <section className="content-card slide-lager">
          <h2 className="slide-title-lager">📦 Packstellenlager</h2>

          {/* Summe nach Kocheigenschaft - immer sichtbar oben */}
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
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
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

          {/* Filter-Bereich */}
          <div 
            style={{ 
              background: "#111827", 
              borderRadius: "0.75rem", 
              padding: "1rem", 
              marginBottom: "1rem",
              border: "1px solid #374151",
            }}
          >
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "0.75rem",
            }}>
              <div style={{ fontWeight: 600, color: "#e2e8f0" }}>
                🔍 Filter
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    style={{
                      padding: "0.4rem 0.75rem",
                      fontSize: "0.9375rem",
                      borderRadius: "0.5rem",
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    ✕ Filter zurücksetzen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => loadPackStationStock().catch(console.error)}
                  style={{ 
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.9375rem",
                    borderRadius: "0.5rem",
                  }}
                >
                  🔄 Neu laden
                </button>
              </div>
            </div>

            <div 
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {/* Bauer-Filter */}
              <div>
                <label style={{ fontSize: "0.875rem", color: "#e2e8f0", display: "block", marginBottom: "0.25rem" }}>
                  Bauer
                </label>
                <select
                  value={packLagerFilterFarmer}
                  onChange={(e) => setPackLagerFilterFarmer(e.target.value === "alle" ? "alle" : Number(e.target.value))}
                  style={{ 
                    width: "100%", 
                    padding: "0.5rem", 
                    fontSize: "0.9rem",
                    borderRadius: "0.375rem",
                    background: "#1f2937",
                    border: "1px solid #374151",
                    color: "#f9fafb",
                  }}
                >
                  <option value="alle">Alle Bauern</option>
                  {uniqueFarmers.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Kocheigenschaft-Filter */}
              <div>
                <label style={{ fontSize: "0.875rem", color: "#e2e8f0", display: "block", marginBottom: "0.25rem" }}>
                  Kocheigenschaft
                </label>
                <select
                  value={packLagerFilterCooking}
                  onChange={(e) => {
                    const newCookingFilter = e.target.value as CookingFilter;
                    setPackLagerFilterCooking(newCookingFilter);
                    // Wenn Sorte ausgewählt ist und nicht zur neuen Kocheigenschaft passt, zurücksetzen
                    if (packLagerFilterVariety !== "alle" && newCookingFilter !== "alle") {
                      const selectedVariety = uniqueVarieties.find((v) => v.id === packLagerFilterVariety);
                      if (selectedVariety && selectedVariety.cookingType !== newCookingFilter) {
                        setPackLagerFilterVariety("alle");
                      }
                    }
                  }}
                  style={{ 
                    width: "100%", 
                    padding: "0.5rem", 
                    fontSize: "0.9rem",
                    borderRadius: "0.375rem",
                    background: "#1f2937",
                    border: "1px solid #374151",
                    color: "#f9fafb",
                  }}
                >
                  <option value="alle">Alle</option>
                  {(() => {
                    // Wenn Sorte ausgewählt ist, nur die entsprechende Kocheigenschaft anzeigen
                    if (packLagerFilterVariety !== "alle") {
                      const selectedVariety = uniqueVarieties.find((v) => v.id === packLagerFilterVariety);
                      if (selectedVariety) {
                        return (
                          <option key={selectedVariety.cookingType} value={selectedVariety.cookingType}>
                            {getCookingLabel(selectedVariety.cookingType)}
                          </option>
                        );
                      }
                    }
                    // Sonst alle Kocheigenschaften anzeigen
                    return uniqueCookingTypes.map((ct) => (
                      <option key={ct} value={ct}>{getCookingLabel(ct)}</option>
                    ));
                  })()}
                </select>
              </div>

              {/* Sorte-Filter */}
              <div>
                <label style={{ fontSize: "0.875rem", color: "#e2e8f0", display: "block", marginBottom: "0.25rem" }}>
                  Sorte
                </label>
                <select
                  value={packLagerFilterVariety}
                  onChange={(e) => {
                    const newVarietyId = e.target.value === "alle" ? "alle" : Number(e.target.value);
                    setPackLagerFilterVariety(newVarietyId);
                    // Wenn Sorte ausgewählt wird, Kocheigenschaft automatisch setzen
                    if (newVarietyId !== "alle") {
                      const selectedVariety = uniqueVarieties.find((v) => v.id === newVarietyId);
                      if (selectedVariety) {
                        setPackLagerFilterCooking(selectedVariety.cookingType);
                      }
                    } else {
                      // Wenn "alle" ausgewählt wird, Kocheigenschaft auf "alle" setzen
                      setPackLagerFilterCooking("alle");
                    }
                  }}
                  style={{ 
                    width: "100%", 
                    padding: "0.5rem", 
                    fontSize: "0.9rem",
                    borderRadius: "0.375rem",
                    background: "#1f2937",
                    border: "1px solid #374151",
                    color: "#f9fafb",
                  }}
                >
                  <option value="alle">Alle Sorten</option>
                  {(() => {
                    // Wenn Kocheigenschaft ausgewählt ist, nur Sorten mit dieser Kocheigenschaft anzeigen
                    const filteredVarieties = packLagerFilterCooking !== "alle"
                      ? uniqueVarieties.filter((v) => v.cookingType === packLagerFilterCooking)
                      : uniqueVarieties;
                    
                    return filteredVarieties.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ));
                  })()}
                </select>
              </div>

              {/* Qualität-Filter */}
              <div>
                <label style={{ fontSize: "0.875rem", color: "#e2e8f0", display: "block", marginBottom: "0.25rem" }}>
                  Qualität
                </label>
                <select
                  value={packLagerFilterQuality}
                  onChange={(e) => setPackLagerFilterQuality(e.target.value as QualityFilter)}
                  style={{ 
                    width: "100%", 
                    padding: "0.5rem", 
                    fontSize: "0.9rem",
                    borderRadius: "0.375rem",
                    background: "#1f2937",
                    border: "1px solid #374151",
                    color: "#f9fafb",
                  }}
                >
                  <option value="alle">Alle</option>
                  {uniqueQualities.map((q) => (
                    <option key={q} value={q}>{getQualityLabel(q)}</option>
                  ))}
                </select>
              </div>

              {/* Unter 3000 kg Checkbox */}
              <div>
                <label style={{ fontSize: "0.875rem", color: "#e2e8f0", display: "block", marginBottom: "0.25rem" }}>
                  Unter 3.000 kg
                </label>
                <div
                  onClick={() => setPackLagerFilterUnder3000(!packLagerFilterUnder3000)}
                  style={{ 
                    width: "100%",
                    padding: "0.5rem",
                    fontSize: "0.9rem",
                    borderRadius: "0.375rem",
                    background: packLagerFilterUnder3000 ? "#065f46" : "#1f2937",
                    border: "1px solid #374151",
                    color: "#f9fafb",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: "2.5rem",
                  }}
                >
                  <span>{packLagerFilterUnder3000 ? "Aktiv" : "Inaktiv"}</span>
                  {packLagerFilterUnder3000 ? (
                    <span style={{ fontSize: "1rem" }}>✓</span>
                  ) : (
                    <span style={{ fontSize: "1rem", opacity: 0.5 }}>✕</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Gefilterte Summen (wenn Filter aktiv) */}
          {hasActiveFilter && (
            <div 
              style={{ 
                background: "#1e293b", 
                borderRadius: "0.5rem", 
                padding: "0.75rem", 
                marginBottom: "1rem",
                border: "1px solid #3b82f6",
              }}
            >
              <div style={{ fontSize: "0.9375rem", color: "#60a5fa", marginBottom: "0.5rem" }}>
                📋 Gefilterte Ergebnisse: {filteredStocks.length} Position(en)
              </div>
              <div 
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "0.5rem",
                }}
              >
                {filteredCookingSums.FESTKOCHEND > 0 && (
                  <div style={{ background: "#065f46", padding: "0.5rem", borderRadius: "0.375rem", textAlign: "center", fontSize: "0.9375rem" }}>
                    <div style={{ opacity: 0.8 }}>festkochend</div>
                    <div style={{ fontWeight: 600 }}>{formatKg(filteredCookingSums.FESTKOCHEND)} kg</div>
                  </div>
                )}
                {filteredCookingSums.VORWIEGEND_FESTKOCHEND > 0 && (
                  <div style={{ background: "#1e40af", padding: "0.5rem", borderRadius: "0.375rem", textAlign: "center", fontSize: "0.9375rem" }}>
                    <div style={{ opacity: 0.8 }}>vorw. festk.</div>
                    <div style={{ fontWeight: 600 }}>{formatKg(filteredCookingSums.VORWIEGEND_FESTKOCHEND)} kg</div>
                  </div>
                )}
                {filteredCookingSums.MEHLIG > 0 && (
                  <div style={{ background: "#92400e", padding: "0.5rem", borderRadius: "0.375rem", textAlign: "center", fontSize: "0.9375rem" }}>
                    <div style={{ opacity: 0.8 }}>mehlig</div>
                    <div style={{ fontWeight: 600 }}>{formatKg(filteredCookingSums.MEHLIG)} kg</div>
                  </div>
                )}
                <div style={{ background: "#374151", padding: "0.5rem", borderRadius: "0.375rem", textAlign: "center", fontSize: "0.9375rem", border: "1px solid #60a5fa" }}>
                  <div style={{ opacity: 0.8 }}>Summe</div>
                  <div style={{ fontWeight: 600, color: "#60a5fa" }}>{formatKg(filteredCookingSums.total)} kg</div>
                </div>
              </div>
            </div>
          )}

          {/* Cards mit gefilterten Beständen */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
            {filteredStocks.length === 0 ? (
              <p style={{ fontSize: "0.9375rem", color: "#94a3b8", textAlign: "center", padding: "1rem" }}>
                {hasActiveFilter ? "Keine Bestände für diese Filterauswahl." : "Keine Bestände vorhanden."}
              </p>
            ) : (
              filteredStocks.map((s) => (
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
                        {getCookingLabel(s.variety?.cookingType as CookingType)} • {getQualityLabel(s.variety?.quality as VarietyQuality)}
                      </div>
                      {s.farmer?.name && (
                        <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                          {s.farmer.name}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", marginLeft: "1rem" }}>
                      <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Lagerstand</div>
                      <div style={{ 
                        fontSize: "1.5rem", 
                        fontWeight: 700, 
                        color: Number(s.quantityKg) > 0 ? "#10b981" : "#64748b"
                    }}>
                        {formatKg(s.quantityKg)}
                        </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        );
      })()}

      {/* Slide 1: Verpackung verbuchen - nur für Packstelle/Packbetrieb */}
      {packCarouselIndex === 1 && (isPackstelle || isPackbetrieb) && (
        <section className="content-card slide-verpackung">
          <h2 className="slide-title-verpackung">📋 Verpackung verbuchen</h2>
          <p style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>
            Rohware → Verpackte Ware
          </p>

          <form onSubmit={handlePackstationPacking}>
            <label>Bauer + Sorte</label>
            <select
              value={packSelection}
              onChange={(e) => {
                setPackSelection(e.target.value);
                setPackProductId("");
              }}
            >
              <option value="">– wählen –</option>
              {packStationStocks.filter((s) => Number(s.quantityKg) > 0).map((s) => {
                const cookingLabel = s.variety?.cookingType ? getCookingLabel(s.variety.cookingType as CookingType) : "";
                return (
                <option
                  key={s.id}
                  value={`${s.farmerId}-${s.varietyId}`}
                >
                  {s.farmer?.name ?? "?"} – {s.variety?.name ?? "?"} {cookingLabel ? `(${cookingLabel})` : ""} ({formatKg(s.quantityKg)} kg)
                </option>
                );
              })}
            </select>

            <label style={{ marginTop: "0.75rem" }}>Produkt</label>
            <select
              value={packProductId}
              onChange={(e) =>
                setPackProductId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              style={{ fontSize: "1.1rem", padding: "0.75rem" }}
            >
              <option value="">– Produkt wählen –</option>
              {filteredProductsForPacking.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unitKg ?? "?"} kg) –{" "}
                  {getCookingLabel(p.cookingType as CookingType)}
                </option>
              ))}
            </select>

            <label style={{ marginTop: "0.75rem" }}>Anzahl Colli</label>
            <CalcInput
              value={packColli}
              onChange={setPackColli}
              label="Anzahl Colli"
              step="1"
              min="0"
            />

            <label style={{ marginTop: "0.75rem" }}>Einzelne Packungen (zusätzlich)</label>
            <CalcInput
              value={packUnits}
              onChange={setPackUnits}
              label="Einzelne Packungen"
              step="1"
              min="0"
            />

            <button 
              type="submit" 
              style={{ 
                marginTop: "1rem",
                padding: "1rem 2rem",
                fontSize: "1.2rem",
                borderRadius: "0.5rem",
                background: "#3b82f6",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              ✓ Verbuchen
            </button>
          </form>

          {/* Letzte Verpackungsbuchungen */}
          {recentPackagingRuns.length > 0 && (
            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "2px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem", color: "#374151" }}>
                Letzte Verpackungsbuchungen
              </h3>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {recentPackagingRuns.map((run) => {
                  const date = new Date(run.date);
                  const dateStr = date.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
                  const timeStr = date.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
                  const product = safeProducts.find((p) => p.id === run.productId);
                  const unitsPerColli = product?.unitsPerColli;
                  const colli = unitsPerColli && unitsPerColli > 0
                    ? Math.floor(run.quantityUnits / unitsPerColli)
                    : null;
                  const restUnits = unitsPerColli && unitsPerColli > 0
                    ? run.quantityUnits % unitsPerColli
                    : run.quantityUnits;
                  const colliDisplay = colli !== null
                    ? `${colli} Colli${restUnits !== 0 ? ` ${restUnits > 0 ? "+" : ""}${restUnits} Einheiten` : ""}`
                    : `${run.quantityUnits} Einheiten`;
                  return (
                    <div
                      key={run.id}
                      style={{
                        padding: "0.75rem",
                        marginBottom: "0.5rem",
                        background: "#f9fafb",
                        borderRadius: "0.375rem",
                        border: "1px solid #e5e7eb",
                        fontSize: "0.875rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.25rem" }}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {run.productNameSnapshot || run.product?.name || "Produkt"} – {run.farmerNameSnapshot || run.farmer?.name || "Bauer"}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <div style={{ color: "#6b7280", fontSize: "0.8125rem" }}>
                            {dateStr} {timeStr}
                          </div>
                          {isPackbetrieb && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("Bearbeiten geklickt für Verpackungsbuchung:", run.id);
                                const runProduct = safeProducts.find((p) => p.id === run.productId);
                                const runUnitsPerColli = runProduct?.unitsPerColli;
                                const runColli = runUnitsPerColli && runUnitsPerColli > 0
                                  ? Math.floor(run.quantityUnits / runUnitsPerColli)
                                  : null;
                                console.log("Setting editingPackagingRunId to:", run.id);
                                console.log("Run data:", { 
                                  farmerId: run.farmerId, 
                                  varietyId: run.varietyId,
                                  productId: run.productId 
                                });
                                setEditingPackagingRunId(run.id);
                                setEditPackagingRunDate(run.date?.substring(0, 10) ?? "");
                                setEditPackagingRunProductId(run.productId);
                                const farmerIdToSet = run.farmerId || "";
                                setEditPackagingRunFarmerId(farmerIdToSet);
                                // Stelle sicher, dass varietyId korrekt gesetzt wird (kann null sein)
                                setEditPackagingRunVarietyId(run.varietyId || "");
                                setEditPackagingRunColli(runColli !== null ? String(runColli) : "");
                                
                                // Lade Sorten für diesen Bauer aus den Bewegungen (optional gefiltert nach Produkt)
                                if (farmerIdToSet && farmerIdToSet !== "") {
                                  const productIdParam = run.productId ? `?productId=${run.productId}` : "";
                                  fetch(`${API_URL}/varieties/by-farmer/${farmerIdToSet}${productIdParam}`)
                                    .then((res) => res.ok ? res.json() : [])
                                    .then((varieties) => {
                                      const loadedVarieties = Array.isArray(varieties) ? varieties : [];
                                      setEditPackagingRunVarietiesForFarmer(loadedVarieties);
                                      console.log("Sorten für Bauer geladen:", loadedVarieties.length, loadedVarieties);
                                      
                                      // Wenn die aktuelle Sorte nicht in der Liste ist, aber eine Sorte gesetzt ist,
                                      // prüfe ob sie zur Kocheigenschaft des Produkts passt
                                      const product = safeProducts.find((p) => p.id === run.productId);
                                      if (product && run.varietyId) {
                                        const currentVariety = loadedVarieties.find((v) => v.id === run.varietyId);
                                        if (!currentVariety || (product.cookingType && currentVariety.cookingType !== product.cookingType)) {
                                          console.warn("Aktuelle Sorte passt nicht zum Produkt oder wurde nicht gefunden");
                                          // Sorte zurücksetzen, wenn sie nicht passt
                                          setEditPackagingRunVarietyId("");
                                        }
                                      }
                                    })
                                    .catch((err) => {
                                      console.error("Fehler beim Laden der Sorten für Bauer:", err);
                                      setEditPackagingRunVarietiesForFarmer([]);
                                    });
                                } else {
                                  setEditPackagingRunVarietiesForFarmer([]);
                                }
                                setEditPackagingRunWasteKg(run.wasteKg ? formatKg(run.wasteKg) : "");
                                setEditPackagingRunRawInputKg(run.rawInputKg ? formatKg(run.rawInputKg) : "");
                                setEditPackagingRunFinishedKg(run.finishedKg ? formatKg(run.finishedKg) : "");
                                // Stelle sicher, dass wir auf Slide 1 sind
                                if (packCarouselIndex !== 1) {
                                  setPackCarouselIndex(1);
                                }
                                setTimeout(() => {
                                  const form = document.getElementById("edit-packaging-run-form");
                                  console.log("Form element:", form);
                                  if (form) {
                                    form.scrollIntoView({ behavior: "smooth", block: "start" });
                                  } else {
                                    console.warn("Formular nicht gefunden!");
                                  }
                                }, 200);
                              }}
                              type="button"
                              style={{
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.75rem",
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "0.25rem",
                                cursor: "pointer",
                              }}
                            >
                              Bearbeiten
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ color: "#4b5563", fontSize: "0.8125rem" }}>
                        Sorte: {run.varietyNameSnapshot || run.variety?.name || "?"} | 
                        Colli: {colliDisplay} | 
                        Rohware: {formatKg(run.rawInputKg)} kg | 
                        Fertigware: {formatKg(run.finishedKg)} kg
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bearbeitungsformular für Verpackungsbuchung */}
          {editingPackagingRunId && isPackbetrieb && (
            <section id="edit-packaging-run-form" className="content-card" style={{ marginTop: "1rem", background: "#fef3c7" }}>
              <h3 style={{ color: "#1e293b", fontWeight: 600 }}>Verpackungsbuchung bearbeiten</h3>
              <form onSubmit={handleUpdatePackagingRun}>
                <label style={{ color: "#1e293b", fontWeight: 600 }}>Datum</label>
                <input
                  type="date"
                  value={editPackagingRunDate}
                  onChange={(e) => setEditPackagingRunDate(e.target.value)}
                  onFocus={openDatePickerOnFocus}
                  required
                />

                <label style={{ marginTop: "0.75rem", color: "#1e293b", fontWeight: 600 }}>Produkt</label>
                <select
                  value={editPackagingRunProductId}
                  onChange={async (e) => {
                    const newProductId = e.target.value ? Number(e.target.value) : "";
                    setEditPackagingRunProductId(newProductId);
                    
                    // Wenn Produkt geändert wird, lade Sorten neu (gefiltert nach Produkt)
                    if (editPackagingRunFarmerId && editPackagingRunFarmerId !== "") {
                      try {
                        const productIdParam = newProductId ? `?productId=${newProductId}` : "";
                        const res = await fetch(`${API_URL}/varieties/by-farmer/${editPackagingRunFarmerId}${productIdParam}`);
                        if (res.ok) {
                          const varieties = await res.json();
                          const loadedVarieties = Array.isArray(varieties) ? varieties : [];
                          setEditPackagingRunVarietiesForFarmer(loadedVarieties);
                          console.log("Sorten für Bauer und Produkt geladen:", loadedVarieties.length);
                          
                          // Prüfe ob die aktuelle Sorte zur neuen Kocheigenschaft passt
                          if (newProductId && editPackagingRunVarietyId) {
                            const product = safeProducts.find((p) => p.id === newProductId);
                            const currentVariety = loadedVarieties.find((v) => v.id === Number(editPackagingRunVarietyId));
                            if (product && (!currentVariety || (product.cookingType && currentVariety.cookingType !== product.cookingType))) {
                              console.warn("Sorte passt nicht zur neuen Kocheigenschaft des Produkts");
                              setEditPackagingRunVarietyId("");
                            }
                          }
                        }
                      } catch (err) {
                        console.error("Fehler beim Neuladen der Sorten:", err);
                      }
                    }
                  }}
                  required
                  style={{ fontSize: "1.1rem", padding: "0.75rem" }}
                >
                  <option value="">– Produkt wählen –</option>
                  {safeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unitKg ?? "?"} kg) – {getCookingLabel(p.cookingType as CookingType)}
                    </option>
                  ))}
                </select>

                <label style={{ marginTop: "0.75rem", color: "#1e293b", fontWeight: 600 }}>Bauer</label>
                <select
                  value={editPackagingRunFarmerId}
                  onChange={async (e) => {
                    const newFarmerId = e.target.value ? Number(e.target.value) : "";
                    const oldFarmerId = editPackagingRunFarmerId;
                    setEditPackagingRunFarmerId(newFarmerId);
                    // Sorte zurücksetzen, wenn Bauer geändert wird
                    if (newFarmerId !== oldFarmerId) {
                      setEditPackagingRunVarietyId("");
                      setEditPackagingRunVarietiesForFarmer([]);
                    }
                    
                    // Lade Sorten für diesen Bauer aus den Bewegungen (optional gefiltert nach Produkt)
                    if (newFarmerId && newFarmerId !== "") {
                      try {
                        const productIdParam = editPackagingRunProductId ? `?productId=${editPackagingRunProductId}` : "";
                        const res = await fetch(`${API_URL}/varieties/by-farmer/${newFarmerId}${productIdParam}`);
                        if (res.ok) {
                          const varieties = await res.json();
                          const loadedVarieties = Array.isArray(varieties) ? varieties : [];
                          setEditPackagingRunVarietiesForFarmer(loadedVarieties);
                          console.log("Sorten für Bauer geladen:", loadedVarieties.length, loadedVarieties);
                          
                          // Wenn ein Produkt ausgewählt ist, prüfe ob die aktuelle Sorte noch passt
                          const product = safeProducts.find((p) => p.id === Number(editPackagingRunProductId));
                          if (product && editPackagingRunVarietyId) {
                            const currentVariety = loadedVarieties.find((v) => v.id === Number(editPackagingRunVarietyId));
                            if (!currentVariety || (product.cookingType && currentVariety.cookingType !== product.cookingType)) {
                              console.warn("Aktuelle Sorte passt nicht zum Produkt oder wurde nicht gefunden");
                              setEditPackagingRunVarietyId("");
                            }
                          }
                        } else {
                          console.error("Fehler beim Laden der Sorten für Bauer");
                          setEditPackagingRunVarietiesForFarmer([]);
                        }
                      } catch (err) {
                        console.error("Fehler beim Laden der Sorten für Bauer:", err);
                        setEditPackagingRunVarietiesForFarmer([]);
                      }
                    } else {
                      setEditPackagingRunVarietiesForFarmer([]);
                    }
                  }}
                  required
                  style={{ fontSize: "1.1rem", padding: "0.75rem" }}
                >
                  <option value="">– Bauer wählen –</option>
                  {safeFarmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>

                <label style={{ marginTop: "0.75rem", color: "#1e293b", fontWeight: 600 }}>Sorte</label>
                {(() => {
                  // Filtere Sorten nach Kocheigenschaft des Produkts
                  const product = safeProducts.find((p) => p.id === Number(editPackagingRunProductId));
                  const productCookingType = product?.cookingType;
                  const filteredVarieties = productCookingType
                    ? editPackagingRunVarietiesForFarmer.filter((v) => v.cookingType === productCookingType)
                    : editPackagingRunVarietiesForFarmer;
                  
                  return (
                    <>
                      <select
                        value={editPackagingRunVarietyId}
                        onChange={(e) => {
                          const newVarietyId = e.target.value ? Number(e.target.value) : "";
                          console.log("Sorte geändert:", newVarietyId);
                          setEditPackagingRunVarietyId(newVarietyId);
                        }}
                        required
                        disabled={!editPackagingRunFarmerId || editPackagingRunFarmerId === "" || !editPackagingRunProductId}
                        style={{ 
                          fontSize: "1.1rem", 
                          padding: "0.75rem",
                          opacity: (editPackagingRunFarmerId && editPackagingRunFarmerId !== "" && editPackagingRunProductId) ? 1 : 0.5,
                          backgroundColor: (editPackagingRunFarmerId && editPackagingRunFarmerId !== "" && editPackagingRunProductId) ? "white" : "#f3f4f6",
                        }}
                      >
                        <option value="">
                          {!editPackagingRunProductId 
                            ? "– Zuerst Produkt wählen –"
                            : !editPackagingRunFarmerId || editPackagingRunFarmerId === ""
                            ? "– Zuerst Bauer wählen –"
                            : "– Sorte wählen –"}
                        </option>
                        {filteredVarieties.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({getCookingLabel(v.cookingType as CookingType)})
                          </option>
                        ))}
                      </select>
                      {editPackagingRunFarmerId && editPackagingRunFarmerId !== "" && editPackagingRunProductId && filteredVarieties.length === 0 && (
                        <div style={{ marginTop: "0.25rem", color: "#dc2626", fontSize: "0.875rem" }}>
                          Keine Sorten für diesen Bauer mit Kocheigenschaft "{getCookingLabel(productCookingType as CookingType)}" gefunden
                        </div>
                      )}
                    </>
                  );
                })()}

                <label style={{ marginTop: "0.75rem", color: "#1e293b", fontWeight: 600 }}>Anzahl Colli</label>
                <CalcInput
                  value={editPackagingRunColli}
                  onChange={(val) => {
                    setEditPackagingRunColli(val);
                    // Automatische Neuberechnung von Fertigware und Rohware bei Colli-Änderung
                    if (editPackagingRunProductId) {
                      const product = safeProducts.find((p) => p.id === Number(editPackagingRunProductId));
                      if (product && product.unitsPerColli && product.unitsPerColli > 0) {
                        const colli = Number(val.replace(",", "."));
                        if (!isNaN(colli) && colli >= 0) {
                          const quantityUnits = colli * product.unitsPerColli;
                          const newFinishedKg = (product.unitKg || 0) * quantityUnits;
                          const wasteKg = editPackagingRunWasteKg ? parseKg(editPackagingRunWasteKg) : 0;
                          const newRawInputKg = newFinishedKg + wasteKg;
                          setEditPackagingRunFinishedKg(formatKg(newFinishedKg));
                          setEditPackagingRunRawInputKg(formatKg(newRawInputKg));
                        }
                      }
                    }
                  }}
                  label="Anzahl Colli"
                  step="1"
                  min="0"
                  required
                />

                <label style={{ marginTop: "0.75rem", color: "#1e293b", fontWeight: 600 }}>Abfall (kg)</label>
                <CalcInput
                  value={editPackagingRunWasteKg}
                  onChange={(val) => {
                    setEditPackagingRunWasteKg(val);
                    // Automatische Neuberechnung von Rohware bei Abfall-Änderung
                    if (editPackagingRunFinishedKg) {
                      const finishedKg = parseKg(editPackagingRunFinishedKg);
                      const wasteKg = val ? parseKg(val) : 0;
                      setEditPackagingRunRawInputKg(formatKg(finishedKg + wasteKg));
                    }
                  }}
                  label="Abfall (kg)"
                  step="0.01"
                  min="0"
                />

                <label style={{ marginTop: "0.75rem", color: "#1e293b", fontWeight: 600 }}>Fertigware (kg)</label>
                <CalcInput
                  value={editPackagingRunFinishedKg}
                  onChange={(val) => {
                    setEditPackagingRunFinishedKg(val);
                    // Automatische Neuberechnung von Rohware bei Fertigware-Änderung
                    const finishedKg = val ? parseKg(val) : 0;
                    const wasteKg = editPackagingRunWasteKg ? parseKg(editPackagingRunWasteKg) : 0;
                    setEditPackagingRunRawInputKg(formatKg(finishedKg + wasteKg));
                  }}
                  label="Fertigware (kg)"
                  step="0.01"
                  min="0"
                />

                <label style={{ marginTop: "0.75rem", color: "#1e293b", fontWeight: 600 }}>Rohware (kg)</label>
                <CalcInput
                  value={editPackagingRunRawInputKg}
                  onChange={setEditPackagingRunRawInputKg}
                  label="Rohware (kg)"
                  step="0.01"
                  min="0"
                />

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button type="submit" style={{ flex: 1, padding: "0.75rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}>
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPackagingRunId(null);
                      setEditPackagingRunDate("");
                      setEditPackagingRunProductId("");
                      setEditPackagingRunFarmerId("");
                      setEditPackagingRunVarietyId("");
                      setEditPackagingRunColli("");
                      setEditPackagingRunWasteKg("");
                      setEditPackagingRunRawInputKg("");
                      setEditPackagingRunFinishedKg("");
                    }}
                    style={{ flex: 1, padding: "0.75rem", background: "#6b7280", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
                  >
                    Abbrechen
                  </button>
                </div>
          </form>
            </section>
          )}
        </section>
      )}

      {/* Slide 2: Abfall verbuchen - nur für Packstelle/Packbetrieb */}
      {packCarouselIndex === 2 && (isPackstelle || isPackbetrieb) && (
        <section className="content-card slide-abfall">
          <h2 className="slide-title-abfall">🗑️ Sortierabfall</h2>
          <form onSubmit={handlePackstationWaste}>
            <label>Bauer + Sorte</label>
            <select
              value={wasteSelection}
              onChange={(e) => setWasteSelection(e.target.value)}
            >
              <option value="">– wählen –</option>
              {packStationStocks.filter((s) => Number(s.quantityKg) > 0).map((s) => {
                const cookingLabel = s.variety?.cookingType ? getCookingLabel(s.variety.cookingType as CookingType) : "";
                return (
                <option
                  key={s.id}
                  value={`${s.farmerId}-${s.varietyId}`}
                >
                  {s.farmer?.name ?? "?"} – {s.variety?.name ?? "?"} {cookingLabel ? `(${cookingLabel})` : ""} ({formatKg(s.quantityKg)} kg)
                </option>
                );
              })}
            </select>

            <label style={{ marginTop: "0.75rem" }}>Abfallmenge (kg)</label>
            <CalcInput
              value={wasteKg}
              onChange={setWasteKg}
              label="Abfallmenge (kg)"
              step="0.01"
              min="0"
              required
            />

            <button 
              type="submit" 
              style={{ 
                marginTop: "1rem",
                padding: "1rem 2rem",
                fontSize: "1.2rem",
                borderRadius: "0.5rem",
                background: "#f59e0b",
                color: "#000",
                fontWeight: 700,
              }}
            >
              🗑️ Abfall verbuchen
            </button>
          </form>

          {/* Letzte Abfallbuchungen */}
          {recentWasteMovements.length > 0 && (
            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "2px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem", color: "#374151" }}>
                Letzte Abfallbuchungen
              </h3>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {recentWasteMovements.map((movement) => {
                  const date = new Date(movement.createdAt);
                  const dateStr = date.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
                  const timeStr = date.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div
                      key={movement.id}
                      style={{
                        padding: "0.75rem",
                        marginBottom: "0.5rem",
                        background: "#f9fafb",
                        borderRadius: "0.375rem",
                        border: "1px solid #e5e7eb",
                        fontSize: "0.875rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.25rem" }}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {movement.farmerNameSnapshot || movement.farmer?.name || "Bauer"} – {movement.varietyNameSnapshot || movement.variety?.name || "Sorte"}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <div style={{ color: "#6b7280", fontSize: "0.8125rem" }}>
                            {dateStr} {timeStr}
                          </div>
                          {isPackbetrieb && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingWasteId(movement.id);
                                setEditWasteKg(formatKg(Math.abs(Number(movement.changeKg))));
                                setEditWasteComment(movement.comment || "");
                                // Stelle sicher, dass wir im richtigen Tab sind
                                if (packCarouselIndex !== 2) {
                                  setPackCarouselIndex(2);
                                }
                                setTimeout(() => {
                                  const form = document.getElementById("edit-waste-form");
                                  if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
                                }, 200);
                              }}
                              style={{
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.75rem",
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "0.25rem",
                                cursor: "pointer",
                              }}
                            >
                              Bearbeiten
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ color: "#4b5563", fontSize: "0.8125rem" }}>
                        Abfallmenge: {formatKg(Math.abs(Number(movement.changeKg)))} kg
                        {movement.comment && ` | ${movement.comment}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bearbeitungsformular für Abfallbuchung */}
          {editingWasteId && isPackbetrieb && (
            <section id="edit-waste-form" className="content-card" style={{ marginTop: "1rem", background: "#fef3c7" }}>
              <h3 style={{ color: "#1e293b", fontWeight: 600 }}>Abfallbuchung bearbeiten</h3>
              <form onSubmit={handleUpdateWaste}>
                <label style={{ color: "#1e293b", fontWeight: 600 }}>Abfallmenge (kg)</label>
                <CalcInput
                  value={editWasteKg}
                  onChange={setEditWasteKg}
                  label="Abfallmenge (kg)"
                  step="0.01"
                  min="0"
                  required
                />

                <label style={{ marginTop: "0.75rem", color: "#1e293b", fontWeight: 600 }}>Bemerkung (optional)</label>
                <input
                  type="text"
                  value={editWasteComment}
                  onChange={(e) => setEditWasteComment(e.target.value)}
                  placeholder="z.B. Sortierabfall"
                />

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button type="submit" style={{ flex: 1, padding: "0.75rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}>
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingWasteId(null);
                      setEditWasteKg("");
                      setEditWasteComment("");
                    }}
                    style={{ flex: 1, padding: "0.75rem", background: "#6b7280", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
                  >
                    Abbrechen
                  </button>
                </div>
          </form>
            </section>
          )}
        </section>
      )}

      {/* Slide 3: Auf 0 setzen - nur für Packstelle/Packbetrieb */}
      {packCarouselIndex === 3 && (isPackstelle || isPackbetrieb) && (
        <section className="content-card warning-card">
          <h2 className="warning-title">⚠️ Lager auf 0 setzen</h2>
          <p className="warning-text">
            Nur wenn eine Sorte vollständig abgearbeitet ist!
          </p>

          <form onSubmit={handlePackstationInventoryZero}>
            <label>Bauer + Sorte</label>
            <select
              value={packZeroSelection}
              onChange={(e) => setPackZeroSelection(e.target.value)}
            >
              <option value="">– wählen –</option>
              {packStationStocks.filter((s) => Number(s.quantityKg) > 0).map((s) => {
                const cookingLabel = s.variety?.cookingType ? getCookingLabel(s.variety.cookingType as CookingType) : "";
                const stockKg = s.quantityKg ?? s.quantityTons ?? 0;
                return (
                <option
                  key={s.id}
                  value={`${s.farmerId}-${s.varietyId}`}
                >
                  {s.farmer?.name ?? "?"} – {s.variety?.name ?? "?"} {cookingLabel ? `(${cookingLabel})` : ""} – Lager: {formatKg(stockKg)} kg
                </option>
                );
              })}
            </select>

            <label>Bemerkung (optional)</label>
            <input
              type="text"
              value={packZeroComment}
              onChange={(e) => setPackZeroComment(e.target.value)}
              placeholder="z.B. Sorte abgearbeitet"
            />

            <button type="submit" className="btn-danger">
              ⚠️ Auf 0 setzen
            </button>
          </form>

          {/* Letzte "Auf 0"-Buchungen */}
          {recentInventoryZeroMovements.length > 0 && (
            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "2px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem", color: "#374151" }}>
                Letzte "Auf 0"-Buchungen
              </h3>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {recentInventoryZeroMovements.map((movement) => {
                  const date = new Date(movement.createdAt);
                  const dateStr = date.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
                  const timeStr = date.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div
                      key={movement.id}
                      style={{
                        padding: "0.75rem",
                        marginBottom: "0.5rem",
                        background: "#f9fafb",
                        borderRadius: "0.375rem",
                        border: "1px solid #e5e7eb",
                        fontSize: "0.875rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.25rem" }}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {movement.farmerNameSnapshot || movement.farmer?.name || "Bauer"} – {movement.varietyNameSnapshot || movement.variety?.name || "Sorte"}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <div style={{ color: "#6b7280", fontSize: "0.8125rem" }}>
                            {dateStr} {timeStr}
                          </div>
                          {isPackbetrieb && (
                            <button
                              onClick={() => {
                                setEditingInventoryZeroId(movement.id);
                                setEditInventoryZeroComment(movement.comment || "");
                                setTimeout(() => {
                                  const form = document.getElementById("edit-inventory-zero-form");
                                  if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
                                }, 100);
                              }}
                              style={{
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.75rem",
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "0.25rem",
                                cursor: "pointer",
                              }}
                            >
                              Bearbeiten
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ color: "#4b5563", fontSize: "0.8125rem" }}>
                        Lager auf 0 gesetzt
                        {movement.comment && ` | ${movement.comment}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* Bearbeitungsformular für "Auf 0"-Buchung */}
          {editingInventoryZeroId && isPackbetrieb && (
            <section id="edit-inventory-zero-form" className="content-card" style={{ marginTop: "1rem", background: "#fef3c7" }}>
              <h3 style={{ color: "#1e293b", fontWeight: 600 }}>"Auf 0"-Buchung bearbeiten</h3>
              <form onSubmit={handleUpdateInventoryZero}>
                <label style={{ color: "#1e293b", fontWeight: 600 }}>Neuer Lagerstand (kg) - optional</label>
                <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "0.5rem" }}>
                  Wenn Sie einen Lagerstand eingeben, wird der Lagerstand auf diesen Wert gesetzt. Die ursprünglich verbuchte "Auf 0"-Buchung wird korrigiert.
                </p>
                <CalcInput
                  value={editInventoryZeroStockKg}
                  onChange={setEditInventoryZeroStockKg}
                  label="Aktueller Lagerstand (kg)"
                  step="0.01"
                  min="0"
                />

                <label style={{ marginTop: "0.75rem", color: "#1e293b", fontWeight: 600 }}>Bemerkung (optional)</label>
                <input
                  type="text"
                  value={editInventoryZeroComment}
                  onChange={(e) => setEditInventoryZeroComment(e.target.value)}
                  placeholder="z.B. Sorte abgearbeitet"
                />

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button type="submit" style={{ flex: 1, padding: "0.75rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}>
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInventoryZeroId(null);
                      setEditInventoryZeroComment("");
                      setEditInventoryZeroStockKg("");
                    }}
                    style={{ flex: 1, padding: "0.75rem", background: "#6b7280", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
                  >
                    Abbrechen
                  </button>
                </div>
          </form>
            </section>
          )}
        </section>
      )}

    </div>
  );
}

