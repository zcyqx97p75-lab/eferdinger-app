-- CreateTable
CREATE TABLE "FarmerStock" (
    "id" SERIAL NOT NULL,
    "farmerId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantityTons" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmerStockMovement" (
    "id" SERIAL NOT NULL,
    "farmerId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "changeTons" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "refDeliveryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FarmerStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FarmerStock_farmerId_productId_key" ON "FarmerStock"("farmerId", "productId");

-- AddForeignKey
ALTER TABLE "FarmerStock" ADD CONSTRAINT "FarmerStock_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerStock" ADD CONSTRAINT "FarmerStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerStockMovement" ADD CONSTRAINT "FarmerStockMovement_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerStockMovement" ADD CONSTRAINT "FarmerStockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerStockMovement" ADD CONSTRAINT "FarmerStockMovement_refDeliveryId_fkey" FOREIGN KEY ("refDeliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
