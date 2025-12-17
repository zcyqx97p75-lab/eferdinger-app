# Railway-Datenbank im Browser öffnen - GARANTIERT

## ⚠️ Problem
Prisma Studio verwendet die lokale DATABASE_URL aus `.env`, auch wenn wir die Environment-Variable setzen.

## ✅ Lösung: Script verwenden

**Das Script umbenennt temporär die .env Datei, damit Prisma Studio die Railway-URL verwendet:**

```bash
cd ~/eferdinger-app
bash open-railway-prisma-studio.sh
```

**Was das Script macht:**
1. Benennt `.env` temporär zu `.env.local.backup` um
2. Setzt die Railway DATABASE_URL
3. Startet Prisma Studio
4. Nach dem Beenden: Stellt `.env` wieder her

## 🔍 Prüfen, ob es die Railway-DB ist

**Nach dem Start von Prisma Studio:**
1. Öffne die **User-Tabelle**
2. Suche nach dem User mit E-Mail `testbauer@gmail.com` (oder deinem Testbetrieb)
3. Wenn dieser User sichtbar ist → **Railway-Datenbank** ✅
4. Wenn dieser User NICHT sichtbar ist → **Lokale Datenbank** ❌

## 🚀 Alternative: Manuell

Falls das Script nicht funktioniert:

### Schritt 1: .env temporär umbenennen
```bash
cd ~/eferdinger-app
mv .env .env.local.backup
```

### Schritt 2: Railway DATABASE_URL setzen und Prisma Studio starten
```bash
export DATABASE_URL="postgresql://postgres:VqSvpoxRMcAhrALScFnGlTeauPiZqKch@gondola.proxy.rlwy.net:32682/railway"
export DIRECT_URL="postgresql://postgres:VqSvpoxRMcAhrALScFnGlTeauPiZqKch@gondola.proxy.rlwy.net:32682/railway"
npx prisma studio
```

### Schritt 3: Nach dem Beenden: .env wiederherstellen
```bash
# Drücke Ctrl+C im Terminal, um Prisma Studio zu beenden
# Dann:
mv .env.local.backup .env
```

## 🧪 Test: Welche Datenbank wird verwendet?

**In Prisma Studio:**
1. Gehe zur **User-Tabelle**
2. Zähle die Anzahl der User
3. Gehe zur **Farmer-Tabelle**
4. Zähle die Anzahl der Farmer

**Vergleiche mit:**
- **Lokale DB:** Weniger User/Farmer (nur lokale Testdaten)
- **Railway DB:** Mehr User/Farmer (inkl. Testbetrieb, der online erstellt wurde)

## 💡 Tipp

Wenn du sicherstellen willst, dass es die Railway-DB ist:
- Erstelle einen eindeutigen Test-User online (z.B. "Testbetrieb Railway")
- Dann öffne Prisma Studio
- Wenn dieser User sichtbar ist → Railway-DB ✅

