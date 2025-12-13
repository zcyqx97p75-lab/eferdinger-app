import { PrismaClient, CookingType, VarietyQuality } from "@prisma/client";

const prisma = new PrismaClient();

const varieties: Array<{
  name: string;
  cookingType: CookingType;
  quality: VarietyQuality;
}> = [
  // Festkochend
  { name: "Agata", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Alexandra", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Annabelle", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Anuschka", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Avanti", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Glorietta", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Lea", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Primabella", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Musica", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Montana", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Nola", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Belana", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Evita", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Goldmarie", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Gourmetessa", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Graziosa", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "La vie", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Linzer Delikatess", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Monique", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Nagl. Kipfler", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Princess", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Sissi", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Allians", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Annalena", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Bernina", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Emiliana", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Emanuelle", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Ditta", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Jule", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Nicola", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Regina", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Simonetta", cookingType: "FESTKOCHEND", quality: "Q1" },
  { name: "Heiderot", cookingType: "FESTKOCHEND", quality: "Q1" },

  // Vorwiegend festkochend
  { name: "Berber", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Colomba", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Finka", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Libra", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Impala", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Paroli", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Solist", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Sunita", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "4 you", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Christel", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Valdivia", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Gala", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Corinna", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Juventa", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Larissa", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Marabel", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Wega", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Franca", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Tosca", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Benjamin", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Herbstgold", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Taormina", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Gaya", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Laura", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Merle", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Otolia", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Madeira", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Blaue St. Galler", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Violet Star", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },
  { name: "Fred", cookingType: "VORWIEGEND_FESTKOCHEND", quality: "Q1" },

  // Mehlig
  { name: "Afra", cookingType: "MEHLIG", quality: "Q1" },
  { name: "Agria", cookingType: "MEHLIG", quality: "Q1" },
  { name: "Bosco", cookingType: "MEHLIG", quality: "Q1" },
  { name: "Karelia", cookingType: "MEHLIG", quality: "Q1" },
  { name: "Lilly", cookingType: "MEHLIG", quality: "Q1" },
  { name: "Melody", cookingType: "MEHLIG", quality: "Q1" },
  { name: "Nixe", cookingType: "MEHLIG", quality: "Q1" },
];

async function main() {
  console.log("Starte Import der Sorten...");

  const created: any[] = [];
  const skipped: any[] = [];
  const errors: any[] = [];

  for (const v of varieties) {
    try {
      // Prüfe, ob Sorte bereits existiert
      const existing = await prisma.variety.findFirst({
        where: {
          name: v.name,
          cookingType: v.cookingType as CookingType,
        },
      });

      if (existing) {
        skipped.push({ name: v.name, cookingType: v.cookingType });
        continue;
      }

      const variety = await prisma.variety.create({
        data: {
          name: v.name,
          cookingType: v.cookingType as CookingType,
          quality: v.quality as VarietyQuality,
        },
      });

      created.push(variety);
      console.log(`✓ ${v.name} (${v.cookingType}) angelegt`);
    } catch (err: any) {
      errors.push({ name: v.name, error: err.message });
      console.error(`✗ Fehler bei ${v.name}:`, err.message);
    }
  }

  console.log("\n=== Zusammenfassung ===");
  console.log(`Erstellt: ${created.length}`);
  console.log(`Übersprungen (existiert bereits): ${skipped.length}`);
  console.log(`Fehler: ${errors.length}`);

  if (skipped.length > 0) {
    console.log("\nÜbersprungene Sorten:");
    skipped.forEach(s => console.log(`  - ${s.name} (${s.cookingType})`));
  }

  if (errors.length > 0) {
    console.log("\nFehler:");
    errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
  }
}

main()
  .catch((e) => {
    console.error("Fehler beim Import:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

