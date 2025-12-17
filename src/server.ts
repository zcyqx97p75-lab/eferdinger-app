// Neuer, vollständiger Server-Code in TypeScript (src/server.ts)

import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import os from "os";
import bcrypt from "bcryptjs";

const app = express();
const EG_ORGANIZATION_ID = 1;
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

// Health Check für Render
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ▶ Hilfsfunktion: Adresse finden oder erstellen (verhindert Duplikate)
async function findOrCreateAddress(data: {
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  // Wenn keine Adressdaten vorhanden, null zurückgeben
  if (!data.street && !data.postalCode && !data.city) {
    return null;
  }

  // Normalisiere leere Strings zu null
  const normalizedData = {
    street: data.street?.trim() || null,
    postalCode: data.postalCode?.trim() || null,
    city: data.city?.trim() || null,
    country: data.country?.trim() || null,
  };

  // Suche nach existierender Adresse
  const existing = await prisma.address.findFirst({
    where: {
      street: normalizedData.street,
      postalCode: normalizedData.postalCode,
      city: normalizedData.city,
      country: normalizedData.country,
    },
  });

  if (existing) {
    return existing;
  }

  // Erstelle neue Adresse nur wenn sie nicht existiert
  return await prisma.address.create({
    data: normalizedData,
  });
}

// ▶ Synchronisiere User-ID-Sequenz (behebt Probleme nach manuellen SQL-Inserts)
async function syncUserSequence() {
  try {
    const maxUser = await prisma.user.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });

    const maxId = maxUser?.id || 0;
    const nextId = maxId + 1;

    // Setze die Sequenz auf den höchsten Wert + 1
    await prisma.$executeRawUnsafe(
      `SELECT setval('"User_id_seq"', $1, true)`,
      nextId
    );

    console.log(`✅ User-ID-Sequenz synchronisiert (nächste ID: ${nextId})`);
  } catch (error: any) {
    // Wenn die Sequenz nicht existiert oder ein anderer Fehler auftritt, logge es, aber breche nicht ab
    console.warn("⚠️ Sequenz-Synchronisierung übersprungen:", error.message);
  }
}

// ▶ Initialisierung: Standard-Admin & Standard-Packstelle
async function ensureInitialData() {
  // Admin-User
  await prisma.user.upsert({
    where: { email: "ewald.mayr@gemuese-mayr.at" },
    update: {},
    create: {
      email: "ewald.mayr@gemuese-mayr.at",
      name: "Ewald Mayr",
      role: "EG_ADMIN",
      password: "12345",
    },
  });

  // Packbetrieb 1 Stammdaten
  const packPlantAddress = await findOrCreateAddress({
    street: "Linzer Straße 13",
    postalCode: "4070",
    city: "Eferding",
    country: "Österreich",
  });

  if (!packPlantAddress) {
    throw new Error("Fehler beim Erstellen der Packbetrieb-Adresse");
  }

  await (prisma as any).packPlant.upsert({
    where: { id: 1 },
    update: {
      name: "Geißlmayr Obst und Gemüse GmbH",
      vatId: "ATU68075012",
      phone: "07272 / 2237-0",
      fax: "07272 / 2237-19",
      email: "gemuese@geisslmayr.at",
      website: "https://www.efko.com/efko-gruppe/geisslmayr",
      addressId: packPlantAddress.id,
    },
    create: {
      id: 1,
      name: "Geißlmayr Obst und Gemüse GmbH",
      vatId: "ATU68075012",
      phone: "07272 / 2237-0",
      fax: "07272 / 2237-19",
      email: "gemuese@geisslmayr.at",
      website: "https://www.efko.com/efko-gruppe/geisslmayr",
      addressId: packPlantAddress.id,
    },
  });

  // Erzeugergemeinschaft als Organisation anlegen
  const egAddress = await findOrCreateAddress({
    street: "Wörth 20",
    postalCode: "4070",
    city: "Eferding",
    country: "Österreich",
  });

  if (!egAddress) {
    throw new Error("Fehler beim Erstellen der EG-Adresse");
  }

  await (prisma as any).organization.upsert({
    where: { id: EG_ORGANIZATION_ID },
    update: {
      name: "Erzeugergemeinschaft Eferdinger Landl Erdäpfel",
      vatId: "ATU56658067",
      email: "katrin@landl-erdaepfel.at",
      website: "https://www.landl-gemuese.at/produkte/eferdinger-landl-erdaepfel/",
      addressId: egAddress.id,
    },
    create: {
      id: EG_ORGANIZATION_ID,
      name: "Erzeugergemeinschaft Eferdinger Landl Erdäpfel",
      vatId: "ATU56658067",
      email: "katrin@landl-erdaepfel.at",
      website: "https://www.landl-gemuese.at/produkte/eferdinger-landl-erdaepfel/",
      addressId: egAddress.id,
    },
  });

  // Packstelle 1
  await prisma.packStation.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Standard-Packstelle" },
  });
}



// ▶ Snapshots-Helfer
async function getSnapshotsForFarmerVariety(
  farmerId: number,
  varietyId: number
) {
  const farmer: any = await (prisma as any).farmer.findUnique({
    where: { id: farmerId },
    include: { address: true },
  });

  const variety = await prisma.variety.findUnique({
    where: { id: varietyId },
  });

  let addrText: string | null = null;
  if (farmer?.address) {
    const parts = [
      farmer.address.street,
      farmer.address.postalCode,
      farmer.address.city,
    ].filter(Boolean);
    if (parts.length > 0) {
      addrText = parts.join(", ");
    }
  }

  return {
    farmerNameSnapshot: farmer?.name ?? "",
    varietyNameSnapshot: variety?.name ?? "",
    farmerGgnSnapshot: farmer?.ggn ?? null,
    farmerAddressSnapshot: addrText,
  };
}

async function getSnapshotsForPackStation(packStationId: number) {
  const ps = await prisma.packStation.findUnique({ where: { id: packStationId } });
  return { packStationNameSnapshot: ps?.name ?? "" };
}

async function getSnapshotsForProduct(productId: number) {
  const p = await prisma.product.findUnique({ where: { id: productId } });
  return { productNameSnapshot: p?.name ?? "" };
}

async function getSnapshotsForPackPlant(packPlantId: number) {
  const pp = await prisma.packPlant.findUnique({ where: { id: packPlantId } });
  return { packPlantNameSnapshot: pp?.name ?? "" };
}

// ░░░ ROUTES ░░░

// Health Check ist bereits oben definiert (Zeile 21)

// ▶ PRODUCTS
app.get("/api/products", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ name: "asc" }],
    });
    res.json(products);
  } catch (err: any) {
    console.error("Fehler in GET /api/products:", err);
    res.status(500).json({ error: "Fehler beim Laden der Produkte" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    // Ignoriere 'id' falls im Body vorhanden (sollte nicht passieren, aber sicherheitshalber)
    const { id, ...productData } = req.body;
    if (id) {
      console.warn("POST /api/products: 'id' wurde im Request-Body ignoriert:", id);
    }
    
    const {
      name,
      cookingType,   // "FESTKOCHEND" | "VORWIEGEND_FESTKOCHEND" | "MEHLIG"
      unitKg,        // z.B. 2
      unitsPerColli, // optional
      collisPerPallet,
      packagingType, // Enum PackagingType
      productNumber, // optional
      taxRateId,
    } = productData;

    if (!name || !cookingType || unitKg == null) {
      return res
        .status(400)
        .json({ error: "name, cookingType und unitKg sind Pflichtfelder" });
    }

    // Prüfe, ob Produkt mit gleichem Namen bereits existiert
    const existingProduct = await prisma.product.findFirst({
      where: { name: name.trim() },
    });
    if (existingProduct) {
      return res.status(400).json({
        error: `Ein Produkt mit dem Namen "${name.trim()}" existiert bereits`,
      });
    }

    // Prüfe, ob Produktnummer bereits existiert (falls angegeben)
    if (productNumber && productNumber.trim()) {
      const existingByNumber = await prisma.product.findFirst({
        where: { productNumber: productNumber.trim() },
      });
      if (existingByNumber) {
        return res.status(400).json({
          error: `Ein Produkt mit der Produktnummer "${productNumber.trim()}" existiert bereits`,
        });
      }
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        cookingType,
        unitKg: Number(unitKg),
        unitsPerColli: unitsPerColli != null ? Number(unitsPerColli) : null,
        collisPerPallet: collisPerPallet != null ? Number(collisPerPallet) : null,
        packagingType: packagingType || null,
        productNumber: productNumber?.trim() || null,
        taxRateId: taxRateId != null ? Number(taxRateId) : null,
      },
    });

    res.status(201).json(product);
  } catch (err: any) {
    console.error("Fehler in POST /api/products:", err);
    
    // Prüfe auf Unique Constraint Fehler
    if (err.code === "P2002") {
      const targetFields = err.meta?.target || [];
      // Ignoriere 'id' - das ist ein Primary Key, kein Unique Constraint
      const relevantFields = targetFields.filter((f: string) => f !== "id");
      
      if (relevantFields.length === 0) {
        // Wenn nur 'id' betroffen ist, ist das ein unerwarteter Fehler
        console.error("Unerwarteter Unique Constraint Fehler auf 'id':", err);
        return res.status(500).json({
          error: "Fehler beim Aktualisieren des Produkts",
          detail: "Unerwarteter Datenbankfehler",
        });
      }
      
      const field = relevantFields[0];
      let errorMessage = `Ein Produkt mit diesem ${field} existiert bereits`;
      
      // Spezifischere Fehlermeldungen
      if (relevantFields.includes("name")) {
        errorMessage = "Ein Produkt mit diesem Namen existiert bereits";
      } else if (relevantFields.includes("productNumber")) {
        errorMessage = "Ein Produkt mit dieser Produktnummer existiert bereits";
      }
      
      return res.status(400).json({
        error: errorMessage,
        detail: `Unique constraint auf ${relevantFields.join(", ")} verletzt`,
      });
    }
    
    res.status(500).json({
      error: "Fehler beim Anlegen des Produkts",
      detail: String(err.message || err),
    });
  }
});

// ▶ UPDATE PRODUCT
app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      cookingType,
      unitKg,
      unitsPerColli,
      collisPerPallet,
      packagingType,
      productNumber,
      taxRateId,
    } = req.body;

    if (!name || !cookingType || unitKg == null) {
      return res
        .status(400)
        .json({ error: "name, cookingType und unitKg sind Pflichtfelder" });
    }

    // Hole das bestehende Produkt
    const existingProduct = await prisma.product.findUnique({
      where: { id: Number(id) },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: "Produkt nicht gefunden" });
    }

    // Prüfe, ob Name bereits von einem anderen Produkt verwendet wird (wenn geändert)
    if (name.trim() !== existingProduct.name) {
      const productWithName = await prisma.product.findFirst({
        where: { name: name.trim() },
      });
      if (productWithName && productWithName.id !== Number(id)) {
        return res.status(400).json({
          error: `Ein anderes Produkt mit dem Namen "${name.trim()}" existiert bereits`,
        });
      }
    }

    // Prüfe, ob Produktnummer bereits von einem anderen Produkt verwendet wird (wenn geändert)
    if (productNumber && productNumber.trim() && productNumber.trim() !== existingProduct.productNumber) {
      const productWithNumber = await prisma.product.findFirst({
        where: { productNumber: productNumber.trim() },
      });
      if (productWithNumber && productWithNumber.id !== Number(id)) {
        return res.status(400).json({
          error: `Ein anderes Produkt mit der Produktnummer "${productNumber.trim()}" existiert bereits`,
        });
      }
    }

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name: name.trim(),
        cookingType,
        unitKg: Number(unitKg),
        unitsPerColli: unitsPerColli != null ? Number(unitsPerColli) : null,
        collisPerPallet: collisPerPallet != null ? Number(collisPerPallet) : null,
        packagingType: packagingType || null,
        productNumber: productNumber?.trim() || null,
        taxRateId: taxRateId != null ? Number(taxRateId) : null,
      },
    });

    res.json(product);
  } catch (err: any) {
    console.error("Fehler in PUT /api/products/:id:", err);
    
    // Prüfe auf Unique Constraint Fehler
    if (err.code === "P2002") {
      const targetFields = err.meta?.target || [];
      // Ignoriere 'id' - das ist ein Primary Key, kein Unique Constraint
      const relevantFields = targetFields.filter((f: string) => f !== "id");
      
      if (relevantFields.length === 0) {
        // Wenn nur 'id' betroffen ist, ist das ein unerwarteter Fehler
        console.error("Unerwarteter Unique Constraint Fehler auf 'id':", err);
        return res.status(500).json({
          error: "Fehler beim Aktualisieren des Produkts",
          detail: "Unerwarteter Datenbankfehler",
        });
      }
      
      const field = relevantFields[0];
      let errorMessage = `Ein Produkt mit diesem ${field} existiert bereits`;
      
      // Spezifischere Fehlermeldungen
      if (relevantFields.includes("name")) {
        errorMessage = "Ein Produkt mit diesem Namen existiert bereits";
      } else if (relevantFields.includes("productNumber")) {
        errorMessage = "Ein Produkt mit dieser Produktnummer existiert bereits";
      }
      
      return res.status(400).json({
        error: errorMessage,
        detail: `Unique constraint auf ${relevantFields.join(", ")} verletzt`,
      });
    }
    
    res.status(500).json({
      error: "Fehler beim Aktualisieren des Produkts",
      detail: String(err.message || err),
    });
  }
});

// ▶ VARIETIES (Sorten)
app.get("/api/varieties", async (_req, res) => {
  try {
    const varieties = await prisma.variety.findMany({
      orderBy: [{ name: "asc" }],
    });
    res.json(varieties);
  } catch (err: any) {
    console.error("Fehler in GET /api/varieties:", err);
    res.status(500).json({ error: "Fehler beim Laden der Sorten" });
  }
});

// ▶ VARIETIES für einen bestimmten Bauer (basierend auf Bewegungen und Verpackungsbuchungen)
// Optional kann auch productId als Query-Parameter übergeben werden, um nach Produkt zu filtern
// WICHTIG: Wenn productId angegeben ist, werden nur Sorten zurückgegeben, die in Bewegungen mit diesem Produkt vorkommen
// Wenn keine Sorten gefunden werden, werden alle Sorten des Bauers zurückgegeben (für Frontend-Filterung)
app.get("/api/varieties/by-farmer/:farmerId", async (req, res) => {
  const { farmerId } = req.params;
  const { productId } = req.query;
  
  try {
    const farmerIdNum = Number(farmerId);
    if (!farmerIdNum || isNaN(farmerIdNum)) {
      return res.status(400).json({ error: "Ungültige farmerId" });
    }

    // WICHTIG: PackStationStockMovement hat kein productId Feld
    // Die Verbindung zu Produkten erfolgt nur über PackagingRun
    // Daher laden wir alle Sorten des Bauers aus allen Bewegungen und PackagingRuns
    // Das Frontend filtert dann nach Kocheigenschaft des Produkts
    
    const [movements, runs] = await Promise.all([
      prisma.packStationStockMovement.findMany({
        where: { farmerId: farmerIdNum },
        select: { varietyId: true },
        distinct: ["varietyId"],
      }),
      prisma.packagingRun.findMany({
        where: { farmerId: farmerIdNum },
        select: { varietyId: true },
        distinct: ["varietyId"],
      }),
    ]);

    // Sammle alle eindeutigen varietyIds
    const varietyIds = new Set<number>();
    movements.forEach((m) => {
      if (m.varietyId) varietyIds.add(m.varietyId);
    });
    runs.forEach((r) => {
      if (r.varietyId) varietyIds.add(r.varietyId);
    });

    const varietyIdsToUse = Array.from(varietyIds);

    // Hole die Sorten-Details
    const varieties = await prisma.variety.findMany({
      where: {
        id: { in: varietyIdsToUse },
      },
      orderBy: [{ name: "asc" }],
    });

    res.json(varieties);
  } catch (err: any) {
    console.error("Fehler in GET /api/varieties/by-farmer/:farmerId:", err);
    res.status(500).json({ error: "Fehler beim Laden der Sorten für diesen Bauer" });
  }
});

app.post("/api/varieties", async (req, res) => {
  try {
    const { name, cookingType, quality } = req.body;

    if (!name || !cookingType || !quality) {
      return res
        .status(400)
        .json({ error: "name, cookingType und quality sind Pflichtfelder" });
    }

    const variety = await prisma.variety.create({
      data: {
        name,
        cookingType,
        quality,
      },
    });
    res.status(201).json(variety);
  } catch (err: any) {
    console.error("Fehler in POST /api/varieties:", err);
    res.status(500).json({
      error: "Fehler beim Anlegen der Sorte",
      detail: String(err.message || err),
    });
  }
});

// ▶ UPDATE VARIETY
app.put("/api/varieties/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, cookingType, quality } = req.body;

    if (!name || !cookingType || !quality) {
      return res.status(400).json({
        error: "name, cookingType und quality sind Pflichtfelder",
      });
    }

    const variety = await prisma.variety.update({
      where: { id: Number(id) },
      data: {
        name,
        cookingType,
        quality,
      },
    });

    res.json(variety);
  } catch (err: any) {
    console.error("Fehler in PUT /api/varieties/:id:", err);
    res.status(500).json({
      error: "Fehler beim Aktualisieren der Sorte",
      detail: String(err.message || err),
    });
  }
});

// ▶ Admin: Sorten-Massenimport
app.post("/api/admin/varieties/bulk-create", async (req, res) => {
  const { varieties } = req.body;

  if (!Array.isArray(varieties) || varieties.length === 0) {
    return res.status(400).json({
      error: "varieties muss ein nicht-leeres Array sein",
    });
  }

  const created: any[] = [];
  const errors: any[] = [];
  const skipped: any[] = [];

  for (const [index, v] of varieties.entries()) {
    const name = v.name?.trim();
    const cookingType = v.cookingType?.trim().toUpperCase();
    const quality = v.quality?.trim().toUpperCase() || "Q1"; // Default: Q1

    if (!name || !cookingType) {
      errors.push({
        index,
        data: v,
        error: "name und cookingType sind Pflichtfelder",
      });
      continue;
    }

    // Validiere cookingType
    const validCookingTypes = ["FESTKOCHEND", "VORWIEGEND_FESTKOCHEND", "MEHLIG"];
    if (!validCookingTypes.includes(cookingType)) {
      errors.push({
        index,
        data: v,
        error: `Ungültiger cookingType: ${cookingType}`,
      });
      continue;
    }

    // Validiere quality
    const validQualities = ["Q1", "Q2", "UEBERGROESSE"];
    if (!validQualities.includes(quality)) {
      errors.push({
        index,
        data: v,
        error: `Ungültige quality: ${quality}`,
      });
      continue;
    }

    try {
      // Prüfe, ob Sorte bereits existiert
      const existing = await prisma.variety.findFirst({
        where: {
          name: name,
          cookingType: cookingType as "FESTKOCHEND" | "VORWIEGEND_FESTKOCHEND" | "MEHLIG",
        },
      });

      if (existing) {
        skipped.push({
          index,
          name,
          cookingType,
          reason: "Sorte existiert bereits",
        });
        continue;
      }

      const variety = await prisma.variety.create({
        data: {
          name,
          cookingType: cookingType as "FESTKOCHEND" | "VORWIEGEND_FESTKOCHEND" | "MEHLIG",
          quality: quality as "Q1" | "Q2" | "UEBERGROESSE",
        },
      });

      created.push(variety);
    } catch (err: any) {
      errors.push({
        index,
        data: v,
        error: String(err.message || err),
      });
    }
  }

  res.json({
    createdCount: created.length,
    skippedCount: skipped.length,
    errorCount: errors.length,
    created,
    skipped,
    errors,
  });
});

// ▶ CUSTOMERS
app.get("/api/customers", async (_req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: [{ name: "asc" }],
    });
    res.json(customers);
  } catch (err: any) {
    console.error("Fehler in GET /api/customers:", err);
    res.status(500).json({ error: "Fehler beim Laden der Kunden" });
  }
});

app.post("/api/customers", async (req, res) => {
  const { name, externalId, region, contactInfo } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name ist erforderlich" });
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name,
        externalId: externalId || null,
        region: region || null,
        contactInfo: contactInfo || null,
      },
    });

    res.status(201).json(customer);
  } catch (err: any) {
    console.error("Fehler in POST /api/customers:", err);
    res.status(500).json({ error: "Fehler beim Anlegen des Kunden" });
  }
});

// ▶ UPDATE CUSTOMER
app.put("/api/customers/:id", async (req, res) => {
  const { id } = req.params;
  const { name, externalId, region, contactInfo } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name ist erforderlich" });
  }

  try {
    const customer = await prisma.customer.update({
      where: { id: Number(id) },
      data: {
        name,
        externalId: externalId || null,
        region: region || null,
        contactInfo: contactInfo || null,
      },
    });

    res.json(customer);
  } catch (err: any) {
    console.error("Fehler in PUT /api/customers/:id:", err);
    res.status(500).json({
      error: "Fehler beim Aktualisieren des Kunden",
      detail: String(err.message || err),
    });
  }
});

// ▶ PACKSTATION-LAGER (Lesen) – kompatibel zum alten Frontend
app.get("/api/packstation-stock", async (_req, res) => {
  try {
    const packStationId = 1; // Standard-Packstelle

    const stocks = await prisma.packStationStock.findMany({
      where: { packStationId },
      include: {
        farmer: true,
        variety: true,
      },
      orderBy: [
        { farmerId: "asc" },
        { varietyId: "asc" },
      ],
    });

    // Kompatibilitätsschicht fürs Frontend:
    // - quantityTons = quantityKg
    // - farmerName, varietyName direkt auf oberster Ebene
    const result = stocks.map((s) => ({
      id: s.id,
      packStationId: s.packStationId,
      farmerId: s.farmerId,
      varietyId: s.varietyId,
      // neu: altes Feld, das das Frontend vermutlich erwartet
      quantityTons: Number(s.quantityKg),
      // das „neue“ Feld behalten wir trotzdem
      quantityKg: Number(s.quantityKg),

      // Snapshots falls vorhanden
      packStationNameSnapshot: (s as any).packStationNameSnapshot ?? null,
      farmerNameSnapshot: (s as any).farmerNameSnapshot ?? null,
      varietyNameSnapshot: (s as any).varietyNameSnapshot ?? null,
      farmerAddressSnapshot: (s as any).farmerAddressSnapshot ?? null,
      farmerGgnSnapshot: (s as any).farmerGgnSnapshot ?? null,

      updatedAt: s.updatedAt,

      // direkte Namen für Frontend-Komfort
      farmerName: s.farmer?.name ?? null,
      varietyName: s.variety?.name ?? null,

      // komplette Objekte falls irgendwo verwendet
      farmer: s.farmer,
      variety: s.variety,
    }));

    res.json(result);
  } catch (err: any) {
    console.error("Fehler in GET /api/packstation-stock:", err);
    res.status(500).json({
      error: "Fehler beim Laden des Packstellen-Lagers",
      detail: String(err.message || err),
    });
  }
});

// ▶ PackStations
app.get("/api/pack-stations", async (_req, res) => {
  const packStations = await prisma.packStation.findMany();
  res.json(packStations);
});

// ▶ Farmer
app.get("/api/farmers", async (_req, res) => {
  const farmers = await prisma.farmer.findMany({ include: { address: true } });
  res.json(farmers);
});

// ▶ Admin: Liste aller User (für Passwort-Reset)
app.get("/api/admin/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
    });
    // Nur relevante Felder zurückgeben (ohne Passwort)
    const safeUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      farmerId: u.farmerId,
      createdAt: u.createdAt,
    }));
    res.json(safeUsers);
  } catch (err: any) {
    console.error("Fehler in GET /api/admin/users:", err);
    res.status(500).json({
      error: "Fehler beim Laden der User",
      detail: String(err.message || err),
    });
  }
});

app.post("/api/farmers", async (req, res) => {
  console.log("📥 POST /api/farmers - Request Body:", JSON.stringify(req.body, null, 2));
  console.log("📥 POST /api/farmers - loginEmail im Request:", {
    loginEmail: req.body.loginEmail,
    loginEmailType: typeof req.body.loginEmail,
    loginEmailValue: JSON.stringify(req.body.loginEmail),
    hasLoginEmail: !!req.body.loginEmail,
  });
  
  const {
    name,
    street,
    postalCode,
    city,
    country,
    ggn,
    ggnNumber, // Frontend sendet ggnNumber
    loginEmail,
    loginPassword,
    isFlatRate = false,
    flatRateNote = null,
  } = req.body;
  if (!name) return res.status(400).json({ error: "Name erforderlich" });
  
  // Verwende ggnNumber falls vorhanden, sonst ggn
  const ggnValue = ggnNumber ?? ggn;
  
  // Konvertiere leeren String zu null für flatRateNote
  const flatRateNoteValue = (flatRateNote && flatRateNote.trim()) ? flatRateNote.trim() : null;

  try {
    // Prüfe, ob E-Mail bereits existiert (wenn angegeben)
    if (loginEmail) {
      const existingFarmer = await (prisma as any).farmer.findUnique({
        where: { email: loginEmail },
      });
      if (existingFarmer) {
        return res.status(400).json({
          error: `Ein Bauer mit der E-Mail "${loginEmail}" existiert bereits`,
        });
      }
    }

    // Verwende findOrCreateAddress um Duplikate zu vermeiden
    const addr = await findOrCreateAddress({
      street,
      postalCode,
      city,
      country,
    });

    // Hashe das Passwort, falls vorhanden
    let hashedPassword: string | null = null;
    if (loginPassword) {
      hashedPassword = await bcrypt.hash(loginPassword.trim(), 10);
    }

    console.log("📝 Erstelle Farmer mit Daten:", {
      name,
      ggn: ggnValue ?? null,
      email: loginEmail ?? null,
      hasPassword: !!hashedPassword,
      addressId: addr?.id ?? null,
      isFlatRate: !!isFlatRate,
      flatRateNote: flatRateNoteValue,
    });
    
    const farmer = await (prisma as any).farmer.create({
      data: {
        name,
        ggn: ggnValue ?? null,
        email: loginEmail ?? null,
        passwordHash: hashedPassword,
        addressId: addr?.id ?? null,
        isFlatRate: !!isFlatRate,
        flatRateNote: flatRateNoteValue,
      },
      include: { address: true },
    });
    
    console.log("✅ Farmer erfolgreich erstellt:", { id: farmer.id, name: farmer.name });

    // Lege User an, wenn E-Mail vorhanden ist
    console.log("🔍 Prüfe loginEmail für User-Erstellung:", {
      loginEmail: loginEmail,
      loginEmailType: typeof loginEmail,
      loginEmailLength: loginEmail?.length,
      hasLoginEmail: !!loginEmail,
    });
    
    if (loginEmail && loginEmail.trim()) {
      const trimmedEmail = loginEmail.trim();
      console.log(`📧 E-Mail vorhanden: "${trimmedEmail}" - Starte User-Erstellung...`);
      
      try {
        // Prüfe, ob bereits ein User mit dieser E-Mail existiert
        const existingUser = await prisma.user.findUnique({
          where: { email: trimmedEmail },
        });
        
        if (existingUser) {
          // User existiert bereits - aktualisiere ihn
          console.log(`🔄 User existiert bereits (ID: ${existingUser.id}, Rolle: ${existingUser.role}), aktualisiere...`);
          await prisma.user.update({
            where: { email: trimmedEmail },
            data: { 
              farmerId: farmer.id,
              name: farmer.name,
              role: "FARMER", // Stelle sicher, dass die Rolle FARMER ist
              // Aktualisiere Passwort nur, wenn ein neues angegeben wurde
              ...(loginPassword && { password: hashedPassword || await bcrypt.hash("12345", 10) }),
            },
          });
          console.log(`✅ User ${existingUser.id} wurde aktualisiert und mit Farmer ${farmer.id} verknüpft`);
        } else {
          // Neuer User - erstelle ihn
          const userPassword = hashedPassword || await bcrypt.hash("12345", 10);
          console.log(`🆕 Erstelle neuen User mit E-Mail: "${trimmedEmail}"`);
          const newUser = await prisma.user.create({
            data: {
              email: trimmedEmail,
              password: userPassword,
              name: farmer.name,
              role: "FARMER",
              farmerId: farmer.id,
            },
          });
          console.log(`✅ Neuer User für Farmer ${farmer.id} (${trimmedEmail}) wurde angelegt - User ID: ${newUser.id}`);
        }
      } catch (userErr: any) {
        console.error("❌ Fehler beim Anlegen/Aktualisieren des Users:", userErr);
        console.error("User-Fehler-Code:", userErr.code);
        console.error("User-Fehler-Message:", userErr.message);
        console.error("User-Fehler-Meta:", JSON.stringify(userErr.meta, null, 2));
        // Wir werfen den Fehler weiter, damit der Farmer nicht ohne User erstellt wird
        throw new Error(`Fehler beim Anlegen des Users: ${userErr.message}`);
      }
    } else {
      console.warn("⚠️ Keine E-Mail angegeben - User wird nicht angelegt");
    }

    res.status(201).json(farmer);
  } catch (err: any) {
    console.error("❌ Fehler in POST /api/farmers:", err);
    console.error("Fehler-Code:", err.code);
    console.error("Fehler-Message:", err.message);
    console.error("Fehler-Meta:", JSON.stringify(err.meta, null, 2));
    
    // Prüfe auf Unique Constraint Fehler
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "Feld";
      const errorMessage = `Ein Bauer mit diesem ${field} existiert bereits`;
      console.error("❌ Unique Constraint Fehler:", errorMessage, "auf Feld:", field);
      return res.status(400).json({
        error: errorMessage,
        detail: err.meta?.target ? `Unique constraint auf ${err.meta.target.join(", ")} verletzt` : undefined,
        field: field,
        code: err.code,
      });
    }
    
    res.status(500).json({
      error: "Fehler beim Anlegen des Bauern",
      detail: String(err.message || err),
      code: err.code || "UNKNOWN",
    });
  }
});

// ▶ UPDATE FARMER
app.put("/api/farmers/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    street,
    postalCode,
    city,
    country,
    ggn,
    ggnNumber, // Frontend sendet ggnNumber
    loginEmail,
    loginPassword,
    isFlatRate = false,
    flatRateNote = null,
  } = req.body;
  
  if (!name) return res.status(400).json({ error: "Name erforderlich" });
  
  // Verwende ggnNumber falls vorhanden, sonst ggn
  const ggnValue = ggnNumber ?? ggn;

  try {
    // Hole den bestehenden Bauern
    const existingFarmer = await (prisma as any).farmer.findUnique({
      where: { id: Number(id) },
      include: { address: true },
    });

    if (!existingFarmer) {
      return res.status(404).json({ error: "Bauer nicht gefunden" });
    }

    // Verwende findOrCreateAddress um Duplikate zu vermeiden
    const addr = await findOrCreateAddress({
      street,
      postalCode,
      city,
      country,
    });

    // Prüfe, ob E-Mail bereits von einem anderen Farmer verwendet wird (wenn geändert)
    if (loginEmail && loginEmail !== existingFarmer.email) {
      const farmerWithEmail = await (prisma as any).farmer.findUnique({
        where: { email: loginEmail },
      });
      if (farmerWithEmail && farmerWithEmail.id !== Number(id)) {
        return res.status(400).json({
          error: `Ein anderer Bauer mit der E-Mail "${loginEmail}" existiert bereits`,
        });
      }
    }

    // Hashe das Passwort, falls ein neues angegeben wurde
    let hashedPassword: string | null = existingFarmer.passwordHash;
    if (loginPassword) {
      hashedPassword = await bcrypt.hash(loginPassword.trim(), 10);
    }

    // Aktualisiere den Bauern
    const farmer = await (prisma as any).farmer.update({
      where: { id: Number(id) },
      data: {
        name,
        ggn: ggnValue ?? null,
        email: loginEmail ?? null,
        passwordHash: hashedPassword,
        addressId: addr?.id ?? null,
        isFlatRate: !!isFlatRate,
        flatRateNote: flatRateNote ?? null,
      },
      include: { address: true },
    });

    // Aktualisiere oder erstelle User, falls E-Mail vorhanden ist
    if (loginEmail) {
      // Wenn kein Passwort angegeben wurde, verwende das bestehende oder setze Standard-Passwort
      const userPassword = hashedPassword || (existingFarmer.email ? undefined : await bcrypt.hash("12345", 10));
      
      await prisma.user.upsert({
        where: { email: loginEmail },
        update: {
          farmerId: farmer.id,
          name: farmer.name,
          // Aktualisiere Passwort nur, wenn ein neues angegeben wurde
          ...(loginPassword && userPassword && { password: userPassword }),
        },
        create: {
          email: loginEmail,
          password: userPassword || await bcrypt.hash("12345", 10),
          name: farmer.name,
          role: "FARMER",
          farmerId: farmer.id,
        },
      });
      
      console.log(`✅ User für Farmer ${farmer.id} (${loginEmail}) wurde aktualisiert/angelegt`);
    } else if (existingFarmer.email) {
      // Wenn E-Mail entfernt wurde, entferne auch die Verknüpfung zum User (aber lösche den User nicht)
      const user = await prisma.user.findUnique({
        where: { email: existingFarmer.email },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { farmerId: null },
        });
        console.log(`⚠️ Verknüpfung zwischen User ${user.id} (${existingFarmer.email}) und Farmer ${farmer.id} wurde entfernt`);
      }
    }

    res.json(farmer);
  } catch (err: any) {
    console.error("Fehler in PUT /api/farmers/:id:", err);
    
    // Prüfe auf Unique Constraint Fehler
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "Feld";
      return res.status(400).json({
        error: `Ein Bauer mit diesem ${field} existiert bereits`,
        detail: err.meta?.target ? `Unique constraint auf ${err.meta.target.join(", ")} verletzt` : undefined,
      });
    }
    
    res.status(500).json({
      error: "Fehler beim Aktualisieren des Bauern",
      detail: String(err.message || err),
    });
  }
});

// ▶ Bauernabrechnung für Zeitraum (GET)
app.get("/api/farmers/:farmerId/statement", async (req, res) => {
  const { farmerId } = req.params;
  const { year, month, dateFrom, dateTo } = req.query;

  try {
    let statement: FarmerStatement;

    if (dateFrom && dateTo) {
      // Neuer Zeitraum-Modus
      const from = new Date(dateFrom as string);
      const to = new Date(dateTo as string);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({ error: "Ungültiges Datumsformat (YYYY-MM-DD)" });
      }

      statement = await getFarmerStatement(Number(farmerId), from, to);
    } else if (year && month) {
      // Legacy Monats-Modus
      const yearNum = Number(year);
      const monthNum = Number(month);

      if (!Number.isFinite(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({ error: "Ungültiges Jahr" });
      }
      if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ error: "Ungültiger Monat (1-12)" });
      }

      statement = await getFarmerMonthlyStatement(Number(farmerId), yearNum, monthNum);
    } else {
      return res.status(400).json({
        error: "Entweder dateFrom+dateTo oder year+month angeben",
      });
    }

    res.json(statement);
  } catch (err: any) {
    console.error("Fehler in GET /api/farmers/:farmerId/statement:", err);
    res.status(400).json({
      error: err.message || "Fehler beim Erstellen der Abrechnung",
    });
  }
});

// ▶ Admin: Bauernabrechnung erstellen, PDF generieren und per E-Mail versenden
app.post("/api/admin/farmer-statement", async (req, res) => {
  const { farmerId, dateFrom, dateTo, sendEmail = true } = req.body;

  if (!farmerId || !dateFrom || !dateTo) {
    return res.status(400).json({
      error: "farmerId, dateFrom und dateTo sind Pflichtfelder",
    });
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return res.status(400).json({ error: "Ungültiges Datumsformat (YYYY-MM-DD)" });
  }

  if (from > to) {
    return res.status(400).json({ error: "dateFrom muss vor dateTo liegen" });
  }

  try {
    // 1. Abrechnung erstellen
    const statement = await getFarmerStatement(Number(farmerId), from, to);

    // 2. PDF generieren
    const pdfBuffer = await generateFarmerStatementPdf(statement);

    // 3. PDF speichern
    const pdfFilename = await saveFarmerStatementPdf(statement, pdfBuffer);

    // 4. E-Mail senden (falls aktiviert und E-Mail vorhanden)
    let emailSent = false;
    let emailError: string | null = null;

    if (sendEmail && statement.email) {
      try {
        await sendFarmerStatementEmail({
          to: statement.email,
          farmerName: statement.farmerName,
          periodStart: statement.periodStart,
          periodEnd: statement.periodEnd,
          pdfBuffer,
        });
        emailSent = true;
      } catch (emailErr: any) {
        console.error("E-Mail-Versand fehlgeschlagen:", emailErr);
        emailError = emailErr.message || "E-Mail konnte nicht gesendet werden";
      }
    }

    res.json({
      success: true,
      message: emailSent
        ? "Abrechnung erstellt und per E-Mail versendet"
        : statement.email
          ? `Abrechnung erstellt, E-Mail-Versand fehlgeschlagen: ${emailError}`
          : "Abrechnung erstellt (keine E-Mail-Adresse hinterlegt)",
      statement: {
        farmerId: statement.farmerId,
        farmerName: statement.farmerName,
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
        totalAmount: statement.totalAmount,
        totalDeliveryKg: statement.totalDeliveryKg,
        totalRetourKg: statement.totalRetourKg,
        lineCount: statement.lines.length,
      },
      pdf: {
        filename: pdfFilename,
        downloadUrl: `/api/statements/${pdfFilename}`,
      },
      email: {
        sent: emailSent,
        to: statement.email || null,
        error: emailError,
      },
    });
  } catch (err: any) {
    console.error("Fehler in POST /api/admin/farmer-statement:", err);
    res.status(400).json({
      error: err.message || "Fehler beim Erstellen der Abrechnung",
    });
  }
});

// ▶ PDF-Download Endpoint
app.get("/api/statements/:filename", (req, res) => {
  const { filename } = req.params;
  
  // Sicherheitsprüfung: Nur Dateinamen ohne Pfad erlauben
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return res.status(400).json({ error: "Ungültiger Dateiname" });
  }

  const filepath = path.join(STATEMENTS_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "PDF nicht gefunden" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.sendFile(filepath);
});

// ▶ Admin: Packbetriebsrechnung (Rechnung EG -> Packbetrieb)
app.post("/api/admin/packplant-invoice", async (req, res) => {
  const { packPlantId = 1, dateFrom, dateTo } = req.body;

  if (!dateFrom || !dateTo) {
    return res.status(400).json({
      error: "dateFrom und dateTo sind Pflichtfelder",
    });
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return res.status(400).json({ error: "Ungültiges Datumsformat (YYYY-MM-DD)" });
  }

  try {
    const doc = await createPackPlantSalesInvoice(Number(packPlantId), from, to);
    const pdfBuffer = await generateAccountingDocumentPdf(doc);
    const pdfFilename = await saveAccountingDocumentPdf(doc, pdfBuffer);
    return res.json({
      success: true,
      document: doc,
      pdf: {
        filename: pdfFilename,
        downloadUrl: `/api/accounting-documents/${pdfFilename}`,
      },
    });
  } catch (err: any) {
    console.error("Fehler in POST /api/admin/packplant-invoice:", err);
    return res.status(400).json({
      error: err.message || "Fehler beim Erstellen der Packbetriebsrechnung",
    });
  }
});

// ▶ Admin: Gutschrift Abpackkosten (EG -> Packbetrieb)
app.post("/api/admin/packplant-credit-note", async (req, res) => {
  const { packPlantId = 1, dateFrom, dateTo } = req.body;

  if (!dateFrom || !dateTo) {
    return res.status(400).json({
      error: "dateFrom und dateTo sind Pflichtfelder",
    });
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return res.status(400).json({ error: "Ungültiges Datumsformat (YYYY-MM-DD)" });
  }

  try {
    const doc = await createPackingCostCreditNote(Number(packPlantId), from, to);
    const pdfBuffer = await generateAccountingDocumentPdf(doc);
    const pdfFilename = await saveAccountingDocumentPdf(doc, pdfBuffer);
    return res.json({
      success: true,
      document: doc,
      pdf: {
        filename: pdfFilename,
        downloadUrl: `/api/accounting-documents/${pdfFilename}`,
      },
    });
  } catch (err: any) {
    console.error("Fehler in POST /api/admin/packplant-credit-note:", err);
    return res.status(400).json({
      error: err.message || "Fehler beim Erstellen der Abpackkosten-Gutschrift",
    });
  }
});

// ==========================================
// KALKULATIONEN / GUV
// ==========================================

// ▶ GET: Manuelle Kosten abrufen (gefiltert)
app.get("/api/admin/manual-costs", async (req, res) => {
  try {
    // Keine Authentifizierung für GET - Admin-Endpoints sind vertrauenswürdig
    const { packPlantId, costType, dateFrom, dateTo } = req.query;
    
    const where: any = {};
    if (packPlantId) where.packPlantId = Number(packPlantId);
    if (costType) where.costType = costType;
    if (dateFrom || dateTo) {
      where.OR = [];
      if (dateFrom) {
        where.OR.push({ periodTo: { gte: new Date(dateFrom as string) } });
      }
      if (dateTo) {
        where.OR.push({ periodFrom: { lte: new Date(dateTo as string) } });
      }
    }
    
    const costs = await prisma.manualCost.findMany({
      where,
      include: {
        packPlant: true,
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { periodFrom: "desc" },
    });
    
    res.json(costs);
  } catch (err: any) {
    console.error("Fehler in GET /api/admin/manual-costs:", err);
    res.status(500).json({ error: err.message ?? "Interner Fehler" });
  }
});

// ▶ POST: Manuelle Kosten erstellen
app.post("/api/admin/manual-costs", async (req, res) => {
  try {
    const {
      costType,
      description,
      periodFrom,
      periodTo,
      packPlantId,
      valueType,
      value,
      comment,
    } = req.body;
    
    if (!costType || !description || !periodFrom || !periodTo || !valueType || value == null) {
      return res.status(400).json({
        error: "costType, description, periodFrom, periodTo, valueType und value sind Pflichtfelder",
      });
    }
    
    // Authentifizierung optional - Admin-Endpoints sind vertrauenswürdig
    const userId = (req as any).user?.id || null;
    
    const cost = await prisma.manualCost.create({
      data: {
        costType,
        description,
        periodFrom: new Date(periodFrom),
        periodTo: new Date(periodTo),
        packPlantId: packPlantId ? Number(packPlantId) : null,
        valueType,
        value: Number(value),
        comment: comment || null,
        createdById: userId,
      },
      include: {
        packPlant: true,
        createdBy: { select: { name: true, email: true } },
      },
    });
    
    res.status(201).json(cost);
  } catch (err: any) {
    console.error("Fehler in POST /api/admin/manual-costs:", err);
    res.status(400).json({ error: err.message ?? "Fehler beim Anlegen der Kosten" });
  }
});

// ▶ PUT: Manuelle Kosten aktualisieren
app.put("/api/admin/manual-costs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      costType,
      description,
      periodFrom,
      periodTo,
      packPlantId,
      valueType,
      value,
      comment,
    } = req.body;
    
    const cost = await prisma.manualCost.update({
      where: { id: Number(id) },
      data: {
        costType: costType ? costType : undefined,
        description: description ? description : undefined,
        periodFrom: periodFrom ? new Date(periodFrom) : undefined,
        periodTo: periodTo ? new Date(periodTo) : undefined,
        packPlantId: packPlantId !== undefined ? (packPlantId ? Number(packPlantId) : null) : undefined,
        valueType: valueType ? valueType : undefined,
        value: value != null ? Number(value) : undefined,
        comment: comment !== undefined ? (comment || null) : undefined,
      },
      include: {
        packPlant: true,
        createdBy: { select: { name: true, email: true } },
      },
    });
    
    res.json(cost);
  } catch (err: any) {
    console.error("Fehler in PUT /api/admin/manual-costs/:id:", err);
    res.status(400).json({ error: err.message ?? "Fehler beim Aktualisieren der Kosten" });
  }
});

// ▶ DELETE: Manuelle Kosten löschen
app.delete("/api/admin/manual-costs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.manualCost.delete({
      where: { id: Number(id) },
    });
    res.json({ ok: true });
  } catch (err: any) {
    console.error("Fehler in DELETE /api/admin/manual-costs/:id:", err);
    res.status(400).json({ error: err.message ?? "Fehler beim Löschen der Kosten" });
  }
});

// ▶ GET: GuV-Berechnung (Gewinn- und Verlustrechnung)
app.get("/api/admin/pnl", async (req, res) => {
  try {
    // Keine Authentifizierung für GET - Admin-Endpoints sind vertrauenswürdig
    const { packPlantId, dateFrom, dateTo, productId, customerId } = req.query;
    
    const periodStart = dateFrom ? new Date(dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
    const periodEnd = dateTo ? new Date(dateTo as string) : new Date();
    periodStart.setHours(0, 0, 0, 0);
    periodEnd.setHours(23, 59, 59, 999);
    
    // ERTRÄGE: Verkäufe (CustomerSale)
    const salesWhere: any = {
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    };
    
    // Filter nach Packbetrieb über PackPlantStockMovement
    if (packPlantId) {
      const saleIds = await prisma.packPlantStockMovement.findMany({
        where: {
          packPlantId: Number(packPlantId),
          reason: "SALE",
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
          customerSaleId: { not: null },
        },
        select: { customerSaleId: true },
        distinct: ["customerSaleId"],
      });
      salesWhere.id = {
        in: saleIds.map((m) => m.customerSaleId).filter((id): id is number => id !== null),
      };
    }
    
    if (productId) salesWhere.productId = Number(productId);
    if (customerId) salesWhere.customerId = Number(customerId);
    
    const sales = await prisma.customerSale.findMany({
      where: salesWhere,
      include: {
        product: { include: { taxRate: true } as any },
      },
    });
    
    // Erlöse berechnen
    let totalRevenue = 0;
    const revenueByProduct: Record<number, number> = {};
    const revenueByCustomer: Record<number, number> = {};
    const revenueByPackPlant: Record<number, number> = {};
    
    for (const sale of sales) {
      const product = sale.product;
      const unitsPerColli = product?.unitsPerColli ?? 1;
      const colli = sale.quantityUnits / unitsPerColli;
      const netAmount = Number(sale.unitPrice) * colli;
      
      totalRevenue += netAmount;
      
      if (sale.productId) {
        revenueByProduct[sale.productId] = (revenueByProduct[sale.productId] || 0) + netAmount;
      }
      if (sale.customerId) {
        revenueByCustomer[sale.customerId] = (revenueByCustomer[sale.customerId] || 0) + netAmount;
      }
      
      // Packbetrieb über Movement finden
      const movement = await prisma.packPlantStockMovement.findFirst({
        where: {
          customerSaleId: sale.id,
          reason: "SALE",
        },
      });
      if (movement?.packPlantId) {
        revenueByPackPlant[movement.packPlantId] = (revenueByPackPlant[movement.packPlantId] || 0) + netAmount;
      }
    }
    
    // AUFWENDUNGEN: Abpackkosten (aus Gutschriften)
    const creditNotes = await prisma.accountingDocument.findMany({
      where: {
        documentType: "GUTSCHRIFT",
        servicePeriodFrom: { lte: periodEnd },
        servicePeriodTo: { gte: periodStart },
        recipientPackPlantId: packPlantId ? Number(packPlantId) : undefined,
      },
      include: {
        lines: true,
      },
    });
    
    let totalPackingCosts = 0;
    for (const doc of creditNotes) {
      for (const line of doc.lines) {
        totalPackingCosts += Number(line.netAmount);
      }
    }
    
    // AUFWENDUNGEN: Reklamationen/Retouren (aus CustomerSaleComplaint)
    const complaintsWhere: any = {
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    };
    
    if (packPlantId) {
      // Filter über CustomerSale -> PackPlantStockMovement
      const saleIds = await prisma.packPlantStockMovement.findMany({
        where: {
          packPlantId: Number(packPlantId),
          reason: "SALE",
          customerSaleId: { not: null },
        },
        select: { customerSaleId: true },
        distinct: ["customerSaleId"],
      });
      complaintsWhere.customerSaleId = {
        in: saleIds.map((m) => m.customerSaleId).filter((id): id is number => id !== null),
      };
    }
    
    const complaints = await prisma.customerSaleComplaint.findMany({
      where: complaintsWhere,
      include: {
        customerSale: {
          include: {
            product: true,
          },
        },
      },
    });
    
    let totalComplaintCosts = 0;
    for (const complaint of complaints) {
      totalComplaintCosts += Number(complaint.complaintAmount);
    }
    
    // AUFWENDUNGEN: Manuelle Kosten
    const manualCostsWhere: any = {
      OR: [
        { periodFrom: { lte: periodEnd, gte: periodStart } },
        { periodTo: { gte: periodStart, lte: periodEnd } },
        { AND: [{ periodFrom: { lte: periodStart } }, { periodTo: { gte: periodEnd } }] },
      ],
    };
    
    if (packPlantId) {
      manualCostsWhere.packPlantId = Number(packPlantId);
    }
    
    const manualCosts = await prisma.manualCost.findMany({
      where: manualCostsWhere,
      include: {
        packPlant: true,
      },
    });
    
    // Manuelle Kosten berechnen (absolute + prozentuale)
    let totalManualCosts = 0;
    const manualCostsByType: Record<string, number> = {};
    
    // Hilfsfunktion: Anzahl Wochen zwischen zwei Daten berechnen
    function getWeeksBetween(start: Date, end: Date): number {
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const diffMs = end.getTime() - start.getTime();
      return Math.ceil(diffMs / msPerWeek) || 1; // Mindestens 1 Woche
    }
    
    // Hilfsfunktion: Überlappung zwischen zwei Zeiträumen in Wochen
    function getOverlapWeeks(
      costStart: Date,
      costEnd: Date,
      calcStart: Date,
      calcEnd: Date
    ): number {
      const overlapStart = new Date(Math.max(costStart.getTime(), calcStart.getTime()));
      const overlapEnd = new Date(Math.min(costEnd.getTime(), calcEnd.getTime()));
      
      if (overlapStart > overlapEnd) {
        return 0; // Keine Überlappung
      }
      
      return getWeeksBetween(overlapStart, overlapEnd);
    }
    
    for (const cost of manualCosts) {
      let costAmount = 0;
      
      if (cost.valueType === "ABSOLUTE") {
        // Absolute Kosten: Auf Wochen aufteilen und nur anteilig für Berechnungszeitraum
        const costPeriodStart = new Date(cost.periodFrom);
        const costPeriodEnd = new Date(cost.periodTo);
        costPeriodStart.setHours(0, 0, 0, 0);
        costPeriodEnd.setHours(23, 59, 59, 999);
        
        // Gesamte Wochen im Kosten-Zeitraum
        const totalWeeksInCostPeriod = getWeeksBetween(costPeriodStart, costPeriodEnd);
        
        // Überlappende Wochen zwischen Kosten-Zeitraum und Berechnungszeitraum
        const overlapWeeks = getOverlapWeeks(
          costPeriodStart,
          costPeriodEnd,
          periodStart,
          periodEnd
        );
        
        if (overlapWeeks > 0 && totalWeeksInCostPeriod > 0) {
          // Anteiliger Betrag = Gesamtbetrag * (Überlappende Wochen / Gesamte Wochen)
          const totalCostValue = Number(cost.value);
          costAmount = (totalCostValue * overlapWeeks) / totalWeeksInCostPeriod;
        }
      } else if (cost.valueType === "PERCENTAGE") {
        // Prozentual: Bezug auf Gesamterlös im Zeitraum der Kosten
        const costPeriodStart = new Date(cost.periodFrom);
        const costPeriodEnd = new Date(cost.periodTo);
        costPeriodStart.setHours(0, 0, 0, 0);
        costPeriodEnd.setHours(23, 59, 59, 999);
        
        // Erlös im Kosten-Zeitraum berechnen
        const costSalesWhere: any = {
          date: {
            gte: costPeriodStart,
            lte: costPeriodEnd,
          },
        };
        
        if (cost.packPlantId) {
          const costSaleIds = await prisma.packPlantStockMovement.findMany({
            where: {
              packPlantId: cost.packPlantId,
              reason: "SALE",
              createdAt: {
                gte: costPeriodStart,
                lte: costPeriodEnd,
              },
              customerSaleId: { not: null },
            },
            select: { customerSaleId: true },
            distinct: ["customerSaleId"],
          });
          costSalesWhere.id = {
            in: costSaleIds.map((m) => m.customerSaleId).filter((id): id is number => id !== null),
          };
        }
        
        const costSales = await prisma.customerSale.findMany({
          where: costSalesWhere,
          include: {
            product: true,
          },
        });
        
        let costPeriodRevenue = 0;
        for (const sale of costSales) {
          const product = sale.product;
          const unitsPerColli = product?.unitsPerColli ?? 1;
          const colli = sale.quantityUnits / unitsPerColli;
          costPeriodRevenue += Number(sale.unitPrice) * colli;
        }
        
        costAmount = (costPeriodRevenue * Number(cost.value)) / 100;
        
        // Berechneten Betrag speichern
        await prisma.manualCost.update({
          where: { id: cost.id },
          data: { calculatedAmount: costAmount },
        });
      }
      
      totalManualCosts += costAmount;
      const costTypeKey = cost.costType;
      manualCostsByType[costTypeKey] = (manualCostsByType[costTypeKey] || 0) + costAmount;
    }
    
    // ERGEBNIS
    const totalExpenses = totalPackingCosts + totalComplaintCosts + totalManualCosts;
    const result = totalRevenue - totalExpenses;
    
    // Break-Even-Preis berechnen: Wie hoch müsste der VarietyQualityPrice sein, um auf 0 zu kommen?
    // VarietyQualityPrice ist der Preis pro kg, den die EG an die Bauern zahlt
    // Break-Even bedeutet: Erlöse = Aufwendungen (inkl. Zahlungen an Bauern)
    // Aktuell: result = totalRevenue - totalExpenses
    // Die totalExpenses enthalten noch NICHT die Zahlungen an Bauern (VarietyQualityPrice)
    // Um auf 0 zu kommen: totalRevenue = totalExpenses + (VarietyQualityPrice * verkaufte Menge in kg)
    // Also: VarietyQualityPrice = (totalRevenue - totalExpenses) / verkaufte Menge in kg
    // Oder: VarietyQualityPrice = result / verkaufte Menge in kg
    // ABER: Wenn result negativ ist, bedeutet das, dass wir bereits zu viel ausgeben
    // In diesem Fall: VarietyQualityPrice = 0 (kann nicht negativ sein)
    
    let breakEvenPricePerKg = 0;
    
    // Verkaufte Menge in kg aus den tatsächlichen Verkäufen (CustomerSale) berechnen
    // Nicht aus PackagingRuns, da diese nur die verpackte Menge zeigen
    let totalKgSold = 0;
    
    for (const sale of sales) {
      const product = sale.product;
      if (!product) continue;
      
      // Umrechnung: quantityUnits (Einheiten) -> kg
      // unitKg ist die kg pro Einheit (z.B. 2.5 kg pro Einheit)
      const kgPerUnit = Number(product.unitKg) || 1;
      const kgSold = sale.quantityUnits * kgPerUnit;
      totalKgSold += kgSold;
    }
    
    if (totalKgSold > 0 && totalRevenue > 0) {
      // Break-Even-Preis: Wie hoch darf der Preis pro kg sein, den wir an Bauern zahlen?
      // Aktuell: result = totalRevenue - totalExpenses
      // Die Aufwendungen enthalten noch NICHT die Zahlungen an Bauern
      // Wenn wir VarietyQualityPrice * totalKgSold an Bauern zahlen, dann:
      // Neues Ergebnis = totalRevenue - totalExpenses - (VarietyQualityPrice * totalKgSold)
      // Für Break-Even (0): totalRevenue - totalExpenses - (VarietyQualityPrice * totalKgSold) = 0
      // Also: VarietyQualityPrice = (totalRevenue - totalExpenses) / totalKgSold
      // Oder: VarietyQualityPrice = result / totalKgSold
      
      // ABER: Wenn result negativ ist, können wir nicht mehr an Bauern zahlen
      // In diesem Fall: 0
      if (result > 0) {
        const breakEvenPrice = result / totalKgSold;
        
        // Nur anzeigen, wenn positiv, endlich und nicht NaN
        if (breakEvenPrice > 0 && Number.isFinite(breakEvenPrice) && !Number.isNaN(breakEvenPrice)) {
          breakEvenPricePerKg = breakEvenPrice;
        }
      }
      // Wenn result <= 0, bleibt breakEvenPricePerKg = 0
    }
    
    res.json({
      period: {
        from: periodStart,
        to: periodEnd,
      },
      revenue: {
        total: totalRevenue,
        byProduct: revenueByProduct,
        byCustomer: revenueByCustomer,
        byPackPlant: revenueByPackPlant,
        salesCount: sales.length,
      },
      expenses: {
        total: totalExpenses,
        packingCosts: totalPackingCosts,
        complaintCosts: totalComplaintCosts,
        manualCosts: totalManualCosts,
        manualCostsByType,
      },
      result,
      resultPercent: totalRevenue > 0 ? (result / totalRevenue) * 100 : 0,
      breakEvenPricePerKg: breakEvenPricePerKg > 0 ? breakEvenPricePerKg : 0,
    });
  } catch (err: any) {
    console.error("Fehler in GET /api/admin/pnl:", err);
    res.status(500).json({ error: err.message ?? "Interner Fehler" });
  }
});

// ▶ Accounting-Dokument PDF-Download
app.get("/api/accounting-documents/:filename", (req, res) => {
  const { filename } = req.params;

  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return res.status(400).json({ error: "Ungültiger Dateiname" });
  }

  const filepath = path.join(ACCOUNTING_DOCS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "PDF nicht gefunden" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.sendFile(filepath);
});

// ▶ Packbetriebe laden
app.get("/api/pack-plants", async (_req, res) => {
  try {
    const packPlants = await prisma.packPlant.findMany({
      orderBy: { name: "asc" },
    });
    res.json(packPlants);
  } catch (err: any) {
    console.error("Fehler in GET /api/pack-plants:", err);
    res.status(500).json({ error: "Fehler beim Laden der Packbetriebe" });
  }
});

// ▶ Helper: Bauernlager ändern + Movement anlegen (inkl. Snapshots)
async function applyFarmerStockChange(
  farmerId: number,
  varietyId: number,
  changeKg: number,
  reason: string,
  fieldName?: string | null,
  harvestDate?: string | null
) {
  const snap = await getSnapshotsForFarmerVariety(farmerId, varietyId);

  const existing = await prisma.farmerStock.findUnique({
    where: { farmerId_varietyId: { farmerId, varietyId } },
  });

  if (existing) {
    await prisma.farmerStock.update({
      where: { id: existing.id },
      data: {
        quantityTons: Number(existing.quantityTons) + Number(changeKg),
        ...snap,
      },
    });
  } else {
    await prisma.farmerStock.create({
      data: {
        farmerId,
        varietyId,
        quantityTons: Number(changeKg),
        ...snap,
      },
    });
  }

  await prisma.farmerStockMovement.create({
    data: {
      farmerId,
      varietyId,
      changeTons: Number(changeKg),
      reason,
      fieldName: fieldName ?? null,
      harvestDate: harvestDate ? new Date(harvestDate) : null,
      ...snap,
    },
  });
}

// ▶ FarmerStock (generische Änderung – wird evtl. vom Frontend noch nicht genutzt)
app.post("/api/farmer-stock/change", async (req, res) => {
  const { farmerId, varietyId, changeKg, reason } = req.body;

  if (!farmerId || !varietyId || changeKg == null || !reason) {
    return res.status(400).json({
      error: "farmerId, varietyId, changeKg und reason sind erforderlich",
    });
  }

  try {
    await applyFarmerStockChange(
      Number(farmerId),
      Number(varietyId),
      Number(changeKg),
      String(reason)
    );

    const updated = await prisma.farmerStock.findUnique({
      where: { farmerId_varietyId: { farmerId: Number(farmerId), varietyId: Number(varietyId) } },
      include: { farmer: true, variety: true },
    });

    res.json(updated);
  } catch (err) {
    console.error("Fehler in /api/farmer-stock/change:", err);
    res.status(500).json({ error: "Fehler bei Lageränderung" });
  }
});

// ▶ Inventur beim Bauern: absoluten Lagerstand setzen (kg)
app.post("/api/farmer-stock/inventory", async (req, res) => {
  const { farmerId, varietyId, newQuantityTons } = req.body; // newQuantityTons = kg

  if (!farmerId || !varietyId || newQuantityTons == null) {
    return res.status(400).json({
      error: "farmerId, varietyId und newQuantityTons sind erforderlich",
    });
  }

  try {
    const existing = await prisma.farmerStock.findUnique({
      where: {
        farmerId_varietyId: {
          farmerId: Number(farmerId),
          varietyId: Number(varietyId),
        },
      },
    });

    const current = existing ? Number(existing.quantityTons) : 0;
    const target = Number(newQuantityTons);
    const diff = target - current;

    await applyFarmerStockChange(
      Number(farmerId),
      Number(varietyId),
      diff,
      "INVENTORY"
    );

    const updated = await prisma.farmerStock.findUnique({
      where: {
        farmerId_varietyId: {
          farmerId: Number(farmerId),
          varietyId: Number(varietyId),
        },
      },
      include: { farmer: true, variety: true },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error("Fehler in /api/farmer-stock/inventory:", err);
    res.status(500).json({ error: "Fehler bei Inventur" });
  }
});

// ▶ Verkauf ab Hof / an EG: Lager reduzieren (kg) + bei EG in Packstelle buchen
app.post("/api/farmer-stock/direct-sale", async (req, res) => {
  try {
    const {
      farmerId,
      varietyId,
      quantityTons,
      saleType,      // "PRIVATE" | "EG"
      fieldName,
      harvestDate,
      sortierGroesse, // Sortiergröße für Kartoffeln
      varietyQuality, // NEU: Qualität Q1/Q2/UEBERGROESSE für Lieferschein/Etikett
    } = req.body;

    console.log("POST /api/farmer-stock/direct-sale:", {
      farmerId,
      varietyId,
      quantityTons,
      saleType,
    });

    const qtyKg = Number(quantityTons ?? 0);
    if (!farmerId || !varietyId || qtyKg <= 0) {
      console.error("Ungültige Parameter:", { farmerId, varietyId, qtyKg });
      return res.status(400).json({ error: "Ungültige Parameter" });
    }

    const farmerIdNum = Number(farmerId);
    const varietyIdNum = Number(varietyId);
    const PACKSTATION_ID = 1;

    // 1) Bauernlager-Bestand prüfen + reduzieren
    const stock = await prisma.farmerStock.findUnique({
      where: {
        farmerId_varietyId: {
          farmerId: farmerIdNum,
          varietyId: varietyIdNum,
        },
      },
    });

    if (!stock) {
      console.error("Kein Lagerbestand gefunden:", { farmerIdNum, varietyIdNum });
      return res
        .status(400)
        .json({ error: "Kein Lagerbestand für diesen Bauern / diese Sorte gefunden" });
    }

    const current = Number(stock.quantityTons);
    if (current < qtyKg) {
      console.error("Nicht genug Bestand:", { current, qtyKg });
      return res
        .status(400)
        .json({ error: "Nicht genug Bestand im Bauernlager" });
    }

    // Bestand im Bauernlager reduzieren
    const updatedStock = await prisma.farmerStock.update({
      where: { id: stock.id },
      data: {
        quantityTons: current - qtyKg,
      },
    });
    console.log("Bauernlager aktualisiert:", { id: stock.id, alt: current, neu: updatedStock.quantityTons });

    // Snapshots für Movement laden
    const snap = await getSnapshotsForFarmerVariety(farmerIdNum, varietyIdNum);

    // Movement im Bauernlager protokollieren
    const movement = await prisma.farmerStockMovement.create({
      data: {
        farmerId: farmerIdNum,
        varietyId: varietyIdNum,
        changeTons: -qtyKg,
        reason:
          saleType === "PRIVATE"
            ? "FARMER_DIRECT_SALE_PRIVATE"
            : "FARMER_DIRECT_SALE_EG",
        fieldName: fieldName || null,
        harvestDate: harvestDate ? new Date(harvestDate) : null,
        sortierGroesse: saleType === "EG" ? (sortierGroesse || null) : null,
        varietyQuality: saleType === "EG" ? (varietyQuality || null) : null,
        ...snap,
      },
    });
    console.log("FarmerStockMovement erstellt:", movement.id);

    // 2) Nur wenn Verkauf an EG: in Packstellenlager buchen (+ RAW_IN_FROM_FARMER-Movement)
    if (saleType === "EG") {
      try {
        await applyPackStationStockChange(
          PACKSTATION_ID,
          farmerIdNum,
          varietyIdNum,
          qtyKg,
          "RAW_IN_FROM_FARMER",
          "Verkauf Bauer -> EG (Rohware in Packstelle)",
          sortierGroesse || null,
          varietyQuality || null
        );
        console.log("PackStationStockChange erfolgreich durchgeführt");
      } catch (packStationErr: any) {
        console.error("Fehler bei applyPackStationStockChange:", packStationErr);
        // Fehler wird weitergegeben, damit der gesamte Vorgang fehlschlägt
        throw new Error(`Fehler beim Buchen in Packstelle: ${packStationErr.message}`);
      }
    }

    console.log("Verkauf erfolgreich verbucht");
    res.json({ ok: true });
  } catch (err: any) {
    console.error("Fehler bei /api/farmer-stock/direct-sale:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ error: err.message ?? "Interner Fehler" });
  }
});

// ▶ Bauernlager lesen (optional gefiltert nach farmerId)
app.get("/api/farmer-stock", async (req, res) => {
  const farmerIdRaw = req.query.farmerId;
  const farmerId = farmerIdRaw ? Number(farmerIdRaw) : undefined;

  try {
    const stocks = await prisma.farmerStock.findMany({
      where: farmerId ? { farmerId } : undefined,
      include: {
        farmer: true,
        variety: true,
      },
      orderBy: [
        { farmerId: "asc" },
        { varietyId: "asc" },
      ],
    });

    res.json(stocks);
  } catch (err: any) {
    console.error("Fehler in /api/farmer-stock:", err);
    res.status(500).json({
      error: "Fehler beim Laden der Bauern-Lagerstände",
      detail: String(err.message || err),
    });
  }
});

// ▶ Packstation-Auswertung pro Bauer: angeliefert, verpackt, Ausschuss, Inventur, Ausbeute (pro Inventur-Periode)
app.get("/api/farmer-packstation-stats", async (req, res) => {
  const farmerIdRaw = req.query.farmerId;
  const maxDeliveriesRaw = req.query.maxDeliveries;

  if (!farmerIdRaw) {
    return res.status(400).json({ error: "farmerId erforderlich" });
  }

  const farmerId = Number(farmerIdRaw);
  const maxDeliveries =
    maxDeliveriesRaw != null ? Number(maxDeliveriesRaw) : undefined;

  try {
    // 1) Daten laden (erstmal komplett)
    const [stocks, movementsAll, runsAll] = await Promise.all([
      prisma.packStationStock.findMany({
        where: { farmerId },
        include: { variety: true },
      }),
      prisma.packStationStockMovement.findMany({
        where: { farmerId },
        include: { variety: true },
      }),
      prisma.packagingRun.findMany({
        where: { farmerId },
        include: { variety: true },
      }),
    ]);

    // 2) ggf. auf die letzten N Lieferungen (RAW_IN_FROM_FARMER) begrenzen
    let movements = movementsAll;
    let runs = runsAll;

    if (
      maxDeliveries &&
      Number.isFinite(maxDeliveries) &&
      maxDeliveries > 0
    ) {
      // alle Lieferungen dieses Bauern sortiert nach Datum
      const deliveries = movementsAll
        .filter((m) => m.reason === "RAW_IN_FROM_FARMER")
        .sort(
          (a, b) =>
            a.createdAt.getTime() - b.createdAt.getTime()
        );

      if (deliveries.length > maxDeliveries) {
        // Cutoff = älteste Lieferung innerhalb der "letzten N"
        const cutoffDelivery =
          deliveries[deliveries.length - maxDeliveries];
        const cutoffDate = cutoffDelivery.createdAt;

        // nur Bewegungen ab diesem Datum berücksichtigen
        movements = movementsAll.filter(
          (m) => m.createdAt >= cutoffDate
        );

        // Packaging-Runs ab gleichem Datum
        runs = runsAll.filter((r) => {
          const d = r.date ?? (r as any).createdAt ?? null;
          return d ? d >= cutoffDate : false;
        });
      }
    }

    type StatRow = {
      varietyId: number;
      varietyName: string;
      cookingType: string;
      quality: string;
      deliveredKg: number;      // angeliefert
      packedKg: number;         // verpackt (finishedKg)
      wasteKg: number;          // Sortierabfall
      inventoryZeroKg: number;  // Inventur 0
      washingLossKg: number;    // Waschverlust (berechnet)
      lossTotalKg: number;      // Verlust gesamt
      yieldPercent: number;     // Ausbeute %
      lossPercent: number;      // Verlust %
      currentKg: number;        // aktueller Bestand Packstelle (nur letzte Periode)
    };

    type VarietyMeta = {
      id: number;
      name: string;
      cookingType: string;
      quality: string;
    };

    // Meta je Sorte sammeln (Name, Kocheigenschaft, Qualität)
    const varietyMeta = new Map<number, VarietyMeta>();
    const ensureMeta = (v: any) => {
      if (!v) return;
      if (!varietyMeta.has(v.id)) {
        varietyMeta.set(v.id, {
          id: v.id,
          name: v.name,
          cookingType: v.cookingType,
          quality: v.quality,
        });
      }
    };

    movements.forEach((m) => ensureMeta(m.variety));
    runs.forEach((r) => ensureMeta(r.variety));
    stocks.forEach((s) => ensureMeta(s.variety));

    // aktueller Bestand je Sorte (gehört immer zur letzten, offenen Periode)
    const stockByVariety = new Map<number, number>();
    for (const s of stocks) {
      const vId = s.varietyId;
      const qty = Number(s.quantityKg ?? 0);
      stockByVariety.set(vId, (stockByVariety.get(vId) ?? 0) + qty);
    }

    // Events pro Sorte aufbauen (Lieferungen, Abfall, Inventur 0, Verpackung)
    type Event =
      | { type: "RAW_IN"; date: Date; kg: number }
      | { type: "WASTE"; date: Date; kg: number }
      | { type: "INVENTORY_ZERO"; date: Date; kg: number }
      | { type: "PACKAGING"; date: Date; kg: number };

    const eventsByVariety = new Map<number, Event[]>();

    function pushEvent(varietyId: number, event: Event) {
      const arr = eventsByVariety.get(varietyId) ?? [];
      arr.push(event);
      eventsByVariety.set(varietyId, arr);
    }

    // Bewegungen → Events
    for (const m of movements) {
      if (!m.varietyId || !m.variety) continue;
      const vId = m.varietyId;
      const val = Number(m.changeKg);
      const date = m.createdAt ?? new Date();

      switch (m.reason) {
        case "RAW_IN_FROM_FARMER":
          pushEvent(vId, { type: "RAW_IN", date, kg: val });
          break;
        case "SORTING_WASTE":
          pushEvent(vId, { type: "WASTE", date, kg: Math.abs(val) });
          break;
        case "INVENTORY_ZERO":
          pushEvent(vId, { type: "INVENTORY_ZERO", date, kg: Math.abs(val) });
          break;
        default:
          // PACKAGING_OUT usw. ignorieren – Verpackung kommt aus PackagingRun
          break;
      }
    }

    // PackagingRuns → Events
    for (const r of runs) {
      if (!r.varietyId || !r.variety) continue;
      const vId = r.varietyId;
      const kg = Number(r.finishedKg ?? 0);
      const date = r.date ?? new Date();
      if (kg > 0) {
        pushEvent(vId, { type: "PACKAGING", date, kg });
      }
    }

    const allRows: StatRow[] = [];

    // Hilfsfunktion: leere Zeile für eine Sorte
    function createEmptyRow(meta: VarietyMeta): StatRow {
      return {
        varietyId: meta.id,
        varietyName: meta.name,
        cookingType: meta.cookingType,
        quality: meta.quality,
        deliveredKg: 0,
        packedKg: 0,
        wasteKg: 0,
        inventoryZeroKg: 0,
        washingLossKg: 0,
        lossTotalKg: 0,
        yieldPercent: 0,
        lossPercent: 0,
        currentKg: 0,
      };
    }

    // Jetzt pro Sorte: Events chronologisch durchgehen und bei INVENTORY_ZERO neue Zeile starten
    for (const [varietyId, meta] of varietyMeta.entries()) {
      const events = eventsByVariety.get(varietyId) ?? [];

      // falls es gar keine Events, aber Bestand gibt → eine leere Zeile mit nur Bestand
      if (events.length === 0 && stockByVariety.has(varietyId)) {
        const row = createEmptyRow(meta);
        row.currentKg = stockByVariety.get(varietyId) ?? 0;
        allRows.push(row);
        continue;
      }

      // Events nach Datum sortieren
      events.sort((a, b) => a.date.getTime() - b.date.getTime());

      const segments: StatRow[] = [];
      let currentRow = createEmptyRow(meta);

      for (const ev of events) {
        switch (ev.type) {
          case "RAW_IN":
            currentRow.deliveredKg += ev.kg;
            break;
          case "WASTE":
            currentRow.wasteKg += ev.kg;
            break;
          case "PACKAGING":
            currentRow.packedKg += ev.kg;
            break;
          case "INVENTORY_ZERO":
            currentRow.inventoryZeroKg += ev.kg;
            // Segment abschließen
            segments.push(currentRow);
            currentRow = createEmptyRow(meta); // neue Periode
            break;
        }
      }

      // letztes offenes Segment nur übernehmen, wenn es Daten enthält
      const hasData =
        currentRow.deliveredKg > 0 ||
        currentRow.packedKg > 0 ||
        currentRow.wasteKg > 0 ||
        currentRow.inventoryZeroKg > 0;

      if (hasData) {
        segments.push(currentRow);
      }

      if (segments.length === 0) {
        continue;
      }

      // aktuellen Bestand der Sorte in die letzte Periode legen
      const currentStock = stockByVariety.get(varietyId) ?? 0;
      const lastSegment = segments[segments.length - 1];
      lastSegment.currentKg = currentStock;

      // jetzt für jede Periode Waschverlust, Gesamtverlust und Prozente berechnen
      for (const row of segments) {
        // Waschverlust = gelief. Menge - Bestand - verpackt - Ausschuss - Inventur
        const processedBaseWithoutWash =
          row.packedKg + row.wasteKg + row.inventoryZeroKg;
        const washingLoss =
          row.deliveredKg -
          row.currentKg -
          processedBaseWithoutWash;

        row.washingLossKg = washingLoss > 0 ? washingLoss : 0;
        row.lossTotalKg =
          row.wasteKg + row.inventoryZeroKg + row.washingLossKg;

        const processedBase = row.packedKg + row.lossTotalKg; // verarbeitete Menge

        if (processedBase > 0) {
          row.yieldPercent = (row.packedKg / processedBase) * 100;
          row.lossPercent = (row.lossTotalKg / processedBase) * 100;
        } else {
          row.yieldPercent = 0;
          row.lossPercent = 0;
        }

        allRows.push(row);
      }
    }

    const result = allRows
      .sort((a, b) =>
        a.varietyName.localeCompare(b.varietyName, "de", {
          sensitivity: "base",
        })
      )
      .map((row) => ({
        ...row,
        // Alias wie bisher
        totalLossKg: row.lossTotalKg,
      }));

    res.json(result);
  } catch (err: any) {
    console.error("Fehler in GET /api/farmer-packstation-stats:", err);
    res.status(500).json({
      error: "Fehler beim Laden der Packstations-Auswertung",
      detail: String(err.message || err),
    });
  }
});
// ▶ Organisator: Lieferungen Rohware in die Packstelle (RAW_IN_FROM_FARMER)
app.get("/api/organizer/deliveries", async (req, res) => {
  const weeksRaw = req.query.weeks;
  const weeks = weeksRaw ? Number(weeksRaw) : 4; // default 4 Wochen

  if (!Number.isFinite(weeks) || weeks <= 0) {
    return res.status(400).json({ error: "weeks muss > 0 sein" });
  }

  // Von heute zurückgerechnet
  const now = new Date();
  const fromDate = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);

  try {
    const movements = await prisma.packStationStockMovement.findMany({
      where: {
        reason: "RAW_IN_FROM_FARMER",
        createdAt: { gte: fromDate },
      },
      include: {
        farmer: true,
        variety: true,
      },
      orderBy: [{ createdAt: "asc" }],
    });

    const result = movements.map((m) => ({
      id: m.id,
      date: m.createdAt,
      farmerId: m.farmerId,
      farmerName: m.farmer?.name ?? "",
      varietyId: m.varietyId,
      varietyName: m.variety?.name ?? "",
      cookingType: m.variety?.cookingType ?? null,
      quality: m.variety?.quality ?? null,
      varietyQuality: (m as any).varietyQuality ?? null, // NEU: erfasste Qualität für Lieferschein
      quantityKg: Number(m.changeKg), // RAW_IN_FROM_FARMER ist positiv
      sortierGroesse: (m as any).sortierGroesse ?? null,
    }));

    res.json(result);
  } catch (err: any) {
    console.error("Fehler in GET /api/organizer/deliveries:", err);
    res.status(500).json({
      error: "Fehler beim Laden der Lieferungen",
      detail: String(err.message || err),
    });
  }
});

// ▶ Helper: Packstationslager ändern + Movement anlegen (inkl. Snapshots)
// HINWEIS: PackStationStockMovement hat kein productId Feld - die Verbindung zu Produkten
// erfolgt nur über PackagingRun
async function applyPackStationStockChange(
  packStationId: number,
  farmerId: number,
  varietyId: number,
  changeKg: number,
  reason: string,
  comment?: string | null,
  sortierGroesse?: string | null,
  varietyQuality?: string | null
) {
  const snaps = {
    ...(await getSnapshotsForFarmerVariety(farmerId, varietyId)),
    ...(await getSnapshotsForPackStation(packStationId)),
  };

  const existing = await prisma.packStationStock.findUnique({
    where: {
      packStationId_farmerId_varietyId: {
        packStationId,
        farmerId,
        varietyId,
      },
    },
  });

  if (existing) {
    await prisma.packStationStock.update({
      where: { id: existing.id },
      data: {
        quantityKg: Number(existing.quantityKg) + Number(changeKg),
        ...snaps,
      },
    });
  } else {
    await prisma.packStationStock.create({
      data: {
        packStationId,
        farmerId,
        varietyId,
        quantityKg: Number(changeKg),
        ...snaps,
      },
    });
  }

  await prisma.packStationStockMovement.create({
    data: {
      packStationId,
      farmerId,
      varietyId,
      changeKg: Number(changeKg),
      reason,
      comment: comment ?? null,
      sortierGroesse: sortierGroesse as any ?? null,
      varietyQuality: varietyQuality as any ?? null,
      ...snaps,
    },
  });
}

app.post("/api/packstation-stock/change", async (req, res) => {
  const { packStationId, farmerId, varietyId, changeKg, reason, comment } = req.body;

  if (!packStationId || !farmerId || !varietyId || changeKg == null || !reason) {
    return res.status(400).json({
      error: "packStationId, farmerId, varietyId, changeKg und reason sind erforderlich",
    });
  }

  try {
    await applyPackStationStockChange(
      Number(packStationId),
      Number(farmerId),
      Number(varietyId),
      Number(changeKg),
      String(reason),
      comment ?? null
    );

    const updated = await prisma.packStationStock.findUnique({
      where: {
        packStationId_farmerId_varietyId: {
          packStationId: Number(packStationId),
          farmerId: Number(farmerId),
          varietyId: Number(varietyId),
        },
      },
      include: { farmer: true, variety: true },
    });

    res.json(updated);
  } catch (err: any) {
    console.error("Fehler in POST /api/packstation-stock/change:", err);
    res.status(500).json({ error: "Fehler bei Packstations-Lageränderung" });
  }
});

// ▶ PACKPLANT-LAGER (Debug / Übersicht)
app.get("/api/packplant-stock", async (_req, res) => {
  try {
    const stocks = await prisma.packPlantStock.findMany({
      include: {
        packPlant: true,
        product: true,
      },
      orderBy: [
        { packPlantId: "asc" },
        { productId: "asc" },
      ],
    });

    res.json(stocks);
  } catch (err: any) {
    console.error("Fehler in GET /api/packplant-stock:", err);
    res.status(500).json({ error: "Fehler beim Laden des Packbetriebs-Lagers" });
  }
});

// ▶ Helper: Preis zu Kunde/Produkt an einem Datum holen
async function getPriceForCustomerProductAtDate(
  customerId: number,
  productId: number,
  atDate: Date
) {
  // Nimmt immer den letzten Preis, dessen validFrom <= atDate ist
  // und der noch gültig ist (validTo ist null oder > atDate)
  return prisma.productPrice.findFirst({
    where: {
      customerId,
      productId,
      validFrom: {
        lte: atDate,
      },
      OR: [
        { validTo: null },
        { validTo: { gt: atDate } },
      ],
    },
    orderBy: {
      validFrom: "desc",
    },
  });
}

// ▶ Helper: validTo für alle Preise einer Gruppe (Customer + Product) neu berechnen
async function recalculateProductPriceValidToForGroup(
  customerId: number,
  productId: number
): Promise<void> {
  // Alle Preise dieser Gruppe laden, sortiert nach validFrom
  const prices = await prisma.productPrice.findMany({
    where: { customerId, productId },
    orderBy: { validFrom: "asc" },
  });

  if (prices.length === 0) return;

  // Für jeden Preis validTo berechnen
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
      await prisma.productPrice.update({
        where: { id: currentPrice.id },
        data: { validTo: newValidTo },
      });
    }
  }
}

// ▶ Helper: validTo für alle VarietyQualityPrice einer Qualität neu berechnen
async function recalculateVarietyQualityPriceValidTo(
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

    const currentValidTo = currentPrice.validTo;
    const needsUpdate =
      (currentValidTo === null && newValidTo !== null) ||
      (currentValidTo !== null && newValidTo === null) ||
      (currentValidTo !== null &&
        newValidTo !== null &&
        currentValidTo.getTime() !== newValidTo.getTime());

    if (needsUpdate) {
      await prisma.varietyQualityPrice.update({
        where: { id: currentPrice.id },
        data: { validTo: newValidTo },
      });
    }
  }
}

// ▶ Helper: Preis für eine Qualität zu einem bestimmten Datum ermitteln
async function getVarietyQualityPriceForDate(
  quality: "Q1" | "Q2" | "UEBERGROESSE",
  date: Date
): Promise<{
  pricePerKg: number;
  validFrom: Date;
  validTo: Date | null;
  priceId: number;
} | null> {
  // Preis ist gültig wenn: validFrom <= date UND (validTo ist null ODER date < validTo)
  const price = await prisma.varietyQualityPrice.findFirst({
    where: {
      quality,
      validFrom: { lte: date },
      OR: [
        { validTo: null },
        { validTo: { gt: date } },
      ],
    },
    orderBy: { validFrom: "desc" }, // Neuesten passenden Preis nehmen
  });

  if (!price) return null;

  return {
    pricePerKg: Number(price.pricePerKg),
    validFrom: price.validFrom,
    validTo: price.validTo,
    priceId: price.id,
  };
}

// ▶ Typen für Bauernabrechnung
type StatementLineType =
  | "LIEFERUNG"      // Rohware-Lieferung an Packstelle
  | "RETOUR_MENGE"   // Retour-Menge (nur informativ, Preis 0)
  | "ABPACKKOSTEN"   // Abpackkosten bei Retourware
  | "PROZENTABZUG";  // Prozentreklamation

interface StatementLine {
  date: Date;
  lineType: StatementLineType;
  description: string;
  customer?: string;
  product?: string;
  variety?: string;
  quality?: string;
  quantityKg: number;
  quantityUnits?: number;
  unitPrice: number;
  amount: number;
  vatRatePercent?: number;
  vatAmount?: number;
  discountPercent?: number;
  referenceId?: number;
  referenceType?: "PackStationStockMovement" | "CustomerSaleComplaint";
}

interface FarmerStatement {
  farmerId: number;
  farmerName: string;
  farmName?: string;
  ggn?: string;
  contactInfo?: string;
  email?: string;
  address?: string;
  isFlatRate: boolean;
  flatRateNote?: string | null;
  periodStart: Date;
  periodEnd: Date;
  lines: StatementLine[];
  totalAmount: number; // Netto-Betrag (ohne Abpackkosten)
  totalVat: number; // MWSt für normale Posten (13% pauschal oder 0%)
  packingCostsAmount: number; // Netto-Betrag Abpackkosten
  packingCostsVat: number; // MWSt für Abpackkosten (20%)
  totalGross: number; // Gesamt-Brutto (Netto + MWSt 13% + MWSt 20%)
  totalDeliveryKg: number;
  totalRetourKg: number;
  createdAt: Date;
}

// Alias für Rückwärtskompatibilität
type FarmerMonthlyStatement = FarmerStatement & { year: number; month: number };

// ▶ Service: Bauernabrechnung für beliebigen Zeitraum
// NEUE LOGIK: Basis auf PackagingRun, Preise aus VarietyQualityPrice, Reklamationen aus CustomerSaleComplaint
async function getFarmerStatement(
  farmerId: number,
  dateFrom: Date,
  dateTo: Date
): Promise<FarmerStatement> {
  // 1. Zeitraum normalisieren (Beginn 00:00, Ende 23:59:59)
  const periodStart = new Date(dateFrom);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(dateTo);
  periodEnd.setHours(23, 59, 59, 999);

  // 2. Bauer laden
  const farmer = await prisma.farmer.findUnique({
    where: { id: farmerId },
    include: { address: true },
  });

  if (!farmer) {
    throw new Error(`Bauer mit ID ${farmerId} nicht gefunden`);
  }

  const isFlatRate = !!(farmer as any).isFlatRate;
  const flatRateNote = (farmer as any).flatRateNote ?? null;

  // Adresse formatieren
  let addressText: string | undefined;
  if (farmer.address) {
    const parts = [
      farmer.address.street,
      `${farmer.address.postalCode ?? ""} ${farmer.address.city ?? ""}`.trim(),
    ].filter(Boolean);
    addressText = parts.join(", ");
  }

  const lines: StatementLine[] = [];
  let totalDeliveryKg = 0;
  let totalRetourKg = 0;
  // WICHTIG: Für pauschalierte Landwirte wird immer 13% MWSt verwendet,
  // unabhängig von der eingestellten TaxRate des Produkts.
  // Für nicht-pauschalierte Landwirte: Steuersatz aus dem jeweiligen Produkt.
  // Ausnahme: Abpackkosten sind eine Dienstleistung und unterliegen immer 20% MWSt.

  // 3. PackagingRun laden (Verpackungsbuchungen als Basis)
  const packagingRuns = await prisma.packagingRun.findMany({
    where: {
      farmerId,
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      variety: true,
      product: {
        include: { taxRate: true } as any,
      },
    },
    orderBy: { date: "asc" },
  });

  // 4. PackagingRuns verarbeiten
  for (const run of packagingRuns) {
    const finishedKg = Number(run.finishedKg);
    const variety = run.variety;
    const product = run.product as any;
    
    // Qualität aus Variety
    const quality = variety?.quality as "Q1" | "Q2" | "UEBERGROESSE" | null;

    // Preis aus VarietyQualityPrice ermitteln
    let pricePerKg = 0;
    if (quality) {
      const priceInfo = await getVarietyQualityPriceForDate(quality, run.date);
      if (priceInfo) {
        pricePerKg = priceInfo.pricePerKg;
      }
    }

    // Steuersatz ermitteln:
    // - Pauschalierter Betrieb: immer 13%
    // - Normaler Betrieb: Steuersatz aus dem Produkt (falls vorhanden, sonst 0%)
    let vatRatePercent = 0;
    if (isFlatRate) {
      vatRatePercent = 13;
    } else {
      // Steuersatz aus dem Produkt holen
      const productWithTax = product as any;
      vatRatePercent = Number(productWithTax?.taxRate?.ratePercent ?? 0);
    }

    // Verpackungsbuchung als Lieferung verbuchen
    totalDeliveryKg += finishedKg;
    const amount = finishedKg * pricePerKg;

    lines.push({
      date: run.date,
      lineType: "LIEFERUNG",
      description: `Verpackung ${run.varietyNameSnapshot} → ${run.productNameSnapshot}`,
      variety: run.varietyNameSnapshot ?? undefined,
      product: run.productNameSnapshot ?? undefined,
      quality: quality ?? undefined,
      quantityKg: finishedKg,
      unitPrice: pricePerKg,
      amount,
      vatRatePercent: vatRatePercent,
      vatAmount: amount * (vatRatePercent / 100),
      referenceId: run.id,
      referenceType: undefined, // PackagingRun wird nicht als referenceType unterstützt
    });
  }

  // 5. CustomerSaleComplaint laden (Reklamationen)
  const complaints = await prisma.customerSaleComplaint.findMany({
    where: {
      farmerId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      customerSale: {
        include: {
          customer: true,
          product: {
            include: { taxRate: true } as any,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // 6. Reklamationen verarbeiten
  for (const complaint of complaints) {
    if (complaint.complaintType === "RETOURWARE") {
      // RETOURWARE: 
      // 1. Abpackkosten verrechnen (20% MWSt)
      // 2. Menge und Preis aus PackagingRun abziehen
      
      const packingCostVatRate = 20;
      const packingCostAmount = Number(complaint.complaintAmount);
      
      // Abpackkosten-Zeile (negativer Betrag)
      lines.push({
        date: complaint.createdAt,
        lineType: "ABPACKKOSTEN",
        description: `Abpackkosten Retour ${complaint.customerNameSnapshot} / ${complaint.productNameSnapshot}`,
        customer: complaint.customerNameSnapshot,
        product: complaint.productNameSnapshot,
        quantityKg: 0,
        quantityUnits: complaint.affectedQuantity,
        unitPrice: Number(complaint.snapshotPackingCostPerUnit),
        amount: -Math.abs(packingCostAmount), // Negativ (Abzug)
        vatRatePercent: packingCostVatRate,
        vatAmount: -Math.abs(packingCostAmount) * (packingCostVatRate / 100),
        referenceId: complaint.id,
        referenceType: "CustomerSaleComplaint",
      });

      // Menge und Preis aus PackagingRun abziehen
      // Wir müssen den PackagingRun finden, der zu dieser Reklamation gehört
      // Das geht über CustomerSale -> PackPlantStockMovement -> PackagingRun
      const sale = complaint.customerSale;
      if (sale) {
        // Produkt holen für unitKg
        const product = await prisma.product.findUnique({
          where: { id: sale.productId },
        });
        
        if (!product || !product.unitKg) {
          console.warn(`Produkt ${sale.productId} nicht gefunden oder unitKg fehlt für Reklamation ${complaint.id}`);
          continue;
        }

        // affectedQuantity ist in Einheiten (Colli), umrechnen in kg
        const affectedKg = complaint.affectedQuantity * Number(product.unitKg);
        
        // Finde PackPlantStockMovement für diesen Sale
        const movements = await prisma.packPlantStockMovement.findMany({
          where: {
            customerSaleId: sale.id,
            reason: "SALE",
          },
          include: {
            packagingRun: {
              include: {
                variety: true,
              },
            },
          },
        });

        // Finde den PackagingRun, der zu dieser Reklamation gehört
        // Da ein Verkauf aus mehreren PackagingRuns bestehen kann (FIFO),
        // nehmen wir den ersten PackagingRun, der zu diesem Sale gehört
        let packagingRun = null;
        for (const movement of movements) {
          if (movement.packagingRunId && movement.packagingRun) {
            packagingRun = movement.packagingRun;
            break; // Nimm den ersten gefundenen PackagingRun
          }
        }

        // Falls kein PackagingRun über Movement gefunden wurde, suche direkt über FIFO
        if (!packagingRun) {
          // Finde den ältesten PackagingRun für dieses Produkt vor oder am Verkaufsdatum
          const oldestRun = await prisma.packagingRun.findFirst({
            where: {
              productId: sale.productId,
              farmerId: complaint.farmerId,
              date: {
                lte: sale.date,
              },
            },
            include: {
              variety: true,
            },
            orderBy: {
              date: "asc", // FIFO: Älteste zuerst
            },
          });
          
          if (oldestRun) {
            packagingRun = oldestRun;
          }
        }

        if (packagingRun) {
          const variety = packagingRun.variety;
          const quality = variety?.quality as "Q1" | "Q2" | "UEBERGROESSE" | null;

          // Preis aus VarietyQualityPrice ermitteln (zum Zeitpunkt des PackagingRun)
          let pricePerKg = 0;
          if (quality) {
            const priceInfo = await getVarietyQualityPriceForDate(quality, packagingRun.date);
            if (priceInfo) {
              pricePerKg = priceInfo.pricePerKg;
            }
          }

          // Retour-Ware-Zeile (negativer Betrag)
          totalRetourKg += affectedKg;
          const amount = -affectedKg * pricePerKg; // Negativ (Abzug)

          // Steuersatz ermitteln:
          // - Pauschalierter Betrieb: immer 13%
          // - Normaler Betrieb: Steuersatz aus dem Produkt (falls vorhanden, sonst 0%)
          let vatRatePercentForComplaint = 0;
          if (isFlatRate) {
            vatRatePercentForComplaint = 13;
          } else {
            // Steuersatz aus dem Produkt holen
            const productWithTax = product as any;
            vatRatePercentForComplaint = Number(productWithTax?.taxRate?.ratePercent ?? 0);
          }

          lines.push({
            date: complaint.createdAt,
            lineType: "RETOUR_MENGE",
            description: `Retour ${packagingRun.varietyNameSnapshot ?? variety?.name ?? "Sorte"} / ${packagingRun.productNameSnapshot ?? (product as any)?.name ?? "Produkt"}`,
            variety: packagingRun.varietyNameSnapshot ?? variety?.name ?? undefined,
            product: packagingRun.productNameSnapshot ?? (product as any)?.name ?? undefined,
            quality: quality ?? undefined,
            quantityKg: -affectedKg, // negativ darstellen
            unitPrice: pricePerKg,
            amount,
            vatRatePercent: vatRatePercentForComplaint,
            vatAmount: amount * (vatRatePercentForComplaint / 100),
            referenceId: complaint.id,
            referenceType: "CustomerSaleComplaint",
          });
        } else {
          console.warn(`Kein PackagingRun gefunden für Reklamation ${complaint.id}, Sale ${sale.id}`);
        }
      }
    } else if (complaint.complaintType === "PROZENTABZUG") {
      // PROZENTABZUG: 
      // Verkaufspreis aus CustomerSale verwenden, Prozentabzug berechnen und ausweisen
      const sale = complaint.customerSale;
      const saleUnitPrice = Number(complaint.snapshotUnitPrice); // Verkaufspreis je Colli
      const discountPercent = Number(complaint.discountPercent);
      const affectedQuantity = complaint.affectedQuantity; // in Einheiten
      
      // Berechne den Abzugsbetrag basierend auf Verkaufspreis
      // affectedQuantity ist in Einheiten (Colli), saleUnitPrice ist je Colli
      // Wir müssen zuerst Colli berechnen: affectedQuantity / unitsPerColli
      const product = sale?.product as any;
      const unitsPerColli = product?.unitsPerColli ?? 1;
      const affectedColli = unitsPerColli > 0 ? affectedQuantity / unitsPerColli : affectedQuantity;
      const discountAmount = affectedColli * saleUnitPrice * (discountPercent / 100);
      
      // Steuersatz ermitteln:
      // - Pauschalierter Betrieb: immer 13%
      // - Normaler Betrieb: Steuersatz aus dem Produkt (falls vorhanden, sonst 0%)
      let vatRatePercentForDiscount = 0;
      if (isFlatRate) {
        vatRatePercentForDiscount = 13;
      } else {
        // Steuersatz aus dem Produkt holen
        const productWithTax = product as any;
        vatRatePercentForDiscount = Number(productWithTax?.taxRate?.ratePercent ?? 0);
      }
      
      lines.push({
        date: complaint.createdAt,
        lineType: "PROZENTABZUG",
        description: `Reklamation ${discountPercent}% ${complaint.customerNameSnapshot} / ${complaint.productNameSnapshot} (Verkaufspreis: ${saleUnitPrice.toFixed(2)} €/Colli)`,
        customer: complaint.customerNameSnapshot,
        product: complaint.productNameSnapshot,
        quantityKg: 0,
        quantityUnits: affectedQuantity,
        unitPrice: saleUnitPrice, // Verkaufspreis je Colli
        amount: -Math.abs(discountAmount), // Negativ (Abzug)
        vatRatePercent: vatRatePercentForDiscount,
        vatAmount: -Math.abs(discountAmount) * (vatRatePercentForDiscount / 100),
        discountPercent: discountPercent,
        referenceId: complaint.id,
        referenceType: "CustomerSaleComplaint",
      });
    }
  }

  // 7. Nach Datum sortieren
  lines.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 8. Gesamtsumme berechnen
  // WICHTIG: Abpackkosten werden separat mit 20% MWSt berechnet
  // Alle anderen Posten werden mit vatRateForFarmer (13% pauschal oder 0%) berechnet
  
  let totalAmount = 0;
  let totalVat = 0;
  let packingCostsAmount = 0;
  let packingCostsVat = 0;
  
  for (const line of lines) {
    if (line.lineType === "ABPACKKOSTEN") {
      // Abpackkosten: immer 20% MWSt
      packingCostsAmount += line.amount;
      packingCostsVat += line.vatAmount ?? 0;
    } else {
      // Alle anderen Posten: vatRateForFarmer (13% pauschal oder 0%)
      totalAmount += line.amount;
      totalVat += line.vatAmount ?? 0;
    }
  }
  
  // Gesamtsumme = Netto (normale Posten + Abpackkosten) + MWSt (13% + 20%)
  const totalNetto = totalAmount + packingCostsAmount;
  const totalVatAll = totalVat + packingCostsVat;
  const totalGross = totalNetto + totalVatAll;

  return {
    farmerId,
    farmerName: farmer.name,
    farmName: farmer.farmName ?? undefined,
    ggn: farmer.ggn ?? undefined,
    contactInfo: farmer.contactInfo ?? undefined,
    email: farmer.email ?? undefined,
    address: addressText,
    isFlatRate,
    flatRateNote: flatRateNote ?? undefined,
    periodStart,
    periodEnd,
    lines,
    totalAmount, // Netto-Betrag (ohne Abpackkosten)
    totalVat, // MWSt für normale Posten
    packingCostsAmount, // Netto-Betrag Abpackkosten
    packingCostsVat, // MWSt für Abpackkosten (20%)
    totalGross, // Gesamt-Brutto
    totalDeliveryKg,
    totalRetourKg,
    createdAt: new Date(),
  };
}

// ▶ Helper: Packstellen-Statistiken für einen Zeitraum berechnen
async function calculatePackstationStatsForPeriod(
  farmerId: number,
  periodStart: Date,
  periodEnd: Date
): Promise<Array<{
  varietyId: number;
  varietyName: string;
  cookingType: string;
  quality: string;
  deliveredKg: number;
  packedKg: number;
  wasteKg: number;
  inventoryZeroKg: number;
  washingLossKg: number;
  lossTotalKg: number;
  yieldPercent: number;
  lossPercent: number;
  currentKg: number;
}>> {
  // 1. Daten für den Zeitraum laden
  const [stocks, movements, runs] = await Promise.all([
    prisma.packStationStock.findMany({
      where: { farmerId },
      include: { variety: true },
    }),
    prisma.packStationStockMovement.findMany({
      where: {
        farmerId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: { variety: true },
    }),
    prisma.packagingRun.findMany({
      where: {
        farmerId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: { variety: true },
    }),
  ]);

  // 2. Aktueller Bestand je Sorte (zum Zeitpunkt periodEnd)
  const stockByVariety = new Map<number, number>();
  for (const s of stocks) {
    const vId = s.varietyId;
    const qty = Number(s.quantityKg ?? 0);
    stockByVariety.set(vId, (stockByVariety.get(vId) ?? 0) + qty);
  }

  // 3. Statistiken pro Sorte sammeln
  const statsByVariety = new Map<number, {
    varietyId: number;
    varietyName: string;
    cookingType: string;
    quality: string;
    deliveredKg: number;
    packedKg: number;
    wasteKg: number;
    inventoryZeroKg: number;
    currentKg: number;
  }>();

  // Bewegungen verarbeiten
  for (const m of movements) {
    if (!m.varietyId || !m.variety) continue;
    const vId = m.varietyId;
    
    if (!statsByVariety.has(vId)) {
      statsByVariety.set(vId, {
        varietyId: vId,
        varietyName: m.variety.name,
        cookingType: m.variety.cookingType ?? "",
        quality: m.variety.quality ?? "",
        deliveredKg: 0,
        packedKg: 0,
        wasteKg: 0,
        inventoryZeroKg: 0,
        currentKg: stockByVariety.get(vId) ?? 0,
      });
    }
    
    const stat = statsByVariety.get(vId)!;
    const val = Number(m.changeKg);
    
    switch (m.reason) {
      case "RAW_IN_FROM_FARMER":
        stat.deliveredKg += val;
        break;
      case "SORTING_WASTE":
        stat.wasteKg += Math.abs(val);
        break;
      case "INVENTORY_ZERO":
        stat.inventoryZeroKg += Math.abs(val);
        break;
    }
  }

  // PackagingRuns verarbeiten
  for (const r of runs) {
    if (!r.varietyId || !r.variety) continue;
    const vId = r.varietyId;
    
    if (!statsByVariety.has(vId)) {
      statsByVariety.set(vId, {
        varietyId: vId,
        varietyName: r.variety.name,
        cookingType: r.variety.cookingType ?? "",
        quality: r.variety.quality ?? "",
        deliveredKg: 0,
        packedKg: 0,
        wasteKg: 0,
        inventoryZeroKg: 0,
        currentKg: stockByVariety.get(vId) ?? 0,
      });
    }
    
    const stat = statsByVariety.get(vId)!;
    stat.packedKg += Number(r.finishedKg ?? 0);
  }

  // 4. Waschverlust, Gesamtverlust und Prozente berechnen
  const result = Array.from(statsByVariety.values()).map((stat) => {
    // Waschverlust = gelief. Menge - Bestand - verpackt - Ausschuss - Inventur
    const processedBaseWithoutWash =
      stat.packedKg + stat.wasteKg + stat.inventoryZeroKg;
    const washingLoss =
      stat.deliveredKg -
      stat.currentKg -
      processedBaseWithoutWash;

    const washingLossKg = washingLoss > 0 ? washingLoss : 0;
    const lossTotalKg = stat.wasteKg + stat.inventoryZeroKg + washingLossKg;

    const processedBase = stat.packedKg + lossTotalKg; // verarbeitete Menge

    let yieldPercent = 0;
    let lossPercent = 0;
    if (processedBase > 0) {
      yieldPercent = (stat.packedKg / processedBase) * 100;
      lossPercent = (lossTotalKg / processedBase) * 100;
    }

    return {
      ...stat,
      washingLossKg,
      lossTotalKg,
      yieldPercent,
      lossPercent,
    };
  });

  // Nach Sortenname sortieren
  return result.sort((a, b) =>
    a.varietyName.localeCompare(b.varietyName, "de", {
      sensitivity: "base",
    })
  );
}

// ▶ Rückwärtskompatibilität: Monatsbezogene Funktion
async function getFarmerMonthlyStatement(
  farmerId: number,
  year: number,
  month: number
): Promise<FarmerMonthlyStatement> {
  const dateFrom = new Date(year, month - 1, 1);
  const dateTo = new Date(year, month, 0); // Letzter Tag des Monats
  
  const statement = await getFarmerStatement(farmerId, dateFrom, dateTo);
  
  return {
    ...statement,
    year,
    month,
  };
}

// ▶ PDF-Service: Akonto-Abrechnung erstellen (österreichischer Stil)
function formatDateDE(date: Date): string {
  return date.toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  const num = Number(amount);
  if (!Number.isFinite(num) || isNaN(num)) {
    return "0,00 €";
  }
  return num.toLocaleString("de-AT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}

function formatKgPdf(kg: number): string {
  return kg.toLocaleString("de-AT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " kg";
}

function formatAddressSnapshot(addr?: {
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
} | null): string | null {
  if (!addr) return null;
  const parts = [addr.street, addr.postalCode, addr.city, addr.country].filter(
    (p) => !!p && String(p).trim().length > 0
  );
  return parts.length ? parts.join(", ") : null;
}

function buildDocumentNumber(documentType: "RECHNUNG" | "GUTSCHRIFT" | "AKONTO" | "JAHRESSCHLUSS") {
  const now = new Date();
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${documentType}-${stamp}-${rand}`;
}

async function getIssuerSnapshot() {
  // Versuche, Organisation (EG) aus der DB zu laden
  const org = await (prisma as any).organization.findUnique({
    where: { id: EG_ORGANIZATION_ID },
    include: { address: true },
  });

  if (org) {
    return {
      issuerNameSnapshot: org.name,
      issuerAddressSnapshot: formatAddressSnapshot(org.address),
      issuerVatIdSnapshot: org.vatId || null,
      issuerOrganizationId: org.id,
      issuerLegalFormSnapshot: org.legalForm || null,
      issuerRegistryNumberSnapshot: org.registryNumber || null,
      issuerRegistryCourtSnapshot: org.registryCourt || null,
      issuerManagingDirectorsSnapshot: org.managingDirectors || null,
      issuerIbanSnapshot: org.iban || null,
      issuerBicSnapshot: org.bic || null,
      issuerBankNameSnapshot: org.bankName || null,
      issuerPaymentTermsSnapshot: org.paymentTerms || null,
    };
  }

  // Fallback auf ENV
  return {
    issuerNameSnapshot:
      process.env.INVOICE_ISSUER_NAME ||
      "Erzeugergemeinschaft Eferdinger Landl Erdäpfel",
    issuerAddressSnapshot: process.env.INVOICE_ISSUER_ADDRESS || null,
    issuerVatIdSnapshot: process.env.INVOICE_ISSUER_VATID || null,
    issuerOrganizationId: null,
  };
}

const ACCOUNTING_DOCS_DIR = path.join(process.cwd(), "documents");

function summarizeVat(lines: any[]) {
  const map = new Map<number, { net: number; vat: number; gross: number }>();
  for (const l of lines) {
    const rate = Number(l.vatRatePercent || 0);
    const net = Number(l.netAmount || 0);
    const vat = Number(l.vatAmount || 0);
    
    // Validierung: Nur endliche Zahlen verwenden
    if (!Number.isFinite(rate) || isNaN(rate)) continue;
    const safeNet = Number.isFinite(net) && !isNaN(net) ? net : 0;
    const safeVat = Number.isFinite(vat) && !isNaN(vat) ? vat : 0;
    
    if (!map.has(rate)) {
      map.set(rate, { net: 0, vat: 0, gross: 0 });
    }
    const entry = map.get(rate)!;
    entry.net += safeNet;
    entry.vat += safeVat;
    entry.gross += safeNet + safeVat;
  }
  return Array.from(map.entries()).map(([rate, sums]) => ({
    rate: Number.isFinite(rate) && !isNaN(rate) ? rate : 0,
    net: Number.isFinite(sums.net) && !isNaN(sums.net) ? sums.net : 0,
    vat: Number.isFinite(sums.vat) && !isNaN(sums.vat) ? sums.vat : 0,
    gross: Number.isFinite(sums.gross) && !isNaN(sums.gross) ? sums.gross : 0,
  }));
}

async function generateAccountingDocumentPdf(doc: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const pdf = new PDFDocument({ 
        size: "A4", 
        margin: 50,
        info: {
          Title: doc.documentNumber || "Rechnung",
          Author: "Eferdinger Landl EZG",
        }
      });
      const chunks: Buffer[] = [];
      pdf.on("data", (c: Buffer) => chunks.push(c));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);

      const title =
        doc.documentType === "GUTSCHRIFT"
          ? "GUTSCHRIFT"
          : doc.documentType === "AKONTO"
          ? "AKONTO-ABRECHNUNG"
          : doc.documentType === "JAHRESSCHLUSS"
          ? "JAHRESSCHLUSSRECHNUNG"
          : "RECHNUNG";

      // === KOPFBEREICH ===
      pdf.fontSize(14).font("Helvetica-Bold").fillColor("#000000");
      pdf.text(title, 50, 50);
      pdf.moveDown(1);
      
      // Metadaten in zwei Spalten - sauber getrennt
      pdf.fontSize(10).font("Helvetica");
      const metaY = pdf.y;
      pdf.text(`Belegnummer: ${doc.documentNumber}`, 50, metaY);
      pdf.text(`Ausstellungsdatum: ${formatDateDE(new Date(doc.issueDate))}`, 300, metaY);
      
      // Leistungszeitraum in eigener Zeile
      if (doc.servicePeriodFrom && doc.servicePeriodTo) {
        pdf.moveDown(0.6);
        pdf.text(
          `Leistungszeitraum: ${formatDateDE(new Date(doc.servicePeriodFrom))} - ${formatDateDE(
            new Date(doc.servicePeriodTo)
          )}`,
          50,
          pdf.y
        );
      }
      pdf.moveDown(1.5);

      // === AUSSTELLER / EMPFÄNGER BLOCK ===
      const leftX = 50;
      const rightX = 300;
      const blockStartY = pdf.y;
      
      // Aussteller - jede Information in eigener Zeile
      pdf.fontSize(12).font("Helvetica-Bold").fillColor("#000000");
      pdf.text("Aussteller", leftX, blockStartY);
      pdf.moveDown(0.4);
      pdf.font("Helvetica").fontSize(10).fillColor("#000000");
      if (doc.issuerNameSnapshot) {
        pdf.text(doc.issuerNameSnapshot, leftX, pdf.y);
        pdf.moveDown(0.25);
      }
      if (doc.issuerLegalFormSnapshot) {
        pdf.text(doc.issuerLegalFormSnapshot, leftX, pdf.y);
        pdf.moveDown(0.25);
      }
      if (doc.issuerAddressSnapshot) {
        // Adresse in separate Zeilen aufteilen, falls Kommas vorhanden
        const addressParts = doc.issuerAddressSnapshot.split(",").map((p: string) => p.trim());
        addressParts.forEach((part: string) => {
          if (part) {
            pdf.text(part, leftX, pdf.y);
            pdf.moveDown(0.25);
          }
        });
      }
      if (doc.issuerVatIdSnapshot) {
        pdf.text(`UID: ${doc.issuerVatIdSnapshot}`, leftX, pdf.y);
        pdf.moveDown(0.25);
      }
      if (doc.issuerRegistryNumberSnapshot) {
        pdf.text(
          `Firmenbuch: ${doc.issuerRegistryNumberSnapshot}${doc.issuerRegistryCourtSnapshot ? `, Gericht: ${doc.issuerRegistryCourtSnapshot}` : ""}`,
          leftX,
          pdf.y
        );
        pdf.moveDown(0.25);
      }
      if (doc.issuerManagingDirectorsSnapshot) {
        pdf.text(`GF: ${doc.issuerManagingDirectorsSnapshot}`, leftX, pdf.y);
      }
      
      // Empfänger (rechts, auf gleicher Höhe startend) - jede Information in eigener Zeile
      pdf.fontSize(12).font("Helvetica-Bold").fillColor("#000000");
      pdf.text("Empfänger", rightX, blockStartY);
      pdf.y = blockStartY + 16;
      pdf.font("Helvetica").fontSize(10).fillColor("#000000");
      const recipientStartY = pdf.y;
      if (doc.recipientNameSnapshot) {
        pdf.text(doc.recipientNameSnapshot, rightX, pdf.y);
        pdf.moveDown(0.25);
      }
      if (doc.recipientLegalFormSnapshot) {
        pdf.text(doc.recipientLegalFormSnapshot, rightX, pdf.y);
        pdf.moveDown(0.25);
      }
      if (doc.recipientAddressSnapshot) {
        // Adresse in separate Zeilen aufteilen, falls Kommas vorhanden
        const addressParts = doc.recipientAddressSnapshot.split(",").map((p: string) => p.trim());
        addressParts.forEach((part: string) => {
          if (part) {
            pdf.text(part, rightX, pdf.y);
            pdf.moveDown(0.25);
          }
        });
      }
      if (doc.recipientVatIdSnapshot) {
        pdf.text(`UID: ${doc.recipientVatIdSnapshot}`, rightX, pdf.y);
        pdf.moveDown(0.25);
      }
      if (doc.recipientRegistryNumberSnapshot) {
        pdf.text(
          `Firmenbuch: ${doc.recipientRegistryNumberSnapshot}${doc.recipientRegistryCourtSnapshot ? `, Gericht: ${doc.recipientRegistryCourtSnapshot}` : ""}`,
          rightX,
          pdf.y
        );
        pdf.moveDown(0.25);
      }
      if (doc.recipientManagingDirectorsSnapshot) {
        pdf.text(`GF: ${doc.recipientManagingDirectorsSnapshot}`, rightX, pdf.y);
      }
      
      // Zur linken Spalte zurück für weiteren Inhalt
      const issuerHeight = pdf.y - blockStartY;
      pdf.y = Math.max(pdf.y, blockStartY + issuerHeight);
      pdf.moveDown(1.2);

      // === POSITIONSLISTE ===
      // Spaltenbreiten für übersichtliche Tabelle
      const colPos = 50;           // Positionsnummer
      const colDesc = 85;          // Beschreibung
      const colQty = 285;          // Menge
      const colUnit = 335;         // Einheit
      const colUnitPrice = 375;    // Einzelpreis netto
      const colNet = 440;          // Gesamtpreis netto
      const colVatRate = 510;      // USt-Satz %
      const colVatAmount = 550;    // USt-Betrag
      const colGross = 615;        // Bruttobetrag
      const tableWidth = 580;      // Gesamtbreite

      // Tabellenkopf - klar und vollständig
      const headerY = pdf.y;
      pdf.fontSize(11).font("Helvetica-Bold").fillColor("#000000");
      pdf.text("Pos", colPos, headerY);
      pdf.text("Beschreibung", colDesc, headerY);
      pdf.text("Menge", colQty, headerY, { width: 50, align: "right" });
      pdf.text("Einheit", colUnit, headerY, { width: 40, align: "center" });
      pdf.text("EP netto", colUnitPrice, headerY, { width: 60, align: "right" });
      pdf.text("Gesamt netto", colNet, headerY, { width: 70, align: "right" });
      pdf.text("USt %", colVatRate, headerY, { width: 35, align: "center" });
      pdf.text("USt Betrag", colVatAmount, headerY, { width: 60, align: "right" });
      pdf.text("Brutto", colGross, headerY, { width: 70, align: "right" });
      
      // Dünne Linie unter Header
      pdf.moveDown(0.4);
      pdf.strokeColor("#000000").lineWidth(0.5);
      pdf.moveTo(colPos, pdf.y).lineTo(colPos + tableWidth, pdf.y).stroke();
      pdf.moveDown(0.3);

      let y = pdf.y;
      pdf.font("Helvetica").fontSize(11).fillColor("#000000");

      // Positionen sortieren nach USt-Satz, dann nach Positionsnummer
      const sortedLines = [...doc.lines].sort((a: any, b: any) => {
        const vatDiff = (b.vatRatePercent || 0) - (a.vatRatePercent || 0);
        if (vatDiff !== 0) return vatDiff;
        return (a.positionNumber || 0) - (b.positionNumber || 0);
      });

      sortedLines.forEach((line: any, idx: number) => {
        if (y > 750) {
          pdf.addPage();
          // Header auf neuer Seite wiederholen
          const newHeaderY = 50;
          pdf.fontSize(11).font("Helvetica-Bold").fillColor("#000000");
          pdf.text("Pos", colPos, newHeaderY);
          pdf.text("Beschreibung", colDesc, newHeaderY);
          pdf.text("Menge", colQty, newHeaderY, { width: 50, align: "right" });
          pdf.text("Einheit", colUnit, newHeaderY, { width: 40, align: "center" });
          pdf.text("EP netto", colUnitPrice, newHeaderY, { width: 60, align: "right" });
          pdf.text("Gesamt netto", colNet, newHeaderY, { width: 70, align: "right" });
          pdf.text("USt %", colVatRate, newHeaderY, { width: 35, align: "center" });
          pdf.text("USt Betrag", colVatAmount, newHeaderY, { width: 60, align: "right" });
          pdf.text("Brutto", colGross, newHeaderY, { width: 70, align: "right" });
          pdf.moveDown(0.4);
          pdf.strokeColor("#000000").lineWidth(0.5);
          pdf.moveTo(colPos, pdf.y).lineTo(colPos + tableWidth, pdf.y).stroke();
          pdf.moveDown(0.3);
          y = pdf.y;
        }
        
        // Beschreibung formatieren: max. 2 Zeilen
        // Zeile 1: Produkt + Sorte
        // Zeile 2: Abnehmer/Filiale
        let desc = line.description || "";
        let descLine1 = "";
        let descLine2 = "";
        
        // Versuche, die Beschreibung in zwei Zeilen aufzuteilen
        // Format: "Typ Produkt, Sorte an Kunde" oder "Retour/Reklamation Produkt, Sorte an Kunde"
        // Oder: "Preisnachlass X% Produkt, Sorte an Kunde"
        const parts = desc.split(" an ");
        if (parts.length >= 2) {
          descLine1 = parts[0].trim(); // Produkt + Sorte (inkl. Typ/Retour/Preisnachlass)
          descLine2 = `an ${parts.slice(1).join(" an ").trim()}`; // Kunde
        } else {
          // Fallback: Beschreibung nach Komma aufteilen (falls vorhanden)
          const commaParts = desc.split(",");
          if (commaParts.length >= 2) {
            descLine1 = commaParts.slice(0, -1).join(",").trim();
            descLine2 = commaParts[commaParts.length - 1].trim();
          } else {
            // Letzter Fallback: nach Worten aufteilen
            const words = desc.split(" ");
            const midPoint = Math.ceil(words.length / 2);
            descLine1 = words.slice(0, midPoint).join(" ");
            descLine2 = words.slice(midPoint).join(" ");
          }
        }
        
        // Auf max. Zeilenlänge begrenzen (Umbruch nur zwischen Worten)
        const maxWidth = 195;
        const wrapText = (text: string, maxW: number): string[] => {
          if (!text) return [];
          const words = text.split(" ");
          const lines: string[] = [];
          let currentLine = "";
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            pdf.fontSize(11);
            if (pdf.widthOfString(testLine) <= maxW) {
              currentLine = testLine;
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          }
          if (currentLine) lines.push(currentLine);
          return lines.slice(0, 2); // Max. 2 Zeilen
        };
        
        const descLines1 = wrapText(descLine1, maxWidth);
        const descLines2 = wrapText(descLine2, maxWidth);
        const totalDescLines = Math.min(2, descLines1.length + descLines2.length);
        const rowHeight = Math.max(20, totalDescLines * 13 + 6);
        
        // Positionsnummer
        pdf.font("Helvetica-Bold").fontSize(11);
        pdf.text(String(line.positionNumber ?? idx + 1), colPos, y);
        pdf.font("Helvetica");
        
        // Beschreibung (max. 2 Zeilen, Umbruch nur zwischen Worten)
        let descY = y;
        descLines1.forEach((lineText, i) => {
          pdf.text(lineText, colDesc, descY, { width: maxWidth });
          descY += 12;
        });
        descLines2.forEach((lineText, i) => {
          pdf.text(lineText, colDesc, descY, { width: maxWidth });
          descY += 12;
        });
        
        // Menge mit Tausendertrennzeichen
        const qtyNum = line.quantity != null ? Number(line.quantity) : 0;
        const qtyText = Number.isFinite(qtyNum) && !isNaN(qtyNum)
          ? qtyNum.toLocaleString("de-AT", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "0,00";
        pdf.text(qtyText, colQty, y, { width: 50, align: "right" });
        
        // Einheit
        pdf.text(line.unit || "Stk", colUnit, y, { width: 40, align: "center" });
        
        // Einzelpreis netto
        const unitPriceNum = line.unitPrice != null ? Number(line.unitPrice) : 0;
        pdf.text(
          Number.isFinite(unitPriceNum) && !isNaN(unitPriceNum) ? formatCurrency(unitPriceNum) : "0,00 €",
          colUnitPrice,
          y,
          { width: 60, align: "right" }
        );
        
        // Gesamtpreis netto
        const netAmountNum = Number(line.netAmount) || 0;
        pdf.text(formatCurrency(netAmountNum), colNet, y, {
          width: 70,
          align: "right",
        });
        
        // USt-Satz %
        const vatRateNum = Number(line.vatRatePercent || 0);
        const vatRateText = Number.isFinite(vatRateNum) && !isNaN(vatRateNum)
          ? `${vatRateNum.toLocaleString("de-AT", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })} %`
          : "0 %";
        pdf.text(vatRateText, colVatRate, y, { width: 35, align: "center" });
        
        // USt-Betrag
        const vatAmountNum = Number(line.vatAmount) || 0;
        pdf.text(formatCurrency(vatAmountNum), colVatAmount, y, {
          width: 60,
          align: "right",
        });
        
        // Bruttobetrag
        const grossAmountNum = Number(line.grossAmount) || 0;
        pdf.text(formatCurrency(grossAmountNum), colGross, y, {
          width: 70,
          align: "right",
        });
        
        // Optional: Feine Trennlinie nach 3-4 Positionen
        y += rowHeight;
        if ((idx + 1) % 4 === 0 && idx < sortedLines.length - 1) {
          pdf.strokeColor("#cccccc").lineWidth(0.3);
          pdf.moveTo(colPos, y).lineTo(colPos + tableWidth, y).stroke();
          pdf.strokeColor("#000000");
          y += 3;
        }
      });

      // === SUMMENBEREICH ===
      pdf.moveDown(1);
      const vats = summarizeVat(doc.lines);
      const sortedVats = [...vats].sort((a, b) => b.rate - a.rate);
      
      // Trennlinie vor Summen
      pdf.strokeColor("#000000").lineWidth(1);
      pdf.moveTo(colPos, pdf.y).lineTo(colPos + tableWidth, pdf.y).stroke();
      pdf.moveDown(0.8);
      
      // Zwischensummen je USt-Satz - untereinander, nicht tabellarisch
      pdf.font("Helvetica-Bold").fontSize(12).fillColor("#000000");
      pdf.text("Zwischensummen je Umsatzsteuersatz:", colPos, pdf.y);
      pdf.moveDown(0.6);
      
      pdf.font("Helvetica").fontSize(11).fillColor("#000000");
      sortedVats.forEach((v, idx) => {
        if (idx > 0) pdf.moveDown(0.5);
        pdf.font("Helvetica-Bold").fontSize(11);
        const rateNum = Number(v.rate) || 0;
        const rateText = Number.isFinite(rateNum) && !isNaN(rateNum)
          ? rateNum.toLocaleString("de-AT", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
          : "0";
        pdf.text(`USt ${rateText} %`, colPos, pdf.y);
        pdf.moveDown(0.3);
        pdf.font("Helvetica").fontSize(11);
        const netNum = Number(v.net) || 0;
        pdf.text(`Netto: ${formatCurrency(netNum)}`, colPos + 20, pdf.y);
        pdf.moveDown(0.25);
        const vatNum = Number(v.vat) || 0;
        pdf.text(`USt: ${formatCurrency(vatNum)}`, colPos + 20, pdf.y);
        pdf.moveDown(0.25);
        const grossNum = Number(v.gross) || 0;
        pdf.text(`Brutto: ${formatCurrency(grossNum)}`, colPos + 20, pdf.y);
      });
      
      // Trennlinie vor Gesamtsumme
      pdf.moveDown(0.6);
      pdf.strokeColor("#000000").lineWidth(1);
      pdf.moveTo(colPos, pdf.y).lineTo(colPos + tableWidth, pdf.y).stroke();
      pdf.moveDown(0.6);
      
      // Gesamtsumme - untereinander, nicht tabellarisch
      const totalNet = vats.reduce((s, v) => {
        const net = Number(v.net) || 0;
        return s + (Number.isFinite(net) ? net : 0);
      }, 0);
      const totalVat = vats.reduce((s, v) => {
        const vat = Number(v.vat) || 0;
        return s + (Number.isFinite(vat) ? vat : 0);
      }, 0);
      const totalGross = vats.reduce((s, v) => {
        const gross = Number(v.gross) || 0;
        return s + (Number.isFinite(gross) ? gross : 0);
      }, 0);
      
      pdf.font("Helvetica-Bold").fontSize(13).fillColor("#000000");
      pdf.text("Gesamtsumme", colPos, pdf.y);
      pdf.moveDown(0.4);
      pdf.font("Helvetica").fontSize(11);
      pdf.text(`Netto gesamt: ${formatCurrency(totalNet)}`, colPos + 20, pdf.y);
      pdf.moveDown(0.3);
      pdf.text(`USt gesamt: ${formatCurrency(totalVat)}`, colPos + 20, pdf.y);
      pdf.moveDown(0.3);
      pdf.font("Helvetica-Bold").fontSize(12);
      pdf.text(`Brutto gesamt: ${formatCurrency(totalGross)}`, colPos + 20, pdf.y);
      pdf.font("Helvetica");

      // === ZAHLUNGSBLOCK ===
      pdf.moveDown(1);
      pdf.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
      pdf.text("Zahlung", leftX, pdf.y);
      pdf.moveDown(0.3);
      pdf.font("Helvetica").fontSize(9).fillColor("#333333");
      if (doc.issuerBankNameSnapshot) {
        pdf.text(`Bank: ${doc.issuerBankNameSnapshot}`, leftX, pdf.y);
        pdf.moveDown(0.2);
      }
      if (doc.issuerIbanSnapshot) {
        pdf.text(`IBAN: ${doc.issuerIbanSnapshot}`, leftX, pdf.y);
        pdf.moveDown(0.2);
      }
      if (doc.issuerBicSnapshot) {
        pdf.text(`BIC: ${doc.issuerBicSnapshot}`, leftX, pdf.y);
        pdf.moveDown(0.2);
      }
      if (doc.issuerPaymentTermsSnapshot) {
        pdf.text(`Zahlungsziel: ${doc.issuerPaymentTermsSnapshot}`, leftX, pdf.y);
      }

      // === FOOTER ===
      pdf.moveDown(1.5);
      pdf.font("Helvetica").fontSize(8).fillColor("#666666");
      pdf.text(
        "Diese Rechnung wurde maschinell erstellt und ist ohne Unterschrift gültig.",
        { align: "center", width: 500 }
      );
      pdf.fillColor("#000000");

      pdf.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function saveAccountingDocumentPdf(doc: any, pdfBuffer: Buffer): Promise<string> {
  if (!fs.existsSync(ACCOUNTING_DOCS_DIR)) {
    fs.mkdirSync(ACCOUNTING_DOCS_DIR, { recursive: true });
  }
  const safeNumber = doc.documentNumber.replace(/[^A-Za-z0-9_-]/g, "_");
  const filename = `doc_${safeNumber}.pdf`;
  const filepath = path.join(ACCOUNTING_DOCS_DIR, filename);
  fs.writeFileSync(filepath, pdfBuffer);
  return filename;
}

async function generateFarmerStatementPdf(
  statement: FarmerStatement
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: "A4", 
        margin: 50,
        info: {
          Title: `Akonto-Abrechnung ${statement.farmerName}`,
          Author: "Eferdinger Landl EZG",
        }
      });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // === KOPFBEREICH ===
      doc.fontSize(20).font("Helvetica-Bold");
      doc.text("AKONTO-ABRECHNUNG", { align: "center" });
      doc.moveDown(0.5);
      
      doc.fontSize(10).font("Helvetica");
      doc.text("Erzeugergemeinschaft Eferdinger Landl Erdäpfel", { align: "center" });
      doc.moveDown(1.5);

      // Zeitraum
      const periodText = `Abrechnungszeitraum: ${formatDateDE(statement.periodStart)} - ${formatDateDE(statement.periodEnd)}`;
      doc.fontSize(11).font("Helvetica-Bold");
      doc.text(periodText, { align: "center" });
      doc.moveDown(1);

      // === LIEFERANTENDATEN ===
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Lieferant:");
      doc.font("Helvetica");
      doc.text(statement.farmerName + (statement.farmName ? ` (${statement.farmName})` : ""));
      if (statement.address) {
        doc.text(statement.address);
      }
      if (statement.ggn) {
        doc.text(`GGN: ${statement.ggn}`);
      }
      if (statement.isFlatRate) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").fillColor("#cc0000");
        doc.text(
          statement.flatRateNote ||
            "Abrechnung für einen umsatzpauschalierten Landwirt – Durchschnittssteuersatz 13 % gemäß § 22 UStG."
        );
        doc.fillColor("#000000").font("Helvetica");
      }
      doc.moveDown(1);

      // Erstellungsdatum
      doc.fontSize(9).fillColor("#666666");
      doc.text(`Erstellt am: ${formatDateDE(statement.createdAt)}`, { align: "right" });
      doc.fillColor("#000000");
      doc.moveDown(1);

      // === TABELLENKOPF ===
      const tableTop = doc.y;
      const col1 = 50;   // Datum
      const col2 = 110;  // Beschreibung
      const col3 = 320;  // Menge
      const col4 = 380;  // Preis
      const col5 = 450;  // Betrag

      // Header-Hintergrund
      doc.rect(col1 - 5, tableTop - 3, 510, 18).fill("#e8e8e8");
      doc.fillColor("#000000");

      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Datum", col1, tableTop);
      doc.text("Beschreibung", col2, tableTop);
      doc.text("Menge", col3, tableTop, { width: 55, align: "right" });
      doc.text("Preis/kg", col4, tableTop, { width: 55, align: "right" });
      doc.text("Betrag", col5, tableTop, { width: 60, align: "right" });

      // Linie unter Header
      doc.moveTo(col1 - 5, tableTop + 15).lineTo(555, tableTop + 15).stroke();

      let y = tableTop + 22;
      doc.font("Helvetica").fontSize(8);

      // === TABELLENZEILEN ===
      for (const line of statement.lines) {
        // Seitenumbruch prüfen
        if (y > 750) {
          doc.addPage();
          y = 50;
        }

        // Zeilen-Hintergrund (alternierend)
        const lineIndex = statement.lines.indexOf(line);
        if (lineIndex % 2 === 1) {
          doc.rect(col1 - 5, y - 2, 510, 14).fill("#f9f9f9");
          doc.fillColor("#000000");
        }

        // Farbcodierung nach Typ
        if (line.lineType === "ABPACKKOSTEN" || line.lineType === "PROZENTABZUG") {
          doc.fillColor("#cc0000"); // Rot für Abzüge
        } else if (line.lineType === "RETOUR_MENGE") {
          doc.fillColor("#666666"); // Grau für Retouren
        } else {
          doc.fillColor("#000000");
        }

        doc.text(formatDateDE(line.date), col1, y);
        
        // Beschreibung kürzen falls zu lang
        let desc = line.description;
        if (desc.length > 40) {
          desc = desc.substring(0, 37) + "...";
        }
        doc.text(desc, col2, y);

        // Menge
        if (line.quantityKg !== 0) {
          doc.text(formatKgPdf(line.quantityKg), col3, y, { width: 55, align: "right" });
        } else if (line.quantityUnits) {
          doc.text(`${line.quantityUnits} St.`, col3, y, { width: 55, align: "right" });
        }

        // Preis
        if (line.unitPrice > 0) {
          doc.text(formatCurrency(line.unitPrice), col4, y, { width: 55, align: "right" });
        }

        // Betrag
        doc.text(formatCurrency(line.amount), col5, y, { width: 60, align: "right" });

        doc.fillColor("#000000");
        y += 14;
      }

      // === SUMMENBEREICH ===
      y += 10;
      doc.moveTo(col1 - 5, y).lineTo(555, y).stroke();
      y += 8;

      doc.fontSize(9);
      
      // Liefermengen
      doc.font("Helvetica");
      doc.text("Gesamtlieferung:", col2, y);
      doc.text(formatKgPdf(statement.totalDeliveryKg), col3 + 70, y, { width: 100, align: "right" });
      y += 14;

      if (statement.totalRetourKg > 0) {
        doc.text("Retouren:", col2, y);
        doc.text(formatKgPdf(statement.totalRetourKg), col3 + 70, y, { width: 100, align: "right" });
        y += 14;
      }

      // Trennlinie
      y += 5;
      doc.moveTo(col4 - 20, y).lineTo(555, y).stroke();
      y += 10;

      // Summen inkl. USt
      doc.font("Helvetica-Bold").fontSize(11);
      
      // Netto (normale Posten)
      doc.text("Netto:", col2, y);
      doc.text(formatCurrency(statement.totalAmount), col5, y, { width: 60, align: "right" });
      y += 14;
      
      // MWSt für normale Posten
      doc.text(
        `USt (${statement.isFlatRate ? "13 % pauschal" : "0 %"})`,
        col2,
        y
      );
      doc.text(formatCurrency(statement.totalVat), col5, y, { width: 60, align: "right" });
      y += 14;
      
      // Abpackkosten separat ausweisen (falls vorhanden)
      if (statement.packingCostsAmount !== 0) {
        doc.font("Helvetica").fontSize(9);
        doc.text("Abpackkosten (netto):", col2, y);
        doc.text(formatCurrency(statement.packingCostsAmount), col5, y, { width: 60, align: "right" });
        y += 14;
        doc.text("USt (20 %):", col2, y);
        doc.text(formatCurrency(statement.packingCostsVat), col5, y, { width: 60, align: "right" });
        y += 14;
        doc.font("Helvetica-Bold").fontSize(11);
      }
      
      // Gesamt-Brutto
      doc.text("Brutto:", col2, y);
      doc.text(formatCurrency(statement.totalGross), col5, y, { width: 60, align: "right" });

      // === HINWEISTEXT ===
      y += 40;
      doc.fontSize(8).font("Helvetica").fillColor("#666666");
      doc.text(
        "Diese Abrechnung ist eine Akonto-Zahlung. Die endgültige Jahresabrechnung erfolgt nach Abschluss des Wirtschaftsjahres unter Berücksichtigung des zur Verfügung stehenden Auszahlungsbetrages.",
        col1,
        y,
        { width: 500, align: "left" }
      );

      y += 30;
      
      // === HINWEISTEXT ===
      doc.fontSize(8).font("Helvetica").fillColor("#666666");
      
      // Hinweis für pauschalierte Landwirte
      if (statement.isFlatRate) {
        doc.text(
          "Bei pauschalierten Landwirten wird der Durchschnittssteuersatz von 13 % gemäß § 22 UStG angewendet.",
          col1,
          y,
          { width: 500, align: "left" }
        );
        y += 30;
      }
      
      doc.text(
        "Einsprüche gegen diese Abrechnung sind innerhalb von 14 Tagen schriftlich an die Erzeugergemeinschaft zu richten.",
        col1,
        y,
        { width: 500, align: "left" }
      );

      y += 30;
      
      // === PACKSTELLEN-STATISTIK ===
      // Statistiken für den Abrechnungszeitraum berechnen
      const packstationStats = await calculatePackstationStatsForPeriod(
        statement.farmerId,
        statement.periodStart,
        statement.periodEnd
      );
      
      if (packstationStats.length > 0) {
        y += 20;
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000");
        doc.text("Packstellen-Auswertung für diesen Zeitraum:", col1, y);
        y += 15;
        
        // Tabellenkopf
        doc.font("Helvetica-Bold").fontSize(8);
        const statCol1 = col1; // Sorte
        const statCol2 = col1 + 100; // Angeliefert
        const statCol3 = col1 + 160; // Verpackt
        const statCol4 = col1 + 220; // Abfall
        const statCol5 = col1 + 270; // Ausbeute
        const statCol6 = col1 + 320; // Lagerstand
        
        doc.text("Sorte", statCol1, y);
        doc.text("Angeliefert", statCol2, y, { width: 55, align: "right" });
        doc.text("Verpackt", statCol3, y, { width: 55, align: "right" });
        doc.text("Abfall", statCol4, y, { width: 45, align: "right" });
        doc.text("Ausbeute", statCol5, y, { width: 45, align: "right" });
        doc.text("Lagerstand", statCol6, y, { width: 60, align: "right" });
        y += 12;
        
        // Linie unter Header
        doc.moveTo(col1 - 5, y - 2).lineTo(555, y - 2).stroke();
        
        // Datenzeilen
        doc.font("Helvetica").fontSize(8);
        for (const stat of packstationStats) {
          if (y > 750) {
            doc.addPage();
            y = 50;
          }
          
          doc.text(stat.varietyName, statCol1, y, { width: 95 });
          doc.text(formatKgPdf(stat.deliveredKg), statCol2, y, { width: 55, align: "right" });
          doc.text(formatKgPdf(stat.packedKg), statCol3, y, { width: 55, align: "right" });
          doc.text(formatKgPdf(stat.wasteKg), statCol4, y, { width: 45, align: "right" });
          doc.text(`${stat.yieldPercent.toFixed(1)} %`, statCol5, y, { width: 45, align: "right" });
          doc.text(formatKgPdf(stat.currentKg), statCol6, y, { width: 60, align: "right" });
          y += 12;
        }
        
        // Gesamtsummen
        y += 5;
        doc.moveTo(col1 - 5, y).lineTo(555, y).stroke();
        y += 8;
        doc.font("Helvetica-Bold");
        const totalDelivered = packstationStats.reduce((sum, s) => sum + s.deliveredKg, 0);
        const totalPacked = packstationStats.reduce((sum, s) => sum + s.packedKg, 0);
        const totalWaste = packstationStats.reduce((sum, s) => sum + s.wasteKg, 0);
        const totalCurrent = packstationStats.reduce((sum, s) => sum + s.currentKg, 0);
        const avgYield = totalPacked + totalWaste > 0 
          ? (totalPacked / (totalPacked + totalWaste)) * 100 
          : 0;
        
        doc.text("Gesamt:", statCol1, y);
        doc.text(formatKgPdf(totalDelivered), statCol2, y, { width: 55, align: "right" });
        doc.text(formatKgPdf(totalPacked), statCol3, y, { width: 55, align: "right" });
        doc.text(formatKgPdf(totalWaste), statCol4, y, { width: 45, align: "right" });
        doc.text(`${avgYield.toFixed(1)} %`, statCol5, y, { width: 45, align: "right" });
        doc.text(formatKgPdf(totalCurrent), statCol6, y, { width: 60, align: "right" });
        y += 20;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ▶ E-Mail-Service
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendStatementEmailParams {
  to: string;
  farmerName: string;
  periodStart: Date;
  periodEnd: Date;
  pdfBuffer: Buffer;
}

async function sendFarmerStatementEmail(params: SendStatementEmailParams): Promise<void> {
  const { to, farmerName, periodStart, periodEnd, pdfBuffer } = params;
  
  const periodText = `${formatDateDE(periodStart)} - ${formatDateDE(periodEnd)}`;
  const filename = `Akonto-Abrechnung_${farmerName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_${formatDateDE(periodStart).replace(/\./g, "-")}.pdf`;

  await emailTransporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@eferdinger-landl.at",
    to,
    subject: `Akonto-Abrechnung ${periodText}`,
    text: `Sehr geehrte/r ${farmerName},

anbei erhalten Sie Ihre Akonto-Abrechnung für den Zeitraum ${periodText}.

Bei Fragen wenden Sie sich bitte an die Erzeugergemeinschaft.

Mit freundlichen Grüßen
Eferdinger Landl EZG`,
    html: `
      <p>Sehr geehrte/r ${farmerName},</p>
      <p>anbei erhalten Sie Ihre Akonto-Abrechnung für den Zeitraum <strong>${periodText}</strong>.</p>
      <p>Bei Fragen wenden Sie sich bitte an die Erzeugergemeinschaft.</p>
      <p>Mit freundlichen Grüßen<br/>Eferdinger Landl EZG</p>
    `,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

// ▶ PDF-Speicherung
const STATEMENTS_DIR = path.join(process.cwd(), "statements");

async function saveFarmerStatementPdf(
  statement: FarmerStatement,
  pdfBuffer: Buffer
): Promise<string> {
  // Ordner erstellen falls nicht vorhanden
  if (!fs.existsSync(STATEMENTS_DIR)) {
    fs.mkdirSync(STATEMENTS_DIR, { recursive: true });
  }

  const filename = `abrechnung_${statement.farmerId}_${statement.periodStart.toISOString().substring(0, 10)}_${statement.periodEnd.toISOString().substring(0, 10)}.pdf`;
  const filepath = path.join(STATEMENTS_DIR, filename);
  
  fs.writeFileSync(filepath, pdfBuffer);
  
  return filename;
}

type AccountingDocumentWithLines = any;

// ▶ Packbetriebsrechnung (EG -> Packbetrieb) aus Kundenverkäufen
async function createPackPlantSalesInvoice(
  packPlantId: number,
  dateFrom: Date,
  dateTo: Date
): Promise<AccountingDocumentWithLines> {
  const periodStart = new Date(dateFrom);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(dateTo);
  periodEnd.setHours(23, 59, 59, 999);

  const packPlant: any = await prisma.packPlant.findUnique({
    where: { id: packPlantId },
    include: { address: true } as any,
  });
  if (!packPlant) {
    throw new Error(`Packbetrieb mit ID ${packPlantId} nicht gefunden`);
  }

  const issuer = await getIssuerSnapshot();
  const recipientAddressSnapshot = formatAddressSnapshot(packPlant.address);

  // 1. Finde alle PackPlantStockMovements für diesen Packbetrieb im Zeitraum (reason="SALE")
  const movements = await prisma.packPlantStockMovement.findMany({
    where: {
      packPlantId: packPlantId,
      reason: "SALE",
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
      customerSaleId: { not: null }, // Nur Verkäufe, keine anderen Bewegungen
    },
    include: {
      customerSale: {
        include: {
          customer: true,
          product: {
            include: { taxRate: true } as any,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. Extrahiere die eindeutigen CustomerSales (ein Sale kann mehrere Movements haben)
  const salesMap = new Map<number, any>();
  for (const movement of movements) {
    if (movement.customerSale && !salesMap.has(movement.customerSale.id)) {
      salesMap.set(movement.customerSale.id, movement.customerSale);
    }
  }
  const sales = Array.from(salesMap.values());

  // Jede Lieferung = eigene Position (nicht aggregiert)
  const linesData: any[] = [];
  let positionNumber = 1;

  // Alle Verkäufe als einzelne Positionen
  for (const sale of sales) {
    const vatRatePercent = Number((sale as any).product?.taxRate?.ratePercent ?? 0);
    const unitPrice = Number(sale.unitPrice); // Preis pro Colli
    
    // Produkt laden, um unitsPerColli zu erhalten
    const product = await prisma.product.findUnique({
      where: { id: sale.productId },
    });
    
    if (!product) {
      console.warn(`Produkt ${sale.productId} nicht gefunden für Sale ${sale.id}`);
      continue;
    }
    
    const unitsPerColli = product.unitsPerColli ?? 1;
    if (unitsPerColli <= 0) {
      console.warn(`Produkt ${sale.productId} hat keine unitsPerColli definiert`);
      continue;
    }
    
    // Berechne Colli aus Einheiten
    const colli = sale.quantityUnits / unitsPerColli;
    
    // Preis ist pro Colli, daher: netAmount = unitPrice * colli
    // Verwende totalAmount aus CustomerSale (ist bereits korrekt berechnet: unitPrice * colli)
    // Falls totalAmount nicht korrekt ist, berechne es neu
    const netAmount = Number(sale.totalAmount) || (unitPrice * colli);
    const vatAmount = Number((netAmount * vatRatePercent) / 100);
    const grossAmount = netAmount + vatAmount;
    
    // Beschreibung: Produkt, Sorte, ggf. Abnehmer/Filiale
    const varietyInfo = sale.varietyNameSnapshot ? `, ${sale.varietyNameSnapshot}` : "";
    const description = `${sale.productNameSnapshot}${varietyInfo} an ${sale.customerNameSnapshot}`;

    linesData.push({
      positionNumber: positionNumber++,
      description,
      quantity: colli, // Menge in Colli anzeigen
      unit: "Colli",
      unitPrice,
      netAmount,
      vatRatePercent,
      vatAmount,
      grossAmount,
      customerNameSnapshot: sale.customerNameSnapshot,
      productNameSnapshot: sale.productNameSnapshot,
      packPlantNameSnapshot: packPlant.name,
      customerSaleId: sale.id,
    });
  }

  // 3. Reklamationen/Abzüge: Nur die, deren CustomerSale zu diesem Packbetrieb gehört
  // Finde alle CustomerSale-IDs, die zu diesem Packbetrieb gehören
  const saleIdsForPackPlant = sales.map(s => s.id);
  
  const complaints = await prisma.customerSaleComplaint.findMany({
    where: {
      customerSaleId: {
        in: saleIdsForPackPlant.length > 0 ? saleIdsForPackPlant : [-1], // -1 = keine Treffer, wenn keine Sales
      },
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      customerSale: {
        include: {
          customer: true,
          product: { include: { taxRate: true } as any },
        },
      },
    },
  });

  for (const complaint of complaints) {
    const sale = complaint.customerSale;
    if (!sale) {
      console.warn(`CustomerSale nicht gefunden für Complaint ${complaint.id}`);
      continue;
    }
    
    // Produkt laden, um unitsPerColli zu erhalten
    const product = await prisma.product.findUnique({
      where: { id: sale.productId },
    });
    
    if (!product) {
      console.warn(`Produkt ${sale.productId} nicht gefunden für Complaint ${complaint.id}`);
      continue;
    }
    
    const unitsPerColli = product.unitsPerColli ?? 1;
    if (unitsPerColli <= 0) {
      console.warn(`Produkt ${sale.productId} hat keine unitsPerColli definiert`);
      continue;
    }
    
    // Berechne Colli aus Einheiten
    // affectedQuantity ist in Einheiten (Units), nicht in Colli
    const affectedColli = complaint.affectedQuantity / unitsPerColli;
    
    let unitPrice: number;
    let netAmount: number;
    let vatRatePercent: number;
    
    if (complaint.complaintType === "RETOURWARE") {
      // RETOURWARE: Verkaufspreis je Colli gutschreiben (nicht Abpackkosten)
      // snapshotUnitPrice ist je Colli, affectedQuantity ist in Einheiten
      const saleUnitPrice = Number(complaint.snapshotUnitPrice);
      unitPrice = saleUnitPrice; // Verkaufspreis je Colli
      // netAmount = affectedColli * saleUnitPrice (Verkaufspreis)
      netAmount = -Math.abs(affectedColli * saleUnitPrice);
      vatRatePercent = Number(
        (sale as any)?.product?.taxRate?.ratePercent ?? 0
      );
    } else {
      // PROZENTABZUG: Wie in Bauernabrechnung berechnen
      // affectedQuantity ist in Einheiten, snapshotUnitPrice ist je Colli
      const saleUnitPrice = Number(complaint.snapshotUnitPrice);
      const discountPercent = Number(complaint.discountPercent ?? 0);
      // Berechne wie in Bauernabrechnung: affectedColli * saleUnitPrice * (discountPercent / 100)
      unitPrice = saleUnitPrice; // Preis je Colli
      netAmount = -Math.abs(affectedColli * saleUnitPrice * (discountPercent / 100));
      vatRatePercent = Number(
        (sale as any)?.product?.taxRate?.ratePercent ?? 0
      );
    }
    
    // Negativposition: Preisnachlass, Retour, Reklamation
    const complaintTypeText = 
      complaint.complaintType === "RETOURWARE"
        ? "Retour/Reklamation"
        : `Preisnachlass ${Number(complaint.discountPercent ?? 0)}%`;
    // varietyNameSnapshot kommt vom CustomerSale, nicht direkt vom Complaint
    const varietyInfo = (sale as any).varietyNameSnapshot ? `, ${(sale as any).varietyNameSnapshot}` : "";
    const description = `${complaintTypeText} ${complaint.productNameSnapshot}${varietyInfo} an ${complaint.customerNameSnapshot}`;

    const vatAmount = Number((netAmount * vatRatePercent) / 100);
    const grossAmount = netAmount + vatAmount;

    linesData.push({
      positionNumber: positionNumber++,
      description,
      quantity: affectedColli, // Immer in Colli anzeigen
      unit: "Colli",
      unitPrice,
      netAmount,
      vatRatePercent,
      vatAmount,
      grossAmount,
      customerNameSnapshot: complaint.customerNameSnapshot,
      productNameSnapshot: complaint.productNameSnapshot,
      packPlantNameSnapshot: packPlant.name,
      customerSaleComplaintId: complaint.id,
    });
  }

  const documentNumber = buildDocumentNumber("RECHNUNG");

  const doc = await (prisma as any).accountingDocument.create({
    data: {
      documentNumber,
      documentType: "RECHNUNG",
      issueDate: new Date(),
      servicePeriodFrom: periodStart,
      servicePeriodTo: periodEnd,
      title: `Rechnung EG → Packbetrieb ${formatDateDE(periodStart)} - ${formatDateDE(periodEnd)}`,
      issuerOrganizationId: issuer.issuerOrganizationId ?? null,
      recipientPackPlantId: packPlantId,
      recipientNameSnapshot: packPlant.name,
      recipientAddressSnapshot,
      recipientVatIdSnapshot: packPlant.vatId ?? null,
      recipientLegalFormSnapshot: packPlant.legalForm ?? null,
      recipientRegistryNumberSnapshot: packPlant.registryNumber ?? null,
      recipientRegistryCourtSnapshot: packPlant.registryCourt ?? null,
      recipientManagingDirectorsSnapshot: packPlant.managingDirectors ?? null,
      issuerNameSnapshot: issuer.issuerNameSnapshot,
      issuerAddressSnapshot: issuer.issuerAddressSnapshot,
      issuerVatIdSnapshot: issuer.issuerVatIdSnapshot,
      issuerLegalFormSnapshot: issuer.issuerLegalFormSnapshot ?? null,
      issuerRegistryNumberSnapshot: issuer.issuerRegistryNumberSnapshot ?? null,
      issuerRegistryCourtSnapshot: issuer.issuerRegistryCourtSnapshot ?? null,
      issuerManagingDirectorsSnapshot: issuer.issuerManagingDirectorsSnapshot ?? null,
      issuerIbanSnapshot: issuer.issuerIbanSnapshot ?? null,
      issuerBicSnapshot: issuer.issuerBicSnapshot ?? null,
      issuerBankNameSnapshot: issuer.issuerBankNameSnapshot ?? null,
      issuerPaymentTermsSnapshot: issuer.issuerPaymentTermsSnapshot ?? null,
      lines: {
        create: linesData,
      },
    },
    include: { lines: true },
  });

  return doc;
}

// ▶ Gutschrift für Abpackkosten (EG -> Packbetrieb)
async function createPackingCostCreditNote(
  packPlantId: number,
  dateFrom: Date,
  dateTo: Date
): Promise<AccountingDocumentWithLines> {
  const periodStart = new Date(dateFrom);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(dateTo);
  periodEnd.setHours(23, 59, 59, 999);

  const packPlant: any = await prisma.packPlant.findUnique({
    where: { id: packPlantId },
    include: { address: true } as any,
  });
  if (!packPlant) {
    throw new Error(`Packbetrieb mit ID ${packPlantId} nicht gefunden`);
  }

  const issuer = await getIssuerSnapshot();
  const recipientAddressSnapshot = formatAddressSnapshot(packPlant.address);

  // Basis: alle CustomerSales im Zeitraum (Mengen)
  const sales = await prisma.customerSale.findMany({
    where: {
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      product: { include: { taxRate: true } as any },
    },
  });

  type AggCredit = {
    description: string;
    quantityUnits: number;
    unitPrice: number;
    netAmount: number;
    vatRatePercent: number;
    productId: number | null;
    productNameSnapshot?: string | null;
  };

  const map = new Map<number, AggCredit>();

  for (const sale of sales) {
    const productId = sale.productId;
    const productNameSnapshot = sale.productNameSnapshot;
    
    // Produkt laden, um unitsPerColli zu erhalten
    const product = await prisma.product.findUnique({
      where: { id: sale.productId },
    });
    
    if (!product) {
      console.warn(`Produkt ${sale.productId} nicht gefunden für Sale ${sale.id}`);
      continue;
    }
    
    const unitsPerColli = product.unitsPerColli ?? 1;
    if (unitsPerColli <= 0) {
      console.warn(`Produkt ${sale.productId} hat keine unitsPerColli definiert`);
      continue;
    }
    
    // Umrechnung: quantityUnits (Einheiten) -> Colli
    const quantityColli = sale.quantityUnits / unitsPerColli;
    
    // Abpackkosten aus ProductPrice holen (gültig zum Verkaufsdatum)
    const productPrice = await prisma.productPrice.findFirst({
      where: {
        customerId: sale.customerId,
        productId: sale.productId,
        validFrom: { lte: sale.date },
        OR: [
          { validTo: null },
          { validTo: { gt: sale.date } },
        ],
      },
      orderBy: { validFrom: "desc" },
    });
    
    // Abpackkosten aus ProductPrice verwenden, falls vorhanden, sonst Fallback auf Produkt
    // WICHTIG: packingCostPerUnit ist pro Colli, nicht pro Einheit!
    const packingCostPerColli = productPrice?.packingCostPerUnit != null
      ? Number(productPrice.packingCostPerUnit)
      : Number(product.packingCostPerUnit ?? 0);
    
    // Abpackkosten sind eine Dienstleistung und unterliegen immer 20% MWSt
    const vatRatePercent = 20;
    
    // Berechnung: packingCostPerColli * quantityColli (da packingCostPerUnit pro Colli ist)
    const packingCostForThisSale = packingCostPerColli * quantityColli;
    
    if (!map.has(productId)) {
      // unitPrice für Anzeige: packingCostPerColli (Preis pro Colli)
      map.set(productId, {
        description: `Abpackkosten ${productNameSnapshot}`,
        quantityUnits: 0, // Wird in Colli umgerechnet
        unitPrice: packingCostPerColli, // Preis pro Colli
        netAmount: 0,
        vatRatePercent,
        productId,
        productNameSnapshot,
      });
    }
    const agg = map.get(productId)!;
    agg.quantityUnits += quantityColli; // In Colli aggregieren
    agg.netAmount += packingCostForThisSale;
  }

  const linesArray = Array.from(map.values());

  const linesData = linesArray.map((line, idx) => {
    const vatAmount = Number((line.netAmount * line.vatRatePercent) / 100);
    const grossAmount = line.netAmount + vatAmount;
    return {
      positionNumber: idx + 1,
      description: line.description,
      quantity: line.quantityUnits, // Bereits in Colli umgerechnet
      unit: "Colli",
      unitPrice: line.unitPrice, // Preis pro Colli
      netAmount: line.netAmount,
      vatRatePercent: line.vatRatePercent,
      vatAmount,
      grossAmount,
      productId: line.productId,
      productNameSnapshot: line.productNameSnapshot,
      packPlantNameSnapshot: packPlant.name,
    };
  });

  const documentNumber = buildDocumentNumber("GUTSCHRIFT");

  const doc = await (prisma as any).accountingDocument.create({
    data: {
      documentNumber,
      documentType: "GUTSCHRIFT",
      issueDate: new Date(),
      servicePeriodFrom: periodStart,
      servicePeriodTo: periodEnd,
      title: `Gutschrift Abpackkosten ${formatDateDE(periodStart)} - ${formatDateDE(periodEnd)}`,
      issuerOrganizationId: issuer.issuerOrganizationId ?? null,
      recipientPackPlantId: packPlantId,
      recipientNameSnapshot: packPlant.name,
      recipientAddressSnapshot,
      recipientVatIdSnapshot: packPlant.vatId ?? null,
      recipientLegalFormSnapshot: packPlant.legalForm ?? null,
      recipientRegistryNumberSnapshot: packPlant.registryNumber ?? null,
      recipientRegistryCourtSnapshot: packPlant.registryCourt ?? null,
      recipientManagingDirectorsSnapshot: packPlant.managingDirectors ?? null,
      issuerNameSnapshot: issuer.issuerNameSnapshot,
      issuerAddressSnapshot: issuer.issuerAddressSnapshot,
      issuerVatIdSnapshot: issuer.issuerVatIdSnapshot,
      issuerLegalFormSnapshot: issuer.issuerLegalFormSnapshot ?? null,
      issuerRegistryNumberSnapshot: issuer.issuerRegistryNumberSnapshot ?? null,
      issuerRegistryCourtSnapshot: issuer.issuerRegistryCourtSnapshot ?? null,
      issuerManagingDirectorsSnapshot: issuer.issuerManagingDirectorsSnapshot ?? null,
      issuerIbanSnapshot: issuer.issuerIbanSnapshot ?? null,
      issuerBicSnapshot: issuer.issuerBicSnapshot ?? null,
      issuerBankNameSnapshot: issuer.issuerBankNameSnapshot ?? null,
      issuerPaymentTermsSnapshot: issuer.issuerPaymentTermsSnapshot ?? null,
      lines: {
        create: linesData,
      },
    },
    include: { lines: true },
  });

  return doc;
}

// ▶ Helper: Restmenge eines CustomerSale für Reklamationen berechnen
async function getCustomerSaleRemainingQuantity(customerSaleId: number): Promise<{
  sale: any;
  totalQuantity: number;
  complainedQuantity: number;
  remainingQuantity: number;
}> {
  const sale = await prisma.customerSale.findUnique({
    where: { id: customerSaleId },
    include: {
      complaints: true,
      customer: true,
      product: true,
    },
  });

  if (!sale) {
    throw new Error(`CustomerSale mit ID ${customerSaleId} nicht gefunden`);
  }

  const totalQuantity = sale.quantityUnits;
  const complainedQuantity = sale.complaints.reduce(
    (sum, c) => sum + c.affectedQuantity,
    0
  );
  const remainingQuantity = totalQuantity - complainedQuantity;

  return {
    sale,
    totalQuantity,
    complainedQuantity,
    remainingQuantity,
  };
}

// ▶ Helper: Reklamation anlegen mit optionaler Retour-Lagerbewegung
async function createCustomerSaleComplaint(params: {
  customerSaleId: number;
  farmerId: number;
  complaintType: "RETOURWARE" | "PROZENTABZUG";
  affectedQuantity: number;
  discountPercent?: number;
  comment?: string;
}) {
  const {
    customerSaleId,
    farmerId,
    complaintType,
    affectedQuantity,
    discountPercent,
    comment,
  } = params;

  // 1. Prüfen, ob genug Restmenge vorhanden ist
  const { sale, remainingQuantity } = await getCustomerSaleRemainingQuantity(customerSaleId);

  if (affectedQuantity > remainingQuantity) {
    throw new Error(
      `Betroffene Menge (${affectedQuantity}) übersteigt Restmenge (${remainingQuantity})`
    );
  }

  // 2. Snapshots laden
  const [farmer, product, productPrice] = await Promise.all([
    prisma.farmer.findUnique({ where: { id: farmerId } }),
    prisma.product.findUnique({ where: { id: sale.productId } }),
    // Abpackkosten aus ProductPrice holen (gültig zum Verkaufsdatum)
    prisma.productPrice.findFirst({
      where: {
        customerId: sale.customerId,
        productId: sale.productId,
        validFrom: { lte: sale.date },
        OR: [
          { validTo: null },
          { validTo: { gt: sale.date } },
        ],
      },
      orderBy: { validFrom: "desc" },
    }),
  ]);

  if (!farmer) throw new Error(`Farmer mit ID ${farmerId} nicht gefunden`);
  if (!product) throw new Error(`Produkt nicht gefunden`);

  const farmerNameSnapshot = farmer.farmName
    ? `${farmer.name} (${farmer.farmName})`
    : farmer.name;
  const customerNameSnapshot = sale.customerNameSnapshot;
  const productNameSnapshot = sale.productNameSnapshot;
  const snapshotUnitPrice = Number(sale.unitPrice);
  // Abpackkosten aus ProductPrice verwenden, falls vorhanden, sonst Fallback auf Produkt
  const snapshotPackingCostPerUnit = productPrice?.packingCostPerUnit != null 
    ? Number(productPrice.packingCostPerUnit)
    : Number(product.packingCostPerUnit ?? 0);

  // 3. Reklamationsbetrag berechnen
  // WICHTIG: snapshotUnitPrice ist je Colli, affectedQuantity ist in Einheiten
  const unitsPerColli = product.unitsPerColli;
  if (!unitsPerColli || unitsPerColli <= 0) {
    throw new Error("Produkt hat keine 'Einheiten je Colli' definiert. Bitte in Stammdaten anpassen.");
  }
  
  let complaintAmount: number;
  if (complaintType === "RETOURWARE") {
    // Bei Retourware: nur die Verpackungskosten (nicht der volle Verkaufspreis)
    // snapshotPackingCostPerUnit ist je Einheit, affectedQuantity ist in Einheiten
    complaintAmount = affectedQuantity * snapshotPackingCostPerUnit;
  } else {
    // Prozentabzug: affectedQuantity ist in Einheiten, snapshotUnitPrice ist je Colli
    // Umrechnung: affectedQuantity / unitsPerColli = Colli
    const affectedColli = affectedQuantity / unitsPerColli;
    const percent = discountPercent ?? 0;
    complaintAmount = affectedColli * snapshotUnitPrice * (percent / 100);
  }

  // 4. Reklamation erstellen
  const complaint = await prisma.customerSaleComplaint.create({
    data: {
      customerSaleId,
      farmerId,
      complaintType,
      affectedQuantity,
      discountPercent: complaintType === "PROZENTABZUG" ? discountPercent : null,
      farmerNameSnapshot,
      customerNameSnapshot,
      productNameSnapshot,
      snapshotUnitPrice,
      snapshotPackingCostPerUnit,
      complaintAmount,
      comment,
    },
  });

  // 5. Bei Retourware: KEINE Lagerbewegung mehr
  // Die Ware geht nicht zurück ins Lager und wird nicht noch einmal verkauft

  return { complaint, retourMovement: null };
}

// ▶ Inventur verpackter Produkte im Packbetrieb (Bestand absolut setzen)
app.post("/api/packplant-stock/inventory", async (req, res) => {
  const {
    packPlantId,
    productId,
    newQuantityUnits,
    comment,
    pricePerUnit, // NEU: Preis für Bewertung / Snapshot
  } = req.body;

  const packPlantIdNum = packPlantId ? Number(packPlantId) : 1;

  if (!productId || newQuantityUnits == null) {
    return res.status(400).json({
      error: "productId und newQuantityUnits sind Pflichtfelder",
    });
  }

  const productIdNum = Number(productId);
  const targetUnits = Number(newQuantityUnits);

  if (!Number.isFinite(targetUnits) || targetUnits < 0) {
    return res.status(400).json({
      error: "newQuantityUnits muss eine Zahl ≥ 0 sein",
    });
  }

  // Preis optional, aber wenn geschickt, dann Zahl >= 0
  let pricePerUnitNum: number | null = null;
  if (pricePerUnit != null && pricePerUnit !== "") {
    const parsed = Number(pricePerUnit);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return res.status(400).json({
        error: "pricePerUnit ist ungültig",
      });
    }
    pricePerUnitNum = parsed;
  }

  try {
    const existing = await prisma.packPlantStock.findUnique({
      where: {
        packPlantId_productId: {
          packPlantId: packPlantIdNum,
          productId: productIdNum,
        },
      },
    });

    const currentUnits = existing ? Number(existing.quantityUnits) : 0;
    const diff = targetUnits - currentUnits;

    if (diff !== 0) {
      // Preis-Snapshot genauso wie beim Verkauf:
      // totalPriceSnapshot = pricePerUnit * bewegte Menge (|diff|)
      const totalPriceSnapshot = pricePerUnitNum != null
        ? pricePerUnitNum * Math.abs(diff)
        : null;

      await applyPackPlantStockChange(
        packPlantIdNum,
        productIdNum,
        diff,
        "INVENTORY",
        comment ?? "Inventur Packbetrieb",
        pricePerUnitNum,
        totalPriceSnapshot
      );
    }

    const updated = await prisma.packPlantStock.findUnique({
      where: {
        packPlantId_productId: {
          packPlantId: packPlantIdNum,
          productId: productIdNum,
        },
      },
      include: { packPlant: true, product: true },
    });

    return res.status(200).json(updated);
  } catch (err: any) {
    console.error("Fehler in POST /api/packplant-stock/inventory:", err);
    return res.status(500).json({
      error: "Fehler bei der Packbetriebs-Inventur",
      detail: String(err.message || err),
    });
  }
});

// ▶ Verkauf verpackter Produkte an Kunden (Packbetrieb → Kunde)
app.post("/api/packplant-stock/sale", async (req, res) => {
  const {
    packPlantId,
    productId,
    customerId,
    units,
    date,
    pricePerUnit,
    comment,
    varietyId,
    farmerId,
  } = req.body;

  const packPlantIdNum = packPlantId ? Number(packPlantId) : 1;

  if (!productId || !customerId || units == null) {
    return res.status(400).json({
      error: "productId, customerId und units sind Pflichtfelder",
    });
  }

  const productIdNum = Number(productId);
  const customerIdNum = Number(customerId);
  const unitsNum = Number(units);

  if (!Number.isFinite(unitsNum) || unitsNum <= 0) {
    return res.status(400).json({
      error: "units muss eine positive Zahl sein",
    });
  }

  // Preis validieren
  const priceNum = pricePerUnit != null ? Number(pricePerUnit) : null;
  if (priceNum != null && (!Number.isFinite(priceNum) || priceNum < 0)) {
    return res.status(400).json({
      error: "pricePerUnit ist ungültig",
    });
  }

  const dateToUse = date ? new Date(date) : new Date();

  try {
    // Bestand prüfen
    const stock = await prisma.packPlantStock.findUnique({
      where: {
        packPlantId_productId: {
          packPlantId: packPlantIdNum,
          productId: productIdNum,
        },
      },
    });

    // Bestandsprüfung entfernt: Verkauf ins Minus ist erlaubt

    // Snapshots und Produktdaten laden
    const [customer, product] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerIdNum } }),
      prisma.product.findUnique({ where: { id: productIdNum } }),
    ]);

    if (!customer) {
      return res.status(404).json({ error: "Kunde nicht gefunden" });
    }
    if (!product) {
      return res.status(404).json({ error: "Produkt nicht gefunden" });
    }

    // Snapshots: Name + Region/CookingType
    const customerNameSnapshot = customer.region 
      ? `${customer.name} (${customer.region})` 
      : customer.name;
    const productNameSnapshot = `${product.name} (${product.cookingType})`;
    const unitKg = product.unitKg ?? 0;
    const totalKg = unitKg * unitsNum;

    // Preis ermitteln: entweder vom Frontend übergeben oder aus Price-Tabelle
    // HINWEIS: Der Preis in der Datenbank ist je Colli, nicht je Einheit
    let finalPrice = priceNum;
    
    if (finalPrice == null) {
      // Preis aus Price-Tabelle ermitteln (gültig zum Verkaufsdatum)
      const priceRecord = await prisma.productPrice.findFirst({
        where: {
          customerId: customerIdNum,
          productId: productIdNum,
          validFrom: { lte: dateToUse },
          OR: [
            { validTo: null },
            { validTo: { gt: dateToUse } },
          ],
        },
        orderBy: { validFrom: "desc" },
      });

      if (priceRecord) {
        finalPrice = Number(priceRecord.pricePerUnit);
      } else {
        // Kein Preis gefunden - Warnung, aber trotzdem mit 0 fortfahren
        console.warn(`Kein Preis gefunden für Kunde ${customerIdNum}, Produkt ${productIdNum} am ${dateToUse.toISOString()}`);
        finalPrice = 0;
      }
    }

    // Preis ist je Colli, daher muss die Anzahl der Colli berechnet werden
    const unitsPerColli = product.unitsPerColli;
    if (!unitsPerColli || unitsPerColli <= 0) {
      return res.status(400).json({
        error: "Produkt hat keine 'Einheiten je Colli' definiert. Bitte in Stammdaten anpassen.",
      });
    }

    const colli = Math.floor(unitsNum / unitsPerColli);
    const totalPrice = finalPrice * colli;

    // Snapshots für Sorte und Bauer - FIFO (First In First Out)
    let varietyNameSnapshot: string | null = null;
    let farmerNameSnapshot: string | null = null;
    let finalVarietyId: number | null = null;
    let finalFarmerId: number | null = null;
    
    if (varietyId) {
      // Manuelle Zuordnung (falls vom Frontend übergeben)
      const variety = await prisma.variety.findUnique({
        where: { id: Number(varietyId) },
      });
      if (variety) {
        varietyNameSnapshot = variety.name;
        finalVarietyId = variety.id;
        // Variety hat keine direkte farmer Relation - muss über PackagingRun gefunden werden
      }
    } else if (farmerId) {
      // Manuelle Zuordnung (falls vom Frontend übergeben)
      const farmer = await prisma.farmer.findUnique({
        where: { id: Number(farmerId) },
      });
      if (farmer) {
        farmerNameSnapshot = farmer.name;
        finalFarmerId = farmer.id;
      }
    } else {
      // FIFO: Automatische Zuordnung basierend auf ältestem PackagingRun
      try {
        const oldestPackagingRun = await prisma.packagingRun.findFirst({
          where: {
            productId: productIdNum,
          },
          include: {
            farmer: true,
            variety: true,
          },
          orderBy: {
            date: "asc", // Älteste zuerst (FIFO)
          },
        });
        
        if (oldestPackagingRun) {
          // Variety aus PackagingRun
          if (oldestPackagingRun.varietyId != null) {
            finalVarietyId = oldestPackagingRun.varietyId;
            if (oldestPackagingRun.variety) {
              varietyNameSnapshot = oldestPackagingRun.varietyNameSnapshot || oldestPackagingRun.variety.name;
            } else if (oldestPackagingRun.varietyNameSnapshot) {
              varietyNameSnapshot = oldestPackagingRun.varietyNameSnapshot;
            }
          }
          
          // Farmer aus PackagingRun
          if (oldestPackagingRun.farmerId != null) {
            finalFarmerId = oldestPackagingRun.farmerId;
            if (oldestPackagingRun.farmer) {
              farmerNameSnapshot = oldestPackagingRun.farmerNameSnapshot || oldestPackagingRun.farmer.name;
            } else if (oldestPackagingRun.farmerNameSnapshot) {
              farmerNameSnapshot = oldestPackagingRun.farmerNameSnapshot;
            }
          }
        }
      } catch (fifoError) {
        console.warn("Fehler bei FIFO-Zuordnung, fahre ohne Farmer/Variety fort:", fifoError);
        // Weiter ohne Farmer/Variety - Verkauf kann trotzdem durchgeführt werden
      }
    }

    // 1) CustomerSale erstellen mit Rückverfolgbarkeit (farmerId, varietyId)
    const sale = await prisma.customerSale.create({
      data: {
        date: dateToUse,
        customerId: customerIdNum,
        productId: productIdNum,
        customerNameSnapshot,
        productNameSnapshot,
        quantityUnits: unitsNum,
        quantityKg: totalKg,
        unitPrice: finalPrice,
        totalAmount: totalPrice,
        comment: comment ?? null,
        // Rückverfolgbarkeit: Bauer und Sorte (aus FIFO-Logik oder manuell)
        farmerId: finalFarmerId ?? null,
        varietyId: finalVarietyId ?? null,
        farmerNameSnapshot: farmerNameSnapshot ?? null,
        varietyNameSnapshot: varietyNameSnapshot ?? null,
      },
    });

    // 2) Lager reduzieren + Movement erstellen (mit customerSaleId für Rückverfolgbarkeit)
    await applyPackPlantStockChange(
      packPlantIdNum,
      productIdNum,
      -unitsNum,
      "SALE",
      `Verkauf an ${customerNameSnapshot}`,
      finalPrice,
      totalPrice,
      sale.id // customerSaleId für Rückverfolgbarkeit
    );

    // 3) Movement mit Kundeninfo aktualisieren (optionaler Patch für Tracking)
    // Alternativ: applyPackPlantStockChange erweitern - aber hier einfacher:
    const lastMovement = await prisma.packPlantStockMovement.findFirst({
      where: {
        packPlantId: packPlantIdNum,
        productId: productIdNum,
        reason: "SALE",
        customerSaleId: sale.id, // Sicherstellen, dass wir das richtige Movement haben
      },
      orderBy: { createdAt: "desc" },
    });

    if (lastMovement) {
      await prisma.packPlantStockMovement.update({
        where: { id: lastMovement.id },
        data: {
          customerId: customerIdNum,
          customerNameSnapshot,
          // customerSaleId sollte bereits gesetzt sein, aber sicherheitshalber nochmal
          customerSaleId: sale.id,
        },
      });
    }

    console.log("PACKPLANT SALE CREATED:", {
      saleId: sale.id,
      customerId: customerIdNum,
      productId: productIdNum,
      units: unitsNum,
      pricePerUnit: finalPrice,
      totalPrice,
    });

    return res.status(201).json({
      ok: true,
      sale,
      message: "Produktverkauf erfolgreich verbucht",
    });
  } catch (err: any) {
    console.error("Fehler in POST /api/packplant-stock/sale:", err);
    return res.status(500).json({
      error: "Fehler beim Verbuchen des Produktverkaufs",
      detail: String(err.message || err),
    });
  }
});

// ▶ Admin: Repariere CustomerSale Snapshots (befülle fehlende/leere Snapshots)
app.post("/api/customer-sales/repair-snapshots", async (_req, res) => {
  try {
    // Alle CustomerSales laden
    const sales = await prisma.customerSale.findMany({
      include: {
        customer: true,
        product: true,
      },
    });

    let repairedCount = 0;

    for (const sale of sales) {
      const needsRepair =
        !sale.customerNameSnapshot ||
        !sale.productNameSnapshot ||
        sale.customerNameSnapshot === "" ||
        sale.productNameSnapshot === "";

      if (needsRepair && sale.customer && sale.product) {
        const cust = sale.customer;
        const prod = sale.product;
        await prisma.customerSale.update({
          where: { id: sale.id },
          data: {
            customerNameSnapshot: cust.region 
              ? `${cust.name} (${cust.region})` 
              : cust.name,
            productNameSnapshot: `${prod.name} (${prod.cookingType})`,
          },
        });
        repairedCount++;
      }
    }

    res.json({
      ok: true,
      message: `${repairedCount} CustomerSale-Datensätze repariert.`,
      total: sales.length,
    });
  } catch (err: any) {
    console.error("Fehler in POST /api/customer-sales/repair-snapshots:", err);
    res.status(500).json({
      error: "Fehler beim Reparieren der Snapshots",
      detail: String(err.message || err),
    });
  }
});

app.get("/api/product-prices", async (req, res) => {
  const { customerId, productId } = req.query;

  try {
    const where: any = {};
    if (customerId) where.customerId = Number(customerId);
    if (productId) where.productId = Number(productId);

    const prices = await prisma.productPrice.findMany({
      where,
      include: { customer: true, product: true },
      orderBy: [{ customerId: "asc" }, { productId: "asc" }, { validFrom: "desc" }],
    });

    res.json(prices);
  } catch (err: any) {
    console.error("Fehler in GET /api/product-prices:", err);
    res.status(500).json({ error: "Fehler beim Laden der Preise" });
  }
});

app.post("/api/product-prices", async (req, res) => {
  const { customerId, productId, pricePerUnit, packingCostPerUnit, validFrom, supplierType } = req.body;

  if (!customerId || !productId || pricePerUnit == null) {
    return res.status(400).json({
      error: "customerId, productId und pricePerUnit sind Pflichtfelder",
    });
  }

  try {
    const customerIdNum = Number(customerId);
    const productIdNum = Number(productId);

    const [customer, product] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerIdNum } }),
      prisma.product.findUnique({ where: { id: productIdNum } }),
    ]);

    // Neuen Preis mit validTo = null anlegen
    const price = await prisma.productPrice.create({
      data: {
        customerId: customerIdNum,
        productId: productIdNum,
        pricePerUnit: Number(pricePerUnit),
        packingCostPerUnit: packingCostPerUnit != null ? Number(packingCostPerUnit) : null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validTo: null,
        supplierType: supplierType || "PACKPLANT",
        customerNameSnapshot: customer 
          ? (customer.region ? `${customer.name} (${customer.region})` : customer.name)
          : null,
        productNameSnapshot: product 
          ? `${product.name} (${product.cookingType})`
          : null,
      },
    });

    // validTo für alle Preise dieser Gruppe neu berechnen
    await recalculateProductPriceValidToForGroup(customerIdNum, productIdNum);

    // Aktualisierten Preis zurückgeben
    const updatedPrice = await prisma.productPrice.findUnique({ where: { id: price.id } });
    res.status(201).json(updatedPrice);
  } catch (err: any) {
    console.error("Fehler in POST /api/product-prices:", err);
    res.status(500).json({ error: "Fehler beim Anlegen des Preises" });
  }
});

// ▶ UPDATE PRODUCT PRICE
app.put("/api/product-prices/:id", async (req, res) => {
  const { id } = req.params;
  const { customerId, productId, pricePerUnit, packingCostPerUnit, validFrom } = req.body;

  if (!customerId || !productId || pricePerUnit == null || packingCostPerUnit == null) {
    return res.status(400).json({
      error: "customerId, productId, pricePerUnit und packingCostPerUnit sind Pflichtfelder",
    });
  }

  try {
    const existingPrice = await prisma.productPrice.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPrice) {
      return res.status(404).json({ error: "Preis nicht gefunden" });
    }

    const customerIdNum = Number(customerId);
    const productIdNum = Number(productId);

    const [customer, product] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerIdNum } }),
      prisma.product.findUnique({ where: { id: productIdNum } }),
    ]);

    // Preis aktualisieren
    const updatedPrice = await prisma.productPrice.update({
      where: { id: Number(id) },
      data: {
        customerId: customerIdNum,
        productId: productIdNum,
        pricePerUnit: Number(pricePerUnit),
        packingCostPerUnit: packingCostPerUnit != null ? Number(packingCostPerUnit) : null,
        validFrom: validFrom ? new Date(validFrom) : existingPrice.validFrom,
        customerNameSnapshot: customer 
          ? (customer.region ? `${customer.name} (${customer.region})` : customer.name)
          : null,
        productNameSnapshot: product 
          ? `${product.name} (${product.cookingType})`
          : null,
      },
    });

    // validTo für alle Preise dieser Gruppe neu berechnen
    await recalculateProductPriceValidToForGroup(customerIdNum, productIdNum);

    // Alle CustomerSales, die diesen Preis verwenden, neu berechnen
    // Finde alle CustomerSales für diesen Kunden/Produkt, die nach dem validFrom-Datum erstellt wurden
    const affectedSales = await prisma.customerSale.findMany({
      where: {
        customerId: customerIdNum,
        productId: productIdNum,
        date: {
          gte: updatedPrice.validFrom,
        },
      },
    });

    // Aktualisiere alle betroffenen CustomerSales mit dem neuen Preis
    for (const sale of affectedSales) {
      // Prüfe, ob dieser Preis zum Verkaufsdatum gültig war
      const priceAtSaleDate = await getPriceForCustomerProductAtDate(
        customerIdNum,
        productIdNum,
        sale.date
      );

      if (priceAtSaleDate && priceAtSaleDate.id === updatedPrice.id) {
        // Dieser Preis war zum Verkaufsdatum gültig - aktualisiere den Sale
        const unitsPerColli = product?.unitsPerColli ?? 1;
        if (unitsPerColli > 0) {
          const colli = Math.floor(sale.quantityUnits / unitsPerColli);
          const newTotalAmount = Number(updatedPrice.pricePerUnit) * colli;

          await prisma.customerSale.update({
            where: { id: sale.id },
            data: {
              unitPrice: Number(updatedPrice.pricePerUnit),
              totalAmount: newTotalAmount,
            },
          });
        }
      }
    }

    res.json(updatedPrice);
  } catch (err: any) {
    console.error("Fehler in PUT /api/product-prices/:id:", err);
    res.status(500).json({
      error: "Fehler beim Aktualisieren des Preises",
      detail: String(err.message || err),
    });
  }
});

// ▶ Admin: Backfill validTo für alle bestehenden Preise
app.post("/api/product-prices/backfill-valid-to", async (_req, res) => {
  try {
    // Alle Preise laden, gruppiert nach Customer + Product
    const allPrices = await prisma.productPrice.findMany({
      orderBy: [
        { customerId: "asc" },
        { productId: "asc" },
        { validFrom: "asc" },
      ],
    });

    // Nach Gruppen gruppieren
    const groups = new Map<string, typeof allPrices>();
    for (const price of allPrices) {
      const key = `${price.customerId}-${price.productId}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(price);
    }

    let updatedCount = 0;

    // Für jede Gruppe validTo berechnen
    for (const [_key, prices] of groups) {
      for (let i = 0; i < prices.length; i++) {
        const currentPrice = prices[i];
        const nextPrice = prices[i + 1];
        const newValidTo = nextPrice ? nextPrice.validFrom : null;

        const currentValidTo = currentPrice.validTo;
        const needsUpdate =
          (currentValidTo === null && newValidTo !== null) ||
          (currentValidTo !== null && newValidTo === null) ||
          (currentValidTo !== null &&
            newValidTo !== null &&
            currentValidTo.getTime() !== newValidTo.getTime());

        if (needsUpdate) {
          await prisma.productPrice.update({
            where: { id: currentPrice.id },
            data: { validTo: newValidTo },
          });
          updatedCount++;
        }
      }
    }

    // Auch VarietyQualityPrice backfillen
    const qualities: Array<"Q1" | "Q2" | "UEBERGROESSE"> = ["Q1", "Q2", "UEBERGROESSE"];
    for (const quality of qualities) {
      await recalculateVarietyQualityPriceValidTo(quality);
    }

    res.json({
      ok: true,
      message: `Backfill abgeschlossen. ${updatedCount} Preise aktualisiert, ${groups.size} Preisgruppen verarbeitet.`,
    });
  } catch (err: any) {
    console.error("Fehler in POST /api/product-prices/backfill-valid-to:", err);
    res.status(500).json({ error: "Fehler beim Backfill", detail: String(err.message || err) });
  }
});

// ▶ CUSTOMER SALE COMPLAINTS (Reklamationen)

// GET: Kunden mit vorhandenen CustomerSales (für Dropdown)
app.get("/api/customer-sales/customers", async (_req, res) => {
  try {
    // Alle Kunden, die mindestens einen Sale haben
    const customers = await prisma.customer.findMany({
      where: {
        customerSales: { some: {} },
      },
      orderBy: { name: "asc" },
    });
    res.json(customers);
  } catch (err: any) {
    console.error("Fehler in GET /api/customer-sales/customers:", err);
    res.status(500).json({ error: "Fehler beim Laden der Kunden" });
  }
});

// GET: Produkte für einen Kunden (für Dropdown)
app.get("/api/customer-sales/products/:customerId", async (req, res) => {
  const { customerId } = req.params;

  try {
    // Alle Produkte, die für diesen Kunden verkauft wurden
    const sales = await prisma.customerSale.findMany({
      where: { customerId: Number(customerId) },
      select: { productId: true },
      distinct: ["productId"],
    });

    const productIds = sales.map((s) => s.productId);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      orderBy: { name: "asc" },
    });

    res.json(products);
  } catch (err: any) {
    console.error("Fehler in GET /api/customer-sales/products/:customerId:", err);
    res.status(500).json({ error: "Fehler beim Laden der Produkte" });
  }
});

// GET: Alle CustomerSales mit Reklamations-Info (nur mit Restmenge > 0 wenn onlyWithRemaining=true)
app.get("/api/customer-sales", async (req, res) => {
  const { customerId, productId, dateFrom, dateTo, onlyWithRemaining } = req.query;

  try {
    const where: any = {};
    if (customerId) where.customerId = Number(customerId);
    if (productId) where.productId = Number(productId);
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const sales = await prisma.customerSale.findMany({
      where,
      include: {
        customer: true,
        product: true,
        complaints: {
          include: {
            farmer: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Restmenge berechnen
    let salesWithRemaining = sales.map((sale) => {
      const complainedQuantity = sale.complaints.reduce(
        (sum, c) => sum + c.affectedQuantity,
        0
      );
      return {
        ...sale,
        complainedQuantity,
        remainingQuantity: sale.quantityUnits - complainedQuantity,
      };
    });

    // Optional: Nur Sales mit Restmenge > 0 zurückgeben
    if (onlyWithRemaining === "true") {
      salesWithRemaining = salesWithRemaining.filter((s) => s.remainingQuantity > 0);
    }

    res.json(salesWithRemaining);
  } catch (err: any) {
    console.error("Fehler in GET /api/customer-sales:", err);
    res.status(500).json({ error: "Fehler beim Laden der Verkäufe" });
  }
});

// GET: Einzelner CustomerSale mit Restmenge
app.get("/api/customer-sales/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await getCustomerSaleRemainingQuantity(Number(id));
    res.json(result);
  } catch (err: any) {
    console.error("Fehler in GET /api/customer-sales/:id:", err);
    res.status(500).json({ error: err.message || "Fehler beim Laden des Verkaufs" });
  }
});

// GET: Relevante Bauern für einen CustomerSale (Bauern, deren Ware für diesen Verkauf verwendet wurde)
// Logik: 
// 1. Direkt aus CustomerSale.farmerId lesen (falls vorhanden)
// 2. Über PackPlantStockMovement -> PackagingRun (falls customerSaleId gesetzt ist)
// 3. FIFO-Logik als Fallback für alte Verkäufe
app.get("/api/customer-sales/:id/farmers", async (req, res) => {
  const { id } = req.params;

  try {
    const sale = await prisma.customerSale.findUnique({
      where: { id: Number(id) },
      include: {
        product: true,
        farmer: true, // Falls farmerId gesetzt ist
      },
    });

    if (!sale) {
      return res.status(404).json({ error: "Verkauf nicht gefunden" });
    }

    // 1. Wenn farmerId direkt im CustomerSale gespeichert ist, verwende diesen
    if (sale.farmerId != null) {
      const farmer = sale.farmer;
      if (farmer) {
        console.log(`GET /api/customer-sales/${id}/farmers: Using direct farmerId from CustomerSale: ${farmer.id}`);
        return res.json([farmer]);
      }
    }

    // 2. Versuche über PackPlantStockMovement -> PackagingRun zu finden
    // (für neue Verkäufe mit customerSaleId in Movement)
    const saleMovements = await prisma.packPlantStockMovement.findMany({
      where: {
        customerSaleId: sale.id,
        reason: "SALE",
      },
      include: {
        packagingRun: {
          include: {
            farmer: true,
          },
        },
      },
    });

    const farmerIds = new Set<number>();

    // Wenn Movements mit packagingRunId gefunden wurden, sammle die Bauern
    for (const movement of saleMovements) {
      if (movement.packagingRunId != null && movement.packagingRun?.farmerId != null) {
        farmerIds.add(movement.packagingRun.farmerId);
      }
    }

    // 3. Falls keine Bauern über Movements gefunden wurden, verwende FIFO-Logik
    // (für alte Verkäufe ohne customerSaleId in Movement)
    if (farmerIds.size === 0) {
      console.log(`GET /api/customer-sales/${id}/farmers: No movements found, using FIFO logic`);
      
      // Finde alle PackagingRuns für dieses Produkt, die vor oder am Verkaufsdatum waren (FIFO)
      const packagingRuns = await prisma.packagingRun.findMany({
        where: {
          productId: sale.productId,
          date: {
            lte: sale.date, // Verpackung muss vor oder am Verkaufsdatum gewesen sein
          },
        },
        include: {
          farmer: true,
        },
        orderBy: {
          date: "asc", // FIFO: Älteste zuerst
        },
      });

      // FIFO-Logik: Finde die PackagingRuns, die für diesen Verkauf verwendet wurden
      // Ein Verkauf kann sich aus verschiedenen Bauern zusammensetzen
      const soldUnits = sale.quantityUnits;
      let remainingUnits = soldUnits;
      
      // Gehe durch die PackagingRuns in FIFO-Reihenfolge und sammle die Bauern
      for (const run of packagingRuns) {
        if (remainingUnits <= 0) break;
        
        if (run.farmerId != null) {
          farmerIds.add(run.farmerId);
        }
        
        // Reduziere die verbleibenden Einheiten
        remainingUnits -= run.quantityUnits;
      }

      // 4. Wenn immer noch keine Bauern gefunden wurden, gebe alle Bauern zurück,
      // die PackagingRuns für dieses Produkt haben (auch nach dem Verkaufsdatum)
      // Dies ist ein Fallback für den Fall, dass keine PackagingRuns vor dem Verkaufsdatum existieren
      if (farmerIds.size === 0) {
        const allRuns = await prisma.packagingRun.findMany({
          where: {
            productId: sale.productId,
          },
          include: {
            farmer: true,
          },
          distinct: ["farmerId"],
        });

        for (const run of allRuns) {
          if (run.farmerId != null) {
            farmerIds.add(run.farmerId);
          }
        }
      }
    }

    // 5. Bauern laden
    const relevantFarmers = await prisma.farmer.findMany({
      where: {
        id: { in: Array.from(farmerIds) },
      },
      orderBy: { name: "asc" },
    });

    console.log(`GET /api/customer-sales/${id}/farmers: Found ${relevantFarmers.length} farmers for sale ${id}`);
    res.json(relevantFarmers);
  } catch (err: any) {
    console.error("Fehler in GET /api/customer-sales/:id/farmers:", err);
    res.status(500).json({ error: err.message || "Fehler beim Laden der Bauern" });
  }
});

// POST: Reklamation anlegen
app.post("/api/customer-sale-complaints", async (req, res) => {
  const {
    customerSaleId,
    farmerId,
    complaintType,
    affectedQuantity,
    discountPercent,
    comment,
  } = req.body;

  if (!customerSaleId || !farmerId || !complaintType || affectedQuantity == null) {
    return res.status(400).json({
      error: "customerSaleId, farmerId, complaintType und affectedQuantity sind Pflichtfelder",
    });
  }

  if (!["RETOURWARE", "PROZENTABZUG"].includes(complaintType)) {
    return res.status(400).json({
      error: "complaintType muss RETOURWARE oder PROZENTABZUG sein",
    });
  }


  if (complaintType === "PROZENTABZUG" && (discountPercent == null || discountPercent <= 0)) {
    return res.status(400).json({
      error: "Bei Prozentabzug ist ein discountPercent > 0 erforderlich",
    });
  }

  try {
    const result = await createCustomerSaleComplaint({
      customerSaleId: Number(customerSaleId),
      farmerId: Number(farmerId),
      complaintType,
      affectedQuantity: Number(affectedQuantity),
      discountPercent: discountPercent ? Number(discountPercent) : undefined,
      comment,
    });

    // Aktualisierte Restmenge berechnen
    const updatedSaleInfo = await getCustomerSaleRemainingQuantity(Number(customerSaleId));

    res.status(201).json({
      ok: true,
      complaint: result.complaint,
      retourMovement: result.retourMovement,
      updatedSale: {
        totalQuantity: updatedSaleInfo.totalQuantity,
        complainedQuantity: updatedSaleInfo.complainedQuantity,
        remainingQuantity: updatedSaleInfo.remainingQuantity,
      },
      message: result.retourMovement
        ? "Reklamation mit Retour-Lagerbewegung erstellt"
        : "Reklamation erstellt (ohne Lagerbewegung)",
    });
  } catch (err: any) {
    console.error("Fehler in POST /api/customer-sale-complaints:", err);
    res.status(400).json({
      error: err.message || "Fehler beim Anlegen der Reklamation",
    });
  }
});

// GET: Alle Reklamationen (optional gefiltert)
app.get("/api/customer-sale-complaints", async (req, res) => {
  const { customerSaleId, farmerId } = req.query;

  try {
    const where: any = {};
    if (customerSaleId) where.customerSaleId = Number(customerSaleId);
    if (farmerId) where.farmerId = Number(farmerId);

    const complaints = await prisma.customerSaleComplaint.findMany({
      where,
      include: {
        customerSale: {
          include: {
            customer: true,
            product: true,
          },
        },
        farmer: true,
        retourMovements: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(complaints);
  } catch (err: any) {
    console.error("Fehler in GET /api/customer-sale-complaints:", err);
    res.status(500).json({ error: "Fehler beim Laden der Reklamationen" });
  }
});

// ▶ Packbetrieb Statistik: Verkäufe, Reklamationen, Inventuren
app.get("/api/packbetrieb/statistics", async (req, res) => {
  const { 
    dateFrom, 
    dateTo, 
    productId, 
    customerId,
    type // "SALE" | "COMPLAINT" | "INVENTORY" | "ALL"
  } = req.query;

  try {
    const dateFromParsed = dateFrom ? new Date(dateFrom as string) : null;
    const dateToParsed = dateTo ? new Date(dateTo as string) : null;

    // Verkäufe
    const salesWhere: any = {};
    if (dateFromParsed) salesWhere.date = { ...salesWhere.date, gte: dateFromParsed };
    if (dateToParsed) salesWhere.date = { ...salesWhere.date, lte: dateToParsed };
    if (productId) salesWhere.productId = Number(productId);
    if (customerId) salesWhere.customerId = Number(customerId);

    const sales = (type === "ALL" || type === "SALE" || !type) ? await prisma.customerSale.findMany({
      where: salesWhere,
      include: {
        customer: true,
        product: true,
        complaints: true,
      },
      orderBy: { date: "desc" },
    }) : [];

    // Reklamationen
    const complaintsWhere: any = {};
    if (dateFromParsed) complaintsWhere.createdAt = { ...complaintsWhere.createdAt, gte: dateFromParsed };
    if (dateToParsed) complaintsWhere.createdAt = { ...complaintsWhere.createdAt, lte: dateToParsed };
    if (productId) {
      complaintsWhere.customerSale = { productId: Number(productId) };
    }
    if (customerId) {
      complaintsWhere.customerSale = { ...complaintsWhere.customerSale, customerId: Number(customerId) };
    }

    const complaints = (type === "ALL" || type === "COMPLAINT" || !type) ? await prisma.customerSaleComplaint.findMany({
      where: complaintsWhere,
      include: {
        customerSale: {
          include: {
            customer: true,
            product: true,
          },
        },
        farmer: true,
      },
      orderBy: { createdAt: "desc" },
    }) : [];

    // Inventuren (PackPlantStockMovements mit reason "INVENTORY")
    const inventoryWhere: any = { reason: "INVENTORY" };
    if (dateFromParsed) inventoryWhere.createdAt = { ...inventoryWhere.createdAt, gte: dateFromParsed };
    if (dateToParsed) inventoryWhere.createdAt = { ...inventoryWhere.createdAt, lte: dateToParsed };
    if (productId) inventoryWhere.productId = Number(productId);

    const inventories = (type === "ALL" || type === "INVENTORY" || !type) ? await prisma.packPlantStockMovement.findMany({
      where: inventoryWhere,
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
    }) : [];

    // Packstellen-Buchungen (Verpackung, Abfall, Auf 0)
    const packagingWhere: any = {};
    if (dateFromParsed) packagingWhere.date = { ...packagingWhere.date, gte: dateFromParsed };
    if (dateToParsed) packagingWhere.date = { ...packagingWhere.date, lte: dateToParsed };
    if (productId) packagingWhere.productId = Number(productId);

    const packagingRuns = (type === "ALL" || type === "PACKAGING" || !type) ? await prisma.packagingRun.findMany({
      where: packagingWhere,
      include: {
        product: true,
        farmer: true,
        variety: true,
      },
      orderBy: { date: "desc" },
    }) : [];

    const wasteWhere: any = { reason: "SORTING_WASTE" };
    if (dateFromParsed) wasteWhere.createdAt = { ...wasteWhere.createdAt, gte: dateFromParsed };
    if (dateToParsed) wasteWhere.createdAt = { ...wasteWhere.createdAt, lte: dateToParsed };

    const wasteMovements = (type === "ALL" || type === "WASTE" || !type) ? await prisma.packStationStockMovement.findMany({
      where: wasteWhere,
      include: {
        farmer: true,
        variety: true,
      },
      orderBy: { createdAt: "desc" },
    }) : [];

    const inventoryZeroWhere: any = { reason: "INVENTORY_ZERO" };
    if (dateFromParsed) inventoryZeroWhere.createdAt = { ...inventoryZeroWhere.createdAt, gte: dateFromParsed };
    if (dateToParsed) inventoryZeroWhere.createdAt = { ...inventoryZeroWhere.createdAt, lte: dateToParsed };

    const inventoryZeroMovements = (type === "ALL" || type === "INVENTORY_ZERO" || !type) ? await prisma.packStationStockMovement.findMany({
      where: inventoryZeroWhere,
      include: {
        farmer: true,
        variety: true,
      },
      orderBy: { createdAt: "desc" },
    }) : [];

    res.json({
      sales,
      complaints,
      inventories,
      packagingRuns,
      wasteMovements,
      inventoryZeroMovements,
    });
  } catch (err: any) {
    console.error("Fehler in GET /api/packbetrieb/statistics:", err);
    res.status(500).json({ error: "Fehler beim Laden der Statistik" });
  }
});

// ▶ UPDATE CustomerSale (Verkauf)
app.put("/api/customer-sales/:id", async (req, res) => {
  const { id } = req.params;
  const { date, customerId, productId, quantityUnits, unitPrice, comment } = req.body;

  try {
    const existingSale = await prisma.customerSale.findUnique({
      where: { id: Number(id) },
      include: { product: true },
    });

    if (!existingSale) {
      return res.status(404).json({ error: "Verkauf nicht gefunden" });
    }

    // Produkt für Berechnungen
    const product = existingSale.product || await prisma.product.findUnique({ where: { id: existingSale.productId } });
    if (!product) {
      return res.status(404).json({ error: "Produkt nicht gefunden" });
    }

    const unitsPerColli = product.unitsPerColli;
    if (!unitsPerColli || unitsPerColli <= 0) {
      return res.status(400).json({
        error: "Produkt hat keine 'Einheiten je Colli' definiert",
      });
    }

    // Neue Werte
    const newDate = date ? new Date(date) : existingSale.date;
    const newCustomerId = customerId ? Number(customerId) : existingSale.customerId;
    const newProductId = productId ? Number(productId) : existingSale.productId;
    const newQuantityUnits = quantityUnits != null ? Number(quantityUnits) : existingSale.quantityUnits;
    const newUnitPrice = unitPrice != null ? Number(unitPrice) : existingSale.unitPrice;
    const newComment = comment !== undefined ? comment : existingSale.comment;

    // Berechnungen
    const newQuantityKg = (product.unitKg ?? 0) * newQuantityUnits;
    const newColli = Math.floor(newQuantityUnits / unitsPerColli);
    const newTotalAmount = Number(newUnitPrice) * newColli;

    // Snapshots aktualisieren
    const customer = await prisma.customer.findUnique({ where: { id: newCustomerId } });
    const customerNameSnapshot = customer?.region 
      ? `${customer?.name} (${customer.region})` 
      : customer?.name ?? existingSale.customerNameSnapshot;
    const productNameSnapshot = `${product.name} (${product.cookingType})`;

    // Verkauf aktualisieren
    const updatedSale = await prisma.customerSale.update({
      where: { id: Number(id) },
      data: {
        date: newDate,
        customerId: newCustomerId,
        productId: newProductId,
        customerNameSnapshot,
        productNameSnapshot,
        quantityUnits: newQuantityUnits,
        quantityKg: newQuantityKg,
        unitPrice: newUnitPrice,
        totalAmount: newTotalAmount,
        comment: newComment,
      },
    });

    // Lagerbewegung korrigieren (alte rückgängig, neue erstellen)
    const oldMovement = await prisma.packPlantStockMovement.findFirst({
      where: {
        packPlantId: 1,
        productId: existingSale.productId,
        reason: "SALE",
        customerId: existingSale.customerId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (oldMovement) {
      // Alte Bewegung rückgängig machen
      await applyPackPlantStockChange(
        1,
        existingSale.productId,
        Number(existingSale.quantityUnits), // Zurück ins Lager
        "SALE_CORRECTION",
        `Korrektur Verkauf #${id}`,
        Number(existingSale.unitPrice),
        Number(existingSale.totalAmount)
      );

      // Neue Bewegung erstellen
      await applyPackPlantStockChange(
        1,
        newProductId,
        -newQuantityUnits, // Aus Lager
        "SALE",
        `Verkauf an ${customerNameSnapshot}`,
        Number(newUnitPrice),
        newTotalAmount
      );

      // Movement mit Kundeninfo aktualisieren
      const lastMovement = await prisma.packPlantStockMovement.findFirst({
        where: {
          packPlantId: 1,
          productId: newProductId,
          reason: "SALE",
        },
        orderBy: { createdAt: "desc" },
      });

      if (lastMovement) {
        await prisma.packPlantStockMovement.update({
          where: { id: lastMovement.id },
          data: {
            customerId: newCustomerId,
            customerNameSnapshot,
          },
        });
      }
    }

    res.json(updatedSale);
  } catch (err: any) {
    console.error("Fehler in PUT /api/customer-sales/:id:", err);
    res.status(500).json({
      error: "Fehler beim Aktualisieren des Verkaufs",
      detail: String(err.message || err),
    });
  }
});

// ▶ UPDATE CustomerSaleComplaint (Reklamation)
app.put("/api/customer-sale-complaints/:id", async (req, res) => {
  const { id } = req.params;
  const { complaintType, affectedQuantity, discountPercent, comment, packStationId, varietyId } = req.body;

  try {
    const existingComplaint = await prisma.customerSaleComplaint.findUnique({
      where: { id: Number(id) },
      include: {
        customerSale: {
          include: { product: true },
        },
        retourMovements: true,
      },
    });

    if (!existingComplaint) {
      return res.status(404).json({ error: "Reklamation nicht gefunden" });
    }

    const sale = existingComplaint.customerSale;
    const product = sale.product;
    if (!product) {
      return res.status(404).json({ error: "Produkt nicht gefunden" });
    }

    const unitsPerColli = product.unitsPerColli;
    if (!unitsPerColli || unitsPerColli <= 0) {
      return res.status(400).json({
        error: "Produkt hat keine 'Einheiten je Colli' definiert",
      });
    }

    // Neue Werte
    const newComplaintType = complaintType || existingComplaint.complaintType;
    const newAffectedQuantity = affectedQuantity != null ? Number(affectedQuantity) : Number(existingComplaint.affectedQuantity);
    const newDiscountPercent = discountPercent != null ? Number(discountPercent) : (existingComplaint.discountPercent != null ? Number(existingComplaint.discountPercent) : null);
    const newComment = comment !== undefined ? comment : existingComplaint.comment;
    // packStationId und varietyId werden nicht mehr benötigt, da Retourware nicht zurück ins Lager geht

    // Reklamationsbetrag neu berechnen
    const snapshotUnitPrice = Number(sale.unitPrice);
    
    // Abpackkosten aus ProductPrice holen (gültig zum Verkaufsdatum)
    const productPrice = await prisma.productPrice.findFirst({
      where: {
        customerId: sale.customerId,
        productId: sale.productId,
        validFrom: { lte: sale.date },
        OR: [
          { validTo: null },
          { validTo: { gt: sale.date } },
        ],
      },
      orderBy: { validFrom: "desc" },
    });
    
    // Abpackkosten aus ProductPrice verwenden, falls vorhanden, sonst Fallback auf Produkt
    const snapshotPackingCostPerUnitNum = productPrice?.packingCostPerUnit != null
      ? Number(productPrice.packingCostPerUnit)
      : Number(product.packingCostPerUnit ?? 0);
    
    let newComplaintAmount: number;
    if (newComplaintType === "RETOURWARE") {
      // Bei Retourware: nur die Verpackungskosten (nicht der volle Verkaufspreis)
      // snapshotPackingCostPerUnitNum ist je Einheit, newAffectedQuantity ist in Einheiten
      newComplaintAmount = newAffectedQuantity * snapshotPackingCostPerUnitNum;
    } else {
      // Prozentabzug: newAffectedQuantity ist in Einheiten, snapshotUnitPrice ist je Colli
      // Umrechnung: newAffectedQuantity / unitsPerColli = Colli
      const affectedColli = newAffectedQuantity / unitsPerColli;
      newComplaintAmount = affectedColli * snapshotUnitPrice * ((newDiscountPercent ?? 0) / 100);
    }

    // Reklamation aktualisieren
    const updatedComplaint = await prisma.customerSaleComplaint.update({
      where: { id: Number(id) },
      data: {
        complaintType: newComplaintType,
        affectedQuantity: newAffectedQuantity,
        discountPercent: newComplaintType === "PROZENTABZUG" ? newDiscountPercent : null,
        complaintAmount: newComplaintAmount,
        comment: newComment,
      },
    });

    // Bei Retourware: KEINE Lagerbewegung mehr
    // Die Ware geht nicht zurück ins Lager und wird nicht noch einmal verkauft
    // Falls es eine alte Retour-Bewegung gibt, diese entfernen
    const oldRetourMovement = await prisma.packStationStockMovement.findFirst({
      where: {
        customerSaleComplaintId: Number(id),
        reason: "RETOUR",
      },
    });

    if (oldRetourMovement) {
      // Alte Bewegung rückgängig machen
      await prisma.packStationStock.update({
        where: {
          packStationId_farmerId_varietyId: {
            packStationId: oldRetourMovement.packStationId,
            farmerId: oldRetourMovement.farmerId,
            varietyId: oldRetourMovement.varietyId,
          },
        },
        data: {
          quantityKg: { decrement: oldRetourMovement.changeKg },
        },
      });
      await prisma.packStationStockMovement.delete({
        where: { id: oldRetourMovement.id },
      });
    }

    res.json(updatedComplaint);
  } catch (err: any) {
    console.error("Fehler in PUT /api/customer-sale-complaints/:id:", err);
    res.status(500).json({
      error: "Fehler beim Aktualisieren der Reklamation",
      detail: String(err.message || err),
    });
  }
});

// ▶ UPDATE PackPlantStockMovement (Inventur)
app.put("/api/packplant-stock-movements/:id", async (req, res) => {
  const { id } = req.params;
  const { changeUnits, pricePerUnitSnapshot, comment } = req.body;

  try {
    const existingMovement = await prisma.packPlantStockMovement.findUnique({
      where: { id: Number(id) },
      include: { product: true },
    });

    if (!existingMovement || existingMovement.reason !== "INVENTORY") {
      return res.status(404).json({ error: "Inventur-Bewegung nicht gefunden" });
    }

    const product = existingMovement.product;
    if (!product) {
      return res.status(404).json({ error: "Produkt nicht gefunden" });
    }

    const unitsPerColli = product.unitsPerColli;
    if (!unitsPerColli || unitsPerColli <= 0) {
      return res.status(400).json({
        error: "Produkt hat keine 'Einheiten je Colli' definiert",
      });
    }

    // Neue Werte
    const newChangeUnits = changeUnits != null ? Number(changeUnits) : existingMovement.changeUnits;
    const newPricePerUnit = pricePerUnitSnapshot != null ? Number(pricePerUnitSnapshot) : existingMovement.pricePerUnitSnapshot;
    const newComment = comment !== undefined ? comment : existingMovement.comment;

    // Preis-Snapshot berechnen
    const newTotalPriceSnapshot = newPricePerUnit != null
      ? Number(newPricePerUnit) * Math.abs(newChangeUnits)
      : null;

    // Differenz berechnen
    const diff = newChangeUnits - existingMovement.changeUnits;

    // Lager korrigieren
    if (diff !== 0) {
      const existingStock = await prisma.packPlantStock.findUnique({
        where: {
          packPlantId_productId: {
            packPlantId: existingMovement.packPlantId,
            productId: existingMovement.productId,
          },
        },
      });

      if (existingStock) {
        await prisma.packPlantStock.update({
          where: { id: existingStock.id },
          data: {
            quantityUnits: existingStock.quantityUnits + diff,
          },
        });
      }
    }

    // Movement aktualisieren
    const updatedMovement = await prisma.packPlantStockMovement.update({
      where: { id: Number(id) },
      data: {
        changeUnits: newChangeUnits,
        pricePerUnitSnapshot: newPricePerUnit,
        totalPriceSnapshot: newTotalPriceSnapshot,
        comment: newComment,
      },
    });

    res.json(updatedMovement);
  } catch (err: any) {
    console.error("Fehler in PUT /api/packplant-stock-movements/:id:", err);
    res.status(500).json({
      error: "Fehler beim Aktualisieren der Inventur",
      detail: String(err.message || err),
    });
  }
});

// ▶ VARIETY QUALITY PRICES (Preise für Rohware nach Qualität Q1/Q2/UEBERGROESSE)
app.get("/api/variety-quality-prices", async (_req, res) => {
  try {
    const prices = await prisma.varietyQualityPrice.findMany({
      include: { taxRate: true },
      orderBy: [{ quality: "asc" }, { validFrom: "desc" }],
    });
    res.json(prices);
  } catch (err: any) {
    console.error("Fehler in GET /api/variety-quality-prices:", err);
    res.status(500).json({ error: "Fehler beim Laden der Qualitätspreise" });
  }
});

app.post("/api/variety-quality-prices", async (req, res) => {
  const { quality, validFrom, pricePerKg, taxRateId } = req.body;

  if (!quality || !validFrom || pricePerKg == null) {
    return res.status(400).json({
      error: "quality, validFrom und pricePerKg sind Pflichtfelder",
    });
  }

  // Validierung: quality muss Q1, Q2 oder UEBERGROESSE sein
  const validQualities = ["Q1", "Q2", "UEBERGROESSE"] as const;
  if (!validQualities.includes(quality)) {
    return res.status(400).json({
      error: "quality muss Q1, Q2 oder UEBERGROESSE sein",
    });
  }

  try {
    // Neuen Preis mit validTo = null anlegen
    const price = await prisma.varietyQualityPrice.create({
      data: {
        quality,
        validFrom: new Date(validFrom),
        validTo: null, // wird automatisch berechnet
        pricePerKg: Number(pricePerKg),
        taxRateId: req.body.taxRateId ? Number(req.body.taxRateId) : null,
      },
    });

    // validTo für alle Preise dieser Qualität neu berechnen
    await recalculateVarietyQualityPriceValidTo(quality as "Q1" | "Q2" | "UEBERGROESSE");

    // Aktualisierten Preis zurückgeben
    const updatedPrice = await prisma.varietyQualityPrice.findUnique({ where: { id: price.id } });
    res.status(201).json(updatedPrice);
  } catch (err: any) {
    console.error("Fehler in POST /api/variety-quality-prices:", err);
    res.status(500).json({
      error: "Fehler beim Anlegen des Qualitätspreises",
      detail: String(err.message || err),
    });
  }
});

app.put("/api/variety-quality-prices/:id", async (req, res) => {
  const { id } = req.params;
  const { quality, validFrom, validTo, pricePerKg, taxRateId } = req.body;

  try {
    const price = await prisma.varietyQualityPrice.update({
      where: { id: Number(id) },
      data: {
        quality: quality ?? undefined,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validTo: validTo ? new Date(validTo) : null,
        pricePerKg: pricePerKg != null ? Number(pricePerKg) : undefined,
        taxRateId: taxRateId != null ? Number(taxRateId) : null,
      },
    });

    res.json(price);
  } catch (err: any) {
    console.error("Fehler in PUT /api/variety-quality-prices/:id:", err);
    res.status(500).json({
      error: "Fehler beim Aktualisieren des Qualitätspreises",
      detail: String(err.message || err),
    });
  }
});

app.delete("/api/variety-quality-prices/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.varietyQualityPrice.delete({
      where: { id: Number(id) },
    });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("Fehler in DELETE /api/variety-quality-prices/:id:", err);
    res.status(500).json({
      error: "Fehler beim Löschen des Qualitätspreises",
      detail: String(err.message || err),
    });
  }
});

// ▶ Helper: Packbetriebs-Lager ändern + Movement anlegen (inkl. Kocheigenschaft-Snapshot + Preis-Snapshot)
async function applyPackPlantStockChange(
  packPlantId: number,
  productId: number,
  changeUnits: number,
  reason: string,
  comment?: string | null,
  pricePerUnitSnapshot?: number | null,
  totalPriceSnapshot?: number | null,
  customerSaleId?: number | null,
  packagingRunId?: number | null
) {
  console.log("applyPackPlantStockChange IN:", {
    packPlantId,
    productId,
    changeUnits,
    reason,
    pricePerUnitSnapshot,
    totalPriceSnapshot,
  });

  // Snapshots laden: Packbetrieb + Produkt
  const [packPlantSnap, productSnap, product] = await Promise.all([
    getSnapshotsForPackPlant(packPlantId),
    getSnapshotsForProduct(productId),
    prisma.product.findUnique({ where: { id: productId } }),
  ]);

  const cookingTypeSnapshot = product?.cookingType ?? null;

  const existing = await prisma.packPlantStock.findUnique({
    where: {
      packPlantId_productId: {
        packPlantId,
        productId,
      },
    },
  });

  let stockRecord;

  if (existing) {
    stockRecord = await prisma.packPlantStock.update({
      where: { id: existing.id },
      data: {
        quantityUnits: existing.quantityUnits + changeUnits,
        cookingTypeSnapshot,
        ...packPlantSnap,
        ...productSnap,
      },
    });
    console.log("PackPlantStock UPDATED:", stockRecord);
  } else {
    stockRecord = await prisma.packPlantStock.create({
      data: {
        packPlantId,
        productId,
        quantityUnits: changeUnits,
        cookingTypeSnapshot,
        ...packPlantSnap,
        ...productSnap,
      },
    });
    console.log("PackPlantStock CREATED:", stockRecord);
  }

  const movement = await prisma.packPlantStockMovement.create({
    data: {
      packPlantId,
      productId,
      changeUnits,
      reason,
      comment: comment ?? null,
      cookingTypeSnapshot,
      pricePerUnitSnapshot: pricePerUnitSnapshot ?? null,
      totalPriceSnapshot: totalPriceSnapshot ?? null,
      // Rückverfolgbarkeit: Verbindung zu CustomerSale oder PackagingRun
      customerSaleId: customerSaleId ?? null,
      packagingRunId: packagingRunId ?? null,
      ...packPlantSnap,
      ...productSnap,
    },
  });

  console.log("PackPlantStockMovement CREATED:", movement);
}

// ▶ Sortierabfall in der Packstation verbuchen
// Wird vom Frontend beim Button "Abfall verbuchen" aufgerufen.
app.post("/api/packstation/waste", async (req, res) => {
  const {
    packStationId,
    farmerId,
    varietyId,
    wasteKg,
    quantityKg,
    quantityTons,
  } = req.body;

  // Standard-Packstelle, falls nichts mitgeschickt wird
  const packStationIdNum = packStationId ? Number(packStationId) : 1;

  // Abfallmenge aus verschiedenen Feldnamen lesen (je nach altem Frontend)
  const waste =
    wasteKg != null
      ? Number(wasteKg)
      : quantityKg != null
      ? Number(quantityKg)
      : quantityTons != null
      ? Number(quantityTons)
      : null;

  if (!farmerId || !varietyId || waste == null) {
    return res.status(400).json({
      error: "farmerId, varietyId und Abfallmenge (wasteKg) sind erforderlich",
    });
  }

  try {
    console.log("PACKSTATION WASTE REQ BODY:", req.body);

    // Abfall ist eine NEGATIVE Lagerbewegung
    await applyPackStationStockChange(
      packStationIdNum,
      Number(farmerId),
      Number(varietyId),
      -waste,
      "SORTING_WASTE",
      "Sortierabfall verbucht"
    );

    const updated = await prisma.packStationStock.findUnique({
      where: {
        packStationId_farmerId_varietyId: {
          packStationId: packStationIdNum,
          farmerId: Number(farmerId),
          varietyId: Number(varietyId),
        },
      },
      include: { farmer: true, variety: true },
    });

    return res.json(updated);
  } catch (err: any) {
    console.error("Fehler in POST /api/packstation/waste:", err);
    return res
      .status(500)
      .json({ error: "Fehler beim Verbuchen des Sortierabfalls" });
  }
});

// Fallback-Route, falls das Frontend eine alte URL /api/packstation-waste nutzt
app.post("/api/packstation-waste", async (req, res) => {
  // einfach an die Haupt-Route delegieren
  (req as any).url = "/api/packstation/waste";
  app._router.handle(req, res);
});

// ▶ Packstation: Lagerstand auf 0 setzen (Inventur)
// Wird vom Frontend für "Lager auf 0 setzen" verwendet.
app.post("/api/packstation/inventory-zero", async (req, res) => {
  const { packStationId, farmerId, varietyId } = req.body;

  const packStationIdNum = packStationId ? Number(packStationId) : 1;

  if (!farmerId || !varietyId) {
    return res.status(400).json({
      error: "packStationId (optional), farmerId und varietyId sind erforderlich",
    });
  }

  try {
    // aktuellen Bestand holen
    const existing = await prisma.packStationStock.findUnique({
      where: {
        packStationId_farmerId_varietyId: {
          packStationId: packStationIdNum,
          farmerId: Number(farmerId),
          varietyId: Number(varietyId),
        },
      },
    });

    if (!existing) {
      // nichts da → nichts zu tun
      console.log(
        "INVENTORY_ZERO Packstation: kein Bestand gefunden",
        packStationIdNum,
        farmerId,
        varietyId
      );
      return res.status(200).json(null);
    }

    const current = Number(existing.quantityKg) || 0;

    // Differenz auf 0 setzen = negativer aktueller Bestand
    const diff = -current;

    await applyPackStationStockChange(
      packStationIdNum,
      Number(farmerId),
      Number(varietyId),
      diff,
      "INVENTORY_ZERO",
      "Packstations-Lager auf 0 gesetzt"
    );

    const updated = await prisma.packStationStock.findUnique({
      where: {
        packStationId_farmerId_varietyId: {
          packStationId: packStationIdNum,
          farmerId: Number(farmerId),
          varietyId: Number(varietyId),
        },
      },
      include: { farmer: true, variety: true },
    });

    return res.status(200).json(updated);
  } catch (err: any) {
    console.error("Fehler in POST /api/packstation/inventory-zero:", err);
    return res
      .status(500)
      .json({ error: "Fehler beim Setzen des Packstations-Lagers auf 0" });
  }
});

// ▶ PackagingRun – Frontend-kompatibel + Lagerverbuchung + Snapshots
app.post("/api/packaging-runs", async (req, res) => {
  const {
    date,
    productId,
    packStationId,
    farmerId,
    varietyId,
    quantityUnits,
    reserved,
    wasteKg,
    rawInputKg,
    finishedKg,
  } = req.body;

  console.log("PACKAGING RUN REQ BODY:", req.body);

  // Minimalprüfung
  if (!productId || quantityUnits == null || !farmerId || !varietyId) {
    return res.status(400).json({
      error:
        "productId, farmerId, varietyId und quantityUnits sind Pflichtfelder",
    });
  }

  const packStationIdNum = packStationId ? Number(packStationId) : 1; // Standard-Packstelle
  const farmerIdNum = Number(farmerId);
  const varietyIdNum = Number(varietyId);

  try {
    // Produkt holen (für kg pro Einheit)
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
    });

    if (!product) {
      console.error("Produkt nicht gefunden für PackagingRun:", productId);
      return res.status(400).json({ error: "Produkt nicht gefunden" });
    }

    const unitKg = Number(product.unitKg);

    // kg fertig & roh berechnen, falls Frontend nichts mitschickt
    const finishedKgValue =
      finishedKg != null
        ? Number(finishedKg)
        : unitKg * Number(quantityUnits);

    const rawInputKgValue =
      rawInputKg != null
        ? Number(rawInputKg)
        : finishedKgValue + (wasteKg != null ? Number(wasteKg) : 0);

    // Snapshots holen
    const productSnap = await getSnapshotsForProduct(Number(productId));
    const packSnap = await getSnapshotsForPackStation(packStationIdNum);
    const farmerVarSnap = await getSnapshotsForFarmerVariety(
      farmerIdNum,
      varietyIdNum
    );

    const { farmerNameSnapshot, varietyNameSnapshot } = farmerVarSnap;

    // 1) PackagingRun anlegen
    const run = await prisma.packagingRun.create({
      data: {
        date: date ? new Date(date) : new Date(),
        productId: Number(productId),
        packStationId: packStationIdNum,
        farmerId: farmerIdNum,
        varietyId: varietyIdNum,
        quantityUnits: Number(quantityUnits),
        reserved: !!reserved,
        wasteKg: wasteKg != null ? Number(wasteKg) : 0,
        rawInputKg: rawInputKgValue,
        finishedKg: finishedKgValue,
        ...productSnap,         // productNameSnapshot
        ...packSnap,            // packStationNameSnapshot
        farmerNameSnapshot,
        varietyNameSnapshot,
      },
    });

    // 2) Rohware aus Packstellen-Lager raus
    await applyPackStationStockChange(
      packStationIdNum,
      farmerIdNum,
      varietyIdNum,
      -rawInputKgValue,
      "PACKAGING_OUT",
      `Verpackung Run ${run.id}`
    );

    // 3) Fertigware in Packbetriebs-Lager rein (Einheiten) mit packagingRunId für Rückverfolgbarkeit
    await applyPackPlantStockChange(
      1, // Standard-Packbetrieb
      Number(productId),
      Number(quantityUnits),
      "PACKAGING_IN",
      `Verpackung Run ${run.id}`,
      undefined, // pricePerUnitSnapshot
      undefined, // totalPriceSnapshot
      undefined, // customerSaleId
      run.id // packagingRunId für Rückverfolgbarkeit
    );

    console.log("PACKAGING RUN CREATED + STOCK UPDATED, ID =", run.id);

    return res.status(201).json(run);
  } catch (err: any) {
    console.error("Fehler in POST /api/packaging-runs:", err);
    return res.status(500).json({
      error: "Fehler beim Erfassen des Verpackungsvorgangs",
      detail: String(err.message || err),
    });
  }
});

// ▶ Letzte Verpackungsbuchungen abrufen
app.get("/api/packaging-runs/recent", async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    
    const runs = await prisma.packagingRun.findMany({
      take: limit,
      orderBy: { date: "desc" },
      include: {
        product: true,
        farmer: true,
        variety: true,
      },
    });

    res.json(runs);
  } catch (err: any) {
    console.error("Fehler in GET /api/packaging-runs/recent:", err);
    res.status(500).json({
      error: "Fehler beim Laden der letzten Verpackungsbuchungen",
      detail: String(err.message || err),
    });
  }
});

// ▶ Letzte Abfallbuchungen abrufen
app.get("/api/packstation/waste/recent", async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    
    const movements = await prisma.packStationStockMovement.findMany({
      where: {
        reason: "SORTING_WASTE",
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        farmer: true,
        variety: true,
      },
    });

    res.json(movements);
  } catch (err: any) {
    console.error("Fehler in GET /api/packstation/waste/recent:", err);
    res.status(500).json({
      error: "Fehler beim Laden der letzten Abfallbuchungen",
      detail: String(err.message || err),
    });
  }
});

// ▶ Letzte "Auf 0"-Buchungen abrufen
app.get("/api/packstation/inventory-zero/recent", async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    
    const movements = await prisma.packStationStockMovement.findMany({
      where: {
        reason: "INVENTORY_ZERO",
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        farmer: true,
        variety: true,
      },
    });

    res.json(movements);
  } catch (err: any) {
    console.error("Fehler in GET /api/packstation/inventory-zero/recent:", err);
    res.status(500).json({
      error: "Fehler beim Laden der letzten 'Auf 0'-Buchungen",
      detail: String(err.message || err),
    });
  }
});

// ▶ UPDATE PackagingRun
app.put("/api/packaging-runs/:id", async (req, res) => {
  const { id } = req.params;
  const {
    date,
    productId,
    farmerId,
    varietyId,
    quantityUnits,
    reserved,
    wasteKg,
    rawInputKg,
    finishedKg,
  } = req.body;

  try {
    const existingRun = await prisma.packagingRun.findUnique({
      where: { id: Number(id) },
      include: { product: true },
    });

    if (!existingRun) {
      return res.status(404).json({ error: "Verpackungsbuchung nicht gefunden" });
    }

    // Neue Werte
    const newDate = date ? new Date(date) : existingRun.date;
    // WICHTIG: Wenn Werte nicht übergeben werden, behalte die bestehenden
    const newProductId = productId != null && productId !== undefined && productId !== "" ? Number(productId) : existingRun.productId;
    const newFarmerId = farmerId != null && farmerId !== undefined && farmerId !== "" ? Number(farmerId) : existingRun.farmerId;
    const newVarietyId = varietyId != null && varietyId !== undefined && varietyId !== "" ? Number(varietyId) : existingRun.varietyId;
    
    // Debug-Logging
    console.log("Backend Update Packaging Run - Eingang:", {
      id,
      productId: req.body.productId,
      farmerId: req.body.farmerId,
      varietyId: req.body.varietyId,
      newProductId,
      newFarmerId,
      newVarietyId,
      existingProductId: existingRun.productId,
      existingFarmerId: existingRun.farmerId,
      existingVarietyId: existingRun.varietyId,
    });
    const newQuantityUnits = quantityUnits != null ? Number(quantityUnits) : existingRun.quantityUnits;
    const newReserved = reserved !== undefined ? !!reserved : existingRun.reserved;
    const newWasteKg = wasteKg != null ? Number(wasteKg) : existingRun.wasteKg;

    // Produkt holen (kann sich geändert haben)
    const product = await prisma.product.findUnique({
      where: { id: newProductId },
    });

    if (!product) {
      return res.status(404).json({ error: "Produkt nicht gefunden" });
    }

    const unitKg = Number(product.unitKg);
    
    // WICHTIG: Fertigware immer neu berechnen basierend auf quantityUnits und unitKg
    // Dies stellt sicher, dass bei Colli-Änderung die Werte korrekt sind
    const calculatedFinishedKg = unitKg * newQuantityUnits;
    
    // Wenn finishedKg explizit angegeben wurde, verwende es
    // Sonst verwende die automatisch berechnete Fertigware
    const newFinishedKg = finishedKg != null && finishedKg !== undefined
      ? Number(finishedKg)
      : calculatedFinishedKg;
    
    // WICHTIG: Rohware immer neu berechnen basierend auf Fertigware + Abfall
    // Dies stellt sicher, dass die Werte konsistent sind
    const calculatedRawInputKg = newFinishedKg + newWasteKg;
    
    // Wenn rawInputKg explizit angegeben wurde, verwende es
    // Sonst verwende die automatisch berechnete Rohware
    const newRawInputKg = rawInputKg != null && rawInputKg !== undefined
      ? Number(rawInputKg)
      : calculatedRawInputKg;
    
    // Debug-Logging für Testzwecke
    console.log("Backend Update Packaging Run:", {
      id,
      newQuantityUnits,
      newWasteKg,
      newRawInputKg,
      newFinishedKg,
      calculatedRawInputKg,
      calculatedFinishedKg,
      unitKg,
    });

    // Snapshots aktualisieren, falls sich Produkt/Bauer/Sorte geändert haben
    let productSnap = {};
    let farmerVarSnap = {};
    if (newProductId !== existingRun.productId) {
      productSnap = await getSnapshotsForProduct(newProductId);
    }
    if (newFarmerId !== existingRun.farmerId || newVarietyId !== existingRun.varietyId) {
      const fullFarmerVarSnap = await getSnapshotsForFarmerVariety(newFarmerId, newVarietyId);
      // Nur die Felder verwenden, die im PackagingRun Schema existieren
      farmerVarSnap = {
        farmerNameSnapshot: fullFarmerVarSnap.farmerNameSnapshot,
        varietyNameSnapshot: fullFarmerVarSnap.varietyNameSnapshot,
      };
    }

    // 1) Alte Lagerbewegungen rückgängig machen
    // Alte Rohware zurück ins Packstellen-Lager
    await applyPackStationStockChange(
      existingRun.packStationId,
      existingRun.farmerId,
      existingRun.varietyId,
      Number(existingRun.rawInputKg),
      "PACKAGING_OUT_CORRECTION",
      `Korrektur Verpackung Run #${id}`
    );

    // Alte Fertigware aus Packbetriebs-Lager raus
    await applyPackPlantStockChange(
      1,
      existingRun.productId,
      -Number(existingRun.quantityUnits),
      "PACKAGING_IN_CORRECTION",
      `Korrektur Verpackung Run #${id}`
    );

    // 2) PackagingRun aktualisieren
    // WICHTIG: Prisma akzeptiert beim UPDATE NICHT die direkten IDs, sondern die Relation-Syntax
    // CREATE: productId: 1
    // UPDATE: product: { connect: { id: 1 } }
    const updateData: any = {
      date: newDate,
      quantityUnits: newQuantityUnits,
      reserved: newReserved,
      wasteKg: newWasteKg,
      rawInputKg: newRawInputKg,
      finishedKg: newFinishedKg,
      ...productSnap,
      ...farmerVarSnap,
    };
    
    // Relationen mit connect-Syntax aktualisieren
    if (newProductId !== existingRun.productId) {
      updateData.product = { connect: { id: newProductId } };
    }
    if (newFarmerId !== existingRun.farmerId) {
      updateData.farmer = { connect: { id: newFarmerId } };
    }
    if (newVarietyId !== existingRun.varietyId) {
      updateData.variety = { connect: { id: newVarietyId } };
    }
    
    console.log("Update Data:", JSON.stringify(updateData, null, 2));
    console.log("Existing Run:", {
      productId: existingRun.productId,
      farmerId: existingRun.farmerId,
      varietyId: existingRun.varietyId,
    });
    console.log("New IDs:", {
      newProductId,
      newFarmerId,
      newVarietyId,
    });
    
    const updatedRun = await prisma.packagingRun.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // 3) Neue Lagerbewegungen verbuchen
    // Neue Rohware aus Packstellen-Lager raus
    await applyPackStationStockChange(
      existingRun.packStationId,
      newFarmerId,
      newVarietyId,
      -newRawInputKg,
      "PACKAGING_OUT",
      `Verpackung Run ${id}`
    );

    // Neue Fertigware in Packbetriebs-Lager rein
    // WICHTIG: Verwende das neue Produkt, falls es sich geändert hat
    await applyPackPlantStockChange(
      1,
      newProductId,
      newQuantityUnits,
      "PACKAGING_IN",
      `Verpackung Run ${id}`
    );

    res.json(updatedRun);
  } catch (err: any) {
    console.error("Fehler in PUT /api/packaging-runs/:id:", err);
    res.status(500).json({
      error: "Fehler beim Aktualisieren der Verpackungsbuchung",
      detail: String(err.message || err),
    });
  }
});

// ▶ UPDATE PackStationStockMovement (Abfall)
app.put("/api/packstation/waste/:id", async (req, res) => {
  const { id } = req.params;
  const { changeKg, comment } = req.body;

  try {
    const existingMovement = await prisma.packStationStockMovement.findUnique({
      where: { id: Number(id) },
      include: { farmer: true, variety: true },
    });

    if (!existingMovement || existingMovement.reason !== "SORTING_WASTE") {
      return res.status(404).json({ error: "Abfallbuchung nicht gefunden" });
    }

    const existingChangeKg = Number(existingMovement.changeKg);
    const newChangeKg = changeKg != null ? Number(changeKg) : existingChangeKg;
    const newComment = comment !== undefined ? comment : existingMovement.comment;

    // Differenz berechnen (Abfall ist negativ)
    const diff = newChangeKg - existingChangeKg;

    // Lager korrigieren
    if (diff !== 0) {
      const existingStock = await prisma.packStationStock.findUnique({
        where: {
          packStationId_farmerId_varietyId: {
            packStationId: existingMovement.packStationId,
            farmerId: existingMovement.farmerId,
            varietyId: existingMovement.varietyId,
          },
        },
      });

      if (existingStock) {
        await prisma.packStationStock.update({
          where: { id: existingStock.id },
          data: {
            quantityKg: Number(existingStock.quantityKg) - diff,
          },
        });
      }
    }

    // Movement aktualisieren
    const updatedMovement = await prisma.packStationStockMovement.update({
      where: { id: Number(id) },
      data: {
        changeKg: newChangeKg,
        comment: newComment,
      },
    });

    res.json(updatedMovement);
  } catch (err: any) {
    console.error("Fehler in PUT /api/packstation/waste/:id:", err);
    res.status(500).json({
      error: "Fehler beim Aktualisieren der Abfallbuchung",
      detail: String(err.message || err),
    });
  }
});

// ▶ UPDATE PackStationStockMovement (Auf 0)
app.put("/api/packstation/inventory-zero/:id", async (req, res) => {
  const { id } = req.params;
  const { comment, stockKg } = req.body;

  try {
    const existingMovement = await prisma.packStationStockMovement.findUnique({
      where: { id: Number(id) },
      include: { farmer: true, variety: true },
    });

    if (!existingMovement || existingMovement.reason !== "INVENTORY_ZERO") {
      return res.status(404).json({ error: "'Auf 0'-Buchung nicht gefunden" });
    }

    const newComment = comment !== undefined ? comment : existingMovement.comment;

    // Wenn stockKg angegeben wurde, muss die alte Buchung rückgängig gemacht werden
    // und eine neue Buchung mit dem neuen Lagerstand erstellt werden
    if (stockKg != null && stockKg !== undefined) {
      const newStockKg = Number(stockKg);
      if (!Number.isFinite(newStockKg) || newStockKg < 0) {
        return res.status(400).json({ error: "Ungültiger Lagerstand" });
      }

      // WICHTIG: Wir müssen den aktuellen Lagerstand ermitteln
      // Der aktuelle Lagerstand kann sich durch andere Bewegungen geändert haben
      const currentStock = await prisma.packStationStock.findUnique({
        where: {
          packStationId_farmerId_varietyId: {
            packStationId: existingMovement.packStationId,
            farmerId: existingMovement.farmerId,
            varietyId: existingMovement.varietyId,
          },
        },
      });

      const currentStockKg = currentStock ? Number(currentStock.quantityKg) : 0;

      // Die ursprüngliche "Auf 0"-Buchung hatte changeKg = -ursprünglicherLagerstand
      // Das bedeutet: originalStock → 0 (changeKg = -originalStock)
      const originalStock = -Number(existingMovement.changeKg); // changeKg war negativ

      // 1) Alte Buchung rückgängig machen: Lagerstand zurück auf ursprünglichen Wert
      // Aktuell: currentStockKg (z.B. 3 kg)
      // Nach Rückgängigmachen: currentStockKg + originalStock (z.B. 3 + 100 = 103 kg)
      await applyPackStationStockChange(
        existingMovement.packStationId,
        existingMovement.farmerId,
        existingMovement.varietyId,
        originalStock, // Positive Änderung = Lagerstand zurück auf ursprünglichen Wert
        "INVENTORY_ZERO_CORRECTION",
        `Korrektur 'Auf 0'-Buchung #${id} - Rückgängigmachen`
      );

      // 2) Neue Buchung erstellen: Von (currentStockKg + originalStock) auf newStockKg
      // Nach Schritt 1: currentStockKg + originalStock
      // Ziel: newStockKg
      // changeKg = newStockKg - (currentStockKg + originalStock)
      const stockAfterCorrection = currentStockKg + originalStock;
      const changeToNewStock = newStockKg - stockAfterCorrection;
      
      console.log("Korrektur 'Auf 0'-Buchung:", {
        currentStockKg,
        originalStock,
        stockAfterCorrection,
        newStockKg,
        changeToNewStock,
      });
      
      await applyPackStationStockChange(
        existingMovement.packStationId,
        existingMovement.farmerId,
        existingMovement.varietyId,
        changeToNewStock, // Änderung von stockAfterCorrection auf newStockKg
        "INVENTORY_CORRECTION",
        newComment || `Lagerstand auf ${newStockKg} kg korrigiert`
      );

      // 3) Alte Movement aktualisieren (Kommentar)
      const updatedMovement = await prisma.packStationStockMovement.update({
        where: { id: Number(id) },
        data: {
          comment: newComment,
        },
      });

      return res.json(updatedMovement);
    } else {
      // Nur Kommentar aktualisieren, Lagerstand bleibt unverändert
      const updatedMovement = await prisma.packStationStockMovement.update({
        where: { id: Number(id) },
        data: {
          comment: newComment,
        },
      });

      return res.json(updatedMovement);
    }
  } catch (err: any) {
    console.error("Fehler in PUT /api/packstation/inventory-zero/:id:", err);
    res.status(500).json({
      error: "Fehler beim Aktualisieren der 'Auf 0'-Buchung",
      detail: String(err.message || err),
    });
  }
});

// ▶ DeliveryPlan: Import (z.B. aus Excel-Datei vorbereitet im Frontend)

// CSV in Zeilen-Objekte zerlegen (Header = Spaltennamen)
function parsePlanmengenCsv(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV hat zu wenig Zeilen (mindestens Header + 1 Datenzeile erforderlich)");
  }

  // erste Zeile = Header
  // Unterstützt sowohl Semikolon- als auch Komma-getrennte CSV
  const header = lines[0].split(/[;,]/).map((h) => h.trim());

  // Erwartete Spalten prüfen (case-insensitive)
  const requiredColumns = ["farmerId", "year", "week", "cookingType", "plannedKg"];
  const headerLower = header.map(h => h.toLowerCase());
  const missingColumns = requiredColumns.filter(col => !headerLower.includes(col.toLowerCase()));
  if (missingColumns.length > 0) {
    throw new Error(`CSV-Header fehlt erforderliche Spalten: ${missingColumns.join(", ")}. Gefunden: ${header.join(", ")}`);
  }

  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Unterstützt sowohl Semikolon- als auch Komma-getrennte CSV
    const cols = line.split(/[;,]/).map((c) => c.trim());
    
    if (cols.length !== header.length) {
      console.warn(`Zeile ${i + 1} hat ${cols.length} Spalten, erwartet ${header.length}. Überspringe Zeile.`);
      continue;
    }
    
    const obj: any = {};
    header.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });
    
    // Nur Zeilen mit gültigen Daten hinzufügen (nicht komplett leer)
    // Die CSV hat bereits die richtigen Spaltennamen (farmerId, year, week, cookingType, plannedKg)
    if (obj.farmerId || obj.year || obj.week) {
      rows.push(obj);
    }
  }

  if (rows.length === 0) {
    throw new Error("CSV enthält keine gültigen Datenzeilen");
  }

  return rows;
}

// Gemeinsamer Helfer: beliebige Zeilen (JSON oder CSV) in DeliveryPlan upserten
async function importDeliveryPlanRows(rawRows: any[]) {
  // Zahlen & Kochtyp normalisieren, Komma-Zahlen erlauben
  const rows = rawRows.map((r) => ({
    farmerId: Number(r.farmerId),
    year: Number(r.year),
    week: Number(r.week),
    cookingType: String(r.cookingType).trim() as
      | "FESTKOCHEND"
      | "VORWIEGEND_FESTKOCHEND"
      | "MEHLIG",
    plannedKg:
      r.plannedKg != null
        ? Number(String(r.plannedKg).replace(",", "."))
        : NaN,
  }));

  // Alle betroffenen Bauern IDs sammeln, damit wir Farmer-Namen für Snapshots laden können
  const farmerIds = Array.from(
    new Set(
      rows
        .map((r) => Number(r.farmerId))
        .filter((id) => Number.isFinite(id))
    )
  );

  const farmers = await prisma.farmer.findMany({
    where: { id: { in: farmerIds } },
  });

  const farmerMap = new Map<number, (typeof farmers)[number]>();
  for (const f of farmers) {
    farmerMap.set(f.id, f);
  }

  // Prüfe, welche farmerIds fehlen
  const missingFarmerIds = farmerIds.filter(id => !farmerMap.has(id));
  if (missingFarmerIds.length > 0) {
    console.warn(`⚠️  Warnung: Folgende farmerIds existieren nicht in der Datenbank: ${missingFarmerIds.join(", ")}`);
    console.warn(`   Verfügbare farmerIds in der Datenbank: ${farmers.map(f => f.id).join(", ") || "keine"}`);
  }

  const imported: any[] = [];
  const errors: any[] = [];

  for (const [index, raw] of rows.entries()) {
    const farmerId = Number(raw.farmerId);
    const year = Number(raw.year);
    const week = Number(raw.week);
    const cookingType = raw.cookingType;
    const plannedKg =
      raw.plannedKg != null
        ? Number(raw.plannedKg)
        : NaN;

    if (
      !farmerId ||
      !Number.isFinite(year) ||
      !Number.isFinite(week) ||
      !cookingType ||
      !Number.isFinite(plannedKg)
    ) {
      errors.push({
        index: index + 1, // 1-basiert für bessere Lesbarkeit
        raw,
        error:
          "farmerId, year, week, cookingType und plannedKg müssen gültig sein",
      });
      continue;
    }

    // Prüfe, ob Farmer existiert
    const farmer = farmerMap.get(farmerId);
    if (!farmer) {
      errors.push({
        index: index + 1,
        raw,
        error: `Farmer mit ID ${farmerId} existiert nicht in der Datenbank`,
      });
      continue;
    }

    const farmerNameSnapshot = farmer.name;

    try {
      const plan = await prisma.deliveryPlan.upsert({
        where: {
          farmerId_year_week_cookingType: {
            farmerId,
            year,
            week,
            cookingType,
          },
        },
        update: {
          plannedKg,
          farmerNameSnapshot,
        },
        create: {
          farmerId,
          year,
          week,
          cookingType,
          plannedKg,
          farmerNameSnapshot,
        },
      });

      imported.push(plan);
    } catch (e: any) {
      console.error("Fehler bei DeliveryPlan upsert:", e);
      errors.push({
        index,
        raw,
        error: String(e.message || e),
      });
    }
  }

  return {
    importedCount: imported.length,
    errorCount: errors.length,
    imported,
    errors,
  };
}

// JSON-Import (z.B. wenn das Frontend direkt rows schickt)
app.post("/api/delivery-plans/import", async (req, res) => {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({
      error: "rows muss ein nicht-leeres Array sein",
    });
  }

  try {
    const result = await importDeliveryPlanRows(rows);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Fehler in POST /api/delivery-plans/import:", err);
    return res.status(500).json({
      error: "Fehler beim Import der Planmengen",
      detail: String(err.message || err),
    });
  }
});

// CSV-Import: liest planmengen.csv aus dem Projekt-Root
app.post("/api/delivery-plans/import-from-csv", async (_req, res) => {
  try {
    // planmengen.csv im Projekt-Root (ein Verzeichnis über src/)
    // process.cwd() zeigt auf das Verzeichnis, von dem aus der Server gestartet wurde
    // Falls der Server aus src/ gestartet wird, müssen wir ein Verzeichnis nach oben
    const projectRoot = process.cwd().endsWith("/src") 
      ? path.resolve(process.cwd(), "..")
      : process.cwd();
    const csvPath = path.resolve(projectRoot, "planmengen.csv");
    
    console.log(`Suche planmengen.csv in: ${csvPath}`);
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({
        error: `Datei planmengen.csv nicht gefunden unter ${csvPath}`,
        hint: "Bitte stelle sicher, dass die Datei im Projekt-Root liegt.",
      });
    }

    const csvText = await fs.promises.readFile(csvPath, "utf8");
    console.log(`CSV-Datei gelesen, ${csvText.length} Zeichen`);
    
    const rawRows = parsePlanmengenCsv(csvText);
    console.log(`CSV geparst, ${rawRows.length} Zeilen gefunden`);

    if (rawRows.length === 0) {
      return res.status(400).json({
        error: "CSV-Datei enthält keine Datenzeilen",
      });
    }

    // Prüfe, ob überhaupt Farmer in der Datenbank existieren
    const farmerCount = await prisma.farmer.count();
    if (farmerCount === 0) {
      return res.status(400).json({
        error: "Keine Farmer in der Datenbank gefunden",
        hint: "Bitte lege zuerst Farmer an, bevor du Planmengen importierst. Die CSV-Datei verweist auf farmerIds, die in der Datenbank existieren müssen.",
        farmerIdsInCsv: Array.from(new Set(rawRows.map((r: any) => r.farmerId || r.farmerid))).filter(Boolean),
      });
    }

    const result = await importDeliveryPlanRows(rawRows);
    console.log(`Import abgeschlossen: ${result.importedCount} importiert, ${result.errorCount} Fehler`);

    return res.status(200).json(result);
  } catch (err: any) {
    console.error(
      "Fehler in POST /api/delivery-plans/import-from-csv:",
      err
    );
    return res.status(500).json({
      error: "Fehler beim Import der Planmengen aus CSV",
      detail: String(err.message || err),
    });
  }
});

// ▶ DeliveryPlan: Einzelne Planmenge erstellen/aktualisieren
app.post("/api/delivery-plans/upsert", async (req, res) => {
  const { farmerId, year, week, cookingType, plannedKg } = req.body;

  if (!farmerId || !year || !cookingType || plannedKg == null) {
    return res.status(400).json({
      error: "farmerId, year, cookingType und plannedKg sind Pflichtfelder. week ist optional (dann Monats-Aufteilung).",
    });
  }

  const farmerIdNum = Number(farmerId);
  const yearNum = Number(year);
  const plannedKgNum = Number(String(plannedKg).replace(",", "."));

  if (!Number.isFinite(yearNum) || !Number.isFinite(plannedKgNum)) {
    return res.status(400).json({
      error: "year und plannedKg müssen gültige Zahlen sein",
    });
  }

  const validCookingTypes = ["FESTKOCHEND", "VORWIEGEND_FESTKOCHEND", "MEHLIG"];
  if (!validCookingTypes.includes(cookingType)) {
    return res.status(400).json({
      error: "cookingType muss FESTKOCHEND, VORWIEGEND_FESTKOCHEND oder MEHLIG sein",
    });
  }

  try {
    // Farmer laden für Snapshot
    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerIdNum },
    });

    if (!farmer) {
      return res.status(404).json({ error: "Bauer nicht gefunden" });
    }

    const farmerNameSnapshot = farmer.name;

    // Wenn week angegeben: nur diese Woche updaten
    if (week != null && week !== "" && week !== "all") {
      const weekNum = Number(week);
      if (!Number.isFinite(weekNum) || weekNum < 1 || weekNum > 53) {
        return res.status(400).json({
          error: "week muss eine Zahl zwischen 1 und 53 sein",
        });
      }

      const plan = await prisma.deliveryPlan.upsert({
        where: {
          farmerId_year_week_cookingType: {
            farmerId: farmerIdNum,
            year: yearNum,
            week: weekNum,
            cookingType: cookingType as any,
          },
        },
        update: {
          plannedKg: plannedKgNum,
          farmerNameSnapshot,
        },
        create: {
          farmerId: farmerIdNum,
          year: yearNum,
          week: weekNum,
          cookingType: cookingType as any,
          plannedKg: plannedKgNum,
          farmerNameSnapshot,
        },
      });

      return res.status(200).json({
        message: `Planmenge für KW ${weekNum} gespeichert`,
        plans: [plan],
      });
    }

    // Wenn Monat angegeben: auf Kalenderwochen dieses Monats aufteilen
    const { month } = req.body;
    if (month != null && month !== "") {
      const monthNum = Number(month);
      if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          error: "month muss eine Zahl zwischen 1 und 12 sein",
        });
      }

      // Kalenderwochen im Monat ermitteln
      const weeksInMonth = getWeeksInMonth(yearNum, monthNum);
      const weekCount = weeksInMonth.length;

      if (weekCount === 0) {
        return res.status(400).json({
          error: "Keine Kalenderwochen für diesen Monat gefunden",
        });
      }

      // Menge gleichmäßig auf die Wochen aufteilen
      const kgPerWeek = plannedKgNum / weekCount;

      const plans: any[] = [];
      for (const weekNum of weeksInMonth) {
        const plan = await prisma.deliveryPlan.upsert({
          where: {
            farmerId_year_week_cookingType: {
              farmerId: farmerIdNum,
              year: yearNum,
              week: weekNum,
              cookingType: cookingType as any,
            },
          },
          update: {
            plannedKg: kgPerWeek,
            farmerNameSnapshot,
          },
          create: {
            farmerId: farmerIdNum,
            year: yearNum,
            week: weekNum,
            cookingType: cookingType as any,
            plannedKg: kgPerWeek,
            farmerNameSnapshot,
          },
        });
        plans.push(plan);
      }

      return res.status(200).json({
        message: `Planmenge auf ${weekCount} Wochen im Monat ${monthNum} aufgeteilt (${kgPerWeek.toFixed(2)} kg/Woche)`,
        plans,
      });
    }

    return res.status(400).json({
      error: "Entweder week oder month muss angegeben werden",
    });
  } catch (err: any) {
    console.error("Fehler in POST /api/delivery-plans/upsert:", err);
    return res.status(500).json({
      error: "Fehler beim Speichern der Planmenge",
      detail: String(err.message || err),
    });
  }
});

// Hilfsfunktion: Kalenderwochen eines Monats ermitteln (ISO-Wochen)
function getWeeksInMonth(year: number, month: number): number[] {
  const weeks = new Set<number>();
  
  // Ersten und letzten Tag des Monats
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  // Durch jeden Tag des Monats iterieren und KW sammeln
  const current = new Date(firstDay);
  while (current <= lastDay) {
    const week = getISOWeek(current);
    weeks.add(week);
    current.setDate(current.getDate() + 1);
  }
  
  return Array.from(weeks).sort((a, b) => a - b);
}

// ISO-Kalenderwoche berechnen
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ▶ DeliveryPlan: Lesen / Filtern
app.get("/api/delivery-plans", async (req, res) => {
  const { year, farmerId, cookingType, weekFrom, weekTo } = req.query;

  if (!year) {
    return res.status(400).json({ error: "year ist erforderlich" });
  }

  const where: any = {
    year: Number(year),
  };

  if (farmerId) {
    where.farmerId = Number(farmerId);
  }

  if (cookingType) {
    where.cookingType = String(cookingType);
  }

  if (weekFrom || weekTo) {
    where.week = {};
    if (weekFrom) {
      where.week.gte = Number(weekFrom);
    }
    if (weekTo) {
      where.week.lte = Number(weekTo);
    }
  }

  try {
    const plans = await prisma.deliveryPlan.findMany({
      where,
      include: {
        farmer: true,
      },
      orderBy: [
        { year: "asc" },
        { week: "asc" },
        { farmerId: "asc" },
        { cookingType: "asc" },
      ],
    });

    res.json(plans);
  } catch (err: any) {
    console.error("Fehler in GET /api/delivery-plans:", err);
    res.status(500).json({
      error: "Fehler beim Laden der Planmengen",
      detail: String(err.message || err),
    });
  }
});

// ▶ Admin: User anlegen (einfach, nur Login-Daten)
app.post("/api/admin/users/simple-create", async (req, res) => {
  console.log("POST /api/admin/users/simple-create - Request Body:", req.body);
  
  // Trim alle Eingaben
  const name = req.body.name?.trim();
  const email = req.body.email?.trim();
  const password = req.body.password?.trim();
  const role = req.body.role?.trim();

  console.log("Nach Trim:", { name, email, password: password ? "***" : "", role });

  // Validierung
  if (!name || !email || !password || !role) {
    const missing: string[] = [];
    if (!name) missing.push("name");
    if (!email) missing.push("email");
    if (!password) missing.push("password");
    if (!role) missing.push("role");
    console.log("Validierung fehlgeschlagen - fehlende Felder:", missing);
    return res.status(400).json({
      error: `Pflichtfelder fehlen: ${missing.join(", ")}`,
    });
  }

  // Validiere E-Mail-Format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log("E-Mail-Format ungültig:", email);
    return res.status(400).json({ error: "Ungültiges E-Mail-Format" });
  }

  // Validiere Rolle
  const validRoles = ["EG_ADMIN", "ORGANISATOR", "PACKSTELLE", "PACKBETRIEB"];
  if (!validRoles.includes(role)) {
    console.log("Ungültige Rolle:", role);
    return res.status(400).json({
      error: `Ungültige Rolle "${role}". Erlaubt: ${validRoles.join(", ")}`,
    });
  }

  // Prüfe, ob E-Mail bereits existiert
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("E-Mail bereits vorhanden:", email);
      return res.status(400).json({
        error: `E-Mail-Adresse "${email}" wird bereits verwendet`,
      });
    }

    // Passwort hashen
    console.log("Erstelle User...");
    const passwordHash = await bcrypt.hash(password, 10);

    // User erstellen
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash, // Als Hash speichern
        role,
      },
    });

    console.log("User erfolgreich erstellt:", { id: newUser.id, email: newUser.email, role: newUser.role });

    res.status(201).json({
      success: true,
      message: "User wurde erfolgreich angelegt",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err: any) {
    console.error("Fehler in POST /api/admin/users/simple-create:", err);
    return res.status(500).json({
      error: "Fehler beim Anlegen des Users",
      detail: String(err.message || err),
    });
  }
});

// ▶ Admin: Passwort für User zurücksetzen
app.post("/api/admin/users/:userId/reset-password", async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.trim().length === 0) {
    return res.status(400).json({
      error: "newPassword ist erforderlich und darf nicht leer sein",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return res.status(404).json({
        error: "User nicht gefunden",
      });
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

    // Passwort aktualisieren
    await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        password: passwordHash,
      },
    });

    console.log(`Passwort für User ${userId} (${user.email}) wurde zurückgesetzt`);

    res.json({
      success: true,
      message: `Passwort für ${user.name} (${user.email}) wurde erfolgreich zurückgesetzt`,
    });
  } catch (err: any) {
    console.error("Fehler in POST /api/admin/users/:userId/reset-password:", err);
    return res.status(500).json({
      error: "Fehler beim Zurücksetzen des Passworts",
      detail: String(err.message || err),
    });
  }
});

// ▶ Tax Rates
app.get("/api/tax-rates", async (_req, res) => {
  try {
    const taxRates = await prisma.taxRate.findMany({
      where: {
        OR: [
          { validTo: null },
          { validTo: { gte: new Date() } },
        ],
      },
      orderBy: { ratePercent: "asc" },
    });
    res.json(taxRates);
  } catch (err: any) {
    console.error("Fehler in GET /api/tax-rates:", err);
    res.status(500).json({
      error: "Fehler beim Laden der Steuersätze",
      detail: String(err.message || err),
    });
  }
});

app.post("/api/tax-rates", async (req, res) => {
  const { name, ratePercent, description, validFrom, validTo } = req.body;
  
  if (!name || ratePercent === undefined) {
    return res.status(400).json({ error: "name und ratePercent sind erforderlich" });
  }

  try {
    const taxRate = await prisma.taxRate.create({
      data: {
        name,
        ratePercent: Number(ratePercent),
        description: description || null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validTo: validTo ? new Date(validTo) : null,
      },
    });
    res.status(201).json(taxRate);
  } catch (err: any) {
    console.error("Fehler in POST /api/tax-rates:", err);
    res.status(500).json({
      error: "Fehler beim Anlegen des Steuersatzes",
      detail: String(err.message || err),
    });
  }
});

// ▶ Auth: sehr einfacher Login (wie vorher)
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email und password erforderlich" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { farmer: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Ungültige Zugangsdaten" });
    }

    // Unterstütze sowohl Klartext (alte User) als auch bcrypt (neue User)
    let passwordValid = false;
    if (user.password.startsWith("$2")) {
      // bcrypt Hash (beginnt mit $2)
      passwordValid = await bcrypt.compare(password, user.password);
    } else {
      // Klartext (alte User)
      passwordValid = user.password === password;
    }

    if (!passwordValid) {
      return res.status(401).json({ error: "Ungültige Zugangsdaten" });
    }

    // Wenn User ein FARMER ist, aber farmerId fehlt, versuche Farmer über E-Mail zu finden
    let finalFarmerId = user.farmerId;
    if (user.role === "FARMER" && !finalFarmerId) {
      console.log(`⚠️ User ${user.id} (${user.email}) ist FARMER, aber farmerId ist null. Suche Farmer über E-Mail...`);
      
      // Versuche Farmer über E-Mail zu finden
      const farmerByEmail = await (prisma as any).farmer.findUnique({
        where: { email: user.email },
      });
      
      if (farmerByEmail) {
        console.log(`✅ Farmer gefunden über E-Mail: ${farmerByEmail.id} (${farmerByEmail.name})`);
        // Verknüpfe User mit Farmer
        await prisma.user.update({
          where: { id: user.id },
          data: { farmerId: farmerByEmail.id },
        });
        finalFarmerId = farmerByEmail.id;
      } else {
        // Fallback: Versuche Farmer über Name zu finden
        const farmerByName = await (prisma as any).farmer.findFirst({
          where: { name: user.name },
        });
        
        if (farmerByName) {
          console.log(`✅ Farmer gefunden über Name: ${farmerByName.id} (${farmerByName.name})`);
          // Verknüpfe User mit Farmer
          await prisma.user.update({
            where: { id: user.id },
            data: { farmerId: farmerByName.id },
          });
          finalFarmerId = farmerByName.id;
        } else {
          console.warn(`⚠️ Kein Farmer gefunden für User ${user.id} (${user.email}, ${user.name})`);
        }
      }
    }

    res.json({
      id: user.id,
      name: user.name,
      role: user.role,
      farmerId: finalFarmerId,
    });
  } catch (err) {
    console.error("Fehler bei /api/auth/login:", err);
    res.status(500).json({ error: "Login-Fehler" });
  }
});

// ▶ Tax Rates initial befüllen
async function ensureTaxRates() {
  const standardRates = [
    { 
      name: "Ermäßigter Steuersatz (10%)", 
      ratePercent: 10.0, 
      description: "Ermäßigter Steuersatz für bestimmte Waren und Dienstleistungen wie Lebensmittel, Bücher, Zeitungen, Personenbeförderung und Vermietung zu Wohnzwecken",
      validFrom: new Date("1984-01-01")
    },
    { 
      name: "Ermäßigter Steuersatz (13%)", 
      ratePercent: 13.0, 
      description: "Ermäßigter Steuersatz für bestimmte Umsätze, darunter die Beherbergung in eingerichteten Wohn- und Schlafräumen, die Vermietung von Grundstücken für Campingzwecke und die regelmäßig damit verbundenen Nebenleistungen. Pauschalierter Landwirt gem. §22 UStG",
      validFrom: new Date("2016-01-01")
    },
    { 
      name: "Normalsteuersatz (20%)", 
      ratePercent: 20.0, 
      description: "Normalsteuersatz für die meisten Waren und Dienstleistungen. Gilt auch für Dienstleistungen wie Abpackkosten",
      validFrom: new Date("1984-01-01")
    },
  ];

  for (const rate of standardRates) {
    // Prüfe, ob bereits ein TaxRate mit diesem Namen existiert
    const existing = await prisma.taxRate.findFirst({
      where: { name: rate.name },
    });

    if (existing) {
      // Aktualisiere bestehenden Eintrag
      await prisma.taxRate.update({
        where: { id: existing.id },
        data: {
          ratePercent: rate.ratePercent,
          description: rate.description,
          validFrom: rate.validFrom,
        },
      });
    } else {
      // Erstelle neuen Eintrag
      await prisma.taxRate.create({
        data: {
          name: rate.name,
          ratePercent: rate.ratePercent,
          description: rate.description,
          validFrom: rate.validFrom,
        },
      });
    }
  }
}

// Error Handler für unhandled exceptions - verhindert Server-Crashes
process.on("uncaughtException", (error: Error) => {
  console.error("❌ Uncaught Exception:", error);
  console.error("Stack:", error.stack);
  // Server nicht beenden, sondern weiterlaufen lassen (Railway wird automatisch neu starten)
});

process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("❌ Unhandled Rejection:", reason);
  console.error("Promise:", promise);
  // Server nicht beenden, sondern weiterlaufen lassen
});

// Graceful Shutdown Handler
process.on("SIGTERM", async () => {
  console.log("SIGTERM empfangen, beende Server...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT empfangen, beende Server...");
  await prisma.$disconnect();
  process.exit(0);
});

// Serverstart
(async () => {
  try {
    // Teste Datenbankverbindung
    await prisma.$connect();
    console.log("✓ Datenbankverbindung erfolgreich");
    
    // In Production: Initial Data und Tax Rates nur wenn nötig
    // (kann beim ersten Start länger dauern)
    try {
      await syncUserSequence(); // Synchronisiere User-ID-Sequenz zuerst
      await ensureInitialData();
      await ensureTaxRates();
    } catch (initError: any) {
      console.warn("⚠️ Warnung beim Initialisieren der Daten:", initError.message);
      // Nicht beenden, Server kann trotzdem laufen
    }
    
    const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
    const HOST = process.env.HOST || "0.0.0.0"; // Höre auf allen Interfaces für Netzwerkzugriff
    app.listen(PORT, HOST, () => {
      console.log(`✅ Server läuft auf http://${HOST}:${PORT}`);
      console.log(`✅ Health Check verfügbar unter: http://${HOST}:${PORT}/api/health`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Server erreichbar im Netzwerk über: http://${getLocalIP()}:${PORT}`);
      }
    });
  } catch (error: any) {
    console.error("❌ Fehler beim Serverstart:", error);
    console.error("Fehlerdetails:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
})();

// Hilfsfunktion zur Ermittlung der lokalen IP-Adresse
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // IPv4 und nicht localhost
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}
