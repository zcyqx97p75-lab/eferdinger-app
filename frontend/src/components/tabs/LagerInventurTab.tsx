import React from "react";
import type { CookingType, Product, PackPlantStock } from "../../types";
import { getCookingLabel, openSelectOnFocus } from "../../utils";
import { CalcInput } from "../CalcInput";
import { ActionCard } from "../ActionCard";

interface LagerInventurTabProps {
  isPackbetrieb: boolean;
  packPlantStocks: PackPlantStock[];
  safeProducts: Product[];
  invProductId: number | "";
  setInvProductId: (value: number | "") => void;
  invQuantityUnits: string;
  setInvQuantityUnits: (value: string) => void;
  invPricePerUnit: string;
  setInvPricePerUnit: (value: string) => void;
  handleProductInventory: (e: React.FormEvent) => Promise<void>;
}

export const LagerInventurTab: React.FC<LagerInventurTabProps> = ({
  isPackbetrieb,
  packPlantStocks,
  safeProducts,
  invProductId,
  setInvProductId,
  invQuantityUnits,
  setInvQuantityUnits,
  invPricePerUnit,
  setInvPricePerUnit,
  handleProductInventory,
}) => {
  if (!isPackbetrieb) {
    return <p>Nur für Packbetrieb sichtbar.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Packbetriebslager */}
      <ActionCard
        icon="📦"
        title="Packbetriebslager"
        variant="default"
      >
        <p style={{ fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
          Hier siehst du den aktuellen Bestand im Packbetriebslager je Produkt.
        </p>

        {/* Aktuelle Lagerstände im Packbetrieb */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "0.75rem" }}>
          {packPlantStocks.filter((s) => s.quantityUnits !== 0).length === 0 ? (
            <p style={{ fontSize: "0.9375rem", color: "#94a3b8", textAlign: "center", padding: "1rem" }}>
              Derzeit kein Bestand im Packbetriebslager erfasst.
            </p>
          ) : (
            packPlantStocks.filter((s) => s.quantityUnits !== 0).map((s) => {
              const unitsPerColli = s.product?.unitsPerColli;
              const quantityUnits = s.quantityUnits;
              let colli: number | null = null;
              let restUnits: number = 0;
              
              if (unitsPerColli && unitsPerColli > 0) {
                colli = Math.floor(quantityUnits / unitsPerColli);
                restUnits = quantityUnits % unitsPerColli;
                
                if (restUnits < 0) {
                  colli -= 1;
                  restUnits += unitsPerColli;
                }
              }
              
              const stockDisplay = colli !== null 
                ? `${colli} Colli${restUnits !== 0 ? ` ${restUnits > 0 ? "+" : ""}${restUnits} Einheiten` : ""}`
                : `${quantityUnits} Einheiten`;
              
              return (
                <div
                  key={s.id}
                  style={{
                    background: "rgba(51, 65, 85, 0.5)",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    border: "1px solid #475569",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "#f8fafc", marginBottom: "0.25rem" }}>
                        {s.product?.name ?? `Produkt #${s.productId}`}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#cbd5e1" }}>
                        {s.product?.cookingType ? getCookingLabel(s.product.cookingType as CookingType) : "-"} • {s.product?.unitKg ?? "-"} kg
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginLeft: "1rem" }}>
                      <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Lagerstand</div>
                      <div style={{ 
                        fontSize: "1.5rem", 
                        fontWeight: 700, 
                        color: quantityUnits > 0 ? "#10b981" : "#64748b"
                      }}>
                        {stockDisplay}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ActionCard>

      {/* Inventur verpackter Produkte */}
      <ActionCard
        icon="📝"
        title="Inventur verpackter Produkte"
        variant="default"
      >
        <p style={{ fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
          Hier kannst du den Bestand per Inventur auf einen neuen Stand setzen.
          Jede Änderung wird als Bewegung in der Datenbank protokolliert.
        </p>

        <form onSubmit={handleProductInventory}>
          <label>Produkt</label>
          <select
            value={invProductId}
            onChange={(e) =>
              setInvProductId(e.target.value ? Number(e.target.value) : "")
            }
            onFocus={openSelectOnFocus}
          >
            <option value="">– Produkt wählen –</option>
            {safeProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} – {getCookingLabel(p.cookingType as CookingType)}
              </option>
            ))}
          </select>

          {typeof invProductId === "number" && (() => {
            const stock = packPlantStocks.find((s) => s.productId === invProductId);
            const product = safeProducts.find((p) => p.id === invProductId);
            const unitsPerColli = product?.unitsPerColli;
            const currentUnits = stock?.quantityUnits ?? 0;
            
            let currentColli: number | null = null;
            let restUnits: number = 0;
            
            if (unitsPerColli && unitsPerColli > 0) {
              currentColli = Math.floor(currentUnits / unitsPerColli);
              restUnits = currentUnits % unitsPerColli;
              
              if (restUnits < 0) {
                currentColli -= 1;
                restUnits += unitsPerColli;
              }
            }
            
            return (
            <div style={{ fontSize: "0.9375rem", margin: "0.5rem 0" }}>
              Aktueller Bestand:&nbsp;
                {currentColli !== null
                  ? `${currentColli} Colli${restUnits !== 0 ? ` ${restUnits > 0 ? "+" : ""}${restUnits} Einheiten` : ""}`
                  : `${currentUnits} Einheiten`}
                {unitsPerColli && unitsPerColli > 0 && (
                  <span style={{ fontSize: "0.8125rem", color: "#6b7280", marginLeft: "0.5rem" }}>
                    ({unitsPerColli} Einheiten/Colli)
                  </span>
                )}
              </div>
            );
          })()}

          <label>Neuer Bestand (Colli)</label>
          <CalcInput
            value={invQuantityUnits}
            onChange={setInvQuantityUnits}
            label="Neuer Bestand (Colli)"
            step="1"
            min="0"
            placeholder="z.B. 10"
          />

          <label>Preis je Einheit (optional, für Bewertung)</label>
          <CalcInput
            value={invPricePerUnit}
            onChange={setInvPricePerUnit}
            label="Preis je Einheit (€)"
            step="0.01"
            min="0"
            placeholder="z.B. 1,29"
          />

          <button type="submit" style={{ marginTop: "0.5rem" }}>
            Inventur buchen
          </button>
        </form>
      </ActionCard>
    </div>
  );
};


