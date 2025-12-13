-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RECHNUNG', 'GUTSCHRIFT', 'AKONTO', 'JAHRESSCHLUSS');

-- AlterTable
ALTER TABLE "Farmer" ADD COLUMN     "flatRateNote" TEXT,
ADD COLUMN     "isFlatRate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vatId" TEXT;

-- AlterTable
ALTER TABLE "PackPlant" ADD COLUMN     "addressId" INTEGER,
ADD COLUMN     "vatId" TEXT;

-- AlterTable
ALTER TABLE "PackStation" ADD COLUMN     "addressId" INTEGER,
ADD COLUMN     "vatId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "taxRateId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "vatId" TEXT;

-- AlterTable
ALTER TABLE "VarietyQualityPrice" ADD COLUMN     "taxRateId" INTEGER;

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ratePercent" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingDocument" (
    "id" SERIAL NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "servicePeriodFrom" TIMESTAMP(3),
    "servicePeriodTo" TIMESTAMP(3),
    "title" TEXT,
    "issuerNameSnapshot" TEXT NOT NULL,
    "issuerAddressSnapshot" TEXT,
    "issuerVatIdSnapshot" TEXT,
    "recipientNameSnapshot" TEXT NOT NULL,
    "recipientAddressSnapshot" TEXT,
    "recipientVatIdSnapshot" TEXT,
    "packPlantId" INTEGER,
    "packStationId" INTEGER,
    "customerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingDocumentLine" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "positionNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3),
    "unit" TEXT,
    "unitPrice" DECIMAL(12,4),
    "netAmount" DECIMAL(12,2) NOT NULL,
    "vatRatePercent" DECIMAL(5,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "customerNameSnapshot" TEXT,
    "productNameSnapshot" TEXT,
    "varietyNameSnapshot" TEXT,
    "packPlantNameSnapshot" TEXT,
    "packStationNameSnapshot" TEXT,
    "customerId" INTEGER,
    "productId" INTEGER,
    "varietyId" INTEGER,
    "packStationStockMovementId" INTEGER,
    "customerSaleId" INTEGER,
    "customerSaleComplaintId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingDocument_documentNumber_key" ON "AccountingDocument"("documentNumber");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackStation" ADD CONSTRAINT "PackStation_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackPlant" ADD CONSTRAINT "PackPlant_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarietyQualityPrice" ADD CONSTRAINT "VarietyQualityPrice_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocument" ADD CONSTRAINT "AccountingDocument_packPlantId_fkey" FOREIGN KEY ("packPlantId") REFERENCES "PackPlant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocument" ADD CONSTRAINT "AccountingDocument_packStationId_fkey" FOREIGN KEY ("packStationId") REFERENCES "PackStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocument" ADD CONSTRAINT "AccountingDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocumentLine" ADD CONSTRAINT "AccountingDocumentLine_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocumentLine" ADD CONSTRAINT "AccountingDocumentLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocumentLine" ADD CONSTRAINT "AccountingDocumentLine_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocumentLine" ADD CONSTRAINT "AccountingDocumentLine_packStationStockMovementId_fkey" FOREIGN KEY ("packStationStockMovementId") REFERENCES "PackStationStockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocumentLine" ADD CONSTRAINT "AccountingDocumentLine_customerSaleId_fkey" FOREIGN KEY ("customerSaleId") REFERENCES "CustomerSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocumentLine" ADD CONSTRAINT "AccountingDocumentLine_customerSaleComplaintId_fkey" FOREIGN KEY ("customerSaleComplaintId") REFERENCES "CustomerSaleComplaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocumentLine" ADD CONSTRAINT "AccountingDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "AccountingDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
