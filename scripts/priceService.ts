/**
 * Price Service - Verwaltung von Preisen mit validFrom/validTo
 * 
 * Logik:
 * - validFrom: Beginn der Gültigkeit (inklusive)
 * - validTo: Ende der Gültigkeit (exklusive), ergibt sich aus dem nächsten validFrom
 * - Der letzte Preis einer Gruppe hat validTo = null (gilt bis auf Weiteres)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Typ für eine Preisgruppe (Customer + Product)
type PriceGroupKey = string;

function makePriceGroupKey(customerId: number, productId: number): PriceGroupKey {
  return `${customerId}-${productId}`;
}

/**
 * Berechnet validTo für alle Preise einer bestimmten Gruppe neu.
 * Innerhalb der Gruppe:
 * - sortiere alle Einträge nach validFrom aufsteigend
 * - für jeden Eintrag mit Index i setze validTo = prices[i+1].validFrom
 * - für den letzten Eintrag bleibt validTo = null
 */
export async function recalculatePriceValidToForGroup(
  customerId: number,
  productId: number
): Promise<void> {
  // Alle Preise dieser Gruppe laden, sortiert nach validFrom
  const prices = await prisma.price.findMany({
    where: {
      customerId,
      productId,
    },
    orderBy: {
      validFrom: "asc",
    },
  });

  if (prices.length === 0) return;

  // Für jeden Preis validTo berechnen
  for (let i = 0; i < prices.length; i++) {
    const currentPrice = prices[i];
    const nextPrice = prices[i + 1];

    const newValidTo = nextPrice ? nextPrice.validFrom : null;

    // Nur updaten, wenn sich validTo geändert hat
    if (
      (currentPrice.validTo === null && newValidTo !== null) ||
      (currentPrice.validTo !== null && newValidTo === null) ||
      (currentPrice.validTo !== null &&
        newValidTo !== null &&
        currentPrice.validTo.getTime() !== newValidTo.getTime())
    ) {
      await prisma.price.update({
        where: { id: currentPrice.id },
        data: { validTo: newValidTo },
      });
    }
  }
}

/**
 * Backfill-Funktion: Berechnet validTo für ALLE bestehenden Price-Datensätze.
 * Gruppiert nach (customerId, productId) und setzt validTo entsprechend.
 */
export async function backfillPriceValidTo(): Promise<void> {
  console.log("🔄 Starte Backfill für Price.validTo...");

  // Alle Preise laden
  const allPrices = await prisma.price.findMany({
    orderBy: [
      { customerId: "asc" },
      { productId: "asc" },
      { validFrom: "asc" },
    ],
  });

  // Nach Gruppen gruppieren
  const groups = new Map<PriceGroupKey, typeof allPrices>();

  for (const price of allPrices) {
    const key = makePriceGroupKey(price.customerId, price.productId);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(price);
  }

  console.log(`📦 ${groups.size} Preisgruppen gefunden`);

  let updatedCount = 0;

  // Für jede Gruppe validTo berechnen
  for (const [key, prices] of groups) {
    for (let i = 0; i < prices.length; i++) {
      const currentPrice = prices[i];
      const nextPrice = prices[i + 1];

      const newValidTo = nextPrice ? nextPrice.validFrom : null;

      // Nur updaten, wenn sich validTo geändert hat
      const currentValidTo = currentPrice.validTo;
      const needsUpdate =
        (currentValidTo === null && newValidTo !== null) ||
        (currentValidTo !== null && newValidTo === null) ||
        (currentValidTo !== null &&
          newValidTo !== null &&
          currentValidTo.getTime() !== newValidTo.getTime());

      if (needsUpdate) {
        await prisma.price.update({
          where: { id: currentPrice.id },
          data: { validTo: newValidTo },
        });
        updatedCount++;
      }
    }
  }

  console.log(`✅ Backfill abgeschlossen. ${updatedCount} Preise aktualisiert.`);
}

/**
 * Erstellt einen neuen Preis und aktualisiert automatisch validTo der Gruppe.
 * 
 * @param data - Die Preisdaten (ohne validTo, wird automatisch gesetzt)
 * @returns Der neu erstellte Preis
 */
export async function createPriceWithValidTo(data: {
  customerId: number;
  productId: number;
  supplierType: string;
  pricePerUnit: number;
  validFrom: Date;
  customerNameSnapshot?: string;
  productNameSnapshot?: string;
}) {
  // 1. Neuen Preis mit validTo = null anlegen
  const newPrice = await prisma.price.create({
    data: {
      customerId: data.customerId,
      productId: data.productId,
      supplierType: data.supplierType,
      pricePerUnit: data.pricePerUnit,
      validFrom: data.validFrom,
      validTo: null,
      customerNameSnapshot: data.customerNameSnapshot,
      productNameSnapshot: data.productNameSnapshot,
    },
  });

  // 2. validTo für die gesamte Gruppe neu berechnen
  await recalculatePriceValidToForGroup(data.customerId, data.productId);

  // 3. Aktualisierten Preis zurückgeben
  return prisma.price.findUnique({ where: { id: newPrice.id } });
}

/**
 * Findet den aktuell gültigen Preis für eine Kunde-Produkt-Kombination.
 * 
 * @param customerId - Kunden-ID
 * @param productId - Produkt-ID
 * @param asOf - Datum, für das der Preis gesucht wird (default: jetzt)
 * @returns Der gültige Preis oder null
 */
export async function getValidPrice(
  customerId: number,
  productId: number,
  asOf: Date = new Date()
) {
  return prisma.price.findFirst({
    where: {
      customerId,
      productId,
      validFrom: { lte: asOf },
      OR: [
        { validTo: null },
        { validTo: { gt: asOf } },
      ],
    },
    orderBy: {
      validFrom: "desc",
    },
  });
}

// ============================================
// Gleiche Logik für VarietyQualityPrice
// ============================================

/**
 * Berechnet validTo für alle VarietyQualityPrice einer Qualität neu.
 */
export async function recalculateVarietyQualityPriceValidTo(
  quality: "Q1" | "Q2" | "UEBERGROESSE"
): Promise<void> {
  const prices = await prisma.varietyQualityPrice.findMany({
    where: { quality },
    orderBy: { validFrom: "asc" },
  });

  if (prices.length === 0) return;

  for (let i = 0; i < prices.length; i++) {
    const currentPrice = prices[i];
    const nextPrice = prices[i + 1];

    const newValidTo = nextPrice ? nextPrice.validFrom : null;

    if (
      (currentPrice.validTo === null && newValidTo !== null) ||
      (currentPrice.validTo !== null && newValidTo === null) ||
      (currentPrice.validTo !== null &&
        newValidTo !== null &&
        currentPrice.validTo.getTime() !== newValidTo.getTime())
    ) {
      await prisma.varietyQualityPrice.update({
        where: { id: currentPrice.id },
        data: { validTo: newValidTo },
      });
    }
  }
}

/**
 * Backfill für VarietyQualityPrice.validTo
 */
export async function backfillVarietyQualityPriceValidTo(): Promise<void> {
  console.log("🔄 Starte Backfill für VarietyQualityPrice.validTo...");

  const qualities: Array<"Q1" | "Q2" | "UEBERGROESSE"> = ["Q1", "Q2", "UEBERGROESSE"];

  for (const quality of qualities) {
    await recalculateVarietyQualityPriceValidTo(quality);
  }

  console.log("✅ Backfill für VarietyQualityPrice abgeschlossen.");
}

/**
 * Erstellt einen neuen VarietyQualityPrice und aktualisiert validTo.
 */
export async function createVarietyQualityPriceWithValidTo(data: {
  quality: "Q1" | "Q2" | "UEBERGROESSE";
  validFrom: Date;
  pricePerKg: number;
}) {
  const newPrice = await prisma.varietyQualityPrice.create({
    data: {
      quality: data.quality,
      validFrom: data.validFrom,
      pricePerKg: data.pricePerKg,
      validTo: null,
    },
  });

  await recalculateVarietyQualityPriceValidTo(data.quality);

  return prisma.varietyQualityPrice.findUnique({ where: { id: newPrice.id } });
}

/**
 * Findet den aktuell gültigen Rohwarenpreis für eine Qualität.
 */
export async function getValidVarietyQualityPrice(
  quality: "Q1" | "Q2" | "UEBERGROESSE",
  asOf: Date = new Date()
) {
  return prisma.varietyQualityPrice.findFirst({
    where: {
      quality,
      validFrom: { lte: asOf },
      OR: [
        { validTo: null },
        { validTo: { gt: asOf } },
      ],
    },
    orderBy: {
      validFrom: "desc",
    },
  });
}

// CLI-Ausführung für Backfill
if (require.main === module) {
  (async () => {
    try {
      await backfillPriceValidTo();
      await backfillVarietyQualityPriceValidTo();
    } catch (error) {
      console.error("❌ Fehler beim Backfill:", error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}





