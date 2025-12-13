// prisma/seed-organisator.cjs

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "ewald.mayr@gemuese-mayr.at"; // dein Login
  const password = "12345";                   // dein Wunschpasswort

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Ewald Mayr",
      passwordHash: hashed,   // Feldname wie in deinem Prisma-Schema
      role: "ORGANISATOR",    // exakt wie im Prisma-Enum
    },
  });

  console.log("User angelegt/aktualisiert:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });