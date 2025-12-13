-- AlterTable: Spalten zuerst als nullable hinzufügen
ALTER TABLE "CustomerSale" ADD COLUMN "customerNameSnapshot" TEXT,
ADD COLUMN "productNameSnapshot" TEXT;

-- Bestehende Daten befüllen
UPDATE "CustomerSale" cs
SET 
  "customerNameSnapshot" = c.name,
  "productNameSnapshot" = p.name
FROM "Customer" c, "Product" p
WHERE cs."customerId" = c.id AND cs."productId" = p.id;

-- Spalten auf NOT NULL setzen
ALTER TABLE "CustomerSale" ALTER COLUMN "customerNameSnapshot" SET NOT NULL;
ALTER TABLE "CustomerSale" ALTER COLUMN "productNameSnapshot" SET NOT NULL;

-- Datum-Typ ändern (nur Datum, keine Uhrzeit)
ALTER TABLE "CustomerSale" ALTER COLUMN "date" SET DATA TYPE DATE;

-- CreateIndex
CREATE INDEX "CustomerSale_date_idx" ON "CustomerSale"("date");

-- CreateIndex
CREATE INDEX "CustomerSale_customerId_date_idx" ON "CustomerSale"("customerId", "date");
