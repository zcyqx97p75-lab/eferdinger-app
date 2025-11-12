import "dotenv/config"; // .env laden
import express from "express";
import cors from "cors";
import { PrismaClient, OrderStatus } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
// === Organisator-User beim Start sicherstellen ===
async function ensureOrganisatorUser() {
  const email = "ewald.mayr@gemuese-mayr.at";
  const password = "12345"; // nur zum Testen!

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "Ewald Mayr",
      role: "ORGANISATOR", // exakt wie im Prisma-Enum
      password,            // Feldname wie in schema.prisma
    },
    create: {
      email,
      name: "Ewald Mayr",
      role: "ORGANISATOR",
      password,
    },
  });

  console.log("Organisator-User vorhanden/angelegt:", email);
}

// >>> Aufruf (Name exakt gleich wie oben!)
ensureOrganisatorUser().catch(console.error);
async function applyFarmerStockChange(
  farmerId: number,
  productId: number,
  changeKg: number,          // wir arbeiten in kg
  reason: string,
  refDeliveryId?: number
) {
  // 1) Bewegung protokollieren
  await prisma.farmerStockMovement.create({
    data: {
      farmerId,
      productId,
      changeTons: changeKg,   // Feldname bleibt so, Inhalt ist kg
      reason,
      refDeliveryId: refDeliveryId ?? null,
    },
  });

  // 2) aktuellen Bestand holen oder anlegen
  const existing = await prisma.farmerStock.findUnique({
    where: { farmerId_productId: { farmerId, productId } },
  });

  if (existing) {
    // quantityTons kommt als Decimal/String → sicher in number umwandeln
    const current = Number(existing.quantityTons) || 0;
    const updated = current + changeKg;  // echte Zahlen-Addition

    await prisma.farmerStock.update({
      where: { id: existing.id },
      data: {
        quantityTons: updated,
      },
    });
  } else {
    // erster Eintrag: einfach den übergebenen Wert speichern
    await prisma.farmerStock.create({
      data: {
        farmerId,
        productId,
        quantityTons: changeKg,
      },
    });
  }
}
app.use(cors());
app.use(express.json());

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * BAUERN
 */
app.get("/api/farmers", async (_req, res) => {
  const farmers = await prisma.farmer.findMany();
  res.json(farmers);
});

app.post("/api/farmers", async (req, res) => {
  const { name, farmName, contactInfo } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name ist erforderlich" });
  }

  const farmer = await prisma.farmer.create({
    data: { name, farmName, contactInfo },
  });

  res.status(201).json(farmer);
});

/**
 * PRODUKTE
 */
app.get("/api/products", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { variety: true },
      orderBy: { id: "asc" },
    });

    // Map für dein Frontend (cookingType kommt aus Variety)
    const mapped = products.map((p) => ({
      id: p.id,
      name: p.name,                           // Sorten-/Produktname
      cookingType: p.variety?.cookingType ?? null,
      packagingType: p.packagingType ?? null, // optional
      productNumber: p.productNumber ?? null,
      // interne Felder falls später gebraucht:
      unitKg: p.unitKg,
      unitsPerCrate: p.unitsPerCrate ?? null,
      cratesPerPallet: p.cratesPerPallet ?? null,
      varietyId: p.varietyId,
      varietyName: p.variety?.name ?? null,
    }));

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Laden der Produkte" });
  }
});
app.post("/api/products", async (req, res) => {
  const {
    name,               // Produkt-/Sortenname
    cookingType,        // kommt aus Variety
    packagingType,      // optional (z.B. "lose", "5 kg Sack")
    productNumber,      // optional
    unitKg,             // optional -> fallback 1000
    unitsPerCrate,      // optional
    cratesPerPallet,    // optional
    varietyName,        // optional: eigener Varietätenname (falls abweichend von name)
  } = req.body;

  if (!name || !cookingType) {
    return res.status(400).json({
      error: "name (Sorte/Produkt) und cookingType sind erforderlich",
    });
  }

  try {
    // 1) Variety finden/erstellen
    const vName = varietyName && String(varietyName).trim().length > 0 ? varietyName : name;

    let variety = await prisma.variety.findFirst({
      where: { name: vName },
    });

    if (!variety) {
      variety = await prisma.variety.create({
        data: {
          name: vName,
          cookingType, // muss enum CookingType im Schema sein
        },
      });
    } else {
      // optional: cookingType korrigieren, wenn abweichend
      if (variety.cookingType !== cookingType) {
        variety = await prisma.variety.update({
          where: { id: variety.id },
          data: { cookingType },
        });
      }
    }

    // 2) Product anlegen (unitKg ist Pflicht im Schema -> fallback 1000)
    const created = await prisma.product.create({
      data: {
        name,                                  // Klartextname
        productNumber: productNumber ?? null,
        varietyId: variety.id,
        unitKg: Number.isFinite(+unitKg) && +unitKg > 0 ? Math.floor(+unitKg) : 1000,
        unitsPerCrate: unitsPerCrate != null ? Math.floor(+unitsPerCrate) : null,
        cratesPerPallet: cratesPerPallet != null ? Math.floor(+cratesPerPallet) : null,
        packagingType: packagingType ?? null,
      },
      include: { variety: true },
    });

    return res.status(201).json({
      id: created.id,
      name: created.name,
      cookingType: created.variety?.cookingType ?? null,
      packagingType: created.packagingType ?? null,
      productNumber: created.productNumber ?? null,
      unitKg: created.unitKg,
      unitsPerCrate: created.unitsPerCrate,
      cratesPerPallet: created.cratesPerPallet,
      varietyId: created.varietyId,
      varietyName: created.variety?.name ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Anlegen des Produkts" });
  }
});

/**
 * KUNDEN
 */
app.get("/api/customers", async (_req, res) => {
  const customers = await prisma.customer.findMany();
  res.json(customers);
});

app.post("/api/customers", async (req, res) => {
  const { name, externalId, region, contactInfo } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name ist erforderlich" });
  }

  const customer = await prisma.customer.create({
    data: { name, externalId, region, contactInfo },
  });

  res.status(201).json(customer);
});

/**
 * LIEFERUNGEN
 */
app.post("/api/deliveries", async (req, res) => {
  const { date, farmerId, productId, grossTons, wasteKg, netTons } = req.body;

  if (!date || !farmerId || !productId || grossTons == null || netTons == null) {
    return res.status(400).json({ error: "Pflichtfelder fehlen" });
  }

  try {
    const delivery = await prisma.delivery.create({
      data: {
        date: new Date(date),
        farmerId,
        productId,
        grossTons,
        wasteKg: wasteKg ?? 0,
        netTons,
      },
    });

    // Bauer-Lager automatisch reduzieren (hier mit Bruttomenge)
    await applyFarmerStockChange(
      farmerId,
      productId,
      -Number(grossTons),
      "DELIVERY_TO_PACKER",
      delivery.id
    );

    res.status(201).json(delivery);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler bei Lieferung / Lagerbuchung" });
  }
});
// Lagerstand beim Bauern (für ORGANISATOR: alle, für Bauer: gefiltert nach farmerId)
app.get("/api/farmer-stock", async (req, res) => {
  const farmerIdRaw = req.query.farmerId as string | undefined;
  const farmerId = farmerIdRaw ? Number(farmerIdRaw) : undefined;

  try {
    console.log("GET /api/farmer-stock, farmerId =", farmerId);

    const stocks = await prisma.farmerStock.findMany({
      where: farmerId ? { farmerId } : undefined,
      include: {
        farmer: true,
        product: true,
      },
      orderBy: [
        { farmerId: "asc" },
        { productId: "asc" },
      ],
    });

    res.json(stocks);
  } catch (err: any) {
    console.error("Fehler in /api/farmer-stock:", err);
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    res
      .status(500)
      .json({ error: "Fehler beim Laden der Bauern-Lagerstände", detail: message });
  }
});
// Inventur beim Bauern: absoluter Lagerstand je Bauer+Produkt setzen
app.post("/api/farmer-stock/inventory", async (req, res) => {
  const { farmerId, productId, newQuantityTons } = req.body;

  if (!farmerId || !productId || newQuantityTons == null) {
    return res.status(400).json({ error: "farmerId, productId und newQuantityTons sind erforderlich" });
  }

  try {
    const existing = await prisma.farmerStock.findUnique({
      where: { farmerId_productId: { farmerId, productId } },
    });

    const current = existing ? Number(existing.quantityTons) : 0;
    const target = Number(newQuantityTons);
    const diff = target - current;

    await applyFarmerStockChange(farmerId, productId, diff, "INVENTORY");

    const updated = await prisma.farmerStock.findUnique({
      where: { farmerId_productId: { farmerId, productId } },
      include: { farmer: true, product: true },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler bei Inventur" });
  }
});
// Verkauf ab Hof: Lager reduzieren
app.post("/api/farmer-stock/direct-sale", async (req, res) => {
  const { farmerId, productId, quantityTons } = req.body;

  if (!farmerId || !productId || quantityTons == null) {
    return res.status(400).json({ error: "farmerId, productId und quantityTons sind erforderlich" });
  }

  try {
    await applyFarmerStockChange(
      farmerId,
      productId,
      -Number(quantityTons),
      "DIRECT_SALE"
    );

    const updated = await prisma.farmerStock.findUnique({
      where: { farmerId_productId: { farmerId, productId } },
      include: { farmer: true, product: true },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Verbuchen des Direktverkaufs" });
  }
});
// einfache Roh-Lagerübersicht je Produkt (Summe Netto-Lieferungen)
app.get("/api/inventory/raw", async (_req, res) => {
  const deliveries = await prisma.delivery.groupBy({
    by: ["productId"],
    _sum: { netTons: true },
  });

  res.json(deliveries);
});

/**
 * PACKAUFTRÄGE (ORDERS)
 */

// Packauftrag anlegen
app.post("/api/orders", async (req, res) => {
  const { customerId, productId, orderDate, deliveryDate, orderedQty, reserveQty } = req.body;

  if (!customerId || !productId || !deliveryDate || orderedQty == null) {
    return res.status(400).json({
      error: "customerId, productId, deliveryDate und orderedQty sind Pflichtfelder",
    });
  }

  try {
    const order = await prisma.order.create({
      data: {
        customerId,
        productId,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        deliveryDate: new Date(deliveryDate),
        orderedQty,
        reserveQty: reserveQty ?? 0,
      },
      include: {
        customer: true,
        product: true,
      },
    });

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Anlegen des Auftrags" });
  }
});

// Packaufträge-Liste (optional nach Status filtern)
app.get("/api/orders", async (req, res) => {
  const status = req.query.status as string | undefined; // "OPEN", "IN_PROGRESS", "DONE"

  try {
    const orders = await prisma.order.findMany({
      where: status ? { status: status as OrderStatus } : undefined,
      orderBy: { deliveryDate: "asc" },
      include: {
        customer: true,
        product: true,
      },
    });

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Laden der Aufträge" });
  }
});

// Status eines Auftrags ändern
app.patch("/api/orders/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body; // "OPEN" | "IN_PROGRESS" | "DONE"

  if (!status) {
    return res.status(400).json({ error: "Status ist erforderlich" });
  }

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: { status: status as OrderStatus },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Aktualisieren des Status" });
  }
});

/**
 * VERPACKUNGSVORGÄNGE
 */

// Verpackungsvorgang erfassen
app.post("/api/packaging-runs", async (req, res) => {
  const { date, productId, orderId, quantityUnits, reserved, wasteKg } = req.body;

  if (!productId || quantityUnits == null) {
    return res
      .status(400)
      .json({ error: "productId und quantityUnits sind Pflichtfelder" });
  }

  try {
    const run = await prisma.packagingRun.create({
      data: {
        date: date ? new Date(date) : new Date(),
        productId,
        orderId: orderId ?? null,
        quantityUnits,
        reserved: !!reserved,
        wasteKg: wasteKg ?? 0,
      },
    });

    res.status(201).json(run);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Erfassen des Verpackungsvorgangs" });
  }
});

// Verpackungsvorgänge-Liste
app.get("/api/packaging-runs", async (req, res) => {
  const orderId = req.query.orderId ? Number(req.query.orderId) : undefined;

  try {
    const runs = await prisma.packagingRun.findMany({
      where: orderId ? { orderId } : undefined,
      orderBy: { date: "asc" },
      include: {
        product: true,
        order: true,
      },
    });

    res.json(runs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Laden der Verpackungsvorgänge" });
  }
});

const PORT = process.env.PORT || 4000;

ensureOrganisatorUser()
  .catch((err) => {
    console.error("Fehler beim Anlegen des Organisators:", err);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server läuft auf Port ${PORT}`);
    });
  });
// sehr einfacher Login (nur für internen Gebrauch, später mit Passwort-Hashing absichern)
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email und password erforderlich" });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { farmer: true },
  });

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Ungültige Zugangsdaten" });
  }

  // hier KEINE echten Tokens, nur einfache Antwort für dein Frontend-State
  res.json({
    id: user.id,
    name: user.name,
    role: user.role,
    farmerId: user.farmerId,
  });
});