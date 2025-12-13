-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('MARKETING', 'BUREAUCRACY', 'FIXED_COSTS', 'PACKAGING_MATERIAL', 'REPAIRS', 'OTHER_VARIABLE');

-- CreateEnum
CREATE TYPE "CostValueType" AS ENUM ('ABSOLUTE', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "ManualCost" (
    "id" SERIAL NOT NULL,
    "costType" "CostType" NOT NULL,
    "description" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "packPlantId" INTEGER,
    "valueType" "CostValueType" NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "calculatedAmount" DECIMAL(12,2),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "ManualCost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ManualCost" ADD CONSTRAINT "ManualCost_packPlantId_fkey" FOREIGN KEY ("packPlantId") REFERENCES "PackPlant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualCost" ADD CONSTRAINT "ManualCost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
