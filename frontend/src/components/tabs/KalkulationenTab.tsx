import React from "react";
import type { PackPlant, Product, Customer, ManualCost } from "../../types";
import { formatCurrency, openDatePickerOnFocus, openSelectOnFocus, parseKg } from "../../utils";
import { CalcInput } from "../CalcInput";
import { ActionCard } from "../ActionCard";

interface KalkulationenTabProps {
  isEgAdmin: boolean;
  pnlData: any;
  pnlLoading: boolean;
  pnlDateFrom: string;
  setPnlDateFrom: (value: string) => void;
  pnlDateTo: string;
  setPnlDateTo: (value: string) => void;
  pnlYear: number | "";
  setPnlYear: (value: number | "") => void;
  pnlMonth: number | "";
  setPnlMonth: (value: number | "") => void;
  pnlWeek: number | "";
  setPnlWeek: (value: number | "") => void;
  pnlPackPlantId: number | "";
  setPnlPackPlantId: (value: number | "") => void;
  pnlProductId: number | "";
  setPnlProductId: (value: number | "") => void;
  pnlCustomerId: number | "";
  setPnlCustomerId: (value: number | "") => void;
  packPlants: PackPlant[];
  safeProducts: Product[];
  customers: Customer[];
  manualCosts: ManualCost[];
  mcCostType: string;
  setMcCostType: (value: string) => void;
  mcDescription: string;
  setMcDescription: (value: string) => void;
  mcPeriodFrom: string;
  setMcPeriodFrom: (value: string) => void;
  mcPeriodTo: string;
  setMcPeriodTo: (value: string) => void;
  mcPackPlantId: number | "";
  setMcPackPlantId: (value: number | "") => void;
  mcValueType: "ABSOLUTE" | "PERCENTAGE";
  setMcValueType: (value: "ABSOLUTE" | "PERCENTAGE") => void;
  mcValue: string;
  setMcValue: (value: string) => void;
  mcComment: string;
  setMcComment: (value: string) => void;
  mcEditingId: number | null;
  setMcEditingId: (value: number | null) => void;
  mcLoading: boolean;
  loadPnl: () => Promise<void>;
  loadManualCosts: () => Promise<void>;
  saveManualCost: (e: React.FormEvent) => Promise<void>;
  editManualCost: (cost: any) => void;
  deleteManualCost: (id: number) => Promise<void>;
  showMessage: (text: string) => void;
  setConfirmAction: (action: any) => void;
}

export const KalkulationenTab: React.FC<KalkulationenTabProps> = ({
  isEgAdmin,
  pnlData,
  pnlLoading,
  pnlDateFrom,
  setPnlDateFrom,
  pnlDateTo,
  setPnlDateTo,
  pnlYear,
  setPnlYear,
  pnlMonth,
  setPnlMonth,
  pnlWeek,
  setPnlWeek,
  pnlPackPlantId,
  setPnlPackPlantId,
  pnlProductId,
  setPnlProductId,
  pnlCustomerId,
  setPnlCustomerId,
  packPlants,
  safeProducts,
  customers,
  manualCosts,
  mcCostType,
  setMcCostType,
  mcDescription,
  setMcDescription,
  mcPeriodFrom,
  setMcPeriodFrom,
  mcPeriodTo,
  setMcPeriodTo,
  mcPackPlantId,
  setMcPackPlantId,
  mcValueType,
  setMcValueType,
  mcValue,
  setMcValue,
  mcComment,
  setMcComment,
  mcEditingId,
  setMcEditingId,
  mcLoading,
  loadPnl,
  loadManualCosts,
  saveManualCost,
  editManualCost,
  deleteManualCost,
  showMessage,
  setConfirmAction,
}) => {
  if (!isEgAdmin) {
    return <p>Nur für Administratoren sichtbar.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* GuV-Berechnung */}
      <ActionCard title="Gewinn- und Verlustrechnung (GuV)" icon="📊">
        <p style={{ color: "#94a3b8", marginBottom: "1rem", fontSize: "0.875rem" }}>
          Berechnung der Erlöse und Aufwendungen für einen Zeitraum. Filterbar nach Packbetrieb, Produkt und Kunde.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Shortcuts für Zeitraum */}
          <div style={{ padding: "1rem", background: "rgba(51, 65, 85, 0.3)", borderRadius: "0.5rem", border: "1px solid #475569" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "#cbd5e1" }}>
              Zeitraum-Shortcuts
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>Kalenderjahr</label>
                <input
                  type="number"
                  value={pnlYear}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : "";
                    setPnlYear(val);
                    if (val === "") {
                      setPnlMonth("");
                      setPnlWeek("");
                    }
                  }}
                  min="2020"
                  max="2100"
                  placeholder="z.B. 2025"
                  style={{ width: "100%" }}
                />
              </div>
              {pnlYear !== "" && (
                <div>
                  <label style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>Monat (optional)</label>
                  <select
                    value={pnlMonth}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : "";
                      setPnlMonth(val);
                      if (val === "") {
                        setPnlWeek("");
                      }
                    }}
                    onFocus={openSelectOnFocus}
                    style={{ width: "100%" }}
                  >
                    <option value="">-- Alle Monate --</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        {new Date(Number(pnlYear), m - 1, 1).toLocaleDateString("de-DE", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {pnlYear !== "" && pnlMonth !== "" && (
                <div>
                  <label style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>Woche (optional)</label>
                  <select
                    value={pnlWeek}
                    onChange={(e) => setPnlWeek(e.target.value ? Number(e.target.value) : "")}
                    onFocus={openSelectOnFocus}
                    style={{ width: "100%" }}
                  >
                    <option value="">-- Alle Wochen --</option>
                    {(() => {
                      const year = Number(pnlYear);
                      const month = Number(pnlMonth);
                      const firstDay = new Date(year, month - 1, 1);
                      const lastDay = new Date(year, month, 0);
                      const daysInMonth = lastDay.getDate();
                      const firstDayOfWeek = firstDay.getDay();
                      const mondayOffset = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
                      const weeks = Math.ceil((daysInMonth + mondayOffset) / 7);
                      return Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
                        <option key={w} value={w}>
                          Woche {w}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              )}
            </div>
            <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
              {pnlYear !== "" && pnlMonth === "" && "Zeitraum: Gesamtes Jahr " + pnlYear}
              {pnlYear !== "" && pnlMonth !== "" && pnlWeek === "" && `Zeitraum: ${new Date(Number(pnlYear), Number(pnlMonth) - 1, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`}
              {pnlYear !== "" && pnlMonth !== "" && pnlWeek !== "" && `Zeitraum: Woche ${pnlWeek} im ${new Date(Number(pnlYear), Number(pnlMonth) - 1, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`}
            </div>
          </div>

          {/* Manuelle Datumsauswahl */}
          <div style={{ padding: "0.5rem 0", borderTop: "1px solid #475569", borderBottom: "1px solid #475569" }}>
            <div style={{ fontSize: "0.8125rem", color: "#94a3b8", marginBottom: "0.5rem" }}>
              Oder manuell:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label>Von</label>
                <input
                  type="date"
                  value={pnlDateFrom}
                  onChange={(e) => {
                    setPnlDateFrom(e.target.value);
                    // Shortcuts zurücksetzen wenn manuell geändert
                    if (e.target.value) {
                      setPnlYear("");
                      setPnlMonth("");
                      setPnlWeek("");
                    }
                  }}
                  onFocus={openDatePickerOnFocus}
                />
              </div>
              <div>
                <label>Bis</label>
                <input
                  type="date"
                  value={pnlDateTo}
                  onChange={(e) => {
                    setPnlDateTo(e.target.value);
                    // Shortcuts zurücksetzen wenn manuell geändert
                    if (e.target.value) {
                      setPnlYear("");
                      setPnlMonth("");
                      setPnlWeek("");
                    }
                  }}
                  onFocus={openDatePickerOnFocus}
                />
              </div>
            </div>
          </div>

          <div>
            <label>Packbetrieb (optional)</label>
            <select
              value={pnlPackPlantId}
              onChange={(e) => setPnlPackPlantId(e.target.value ? Number(e.target.value) : "")}
              onFocus={openSelectOnFocus}
            >
              <option value="">-- Alle Packbetriebe --</option>
              {packPlants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Produkt (optional)</label>
            <select
              value={pnlProductId}
              onChange={(e) => setPnlProductId(e.target.value ? Number(e.target.value) : "")}
              onFocus={openSelectOnFocus}
            >
              <option value="">-- Alle Produkte --</option>
              {safeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Kunde (optional)</label>
            <select
              value={pnlCustomerId}
              onChange={(e) => setPnlCustomerId(e.target.value ? Number(e.target.value) : "")}
              onFocus={openSelectOnFocus}
            >
              <option value="">-- Alle Kunden --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-action-primary"
            onClick={loadPnl}
            disabled={pnlLoading}
          >
            {pnlLoading ? "⏳ Berechne..." : "📊 GuV berechnen"}
          </button>

          {pnlData && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "rgba(51, 65, 85, 0.5)",
                borderRadius: "0.75rem",
                border: "1px solid #475569",
              }}
            >
              <h3 style={{ marginBottom: "1rem", fontSize: "1.125rem" }}>Ergebnis</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Gesamterlöse</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981" }}>
                    {formatCurrency(pnlData.revenue.total)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Gesamtaufwendungen</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444" }}>
                    {formatCurrency(pnlData.expenses.total)}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #475569" }}>
                <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Ergebnis (Gewinn/Verlust)</div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: pnlData.result >= 0 ? "#10b981" : "#ef4444",
                  }}
                >
                  {formatCurrency(pnlData.result)}
                  {pnlData.resultPercent !== 0 && (
                    <span style={{ fontSize: "1rem", marginLeft: "0.5rem", opacity: 0.8 }}>
                      ({pnlData.resultPercent.toFixed(2)}%)
                    </span>
                  )}
                </div>
              </div>

              {pnlData.breakEvenPricePerKg !== undefined && pnlData.breakEvenPricePerKg > 0 && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #475569" }}>
                  <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.25rem" }}>
                    Break-Even-Preis (VarietyQualityPrice)
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#fbbf24" }}>
                    {pnlData.breakEvenPricePerKg.toFixed(4)} €/kg
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", fontStyle: "italic" }}>
                    Preis pro kg, bei dem Ergebnis = 0 wäre
                  </div>
                </div>
              )}

              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #475569" }}>
                <h4 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Aufwendungen im Detail:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Abpackkosten:</span>
                    <span>{formatCurrency(pnlData.expenses.packingCosts)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Reklamationen/Retouren:</span>
                    <span>{formatCurrency(pnlData.expenses.complaintCosts)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Manuelle Kosten:</span>
                    <span>{formatCurrency(pnlData.expenses.manualCosts)}</span>
                  </div>
                  {Object.keys(pnlData.expenses.manualCostsByType).length > 0 && (
                    <div style={{ marginLeft: "1rem", marginTop: "0.25rem" }}>
                      {Object.entries(pnlData.expenses.manualCostsByType).map(([type, amount]: [string, any]) => (
                        <div key={type} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "#94a3b8" }}>
                          <span>{type}:</span>
                          <span>{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </ActionCard>

      {/* Manuelle Kosten */}
      <ActionCard title="Manuelle Kosten erfassen" icon="💰">
        <p style={{ color: "#94a3b8", marginBottom: "1rem", fontSize: "0.875rem" }}>
          Erfassen Sie zusätzliche Kosten, die nicht automatisch aus dem System kommen (z.B. Marketing, Bürokosten, etc.).
        </p>

        <form onSubmit={saveManualCost} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label>Kostenart</label>
            <select
              value={mcCostType}
              onChange={(e) => setMcCostType(e.target.value)}
              required
              onFocus={openSelectOnFocus}
            >
              <option value="MARKETING">Marketingaufwand</option>
              <option value="BUREAUCRACY">Bürokosten</option>
              <option value="FIXED_COSTS">Fixkosten</option>
              <option value="PACKAGING_MATERIAL">Verpackungsmaterial</option>
              <option value="REPAIRS">Reparaturen</option>
              <option value="OTHER_VARIABLE">Sonstige variable Kosten</option>
            </select>
          </div>

          <div>
            <label>Beschreibung</label>
            <input
              type="text"
              value={mcDescription}
              onChange={(e) => setMcDescription(e.target.value)}
              required
              placeholder="z.B. Werbekampagne Q1 2025"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label>Zeitraum von</label>
              <input
                type="date"
                value={mcPeriodFrom}
                onChange={(e) => setMcPeriodFrom(e.target.value)}
                required
                onFocus={openDatePickerOnFocus}
              />
            </div>
            <div>
              <label>Zeitraum bis</label>
              <input
                type="date"
                value={mcPeriodTo}
                onChange={(e) => setMcPeriodTo(e.target.value)}
                required
                onFocus={openDatePickerOnFocus}
              />
            </div>
          </div>

          <div>
            <label>Zuordnung (optional)</label>
            <select
              value={mcPackPlantId}
              onChange={(e) => setMcPackPlantId(e.target.value ? Number(e.target.value) : "")}
              onFocus={openSelectOnFocus}
            >
              <option value="">-- Allgemein für EG --</option>
              {packPlants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Wert-Typ</label>
            <select
              value={mcValueType}
              onChange={(e) => setMcValueType(e.target.value as "ABSOLUTE" | "PERCENTAGE")}
              required
              onFocus={openSelectOnFocus}
            >
              <option value="ABSOLUTE">Absoluter Betrag (€)</option>
              <option value="PERCENTAGE">Prozentual (% vom Umsatz)</option>
            </select>
          </div>

          <div>
            <label>Wert {mcValueType === "PERCENTAGE" ? "(%)" : "(€)"}</label>
            <CalcInput
              value={mcValue}
              onChange={setMcValue}
              label={mcValueType === "PERCENTAGE" ? "Wert (%)" : "Wert (€)"}
              step="0.01"
              required
            />
          </div>

          <div>
            <label>Kommentar (optional)</label>
            <textarea
              value={mcComment}
              onChange={(e) => setMcComment(e.target.value)}
              rows={3}
              placeholder="Zusätzliche Informationen..."
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn-action-primary" disabled={mcLoading}>
              {mcLoading ? "⏳ Speichere..." : mcEditingId ? "✏️ Aktualisieren" : "💾 Erstellen"}
            </button>
            {mcEditingId && (
              <button
                type="button"
                onClick={() => {
                  setMcDescription("");
                  setMcValue("");
                  setMcComment("");
                  setMcEditingId(null);
                }}
                className="btn-action-secondary"
              >
                ❌ Abbrechen
              </button>
            )}
          </div>
        </form>
      </ActionCard>

      {/* Liste manuelle Kosten */}
      <ActionCard title="Erfasste manuelle Kosten" icon="📋">
        <div style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            onClick={loadManualCosts}
            className="btn-action-secondary"
            style={{ fontSize: "0.875rem" }}
          >
            🔄 Liste aktualisieren
          </button>
        </div>

        {manualCosts.length === 0 ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: "1rem" }}>
            Noch keine manuellen Kosten erfasst.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#1e293b", color: "#f8fafc" }}>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>Kostenart</th>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>Beschreibung</th>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>Zeitraum</th>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>Packbetrieb</th>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>Typ</th>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>Wert</th>
                  <th style={{ padding: "0.5rem", textAlign: "center" }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {manualCosts.map((cost) => {
                  const costTypeLabels: Record<string, string> = {
                    MARKETING: "Marketing",
                    BUREAUCRACY: "Bürokosten",
                    FIXED_COSTS: "Fixkosten",
                    PACKAGING_MATERIAL: "Verpackungsmaterial",
                    REPAIRS: "Reparaturen",
                    OTHER_VARIABLE: "Sonstige",
                  };
                  
                  return (
                    <tr key={cost.id} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "0.5rem" }}>{costTypeLabels[cost.costType] || cost.costType}</td>
                      <td style={{ padding: "0.5rem" }}>{cost.description}</td>
                      <td style={{ padding: "0.5rem" }}>
                        {new Date(cost.periodFrom).toLocaleDateString("de-DE")} - {new Date(cost.periodTo).toLocaleDateString("de-DE")}
                      </td>
                      <td style={{ padding: "0.5rem" }}>{cost.packPlant?.name || "EG allgemein"}</td>
                      <td style={{ padding: "0.5rem", textAlign: "right" }}>
                        {cost.valueType === "ABSOLUTE" ? "Absolut" : "Prozent"}
                      </td>
                      <td style={{ padding: "0.5rem", textAlign: "right" }}>
                        {cost.valueType === "ABSOLUTE"
                          ? formatCurrency(Number(cost.value))
                          : `${Number(cost.value).toFixed(2)}%`}
                        {cost.calculatedAmount != null && cost.valueType === "PERCENTAGE" && (
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            = {formatCurrency(Number(cost.calculatedAmount))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.5rem", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => editManualCost(cost)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            marginRight: "0.25rem",
                            fontSize: "0.75rem",
                            background: "#3b82f6",
                            border: "none",
                            borderRadius: "0.25rem",
                            color: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmAction({
                              title: "Kosten löschen?",
                              message: `Möchten Sie die Kosten "${cost.description}" wirklich löschen?`,
                              confirmLabel: "Ja, löschen",
                              cancelLabel: "Abbrechen",
                              onConfirm: async () => {
                                setConfirmAction(null);
                                await deleteManualCost(cost.id);
                              },
                            });
                          }}
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.75rem",
                            background: "#ef4444",
                            border: "none",
                            borderRadius: "0.25rem",
                            color: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ActionCard>
    </div>
  );
};

