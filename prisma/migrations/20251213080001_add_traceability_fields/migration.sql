-- AlterTable
ALTER TABLE "CustomerSale" ADD COLUMN     "farmerId" INTEGER,
ADD COLUMN     "farmerNameSnapshot" TEXT,
ADD COLUMN     "varietyId" INTEGER,
ADD COLUMN     "varietyNameSnapshot" TEXT;

-- AlterTable
ALTER TABLE "PackPlantStockMovement" ADD COLUMN     "customerSaleId" INTEGER,
ADD COLUMN     "packagingRunId" INTEGER;

-- CreateIndex
CREATE INDEX "CustomerSale_farmerId_idx" ON "CustomerSale"("farmerId");

-- CreateIndex
CREATE INDEX "CustomerSale_varietyId_idx" ON "CustomerSale"("varietyId");

-- CreateIndex
CREATE INDEX "PackPlantStockMovement_customerSaleId_idx" ON "PackPlantStockMovement"("customerSaleId");

-- CreateIndex
CREATE INDEX "PackPlantStockMovement_packagingRunId_idx" ON "PackPlantStockMovement"("packagingRunId");

-- AddForeignKey
ALTER TABLE "PackPlantStockMovement" ADD CONSTRAINT "PackPlantStockMovement_customerSaleId_fkey" FOREIGN KEY ("customerSaleId") REFERENCES "CustomerSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackPlantStockMovement" ADD CONSTRAINT "PackPlantStockMovement_packagingRunId_fkey" FOREIGN KEY ("packagingRunId") REFERENCES "PackagingRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSale" ADD CONSTRAINT "CustomerSale_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSale" ADD CONSTRAINT "CustomerSale_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety"("id") ON DELETE SET NULL ON UPDATE CASCADE;
