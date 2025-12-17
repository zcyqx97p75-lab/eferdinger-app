# Railway-Datenbank mit lokaler Datenbank synchronisieren

## 🎯 Ziel
Die lokale Datenbank (die gut funktioniert) 1:1 auf Railway hochladen.

## ⚠️ WICHTIG
**Dies löscht ALLE Daten in der Railway-Datenbank!** Stelle sicher, dass du die Railway-DATABASE_PUBLIC_URL hast.

## 📋 Schritt-für-Schritt Anleitung

### Option 1: Automatisches Skript (Empfohlen)

```bash
cd ~/eferdinger-app
bash scripts/reset-railway-db.sh
```

Das Skript führt automatisch aus:
1. Export der lokalen Datenbank
2. Löschen der Railway-Datenbank
3. Import der lokalen Datenbank nach Railway
4. Hinweis zur Sequenz-Synchronisierung

### Option 2: Manuelle Schritte

#### Schritt 1: Lokale Datenbank exportieren

```bash
cd ~/eferdinger-app
bash scripts/export-local-db.sh
```

Dies erstellt eine Datei `local-db-export.sql` mit allen Daten.

#### Schritt 2: Railway-Datenbank importieren

```bash
cd ~/eferdinger-app
bash scripts/import-to-railway.sh
```

Das Skript fragt nach der Railway DATABASE_PUBLIC_URL und importiert dann die Daten.

#### Schritt 3: Sequenzen synchronisieren

Nach dem Import müssen die ID-Sequenzen synchronisiert werden:

**Lokal (mit Railway-DATABASE_URL):**
```bash
export DATABASE_URL="[DEINE_RAILWAY_DATABASE_PUBLIC_URL]"
npm run fix-all-sequences
```

**Oder warte**, bis der Server neu startet - die Sequenzen werden automatisch synchronisiert.

## 🔍 Railway DATABASE_PUBLIC_URL finden

1. Gehe zu: https://railway.app
2. Klicke auf deinen **PostgreSQL Service** (nicht Backend!)
3. Klicke auf **"Variables"** Tab
4. Kopiere den Wert von **`DATABASE_PUBLIC_URL`**

Die URL sieht so aus:
```
postgresql://postgres:PASSWORD@HOST:PORT/railway
```

## ✅ Nach dem Import

1. **Prüfe die Datenbank:**
   ```bash
   export DATABASE_URL="[RAILWAY_URL]"
   npx prisma studio
   ```

2. **Teste das Anlegen eines Bauern:**
   - Gehe zur Online-App
   - Versuche, einen neuen Bauern mit E-Mail und Passwort anzulegen
   - Prüfe, ob das Passwort korrekt gehasht wird

3. **Prüfe die Railway-Logs:**
   - Backend Service → Logs
   - Suche nach `🔐 Passwort-Info:` und `✅ Passwort wurde gehasht`

## 🚨 Falls etwas schief geht

Falls der Import fehlschlägt, kannst du die Railway-Datenbank auch komplett zurücksetzen:

1. Railway Dashboard → PostgreSQL Service
2. Klicke auf **"Data"** Tab
3. Klicke auf **"Reset Database"** (falls verfügbar)

Oder verwende Prisma Migrate:
```bash
export DATABASE_URL="[RAILWAY_URL]"
npx prisma migrate reset --force
npx prisma migrate deploy
```

Dann importiere die lokale Datenbank erneut.

