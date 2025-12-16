# Checkliste für GitHub Push

## ✅ Bereit für Push

### 1. Sensible Daten geschützt
- ✅ `.env` Dateien sind im `.gitignore`
- ✅ Backup-Dateien sind im `.gitignore`
- ✅ `.env.backup` wird jetzt ignoriert

### 2. Railway-Konfiguration
- ✅ `railway.json` vorhanden
- ✅ `frontend/railway.toml` vorhanden
- ✅ `railway-backend.json` vorhanden

### 3. Build funktioniert
- ✅ Frontend baut ohne Fehler
- ✅ TypeScript kompiliert ohne Fehler

### 4. Code-Struktur
- ✅ Refactoring abgeschlossen
- ✅ Modulare Struktur (components, services, hooks, types, utils)
- ✅ App.tsx von 12457 auf ~4900 Zeilen reduziert

## 📝 Vor dem Push zu tun

### 1. `.env.backup` aus Git entfernen (falls bereits committed)
```bash
git rm --cached frontend/.env.backup
```

### 2. `frontend2/` prüfen
- Ist `frontend2/` noch benötigt oder kann es gelöscht werden?
- Falls nicht benötigt: aus `.gitignore` entfernen und löschen

### 3. Commit-Strategie
```bash
# 1. Alle Änderungen stagen
git add .

# 2. Backup-Dateien explizit ausschließen (falls doch gestaged)
git reset HEAD *.backup*

# 3. Commit erstellen
git commit -m "Refactoring: App.tsx modularisiert, Buttons vereinheitlicht, Filter verbessert"

# 4. Push zu GitHub
git push origin main
```

## 🚀 Railway Deployment

### Frontend Service
- Root Directory: `/frontend`
- Build Command: `npm install && npm run build`
- Output Directory: `dist`
- Static Site: ✅ (kein Start-Command nötig)

### Backend Service
- Root Directory: `/` (root)
- Build Command: `npm install && npm run build && npx prisma generate`
- Start Command: `npm run prisma:migrate:deploy:safe && npm start`
- Healthcheck: `/api/health`

## ⚠️ Wichtige Hinweise

1. **Environment Variables** müssen in Railway gesetzt werden:
   - `DATABASE_URL`
   - `VITE_API_URL` (für Frontend)
   - `JWT_SECRET`
   - Weitere Backend-Variablen

2. **Prisma Migrations** werden automatisch beim Start ausgeführt

3. **Frontend** ist eine statische Site und benötigt keinen Start-Command

4. **Backup-Dateien** werden nicht committed (sind im `.gitignore`)

