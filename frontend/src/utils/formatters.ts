/**
 * Formatierungs-Funktionen für verschiedene Datentypen
 */

/**
 * Formatiert einen Wert als Währung (Euro) mit Tausendertrennung
 * @param value - Zahl oder String
 * @returns Formatierter String (z.B. "1.234,56 €")
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) return "0,00 €";
  
  const num = typeof value === "number" ? value : parseFloat(String(value));
  
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    console.warn("formatCurrency: Ungültiger Wert", value, "-> 0,00 €");
    return "0,00 €";
  }
  
  // Tausender-Trennzeichen: Leerzeichen, Dezimaltrennung: Komma
  const formatted = Math.abs(num).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return num < 0 ? `-${formatted} €` : `${formatted} €`;
}

/**
 * Formatiert einen Wert als Kilogramm mit Tausendertrennung
 * @param value - Zahl oder String
 * @returns Formatierter String (z.B. "1.234,56")
 */
export function formatKg(value: number | string | null | undefined): string {
  if (value == null) return "0,00";
  
  const num = typeof value === "number" ? value : parseFloat(String(value));
  
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    console.warn("formatKg: Ungültiger Wert", value, "-> 0,00");
    return "0,00";
  }
  
  // Dezimaltrennung: Komma
  const parts = num.toFixed(2).split(".");
  const intPart = parts[0];
  const decPart = parts[1] || "00";
  
  // Tausendertrennung: geschütztes Leerzeichen (Narrow No-Break Space U+202F)
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  
  return `${formattedInt},${decPart}`;
}

/**
 * Formatiert einen Wert als Prozent mit Tausendertrennung
 */
/**
 * Formatiert einen Wert als Prozent (mit 1 Dezimalstelle)
 * @param value - Zahl
 * @returns Formatierter String (z.B. "12,3 %") oder "-" bei null/NaN
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return "-";
  }
  
  const num = value.toFixed(1);
  const parts = num.split(".");
  const intPart = parts[0];
  const decPart = parts[1] || "0";
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  return `${formattedInt},${decPart} %`;
}

/**
 * Formatierung für Beträge (Euro) mit Tausendertrennung und Komma (ohne €-Symbol)
 * @param value - Zahl oder String
 * @returns Formatierter String (z.B. "1.234,56")
 */
export function formatAmount(value: number | string | null | undefined): string {
  if (value == null) return "0,00";
  
  const num = typeof value === "number" ? value : parseFloat(String(value));
  
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    console.warn("formatAmount: Ungültiger Wert", value, "-> 0,00");
    return "0,00";
  }
  
  const parts = num.toFixed(2).split(".");
  const intPart = parts[0];
  const decPart = parts[1] || "00";
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  
  return `${formattedInt},${decPart}`;
}

