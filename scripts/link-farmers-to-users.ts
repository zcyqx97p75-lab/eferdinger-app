import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function linkFarmersToUsers() {
  console.log("🔍 Suche nach FARMER-Usern ohne farmerId...");

  try {
    // Finde alle FARMER-User ohne farmerId
    const farmersWithoutLink = await prisma.user.findMany({
      where: {
        role: "FARMER",
        farmerId: null,
      },
    });

    console.log(`📊 Gefunden: ${farmersWithoutLink.length} FARMER-User ohne farmerId`);

    if (farmersWithoutLink.length === 0) {
      console.log("✅ Alle FARMER-User sind bereits verknüpft!");
      return;
    }

    let linked = 0;
    let notFound = 0;

    for (const user of farmersWithoutLink) {
      console.log(`\n👤 Verarbeite User: ${user.name} (${user.email})`);

      // Versuche Farmer über E-Mail zu finden
      let farmer = await (prisma as any).farmer.findUnique({
        where: { email: user.email },
      });

      if (farmer) {
        console.log(`  ✅ Farmer gefunden über E-Mail: ${farmer.id} (${farmer.name})`);
      } else {
        // Fallback: Versuche Farmer über Name zu finden
        farmer = await (prisma as any).farmer.findFirst({
          where: { name: user.name },
        });

        if (farmer) {
          console.log(`  ✅ Farmer gefunden über Name: ${farmer.id} (${farmer.name})`);
        }
      }

      if (farmer) {
        // Verknüpfe User mit Farmer
        await prisma.user.update({
          where: { id: user.id },
          data: { farmerId: farmer.id },
        });
        console.log(`  ✅ User ${user.id} mit Farmer ${farmer.id} verknüpft`);
        linked++;
      } else {
        console.log(`  ⚠️  Kein Farmer gefunden für User ${user.id} (${user.email}, ${user.name})`);
        notFound++;
      }
    }

    console.log(`\n📊 Zusammenfassung:`);
    console.log(`  ✅ Verknüpft: ${linked}`);
    console.log(`  ⚠️  Nicht gefunden: ${notFound}`);
    console.log(`\n✅ Fertig!`);
  } catch (error) {
    console.error("❌ Fehler:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

linkFarmersToUsers()
  .then(() => {
    console.log("\n🎉 Script erfolgreich abgeschlossen!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script fehlgeschlagen:", error);
    process.exit(1);
  });


