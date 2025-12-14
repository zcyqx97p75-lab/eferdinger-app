# Schnellzugriff auf Railway Datenbank

## Methode 1: Einfacher Terminal-Befehl (Empfohlen)

### Schritt 1: DATABASE_URL aus Railway kopieren

1. Gehe zu: https://railway.app
2. Klicke auf deinen **PostgreSQL Service**
3. Klicke auf **"Variables"** Tab
4. Kopiere den Wert von **`DATABASE_PUBLIC_URL`** (oder `DATABASE_URL`)

### Schritt 2: Terminal-Befehl ausführen

**Kopiere diesen Befehl und ersetze `[DEINE_URL]` mit der kopierten URL:**

```bash
cd ~/eferdinger-app && export DATABASE_URL="[DEINE_URL]" && npx prisma studio
```

**Beispiel:**
```bash
cd ~/eferdinger-app && export DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" && npx prisma studio
```

---

## Methode 2: Script verwenden

1. Öffne die Datei: `connect-database.sh`
2. Ersetze `[DEINE_DATABASE_URL_HIER]` mit deiner Railway DATABASE_URL
3. Führe aus:

```bash
bash ~/eferdinger-app/connect-database.sh
```

---

## Wo finde ich die DATABASE_URL in Railway?

1. **Railway Dashboard** → Klicke auf deinen **PostgreSQL Service**
2. Klicke auf **"Variables"** Tab
3. Suche nach:
   - **`DATABASE_PUBLIC_URL`** ← **Diese verwenden!** (für externe Verbindungen)
   - Oder `DATABASE_URL` (falls PUBLIC_URL nicht vorhanden)

4. **Klicke auf das Icon** neben dem Wert, um zu kopieren

---

## Format der URL

Die URL sieht so aus:
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require
```

**Wichtig:** Die URL sollte `?sslmode=require` am Ende haben!

---

## Nach dem Start

Prisma Studio öffnet sich automatisch im Browser:
👉 **http://localhost:5555**

Dort siehst du alle Tabellen und kannst Daten ansehen/bearbeiten.

---

## Beenden

Drücke **Ctrl+C** im Terminal, um Prisma Studio zu beenden.

