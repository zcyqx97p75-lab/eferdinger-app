import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Synchronisiere User-ID-Sequenz...");

  try {
    // Hole die höchste vorhandene User-ID
    const maxUser = await prisma.user.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });

    const maxId = maxUser?.id || 0;
    console.log(`📊 Höchste vorhandene User-ID: ${maxId}`);

    // Setze die Sequenz auf den höchsten Wert + 1
    // (damit der nächste User eine ID > maxId bekommt)
    const nextId = maxId + 1;
    
    // Führe SQL-Befehl aus, um die Sequenz zu setzen
    await prisma.$executeRawUnsafe(
      `SELECT setval('"User_id_seq"', $1, true)`,
      nextId
    );

    // Prüfe die aktuelle Sequenz-Position
    const result = await prisma.$queryRawUnsafe<Array<{ currval: bigint }>>(
      `SELECT currval('"User_id_seq"') as currval`
    );

    console.log(`✅ Sequenz synchronisiert! Nächste User-ID wird sein: ${result[0]?.currval || nextId}`);
  } catch (error: any) {
    console.error("❌ Fehler beim Synchronisieren der Sequenz:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

