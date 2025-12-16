import React, { useEffect, useState, useRef } from "react";
import type { ConfirmAction } from "../types";

export type CalcInputProps = {
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

export function CalcInput({
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
  const inputRef = useRef<HTMLInputElement>(null);

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

