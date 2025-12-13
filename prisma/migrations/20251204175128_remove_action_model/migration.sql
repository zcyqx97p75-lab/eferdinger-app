/*
  Warnings:

  - You are about to drop the column `actionId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `Action` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Action" DROP CONSTRAINT "Action_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_actionId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "actionId";

-- DropTable
DROP TABLE "Action";
