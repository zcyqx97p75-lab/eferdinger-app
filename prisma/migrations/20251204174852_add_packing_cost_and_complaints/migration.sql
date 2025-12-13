-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "packingCostPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PackStationComplaint" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stockMovementId" INTEGER NOT NULL,
    "farmerId" INTEGER NOT NULL,
    "retourQuantity" DECIMAL(10,2),
    "complaintPercent" DECIMAL(5,2),
    "snapshotPricePerUnit" DECIMAL(10,2) NOT NULL,
    "snapshotPackingCostPerUnit" DECIMAL(10,2) NOT NULL,
    "comment" TEXT,

    CONSTRAINT "PackStationComplaint_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PackStationComplaint" ADD CONSTRAINT "PackStationComplaint_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "PackStationStockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackStationComplaint" ADD CONSTRAINT "PackStationComplaint_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
