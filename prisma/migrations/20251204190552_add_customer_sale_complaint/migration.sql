-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('RETOURWARE', 'PROZENTABZUG');

-- CreateTable
CREATE TABLE "CustomerSaleComplaint" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerSaleId" INTEGER NOT NULL,
    "farmerId" INTEGER NOT NULL,
    "complaintType" "ComplaintType" NOT NULL,
    "affectedQuantity" INTEGER NOT NULL,
    "discountPercent" DECIMAL(5,2),
    "farmerNameSnapshot" TEXT NOT NULL,
    "customerNameSnapshot" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "snapshotUnitPrice" DECIMAL(10,3) NOT NULL,
    "snapshotPackingCostPerUnit" DECIMAL(10,2) NOT NULL,
    "complaintAmount" DECIMAL(12,2) NOT NULL,
    "comment" TEXT,

    CONSTRAINT "CustomerSaleComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerSaleComplaint_customerSaleId_idx" ON "CustomerSaleComplaint"("customerSaleId");

-- CreateIndex
CREATE INDEX "CustomerSaleComplaint_farmerId_idx" ON "CustomerSaleComplaint"("farmerId");

-- AddForeignKey
ALTER TABLE "CustomerSaleComplaint" ADD CONSTRAINT "CustomerSaleComplaint_customerSaleId_fkey" FOREIGN KEY ("customerSaleId") REFERENCES "CustomerSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSaleComplaint" ADD CONSTRAINT "CustomerSaleComplaint_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
