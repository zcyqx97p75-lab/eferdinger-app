-- AlterTable
ALTER TABLE "FarmerStockMovement" ADD COLUMN     "varietyQuality" "VarietyQuality";

-- AlterTable
ALTER TABLE "PackStationStockMovement" ADD COLUMN     "varietyQuality" "VarietyQuality";

-- CreateTable
CREATE TABLE "VarietyQualityPrice" (
    "id" SERIAL NOT NULL,
    "quality" "VarietyQuality" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "pricePerKg" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VarietyQualityPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VarietyQualityPrice_quality_validFrom_idx" ON "VarietyQualityPrice"("quality", "validFrom");
