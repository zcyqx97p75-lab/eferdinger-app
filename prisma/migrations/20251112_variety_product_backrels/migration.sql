-- AlterTable
ALTER TABLE "Product" DROP COLUMN "cookingType",
DROP COLUMN "isActive",
ADD COLUMN     "cratesPerPallet" INTEGER,
ADD COLUMN     "unitKg" INTEGER NOT NULL,
ADD COLUMN     "unitsPerCrate" INTEGER,
ADD COLUMN     "varietyId" INTEGER NOT NULL,
ALTER COLUMN "packagingType" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Variety" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cookingType" "CookingType" NOT NULL,

    CONSTRAINT "Variety_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Variety_name_key" ON "Variety"("name");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

