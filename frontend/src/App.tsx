import React, { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "/api";
console.log("API_URL FRONTEND =", API_URL);
// ==== Typen ====

// 1) ENUM-ähnliche Typen
type CookingType = "FESTKOCHEND" | "VORWIEGEND_FESTKOCHEND" | "MEHLIG";
type VarietyQuality = "Q1" | "Q2" | "UEBERGROESSE";
type CookingFilter = CookingType | "alle";
type QualityFilter = VarietyQuality | "alle";

// Adresse eines Bauern
type FarmerAddress = {
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
};

// 2) Bauern
type Farmer = {
  id: number;
  name: string;
  farmName?: string | null;          // Hofname für Anzeige
  address?: FarmerAddress | null;    // Straße/PLZ/Ort
  fullAddress?: string | null;
  ggnNumber?: string | null;
  loginEmail?: string | null;
  loginPassword?: string | null;
  isFlatRate?: boolean;
  flatRateNote?: string | null;
};

// 3) Sorten
interface Variety {
  id: number;
  name: string;
  cookingType: CookingType;
  quality: VarietyQuality;
}

// 4) Produkte
type Product = {
  id: number;
  name: string;
  cookingType: CookingType;
  packagingType: string;
  productNumber?: string | null;
  unitKg?: number | null;            // Packungsgröße
  unitsPerColli?: number | null;     // Einheiten je Colli
  collisPerPallet?: number | null;   // Colli je Palette
};

type PackPlantStock = {
  id: number;
  packPlantId: number;
  productId: number;
  quantityUnits: number;

  // Snapshots aus applyPackPlantStockChange
  cookingTypeSnapshot: string | null;
  packPlantNameSnapshot: string | null;
  productNameSnapshot: string | null;

  // echte Relationen, falls vom Backend mitgeschickt
  packPlant?: {
    id: number;
    name: string;
  } | null;

  product?: {
    id: number;
    name: string;
    unitKg: number;
    cookingType?: string; // optional, weil nicht immer geladen
    packagingType?: string;
  } | null;
};

type PackPlant = {
  id: number;
  name: string;
  vatId?: string | null;
};

// 5) Kunden
type Customer = {
  id: number;
  name: string;
  region?: string | null;
};

type Price = {
  id: number;
  customerId: number;
  productId: number;
  pricePerUnit: number;
  packingCostPerUnit?: number | null;
  validFrom: string; // ISO-String
  customer?: Customer | null;
  product?: Product | null;
};

type FarmerStock = {
  id: number;
  farmerId: number;
  varietyId: number;
  quantityTons: number;  // wir verwenden kg, Name lassen wir vorerst
  farmer?: Farmer;
  variety?: Variety;
};

type PackStationStock = {
  id: number;
  packStationId: number;
  farmerId: number;
  varietyId: number;
  quantityKg: number;
  farmer?: Farmer;
  variety?: Variety;
};

type FarmerPackStat = {
  varietyId: number;
  varietyName: string;
  cookingType: string;
  quality: string;
  deliveredKg: number;
  packedKg: number;
  currentKg: number;
  wasteKg: number;
  inventoryZeroKg: number;
  totalLossKg: number;
  yieldPercent: number | null;
  lossPercent: number | null;
  stockPercent: number | null; // NEU
};

type OrganizerDelivery = {
  id: number;
  date: string;
  farmerId: number;
  farmerName: string;
  varietyId: number;
  varietyName: string;
  cookingType: CookingType | null;
  quality: VarietyQuality | null;
  quantityKg: number;
};

type DeliveryPlanRow = {
  id: number;
  weekStart: string;
  farmerId: number;
  farmerName: string;
  cookingType: CookingType;
  plannedKg: number;
};

// Aggregierte Zeile: Woche + Bauer + Kochtyp
type DeliverySummaryRow = {
  key: string;
  weekStart: string;
  farmerId: number;
  farmerName: string;
  cookingType: CookingType | "UNBEKANNT";
  deliveredKg: number;
  plannedKg: number;
  diffKg: number;
  coveragePercent: number | null;
};

// 7) User
type CurrentUser = {
  id: number;
  name: string;
  role: "ORGANISATOR" | "FARMER" | "PACKSTELLE" | "PACKBETRIEB" | "EG_ADMIN";
  farmerId?: number | null;
};

// Bestätigung für Inventur / Verkäufe
type ConfirmAction = {
  title: string;
  message: string | React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

type Tab = "stamm" | "farmerStock" | "packstation" | "stats" | "verkauf" | "reklamation" | "statistik" | "abrechnungen" | "lagerInventur" | "kalkulationen";

// === Helfer ===

function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) return "0,00 €";
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (Number.isNaN(num) || !Number.isFinite(num)) return "0,00 €";
  
  // Tausender-Trennzeichen: Leerzeichen, Dezimaltrennung: Komma
  const formatted = Math.abs(num).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return num < 0 ? `-${formatted} €` : `${formatted} €`;
}

function formatKg(value: number | string | null | undefined): string {
  if (value == null) return "0,00";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(num)) return "0,00";
  
  // Dezimaltrennung: Komma
  const parts = num.toFixed(2).split(".");
  const intPart = parts[0];
  const decPart = parts[1];
  
  // Tausendertrennung: geschütztes Leerzeichen (Narrow No-Break Space U+202F)
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  
  return `${formattedInt},${decPart}`;
}

function parseKg(value: string): number {
  if (!value) return 0;
  // Entferne alle Leerzeichen (inkl. geschützte Leerzeichen U+202F) und ersetze Komma durch Punkt
  const v = value.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(v);
  return Number.isNaN(num) ? 0 : num;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  const num = value.toFixed(1);
  const parts = num.split(".");
  const intPart = parts[0];
  const decPart = parts[1];
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  return `${formattedInt},${decPart} %`;
}

// Formatierung für Beträge (Euro) mit Tausendertrennung und Komma
function formatAmount(value: number | string | null | undefined): string {
  if (value == null) return "0,00";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(num)) return "0,00";
  
  const parts = num.toFixed(2).split(".");
  const intPart = parts[0];
  const decPart = parts[1];
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  
  return `${formattedInt},${decPart}`;
}

function getCookingLabel(ct?: CookingType) {
  switch (ct) {
    case "FESTKOCHEND":
      return "festkochend";
    case "VORWIEGEND_FESTKOCHEND":
      return "vorw. festk.";
    case "MEHLIG":
      return "mehlig";
    default:
      return ct ?? "unbekannt";
  }
}

// Öffnet Dropdown sofort bei Fokus (Tab-Navigation oder Touch)
// Öffnet den nativen Kalender für Datumsfelder
const openDatePickerOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  // Auf mobilen Geräten öffnet type="date" automatisch den Kalender beim Fokussieren
  // Auf Desktop-Browsern fokussieren wir das Feld, damit der Benutzer auf das Kalender-Icon klicken kann
  // Wir können auch einen Click-Event auslösen, um den Kalender zu öffnen (funktioniert in den meisten Browsern)
  if (e.target.type === 'date') {
    // Kleine Verzögerung, damit der Focus-Event abgeschlossen ist
    setTimeout(() => {
      e.target.showPicker?.();
    }, 0);
  }
};

const openSelectOnFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
  // Simuliere mousedown um das native Dropdown zu öffnen
  const mouseEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  setTimeout(() => {
    e.target.dispatchEvent(mouseEvent);
  }, 0);
};

// ---------------------------------------------
// NumericCalculator - Taschenrechner-Eingabe für Zahlenfelder
// ---------------------------------------------

type CalcInputProps = {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  step?: string;
  min?: string;
  placeholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
  confirmMessage?: string;
  confirmTitle?: string;
  onConfirmedChange?: (val: string) => void;
  setConfirmAction?: (action: ConfirmAction | null) => void;
};

function CalcInput({
  value,
  onChange,
  label,
  step = "1",
  min: _min = "0",
  placeholder,
  required,
  style,
  confirmMessage,
  confirmTitle = "Wert übernehmen?",
  onConfirmedChange,
  setConfirmAction,
}: CalcInputProps) {
  void _min; // reserviert für spätere Validierung
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState("");
  const [calcExpression, setCalcExpression] = useState("");
  const [lastOperator, setLastOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Prüfen ob es ein Dezimalfeld ist
  const isDecimal = step.includes(".");

  // Formatierung mit Tausendertrennzeichen (Leerzeichen nach DIN 5008)
  const formatWithThousands = (numStr: string): string => {
    if (!numStr || numStr === "0") return numStr;
    const parts = numStr.split(",");
    const intPart = parts[0];
    const decPart = parts[1];
    // Tausendertrennzeichen als Leerzeichen (DIN 5008)
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;
  };

  const openCalculator = () => {
    setCalcDisplay(value || "0");
    setCalcExpression("");
    setLastOperator(null);
    setWaitingForOperand(false);
    setShowCalc(true);
  };

  const closeCalculator = () => {
    setShowCalc(false);
  };

  const calculate = (expr: string): number => {
    try {
      // Expression aufbereiten: Komma zu Punkt, × zu *, ÷ zu /
      let processed = expr.replace(/,/g, ".").replace(/×/g, "*").replace(/÷/g, "/");
      
      // Prozent-Berechnungen auflösen (z.B. 100+10% = 110)
      processed = processed.replace(/(\d+\.?\d*)\s*([+\-])\s*(\d+\.?\d*)%/g, (_, base, op, percent) => {
        const baseNum = parseFloat(base);
        const percentNum = parseFloat(percent);
        const percentValue = (baseNum * percentNum) / 100;
        return op === "+" ? `${baseNum + percentValue}` : `${baseNum - percentValue}`;
      });
      
      // Einfache Prozent am Ende (z.B. 50% = 0.5)
      processed = processed.replace(/(\d+\.?\d*)%/g, (_, num) => `${parseFloat(num) / 100}`);
      
      // Sichere Auswertung (nur Zahlen und Operatoren)
      if (!/^[\d\s+\-*/.()]+$/.test(processed)) {
        return parseFloat(processed) || 0;
      }
      
      // eslint-disable-next-line no-eval
      const result = Function(`"use strict"; return (${processed})`)();
      return typeof result === "number" && isFinite(result) ? result : 0;
    } catch {
      return 0;
    }
  };

  const formatResult = (num: number): string => {
    if (isDecimal) {
      const parts = num.toFixed(2).split(".");
      const intPart = parts[0];
      const decPart = parts[1];
      const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
      return `${formattedInt},${decPart}`;
    }
    const rounded = Math.round(num).toString();
    return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  };

  const handleDigit = (digit: string) => {
    if (waitingForOperand) {
      setCalcDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setCalcDisplay(calcDisplay === "0" ? digit : calcDisplay + digit);
    }
  };

  const handleComma = () => {
    if (waitingForOperand) {
      setCalcDisplay("0,");
      setWaitingForOperand(false);
      return;
    }
    if (!calcDisplay.includes(",") && !calcDisplay.includes(".")) {
      setCalcDisplay(calcDisplay + ",");
    }
  };

  const handleOperator = (op: string) => {
    const currentValue = calcDisplay.replace(",", ".");
    
    if (lastOperator && !waitingForOperand) {
      const result = calculate(calcExpression + currentValue);
      setCalcDisplay(formatResult(result));
      setCalcExpression(formatResult(result) + op);
    } else if (calcExpression && waitingForOperand) {
      // Operator wechseln
      setCalcExpression(calcExpression.slice(0, -1) + op);
    } else {
      setCalcExpression(currentValue + op);
    }
    
    setLastOperator(op);
    setWaitingForOperand(true);
  };

  const handlePercent = () => {
    const currentValue = parseFloat(calcDisplay.replace(",", "."));
    
    if (calcExpression && lastOperator) {
      // z.B. 100 + 10% = 100 + (100 * 10 / 100) = 110
      const baseValue = calculate(calcExpression.slice(0, -1));
      const percentValue = (baseValue * currentValue) / 100;
      
      if (lastOperator === "+" || lastOperator === "-") {
        setCalcDisplay(formatResult(percentValue));
      } else {
        setCalcDisplay(formatResult(currentValue / 100));
      }
    } else {
      // Einfach Prozent: 50% = 0.5
      setCalcDisplay(formatResult(currentValue / 100));
    }
  };

  const handleEquals = () => {
    if (!calcExpression) return;
    
    const currentValue = calcDisplay.replace(",", ".");
    const result = calculate(calcExpression + currentValue);
    setCalcDisplay(formatResult(result));
    setCalcExpression("");
    setLastOperator(null);
    setWaitingForOperand(false);
  };

  const handleClear = () => {
    setCalcDisplay("0");
    setCalcExpression("");
    setLastOperator(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    if (waitingForOperand) return;
    if (calcDisplay.length > 1) {
      setCalcDisplay(calcDisplay.slice(0, -1));
    } else {
      setCalcDisplay("0");
    }
  };

  const handleConfirm = () => {
    // Erst berechnen falls noch eine Expression offen ist
    let finalValue = calcDisplay;
    if (calcExpression) {
      const currentValue = calcDisplay.replace(",", ".");
      const result = calculate(calcExpression + currentValue);
      finalValue = formatResult(result);
    }
    
    // Wert normalisieren (Komma zu Punkt für die Speicherung)
    const normalizedValue = finalValue.replace(",", ".");
    
    if (setConfirmAction && confirmMessage) {
      // Mit Bestätigung
      setShowCalc(false);
      setConfirmAction({
        title: confirmTitle,
        message: confirmMessage.replace("{value}", finalValue),
        confirmLabel: "Ja, übernehmen",
        cancelLabel: "Abbrechen",
        onConfirm: () => {
          if (onConfirmedChange) {
            onConfirmedChange(normalizedValue);
          } else {
            onChange(normalizedValue);
          }
          setConfirmAction(null);
        },
      });
    } else {
      // Ohne Bestätigung
      onChange(normalizedValue);
      setShowCalc(false);
    }
  };

  // Tastatur-Event-Handler
  useEffect(() => {
    if (!showCalc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
        e.preventDefault();
      } else if (e.key === "," || e.key === ".") {
        handleComma();
        e.preventDefault();
      } else if (e.key === "+") {
        handleOperator("+");
        e.preventDefault();
      } else if (e.key === "-") {
        handleOperator("-");
        e.preventDefault();
      } else if (e.key === "*") {
        handleOperator("×");
        e.preventDefault();
      } else if (e.key === "/") {
        handleOperator("÷");
        e.preventDefault();
      } else if (e.key === "%") {
        handlePercent();
        e.preventDefault();
      } else if (e.key === "Enter") {
        if (calcExpression) {
          handleEquals();
        } else {
          handleConfirm();
        }
        e.preventDefault();
      } else if (e.key === "Escape") {
        closeCalculator();
        e.preventDefault();
      } else if (e.key === "Backspace") {
        handleBackspace();
        e.preventDefault();
      } else if (e.key === "c" || e.key === "C") {
        handleClear();
        e.preventDefault();
      } else if (e.key === "=") {
        handleEquals();
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCalc, calcDisplay, calcExpression, lastOperator, waitingForOperand]);

  const calcButtonStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
    fontSize: "clamp(1rem, 5vw, 1.8rem)",
    border: "none",
    borderRadius: "clamp(0.25rem, 1.5vw, 0.5rem)",
    cursor: "pointer",
    background: "#374151",
    color: "#f9fafb",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    boxSizing: "border-box",
    overflow: "hidden",
    flexShrink: 1,
  };

  const calcOperatorStyle: React.CSSProperties = {
    ...calcButtonStyle,
    background: "#4b5563",
  };

  const calcActionStyle: React.CSSProperties = {
    ...calcButtonStyle,
    background: "#16a34a",
    fontWeight: 600,
    fontSize: "clamp(0.875rem, 3.5vw, 1rem)",
  };

  const calcCancelStyle: React.CSSProperties = {
    ...calcButtonStyle,
    background: "#dc2626",
    fontWeight: 600,
    fontSize: "clamp(0.875rem, 3.5vw, 1rem)",
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        inputMode="none"
        className="number-input"
        value={value}
        readOnly
        onClick={openCalculator}
        onFocus={openCalculator}
        placeholder={placeholder}
        required={required}
        style={{
          cursor: "pointer",
          ...style,
        }}
      />

      {showCalc && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            boxSizing: "border-box",
          }}
        >
          {/* Hintergrund abdunkeln - Klick schließt Calculator */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
            }}
            onClick={closeCalculator}
          />

          {/* Eigentliche Calculator-Box */}
          <div 
            className="calculator-container"
            style={{
              position: "relative",
              zIndex: 10,
              width: "100%",
              maxWidth: "350px",
              maxHeight: "calc(100vh - 2rem)",
              background: "#1f2937",
              borderRadius: "0.75rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                padding: "clamp(0.75rem, 3vw, 1rem)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
            {/* Label */}
            {label && (
              <div style={{ 
                fontSize: "clamp(0.9rem, 3vw, 1rem)", 
                color: "#e2e8f0", 
                marginBottom: "0.375rem",
                textAlign: "center",
                flexShrink: 0,
                fontWeight: 500,
              }}>
                {label}
              </div>
            )}

            {/* Expression Anzeige */}
            {calcExpression && (
              <div style={{
                fontSize: "clamp(0.875rem, 3vw, 1rem)",
                color: "#cbd5e1",
                textAlign: "right",
                marginBottom: "0.25rem",
                fontFamily: "monospace",
                flexShrink: 0,
              }}>
                {calcExpression.replace(".", ",")}
              </div>
            )}

            {/* Display */}
            <div 
              className="calc-display"
              style={{
                background: "#111827",
                padding: "clamp(0.4rem, 2vw, 0.5rem) clamp(0.5rem, 2vw, 0.75rem)",
                borderRadius: "clamp(0.375rem, 1.5vw, 0.5rem)",
                fontSize: "clamp(1.2rem, 5vw, 2rem)",
                textAlign: "right",
                marginBottom: "clamp(0.35rem, 1.5vw, 0.5rem)",
                fontFamily: "monospace",
                color: "#f9fafb",
                minHeight: "clamp(2rem, 8vw, 2.5rem)",
                wordBreak: "break-all",
                overflowX: "auto",
                flexShrink: 0,
              }}>
              {formatWithThousands(calcDisplay)}
            </div>

            {/* Tasten-Grid */}
            <div 
              className="calc-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gridTemplateRows: "repeat(5, minmax(clamp(2.5rem, 10vw, 3.5rem), 1fr))",
                gap: "clamp(0.25rem, 1.5vw, 0.5rem)",
                width: "100%",
                boxSizing: "border-box",
              }}>
              {/* Zeile 1 */}
              <button type="button" style={{ ...calcButtonStyle, background: "#ef4444" }} onClick={handleClear}>C</button>
              <button type="button" style={calcOperatorStyle} onClick={handleBackspace}>←</button>
              <button type="button" style={calcOperatorStyle} onClick={handlePercent}>%</button>
              <button type="button" style={calcOperatorStyle} onClick={() => handleOperator("÷")}>÷</button>

              {/* Zeile 2 */}
              <button type="button" style={calcButtonStyle} onClick={() => handleDigit("7")}>7</button>
              <button type="button" style={calcButtonStyle} onClick={() => handleDigit("8")}>8</button>
              <button type="button" style={calcButtonStyle} onClick={() => handleDigit("9")}>9</button>
              <button type="button" style={calcOperatorStyle} onClick={() => handleOperator("×")}>×</button>

              {/* Zeile 3 */}
              <button type="button" style={calcButtonStyle} onClick={() => handleDigit("4")}>4</button>
              <button type="button" style={calcButtonStyle} onClick={() => handleDigit("5")}>5</button>
              <button type="button" style={calcButtonStyle} onClick={() => handleDigit("6")}>6</button>
              <button type="button" style={calcOperatorStyle} onClick={() => handleOperator("-")}>−</button>

              {/* Zeile 4 */}
              <button type="button" style={calcButtonStyle} onClick={() => handleDigit("1")}>1</button>
              <button type="button" style={calcButtonStyle} onClick={() => handleDigit("2")}>2</button>
              <button type="button" style={calcButtonStyle} onClick={() => handleDigit("3")}>3</button>
              <button type="button" style={calcOperatorStyle} onClick={() => handleOperator("+")}>+</button>

              {/* Zeile 5 */}
              <button type="button" style={{ ...calcButtonStyle, gridColumn: "1 / 3" }} onClick={() => handleDigit("0")}>0</button>
              <button type="button" style={calcButtonStyle} onClick={handleComma}>,</button>
              <button type="button" style={{ ...calcOperatorStyle, background: "#2563eb" }} onClick={handleEquals}>=</button>
            </div>

            {/* Aktions-Buttons */}
            <div 
              className="calc-actions"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "clamp(0.25rem, 1.5vw, 0.5rem)",
                marginTop: "clamp(0.5rem, 2vw, 0.75rem)",
                width: "100%",
                boxSizing: "border-box",
              }}>
              <button type="button" className="calc-btn-cancel" style={{ ...calcCancelStyle, height: "clamp(2.5rem, 10vw, 3.5rem)" }} onClick={closeCalculator}>
                Abbrechen
              </button>
              <button type="button" className="calc-btn-confirm" style={{ ...calcActionStyle, height: "clamp(2.5rem, 10vw, 3.5rem)" }} onClick={handleConfirm}>
                Übernehmen
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------
// ActionCard - Wiederverwendbare Funktions-Karte
// ---------------------------------------------

type ActionCardProps = {
  title: string;
  description?: string;
  icon?: string;
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
};

function ActionCard({ 
  title, 
  description, 
  icon, 
  children, 
  variant = "default" 
}: ActionCardProps) {
  // Rahmenfarben je nach Variante
  const borderColors: Record<string, string> = {
    default: "#475569",
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  };

  // Box-Style mit sichtbarem Rahmen und Hintergrund
  const boxStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    marginBottom: "1.5rem",
    borderRadius: "1rem",
    border: `2px solid ${borderColors[variant]}`,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    padding: "1.25rem",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
  };

  // Header-Style
  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
    marginBottom: "0.5rem",
  };

  // Icon-Style
  const iconStyle: React.CSSProperties = {
    fontSize: "1.5rem",
    lineHeight: 1,
  };

  // Titel-Style
  const titleStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#f8fafc",
    margin: 0,
  };

  // Beschreibungs-Style
  const descriptionStyle: React.CSSProperties = {
    fontSize: "0.9375rem",
    color: "#cbd5e1",
    margin: "0 0 1rem 0",
    lineHeight: 1.5,
  };

  // Content-Style
  const contentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  };

  return (
    <div style={boxStyle}>
      <div style={headerStyle}>
        {icon && <span style={iconStyle}>{icon}</span>}
        <h2 style={titleStyle}>{title}</h2>
      </div>
      {description && (
        <p style={descriptionStyle}>{description}</p>
      )}
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------
// Summenberechnung und Anzeige nach Kocheigenschaft
// ---------------------------------------------
type CookingKey = "FESTKOCHEND" | "VORWIEGEND_FESTKOCHEND" | "MEHLIG" | "UNBEKANNT";

function calcCookingSums(rows: any[]) {
  const sums: Record<CookingKey | "total", number> = {
    FESTKOCHEND: 0,
    VORWIEGEND_FESTKOCHEND: 0,
    MEHLIG: 0,
    UNBEKANNT: 0,
    total: 0,
  };

  for (const r of rows) {
    // im Bauernlager ist quantityTons = kg
    const kg = Number(r.quantityTons ?? r.quantityKg ?? 0);

    // zuerst nach Sorte schauen, falls nicht vorhanden auf Produkt zurückfallen
    const cookingTypeRaw = r.variety?.cookingType || r.product?.cookingType;
    const cookingTypeStr = String(cookingTypeRaw || "").trim().toUpperCase();

    let key: CookingKey = "UNBEKANNT";
    if (cookingTypeStr === "FESTKOCHEND") {
      key = "FESTKOCHEND";
    } else if (cookingTypeStr === "VORWIEGEND_FESTKOCHEND") {
      key = "VORWIEGEND_FESTKOCHEND";
    } else if (cookingTypeStr === "MEHLIG") {
      key = "MEHLIG";
    }

    sums[key] += kg;
    sums.total += kg;
  }

  return sums;
}

function SummaryRow({ label, sums }: { label: string; sums: ReturnType<typeof calcCookingSums> }) {
  const boxStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "0.5rem",
    marginTop: "0.5rem",
  };
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{label}</div>
      <div style={boxStyle}>
        <div style={{
          background: "#1e40af",
  color: "#f9fafb",
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  display: "flex",
  justifyContent: "space-between",
  fontSize: "0.9rem",
        }}>
          <span>festkochend</span><span>{formatKg(sums.FESTKOCHEND)} kg</span>
        </div>
        <div style={{
          background: "#dc2626",
          color: "#f9fafb",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.9rem",
        }}>
          <span>vorw. festk.</span><span>{formatKg(sums.VORWIEGEND_FESTKOCHEND)} kg</span>
        </div>
        <div style={{
          background: "#eab308",
          color: "#000",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.9rem",
        }}>
          <span>mehlig</span><span>{formatKg(sums.MEHLIG)} kg</span>
        </div>
        <div style={{
          background: "#374151",
          color: "#f9fafb",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          border: "1px solid #10b981",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.9rem",
        }}>
          <span>Gesamt</span><span style={{ color: "#10b981", fontWeight: 700 }}>{formatKg(sums.total)} kg</span>
        </div>
      </div>
    </div>
  );
}

// ==== App ====

export default function App() {
  const [tab, setTab] = useState<Tab>("farmerStock");
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const safeProducts = Array.isArray(products) ? products : [];
  const safeFarmers = Array.isArray(farmers) ? farmers : [];
  const [customers, setCustomers] = useState<Customer[]>([]);
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const [packStations, setPackStations] = useState<{ id: number; name: string }[]>([]);
  const [farmerStocks, setFarmerStocks] = useState<FarmerStock[]>([]);
  const [farmerPackStats, setFarmerPackStats] = useState<FarmerPackStat[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [statsMaxDeliveries, setStatsMaxDeliveries] = useState<string>("10");
  const safeVarieties = Array.isArray(varieties) ? varieties : [];
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
const [planYear, setPlanYear] = useState<number>(new Date().getFullYear());
const [planFarmerId, setPlanFarmerId] = useState<number | "">("");
const [statsCookingFilter, setStatsCookingFilter] =
  useState<CookingType | "alle">("alle");
  // Organisator-Statistik
  const [organizerDeliveries, setOrganizerDeliveries] =
    useState<OrganizerDelivery[]>([]);
  const [deliveryPlans, setDeliveryPlans] =
    useState<DeliveryPlanRow[]>([]);
  const [deliveryWeeksBack, setDeliveryWeeksBack] =
    useState<string>("52");
  const [planWeeksForward, setPlanWeeksForward] =
    useState<string>("2");
   
  // Packstelle: 0-Inventur Formular
const [packZeroSelection, setPackZeroSelection] = useState<string>("");
const [packZeroComment, setPackZeroComment] = useState<string>("");

  // Packstelle: Tab-Navigation für Bereiche
  const [packCarouselIndex, setPackCarouselIndex] = useState<number>(0);

  // Packstellen-Lager + Formulare
  const [packStationStocks, setPackStationStocks] = useState<PackStationStock[]>([]);

  // Letzte Buchungen für Packstelle
  const [recentPackagingRuns, setRecentPackagingRuns] = useState<any[]>([]);
  const [recentWasteMovements, setRecentWasteMovements] = useState<any[]>([]);
  const [recentInventoryZeroMovements, setRecentInventoryZeroMovements] = useState<any[]>([]);

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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

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
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [selectedFarmerId, setSelectedFarmerId] = useState<number | "">("");
  const [newFarmerPassword, setNewFarmerPassword] = useState("");
  const [farmerPasswordResetError, setFarmerPasswordResetError] = useState<string | null>(null);

  const [productName, setProductName] = useState("");
  const [productCookingType, setProductCookingType] =
    useState<CookingType>("FESTKOCHEND");
  const [productPackagingType, setProductPackagingType] = useState("");
  const [productNumber, setProductNumber] = useState("");
  const [productUnitKg, setProductUnitKg] = useState("2");
  const [productUnitsPerColli, setProductUnitsPerColli] = useState("");
  const [productCollisPerPallet, setProductCollisPerPallet] = useState("");
  const [productTaxRateId, setProductTaxRateId] = useState<number | "">("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  
  const [varietyName, setVarietyName] = useState("");
  const [varietyCookingType, setVarietyCookingType] =
    useState<CookingType>("FESTKOCHEND");
  const [varietyQuality, setVarietyQuality] =
  useState<VarietyQuality>("Q1");
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
  type VarietyQualityPriceType = {
    id: number;
    quality: VarietyQuality;
    validFrom: string;
    validTo: string | null;
    pricePerKg: number;
  };
  const [qualityPrices, setQualityPrices] = useState<VarietyQualityPriceType[]>([]);
  const [qpQuality, setQpQuality] = useState<VarietyQuality>("Q1");
  const [qpValidFrom, setQpValidFrom] = useState("");
  const [qpValidTo, setQpValidTo] = useState("");
  const [qpPricePerKg, setQpPricePerKg] = useState("");
  const [qpTaxRateId, setQpTaxRateId] = useState<number | "">("");
  const [editingQualityPriceId, setEditingQualityPriceId] = useState<number | null>(null);
  
  // Tax Rates
  type TaxRate = {
    id: number;
    name: string;
    ratePercent: number;
    description?: string | null;
  };
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);

  // Planmengen manuell erfassen
  const [planFarmerIdInput, setPlanFarmerIdInput] = useState<number | "">("");
  const [planCookingTypeInput, setPlanCookingTypeInput] = useState<CookingType>("FESTKOCHEND");
  const [planMonthInput, setPlanMonthInput] = useState<number | "">("");
  const [planWeekInput, setPlanWeekInput] = useState<number | "">("");
  const [planQuantityKgInput, setPlanQuantityKgInput] = useState("");

 // Bauernlager-Filter
const [stockProductFilterId, setStockProductFilterId] =
  useState<"alle" | number>("alle");
const [stockFilterFarmerId, setStockFilterFarmerId] =
  useState<number | "">("");
const [stockCookingFilter, setStockCookingFilter] =
  useState<CookingFilter>("alle");
const [stockQualityFilter, setStockQualityFilter] =
  useState<QualityFilter>("alle");

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
const [manualCosts, setManualCosts] = useState<any[]>([]);
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

// Login aus localStorage laden (damit Reload nicht ausloggt)
useEffect(() => {
  try {
    const saved = localStorage.getItem("currentUser");
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      // Packstelle-Nutzer sofort auf Packstation-Tab setzen
      if (user?.role === "PACKSTELLE") {
        setTab("packstation");
      }
    }
  } catch (err) {
    console.error("Fehler beim Lesen von currentUser aus localStorage", err);
  }
}, []);

// Packstelle-Nutzer automatisch auf den Packstation-Tab setzen
useEffect(() => {
  if (isPackstelle && tab !== "packstation") {
    setTab("packstation");
  }
}, [isPackstelle, tab]);

// Login in localStorage speichern
useEffect(() => {
  if (currentUser) {
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
  } else {
    localStorage.removeItem("currentUser");
  }
}, [currentUser]);

useEffect(() => {
  if (isPackbetrieb) {
    loadPackPlantStock().catch(console.error);
  }
}, [isPackbetrieb]);

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

  // === Nachrichten-Helfer ===

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2500);
  };

  // === Datenladen ===

  // === Admin: User-Verwaltung ===
  async function loadAllUsers() {
    try {
      console.log("Lade User-Liste...");
      const res = await fetch(`${API_URL}/admin/users`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Fehler beim Laden der User:", res.status, errorText);
        setAllUsers([]);
        return;
      }
      const data = await res.json();
      console.log("User-Liste geladen:", data.length, "User");
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fehler beim Laden der User:", err);
      setAllUsers([]);
    }
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
          const res = await fetch(`${API_URL}/admin/users/${selectedUserId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: newUserPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordResetError(data.error || "Fehler beim Zurücksetzen des Passworts");
        return;
      }

          // Erfolg: Formular leeren
          setSelectedUserId("");
          setNewUserPassword("");
          setPasswordResetError(null);
          showMessage(data.message || "Passwort wurde erfolgreich zurückgesetzt");
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
          const res = await fetch(`${API_URL}/admin/farmers/${selectedFarmerId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: newFarmerPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFarmerPasswordResetError(data.error || "Fehler beim Zurücksetzen des Passworts");
        return;
      }

          // Erfolg: Formular leeren
          setSelectedFarmerId("");
          setNewFarmerPassword("");
          setFarmerPasswordResetError(null);
          showMessage(data.message || "Passwort wurde erfolgreich zurückgesetzt");
        } catch (err: any) {
          console.error(err);
          setFarmerPasswordResetError(`Fehler: ${err.message || "Verbindung zum Server fehlgeschlagen"}`);
        }
      },
    });
  }

  async function loadFarmers() {
    try {
      const res = await fetch(`${API_URL}/farmers`);
      if (!res.ok) {
        console.error(`Failed to load farmers: ${res.status}`);
        return;
      }
      const data = await res.json();
      setFarmers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading farmers:", err);
      setFarmers([]);
    }
  }

  async function loadPackStations() {
    try {
      const res = await fetch(`${API_URL}/pack-stations`);
      const data = await res.json();
      setPackStations(data);
    } catch (err) {
      console.error("loadPackStations error:", err);
    }
  }

  async function loadPackPlants() {
    try {
      const res = await fetch(`${API_URL}/pack-plants`);
      const data = await res.json();
      setPackPlants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadPackPlants error:", err);
    }
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

  async function loadProducts() {
    try {
      console.log("🔄 Lade Produkte von:", `${API_URL}/products`);
      const res = await fetch(`${API_URL}/products`);
      if (!res.ok) {
        console.error("❌ Fehler beim Laden der Produkte:", res.status, res.statusText);
        return;
      }
      const data = await res.json();
      console.log("✅ Produkte geladen:", data.length, "Produkte");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Fehler in loadProducts:", err);
      setProducts([]);
    }
  }
}

  async function loadOrganizerDeliveries(weeks: number) {
    const res = await fetch(`${API_URL}/organizer/deliveries?weeks=${weeks}`);
    const data = await res.json();
    setOrganizerDeliveries(Array.isArray(data) ? data : []);
  }

  async function loadCustomers() {
    try {
      console.log("🔄 Lade Kunden von:", `${API_URL}/customers`);
      const res = await fetch(`${API_URL}/customers`);
      if (!res.ok) {
        console.error("❌ Fehler beim Laden der Kunden:", res.status, res.statusText);
        return;
      }
      const data = await res.json();
      console.log("✅ Kunden geladen:", data.length, "Kunden");
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Fehler in loadCustomers:", err);
      setCustomers([]);
    }
  }

    async function loadPrices(customerId?: number, productId?: number) {
    try {
      const params = new URLSearchParams();
      if (customerId) params.set("customerId", String(customerId));
      if (productId) params.set("productId", String(productId));

      const qs = params.toString();
      const url = qs ? `${API_URL}/product-prices?${qs}` : `${API_URL}/product-prices`;

      const res = await fetch(url);
      if (!res.ok) {
        console.error("Fehler beim Laden der Preise", await res.text());
        setPrices([]);
        return;
      }

      const data = await res.json();
      setPrices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fehler in loadPrices", err);
      setPrices([]);
    }
  }

  async function loadQualityPrices() {
    try {
      const res = await fetch(`${API_URL}/variety-quality-prices`);
      if (!res.ok) {
        console.error("Fehler beim Laden der Qualitätspreise", await res.text());
        setQualityPrices([]);
        return;
      }
      const data = await res.json();
      setQualityPrices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fehler in loadQualityPrices", err);
      setQualityPrices([]);
    }
  }

async function loadFarmerPackStats(farmerId: number) {
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
    async function loadVarieties() {
    try {
      console.log("Lade Sorten-Liste...");
    const res = await fetch(`${API_URL}/varieties`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Fehler beim Laden der Sorten:", res.status, errorText);
        setVarieties([]);
        return;
      }
    const data = await res.json();
      console.log("Sorten-Liste geladen:", Array.isArray(data) ? data.length : 0, "Sorten");
    setVarieties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fehler beim Laden der Sorten:", err);
      setVarieties([]);
    }
  }

  // Packbetrieb: Lager fertiger Produkte laden
async function loadPackPlantStock() {
  try {
    const res = await fetch(`${API_URL}/packplant-stock`);
    if (!res.ok) {
      console.error("Fehler beim Laden des Packbetriebs-Lagers", await res.text());
      return;
    }

    const data = await res.json();
    setPackPlantStocks(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Fehler in loadPackPlantStock:", err);
  }
}

 async function loadPackStationStock() {
  const res = await fetch(`${API_URL}/packstation-stock`);
  const data = await res.json();
  setPackStationStocks(Array.isArray(data) ? data : []);
}

// Berechne die Anzahl der anzuzeigenden Buchungen basierend auf Bildschirmhöhe
function calculateRecentEntriesLimit(): number {
  // Mindestens 10, maximal basierend auf verfügbarer Höhe
  // Annahme: ~60px pro Eintrag
  const availableHeight = window.innerHeight - 400; // Platz für Header, Formular, etc.
  const calculatedLimit = Math.floor(availableHeight / 60);
  return Math.max(10, Math.min(calculatedLimit, 50)); // Mindestens 10, maximal 50
}

async function loadRecentPackagingRuns() {
  try {
    const limit = calculateRecentEntriesLimit();
    const res = await fetch(`${API_URL}/packaging-runs/recent?limit=${limit}`);
    const data = await res.json();
    setRecentPackagingRuns(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Fehler beim Laden der letzten Verpackungsbuchungen:", err);
    setRecentPackagingRuns([]);
  }
}

async function loadRecentWasteMovements() {
  try {
    const limit = calculateRecentEntriesLimit();
    const res = await fetch(`${API_URL}/packstation/waste/recent?limit=${limit}`);
    const data = await res.json();
    setRecentWasteMovements(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Fehler beim Laden der letzten Abfallbuchungen:", err);
    setRecentWasteMovements([]);
  }
}

async function loadRecentInventoryZeroMovements() {
  try {
    const limit = calculateRecentEntriesLimit();
    const res = await fetch(`${API_URL}/packstation/inventory-zero/recent?limit=${limit}`);
    const data = await res.json();
    setRecentInventoryZeroMovements(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Fehler beim Laden der letzten 'Auf 0'-Buchungen:", err);
    setRecentInventoryZeroMovements([]);
  }
}

function getWeekStartDate(year: number, week: number): string {
  // Grobe Berechnung: Montag der ISO-Kalenderwoche
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const day = simple.getDay();           // 0 = So, 1 = Mo, ...
  const diff = (day + 6) % 7;            // Offset bis Montag
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().substring(0, 10); // "YYYY-MM-DD"
}

async function loadDeliveryPlans(year: number, farmerId?: number) {
  const params = new URLSearchParams();
  params.set("year", String(year));
  if (farmerId) params.set("farmerId", String(farmerId));

  const res = await fetch(`${API_URL}/delivery-plans?${params.toString()}`);
  const data = await res.json();

  const mapped: DeliveryPlanRow[] = (Array.isArray(data) ? data : []).map(
    (p: any) => ({
      id: p.id,
      weekStart: getWeekStartDate(p.year, p.week),
      farmerId: p.farmerId,
      farmerName: p.farmerNameSnapshot ?? p.farmer?.name ?? "-",
      cookingType: p.cookingType as CookingType,
      plannedKg: Number(p.plannedKg ?? 0),
    })
  );

  setDeliveryPlans(mapped);
}
  async function loadFarmerStocks(farmerId?: number) {
    const url = farmerId
      ? `${API_URL}/farmer-stock?farmerId=${farmerId}`
      : `${API_URL}/farmer-stock`;
    const res = await fetch(url);
    const data = await res.json();
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
      loadAllUsers().catch(console.error);
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
      loadPackPlants().catch(console.error);
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
    loadFarmerStocks(currentUser.farmerId).catch(console.error);
    loadFarmerPackStats(currentUser.farmerId).catch(console.error);
  } else {
    // Admin / Organisator / Packstelle / Packbetrieb: Lagerübersicht (alle)
    loadFarmerStocks().catch(console.error);
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
    loadPackStationStock().catch(console.error);
    // Lade auch die letzten Buchungen, wenn Packstelle/Packbetrieb
    if (currentUser.role === "PACKSTELLE" || currentUser.role === "PACKBETRIEB") {
      loadRecentPackagingRuns().catch(console.error);
      loadRecentWasteMovements().catch(console.error);
      loadRecentInventoryZeroMovements().catch(console.error);
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
      loadDeliveryPlans(planYear, fId),
    ]).catch(console.error);
  }

  // Bauer: eigene Lieferungen + eigene Planmengen
  if (isFarmer && currentUser?.farmerId) {
    Promise.all([
      loadOrganizerDeliveries(w),
      loadDeliveryPlans(planYear, currentUser.farmerId),
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

// === Login ===

async function handleLogin(e?: React.FormEvent) {
  if (e) {
    e.preventDefault();
  }

  if (!loginEmail.trim() || !loginPassword.trim()) {
    showMessage("Bitte E-Mail und Passwort eingeben");
    return;
  }

  console.log("handleLogin START", { loginEmail, loginPassword: "***" });

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
    });

    console.log("Login-Fetch Response", res.status, res.statusText);

      const text = await res.text().catch(() => "");
    console.log("Login response body:", text);

    if (!res.ok) {
      let errorMessage = "Login fehlgeschlagen";
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Wenn kein JSON, verwende den Text direkt
        if (text) {
          errorMessage = text;
        }
      }
      console.error("Login error:", errorMessage);
      showMessage(errorMessage);
      return;
    }

    let user: CurrentUser;
    try {
      user = JSON.parse(text);
    } catch (err) {
      console.error("Konnte Login-JSON nicht parsen", err, "Raw text:", text);
      showMessage("Antwort vom Server ungültig");
      return;
    }

    if (!user || !user.id || !user.role) {
      console.error("Ungültige User-Daten:", user);
      showMessage("Ungültige Benutzerdaten erhalten");
      return;
    }

    console.log("LOGIN USER parsed", user);
    setCurrentUser(user);
    showMessage(`Eingeloggt als ${user.name} (${user.role})`);
    setLoginEmail("");
    setLoginPassword("");
  } catch (err: any) {
    console.error("Fetch-Fehler beim Login:", err);
    const errorMsg = err.message || "Netzwerkfehler";
    showMessage(`Fehler beim Login: ${errorMsg}`);
  }
}

// HIER GENAU EINSETZEN → handleLogout

function handleLogout() {
  setCurrentUser(null);
  localStorage.removeItem("currentUser");

  // alle relevanten States zurücksetzen
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

  showMessage("Abgemeldet");
}


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
        const url = isEditing
          ? `${API_URL}/farmers/${editingFarmerId}`
          : `${API_URL}/farmers`;
        const method = isEditing ? "PUT" : "POST";
        
        const res = await fetch(url, {
          method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: farmerName,
        street: farmerStreet,
        postalCode: farmerPostalCode,
        city: farmerCity,
        ggn: farmerGGN,
        loginEmail: farmerLoginEmail,
        loginPassword: farmerLoginPassword,
        isFlatRate: farmerIsFlatRate,
        flatRateNote: farmerFlatRateNote || null,
      }),
    });

    if (!res.ok) {
          showMessage(isEditing ? "Fehler beim Ändern des Bauern" : "Fehler beim Anlegen des Bauern");
          setConfirmAction(null);
      return;
    }

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
  } catch (err) {
    console.error(err);
        showMessage(isEditing ? "Fehler beim Ändern des Bauern" : "Fehler beim Anlegen des Bauern");
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
          const url = isEditing
            ? `${API_URL}/products/${editingProductId}`
            : `${API_URL}/products`;
          const method = isEditing ? "PUT" : "POST";
          
          const res = await fetch(url, {
            method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productName,
          cookingType: productCookingType,
          unitKg: unitKgNum,
          unitsPerColli: unitsPerColliNum,
          collisPerPallet: collisPerPalletNum,
          packagingType: productPackagingType || null, // Enum-Key
          productNumber: productNumber || null,
          taxRateId: productTaxRateId ? Number(productTaxRateId) : null,
        }),
      });

      if (!res.ok) {
            showMessage(isEditing ? "Fehler beim Ändern des Produkts" : "Fehler beim Anlegen des Produkts");
        return;
      }

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
    } catch (err) {
      console.error(err);
          showMessage(isEditing ? "Fehler beim Ändern des Produkts" : "Fehler beim Anlegen des Produkts");
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
          const url = isEditing
            ? `${API_URL}/customers/${editingCustomerId}`
            : `${API_URL}/customers`;
          const method = isEditing ? "PUT" : "POST";
          
          const res = await fetch(url, {
            method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customerName, region: customerRegion }),
      });
      if (!res.ok) {
            showMessage(isEditing ? "Fehler beim Ändern des Kunden" : "Fehler beim Anlegen des Kunden");
        return;
      }
      setCustomerName("");
      setCustomerRegion("");
          setEditingCustomerId(null);
      await loadCustomers();
          showMessage(isEditing ? "Kunde geändert" : "Kunde gespeichert");
    } catch (err) {
      console.error(err);
          showMessage(isEditing ? "Fehler beim Ändern des Kunden" : "Fehler beim Anlegen des Kunden");
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

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error(isEditing ? "Fehler beim Ändern des Preises" : "Fehler beim Anlegen des Preises", await res.text());
        showMessage(isEditing ? "Fehler beim Ändern des Preises" : "Fehler beim Anlegen des Preises");
        return;
      }

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
    } catch (err) {
      console.error(err);
      showMessage(isEditing ? "Fehler beim Ändern des Preises" : "Fehler beim Anlegen des Preises");
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

          const res = await fetch(`${API_URL}/admin/users/simple-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("Response Status:", res.status, res.statusText);

      let data;
      try {
        data = await res.json();
        console.log("Response Data:", data);
      } catch (jsonErr) {
        const text = await res.text();
        console.error("JSON Parse Error:", text);
        setUserCreateError(`Server-Fehler: ${res.status} ${res.statusText}`);
        return;
      }

      if (!res.ok) {
        const errorMsg = data?.error || data?.detail || `Fehler ${res.status}: ${res.statusText}`;
        console.error("Request fehlgeschlagen:", errorMsg);
        setUserCreateError(errorMsg);
        return;
      }

      // Erfolg: Formular leeren
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      setUserRole("PACKBETRIEB");
      setUserCreateError(null);
      showMessage(`User "${data.user?.name || trimmedName}" wurde erfolgreich angelegt`);
        } catch (err: any) {
          console.error("Fehler beim Anlegen des Users:", err);
          setUserCreateError(`Netzwerk-Fehler: ${err.message || "Verbindung zum Server fehlgeschlagen"}`);
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

    try {
      const res = await fetch(`${API_URL}/farmer-stock/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: currentUser.farmerId,
          varietyId, // Sorte
          newQuantityTons: qtyKg, // Backend erwartet dieses Feld, Wert in kg
        }),
      });

      if (!res.ok) {
        showMessage("Fehler bei Inventur");
        return;
      }

      setInvQuantityKg("");
      await loadFarmerStocks(currentUser.farmerId);
      showMessage("Inventur gespeichert");
    } catch (err) {
      console.error(err);
      showMessage("Fehler bei Inventur");
    }
  }

  // wird vom Formular aufgerufen – öffnet NUR die Bestätigungsbox
  function handleInventory(e: React.FormEvent) {
    e.preventDefault();

    if (!currentUser?.farmerId) {
      showMessage("Kein Bauer zugeordnet");
      return;
    }
    if (!invVarietyId) {
      showMessage("Sorte wählen");
      return;
    }

    // Werte hier speichern, damit sie im onConfirm-Callback korrekt verwendet werden
    const varietyIdNum = Number(invVarietyId);
    const qtyKg = parseKg(invQuantityKg);
    const variety = safeVarieties.find((v) => v.id === varietyIdNum);

    setConfirmAction({
      title: "Inventur speichern?",
      message: `Sorte ${variety?.name ?? ""} auf ${formatKg(qtyKg)} kg setzen. Sind Sie sicher?`,
      confirmLabel: "Ja, Inventur speichern",
      cancelLabel: "Nein, abbrechen",
      onConfirm: () => {
        setConfirmAction(null);
        // Verwende die gespeicherten Werte, nicht die State-Variablen
        doInventory(varietyIdNum, qtyKg);
      },
    });
  }

// === Packstelle: Lager auf 0 setzen ===
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
        const res = await fetch(`${API_URL}/packstation/inventory-zero`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farmerId,
            varietyId,
            comment: packZeroComment || null,
          }),
        });

        if (!res.ok) {
          showMessage("Fehler beim 0-Setzen im Packstellenlager");
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

      await loadFarmerStocks(farmerId);
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
      onConfirm: () => {
        setConfirmAction(null);
        clear(); // Felder leeren
        doSale(type, varietyId as number, qtyKg, fieldName, harvestDate, undefined, sortierGroesse, varietyQuality);
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
      onConfirm: () => {
        setConfirmAction(null);

        doSale(
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

const renderStatistikTab = () => {
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

// === Packbetrieb: Reklamation erfassen ===
const renderReklamationTab = () => {
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

// === Admin: Abrechnungen Tab ===
const renderAbrechnungenTab = () => {
  if (!isEgAdmin) {
    return <p>Nur für Administratoren sichtbar.</p>;
  }

  const resolvePdfLink = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const apiBase =
      API_URL && API_URL.startsWith("http")
        ? API_URL.replace(/\/api$/, "")
        : "";
    return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const handleCreateStatement = async () => {
    if (!abrFarmerId) {
      showMessage("Bitte einen Bauern auswählen");
      return;
    }
    if (!abrDateFrom || !abrDateTo) {
      showMessage("Bitte Zeitraum auswählen");
      return;
    }
    if (new Date(abrDateFrom) > new Date(abrDateTo)) {
      showMessage("'Von' muss vor 'Bis' liegen");
      return;
    }

    const farmer = safeFarmers.find((f: Farmer) => f.id === abrFarmerId);

    setConfirmAction({
      title: "Abrechnung erstellen?",
      message: `Möchten Sie eine Akonto-Abrechnung für "${farmer?.name || "Bauer"}" im Zeitraum ${abrDateFrom} bis ${abrDateTo} wirklich erstellen?`,
      confirmLabel: "Ja, erstellen",
      cancelLabel: "Nein, abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);
    setAbrLoading(true);
    setAbrResult(null);

    try {
      const res = await fetch(`${API_URL}/admin/farmer-statement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: abrFarmerId,
          dateFrom: abrDateFrom,
          dateTo: abrDateTo,
          sendEmail: false, // Kein automatischer Versand
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Erstellen");
      }

      // E-Mail des Bauern hinzufügen
      const farmer = safeFarmers.find((f: Farmer) => f.id === abrFarmerId);
      setAbrResult({
        ...data,
        farmerEmail: farmer?.loginEmail || data.email?.to || null,
      });
      
      showMessage("Abrechnung erstellt! PDF kann jetzt geöffnet werden.");
    } catch (err: any) {
      showMessage(err.message || "Fehler beim Erstellen der Abrechnung");
    } finally {
      setAbrLoading(false);
    }
      },
    });
  };

  // Mailto-Link für E-Mail im Standard-Mailprogramm
  const generateMailtoLink = () => {
    if (!abrResult?.farmerEmail || !abrResult?.statement) return "";
    
    const farmerName = abrResult.statement.farmerName;
    const adminName = currentUser?.name || "Ihr Team";
    
    const subject = encodeURIComponent(`Ihre Akonto-Abrechnung - Eferdinger Landl`);
    const body = encodeURIComponent(
`Sehr geehrte/r ${farmerName},

im Anhang finden Sie Ihre aktuelle Akonto-Abrechnung.

Es freut uns, dass Sie Teil unserer Gemeinschaft sind! Bei Fragen können Sie sich jederzeit an uns wenden.

Liebe Grüße
${adminName}
Erzeugergemeinschaft Eferdinger Landl Erdäpfel`
    );
    
    return `mailto:${abrResult.farmerEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div style={{ maxWidth: "900px" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>📊 Abrechnungen</h1>

      {/* Sub-Navigation */}
      <div style={{ 
        display: "flex", 
        gap: "0.5rem", 
        marginBottom: "1.5rem",
        borderBottom: "1px solid #334155",
        paddingBottom: "0.75rem",
      }}>
        <button
          type="button"
          onClick={() => setAbrechnungSubTab("bauer")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            background: abrechnungSubTab === "bauer" ? "#3b82f6" : "transparent",
            border: abrechnungSubTab === "bauer" ? "none" : "1px solid #475569",
            color: abrechnungSubTab === "bauer" ? "#fff" : "#94a3b8",
            cursor: "pointer",
            fontWeight: abrechnungSubTab === "bauer" ? 600 : 400,
          }}
        >
          🧑‍🌾 Bauernabrechnung
        </button>
        <button
          type="button"
          onClick={() => {
            setAbrechnungSubTab("packbetrieb");
            if (packPlants.length === 0) {
              loadPackPlants();
            }
          }}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            background: abrechnungSubTab === "packbetrieb" ? "#3b82f6" : "transparent",
            border: abrechnungSubTab === "packbetrieb" ? "none" : "1px solid #475569",
            color: abrechnungSubTab === "packbetrieb" ? "#fff" : "#94a3b8",
            cursor: "pointer",
            fontWeight: abrechnungSubTab === "packbetrieb" ? 600 : 400,
          }}
        >
          🏭 Packbetriebsabrechnung
        </button>
      </div>

      {/* Bauernabrechnung */}
      {abrechnungSubTab === "bauer" && (
        <ActionCard title="Akonto-Abrechnung erstellen" icon="📄">
          <p style={{ color: "#94a3b8", marginBottom: "1rem", fontSize: "0.875rem" }}>
            Erstellt eine Akonto-Abrechnung für einen Bauern, generiert ein PDF und versendet es per E-Mail.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Bauer auswählen */}
            <div>
              <label>Bauer auswählen</label>
              <select
                value={abrFarmerId === "" ? "" : String(abrFarmerId)}
                onChange={(e) => setAbrFarmerId(e.target.value ? Number(e.target.value) : "")}
                style={{ width: "100%" }}
              >
                <option value="">-- Bauer wählen --</option>
                {safeFarmers.map((f: Farmer) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.name} {f.farmName ? `(${f.farmName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Zeitraum */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label>Von</label>
                <input
                  type="date"
                  value={abrDateFrom}
                  onChange={(e) => setAbrDateFrom(e.target.value)}
                  onFocus={openDatePickerOnFocus}
                />
              </div>
              <div>
                <label>Bis</label>
                <input
                  type="date"
                  value={abrDateTo}
                  onChange={(e) => setAbrDateTo(e.target.value)}
                  onFocus={openDatePickerOnFocus}
                />
              </div>
            </div>

            {/* Schnellauswahl */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ color: "#64748b", fontSize: "0.8125rem", alignSelf: "center" }}>Schnellauswahl:</span>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 1);
                  setAbrDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10));
                  setAbrDateTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10));
                }}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "0.375rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                Letzter Monat
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setAbrDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10));
                  setAbrDateTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10));
                }}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "0.375rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                Aktueller Monat
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setAbrDateFrom(new Date(d.getFullYear(), 0, 1).toISOString().substring(0, 10));
                  setAbrDateTo(new Date(d.getFullYear(), 11, 31).toISOString().substring(0, 10));
                }}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "0.375rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                Gesamtes Jahr
              </button>
            </div>

            {/* Button */}
            <button
              type="button"
              onClick={handleCreateStatement}
              disabled={abrLoading || !abrFarmerId}
              style={{
                marginTop: "0.5rem",
                padding: "0.875rem 1.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                background: abrLoading || !abrFarmerId 
                  ? "#475569" 
                  : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                border: "none",
                borderRadius: "0.5rem",
                color: "#fff",
                cursor: abrLoading || !abrFarmerId ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {abrLoading ? (
                <>
                  <span className="spinner" style={{ 
                    width: "1rem", 
                    height: "1rem", 
                    border: "2px solid #fff", 
                    borderTopColor: "transparent", 
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  Wird erstellt...
                </>
              ) : (
                <>📄 Abrechnung erstellen</>
              )}
            </button>
          </div>

          {/* Ergebnis */}
          {abrResult && (
            <div style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              background: abrResult.success ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${abrResult.success ? "#22c55e" : "#ef4444"}`,
            }}>
              <p style={{ 
                fontWeight: 600, 
                color: abrResult.success ? "#22c55e" : "#ef4444",
                marginBottom: "1rem",
              }}>
                {abrResult.success ? "✅ Abrechnung erstellt" : "❌ " + abrResult.message}
              </p>

              {abrResult.statement && (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(2, 1fr)", 
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#cbd5e1",
                  marginBottom: "1.25rem",
                }}>
                  <div>Bauer: <strong>{abrResult.statement.farmerName}</strong></div>
                  <div>Positionen: <strong>{abrResult.statement.lineCount}</strong></div>
                  <div>Liefermenge: <strong>{formatKg(abrResult.statement.totalDeliveryKg)} kg</strong></div>
                  <div>Betrag: <strong style={{ color: "#22c55e" }}>
                    {formatAmount(abrResult.statement.totalAmount)} €
                  </strong></div>
                </div>
              )}

              {/* Schritt 1: PDF öffnen */}
              {abrResult.pdf && (
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "0.75rem",
                  padding: "1rem",
                  background: "rgba(30, 41, 59, 0.5)",
                  borderRadius: "0.5rem",
                  marginBottom: "1rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ 
                      background: "#3b82f6", 
                      color: "#fff", 
                      borderRadius: "50%", 
                      width: "1.5rem", 
                      height: "1.5rem", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}>1</span>
                    <span style={{ fontWeight: 500 }}>PDF öffnen / speichern</span>
                  </div>
                  <a
                    href={resolvePdfLink(abrResult.pdf.downloadUrl)}
                    download
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      padding: "0.75rem 1.25rem",
                      background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                      border: "none",
                      borderRadius: "0.5rem",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                    }}
                  >
                    📄 PDF öffnen
                  </a>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                    Im PDF-Viewer können Sie das Dokument ansehen und bei Bedarf speichern (Strg+S / Cmd+S).
                  </p>
                </div>
              )}

              {/* Schritt 2: E-Mail versenden */}
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "0.75rem",
                padding: "1rem",
                background: "rgba(30, 41, 59, 0.5)",
                borderRadius: "0.5rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ 
                    background: "#22c55e", 
                    color: "#fff", 
                    borderRadius: "50%", 
                    width: "1.5rem", 
                    height: "1.5rem", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}>2</span>
                  <span style={{ fontWeight: 500 }}>E-Mail versenden</span>
                </div>
                
                {abrResult.farmerEmail ? (
                  <>
                    <a
                      href={generateMailtoLink()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        padding: "0.75rem 1.25rem",
                        background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                        border: "none",
                        borderRadius: "0.5rem",
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                      }}
                    >
                      ✉️ E-Mail an {abrResult.farmerEmail}
                    </a>
                    <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                      Öffnet Ihr Standard-Mailprogramm mit vorausgefülltem Text. 
                      <strong> Vergessen Sie nicht, das PDF anzuhängen!</strong>
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: "0.875rem", color: "#f59e0b", margin: 0 }}>
                    ⚠️ Keine E-Mail-Adresse für diesen Bauern hinterlegt. 
                    Bitte in den Stammdaten ergänzen.
                  </p>
                )}
              </div>
            </div>
          )}
        </ActionCard>
      )}

      {/* Packbetriebsabrechnung */}
      {abrechnungSubTab === "packbetrieb" && (
        <ActionCard title="Packbetrieb: Rechnung & Gutschrift" icon="🏭">
          <p style={{ color: "#94a3b8", marginBottom: "1rem", fontSize: "0.875rem" }}>
            Rechnung EG → Packbetrieb (verkaufte Produkte) und Gutschrift für Abpackkosten. PDF wird generiert, Download- und Mailto-Link stehen zur Verfügung.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label>Packbetrieb</label>
              <select
                value={ppPackPlantId}
                onChange={(e) => setPpPackPlantId(e.target.value ? Number(e.target.value) : "")}
                style={{ width: "100%" }}
              >
                <option value="">-- Packbetrieb wählen --</option>
                {packPlants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.vatId ? `(UID: ${p.vatId})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label>Von</label>
                <input
                  type="date"
                  value={ppDateFrom}
                  onChange={(e) => setPpDateFrom(e.target.value)}
                  onFocus={openDatePickerOnFocus}
                />
              </div>
              <div>
                <label>Bis</label>
                <input
                  type="date"
                  value={ppDateTo}
                  onChange={(e) => setPpDateTo(e.target.value)}
                  onFocus={openDatePickerOnFocus}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ color: "#64748b", fontSize: "0.8125rem", alignSelf: "center" }}>Schnellauswahl:</span>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 1);
                  setPpDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10));
                  setPpDateTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10));
                }}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "0.375rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                Letzter Monat
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setPpDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10));
                  setPpDateTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10));
                }}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "0.375rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                Aktueller Monat
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-action-primary"
                onClick={async () => {
                  if (!ppPackPlantId || !ppDateFrom || !ppDateTo) {
                    showMessage("Packbetrieb und Zeitraum wählen");
                    return;
                  }
                  setPpInvoiceResult(null);
                  setPpLoadingInvoice(true);
                  try {
                    const res = await fetch(`${API_URL}/admin/packplant-invoice`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        packPlantId: ppPackPlantId,
                        dateFrom: ppDateFrom,
                        dateTo: ppDateTo,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.error || "Fehler beim Erstellen der Rechnung");
                    }
                    setPpInvoiceResult(data);
                    showMessage("Rechnung erstellt");
                  } catch (err: any) {
                    console.error(err);
                    showMessage(err.message || "Fehler beim Erstellen der Rechnung");
                  } finally {
                    setPpLoadingInvoice(false);
                  }
                }}
                disabled={ppLoadingInvoice}
              >
                {ppLoadingInvoice ? "Erstelle..." : "Rechnung erstellen"}
              </button>

              <button
                type="button"
                className="btn-action-secondary"
                onClick={async () => {
                  if (!ppPackPlantId || !ppDateFrom || !ppDateTo) {
                    showMessage("Packbetrieb und Zeitraum wählen");
                    return;
                  }
                  setPpCreditResult(null);
                  setPpLoadingCredit(true);
                  try {
                    const res = await fetch(`${API_URL}/admin/packplant-credit-note`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        packPlantId: ppPackPlantId,
                        dateFrom: ppDateFrom,
                        dateTo: ppDateTo,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.error || "Fehler beim Erstellen der Gutschrift");
                    }
                    setPpCreditResult(data);
                    showMessage("Gutschrift erstellt");
                  } catch (err: any) {
                    console.error(err);
                    showMessage(err.message || "Fehler beim Erstellen der Gutschrift");
                  } finally {
                    setPpLoadingCredit(false);
                  }
                }}
                disabled={ppLoadingCredit}
              >
                {ppLoadingCredit ? "Erstelle..." : "Gutschrift Abpackkosten"}
              </button>
            </div>

            {(ppInvoiceResult || ppCreditResult) && (
              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {ppInvoiceResult && (
                  <div
                    style={{
                      background: "rgba(56, 189, 248, 0.1)",
                      border: "1px solid #38bdf8",
                      borderRadius: "0.5rem",
                      padding: "0.75rem",
                    }}
                  >
                    <strong>Rechnung erstellt</strong>
                    <p style={{ margin: "0.35rem 0" }}>
                      Nummer: {ppInvoiceResult.document?.documentNumber ?? "n/a"}
                    </p>
                    {ppInvoiceResult.pdf && (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <a
                              href={resolvePdfLink(ppInvoiceResult.pdf.downloadUrl)}
                              download
                          className="btn-link"
                        >
                          PDF herunterladen
                        </a>
                        <a
                          href={`mailto:?subject=${encodeURIComponent(
                            `Rechnung ${ppInvoiceResult.document?.documentNumber ?? ""}`
                          )}&body=${encodeURIComponent(
                            `PDF-Link: ${resolvePdfLink(ppInvoiceResult.pdf.downloadUrl)}`
                          )}`}
                          className="btn-link"
                        >
                          E-Mail (Standard-Mailprogramm)
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {ppCreditResult && (
                  <div
                    style={{
                      background: "rgba(74, 222, 128, 0.1)",
                      border: "1px solid #4ade80",
                      borderRadius: "0.5rem",
                      padding: "0.75rem",
                    }}
                  >
                    <strong>Gutschrift erstellt</strong>
                    <p style={{ margin: "0.35rem 0" }}>
                      Nummer: {ppCreditResult.document?.documentNumber ?? "n/a"}
                    </p>
                    {ppCreditResult.pdf && (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <a
                          href={resolvePdfLink(ppCreditResult.pdf.downloadUrl)}
                          download
                          className="btn-link"
                        >
                          PDF herunterladen
                        </a>
                        <a
                          href={`mailto:?subject=${encodeURIComponent(
                            `Gutschrift ${ppCreditResult.document?.documentNumber ?? ""}`
                          )}&body=${encodeURIComponent(
                            `PDF-Link: ${resolvePdfLink(ppCreditResult.pdf.downloadUrl)}`
                          )}`}
                          className="btn-link"
                        >
                          E-Mail (Standard-Mailprogramm)
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ActionCard>
      )}

    </div>
  );
};

// === Kalkulationen / GuV ===
const renderKalkulationenTab = () => {
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
            {pnlLoading ? "Berechne..." : "GuV berechnen"}
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
              {mcLoading ? "Speichere..." : mcEditingId ? "Aktualisieren" : "Erstellen"}
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
                Abbrechen
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
            Liste aktualisieren
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
                          onClick={() => deleteManualCost(cost.id)}
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

// === Packbetrieb: Lager & Inventur-Tab ===
const renderLagerInventurTab = () => {
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

// === Packbetrieb: Verkauf-Tab ===
const renderVerkaufTab = () => {
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

  // === Bauernlager-Ansicht (Sorten) ===

  function renderFarmerStockTab() {
  const effectiveFarmerId =
    isFarmer && currentUser?.farmerId
      ? currentUser.farmerId
      : stockFilterFarmerId || undefined;

  let filtered = farmerStocks;

  // 0) Nur Bestände > 0 anzeigen
  filtered = filtered.filter((s) => Number(s.quantityTons ?? s.quantityKg ?? 0) > 0);

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
                  onChange={(e) =>
                    setStockCookingFilter(
                      e.target.value === "alle"
                        ? "alle"
                        : (e.target.value as CookingType)
                    )
                  }
                  onFocus={openSelectOnFocus}
                >
                  <option value="alle">alle</option>
                  <option value="FESTKOCHEND">festkochend</option>
                  <option value="VORWIEGEND_FESTKOCHEND">
                    vorw. festk.
                  </option>
                  <option value="MEHLIG">mehlig</option>
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
                  onChange={(e) =>
                    setStockProductFilterId(
                      e.target.value ? Number(e.target.value) : "alle"
                    )
                  }
                  onFocus={openSelectOnFocus}
                >
                  <option value="alle">alle</option>
                  {safeVarieties.length === 0 ? (
                    <option value="" disabled>Keine Sorten verfügbar</option>
                  ) : (
                    safeVarieties.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.quality})
                    </option>
                    ))
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
                  loadFarmerStocks().catch(console.error);
                }
              }}
              onFocus={openSelectOnFocus}
            >
              <option value="">– Bauer wählen –</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
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

  // === PACKSTELLE: Abfall verbuchen ===
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
          const res = await fetch(`${API_URL}/packstation/waste`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              farmerId,
              varietyId,
              wasteKg: qty,
            }),
          });

          if (!res.ok) {
            showMessage("Fehler beim Verbuchen des Abfalls");
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
        const res = await fetch(`${API_URL}/packaging-runs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: packProductId,
            quantityUnits: units,
            farmerId,
            varietyId,
          }),
        });

        if (!res.ok) {
          showMessage("Fehler beim Verbuchen der Verpackung");
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
    await loadDeliveryPlans(currentYear);
  } catch (err) {
    console.error(err);
    showMessage("Fehler beim Speichern der Planmenge");
  }
}

// === Stammdaten-Tab ===

function renderStammdatenTab() {
  if (!canEditStammdaten) {
    return <p>Stammdaten können nur von Admin gepflegt werden.</p>;
  }

  return (
    <div
      style={{
        marginTop: "1rem",
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(3, 1fr)",
      }}
    >
      {/* User anlegen (nur Admin) */}
      {isEgAdmin && (
        <ActionCard icon="👤" title="User anlegen">
          <p style={{ fontSize: "0.9375rem" }}>
            Erstelle einen neuen Login-User für Packbetriebe, Packstellen, Organisatoren oder weitere Admins.
          </p>
          {userCreateError && (
            <div style={{
              padding: "0.75rem",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "0.5rem",
              color: "#991b1b",
              marginBottom: "1rem",
            }}>
              {userCreateError}
            </div>
          )}
          <form onSubmit={handleCreateUser} noValidate>
            <label>Name (Anzeigename)</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="z.B. Max Mustermann"
            />

            <label>E-Mail (Pflicht, Login-Name)</label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value.trim())}
              onBlur={(e) => setUserEmail(e.target.value.trim())}
              placeholder="user@example.com"
              autoComplete="email"
            />

            <label>Passwort (Pflicht)</label>
            <input
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              placeholder="Passwort eingeben"
            />

            <label>Rolle</label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as typeof userRole)}
              onFocus={openSelectOnFocus}
            >
              <option value="PACKBETRIEB">Packbetrieb</option>
              <option value="PACKSTELLE">Packstelle</option>
              <option value="ORGANISATOR">Organisator</option>
              <option value="EG_ADMIN">EG Admin</option>
            </select>

            <button 
              type="submit" 
              style={{ marginTop: "0.5rem" }}
              onClick={(e) => {
                console.log("Button geklickt - handleCreateUser wird aufgerufen");
              }}
            >
              User anlegen
            </button>
          </form>
        </ActionCard>
      )}

      {/* Passwort-Reset für User (nur Admin) */}
      {isEgAdmin && (
        <ActionCard icon="🔑" title="User-Passwort zurücksetzen">
          <p style={{ fontSize: "0.9375rem" }}>
            Setzen Sie das Passwort für einen bestehenden User zurück.
          </p>
          {passwordResetError && (
            <div style={{
              padding: "0.75rem",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "0.5rem",
              color: "#991b1b",
              marginBottom: "1rem",
            }}>
              {passwordResetError}
            </div>
          )}
          <form onSubmit={handleResetUserPassword} noValidate>
            <label>User auswählen</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : "")}
              required
              onFocus={openSelectOnFocus}
            >
              <option value="">– User wählen –</option>
              {allUsers.length === 0 ? (
                <option value="" disabled>Keine User verfügbar - Liste wird geladen...</option>
              ) : (
                allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) - {u.role}
                  </option>
                ))
              )}
            </select>

            <label>Neues Passwort</label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Neues Passwort eingeben"
              required
            />

            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Passwort zurücksetzen
            </button>
          </form>
        </ActionCard>
      )}

      {/* Passwort-Reset für Bauern (nur Admin) */}
      {isEgAdmin && (
        <ActionCard icon="🔐" title="Bauern-Passwort zurücksetzen">
          <p style={{ fontSize: "0.9375rem" }}>
            Setzen Sie das Passwort für einen Bauern zurück (nur wenn Login aktiviert ist).
          </p>
          {farmerPasswordResetError && (
            <div style={{
              padding: "0.75rem",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "0.5rem",
              color: "#991b1b",
              marginBottom: "1rem",
            }}>
              {farmerPasswordResetError}
            </div>
          )}
          <form onSubmit={handleResetFarmerPassword} noValidate>
            <label>Bauer auswählen</label>
            <select
              value={selectedFarmerId}
              onChange={(e) => setSelectedFarmerId(e.target.value ? Number(e.target.value) : "")}
              required
              onFocus={openSelectOnFocus}
            >
              <option value="">– Bauer wählen –</option>
              {farmers.filter(f => f.loginEmail).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.loginEmail})
                </option>
              ))}
            </select>

            <label>Neues Passwort</label>
            <input
              type="password"
              value={newFarmerPassword}
              onChange={(e) => setNewFarmerPassword(e.target.value)}
              placeholder="Neues Passwort eingeben"
              required
            />

            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Passwort zurücksetzen
            </button>
          </form>
        </ActionCard>
      )}

      {/* Planmengen CSV-Import */}
      <ActionCard icon="📥" title="Planmengen importieren">
        <p style={{ fontSize: "0.9375rem" }}>
          Liest die Datei <code>planmengen.csv</code> im Server-Ordner ein
          und speichert die Planmengen in der Datenbank. Nur verwenden,
          wenn die CSV aktuell und korrekt ist.
        </p>
        <button type="button" onClick={handleImportPlansFromCsv}>
          Planmengen aus CSV importieren
        </button>
      </ActionCard>

      {/* Planmengen manuell erfassen/ändern */}
      <ActionCard icon="📝" title="Planmenge manuell erfassen">
        <p style={{ fontSize: "0.9375rem" }}>
          Einzelne Planmenge eintragen oder ändern. Bei Auswahl einer{" "}
          <strong>Kalenderwoche</strong> wird die Menge direkt eingetragen.
          Bei Auswahl eines <strong>Monats</strong> wird die Menge gleichmäßig
          auf alle Kalenderwochen des Monats aufgeteilt.
        </p>
        <form onSubmit={handleSavePlanmenge}>
          <label>Bauer</label>
          <select
            value={planFarmerIdInput}
            onChange={(e) =>
              setPlanFarmerIdInput(e.target.value ? Number(e.target.value) : "")
            }
            required
            onFocus={openSelectOnFocus}
          >
            <option value="">– Bauer wählen –</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <label>Kochtyp</label>
          <select
            value={planCookingTypeInput}
            onChange={(e) =>
              setPlanCookingTypeInput(e.target.value as CookingType)
            }
            required
            onFocus={openSelectOnFocus}
          >
            <option value="FESTKOCHEND">festkochend</option>
            <option value="VORWIEGEND_FESTKOCHEND">vorw. festk.</option>
            <option value="MEHLIG">mehlig</option>
          </select>

          <label>Monat (für Aufteilung auf KWs)</label>
          <select
            value={planMonthInput}
            onChange={(e) => {
              setPlanMonthInput(e.target.value ? Number(e.target.value) : "");
              if (e.target.value) setPlanWeekInput(""); // Wenn Monat gewählt, KW zurücksetzen
            }}
            onFocus={openSelectOnFocus}
          >
            <option value="">– kein Monat –</option>
            <option value="1">Jänner</option>
            <option value="2">Februar</option>
            <option value="3">März</option>
            <option value="4">April</option>
            <option value="5">Mai</option>
            <option value="6">Juni</option>
            <option value="7">Juli</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Dezember</option>
          </select>

          <label>Kalenderwoche (direkt eintragen)</label>
          <select
            value={planWeekInput}
            onChange={(e) => {
              setPlanWeekInput(e.target.value ? Number(e.target.value) : "");
              if (e.target.value) setPlanMonthInput(""); // Wenn KW gewählt, Monat zurücksetzen
            }}
            onFocus={openSelectOnFocus}
          >
            <option value="">– keine KW –</option>
            {Array.from({ length: 53 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                KW {w}
              </option>
            ))}
          </select>

          <label>Geplante Menge (kg)</label>
          <input
            type="text"
            value={planQuantityKgInput}
            onChange={(e) => setPlanQuantityKgInput(e.target.value)}
            placeholder="z.B. 5000"
            required
          />

          <button type="submit" style={{ marginTop: "0.5rem" }}>
            Planmenge speichern
          </button>
        </form>
      </ActionCard>

      {/* Bauern */}
      <ActionCard icon="👨‍🌾" title="Bauern">
        <form onSubmit={handleCreateFarmer}>
          <label>Name</label>
          <input
            value={farmerName}
            onChange={(e) => setFarmerName(e.target.value)}
            required
          />

          <label>Straße / Hausnummer</label>
          <input
            value={farmerStreet}
            onChange={(e) => setFarmerStreet(e.target.value)}
          />

          <label>PLZ</label>
          <input
            value={farmerPostalCode}
            onChange={(e) => setFarmerPostalCode(e.target.value)}
          />

          <label>Ort</label>
          <input
            value={farmerCity}
            onChange={(e) => setFarmerCity(e.target.value)}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
          <label>GGN-Nummer (optional)</label>
          <input
            value={farmerGGN}
            onChange={(e) => setFarmerGGN(e.target.value)}
          />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div 
                  onClick={() => setFarmerIsFlatRate(!farmerIsFlatRate)}
                  style={{ 
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                >
                  <div 
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      border: "2px solid #64748b",
                      borderRadius: "0.25rem",
                      backgroundColor: farmerIsFlatRate ? "#3b82f6" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.2s"
                    }}
                  >
                    {farmerIsFlatRate && (
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 12 12" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ pointerEvents: "none" }}
                      >
                        <path 
                          d="M2 6L5 9L10 2" 
                          stroke="white" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <label 
                    htmlFor="farmerFlatRate" 
                    style={{ 
                      fontWeight: 600, 
                      marginTop: "0", 
                      whiteSpace: "nowrap",
                      cursor: "pointer"
                    }}
                  >
                    Pauschalierter Betrieb
                  </label>
                </div>
            <input
              id="farmerFlatRate"
              type="checkbox"
              checked={farmerIsFlatRate}
              onChange={(e) => setFarmerIsFlatRate(e.target.checked)}
                  style={{ 
                    position: "absolute",
                    opacity: 0,
                    width: 0,
                    height: 0,
                    pointerEvents: "none"
                  }}
                  tabIndex={-1}
                />
              </div>
            </div>
            <div style={{ paddingTop: "1.5rem", fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.5 }}>
              <div>
                <strong style={{ color: "#cbd5e1" }}>GGN-Nummer:</strong> Global GAP Nummer für Zertifizierung
              </div>
            </div>
          </div>

          <label style={{ marginTop: "0.25rem" }}>
            Bankverbindung und UID Nummer (optional)
          </label>
          <input
            value={farmerFlatRateNote}
            onChange={(e) => setFarmerFlatRateNote(e.target.value)}
            placeholder="z.B. IBAN: AT..., UID: ATU..."
          />

          <label>Login E-Mail (für Bauern-Zugang)</label>
          <input
            type="email"
            value={farmerLoginEmail}
            onChange={(e) => setFarmerLoginEmail(e.target.value)}
          />

          <label>Login Passwort</label>
          <input
            type="password"
            value={farmerLoginPassword}
            onChange={(e) => setFarmerLoginPassword(e.target.value)}
            placeholder={editingFarmerId !== null ? "Leer lassen, um Passwort nicht zu ändern" : ""}
          />

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="submit">{editingFarmerId !== null ? "Ändern" : "Speichern"}</button>
            {editingFarmerId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingFarmerId(null);
                  setFarmerName("");
                  setFarmerStreet("");
                  setFarmerPostalCode("");
                  setFarmerCity("");
                  setFarmerGGN("");
                  setFarmerLoginEmail("");
                  setFarmerLoginPassword("");
                  setFarmerIsFlatRate(false);
                  setFarmerFlatRateNote("");
                }}
                style={{ background: "#6b7280" }}
              >
                Abbrechen
          </button>
            )}
          </div>
        </form>

        <ul style={{ marginTop: "0.5rem", fontSize: "0.9375rem" }}>
          {farmers.map((f) => (
            <li key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span>
              {f.name}
              {f.address
                ? ` – ${f.address.street ?? ""}, ${
                    f.address.postalCode ?? ""
                  } ${f.address.city ?? ""}`
                : ""}
              </span>
              <button
                type="button"
                style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem", marginLeft: "0.5rem" }}
                onClick={() => {
                  setEditingFarmerId(f.id);
                  setFarmerName(f.name);
                  setFarmerStreet(f.address?.street || "");
                  setFarmerPostalCode(f.address?.postalCode || "");
                  setFarmerCity(f.address?.city || "");
                  setFarmerGGN(f.ggnNumber || "");
                  setFarmerIsFlatRate(f.isFlatRate || false);
                  setFarmerFlatRateNote(f.flatRateNote || "");
                  setFarmerLoginEmail(f.loginEmail || "");
                  setFarmerLoginPassword(""); // Passwort nicht anzeigen
                  // Scroll zum Formular
                  const formElement = document.querySelector('form[onSubmit]');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                Bearbeiten
              </button>
            </li>
          ))}
        </ul>
      </ActionCard>

      {/* Produkte */}
      <ActionCard icon="🥔" title="Produkte">
        <form onSubmit={handleCreateProduct}>
          <label>Produktname</label>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            placeholder="z.B. Eferdinger Landl Erdäpfel festkochend 2 kg"
          />
          <label>Kocheigenschaft</label>
          <select
            value={productCookingType}
            onChange={(e) =>
              setProductCookingType(e.target.value as CookingType)
            }
            onFocus={openSelectOnFocus}
          >
            <option value="FESTKOCHEND">festkochend</option>
            <option value="VORWIEGEND_FESTKOCHEND">
              vorw. festk.
            </option>
            <option value="MEHLIG">mehlig</option>
          </select>

          <label>Verpackungstyp</label>
          <select
            value={productPackagingType}
            onChange={(e) => setProductPackagingType(e.target.value)}
            onFocus={openSelectOnFocus}
          >
            <option value="">– wählen –</option>
            <option value="NETZSACK">Netzsack</option>
            <option value="CLIPNETZ">Clipnetz</option>
            <option value="KISTE">Kiste</option>
            <option value="KARTON">Karton</option>
            <option value="VERTPACK">Vertpack</option>
            <option value="PE_BEUTEL">PE-Beutel</option>
            <option value="LOSE">lose</option>
            <option value="GROSSKISTEN">Großkiste</option>
            <option value="BIGBAG">BigBag</option>
          </select>

          <label>Packungsgröße (kg)</label>
          <CalcInput
            value={productUnitKg}
            onChange={setProductUnitKg}
            label="Packungsgröße (kg)"
            step="0.01"
            required
          />

          <label>Einheiten je Colli (optional)</label>
          <CalcInput
            value={productUnitsPerColli}
            onChange={setProductUnitsPerColli}
            label="Einheiten je Colli"
            step="1"
            placeholder="z.B. 9"
          />

          <label>Colli je Palette (optional)</label>
          <CalcInput
            value={productCollisPerPallet}
            onChange={setProductCollisPerPallet}
            label="Colli je Palette"
            step="1"
            placeholder="z.B. 32"
          />

          <label>Produktnummer (optional)</label>
          <input
            value={productNumber}
            onChange={(e) => setProductNumber(e.target.value)}
            placeholder="z.B. EL-2KG-FK"
          />

          <label>MWSt (optional)</label>
          <select
            value={productTaxRateId}
            onChange={(e) => setProductTaxRateId(e.target.value ? Number(e.target.value) : "")}
            onFocus={openSelectOnFocus}
          >
            <option value="">– Steuersatz wählen –</option>
            {taxRates.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.name} ({tr.ratePercent}%)
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="submit">{editingProductId !== null ? "Ändern" : "Speichern"}</button>
            {editingProductId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingProductId(null);
                  setProductName("");
                  setProductCookingType("FESTKOCHEND");
                  setProductPackagingType("");
                  setProductNumber("");
                  setProductUnitKg("2");
                  setProductUnitsPerColli("");
                  setProductCollisPerPallet("");
                }}
                style={{ background: "#6b7280" }}
              >
                Abbrechen
          </button>
            )}
          </div>
        </form>

        <ul style={{ marginTop: "0.5rem", fontSize: "0.9375rem" }}>
          {safeProducts.map((p) => (
            <li key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span>
              {p.name} – {p.cookingType} – {p.packagingType} – {p.unitKg} kg,{" "}
              {p.unitsPerColli ?? "-"}/Colli, {p.collisPerPallet ?? "-"} Colli/Palette
              </span>
              <button
                type="button"
                style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem", marginLeft: "0.5rem" }}
                onClick={() => {
                  setEditingProductId(p.id);
                  setProductName(p.name);
                  setProductCookingType(p.cookingType);
                  setProductPackagingType(p.packagingType || "");
                  setProductNumber(p.productNumber || "");
                  setProductUnitKg(String(p.unitKg || "2"));
                  setProductUnitsPerColli(p.unitsPerColli ? String(p.unitsPerColli) : "");
                  setProductCollisPerPallet(p.collisPerPallet ? String(p.collisPerPallet) : "");
                  // Scroll zum Formular
                  const formElement = document.querySelector('form[onSubmit]');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                Bearbeiten
              </button>
            </li>
          ))}
        </ul>
      </ActionCard>

      {/* Sorten */}
      <ActionCard icon="🌱" title="Sorten">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const isEditing = editingVarietyId !== null;
            try {
              const url = isEditing
                ? `${API_URL}/varieties/${editingVarietyId}`
                : `${API_URL}/varieties`;
              const method = isEditing ? "PUT" : "POST";
              
              const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: varietyName,
                  cookingType: varietyCookingType,
                  quality: varietyQuality,
                }),
              });
              if (!res.ok) {
                showMessage(isEditing ? "Fehler beim Ändern der Sorte" : "Fehler beim Anlegen der Sorte");
                return;
              }
              setVarietyName("");
              setVarietyCookingType("FESTKOCHEND");
              setVarietyQuality("Q1");
              setEditingVarietyId(null);
              await loadVarieties();
              showMessage(isEditing ? "Sorte geändert" : "Sorte gespeichert");
            } catch (err) {
              console.error(err);
              showMessage(isEditing ? "Fehler beim Ändern der Sorte" : "Fehler beim Anlegen der Sorte");
            }
          }}
        >
          <label>Name der Sorte</label>
          <input
            value={varietyName}
            onChange={(e) => setVarietyName(e.target.value)}
            required
          />

          <label>Kocheigenschaft</label>
          <select
            value={varietyCookingType}
            onChange={(e) =>
              setVarietyCookingType(e.target.value as CookingType)
            }
            onFocus={openSelectOnFocus}
          >
            <option value="FESTKOCHEND">festkochend</option>
            <option value="VORWIEGEND_FESTKOCHEND">
              vorw. festk.
            </option>
            <option value="MEHLIG">mehlig</option>
          </select>

          <label>Qualität / Sortierung</label>
          <select
            value={varietyQuality}
            onChange={(e) =>
              setVarietyQuality(e.target.value as VarietyQuality)
            }
            onFocus={openSelectOnFocus}
          >
            <option value="Q1">1. Qualität</option>
            <option value="Q2">2. Qualität</option>
            <option value="UEBERGROESSE">Übergrößen</option>
          </select>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="submit">{editingVarietyId !== null ? "Ändern" : "Speichern"}</button>
            {editingVarietyId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingVarietyId(null);
                  setVarietyName("");
                  setVarietyCookingType("FESTKOCHEND");
                  setVarietyQuality("Q1");
                }}
                style={{ background: "#6b7280" }}
              >
                Abbrechen
          </button>
            )}
          </div>
        </form>

        <ul style={{ marginTop: "0.5rem", fontSize: "0.9375rem" }}>
          {safeVarieties.map((v) => (
            <li key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span>{v.name} – {v.cookingType} – {v.quality}</span>
              <button
                type="button"
                style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem", marginLeft: "0.5rem" }}
                onClick={() => {
                  setEditingVarietyId(v.id);
                  setVarietyName(v.name);
                  setVarietyCookingType(v.cookingType);
                  setVarietyQuality(v.quality);
                  // Scroll zum Formular
                  const formElement = document.querySelector('form[onSubmit]');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                Bearbeiten
              </button>
            </li>
          ))}
        </ul>
      </ActionCard>

      {/* Kunden */}
      <ActionCard icon="🏪" title="Kunden">
        <form onSubmit={handleCreateCustomer}>
          <label>Name</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
          <label>Region/Bemerkung</label>
          <input
            value={customerRegion}
            onChange={(e) => setCustomerRegion(e.target.value)}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="submit">{editingCustomerId !== null ? "Ändern" : "Speichern"}</button>
            {editingCustomerId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingCustomerId(null);
                  setCustomerName("");
                  setCustomerRegion("");
                }}
                style={{ background: "#6b7280" }}
              >
                Abbrechen
          </button>
            )}
          </div>
        </form>

        <ul style={{ marginTop: "0.5rem", fontSize: "0.9375rem" }}>
          {customers.map((c) => (
            <li key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span>{c.name} {c.region ? `(${c.region})` : ""}</span>
              <button
                type="button"
                style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem", marginLeft: "0.5rem" }}
                onClick={() => {
                  setEditingCustomerId(c.id);
                  setCustomerName(c.name);
                  setCustomerRegion(c.region || "");
                  // Scroll zum Formular
                  const formElement = document.querySelector('form[onSubmit]');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                Bearbeiten
              </button>
            </li>
          ))}
        </ul>
      </ActionCard>

      {/* Preise Kunde x Produkt */}
      <ActionCard icon="💰" title="Preise (Kunde × Produkt)">

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

      {/* Qualitätspreise (Rohware-Ankauf Q1/Q2/Übergrößen) */}
      <ActionCard icon="💵" title="Qualitätspreise (Rohware-Ankauf)">
        <p style={{ fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
          Preise je kg für die verschiedenen Qualitätsstufen (Q1, Q2, Übergrößen).
          Diese werden auf Lieferscheinen und Etiketten angedruckt.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!qpValidFrom || !qpPricePerKg) {
              showMessage("Bitte alle Pflichtfelder ausfüllen");
              return;
            }
            
            const qualityLabel = qpQuality === "Q1" ? "1. Qualität" : qpQuality === "Q2" ? "2. Qualität" : "Übergrößen";
            const priceNum = Number(qpPricePerKg.replace(",", "."));
            
            const isEditing = editingQualityPriceId !== null;
            setConfirmAction({
              title: isEditing ? "Qualitätspreis ändern?" : "Qualitätspreis anlegen?",
              message: isEditing
                ? `Möchten Sie diesen Qualitätspreis wirklich ändern?`
                : `Möchten Sie einen Qualitätspreis von ${formatAmount(priceNum)} €/kg für ${qualityLabel} (gültig ab ${qpValidFrom}) wirklich anlegen?`,
              confirmLabel: isEditing ? "Ja, ändern" : "Ja, anlegen",
              cancelLabel: "Nein, abbrechen",
              onConfirm: async () => {
                setConfirmAction(null);
                try {
                  const url = isEditing
                    ? `${API_URL}/variety-quality-prices/${editingQualityPriceId}`
                    : `${API_URL}/variety-quality-prices`;
                  const method = isEditing ? "PUT" : "POST";
                  
                  const res = await fetch(url, {
                    method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  quality: qpQuality,
                  validFrom: qpValidFrom,
                  validTo: qpValidTo || null,
                      pricePerKg: priceNum,
                }),
              });
              if (!res.ok) {
                    showMessage(isEditing ? "Fehler beim Ändern des Qualitätspreises" : "Fehler beim Speichern des Qualitätspreises");
                return;
              }
              setQpQuality("Q1");
              setQpValidFrom("");
              setQpValidTo("");
              setQpPricePerKg("");
              setQpTaxRateId("");
                  setEditingQualityPriceId(null);
              await loadQualityPrices();
                  showMessage(isEditing ? "Qualitätspreis geändert" : "Qualitätspreis gespeichert");
            } catch (err) {
              console.error(err);
              showMessage("Fehler beim Speichern");
            }
              },
            });
          }}
          style={{
            display: "grid",
            gap: "0.5rem",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            alignItems: "flex-end",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Qualität</label>
            <select
              value={qpQuality}
              onChange={(e) => setQpQuality(e.target.value as VarietyQuality)}
              onFocus={openSelectOnFocus}
            >
              <option value="Q1">1. Qualität</option>
              <option value="Q2">2. Qualität</option>
              <option value="UEBERGROESSE">Übergrößen</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>gültig ab</label>
            <input
              type="date"
              value={qpValidFrom}
              onChange={(e) => setQpValidFrom(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>gültig bis (optional)</label>
            <input
              type="date"
              value={qpValidTo}
              onChange={(e) => setQpValidTo(e.target.value)}
              onFocus={openDatePickerOnFocus}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Preis je kg (€)</label>
            <input
              type="text"
              value={qpPricePerKg}
              onChange={(e) => setQpPricePerKg(e.target.value)}
              placeholder="z.B. 0,35"
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>MWSt (optional)</label>
            <select
              value={qpTaxRateId}
              onChange={(e) => setQpTaxRateId(e.target.value ? Number(e.target.value) : "")}
              onFocus={openSelectOnFocus}
            >
              <option value="">– Steuersatz wählen –</option>
              {taxRates.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.name} ({tr.ratePercent}%)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
            <button type="submit">{editingQualityPriceId !== null ? "Ändern" : "Speichern"}</button>
            {editingQualityPriceId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingQualityPriceId(null);
                  setQpQuality("Q1");
                  setQpValidFrom("");
                  setQpValidTo("");
                  setQpPricePerKg("");
                  setQpTaxRateId("");
                }}
                style={{ background: "#6b7280" }}
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>

        <table style={{ width: "100%", fontSize: "0.9375rem" }}>
          <thead>
            <tr>
              <th>Qualität</th>
              <th>gültig ab</th>
              <th>gültig bis</th>
              <th>Preis je kg</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {qualityPrices.map((qp) => (
              <tr key={qp.id}>
                <td>
                  {qp.quality === "Q1"
                    ? "1. Qualität"
                    : qp.quality === "Q2"
                    ? "2. Qualität"
                    : "Übergrößen"}
                </td>
                <td>{qp.validFrom?.substring(0, 10) ?? "-"}</td>
                <td>{qp.validTo?.substring(0, 10) ?? "-"}</td>
                <td>{formatAmount(Number(qp.pricePerKg))} €</td>
                <td>
                  {(qp as any).taxRate ? `${(qp as any).taxRate.ratePercent}%` : "-"}
                </td>
                <td>
                  <button
                    type="button"
                    style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => {
                      setEditingQualityPriceId(qp.id);
                      setQpQuality(qp.quality);
                      setQpValidFrom(qp.validFrom?.substring(0, 10) || "");
                      setQpValidTo(qp.validTo?.substring(0, 10) || "");
                      setQpPricePerKg(String(qp.pricePerKg));
                      // Scroll zum Formular
                      const formElement = document.querySelector('form[onSubmit]');
                      if (formElement) {
                        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                  >
                    Bearbeiten
                  </button>
                </td>
              </tr>
            ))}
            {qualityPrices.length === 0 && (
              <tr>
                <td colSpan={5}>Noch keine Qualitätspreise erfasst.</td>
              </tr>
            )}
          </tbody>
        </table>
      </ActionCard>
    </div>
  );
}
 
  // === Bauern-Ansicht: Statistik + Planung ===
function renderFarmerStatsPlanningTab() {
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
const saldoMap = new Map<string, number>();   // kg-Saldo kumuliert

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
                  <td>{r.saldoKg >= 0 ? "+" : ""}{formatKg(r.saldoKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ActionCard>
    </div>
  );
}

    // === Packstellen-Ansicht (Karussell für Mobile) ===
  const renderPackstationTab = () => {
    // Organisatoren müssen immer auf Index 0 (Lager) bleiben
    if (isOrganizer && packCarouselIndex !== 0) {
      setPackCarouselIndex(0);
    }
    
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

          const uniqueVarieties = Array.from(
            new Map(
              packStationStocks
                .filter((s) => s.variety)
                .map((s) => [s.variety!.id, s.variety!])
            ).values()
          ).sort((a, b) => a.name.localeCompare(b.name, "de"));

          const uniqueCookingTypes: CookingType[] = Array.from(
            new Set(
              packStationStocks
                .filter((s) => s.variety?.cookingType)
                .map((s) => s.variety!.cookingType)
            )
          );

          const uniqueQualities: VarietyQuality[] = Array.from(
            new Set(
              packStationStocks
                .filter((s) => s.variety?.quality)
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
                    onChange={(e) => setPackLagerFilterCooking(e.target.value as CookingFilter)}
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
                    {uniqueCookingTypes.map((ct) => (
                      <option key={ct} value={ct}>{getCookingLabel(ct)}</option>
                    ))}
                  </select>
                </div>

                {/* Sorte-Filter */}
                <div>
                  <label style={{ fontSize: "0.875rem", color: "#e2e8f0", display: "block", marginBottom: "0.25rem" }}>
                    Sorte
                  </label>
                  <select
                    value={packLagerFilterVariety}
                    onChange={(e) => setPackLagerFilterVariety(e.target.value === "alle" ? "alle" : Number(e.target.value))}
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
                    {uniqueVarieties.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
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

        {/* Slide 2: Sortierabfall verbuchen */}
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

        {/* Slide 3: Lager auf 0 setzen */}
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
                {packStationStocks.map((s) => {
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
  };

  // === Organisator-Statistik / Planmengen ===
  function getSeasonStart(year: number): string {
  // fixer Neustart der Saison: 15.05. des Jahres
  const safeYear =
    Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();

  // YYYY-05-15
  return `${safeYear}-05-15`;
}

      function renderOrganizerStatsTab() {
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
            backgroundImage: "url('/images/IMG_5623.jpeg')",
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
              src="/images/Logo.png"
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
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
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
            <button type="button" onClick={handleLogout}>
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
                style={{
                  fontWeight: tab === "stamm" ? 700 : 400,
                }}
              >
                Stammdaten
              </button>
            )}

            {/* Bauernlager/Bauernlieferschein - nicht für Packstelle */}
            {!isPackstelle && (
              <button
                type="button"
                onClick={() => setTab("farmerStock")}
                style={{
                  fontWeight: tab === "farmerStock" ? 700 : 400,
                }}
              >
                {isPackbetrieb ? "Bauernlieferschein" : "Bauernlager"}
              </button>
            )}

            {(isPackstelle || isEgAdmin || isPackbetrieb || isOrganizer) && (
              <button
                type="button"
                onClick={() => setTab("packstation")}
                style={{
                  fontWeight: tab === "packstation" ? 700 : 400,
                }}
              >
                Packstelle
              </button>
            )}

            {/* Statistik/Planung - nicht für Packstelle und nicht für Packbetrieb */}
             {!isPackbetrieb && !isPackstelle && (
              <button
                type="button"
                onClick={() => setTab("stats")}
                style={{
                  fontWeight: tab === "stats" ? 700 : 400,
                }}
              >
                Statistik / Planung
              </button>
            )}

            {isPackbetrieb && (
              <>
              <button
                type="button"
                onClick={() => setTab("verkauf")}
                style={{
                  fontWeight: tab === "verkauf" ? 700 : 400,
                }}
              >
                  Verkauf
              </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("lagerInventur");
                    loadPackPlantStock();
                  }}
                  style={{
                    fontWeight: tab === "lagerInventur" ? 700 : 400,
                  }}
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
                style={{
                  fontWeight: tab === "reklamation" ? 700 : 400,
                }}
              >
                Reklamation
              </button>
            )}

            {isPackbetrieb && (
              <button
                type="button"
                onClick={() => {
                  setTab("statistik");
                  loadPackbetriebStatistics();
                }}
                style={{
                  fontWeight: tab === "statistik" ? 700 : 400,
                }}
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
                style={{
                  fontWeight: tab === "abrechnungen" ? 700 : 400,
                }}
              >
                📊 Abrechnungen
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
                style={{
                  padding: "0.75rem 1.25rem",
                  background: tab === "kalkulationen" ? "#3b82f6" : "transparent",
                  border: tab === "kalkulationen" ? "none" : "1px solid #475569",
                  borderRadius: "0.5rem",
                  color: tab === "kalkulationen" ? "#fff" : "#94a3b8",
                  cursor: "pointer",
                  fontWeight: tab === "kalkulationen" ? 700 : 400,
                }}
              >
                💰 Kalkulationen
              </button>
            )}
          </nav>

          <main className="app-main">
            {tab === "stamm" && renderStammdatenTab()}
            {tab === "farmerStock" && renderFarmerStockTab()}
            {tab === "packstation" && renderPackstationTab()}
            {tab === "stats" &&
              (isOrganizer || isEgAdmin
                ? renderOrganizerStatsTab()
                : renderFarmerStatsPlanningTab())}
            {tab === "verkauf" && renderVerkaufTab()}
            {tab === "lagerInventur" && renderLagerInventurTab()}
            {tab === "reklamation" && renderReklamationTab()}
            {tab === "statistik" && renderStatistikTab()}
            {tab === "abrechnungen" && renderAbrechnungenTab()}
            {tab === "kalkulationen" && renderKalkulationenTab()}
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