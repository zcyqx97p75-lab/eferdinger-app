import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixSequence(tableName: string, sequenceName: string) {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ max_id: bigint | null }>>(
      `SELECT MAX(id) as max_id FROM "${tableName}"`
    );
    
    const maxId = result[0]?.max_id ? Number(result[0].max_id) : 0;
    const nextId = maxId + 1;
    
    await prisma.$executeRawUnsafe(
      `SELECT setval('${sequenceName}', $1, true)`,
      nextId
    );
    
    console.log(`✅ ${tableName}: Sequenz auf ${nextId} gesetzt (max ID war ${maxId})`);
  } catch (error: any) {
    console.warn(`⚠️  ${tableName}: Sequenz-Synchronisierung übersprungen: ${error.message}`);
  }
}

async function main() {
  console.log("🔧 Synchronisiere alle ID-Sequenzen...");
  console.log("");

  // Alle Tabellen mit Auto-Increment IDs
  const sequences = [
    { table: "User", sequence: '"User_id_seq"' },
    { table: "Farmer", sequence: '"Farmer_id_seq"' },
    { table: "Customer", sequence: '"Customer_id_seq"' },
    { table: "Product", sequence: '"Product_id_seq"' },
    { table: "Variety", sequence: '"Variety_id_seq"' },
    { table: "Address", sequence: '"Address_id_seq"' },
    { table: "PackStation", sequence: '"PackStation_id_seq"' },
    { table: "PackPlant", sequence: '"PackPlant_id_seq"' },
    { table: "Organization", sequence: '"Organization_id_seq"' },
  ];

  for (const { table, sequence } of sequences) {
    await fixSequence(table, sequence);
  }

  console.log("");
  console.log("✅ Alle Sequenzen synchronisiert!");
}

main()
  .catch((error) => {
    console.error("❌ Fehler:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

