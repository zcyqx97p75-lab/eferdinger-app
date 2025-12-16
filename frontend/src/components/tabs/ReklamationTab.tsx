import React from "react";
import type { CookingType, Product, Customer, Farmer } from "../../types";
import { formatAmount, getCookingLabel, openDatePickerOnFocus, openSelectOnFocus } from "../../utils";
import { ActionCard } from "../ActionCard";

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
    customerSale?: CustomerSaleWithRemaining;
  }>;
};

interface ReklamationTabProps {
  isPackbetrieb: boolean;
  reklCustomers: Customer[];
  reklProducts: Product[];
  reklSales: CustomerSaleWithRemaining[];
  reklSelectedCustomerId: number | "";
  setReklSelectedCustomerId: (value: number | "") => void;
  reklSelectedProductId: number | "";
  setReklSelectedProductId: (value: number | "") => void;
  reklSelectedSaleId: number | "";
  setReklSelectedSaleId: (value: number | "") => void;
  reklSelectedSale: CustomerSaleWithRemaining | null;
  setReklSelectedSale: (value: CustomerSaleWithRemaining | null) => void;
  reklRelevantFarmers: Farmer[];
  reklFarmerId: number | "";
  setReklFarmerId: (value: number | "") => void;
  reklType: "RETOURWARE" | "PROZENTABZUG";
  setReklType: (value: "RETOURWARE" | "PROZENTABZUG") => void;
  reklQuantity: string;
  setReklQuantity: (value: string) => void;
  reklPercent: string;
  setReklPercent: (value: string) => void;
  reklDate: string;
  setReklDate: (value: string) => void;
  reklComment: string;
  setReklComment: (value: string) => void;
  reklLoading: boolean;
  handleReklamationSubmit: (e: React.FormEvent) => void;
  safeProducts: Product[];
  setReklProducts: (value: Product[]) => void;
  setReklSales: (value: CustomerSaleWithRemaining[]) => void;
  setReklRelevantFarmers: (value: Farmer[]) => void;
  loadReklProducts: (customerId: number) => Promise<void>;
  loadReklSales: (customerId: number, productId: number) => Promise<void>;
  loadReklRelevantFarmers: (saleId: number) => Promise<void>;
}

export const ReklamationTab: React.FC<ReklamationTabProps> = ({
  isPackbetrieb,
  reklCustomers,
  reklProducts,
  reklSales,
  reklSelectedCustomerId,
  setReklSelectedCustomerId,
  reklSelectedProductId,
  setReklSelectedProductId,
  reklSelectedSaleId,
  setReklSelectedSaleId,
  reklSelectedSale,
  setReklSelectedSale,
  reklRelevantFarmers,
  reklFarmerId,
  setReklFarmerId,
  reklType,
  setReklType,
  reklQuantity,
  setReklQuantity,
  reklPercent,
  setReklPercent,
  reklDate,
  setReklDate,
  reklComment,
  setReklComment,
  reklLoading,
  handleReklamationSubmit,
  safeProducts,
  setReklProducts,
  setReklSales,
  setReklRelevantFarmers,
  loadReklProducts,
  loadReklSales,
  loadReklRelevantFarmers,
}) => {
  if (!isPackbetrieb) {
    return <p>Nur für Packbetrieb sichtbar.</p>;
  }

  // Formatierung für Dropdown-Optionen
  const formatSaleOption = (sale: CustomerSaleWithRemaining) => {
    const dateStr = new Date(sale.date).toLocaleDateString("de-AT");
    const product = safeProducts.find((p) => p.id === sale.productId);
    const unitsPerColli = product?.unitsPerColli;
    
    // Gesamtmenge in Colli
    const totalColli = unitsPerColli && unitsPerColli > 0
      ? Math.floor(sale.quantityUnits / unitsPerColli)
      : null;
    const totalRestUnits = unitsPerColli && unitsPerColli > 0
      ? sale.quantityUnits % unitsPerColli
      : sale.quantityUnits;
    
    // Reklamierte Menge in Colli
    const complainedColli = unitsPerColli && unitsPerColli > 0
      ? Math.floor(sale.complainedQuantity / unitsPerColli)
      : null;
    const complainedRestUnits = unitsPerColli && unitsPerColli > 0
      ? sale.complainedQuantity % unitsPerColli
      : sale.complainedQuantity;
    
    // Restmenge in Colli
    const remainingColli = unitsPerColli && unitsPerColli > 0
      ? Math.floor(sale.remainingQuantity / unitsPerColli)
      : null;
    const remainingRestUnits = unitsPerColli && unitsPerColli > 0
      ? sale.remainingQuantity % unitsPerColli
      : sale.remainingQuantity;
    
    const totalStr = totalColli !== null
      ? `${totalColli} Colli${totalRestUnits > 0 ? ` + ${totalRestUnits} E` : ""}`
      : `${sale.quantityUnits} E`;
    
    const complainedStr = complainedColli !== null
      ? `${complainedColli} Colli${complainedRestUnits > 0 ? ` + ${complainedRestUnits} E` : ""}`
      : `${sale.complainedQuantity} E`;
    
    const remainingStr = remainingColli !== null
      ? `${remainingColli} Colli${remainingRestUnits > 0 ? ` + ${remainingRestUnits} E` : ""}`
      : `${sale.remainingQuantity} E`;
    
    return `${dateStr} – ${totalStr} – rekl.: ${complainedStr} – Rest: ${remainingStr}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <ActionCard
        icon="📋"
        title="Reklamation erfassen"
        variant="primary"
      >
        <form onSubmit={handleReklamationSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* 1. Kunde wählen */}
          <div>
            <label>Kunde</label>
            <select
              value={reklSelectedCustomerId}
              onChange={(e) => {
                const cid = e.target.value ? Number(e.target.value) : "";
                setReklSelectedCustomerId(cid);
                setReklSelectedProductId("");
                setReklSelectedSaleId("");
                setReklSelectedSale(null);
                setReklProducts([]);
                setReklSales([]);
                setReklRelevantFarmers([]);
                setReklFarmerId("");
                if (cid) loadReklProducts(cid);
              }}
              onFocus={openSelectOnFocus}
            >
              <option value="">– Kunde wählen –</option>
              {reklCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.region ? `(${c.region})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Produkt wählen */}
          {reklSelectedCustomerId && (
            <div>
              <label>Produkt</label>
              <select
                value={reklSelectedProductId}
                onChange={(e) => {
                  const pid = e.target.value ? Number(e.target.value) : "";
                  setReklSelectedProductId(pid);
                  setReklSelectedSaleId("");
                  setReklSelectedSale(null);
                  setReklSales([]);
                  setReklRelevantFarmers([]);
                  setReklFarmerId("");
                  if (pid && reklSelectedCustomerId) {
                    loadReklSales(Number(reklSelectedCustomerId), pid);
                  }
                }}
                onFocus={openSelectOnFocus}
              >
                <option value="">– Produkt wählen –</option>
                {reklProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} – {getCookingLabel(p.cookingType as CookingType)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Lieferung wählen */}
          {reklSelectedProductId && (
            <div>
              <label>Lieferung (mit Restmenge)</label>
              <select
                value={reklSelectedSaleId}
                onChange={(e) => {
                  const sid = e.target.value ? Number(e.target.value) : "";
                  setReklSelectedSaleId(sid);
                  const sale = reklSales.find((s) => s.id === sid) || null;
                  setReklSelectedSale(sale);
                  if (sale) {
                    // Restmenge in Colli umrechnen
                    const product = safeProducts.find((p) => p.id === Number(reklSelectedProductId));
                    const unitsPerColli = product?.unitsPerColli;
                    if (unitsPerColli && unitsPerColli > 0) {
                      const remainingColli = Math.floor(sale.remainingQuantity / unitsPerColli);
                      setReklQuantity(String(remainingColli));
                    } else {
                    setReklQuantity(String(sale.remainingQuantity));
                    }
                    // Relevante Bauern für diesen Verkauf laden
                    loadReklRelevantFarmers(sale.id);
                  } else {
                    setReklRelevantFarmers([]);
                    setReklFarmerId("");
                  }
                }}
                onFocus={openSelectOnFocus}
              >
                <option value="">– Lieferung wählen –</option>
                {reklSales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatSaleOption(s)}
                  </option>
                ))}
              </select>
              {reklSales.length === 0 && reklSelectedProductId && (
                <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                  Keine Lieferungen mit Restmenge vorhanden.
                </p>
              )}
            </div>
          )}

          {/* 4. Infos zur gewählten Lieferung */}
          {reklSelectedSale && (
            <div
              style={{
                background: "rgba(51, 65, 85, 0.5)",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                fontSize: "0.9375rem",
              }}
            >
              {(() => {
                const product = safeProducts.find((p) => p.id === Number(reklSelectedProductId));
                const unitsPerColli = product?.unitsPerColli;
                const soldColli = unitsPerColli && unitsPerColli > 0
                  ? Math.floor(reklSelectedSale.quantityUnits / unitsPerColli)
                  : null;
                const soldRestUnits = unitsPerColli && unitsPerColli > 0
                  ? reklSelectedSale.quantityUnits % unitsPerColli
                  : reklSelectedSale.quantityUnits;
                const complainedColli = unitsPerColli && unitsPerColli > 0
                  ? Math.floor(reklSelectedSale.complainedQuantity / unitsPerColli)
                  : null;
                const complainedRestUnits = unitsPerColli && unitsPerColli > 0
                  ? reklSelectedSale.complainedQuantity % unitsPerColli
                  : reklSelectedSale.complainedQuantity;
                const remainingColli = unitsPerColli && unitsPerColli > 0
                  ? Math.floor(reklSelectedSale.remainingQuantity / unitsPerColli)
                  : null;
                const remainingRestUnits = unitsPerColli && unitsPerColli > 0
                  ? reklSelectedSale.remainingQuantity % unitsPerColli
                  : reklSelectedSale.remainingQuantity;
                return (
                  <>
                    <p><strong>Verkaufte Menge:</strong> {soldColli !== null ? `${soldColli} Colli${soldRestUnits > 0 ? ` + ${soldRestUnits} Einheiten` : ""}` : `${reklSelectedSale.quantityUnits} Einheiten`}</p>
                    <p><strong>Bereits reklamiert:</strong> {complainedColli !== null ? `${complainedColli} Colli${complainedRestUnits > 0 ? ` + ${complainedRestUnits} Einheiten` : ""}` : `${reklSelectedSale.complainedQuantity} Einheiten`}</p>
              <p style={{ color: "#22c55e", fontWeight: 600 }}>
                      <strong>Restmenge:</strong> {remainingColli !== null ? `${remainingColli} Colli${remainingRestUnits > 0 ? ` + ${remainingRestUnits} Einheiten` : ""}` : `${reklSelectedSale.remainingQuantity} Einheiten`}
              </p>
                  </>
                );
              })()}
            </div>
          )}

          {/* 5. Reklamationsart */}
          {reklSelectedSale && (
            <div>
              <label>Reklamationsart</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                <div
                  onClick={() => setReklType("RETOURWARE")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    userSelect: "none",
                    padding: "0.5rem",
                    background: reklType === "RETOURWARE" ? "#065f46" : "#1f2937",
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
                      backgroundColor: reklType === "RETOURWARE" ? "#3b82f6" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.2s",
                      position: "relative",
                    }}
                  >
                    {reklType === "RETOURWARE" && (
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
                  <span style={{ fontWeight: 600 }}>Retourware (physische Rücknahme)</span>
                  <input
                    type="radio"
                    name="reklType"
                    checked={reklType === "RETOURWARE"}
                    onChange={() => setReklType("RETOURWARE")}
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
                  onClick={() => setReklType("PROZENTABZUG")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    userSelect: "none",
                    padding: "0.5rem",
                    background: reklType === "PROZENTABZUG" ? "#065f46" : "#1f2937",
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
                      backgroundColor: reklType === "PROZENTABZUG" ? "#3b82f6" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.2s",
                      position: "relative",
                    }}
                  >
                    {reklType === "PROZENTABZUG" && (
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
                    name="reklType"
                    checked={reklType === "PROZENTABZUG"}
                    onChange={() => setReklType("PROZENTABZUG")}
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
            </div>
          )}

          {/* 6. Betroffene Menge */}
          {reklSelectedSale && (() => {
            const product = safeProducts.find((p) => p.id === Number(reklSelectedProductId));
            const unitsPerColli = product?.unitsPerColli;
            const remainingColli = unitsPerColli && unitsPerColli > 0
              ? Math.floor(reklSelectedSale.remainingQuantity / unitsPerColli)
              : null;
            return (
            <div>
                <label>Betroffene Menge (Colli)</label>
              <input
                type="number"
                min={1}
                  max={remainingColli !== null ? remainingColli : reklSelectedSale.remainingQuantity}
                value={reklQuantity}
                onChange={(e) => setReklQuantity(e.target.value)}
                required
              />
                {unitsPerColli && unitsPerColli > 0 && (
                  <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.25rem" }}>
                    ({unitsPerColli} Einheiten je Colli)
            </div>
          )}
              </div>
            );
          })()}

          {/* 7. Prozentsatz (nur bei Prozentabzug) */}
          {reklSelectedSale && reklType === "PROZENTABZUG" && (
            <div>
              <label>Prozentsatz (%)</label>
              <input
                type="number"
                min={0.01}
                max={100}
                step={0.01}
                value={reklPercent}
                onChange={(e) => setReklPercent(e.target.value)}
                placeholder="z.B. 10 für 10%"
                required
              />
            </div>
          )}

          {/* 9. Bauer (Verursacher) */}
          {reklSelectedSale && (
            <div>
              <label>Bauer (Verursacher)</label>
              <select
                value={reklFarmerId}
                onChange={(e) => setReklFarmerId(e.target.value ? Number(e.target.value) : "")}
                onFocus={openSelectOnFocus}
                required
              >
                <option value="">– Bauer wählen –</option>
                {reklRelevantFarmers.length > 0 ? (
                  reklRelevantFarmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.farmName ? `(${f.farmName})` : ""}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Lade relevante Bauern...</option>
                )}
              </select>
              {reklRelevantFarmers.length === 0 && reklSelectedSale && (
                <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                  Keine Bauern gefunden, deren Ware für diesen Verkauf verwendet wurde.
                </p>
              )}
            </div>
          )}

          {/* 10. Datum */}
          {reklSelectedSale && (
            <div>
              <label>Reklamationsdatum</label>
              <input
                type="date"
                value={reklDate}
                onChange={(e) => setReklDate(e.target.value)}
                onFocus={openDatePickerOnFocus}
              />
            </div>
          )}

          {/* 11. Beschreibung */}
          {reklSelectedSale && (
            <div>
              <label>Beschreibung / Grund (optional)</label>
              <textarea
                value={reklComment}
                onChange={(e) => setReklComment(e.target.value)}
                rows={2}
                placeholder="z.B. Ware beschädigt, falsche Lieferung..."
              />
            </div>
          )}

          {/* Submit Button */}
          {reklSelectedSale && (
            <button
              type="submit"
              className="btn-action-primary"
              disabled={reklLoading}
            >
              {reklLoading ? "Wird angelegt..." : "Reklamation erfassen"}
            </button>
          )}
        </form>
      </ActionCard>

      {/* Liste der bestehenden Reklamationen für diese Lieferung */}
      {reklSelectedSale && reklSelectedSale.complaints.length > 0 && (
        <ActionCard
          icon="📝"
          title="Bestehende Reklamationen"
          variant="default"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {reklSelectedSale.complaints.map((c) => (
              <div
                key={c.id}
                style={{
                  background: "rgba(51, 65, 85, 0.5)",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                }}
              >
                <p><strong>{c.complaintType === "RETOURWARE" ? "🔄 Retourware" : "📉 Prozentabzug"}</strong></p>
                {(() => {
                  const sale = c.customerSale;
                  const product = safeProducts.find((p) => p.id === sale?.productId);
                  const unitsPerColli = product?.unitsPerColli;
                  const colli = unitsPerColli && unitsPerColli > 0
                    ? Math.floor(c.affectedQuantity / unitsPerColli)
                    : null;
                  const restUnits = unitsPerColli && unitsPerColli > 0
                    ? c.affectedQuantity % unitsPerColli
                    : c.affectedQuantity;
                  return (
                    <p>
                      Menge: {colli !== null
                        ? `${colli} Colli${restUnits !== 0 ? ` ${restUnits > 0 ? "+" : ""}${restUnits} Einheiten` : ""}`
                        : `${c.affectedQuantity} Einheiten`}
                    </p>
                  );
                })()}
                {c.discountPercent && <p>Prozent: {c.discountPercent}%</p>}
                <p>Bauer: {c.farmerNameSnapshot}</p>
                <p>Betrag: € {formatAmount(c.complaintAmount)}</p>
                {c.comment && <p style={{ color: "#94a3b8" }}>"{c.comment}"</p>}
                <p style={{ color: "#64748b", fontSize: "0.8125rem" }}>
                  {new Date(c.createdAt).toLocaleString("de-AT")}
                </p>
              </div>
            ))}
          </div>
        </ActionCard>
      )}
    </div>
  );
};

