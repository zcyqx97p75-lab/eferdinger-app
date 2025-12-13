-- Robuste Hotfix-Migration: fügt fehlende Spalten/Enums hinzu und entfernt Variety sauber

-- 1) CookingType-Enum sicherstellen
DO $$ BEGIN
  CREATE TYPE "CookingType" AS ENUM ('FESTKOCHEND','VORWIEGEND_FESTKOCHEND','MEHLIG');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Spalten für Product sicherstellen
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "cookingType" "CookingType";
ALTER TABLE "Product" ALTER COLUMN "cookingType" SET DEFAULT 'VORWIEGEND_FESTKOCHEND';
UPDATE "Product" SET "cookingType" = 'VORWIEGEND_FESTKOCHEND' WHERE "cookingType" IS NULL;
ALTER TABLE "Product" ALTER COLUMN "cookingType" SET NOT NULL;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "unitKg" INTEGER;
UPDATE "Product" SET "unitKg" = 1 WHERE "unitKg" IS NULL;
ALTER TABLE "Product" ALTER COLUMN "unitKg" SET NOT NULL;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "unitsPerColli" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "collisPerPallet" INTEGER;

-- 3) PackagingType-Enum und Spalte (nur wenn Schema wirklich Enum nutzt)
DO $$ BEGIN
  CREATE TYPE "PackagingType" AS ENUM ('NETZ','KARTON','KISTE','VERTPACK','PE_BEUTEL','LOSE','GROSSKISTEN','BIGBAG');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packagingType" "PackagingType";

-- 4) Variety-Verknüpfung entfernen (falls vorhanden)
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_varietyId_fkey";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "varietyId";

-- Optional: Variety-Tabelle entfernen, wenn nicht mehr benötigt
DROP TABLE IF EXISTS "Variety";
