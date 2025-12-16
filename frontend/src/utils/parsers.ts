/**
 * Parser-Funktionen für verschiedene Datentypen
 */

/**
 * Parst einen String-Wert als Kilogramm (entfernt Leerzeichen, ersetzt Komma durch Punkt)
 * @param value - String-Wert (z.B. "1.234,56" oder "1234.56")
 * @returns Parsed number oder 0 bei ungültigem Input
 */
export function parseKg(value: string | null | undefined): number {
  if (!value || typeof value !== "string") return 0;
  
  // Entferne alle Leerzeichen (inkl. geschützte Leerzeichen U+202F) und ersetze Komma durch Punkt
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  
  if (!cleaned) return 0;
  
  const num = parseFloat(cleaned);
  
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    console.warn("parseKg: Ungültiger Wert", value, "-> 0");
    return 0;
  }
  
  return num;
}

/**
 * Parst einen String zu einer ganzen Zahl
 * @param value - String-Wert
 * @returns Parsed integer oder 0 bei ungültigem Input
 */
export function parseIntSafe(value: string | null | undefined): number {
  if (!value || typeof value !== "string") return 0;
  
  const cleaned = value.trim();
  if (!cleaned) return 0;
  
  const num = parseInt(cleaned, 10);
  
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    console.warn("parseIntSafe: Ungültiger Wert", value, "-> 0");
    return 0;
  }
  
  return num;
}

