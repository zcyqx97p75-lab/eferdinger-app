import React from "react";
import type {
  CookingType,
  Product,
  Customer,
  PackPlantStock,
} from "../../types";
import {
  formatAmount,
  formatKg,
  getCookingLabel,
  openDatePickerOnFocus,
  openSelectOnFocus,
} from "../../utils";
import { CalcInput } from "../CalcInput";
import { ActionCard } from "../ActionCard";
import type { Price } from "../../services";

interface VerkaufTabProps {
  isPackbetrieb: boolean;
  saleCustomerId: number | "";
  setSaleCustomerId: (value: number | "") => void;
  saleProductId: number | "";
  setSaleProductId: (value: number | "") => void;
  saleQuantityUnits: string;
  setSaleQuantityUnits: (value: string) => void;
  saleDate: string;
  setSaleDate: (value: string) => void;
  salePriceOverride: string;
  setSalePriceOverride: (value: string) => void;
  handleProductSale: (e: React.FormEvent) => Promise<void>;
  customers: Customer[];
  safeProducts: Product[];
  packPlantStocks: PackPlantStock[];
  prices: Price[];
  priceCustomerId: number | "";
  setPriceCustomerId: (value: number | "") => void;
  priceProductId: number | "";
  setPriceProductId: (value: number | "") => void;
  pricePerUnit: string;
  setPricePerUnit: (value: string) => void;
  pricePackingCostPerUnit: string;
  setPricePackingCostPerUnit: (value: string) => void;
  priceValidFrom: string;
  setPriceValidFrom: (value: string) => void;
  editingPriceId: number | null;
  setEditingPriceId: (value: number | null) => void;
  handleCreatePrice: (e: React.FormEvent) => Promise<void>;
  loadPrices: (customerId?: number, productId?: number) => Promise<void>;
}

export const VerkaufTab: React.FC<VerkaufTabProps> = ({
  isPackbetrieb,
  saleCustomerId,
  setSaleCustomerId,
  saleProductId,
  setSaleProductId,
  saleQuantityUnits,
  setSaleQuantityUnits,
  saleDate,
  setSaleDate,
  salePriceOverride,
  setSalePriceOverride,
  handleProductSale,
  customers,
  safeProducts,
  packPlantStocks,
  prices,
  priceCustomerId,
  setPriceCustomerId,
  priceProductId,
  setPriceProductId,
  pricePerUnit,
  setPricePerUnit,
  pricePackingCostPerUnit,
  setPricePackingCostPerUnit,
  priceValidFrom,
  setPriceValidFrom,
  editingPriceId,
  setEditingPriceId,
  handleCreatePrice,
  loadPrices,
}) => {
  if (!isPackbetrieb) {
    return <p>Nur für Packbetrieb sichtbar.</p>;
  }

  // Preis für Anzeige berechnen – robust, damit nichts abstürzt
  let displayAutoPrice: string | null = null;

  // Hilfsfunktion: validFrom sicher in String umwandeln
  const toDateString = (val: unknown): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (val instanceof Date) return val.toISOString();
    // Falls es ein Objekt mit toISOString ist (z.B. von JSON parsed)
    if (typeof val === "object" && val !== null && "toISOString" in val) {
      return String((val as { toISOString: () => string }).toISOString());
    }
    return String(val);
  };

  try {
    if (
      typeof saleCustomerId === "number" &&
      typeof saleProductId === "number" &&
      Array.isArray(prices) &&
      prices.length > 0
    ) {
      const relevantPrices = prices.filter(
        (p) => p.customerId === saleCustomerId && p.productId === saleProductId
      );

      if (relevantPrices.length > 0) {
        // neueste zuerst (null sicher behandeln)
        relevantPrices.sort((a, b) => {
          const aFrom = toDateString(a.validFrom);
          const bFrom = toDateString(b.validFrom);
          return bFrom.localeCompare(aFrom);
        });

        const price = relevantPrices[0];

        const priceNum = Number(price?.pricePerUnit ?? 0);
        const validFromRaw = toDateString(price?.validFrom);
        const validFromStr = validFromRaw ? validFromRaw.substring(0, 10) : "";

        if (Number.isFinite(priceNum) && priceNum > 0) {
          displayAutoPrice =
            `${formatAmount(priceNum)} €` +
            (validFromStr ? ` (gültig ab ${validFromStr})` : "");
        }
      }
    }
  } catch (err) {
    console.error("Fehler bei Preisberechnung:", err);
    displayAutoPrice = null;
  }

  return (
    <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
      {/* 1) Produktverkauf an Kunden */}
      <ActionCard
        icon="💰"
        title="Produktverkauf an Kunden verbuchen"
        variant="default"
      >
        <p style={{ fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
          Verkauf von verpackten Produkten aus dem Packbetrieb an Kunden.
          Preis wird – wenn vorhanden – automatisch aus den Kundenpreisen
          ermittelt, kann aber überschrieben werden.
        </p>

        <form onSubmit={handleProductSale}>
          <label>Kunde</label>
          <select
            value={saleCustomerId}
            onChange={(e) =>
              setSaleCustomerId(
                e.target.value ? Number(e.target.value) : ""
              )
            }
            onFocus={openSelectOnFocus}
          >
            <option value="">– Kunde wählen –</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.region ? ` (${c.region})` : ""}
              </option>
            ))}
          </select>

          <label>Produkt</label>
          <select
            value={saleProductId}
            onChange={(e) => {
              setSaleProductId(e.target.value ? Number(e.target.value) : "");
            }}
            onFocus={openSelectOnFocus}
          >
            <option value="">– Produkt wählen –</option>
            {safeProducts.map((p) => {
              const stock = packPlantStocks.find((s) => s.productId === p.id);
              const quantityUnits = stock?.quantityUnits ?? 0;
              const unitsPerColli = p.unitsPerColli;
              
              let stockDisplay = "";
              if (unitsPerColli && unitsPerColli > 0) {
                const colli = Math.floor(quantityUnits / unitsPerColli);
                const restUnits = quantityUnits % unitsPerColli;
                
                if (restUnits < 0) {
                  const adjustedColli = colli - 1;
                  const adjustedRestUnits = restUnits + unitsPerColli;
                  stockDisplay = adjustedColli !== null 
                    ? ` | Lager: ${adjustedColli} Colli${adjustedRestUnits !== 0 ? ` ${adjustedRestUnits > 0 ? "+" : ""}${adjustedRestUnits} Einheiten` : ""}`
                    : ` | Lager: ${quantityUnits} Einheiten`;
                } else {
                  stockDisplay = colli !== null 
                    ? ` | Lager: ${colli} Colli${restUnits !== 0 ? ` ${restUnits > 0 ? "+" : ""}${restUnits} Einheiten` : ""}`
                    : ` | Lager: ${quantityUnits} Einheiten`;
                }
              } else {
                stockDisplay = ` | Lager: ${quantityUnits} Einheiten`;
              }
              
              return (
              <option key={p.id} value={p.id}>
                  {p.name} – {getCookingLabel(p.cookingType as CookingType)} ({p.unitKg ?? "?"} kg){stockDisplay}
              </option>
              );
            })}
          </select>

          <label style={{ marginTop: "0.75rem" }}>Menge (Colli)</label>
          <CalcInput
            value={saleQuantityUnits}
            onChange={setSaleQuantityUnits}
            label="Menge (Colli)"
            step="1"
            min="1"
            required
          />
          {typeof saleProductId === "number" && (() => {
            const product = safeProducts.find((p) => p.id === saleProductId);
            const unitsPerColli = product?.unitsPerColli;
            if (unitsPerColli && unitsPerColli > 0) {
              return (
                <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.25rem" }}>
                  ({unitsPerColli} Einheiten je Colli)
                </div>
              );
            }
            return null;
          })()}

          <label>Verkaufsdatum</label>
          <input
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            onFocus={openDatePickerOnFocus}
          />

          <div style={{ fontSize: "0.9375rem", margin: "0.5rem 0" }}>
            {displayAutoPrice ? (
              <div>Automatisch gefundener Preis: {displayAutoPrice}</div>
            ) : (
              <div>
                Kein Preis gefunden – bitte unten manuell angeben, falls nötig.
              </div>
            )}
          </div>

          <label>Preis je Colli (optional manuell, €)</label>
          <CalcInput
            value={salePriceOverride}
            onChange={setSalePriceOverride}
            label="Preis je Colli (€)"
            step="0.01"
            min="0"
            placeholder={
              displayAutoPrice
                ? "leer lassen, um Auto-Preis zu verwenden"
                : "z.B. 1,29"
            }
          />

          <button type="submit" style={{ marginTop: "0.5rem" }}>
            Produktverkauf verbuchen
          </button>
        </form>
      </ActionCard>

      {/* Preise Kunde x Produkt */}
      <ActionCard
        icon="💵"
        title="Preise (Kunde × Produkt)"
        variant="default"
      >
        <form
          onSubmit={handleCreatePrice}
          style={{
            display: "grid",
            gap: "0.5rem",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            alignItems: "flex-end",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Kunde</label>
            <select
              value={priceCustomerId}
              onChange={(e) =>
                setPriceCustomerId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              onFocus={openSelectOnFocus}
            >
              <option value="">– Kunde –</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.region ? ` (${c.region})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Produkt</label>
            <select
              value={priceProductId}
              onChange={(e) =>
                setPriceProductId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              onFocus={openSelectOnFocus}
            >
              <option value="">– Produkt –</option>
              {safeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} – {getCookingLabel(p.cookingType)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Preis je Colli</label>
            <CalcInput
              value={pricePerUnit}
              onChange={setPricePerUnit}
              label="Preis je Colli (€)"
              step="0.01"
              placeholder="z.B. 11,61"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Abpackkosten je Colli</label>
            <CalcInput
              value={pricePackingCostPerUnit}
              onChange={setPricePackingCostPerUnit}
              label="Abpackkosten je Colli (€)"
              step="0.01"
              placeholder="z.B. 0,50"
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>gültig ab</label>
            <input
              type="date"
              value={priceValidFrom}
              onChange={(e) => setPriceValidFrom(e.target.value)}
              onFocus={openDatePickerOnFocus}
            />
          </div>

          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              gap: "0.5rem",
              marginTop: "0.25rem",
            }}
          >
            <button type="submit">{editingPriceId !== null ? "Ändern" : "Speichern"}</button>
            {editingPriceId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingPriceId(null);
                  setPriceCustomerId("");
                  setPriceProductId("");
                  setPricePerUnit("");
                  setPricePackingCostPerUnit("");
                  setPriceValidFrom("");
                }}
                style={{ background: "#6b7280" }}
              >
                Abbrechen
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const cId =
                  typeof priceCustomerId === "number"
                    ? priceCustomerId
                    : undefined;
                const pId =
                  typeof priceProductId === "number"
                    ? priceProductId
                    : undefined;
                loadPrices(cId, pId).catch(console.error);
              }}
            >
              Preise laden / filtern
            </button>
          </div>
        </form>

        <table style={{ width: "100%", fontSize: "0.9375rem" }}>
          <thead>
            <tr>
              <th>Kunde</th>
              <th>Produkt</th>
              <th>Kocheigenschaft</th>
              <th>Preis je Colli</th>
              <th>Abpackkosten</th>
              <th>gültig ab</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.id}>
                <td>{p.customer?.name ?? ""}</td>
                <td>{p.product?.name ?? ""}</td>
                <td>{p.product?.cookingType ? getCookingLabel(p.product.cookingType as CookingType) : "-"}</td>
                <td>{formatKg(p.pricePerUnit).replace(" kg", "")} €</td>
                <td>{(p as any).packingCostPerUnit ? formatAmount(Number((p as any).packingCostPerUnit)) + " €" : "-"}</td>
                <td>{p.validFrom?.substring(0, 10)}</td>
                <td>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const price = prices.find((pr) => pr.id === p.id);
                      if (price) {
                        setEditingPriceId(price.id);
                        setPriceCustomerId(price.customerId);
                        setPriceProductId(price.productId);
                        setPricePerUnit(String(price.pricePerUnit));
                        setPricePackingCostPerUnit((price as any).packingCostPerUnit ? String((price as any).packingCostPerUnit) : "");
                        setPriceValidFrom(price.validFrom?.substring(0, 10) || "");
                        // Scroll zum Formular
                        setTimeout(() => {
                          const formElement = document.querySelector('form[onSubmit]');
                          if (formElement) {
                            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }
                    }}
                    style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem" }}
                  >
                    Bearbeiten
                  </button>
                </td>
              </tr>
            ))}
            {prices.length === 0 && (
              <tr>
                <td colSpan={7}>
                  Noch keine Preise erfasst oder Filter liefert keine Daten.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ActionCard>
    </div>
  );
};


