import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { execSync } from "child_process";

const prisma = new PrismaClient();

async function main() {
  console.log("📤 Exportiere lokale Datenbank...");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL nicht gefunden in .env");
    process.exit(1);
  }

  console.log(`🔗 Verwende DATABASE_URL: ${dbUrl.substring(0, 30)}...`);

  try {
    // Verwende pg_dump über execSync
    // Entferne Query-Parameter, die Probleme verursachen könnten
    const cleanUrl = dbUrl.split("?")[0];
    
    console.log("📥 Führe pg_dump aus...");
    const dump = execSync(`pg_dump "${cleanUrl}" --no-owner --no-acl --clean --if-exists`, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024, // 10MB Buffer
    });

    fs.writeFileSync("local-db-export.sql", dump, "utf8");
    
    const stats = fs.statSync("local-db-export.sql");
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ Datenbank exportiert nach: local-db-export.sql`);
    console.log(`📊 Dateigröße: ${fileSizeInMB} MB`);
  } catch (error: any) {
    console.error("❌ Fehler beim Exportieren:", error.message);
    console.error("");
    console.error("💡 Stelle sicher, dass:");
    console.error("   1. PostgreSQL-Tools installiert sind (brew install postgresql)");
    console.error("   2. DATABASE_URL in .env korrekt ist");
    console.error("   3. Du Zugriff auf die lokale Datenbank hast");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

