# Railway.app Deployment - Schritt für Schritt

## 🚀 Schnellstart

### 1. Repository auf Railway verbinden

1. Gehe zu https://railway.app
2. Klicke auf **"New Project"**
3. Wähle **"Deploy from GitHub repo"**
4. Wähle dein Repository: `zcyqx97p75-lab/eferdinger-app`
5. Railway erstellt automatisch ein neues Project

---

## 📦 Schritt 1: PostgreSQL-Datenbank hinzufügen

1. Im Railway Dashboard: Klicke auf **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway erstellt automatisch eine PostgreSQL-Datenbank
3. **WICHTIG:** Notiere dir die **Connection String** (wird später benötigt)

---

## 🔧 Schritt 2: Backend Service erstellen

1. Im Railway Dashboard: Klicke auf **"+ New"** → **"GitHub Repo"**
2. Wähle das gleiche Repository: `zcyqx97p75-lab/eferdinger-app`
3. Railway erkennt automatisch Node.js

### Backend-Konfiguration:

**Service Settings:**
- **Name:** `eferdinger-backend` (oder wie du willst)
- **Root Directory:** `/` (Root des Repositories)

**Build & Deploy:**
- Railway erkennt automatisch `package.json`
- **Build Command:** Wird automatisch erkannt (oder: `npm install && npm run build && npx prisma generate`)
- **Start Command:** `npm run prisma:migrate:deploy && npm start`

**Environment Variables:**
Klicke auf **"Variables"** und füge hinzu:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=${{PORT}}
```

**WICHTIG:** 
- ✅ **Verwende `DATABASE_URL`** (nicht `DATABASE_PUBLIC_URL`)
- `${{Postgres.DATABASE_URL}}` ist ein Railway-Template-Variable
- Ersetze `Postgres` mit dem Namen deines PostgreSQL-Services (normalerweise "Postgres")
- Railway stellt automatisch `DATABASE_URL` für PostgreSQL-Services bereit

**Health Check:**
- **Path:** `/api/health`
- **Timeout:** 100

---

## 🎨 Schritt 3: Frontend Service erstellen

1. Im gleichen Railway Project: Klicke auf **"+ New"** → **"GitHub Repo"**
2. Wähle das gleiche Repository: `zcyqx97p75-lab/eferdinger-app`

### Frontend-Konfiguration:

**Service Settings:**
- **Name:** `eferdinger-frontend`
- **Root Directory:** `/frontend` ⚠️ **WICHTIG!**

**Build & Deploy:**
- **Build Command:** `npm install && npm run build`
- **Output Directory:** `dist`
- **Service Type:** Wähle **"Static Web Service"** (nicht Web Service!)

**Environment Variables:**
```
VITE_API_URL=${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api
```

**WICHTIG:**
- `${{Backend.RAILWAY_PUBLIC_DOMAIN}}` ist ein Railway-Template-Variable
- Ersetze `Backend` mit dem Namen deines Backend-Services (z.B. "eferdinger-backend")

---

## 🔗 Schritt 4: Services verknüpfen

### Backend → PostgreSQL:
- Backend Service → **"Variables"** → `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- Railway verbindet automatisch

### Frontend → Backend:
- Frontend Service → **"Variables"** → `VITE_API_URL=${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api`
- Railway verbindet automatisch

---

## ✅ Schritt 5: Deployen

1. Railway startet automatisch den Build-Prozess
2. **Backend:** 
   - Build läuft (npm install, build, prisma generate)
   - Migrationen werden ausgeführt (`prisma migrate deploy`)
   - Server startet
3. **Frontend:**
   - Build läuft (npm install, build)
   - Static Files werden deployed

---

## 🌐 Schritt 6: URLs notieren

Nach erfolgreichem Deploy:

1. **Backend URL:** 
   - Gehe zu Backend Service → **"Settings"** → **"Generate Domain"**
   - Notiere dir die URL (z.B. `eferdinger-backend-production.up.railway.app`)

2. **Frontend URL:**
   - Gehe zu Frontend Service → **"Settings"** → **"Generate Domain"**
   - Notiere dir die URL (z.B. `eferdinger-frontend-production.up.railway.app`)

3. **Frontend Environment Variable aktualisieren:**
   - Frontend Service → **"Variables"**
   - Aktualisiere `VITE_API_URL` mit der tatsächlichen Backend-URL:
     ```
     VITE_API_URL=https://eferdinger-backend-production.up.railway.app/api
     ```
   - Frontend wird automatisch neu gebaut

---

## 🔍 Troubleshooting

### Backend startet nicht:
- Prüfe **"Logs"** im Backend Service
- Prüfe, ob `DATABASE_URL` korrekt gesetzt ist
- Prüfe, ob Migrationen erfolgreich waren

### Frontend zeigt keine Daten:
- Prüfe, ob `VITE_API_URL` korrekt gesetzt ist
- Prüfe Browser-Konsole auf CORS-Fehler
- Prüfe Backend-Logs auf Fehler

### Datenbank-Verbindung fehlgeschlagen:
- Prüfe, ob PostgreSQL-Service läuft
- Prüfe `DATABASE_URL` Format
- Prüfe, ob `${{Postgres.DATABASE_URL}}` korrekt aufgelöst wird

### Prisma-Fehler:
- Prüfe, ob `npx prisma generate` im Build läuft
- Prüfe, ob `prisma migrate deploy` im Start läuft
- Prüfe Prisma-Logs

---

## 📝 Wichtige Railway-Template-Variablen

Railway bietet automatische Template-Variablen:

- `${{ServiceName.DATABASE_URL}}` - Datenbank-Connection-String
- `${{ServiceName.RAILWAY_PUBLIC_DOMAIN}}` - Öffentliche Domain eines Services
- `${{ServiceName.PORT}}` - Port eines Services
- `${{ServiceName.RAILWAY_PRIVATE_DOMAIN}}` - Private Domain (für Service-zu-Service)

**Beispiel:**
- PostgreSQL-Service heißt "Postgres" → `${{Postgres.DATABASE_URL}}`
- Backend-Service heißt "eferdinger-backend" → `${{eferdinger-backend.RAILWAY_PUBLIC_DOMAIN}}`

---

## 🎯 Checkliste

- [ ] Repository auf Railway verbunden
- [ ] PostgreSQL-Datenbank erstellt
- [ ] Backend Service erstellt
- [ ] Backend Environment Variables gesetzt
- [ ] Frontend Service erstellt
- [ ] Frontend Root Directory auf `/frontend` gesetzt
- [ ] Frontend Environment Variables gesetzt
- [ ] Beide Services deployed
- [ ] URLs notiert
- [ ] Frontend `VITE_API_URL` mit Backend-URL aktualisiert
- [ ] App läuft online! 🎉

---

## 💰 Kosten

Railway Free Tier:
- $5 Credit/Monat kostenlos
- Danach Pay-as-you-go
- **Keine Kreditkarte nötig für Free Tier!**

---

## 🆘 Hilfe

Bei Problemen:
1. Prüfe die **Logs** in Railway Dashboard
2. Prüfe **Environment Variables**
3. Prüfe, ob alle Services laufen
4. Prüfe Railway-Dokumentation: https://docs.railway.app

