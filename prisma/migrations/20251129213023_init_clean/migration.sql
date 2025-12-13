/*
  Warnings:

  - The values [NETZ] on the enum `PackagingType` will be removed. If these variants are still used in the database, this will fail.
  - The values [PACKER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `productId` on the `FarmerStock` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `FarmerStockMovement` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Product` table. All the data in the column will be lost.
  - The `packagingType` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `WashingRun` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `Farmer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[farmerId,varietyId]` on the table `FarmerStock` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `farmerNameSnapshot` to the `FarmerStock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `varietyId` to the `FarmerStock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `varietyNameSnapshot` to the `FarmerStock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `farmerNameSnapshot` to the `FarmerStockMovement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `varietyId` to the `FarmerStockMovement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `varietyNameSnapshot` to the `FarmerStockMovement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `farmerId` to the `PackagingRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `farmerNameSnapshot` to the `PackagingRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finishedKg` to the `PackagingRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packStationId` to the `PackagingRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packStationNameSnapshot` to the `PackagingRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productNameSnapshot` to the `PackagingRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rawInputKg` to the `PackagingRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `varietyId` to the `PackagingRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `varietyNameSnapshot` to the `PackagingRun` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VarietyQuality" AS ENUM ('Q1', 'Q2', 'UEBERGROESSE');

-- AlterEnum
BEGIN;
CREATE TYPE "PackagingType_new" AS ENUM ('NETZSACK', 'CLIPNETZ', 'KISTE', 'KARTON', 'VERTPACK', 'PE_BEUTEL', 'LOSE', 'GROSSKISTEN', 'BIGBAG');
ALTER TABLE "Product" ALTER COLUMN "packagingType" TYPE "PackagingType_new" USING ("packagingType"::text::"PackagingType_new");
ALTER TYPE "PackagingType" RENAME TO "PackagingType_old";
ALTER TYPE "PackagingType_new" RENAME TO "PackagingType";
DROP TYPE "public"."PackagingType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ORGANISATOR', 'FARMER', 'PACKSTELLE', 'PACKBETRIEB', 'EG_ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "FarmerStock" DROP CONSTRAINT "FarmerStock_productId_fkey";

-- DropForeignKey
ALTER TABLE "FarmerStockMovement" DROP CONSTRAINT "FarmerStockMovement_productId_fkey";

-- DropForeignKey
ALTER TABLE "WashingRun" DROP CONSTRAINT "WashingRun_productId_fkey";

-- DropIndex
DROP INDEX "FarmerStock_farmerId_productId_key";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "addressId" INTEGER,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "vatId" TEXT;

-- AlterTable
ALTER TABLE "Farmer" ADD COLUMN     "addressId" INTEGER,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "ggn" TEXT,
ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "FarmerStock" DROP COLUMN "productId",
ADD COLUMN     "farmerAddressSnapshot" TEXT,
ADD COLUMN     "farmerGgnSnapshot" TEXT,
ADD COLUMN     "farmerNameSnapshot" TEXT NOT NULL,
ADD COLUMN     "varietyId" INTEGER NOT NULL,
ADD COLUMN     "varietyNameSnapshot" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FarmerStockMovement" DROP COLUMN "productId",
ADD COLUMN     "farmerAddressSnapshot" TEXT,
ADD COLUMN     "farmerGgnSnapshot" TEXT,
ADD COLUMN     "farmerNameSnapshot" TEXT NOT NULL,
ADD COLUMN     "fieldName" TEXT,
ADD COLUMN     "harvestDate" TIMESTAMP(3),
ADD COLUMN     "varietyId" INTEGER NOT NULL,
ADD COLUMN     "varietyNameSnapshot" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PackagingRun" ADD COLUMN     "farmerId" INTEGER NOT NULL,
ADD COLUMN     "farmerNameSnapshot" TEXT NOT NULL,
ADD COLUMN     "finishedKg" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "packStationId" INTEGER NOT NULL,
ADD COLUMN     "packStationNameSnapshot" TEXT NOT NULL,
ADD COLUMN     "productNameSnapshot" TEXT NOT NULL,
ADD COLUMN     "rawInputKg" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "varietyId" INTEGER NOT NULL,
ADD COLUMN     "varietyNameSnapshot" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "isActive",
ALTER COLUMN "cookingType" DROP DEFAULT,
DROP COLUMN "packagingType",
ADD COLUMN     "packagingType" "PackagingType";

-- DropTable
DROP TABLE "WashingRun";

-- CreateTable
CREATE TABLE "Address" (
    "id" SERIAL NOT NULL,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variety" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cookingType" "CookingType" NOT NULL,
    "quality" "VarietyQuality" NOT NULL,

    CONSTRAINT "Variety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackStation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PackStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackStationStock" (
    "id" SERIAL NOT NULL,
    "packStationId" INTEGER NOT NULL,
    "farmerId" INTEGER NOT NULL,
    "varietyId" INTEGER NOT NULL,
    "quantityKg" DECIMAL(65,30) NOT NULL,
    "packStationNameSnapshot" TEXT NOT NULL,
    "farmerNameSnapshot" TEXT NOT NULL,
    "varietyNameSnapshot" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "farmerAddressSnapshot" TEXT,
    "farmerGgnSnapshot" TEXT,

    CONSTRAINT "PackStationStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackStationStockMovement" (
    "id" SERIAL NOT NULL,
    "packStationId" INTEGER NOT NULL,
    "farmerId" INTEGER NOT NULL,
    "varietyId" INTEGER NOT NULL,
    "changeKg" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "packStationNameSnapshot" TEXT NOT NULL,
    "farmerNameSnapshot" TEXT NOT NULL,
    "varietyNameSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "farmerAddressSnapshot" TEXT,
    "farmerGgnSnapshot" TEXT,

    CONSTRAINT "PackStationStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackPlant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PackPlant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackPlantStock" (
    "id" SERIAL NOT NULL,
    "packPlantId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantityUnits" INTEGER NOT NULL,
    "packPlantNameSnapshot" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cookingTypeSnapshot" "CookingType",

    CONSTRAINT "PackPlantStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackPlantStockMovement" (
    "id" SERIAL NOT NULL,
    "packPlantId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "changeUnits" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "packPlantNameSnapshot" TEXT,
    "productNameSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" INTEGER,
    "customerNameSnapshot" TEXT,
    "pricePerUnitSnapshot" DECIMAL(65,30),
    "totalPriceSnapshot" DECIMAL(65,30),
    "cookingTypeSnapshot" "CookingType",

    CONSTRAINT "PackPlantStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryPlan" (
    "id" SERIAL NOT NULL,
    "farmerId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "cookingType" "CookingType" NOT NULL,
    "plannedKg" DECIMAL(65,30) NOT NULL,
    "farmerNameSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProductPrice" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "pricePerUnit" DECIMAL(10,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSale" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "customerId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantityUnits" INTEGER NOT NULL,
    "quantityKg" DECIMAL(12,3),
    "unitPrice" DECIMAL(10,3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackStationStock_packStationId_farmerId_varietyId_key" ON "PackStationStock"("packStationId", "farmerId", "varietyId");

-- CreateIndex
CREATE UNIQUE INDEX "PackPlantStock_packPlantId_productId_key" ON "PackPlantStock"("packPlantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPlan_farmerId_year_week_cookingType_key" ON "DeliveryPlan"("farmerId", "year", "week", "cookingType");

-- CreateIndex
CREATE INDEX "CustomerProductPrice_customerId_productId_validFrom_idx" ON "CustomerProductPrice"("customerId", "productId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Farmer_email_key" ON "Farmer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerStock_farmerId_varietyId_key" ON "FarmerStock"("farmerId", "varietyId");

-- AddForeignKey
ALTER TABLE "Farmer" ADD CONSTRAINT "Farmer_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingRun" ADD CONSTRAINT "PackagingRun_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingRun" ADD CONSTRAINT "PackagingRun_packStationId_fkey" FOREIGN KEY ("packStationId") REFERENCES "PackStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingRun" ADD CONSTRAINT "PackagingRun_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerStock" ADD CONSTRAINT "FarmerStock_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerStockMovement" ADD CONSTRAINT "FarmerStockMovement_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackStationStock" ADD CONSTRAINT "PackStationStock_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackStationStock" ADD CONSTRAINT "PackStationStock_packStationId_fkey" FOREIGN KEY ("packStationId") REFERENCES "PackStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackStationStock" ADD CONSTRAINT "PackStationStock_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackStationStockMovement" ADD CONSTRAINT "PackStationStockMovement_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackStationStockMovement" ADD CONSTRAINT "PackStationStockMovement_packStationId_fkey" FOREIGN KEY ("packStationId") REFERENCES "PackStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackStationStockMovement" ADD CONSTRAINT "PackStationStockMovement_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackPlantStock" ADD CONSTRAINT "PackPlantStock_packPlantId_fkey" FOREIGN KEY ("packPlantId") REFERENCES "PackPlant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackPlantStock" ADD CONSTRAINT "PackPlantStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackPlantStockMovement" ADD CONSTRAINT "PackPlantStockMovement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackPlantStockMovement" ADD CONSTRAINT "PackPlantStockMovement_packPlantId_fkey" FOREIGN KEY ("packPlantId") REFERENCES "PackPlant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackPlantStockMovement" ADD CONSTRAINT "PackPlantStockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryPlan" ADD CONSTRAINT "DeliveryPlan_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProductPrice" ADD CONSTRAINT "CustomerProductPrice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProductPrice" ADD CONSTRAINT "CustomerProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSale" ADD CONSTRAINT "CustomerSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSale" ADD CONSTRAINT "CustomerSale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
