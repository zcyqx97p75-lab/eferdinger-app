"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const email = "admin"; // das gibst du im Login-Feld "E-Mail" ein
    const passwordHash = "$2b$10$EEjqshVqvmKQtUSuOLyYzOsZxC9GlEwefuqPNP5czEVtZ/L/PegS2"; // "admin"
    // Prüfen, ob es den Benutzer schon gibt
    const existing = await prisma.user.findUnique({
        where: { email },
    });
    if (existing) {
        console.log("Admin-Benutzer existiert bereits:", existing);
        return;
    }
    const user = await prisma.user.create({
        data: {
            email,
            password: passwordHash,
            name: "Administrator",
            role: "EG_ADMIN",
        },
    });
    console.log("Admin-Benutzer angelegt:", user);
}
main()
    .catch((e) => {
    console.error("Fehler beim Anlegen des Admin-Benutzers:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
