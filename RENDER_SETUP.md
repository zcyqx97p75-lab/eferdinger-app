# Render.com Setup-Anleitung

## Schnellstart

### 1. Backend Service erstellen

1. Gehen Sie zu [Render Dashboard](https://dashboard.render.com)
2. Klicken Sie auf "New +" → "Web Service"
3. Verbinden Sie Ihr Git Repository (oder verwenden Sie "Manual Deploy")

**Konfiguration:**
- **Name:** `eferdinger-app-backend`
- **Environment:** `Node`
- **Region:** `Frankfurt` (für bessere DB-Performance)
- **Branch:** `main` (oder Ihr Standard-Branch)
- **Root Directory:** `/` (Root des Repositories)

**Build & Start:**
```
Build Command: npm install && npm run build && npx prisma generate
Start Command: npm run prisma:migrate:deploy && npm start
```

**Environment Variables:**
```
DATABASE_URL=postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com/eferdinger_db?sslmode=require
DIRECT_URL=postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com/eferdinger_db?sslmode=require
NODE_ENV=production
```

**Health Check:**
- Path: `/api/health`
- Interval: 30s

**Plan:** Starter (oder höher für bessere Performance)

### 2. Frontend Service erstellen

1. Gehen Sie zu [Render Dashboard](https://dashboard.render.com)
2. Klicken Sie auf "New +" → "Static Site"

**Konfiguration:**
- **Name:** `eferdinger-app-frontend`
- **Branch:** `main` (oder Ihr Standard-Branch)
- **Root Directory:** `/` (Root des Repositories)

**Build:**
```
Build Command: cd frontend && npm install && npm run build
Publish Directory: frontend/dist
```

**Environment Variables:**
```
VITE_API_URL=https://eferdinger-app-backend.onrender.com/api
```

**Hinweis:** Ersetzen Sie `eferdinger-app-backend` mit dem tatsächlichen Service-Namen, den Render generiert (normalerweise `eferdinger-app-backend.onrender.com`).

### 3. Nach dem ersten Deploy

1. **Backend-URL notieren:** Nach dem ersten Deploy erhalten Sie eine URL wie `https://eferdinger-app-backend-xxxx.onrender.com`
2. **Frontend-Environment Variable aktualisieren:** Setzen Sie `VITE_API_URL` auf die tatsächliche Backend-URL
3. **Frontend neu deployen:** Nach Änderung der Environment Variable wird das Frontend automatisch neu gebaut

### 4. Datenbank-Migrationen

Die Migrationen werden automatisch beim Start des Backend-Services ausgeführt (`npm run prisma:migrate:deploy`).

Falls Sie manuell migrieren möchten:
```bash
DATABASE_URL='postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com/eferdinger_db?sslmode=require' npx prisma migrate deploy
```

### 5. Statische Dateien (PDFs)

PDFs werden in folgenden Ordnern gespeichert:
- `documents/` - Rechnungen und Gutschriften
- `statements/` - Bauernabrechnungen

Diese Ordner müssen auf Render verfügbar sein. Render speichert Dateien im Dateisystem, aber sie gehen bei einem Re-Deploy verloren. Für Production sollten Sie einen Cloud-Storage (z.B. AWS S3, Cloudinary) verwenden.

### Troubleshooting

**Backend startet nicht:**
- Prüfen Sie die Logs in Render Dashboard
- Prüfen Sie, ob `DATABASE_URL` korrekt gesetzt ist
- Prüfen Sie, ob alle Dependencies installiert werden

**Frontend kann Backend nicht erreichen:**
- Prüfen Sie `VITE_API_URL` im Frontend
- Prüfen Sie CORS-Einstellungen im Backend
- Prüfen Sie, ob Backend-Service läuft (Health Check)

**Datenbank-Verbindung schlägt fehl:**
- Prüfen Sie `sslmode=require` in der DATABASE_URL
- Prüfen Sie, ob die Datenbank auf Render läuft
- Prüfen Sie Firewall-Einstellungen

### Wichtige URLs

Nach dem Deploy erhalten Sie:
- **Backend:** `https://eferdinger-app-backend-xxxx.onrender.com`
- **Frontend:** `https://eferdinger-app-frontend-xxxx.onrender.com`

Die genauen URLs finden Sie im Render Dashboard unter jedem Service.

