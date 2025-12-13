-- CreateEnum
CREATE TYPE "SortierGroesse" AS ENUM ('DRILLINGE', 'SIZE_35_55', 'SIZE_55_65', 'SIZE_65_70', 'UEBERGROESSEN');

-- AlterTable
ALTER TABLE "FarmerStockMovement" ADD COLUMN     "sortierGroesse" "SortierGroesse";

-- AlterTable
ALTER TABLE "PackStationStockMovement" ADD COLUMN     "sortierGroesse" "SortierGroesse";
