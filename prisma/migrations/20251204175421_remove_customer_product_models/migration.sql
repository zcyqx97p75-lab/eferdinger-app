/*
  Warnings:

  - You are about to drop the `CustomerProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerProductPrice` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CustomerProduct" DROP CONSTRAINT "CustomerProduct_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerProduct" DROP CONSTRAINT "CustomerProduct_productId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerProductPrice" DROP CONSTRAINT "CustomerProductPrice_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerProductPrice" DROP CONSTRAINT "CustomerProductPrice_productId_fkey";

-- DropTable
DROP TABLE "CustomerProduct";

-- DropTable
DROP TABLE "CustomerProductPrice";
