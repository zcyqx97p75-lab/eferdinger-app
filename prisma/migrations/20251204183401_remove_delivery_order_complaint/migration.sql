/*
  Warnings:

  - You are about to drop the column `refDeliveryId` on the `FarmerStockMovement` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `PackagingRun` table. All the data in the column will be lost.
  - You are about to drop the `Delivery` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PackStationComplaint` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_productId_fkey";

-- DropForeignKey
ALTER TABLE "FarmerStockMovement" DROP CONSTRAINT "FarmerStockMovement_refDeliveryId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_productId_fkey";

-- DropForeignKey
ALTER TABLE "PackStationComplaint" DROP CONSTRAINT "PackStationComplaint_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "PackStationComplaint" DROP CONSTRAINT "PackStationComplaint_stockMovementId_fkey";

-- DropForeignKey
ALTER TABLE "PackagingRun" DROP CONSTRAINT "PackagingRun_orderId_fkey";

-- AlterTable
ALTER TABLE "FarmerStockMovement" DROP COLUMN "refDeliveryId";

-- AlterTable
ALTER TABLE "PackagingRun" DROP COLUMN "orderId";

-- DropTable
DROP TABLE "Delivery";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "PackStationComplaint";

-- DropEnum
DROP TYPE "OrderStatus";
