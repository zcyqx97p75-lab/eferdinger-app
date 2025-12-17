import React from "react";
import type { CookingType, Product, Customer } from "../../types";
import { formatAmount, formatKg, getCookingLabel, openDatePickerOnFocus, openSelectOnFocus } from "../../utils";
import { CalcInput } from "../CalcInput";
import { ActionCard } from "../ActionCard";

interface StatistikTabProps {
  isPackbetrieb: boolean;
  statisticsData: {
    sales: any[];
    complaints: any[];
    inventories: any[];
    packagingRuns: any[];
    wasteMovements: any[];
    inventoryZeroMovements: any[];
  };
  statFilterDateFrom: string;
  setStatFilterDateFrom: (value: string) => void;
  statFilterDateTo: string;
  setStatFilterDateTo: (value: string) => void;
  statFilterProductId: number | "";
  setStatFilterProductId: (value: number | "") => void;
  statFilterCustomerId: number | "";
  setStatFilterCustomerId: (value: number | "") => void;
  statFilterType: "ALL" | "SALE" | "COMPLAINT" | "INVENTORY";
  setStatFilterType: (value: "ALL" | "SALE" | "COMPLAINT" | "INVENTORY") => void;
  statLoading: boolean;
  safeProducts: Product[];
  customers: Customer[];
  editingSaleId: number | null;
  setEditingSaleId: (value: number | null) => void;
  editSaleDate: string;
  setEditSaleDate: (value: string) => void;
  editSaleCustomerId: number | "";
  setEditSaleCustomerId: (value: number | "") => void;
  editSaleProductId: number | "";
  setEditSaleProductId: (value: number | "") => void;
  editSaleColli: string;
  setEditSaleColli: (value: string) => void;
  editSalePricePerColli: string;
  setEditSalePricePerColli: (value: string) => void;
  editSaleComment: string;
  setEditSaleComment: (value: string) => void;
  editingComplaintId: number | null;
  setEditingComplaintId: (value: number | null) => void;
  editComplaintType: "RETOURWARE" | "PROZENTABZUG";
  setEditComplaintType: (value: "RETOURWARE" | "PROZENTABZUG") => void;
  editComplaintColli: string;
  setEditComplaintColli: (value: string) => void;
  editComplaintPercent: string;
  setEditComplaintPercent: (value: string) => void;
  editComplaintComment: string;
  setEditComplaintComment: (value: string) => void;
  editingInventoryId: number | null;
  setEditingInventoryId: (value: number | null) => void;
  editInventoryColli: string;
  setEditInventoryColli: (value: string) => void;
  editInventoryPricePerUnit: string;
  setEditInventoryPricePerUnit: (value: string) => void;
  editInventoryComment: string;
  setEditInventoryComment: (value: string) => void;
  handleUpdateSale: (e: React.FormEvent) => Promise<void>;
  handleUpdateComplaint: (e: React.FormEvent) => Promise<void>;
  handleUpdateInventory: (e: React.FormEvent) => Promise<void>;
  loadPackbetriebStatistics: () => Promise<void>;
  loadPackPlantStock: () => Promise<void>;
  showMessage: (text: string) => void;
  setConfirmAction: (action: any) => void;
}

export const StatistikTab: React.FC<StatistikTabProps> = ({
  isPackbetrieb,
  statisticsData,
  statFilterDateFrom,
  setStatFilterDateFrom,
  statFilterDateTo,
  setStatFilterDateTo,
  statFilterProductId,
  setStatFilterProductId,
  statFilterCustomerId,
  setStatFilterCustomerId,
  statFilterType,
  setStatFilterType,
  statLoading,
  safeProducts,
  customers,
  editingSaleId,
  setEditingSaleId,
  editSaleDate,
  setEditSaleDate,
  editSaleCustomerId,
  setEditSaleCustomerId,
  editSaleProductId,
  setEditSaleProductId,
  editSaleColli,
  setEditSaleColli,
  editSalePricePerColli,
  setEditSalePricePerColli,
  editSaleComment,
  setEditSaleComment,
  editingComplaintId,
  setEditingComplaintId,
  editComplaintType,
  setEditComplaintType,
  editComplaintColli,
  setEditComplaintColli,
  editComplaintPercent,
  setEditComplaintPercent,
  editComplaintComment,
  setEditComplaintComment,
  editingInventoryId,
  setEditingInventoryId,
  editInventoryColli,
  setEditInventoryColli,
  editInventoryPricePerUnit,
  setEditInventoryPricePerUnit,
  editInventoryComment,
  setEditInventoryComment,
  handleUpdateSale,
  handleUpdateComplaint,
  handleUpdateInventory,
  loadPackbetriebStatistics,
  loadPackPlantStock,
  showMessage,
  setConfirmAction,
}) => {
  if (!isPackbetrieb) {
    return <p>Nur für Packbetrieb sichtbar.</p>;
  }

  return (
    <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
      <ActionCard
        icon="📊"
        title="Statistik / Auswertung"
        variant="default"
      >
        <p style={{ fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
          Übersicht über alle Verkäufe, Reklamationen und Inventuren mit Filter- und Bearbeitungsmöglichkeiten.
        </p>

        {/* Filter */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1rem", padding: "1rem", background: "#f1f5f9", borderRadius: "0.5rem" }}>
          <div>
            <label style={{ color: "#1e293b", fontWeight: 600 }}>Von Datum</label>
            <input
              type="date"
              value={statFilterDateFrom}
              onChange={(e) => setStatFilterDateFrom(e.target.value)}
              onFocus={openDatePickerOnFocus}
            />
          </div>
          <div>
            <label style={{ color: "#1e293b", fontWeight: 600 }}>Bis Datum</label>
            <input
              type="date"
              value={statFilterDateTo}
              onChange={(e) => setStatFilterDateTo(e.target.value)}
              onFocus={openDatePickerOnFocus}
            />
          </div>
          <div>
            <label style={{ color: "#1e293b", fontWeight: 600 }}>Produkt</label>
            <select
              value={statFilterProductId}
              onChange={(e) => setStatFilterProductId(e.target.value ? Number(e.target.value) : "")}
              onFocus={openSelectOnFocus}
            >
              <option value="">– Alle –</option>
              {safeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} – {getCookingLabel(p.cookingType as CookingType)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: "#1e293b", fontWeight: 600 }}>Kunde</label>
            <select
              value={statFilterCustomerId}
              onChange={(e) => setStatFilterCustomerId(e.target.value ? Number(e.target.value) : "")}
              onFocus={openSelectOnFocus}
            >
              <option value="">– Alle –</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: "#1e293b", fontWeight: 600 }}>Typ</label>
            <select
              value={statFilterType}
              onChange={(e) => setStatFilterType(e.target.value as "ALL" | "SALE" | "COMPLAINT" | "INVENTORY")}
              onFocus={openSelectOnFocus}
            >
              <option value="ALL">Alle</option>
              <option value="SALE">Verkäufe</option>
              <option value="COMPLAINT">Reklamationen</option>
              <option value="INVENTORY">Inventuren</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="button"
              onClick={loadPackbetriebStatistics}
              disabled={statLoading}
              style={{ width: "100%" }}
            >
              {statLoading ? "Lädt..." : "Filtern"}
            </button>
          </div>
        </div>

        {/* Verkäufe */}
        {(statFilterType === "ALL" || statFilterType === "SALE") && (
          <ActionCard
            icon="💰"
            title={`Verkäufe (${statisticsData.sales.length})`}
            variant="default"
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Kunde</th>
                    <th>Produkt</th>
                    <th>Kocheigenschaft</th>
                    <th style={{ textAlign: "right" }}>Menge (Colli)</th>
                    <th style={{ textAlign: "right" }}>Menge (Einheiten)</th>
                    <th style={{ textAlign: "right" }}>Preis je Colli</th>
                    <th style={{ textAlign: "right" }}>Gesamtpreis</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {statisticsData.sales.map((sale) => {
                    const product = safeProducts.find((p) => p.id === sale.productId);
                    const unitsPerColli = product?.unitsPerColli;
                    const colli = unitsPerColli && unitsPerColli > 0
                      ? Math.floor(sale.quantityUnits / unitsPerColli)
                      : null;
                    const restUnits = unitsPerColli && unitsPerColli > 0
                      ? sale.quantityUnits % unitsPerColli
                      : sale.quantityUnits;
                    return (
                      <tr key={sale.id}>
                        <td>{sale.date?.substring(0, 10)}</td>
                        <td>{sale.customer?.name ?? sale.customerNameSnapshot ?? "-"}</td>
                        <td>{sale.product?.name ?? sale.productNameSnapshot ?? "-"}</td>
                        <td>{sale.product?.cookingType ? getCookingLabel(sale.product.cookingType as CookingType) : "-"}</td>
                        <td style={{ textAlign: "right" }}>
                          {colli !== null
                            ? `${colli} Colli${restUnits !== 0 ? ` ${restUnits > 0 ? "+" : ""}${restUnits} Einheiten` : ""}`
                            : `${sale.quantityUnits} Einheiten`}
                        </td>
                        <td style={{ textAlign: "right" }}>{formatKg(sale.quantityUnits)}</td>
                        <td style={{ textAlign: "right" }}>{formatAmount(sale.unitPrice)} €</td>
                        <td style={{ textAlign: "right" }}>{formatAmount(sale.totalAmount)} €</td>
                        <td>
                          <button
                            type="button"
                            style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem" }}
                            onClick={() => {
                              const product = safeProducts.find((p) => p.id === sale.productId);
                              const unitsPerColli = product?.unitsPerColli;
                              const colli = unitsPerColli && unitsPerColli > 0
                                ? Math.floor(sale.quantityUnits / unitsPerColli)
                                : null;
                              setEditingSaleId(sale.id);
                              setEditSaleDate(sale.date?.substring(0, 10) ?? "");
                              setEditSaleCustomerId(sale.customerId);
                              setEditSaleProductId(sale.productId);
                              setEditSaleColli(colli !== null ? String(colli) : "");
                              setEditSalePricePerColli(formatAmount(sale.unitPrice).replace(" €", "").replace(/\u202F/g, "").replace(/\s/g, ""));
                              setEditSaleComment(sale.comment ?? "");
                              const formElement = document.getElementById("edit-sale-form");
                              formElement?.scrollIntoView({ behavior: "smooth" });
                            }}
                          >
                            Bearbeiten
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {statisticsData.sales.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "1rem" }}>
                        Keine Verkäufe gefunden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ActionCard>
        )}

        {/* Reklamationen */}
        {(statFilterType === "ALL" || statFilterType === "COMPLAINT") && (
          <ActionCard
            icon="📋"
            title={`Reklamationen (${statisticsData.complaints.length})`}
            variant="default"
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Kunde</th>
                    <th>Produkt</th>
                    <th>Typ</th>
                    <th style={{ textAlign: "right" }}>Menge (Colli)</th>
                    <th style={{ textAlign: "right" }}>Menge (Einheiten)</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {statisticsData.complaints.map((complaint) => {
                    const sale = complaint.customerSale;
                    const product = safeProducts.find((p) => p.id === sale?.productId);
                    const unitsPerColli = product?.unitsPerColli;
                    const colli = unitsPerColli && unitsPerColli > 0
                      ? Math.floor(complaint.affectedQuantity / unitsPerColli)
                      : null;
                    const restUnits = unitsPerColli && unitsPerColli > 0
                      ? complaint.affectedQuantity % unitsPerColli
                      : complaint.affectedQuantity;
                    return (
                      <tr key={complaint.id}>
                        <td>{complaint.createdAt?.substring(0, 10)}</td>
                        <td>{complaint.customerNameSnapshot ?? sale?.customer?.name ?? "-"}</td>
                        <td>{complaint.productNameSnapshot ?? sale?.product?.name ?? "-"}</td>
                        <td>{complaint.complaintType === "RETOURWARE" ? "Retourware" : `${complaint.discountPercent}% Abzug`}</td>
                        <td style={{ textAlign: "right" }}>
                          {colli !== null
                            ? `${colli} Colli${restUnits !== 0 ? ` ${restUnits > 0 ? "+" : ""}${restUnits} Einheiten` : ""}`
                            : `${complaint.affectedQuantity} Einheiten`}
                        </td>
                        <td style={{ textAlign: "right" }}>{formatKg(complaint.affectedQuantity)}</td>
                        <td>
                          <button
                            type="button"
                            style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem" }}
                            onClick={() => {
                              const product = safeProducts.find((p) => p.id === sale?.productId);
                              const unitsPerColli = product?.unitsPerColli;
                              const colli = unitsPerColli && unitsPerColli > 0
                                ? Math.floor(complaint.affectedQuantity / unitsPerColli)
                                : null;
                              setEditingComplaintId(complaint.id);
                              setEditComplaintType(complaint.complaintType);
                              setEditComplaintColli(colli !== null ? String(colli) : "");
                              setEditComplaintPercent(complaint.discountPercent ? String(complaint.discountPercent) : "");
                              setEditComplaintComment(complaint.comment ?? "");
                              const formElement = document.getElementById("edit-complaint-form");
                              formElement?.scrollIntoView({ behavior: "smooth" });
                            }}
                          >
                            Bearbeiten
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {statisticsData.complaints.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "1rem" }}>
                        Keine Reklamationen gefunden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ActionCard>
        )}

        {/* Inventuren */}
        {(statFilterType === "ALL" || statFilterType === "INVENTORY") && (
          <ActionCard
            icon="📦"
            title={`Inventuren (${statisticsData.inventories.length})`}
            variant="default"
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Produkt</th>
                    <th>Kocheigenschaft</th>
                    <th style={{ textAlign: "right" }}>Änderung (Colli)</th>
                    <th style={{ textAlign: "right" }}>Änderung (Einheiten)</th>
                    <th style={{ textAlign: "right" }}>Preis je Colli</th>
                    <th>Kommentar</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {statisticsData.inventories.map((inv) => {
                    const product = safeProducts.find((p) => p.id === inv.productId);
                    const unitsPerColli = product?.unitsPerColli;
                    const changeColli = unitsPerColli && unitsPerColli > 0
                      ? Math.floor(inv.changeUnits / unitsPerColli)
                      : null;
                    const changeRestUnits = unitsPerColli && unitsPerColli > 0
                      ? inv.changeUnits % unitsPerColli
                      : inv.changeUnits;
                    return (
                      <tr key={inv.id}>
                        <td>{inv.createdAt?.substring(0, 10)}</td>
                        <td>{inv.product?.name ?? inv.productNameSnapshot ?? "-"}</td>
                        <td>{inv.product?.cookingType ? getCookingLabel(inv.product.cookingType as CookingType) : "-"}</td>
                        <td style={{ textAlign: "right" }}>
                          {changeColli !== null
                            ? `${changeColli >= 0 ? "+" : ""}${changeColli} Colli${changeRestUnits !== 0 ? ` ${changeRestUnits > 0 ? "+" : ""}${changeRestUnits} Einheiten` : ""}`
                            : `${inv.changeUnits >= 0 ? "+" : ""}${inv.changeUnits} Einheiten`}
                        </td>
                        <td style={{ textAlign: "right" }}>{inv.changeUnits >= 0 ? "+" : ""}{formatKg(inv.changeUnits)}</td>
                        <td style={{ textAlign: "right" }}>{inv.pricePerUnitSnapshot ? formatAmount(inv.pricePerUnitSnapshot) + " €" : "-"}</td>
                        <td>{inv.comment ?? "-"}</td>
                        <td>
                          <button
                            type="button"
                            style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem" }}
                            onClick={() => {
                              const product = safeProducts.find((p) => p.id === inv.productId);
                              const unitsPerColli = product?.unitsPerColli;
                              const colli = unitsPerColli && unitsPerColli > 0
                                ? Math.floor(inv.changeUnits / unitsPerColli)
                                : null;
                              setEditingInventoryId(inv.id);
                              setEditInventoryColli(colli !== null ? String(colli) : "");
                              setEditInventoryPricePerUnit(inv.pricePerUnitSnapshot ? formatAmount(inv.pricePerUnitSnapshot).replace(" €", "").replace(/\u202F/g, "").replace(/\s/g, "") : "");
                              setEditInventoryComment(inv.comment ?? "");
                              const formElement = document.getElementById("edit-inventory-form");
                              formElement?.scrollIntoView({ behavior: "smooth" });
                            }}
                          >
                            Bearbeiten
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {statisticsData.inventories.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "1rem" }}>
                        Keine Inventuren gefunden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ActionCard>
        )}

        {/* Bearbeitungsformulare */}
        {editingSaleId && (
          <ActionCard
            id="edit-sale-form"
            icon="✏️"
            title="Verkauf bearbeiten"
            variant="warning"
          >
            <form onSubmit={handleUpdateSale}>
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Datum</label>
              <input
                type="date"
                value={editSaleDate}
                onChange={(e) => setEditSaleDate(e.target.value)}
                onFocus={openDatePickerOnFocus}
                required
              />
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Kunde</label>
              <select
                value={editSaleCustomerId}
                onChange={(e) => setEditSaleCustomerId(e.target.value ? Number(e.target.value) : "")}
                onFocus={openSelectOnFocus}
                required
              >
                <option value="">– Kunde wählen –</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Produkt</label>
              <select
                value={editSaleProductId}
                onChange={(e) => setEditSaleProductId(e.target.value ? Number(e.target.value) : "")}
                onFocus={openSelectOnFocus}
                required
              >
                <option value="">– Produkt wählen –</option>
                {safeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} – {getCookingLabel(p.cookingType as CookingType)}
                  </option>
                ))}
              </select>
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Menge (Colli)</label>
              <CalcInput
                value={editSaleColli}
                onChange={setEditSaleColli}
                label="Menge (Colli)"
                step="1"
                min="1"
                required
              />
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Preis je Colli (€)</label>
              <CalcInput
                value={editSalePricePerColli}
                onChange={setEditSalePricePerColli}
                label="Preis je Colli (€)"
                step="0.01"
                min="0"
              />
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Kommentar</label>
              <input
                type="text"
                value={editSaleComment}
                onChange={(e) => setEditSaleComment(e.target.value)}
              />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="submit">Speichern</button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSaleId(null);
                    setEditSaleDate("");
                    setEditSaleCustomerId("");
                    setEditSaleProductId("");
                    setEditSaleColli("");
                    setEditSalePricePerColli("");
                    setEditSaleComment("");
                  }}
                  style={{ background: "#ef4444", color: "#fff" }}
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </ActionCard>
        )}

        {editingComplaintId && (
          <ActionCard
            id="edit-complaint-form"
            icon="✏️"
            title="Reklamation bearbeiten"
            variant="warning"
          >
            <form onSubmit={handleUpdateComplaint}>
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Typ</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                <div
                  onClick={() => setEditComplaintType("RETOURWARE")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    userSelect: "none",
                    padding: "0.5rem",
                    background: editComplaintType === "RETOURWARE" ? "#065f46" : "#1f2937",
                    borderRadius: "0.375rem",
                    border: "1px solid #374151",
                    minHeight: "2.5rem",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      border: "2px solid #64748b",
                      borderRadius: "50%",
                      backgroundColor: editComplaintType === "RETOURWARE" ? "#3b82f6" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.2s",
                      position: "relative",
                    }}
                  >
                    {editComplaintType === "RETOURWARE" && (
                      <div
                        style={{
                          width: "0.5rem",
                          height: "0.5rem",
                          borderRadius: "50%",
                          backgroundColor: "white",
                        }}
                      />
                    )}
                  </div>
                  <span style={{ fontWeight: 600 }}>Retourware</span>
                  <input
                    type="radio"
                    name="editComplaintType"
                    checked={editComplaintType === "RETOURWARE"}
                    onChange={() => setEditComplaintType("RETOURWARE")}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      width: 0,
                      height: 0,
                      pointerEvents: "none",
                    }}
                    tabIndex={-1}
                  />
                </div>
                <div
                  onClick={() => setEditComplaintType("PROZENTABZUG")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    userSelect: "none",
                    padding: "0.5rem",
                    background: editComplaintType === "PROZENTABZUG" ? "#065f46" : "#1f2937",
                    borderRadius: "0.375rem",
                    border: "1px solid #374151",
                    minHeight: "2.5rem",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      border: "2px solid #64748b",
                      borderRadius: "50%",
                      backgroundColor: editComplaintType === "PROZENTABZUG" ? "#3b82f6" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.2s",
                      position: "relative",
                    }}
                  >
                    {editComplaintType === "PROZENTABZUG" && (
                      <div
                        style={{
                          width: "0.5rem",
                          height: "0.5rem",
                          borderRadius: "50%",
                          backgroundColor: "white",
                        }}
                      />
                    )}
                  </div>
                  <span style={{ fontWeight: 600 }}>Prozentabzug</span>
                  <input
                    type="radio"
                    name="editComplaintType"
                    checked={editComplaintType === "PROZENTABZUG"}
                    onChange={() => setEditComplaintType("PROZENTABZUG")}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      width: 0,
                      height: 0,
                      pointerEvents: "none",
                    }}
                    tabIndex={-1}
                  />
                </div>
              </div>
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Menge (Colli)</label>
              <CalcInput
                value={editComplaintColli}
                onChange={setEditComplaintColli}
                label="Menge (Colli)"
                step="1"
                min="1"
                required
              />
              {editComplaintType === "PROZENTABZUG" && (
                <>
                  <label style={{ color: "#1e293b", fontWeight: 600 }}>Prozentsatz (%)</label>
                  <CalcInput
                    value={editComplaintPercent}
                    onChange={setEditComplaintPercent}
                    label="Prozentsatz (%)"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                  />
                </>
              )}
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Kommentar</label>
              <input
                type="text"
                value={editComplaintComment}
                onChange={(e) => setEditComplaintComment(e.target.value)}
              />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="submit">Speichern</button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingComplaintId(null);
                    setEditComplaintType("RETOURWARE");
                    setEditComplaintColli("");
                    setEditComplaintPercent("");
                    setEditComplaintComment("");
                  }}
                  style={{ background: "#ef4444", color: "#fff" }}
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </ActionCard>
        )}

        {editingInventoryId && (
          <ActionCard
            id="edit-inventory-form"
            icon="✏️"
            title="Inventur bearbeiten"
            variant="warning"
          >
            <form onSubmit={handleUpdateInventory}>
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Änderung (Colli)</label>
              <CalcInput
                value={editInventoryColli}
                onChange={setEditInventoryColli}
                label="Änderung (Colli)"
                step="1"
                required
              />
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Preis je Colli (optional, €)</label>
              <CalcInput
                value={editInventoryPricePerUnit}
                onChange={setEditInventoryPricePerUnit}
                label="Preis je Colli (€)"
                step="0.01"
                min="0"
              />
              <label style={{ color: "#1e293b", fontWeight: 600 }}>Kommentar</label>
              <input
                type="text"
                value={editInventoryComment}
                onChange={(e) => setEditInventoryComment(e.target.value)}
              />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="submit">Speichern</button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingInventoryId(null);
                    setEditInventoryColli("");
                    setEditInventoryPricePerUnit("");
                    setEditInventoryComment("");
                  }}
                  style={{ background: "#ef4444", color: "#fff" }}
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </ActionCard>
        )}
      </ActionCard>
    </div>
  );
};


