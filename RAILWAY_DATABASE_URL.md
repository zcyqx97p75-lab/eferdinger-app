# Railway Database URL - Welche Variable verwenden?

## ✅ Empfehlung: `DATABASE_URL`

**Verwende `DATABASE_URL`** - Das ist die Standard-Variable, die Railway automatisch für PostgreSQL-Services bereitstellt.

## Railway PostgreSQL Environment Variables

Wenn du einen PostgreSQL-Service in Railway erstellst, stellt Railway automatisch folgende Variablen bereit:

### 1. `DATABASE_URL` (Empfohlen)
- **Interne Connection String** (optimiert für Service-zu-Service)
- **Format:** `postgresql://user:password@host:port/database`
- **Verwendung:** Für Backend-Services im gleichen Railway Project
- **Template-Variable:** `${{Postgres.DATABASE_URL}}`

### 2. `DATABASE_PRIVATE_URL` (Optional)
- Ähnlich wie `DATABASE_URL`, aber explizit als "private" markiert
- **Template-Variable:** `${{Postgres.DATABASE_PRIVATE_URL}}`

### 3. `DATABASE_PUBLIC_URL` (Für externe Verbindungen)
- **Öffentliche Connection String** (für externe Tools wie Prisma Studio)
- Nur verwenden, wenn du von außerhalb Railway verbinden musst
- **Template-Variable:** `${{Postgres.DATABASE_PUBLIC_URL}}`

## ✅ Für dein Backend: `DATABASE_URL`

**Verwende diese Environment Variables:**

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
```

**Warum beide gleich?**
- `DATABASE_URL` - Standard für Prisma Client
- `DIRECT_URL` - Für Prisma Migrate (benötigt direkte DB-Verbindung)
- Beide sollten auf die gleiche URL zeigen

## 🔍 Wie findest du die richtige Variable?

1. **Im Railway Dashboard:**
   - Gehe zu deinem PostgreSQL-Service
   - Klicke auf **"Variables"** Tab
   - Du siehst alle verfügbaren Variablen:
     - `DATABASE_URL`
     - `DATABASE_PRIVATE_URL`
     - `DATABASE_PUBLIC_URL`
     - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

2. **Template-Variablen verwenden:**
   - Im Backend-Service → Variables
   - Füge hinzu: `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - Railway ersetzt automatisch `Postgres` mit dem Namen deines PostgreSQL-Services

## ⚠️ Wichtig: Service-Name

Wenn dein PostgreSQL-Service einen anderen Namen hat (z.B. "PostgreSQL" oder "db"), musst du den Namen anpassen:

```
DATABASE_URL=${{PostgreSQL.DATABASE_URL}}  ← Wenn Service "PostgreSQL" heißt
DATABASE_URL=${{db.DATABASE_URL}}          ← Wenn Service "db" heißt
```

## ✅ Zusammenfassung

**Verwende:**
- ✅ `DATABASE_URL=${{Postgres.DATABASE_URL}}` für Backend
- ✅ `DIRECT_URL=${{Postgres.DATABASE_URL}}` für Prisma Migrate

**Nicht verwenden:**
- ❌ `DATABASE_PUBLIC_URL` (nur für externe Verbindungen)
- ❌ `DATABASE_PRIVATE_URL` (optional, aber nicht nötig)

## 🎯 Quick Setup

Im Backend-Service → Variables:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
```

**Fertig!** Railway verbindet automatisch.

