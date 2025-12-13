import { PrismaClient, CookingType } from "@prisma/client";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

// Hilfsfunktion: deutsches Komma in Punkt umwandeln
function parseNumber(value: string | null | undefined): number {
  if (value == null || value === "") return 0;
  const num = Number(value.replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

// BOM-Fix: trim + Entfernen unsichtbarer Zeichen
function clean(value: any): string {
  if (value == null) return "";
  return value.toString().replace(/^\uFEFF/, "").trim();
}

async function main() {
  const filePath = path.join(process.cwd(), "planmengen.csv");
  console.log("Lese CSV:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("❌ Datei planmengen.csv nicht gefunden!");
    process.exit(1);
  }

  const csvContent = fs.readFileSync(filePath, "utf-8");

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ";",
    trim: true,
  }) as any[];

  console.log(`➡️ CSV-Zeilen (ohne Kopfzeile): ${records.length}`);
  console.log("➡️ Lösche bestehende DeliveryPlan-Einträge...");
  await prisma.deliveryPlan.deleteMany({});

  // Farmer vorab laden für Snapshot
  const allFarmers = await prisma.farmer.findMany();
  const farmerMap = new Map(allFarmers.map((f) => [f.id, f]));

  for (const row of records) {
    const year = Number(clean(row.year ?? row["﻿year"]));
    const week = Number(clean(row.week));
    const farmerId = Number(clean(row.farmerId));
    const cookingTypeStr = clean(row.cookingType);
    const plannedKg = parseNumber(clean(row.plannedKg));
    const rawFarmerName = clean(row.farmerName);

    // CookingType validieren
    const isValidCookingType = [
      "FESTKOCHEND",
      "VORWIEGEND_FESTKOCHEND",
      "MEHLIG",
    ].includes(cookingTypeStr);

    const cookingType = cookingTypeStr as CookingType;

    // Pflichtfelder prüfen
    if (!year || !week || !farmerId || !isValidCookingType) {
      console.log("⚠️ Überspringe ungültige Zeile:", row);
      continue;
    }

    const farmer = farmerMap.get(farmerId);
    const farmerNameSnapshot =
      rawFarmerName || farmer?.name || `Farmer ${farmerId}`;

    await prisma.deliveryPlan.create({
      data: {
        year,
        week,
        farmerId,
        cookingType,
        plannedKg, // darf jetzt auch 0 sein
        farmerNameSnapshot,
      },
    });

    console.log(
      `✔️  Plan gespeichert: Jahr ${year}, KW ${week}, Bauer ${farmerId}, ${cookingType}, ${plannedKg} kg`
    );
  }

  console.log("✅ Import fertig.");
}

main()
  .catch((err) => {
    console.error("❌ Fehler im Import:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });