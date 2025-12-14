# Railway Datenbank-Zugriff

## Option 1: Prisma Studio (Empfohlen - Einfachste Methode)

### Schritt 1: DATABASE_URL setzen

```bash
cd ~/eferdinger-app
```

Setze die DATABASE_URL als Environment Variable:

```bash
export DATABASE_URL="postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com/eferdinger_db?sslmode=require"
```

**ODER** verwende die Railway-Datenbank-URL:

1. Gehe zu Railway Dashboard → PostgreSQL Service
2. Klicke auf "Variables"
3. Kopiere den Wert von `DATABASE_URL` oder `DATABASE_PUBLIC_URL`
4. Setze als Environment Variable:

```bash
export DATABASE_URL="[DEINE_RAILWAY_DATABASE_URL]"
```

### Schritt 2: Prisma Studio starten

```bash
cd ~/eferdinger-app
npx prisma studio
```

Prisma Studio öffnet sich automatisch im Browser unter: `http://localhost:5555`

**Fertig!** Du kannst jetzt alle Tabellen sehen und bearbeiten.

---

## Option 2: Railway PostgreSQL Dashboard

1. Gehe zu Railway Dashboard
2. Klicke auf deinen **PostgreSQL Service**
3. Klicke auf **"Data"** Tab
4. Railway zeigt eine einfache Datenbank-Ansicht

**Hinweis:** Diese Ansicht ist begrenzt, aber gut für schnelle Checks.

---

## Option 3: Externe Tools (pgAdmin, DBeaver, etc.)

### Connection Details:

**Host:** `dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com`  
**Port:** `5432`  
**Database:** `railway` (oder `eferdinger_db` - je nach Railway-Konfiguration)  
**Username:** `eferdinger_db_user`  
**Password:** [Dein Passwort]  
**SSL:** Required

### Railway Database URL finden:

1. Railway Dashboard → PostgreSQL Service
2. Variables → `DATABASE_PUBLIC_URL` oder `DATABASE_URL`
3. Die URL hat das Format:
   ```
   postgresql://user:password@host:port/database
   ```

---

## Option 4: Railway CLI (Falls installiert)

```bash
railway connect postgres
```

---

## Schnellste Methode: Prisma Studio

1. **DATABASE_URL setzen:**
   ```bash
   export DATABASE_URL="[DEINE_RAILWAY_DATABASE_URL]"
   ```

2. **Prisma Studio starten:**
   ```bash
   cd ~/eferdinger-app
   npx prisma studio
   ```

3. **Browser öffnet sich automatisch:** `http://localhost:5555`

---

## Wichtig: DATABASE_URL finden

### Im Railway Dashboard:

1. Gehe zu deinem **PostgreSQL Service**
2. Klicke auf **"Variables"** Tab
3. Suche nach:
   - `DATABASE_URL` (interne URL)
   - `DATABASE_PUBLIC_URL` (externe URL - für lokale Tools)

4. **Kopiere die URL** und verwende sie für Prisma Studio

### Format der URL:

```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require
```

---

## Troubleshooting

### "Can't reach database server"
- Prüfe, ob du `DATABASE_PUBLIC_URL` verwendest (nicht `DATABASE_URL`)
- Prüfe, ob SSL aktiviert ist (`?sslmode=require`)

### "Authentication failed"
- Prüfe Username und Passwort
- Prüfe, ob die URL korrekt kopiert wurde

### "Database does not exist"
- Prüfe den Datenbank-Namen in der URL
- Railway verwendet oft `railway` als Standard-Datenbankname

