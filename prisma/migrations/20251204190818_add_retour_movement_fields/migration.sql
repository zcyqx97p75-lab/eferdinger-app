-- AlterTable
ALTER TABLE "PackStationStockMovement" ADD COLUMN     "customerSaleComplaintId" INTEGER,
ADD COLUMN     "isRetourMovement" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "PackStationStockMovement" ADD CONSTRAINT "PackStationStockMovement_customerSaleComplaintId_fkey" FOREIGN KEY ("customerSaleComplaintId") REFERENCES "CustomerSaleComplaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
