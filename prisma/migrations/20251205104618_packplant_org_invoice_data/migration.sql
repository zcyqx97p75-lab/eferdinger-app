/*
  Warnings:

  - You are about to drop the column `customerId` on the `AccountingDocument` table. All the data in the column will be lost.
  - You are about to drop the column `packStationId` on the `AccountingDocument` table. All the data in the column will be lost.
  - Made the column `vatId` on table `PackPlant` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AccountingDocument" DROP CONSTRAINT "AccountingDocument_customerId_fkey";

-- DropForeignKey
ALTER TABLE "AccountingDocument" DROP CONSTRAINT "AccountingDocument_packStationId_fkey";

-- AlterTable
ALTER TABLE "AccountingDocument" DROP COLUMN "customerId",
DROP COLUMN "packStationId",
ADD COLUMN     "issuerOrganizationId" INTEGER,
ADD COLUMN     "recipientCustomerId" INTEGER,
ADD COLUMN     "recipientFarmerId" INTEGER,
ADD COLUMN     "recipientPackPlantId" INTEGER;

-- AlterTable
ALTER TABLE "PackPlant" ADD COLUMN     "email" TEXT DEFAULT '',
ADD COLUMN     "fax" TEXT DEFAULT '',
ADD COLUMN     "phone" TEXT DEFAULT '',
ADD COLUMN     "website" TEXT DEFAULT '',
ALTER COLUMN "vatId" SET NOT NULL,
ALTER COLUMN "vatId" SET DEFAULT '';

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "vatId" TEXT NOT NULL DEFAULT '',
    "phone" TEXT DEFAULT '',
    "fax" TEXT DEFAULT '',
    "email" TEXT DEFAULT '',
    "website" TEXT DEFAULT '',
    "addressId" INTEGER,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocument" ADD CONSTRAINT "AccountingDocument_issuerOrganizationId_fkey" FOREIGN KEY ("issuerOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocument" ADD CONSTRAINT "AccountingDocument_recipientPackPlantId_fkey" FOREIGN KEY ("recipientPackPlantId") REFERENCES "PackPlant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocument" ADD CONSTRAINT "AccountingDocument_recipientFarmerId_fkey" FOREIGN KEY ("recipientFarmerId") REFERENCES "Farmer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDocument" ADD CONSTRAINT "AccountingDocument_recipientCustomerId_fkey" FOREIGN KEY ("recipientCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
