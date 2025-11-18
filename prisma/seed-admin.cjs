require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const email = 'admin@eferdinger.at';   // hier kannst du DEINE Mail einsetzen
    const name  = 'Admin';                  // hier optional deinen Namen
    const pass  = '12345';                  // Testpasswort (später bcrypt)

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, password: pass, role: 'EG_ADMIN', farmerId: null },
      create: { email, name, password: pass, role: 'EG_ADMIN', farmerId: null },
    });

    console.log('Admin OK, id =', user.id, 'role =', user.role);
  } catch (e) {
    console.error('SEED FEHLER:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
