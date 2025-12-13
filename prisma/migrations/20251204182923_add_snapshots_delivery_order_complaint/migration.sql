-- AlterTable: Delivery Snapshots hinzufügen
ALTER TABLE "Delivery" ADD COLUMN "farmerNameSnapshot" TEXT,
ADD COLUMN "productNameSnapshot" TEXT;

-- Bestehende Delivery-Daten befüllen
UPDATE "Delivery" d
SET 
  "farmerNameSnapshot" = f.name || COALESCE(' (' || f."farmName" || ')', ''),
  "productNameSnapshot" = p.name || ' (' || p."cookingType" || ')'
FROM "Farmer" f, "Product" p
WHERE d."farmerId" = f.id AND d."productId" = p.id;

-- AlterTable: Order Snapshots hinzufügen
ALTER TABLE "Order" ADD COLUMN "customerNameSnapshot" TEXT,
ADD COLUMN "productNameSnapshot" TEXT;

-- Bestehende Order-Daten befüllen
UPDATE "Order" o
SET 
  "customerNameSnapshot" = c.name || COALESCE(' (' || c.region || ')', ''),
  "productNameSnapshot" = p.name || ' (' || p."cookingType" || ')'
FROM "Customer" c, "Product" p
WHERE o."customerId" = c.id AND o."productId" = p.id;

-- AlterTable: PackStationComplaint Snapshot hinzufügen
ALTER TABLE "PackStationComplaint" ADD COLUMN "farmerNameSnapshot" TEXT;

-- Bestehende PackStationComplaint-Daten befüllen
UPDATE "PackStationComplaint" psc
SET 
  "farmerNameSnapshot" = f.name || COALESCE(' (' || f."farmName" || ')', '')
FROM "Farmer" f
WHERE psc."farmerId" = f.id;
