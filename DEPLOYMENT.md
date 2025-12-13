# Deployment-Anleitung für Eferdinger App

## Render.com Deployment

### Voraussetzungen

1. Render.com Account
2. PostgreSQL Datenbank auf Render (bereits vorhanden)
3. Git Repository (optional, für Auto-Deploy)

### Datenbank-Credentials

```
Username: eferdinger_db_user
Password: [PASSWORD] (siehe separate Credentials-Datei)
Internal Database: postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a/eferdinger_db
External Database: postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com/eferdinger_db
```

### Backend Service auf Render

1. **Neuen Web Service erstellen:**
   - Type: Web Service
   - Name: `eferdinger-app-backend`
   - Environment: Node
   - Region: Frankfurt
   - Plan: Starter (oder höher)

2. **Build & Start Commands:**
   ```
   Build Command: npm install && npm run build && npx prisma generate
   Start Command: npm run prisma:migrate:deploy && npm start
   ```

3. **Environment Variables setzen:**
   ```
   DATABASE_URL=postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com/eferdinger_db?sslmode=require
   DIRECT_URL=postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com/eferdinger_db?sslmode=require
   NODE_ENV=production
   ```

4. **Health Check Path:**
   ```
   /api/health
   ```

### Frontend Service auf Render

1. **Neuen Static Site Service erstellen:**
   - Type: Static Site
   - Name: `eferdinger-app-frontend`
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`

2. **Environment Variables:**
   ```
   VITE_API_URL=https://eferdinger-app-backend.onrender.com/api
   ```

3. **Routes konfigurieren:**
   - Rewrite alle Routes zu `/index.html` (für React Router)

### Alternative: Manuelles Deployment

#### Backend lokal bauen und deployen:

```bash
cd ~/eferdinger-app

# Dependencies installieren
npm install

# TypeScript kompilieren
npm run build

# Prisma Client generieren
npx prisma generate

# Datenbank-Migrationen anwenden
DATABASE_URL='postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com/eferdinger_db?sslmode=require' npx prisma migrate deploy

# Server starten
DATABASE_URL='postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com/eferdinger_db?sslmode=require' npm start
```

#### Frontend lokal bauen:

```bash
cd ~/eferdinger-app/frontend

# Dependencies installieren
npm install

# Build erstellen
VITE_API_URL=https://eferdinger-app-backend.onrender.com/api npm run build

# Output ist in frontend/dist/
```

### Wichtige Hinweise

1. **Datenbank-Migrationen:** Werden automatisch beim Start ausgeführt (`npm run prisma:migrate:deploy`)

2. **Statische Dateien:** PDFs werden in `documents/` und `statements/` gespeichert. Diese Ordner müssen auf Render verfügbar sein.

3. **CORS:** Backend erlaubt bereits alle Origins. Für Production sollte man die erlaubten Origins einschränken.

4. **Environment Variables:** Sensible Daten (Passwörter, API-Keys) sollten als Environment Variables gesetzt werden, nicht im Code.

### Troubleshooting

- **Health Check schlägt fehl:** Prüfen Sie, ob der Server läuft und `/api/health` erreichbar ist
- **Datenbank-Verbindung:** Prüfen Sie die `DATABASE_URL` und ob SSL korrekt konfiguriert ist (`sslmode=require`)
- **Frontend kann Backend nicht erreichen:** Prüfen Sie `VITE_API_URL` im Frontend-Build

