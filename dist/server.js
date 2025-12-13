"use strict";
// Neuer, vollständiger Server-Code in TypeScript (src/server.ts)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
    // Packbetrieb 1
    await prisma.packPlant.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, name: "Standard-Packbetrieb" },
    });
    // Packstelle 1
    await prisma.packStation.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, name: "Standard-Packstelle" },
    });
}
// ▶ Snapshots-Helfer
async function getSnapshotsForFarmerVariety(farmerId, varietyId) {
    const farmer = await prisma.farmer.findUnique({
        where: { id: farmerId },
        include: { address: true },
    });
    const variety = await prisma.variety.findUnique({
        where: { id: varietyId },
    });
    let addrText = null;
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
async function getSnapshotsForPackStation(packStationId) {
    const ps = await prisma.packStation.findUnique({ where: { id: packStationId } });
    return { packStationNameSnapshot: ps?.name ?? "" };
}
async function getSnapshotsForProduct(productId) {
    const p = await prisma.product.findUnique({ where: { id: productId } });
    return { productNameSnapshot: p?.name ?? "" };
}
async function getSnapshotsForPackPlant(packPlantId) {
    const pp = await prisma.packPlant.findUnique({ where: { id: packPlantId } });
    return { packPlantNameSnapshot: pp?.name ?? "" };
}
// ░░░ ROUTES ░░░
// ▶ Health Check (für Frontend / Vite)
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});
// ▶ PRODUCTS
app.get("/api/products", async (_req, res) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: [{ name: "asc" }],
        });
        res.json(products);
    }
    catch (err) {
        console.error("Fehler in GET /api/products:", err);
        res.status(500).json({ error: "Fehler beim Laden der Produkte" });
    }
});
app.post("/api/products", async (req, res) => {
    const { name, cookingType, // "FESTKOCHEND" | "VORWIEGEND_FESTKOCHEND" | "MEHLIG"
    unitKg, // z.B. 2
    unitsPerColli, // optional
    collisPerPallet, packagingType, // Enum PackagingType
    productNumber, // optional
     } = req.body;
    if (!name || !cookingType || unitKg == null) {
        return res
            .status(400)
            .json({ error: "name, cookingType und unitKg sind Pflichtfelder" });
    }
    try {
        const product = await prisma.product.create({
            data: {
                name,
                cookingType,
                unitKg: Number(unitKg),
                unitsPerColli: unitsPerColli != null ? Number(unitsPerColli) : null,
                collisPerPallet: collisPerPallet != null ? Number(collisPerPallet) : null,
                packagingType: packagingType || null,
                productNumber: productNumber || null,
            },
        });
        res.status(201).json(product);
    }
    catch (err) {
        console.error("Fehler in POST /api/products:", err);
        res.status(500).json({
            error: "Fehler beim Anlegen des Produkts",
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
    }
    catch (err) {
        console.error("Fehler in GET /api/varieties:", err);
        res.status(500).json({ error: "Fehler beim Laden der Sorten" });
    }
});
app.post("/api/varieties", async (req, res) => {
    const { name, cookingType, quality } = req.body;
    if (!name || !cookingType || !quality) {
        return res
            .status(400)
            .json({ error: "name, cookingType und quality sind Pflichtfelder" });
    }
    try {
        const variety = await prisma.variety.create({
            data: {
                name,
                cookingType,
                quality,
            },
        });
        res.status(201).json(variety);
    }
    catch (err) {
        console.error("Fehler in POST /api/varieties:", err);
        res.status(500).json({
            error: "Fehler beim Anlegen der Sorte",
            detail: String(err.message || err),
        });
    }
});
// ▶ CUSTOMERS
app.get("/api/customers", async (_req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: [{ name: "asc" }],
        });
        res.json(customers);
    }
    catch (err) {
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
    }
    catch (err) {
        console.error("Fehler in POST /api/customers:", err);
        res.status(500).json({ error: "Fehler beim Anlegen des Kunden" });
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
            packStationNameSnapshot: s.packStationNameSnapshot ?? null,
            farmerNameSnapshot: s.farmerNameSnapshot ?? null,
            varietyNameSnapshot: s.varietyNameSnapshot ?? null,
            farmerAddressSnapshot: s.farmerAddressSnapshot ?? null,
            farmerGgnSnapshot: s.farmerGgnSnapshot ?? null,
            updatedAt: s.updatedAt,
            // direkte Namen für Frontend-Komfort
            farmerName: s.farmer?.name ?? null,
            varietyName: s.variety?.name ?? null,
            // komplette Objekte falls irgendwo verwendet
            farmer: s.farmer,
            variety: s.variety,
        }));
        res.json(result);
    }
    catch (err) {
        console.error("Fehler in GET /api/packstation-stock:", err);
        res.status(500).json({
            error: "Fehler beim Laden des Packstellen-Lagers",
            detail: String(err.message || err),
        });
    }
});
// ▶ Farmer
app.get("/api/farmers", async (_req, res) => {
    const farmers = await prisma.farmer.findMany({ include: { address: true } });
    res.json(farmers);
});
app.post("/api/farmers", async (req, res) => {
    const { name, street, postalCode, city, ggn, loginEmail, loginPassword } = req.body;
    if (!name)
        return res.status(400).json({ error: "Name erforderlich" });
    const addr = street || postalCode || city ? await prisma.address.create({
        data: { street: street ?? "", postalCode: postalCode ?? "", city: city ?? "" },
    }) : null;
    const farmer = await prisma.farmer.create({
        data: {
            name,
            ggn: ggn ?? null,
            email: loginEmail ?? null,
            passwordHash: loginPassword ?? null,
            addressId: addr?.id ?? null,
        },
        include: { address: true },
    });
    if (loginEmail && loginPassword) {
        await prisma.user.upsert({
            where: { email: loginEmail },
            update: { farmerId: farmer.id },
            create: {
                email: loginEmail,
                password: loginPassword,
                name: farmer.name,
                role: "FARMER",
                farmerId: farmer.id,
            },
        });
    }
    res.status(201).json(farmer);
});
// ▶ Helper: Bauernlager ändern + Movement anlegen (inkl. Snapshots)
async function applyFarmerStockChange(farmerId, varietyId, changeKg, reason, fieldName, harvestDate) {
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
    }
    else {
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
        await applyFarmerStockChange(Number(farmerId), Number(varietyId), Number(changeKg), String(reason));
        const updated = await prisma.farmerStock.findUnique({
            where: { farmerId_varietyId: { farmerId: Number(farmerId), varietyId: Number(varietyId) } },
            include: { farmer: true, variety: true },
        });
        res.json(updated);
    }
    catch (err) {
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
        await applyFarmerStockChange(Number(farmerId), Number(varietyId), diff, "INVENTORY");
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
    }
    catch (err) {
        console.error("Fehler in /api/farmer-stock/inventory:", err);
        res.status(500).json({ error: "Fehler bei Inventur" });
    }
});
// ▶ Verkauf ab Hof / an EG: Lager reduzieren (kg) + bei EG in Packstelle buchen
app.post("/api/farmer-stock/direct-sale", async (req, res) => {
    try {
        const { farmerId, varietyId, quantityTons, saleType, // "PRIVATE" | "EG"
        fieldName, harvestDate, } = req.body;
        const qtyKg = Number(quantityTons ?? 0);
        if (!farmerId || !varietyId || qtyKg <= 0) {
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
            return res
                .status(400)
                .json({ error: "Kein Lagerbestand für diesen Bauern / diese Sorte gefunden" });
        }
        const current = Number(stock.quantityTons);
        if (current < qtyKg) {
            return res
                .status(400)
                .json({ error: "Nicht genug Bestand im Bauernlager" });
        }
        // Bestand im Bauernlager reduzieren
        await prisma.farmerStock.update({
            where: { id: stock.id },
            data: {
                quantityTons: current - qtyKg,
            },
        });
        // Snapshots für Movement laden
        const snap = await getSnapshotsForFarmerVariety(farmerIdNum, varietyIdNum);
        // Movement im Bauernlager protokollieren
        await prisma.farmerStockMovement.create({
            data: {
                farmerId: farmerIdNum,
                varietyId: varietyIdNum,
                changeTons: -qtyKg,
                reason: saleType === "PRIVATE"
                    ? "FARMER_DIRECT_SALE_PRIVATE"
                    : "FARMER_DIRECT_SALE_EG",
                fieldName: fieldName || null,
                harvestDate: harvestDate ? new Date(harvestDate) : null,
                ...snap,
            },
        });
        // 2) Nur wenn Verkauf an EG: in Packstellenlager buchen (+ RAW_IN_FROM_FARMER-Movement)
        if (saleType === "EG") {
            await applyPackStationStockChange(PACKSTATION_ID, farmerIdNum, varietyIdNum, qtyKg, "RAW_IN_FROM_FARMER", "Verkauf Bauer -> EG (Rohware in Packstelle)");
        }
        res.json({ ok: true });
    }
    catch (err) {
        console.error("Fehler bei /api/farmer-stock/direct-sale:", err);
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
    }
    catch (err) {
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
    const maxDeliveries = maxDeliveriesRaw != null ? Number(maxDeliveriesRaw) : undefined;
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
        if (maxDeliveries &&
            Number.isFinite(maxDeliveries) &&
            maxDeliveries > 0) {
            // alle Lieferungen dieses Bauern sortiert nach Datum
            const deliveries = movementsAll
                .filter((m) => m.reason === "RAW_IN_FROM_FARMER")
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            if (deliveries.length > maxDeliveries) {
                // Cutoff = älteste Lieferung innerhalb der "letzten N"
                const cutoffDelivery = deliveries[deliveries.length - maxDeliveries];
                const cutoffDate = cutoffDelivery.createdAt;
                // nur Bewegungen ab diesem Datum berücksichtigen
                movements = movementsAll.filter((m) => m.createdAt >= cutoffDate);
                // Packaging-Runs ab gleichem Datum
                runs = runsAll.filter((r) => {
                    const d = r.date ?? r.createdAt ?? null;
                    return d ? d >= cutoffDate : false;
                });
            }
        }
        // Meta je Sorte sammeln (Name, Kocheigenschaft, Qualität)
        const varietyMeta = new Map();
        const ensureMeta = (v) => {
            if (!v)
                return;
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
        const stockByVariety = new Map();
        for (const s of stocks) {
            const vId = s.varietyId;
            const qty = Number(s.quantityKg ?? 0);
            stockByVariety.set(vId, (stockByVariety.get(vId) ?? 0) + qty);
        }
        const eventsByVariety = new Map();
        function pushEvent(varietyId, event) {
            const arr = eventsByVariety.get(varietyId) ?? [];
            arr.push(event);
            eventsByVariety.set(varietyId, arr);
        }
        // Bewegungen → Events
        for (const m of movements) {
            if (!m.varietyId || !m.variety)
                continue;
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
            if (!r.varietyId || !r.variety)
                continue;
            const vId = r.varietyId;
            const kg = Number(r.finishedKg ?? 0);
            const date = r.date ?? new Date();
            if (kg > 0) {
                pushEvent(vId, { type: "PACKAGING", date, kg });
            }
        }
        const allRows = [];
        // Hilfsfunktion: leere Zeile für eine Sorte
        function createEmptyRow(meta) {
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
            const segments = [];
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
            const hasData = currentRow.deliveredKg > 0 ||
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
                const processedBaseWithoutWash = row.packedKg + row.wasteKg + row.inventoryZeroKg;
                const washingLoss = row.deliveredKg -
                    row.currentKg -
                    processedBaseWithoutWash;
                row.washingLossKg = washingLoss > 0 ? washingLoss : 0;
                row.lossTotalKg =
                    row.wasteKg + row.inventoryZeroKg + row.washingLossKg;
                const processedBase = row.packedKg + row.lossTotalKg; // verarbeitete Menge
                if (processedBase > 0) {
                    row.yieldPercent = (row.packedKg / processedBase) * 100;
                    row.lossPercent = (row.lossTotalKg / processedBase) * 100;
                }
                else {
                    row.yieldPercent = 0;
                    row.lossPercent = 0;
                }
                allRows.push(row);
            }
        }
        const result = allRows
            .sort((a, b) => a.varietyName.localeCompare(b.varietyName, "de", {
            sensitivity: "base",
        }))
            .map((row) => ({
            ...row,
            // Alias wie bisher
            totalLossKg: row.lossTotalKg,
        }));
        res.json(result);
    }
    catch (err) {
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
            quantityKg: Number(m.changeKg), // RAW_IN_FROM_FARMER ist positiv
        }));
        res.json(result);
    }
    catch (err) {
        console.error("Fehler in GET /api/organizer/deliveries:", err);
        res.status(500).json({
            error: "Fehler beim Laden der Lieferungen",
            detail: String(err.message || err),
        });
    }
});
// ▶ Helper: Packstationslager ändern + Movement anlegen (inkl. Snapshots)
async function applyPackStationStockChange(packStationId, farmerId, varietyId, changeKg, reason, comment) {
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
    }
    else {
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
        await applyPackStationStockChange(Number(packStationId), Number(farmerId), Number(varietyId), Number(changeKg), String(reason), comment ?? null);
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
    }
    catch (err) {
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
    }
    catch (err) {
        console.error("Fehler in GET /api/packplant-stock:", err);
        res.status(500).json({ error: "Fehler beim Laden des Packbetriebs-Lagers" });
    }
});
// ▶ Helper: Preis zu Kunde/Produkt an einem Datum holen
async function getPriceForCustomerProductAtDate(customerId, productId, atDate) {
    // Nimmt immer den letzten Preis, dessen validFrom <= atDate ist
    return prisma.price.findFirst({
        where: {
            customerId,
            productId,
            validFrom: {
                lte: atDate,
            },
        },
        orderBy: {
            validFrom: "desc",
        },
    });
}
// ▶ Inventur verpackter Produkte im Packbetrieb (Bestand absolut setzen)
app.post("/api/packplant-stock/inventory", async (req, res) => {
    const { packPlantId, productId, newQuantityUnits, comment, pricePerUnit, // NEU: Preis für Bewertung / Snapshot
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
    let pricePerUnitNum = null;
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
            await applyPackPlantStockChange(packPlantIdNum, productIdNum, diff, "INVENTORY", comment ?? "Inventur Packbetrieb", pricePerUnitNum, pricePerUnitNum != null ? pricePerUnitNum * targetUnits : null);
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
    }
    catch (err) {
        console.error("Fehler in POST /api/packplant-stock/inventory:", err);
        return res.status(500).json({
            error: "Fehler bei der Packbetriebs-Inventur",
            detail: String(err.message || err),
        });
    }
});
app.get("/api/prices", async (req, res) => {
    const { customerId, productId } = req.query;
    try {
        const where = {};
        if (customerId)
            where.customerId = Number(customerId);
        if (productId)
            where.productId = Number(productId);
        const prices = await prisma.price.findMany({
            where,
            include: { customer: true, product: true },
            orderBy: [{ customerId: "asc" }, { productId: "asc" }, { validFrom: "desc" }],
        });
        res.json(prices);
    }
    catch (err) {
        console.error("Fehler in GET /api/prices:", err);
        res.status(500).json({ error: "Fehler beim Laden der Preise" });
    }
});
app.post("/api/prices", async (req, res) => {
    const { customerId, productId, pricePerUnit, validFrom } = req.body;
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
        const price = await prisma.price.create({
            data: {
                customerId: customerIdNum,
                productId: productIdNum,
                pricePerUnit: Number(pricePerUnit),
                validFrom: validFrom ? new Date(validFrom) : new Date(),
                supplierType: "PACKPLANT", // wie vorher
                customerNameSnapshot: customer?.name ?? null,
                productNameSnapshot: product?.name ?? null,
            },
        });
        res.status(201).json(price);
    }
    catch (err) {
        console.error("Fehler in POST /api/prices:", err);
        res.status(500).json({ error: "Fehler beim Anlegen des Preises" });
    }
});
// ▶ Helper: Packbetriebs-Lager ändern + Movement anlegen (inkl. Kocheigenschaft-Snapshot + Preis-Snapshot)
async function applyPackPlantStockChange(packPlantId, productId, changeUnits, reason, comment, pricePerUnitSnapshot, totalPriceSnapshot) {
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
    }
    else {
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
            ...packPlantSnap,
            ...productSnap,
        },
    });
    console.log("PackPlantStockMovement CREATED:", movement);
}
// ▶ Sortierabfall in der Packstation verbuchen
// Wird vom Frontend beim Button "Abfall verbuchen" aufgerufen.
app.post("/api/packstation/waste", async (req, res) => {
    const { packStationId, farmerId, varietyId, wasteKg, quantityKg, quantityTons, } = req.body;
    // Standard-Packstelle, falls nichts mitgeschickt wird
    const packStationIdNum = packStationId ? Number(packStationId) : 1;
    // Abfallmenge aus verschiedenen Feldnamen lesen (je nach altem Frontend)
    const waste = wasteKg != null
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
        await applyPackStationStockChange(packStationIdNum, Number(farmerId), Number(varietyId), -waste, "SORTING_WASTE", "Sortierabfall verbucht");
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
    }
    catch (err) {
        console.error("Fehler in POST /api/packstation/waste:", err);
        return res
            .status(500)
            .json({ error: "Fehler beim Verbuchen des Sortierabfalls" });
    }
});
// Fallback-Route, falls das Frontend eine alte URL /api/packstation-waste nutzt
app.post("/api/packstation-waste", async (req, res) => {
    // einfach an die Haupt-Route delegieren
    req.url = "/api/packstation/waste";
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
            console.log("INVENTORY_ZERO Packstation: kein Bestand gefunden", packStationIdNum, farmerId, varietyId);
            return res.status(200).json(null);
        }
        const current = Number(existing.quantityKg) || 0;
        // Differenz auf 0 setzen = negativer aktueller Bestand
        const diff = -current;
        await applyPackStationStockChange(packStationIdNum, Number(farmerId), Number(varietyId), diff, "INVENTORY_ZERO", "Packstations-Lager auf 0 gesetzt");
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
    }
    catch (err) {
        console.error("Fehler in POST /api/packstation/inventory-zero:", err);
        return res
            .status(500)
            .json({ error: "Fehler beim Setzen des Packstations-Lagers auf 0" });
    }
});
// ▶ PackagingRun – Frontend-kompatibel + Lagerverbuchung + Snapshots
app.post("/api/packaging-runs", async (req, res) => {
    const { date, productId, packStationId, farmerId, varietyId, quantityUnits, reserved, wasteKg, rawInputKg, finishedKg, } = req.body;
    console.log("PACKAGING RUN REQ BODY:", req.body);
    // Minimalprüfung
    if (!productId || quantityUnits == null || !farmerId || !varietyId) {
        return res.status(400).json({
            error: "productId, farmerId, varietyId und quantityUnits sind Pflichtfelder",
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
        const finishedKgValue = finishedKg != null
            ? Number(finishedKg)
            : unitKg * Number(quantityUnits);
        const rawInputKgValue = rawInputKg != null
            ? Number(rawInputKg)
            : finishedKgValue + (wasteKg != null ? Number(wasteKg) : 0);
        // Snapshots holen
        const productSnap = await getSnapshotsForProduct(Number(productId));
        const packSnap = await getSnapshotsForPackStation(packStationIdNum);
        const farmerVarSnap = await getSnapshotsForFarmerVariety(farmerIdNum, varietyIdNum);
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
                ...productSnap, // productNameSnapshot
                ...packSnap, // packStationNameSnapshot
                farmerNameSnapshot,
                varietyNameSnapshot,
            },
        });
        // 2) Rohware aus Packstellen-Lager raus
        await applyPackStationStockChange(packStationIdNum, farmerIdNum, varietyIdNum, -rawInputKgValue, "PACKAGING_OUT", `Verpackung Run ${run.id}`);
        // 3) Fertigware in Packbetriebs-Lager rein (Einheiten)
        await applyPackPlantStockChange(1, // Standard-Packbetrieb
        Number(productId), Number(quantityUnits), "PACKAGING_IN", `Verpackung Run ${run.id}`);
        console.log("PACKAGING RUN CREATED + STOCK UPDATED, ID =", run.id);
        return res.status(201).json(run);
    }
    catch (err) {
        console.error("Fehler in POST /api/packaging-runs:", err);
        return res.status(500).json({
            error: "Fehler beim Erfassen des Verpackungsvorgangs",
            detail: String(err.message || err),
        });
    }
});
// ▶ DeliveryPlan: Import (z.B. aus Excel-Datei vorbereitet im Frontend)
// CSV in Zeilen-Objekte zerlegen (Header = Spaltennamen)
function parsePlanmengenCsv(csvText) {
    const lines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    if (lines.length < 2) {
        throw new Error("CSV hat zu wenig Zeilen");
    }
    // erste Zeile = Header
    const header = lines[0].split(/[;,]/).map((h) => h.trim());
    const rows = [];
    for (const line of lines.slice(1)) {
        const cols = line.split(/[;,]/).map((c) => c.trim());
        const obj = {};
        header.forEach((h, idx) => {
            obj[h] = cols[idx] ?? "";
        });
        rows.push(obj);
    }
    return rows;
}
// Gemeinsamer Helfer: beliebige Zeilen (JSON oder CSV) in DeliveryPlan upserten
async function importDeliveryPlanRows(rawRows) {
    // Zahlen & Kochtyp normalisieren, Komma-Zahlen erlauben
    const rows = rawRows.map((r) => ({
        farmerId: Number(r.farmerId),
        year: Number(r.year),
        week: Number(r.week),
        cookingType: String(r.cookingType).trim(),
        plannedKg: r.plannedKg != null
            ? Number(String(r.plannedKg).replace(",", "."))
            : NaN,
    }));
    // Alle betroffenen Bauern IDs sammeln, damit wir Farmer-Namen für Snapshots laden können
    const farmerIds = Array.from(new Set(rows
        .map((r) => Number(r.farmerId))
        .filter((id) => Number.isFinite(id))));
    const farmers = await prisma.farmer.findMany({
        where: { id: { in: farmerIds } },
    });
    const farmerMap = new Map();
    for (const f of farmers) {
        farmerMap.set(f.id, f);
    }
    const imported = [];
    const errors = [];
    for (const [index, raw] of rows.entries()) {
        const farmerId = Number(raw.farmerId);
        const year = Number(raw.year);
        const week = Number(raw.week);
        const cookingType = raw.cookingType;
        const plannedKg = raw.plannedKg != null
            ? Number(raw.plannedKg)
            : NaN;
        if (!farmerId ||
            !Number.isFinite(year) ||
            !Number.isFinite(week) ||
            !cookingType ||
            !Number.isFinite(plannedKg)) {
            errors.push({
                index,
                raw,
                error: "farmerId, year, week, cookingType und plannedKg müssen gültig sein",
            });
            continue;
        }
        const farmer = farmerMap.get(farmerId);
        const farmerNameSnapshot = farmer?.name ?? "";
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
        }
        catch (e) {
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
    }
    catch (err) {
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
        // planmengen.csv im Projekt-Root:
        const csvPath = path_1.default.resolve(process.cwd(), "planmengen.csv");
        if (!fs_1.default.existsSync(csvPath)) {
            return res.status(404).json({
                error: `Datei planmengen.csv nicht gefunden unter ${csvPath}`,
            });
        }
        const csvText = await fs_1.default.promises.readFile(csvPath, "utf8");
        const rawRows = parsePlanmengenCsv(csvText);
        const result = await importDeliveryPlanRows(rawRows);
        return res.status(200).json(result);
    }
    catch (err) {
        console.error("Fehler in POST /api/delivery-plans/import-from-csv:", err);
        return res.status(500).json({
            error: "Fehler beim Import der Planmengen aus CSV",
            detail: String(err.message || err),
        });
    }
});
app.post("/api/delivery-plans/import-from-csv", async (_req, res) => {
    try {
        // planmengen.csv im Projekt-Root:
        const csvPath = path_1.default.resolve(process.cwd(), "planmengen.csv");
        if (!fs_1.default.existsSync(csvPath)) {
            return res.status(404).json({
                error: `Datei planmengen.csv nicht gefunden unter ${csvPath}`,
            });
        }
        const csvText = await fs_1.default.promises.readFile(csvPath, "utf8");
        const rawRows = parsePlanmengenCsv(csvText);
        // Erwartete Felder in jeder Zeile:
        // farmerId, year, week, cookingType, plannedKg
        const rows = rawRows.map((r) => ({
            farmerId: Number(r.farmerId),
            year: Number(r.year),
            week: Number(r.week),
            cookingType: String(r.cookingType).trim(),
            plannedKg: Number(String(r.plannedKg ?? "").replace(",", ".")),
        }));
        // == hier verwenden wir deine bestehende Logik fast 1:1 ==
        // Alle betroffenen Bauern IDs sammeln
        const farmerIds = Array.from(new Set(rows
            .map((r) => Number(r.farmerId))
            .filter((id) => Number.isFinite(id))));
        const farmers = await prisma.farmer.findMany({
            where: { id: { in: farmerIds } },
        });
        const farmerMap = new Map();
        for (const f of farmers) {
            farmerMap.set(f.id, f);
        }
        const imported = [];
        const errors = [];
        for (const [index, raw] of rows.entries()) {
            const farmerId = Number(raw.farmerId);
            const year = Number(raw.year);
            const week = Number(raw.week);
            const cookingType = raw.cookingType;
            const plannedKg = raw.plannedKg != null ? Number(raw.plannedKg) : NaN;
            if (!farmerId ||
                !Number.isFinite(year) ||
                !Number.isFinite(week) ||
                !cookingType ||
                !Number.isFinite(plannedKg)) {
                errors.push({
                    index,
                    raw,
                    error: "farmerId, year, week, cookingType und plannedKg müssen gültig sein",
                });
                continue;
            }
            const farmer = farmerMap.get(farmerId);
            const farmerNameSnapshot = farmer?.name ?? "";
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
            }
            catch (e) {
                console.error("Fehler bei DeliveryPlan upsert:", e);
                errors.push({
                    index,
                    raw,
                    error: String(e.message || e),
                });
            }
        }
        return res.status(200).json({
            importedCount: imported.length,
            errorCount: errors.length,
            imported,
            errors,
        });
    }
    catch (err) {
        console.error("Fehler in POST /api/delivery-plans/import-from-csv:", err);
        return res.status(500).json({
            error: "Fehler beim Import der Planmengen aus CSV",
            detail: String(err.message || err),
        });
    }
});
// ▶ DeliveryPlan: Lesen / Filtern
app.get("/api/delivery-plans", async (req, res) => {
    const { year, farmerId, cookingType, weekFrom, weekTo } = req.query;
    if (!year) {
        return res.status(400).json({ error: "year ist erforderlich" });
    }
    const where = {
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
    }
    catch (err) {
        console.error("Fehler in GET /api/delivery-plans:", err);
        res.status(500).json({
            error: "Fehler beim Laden der Planmengen",
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
        // aktuell noch Klartext-Passwort, später mit Hash ersetzen
        if (!user || user.password !== password) {
            return res.status(401).json({ error: "Ungültige Zugangsdaten" });
        }
        res.json({
            id: user.id,
            name: user.name,
            role: user.role,
            farmerId: user.farmerId,
        });
    }
    catch (err) {
        console.error("Fehler bei /api/auth/login:", err);
        res.status(500).json({ error: "Login-Fehler" });
    }
});
// Serverstart
(async () => {
    await ensureInitialData();
    const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
    app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));
})();