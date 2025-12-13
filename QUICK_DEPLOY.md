# Schnellstart: App auf Render deployen

## ✅ Vorbereitung abgeschlossen

Die folgenden Dateien wurden erstellt/aktualisiert:

1. ✅ `render.yaml` - Render-Konfiguration
2. ✅ `DEPLOYMENT.md` - Detaillierte Deployment-Anleitung
3. ✅ `RENDER_SETUP.md` - Schritt-für-Schritt Setup
4. ✅ Health-Check-Endpoint `/api/health` hinzugefügt
5. ✅ `.renderignore` - Dateien, die nicht deployed werden sollen

## 🚀 Deployment-Schritte

### Option 1: Mit render.yaml (Empfohlen)

1. **Repository zu Render verbinden:**
   - Gehen Sie zu [Render Dashboard](https://dashboard.render.com)
   - Klicken Sie auf "New +" → "Blueprint"
   - Verbinden Sie Ihr Git Repository
   - Render erkennt automatisch die `render.yaml` und erstellt beide Services

2. **Environment Variables setzen:**
   - Backend: `DATABASE_URL` und `DIRECT_URL` (siehe unten)
   - Frontend: `VITE_API_URL` (wird nach Backend-Deploy gesetzt)

### Option 2: Manuell (ohne Git)

**Backend:**
1. Neuer Web Service
2. Build: `npm install && npm run build && npx prisma generate`
3. Start: `npm run prisma:migrate:deploy && npm start`
4. Environment Variables (siehe unten)

**Frontend:**
1. Neue Static Site
2. Build: `cd frontend && npm install && npm run build`
3. Publish: `frontend/dist`
4. Environment Variable: `VITE_API_URL=https://[IHR-BACKEND-URL]/api`

## 🔑 Environment Variables

### Backend

```
DATABASE_URL=postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com/eferdinger_db?sslmode=require
DIRECT_URL=postgresql://eferdinger_db_user:[PASSWORD]@dpg-d46r3149c44c738m899g-a.frankfurt-postgres.render.com/eferdinger_db?sslmode=require
NODE_ENV=production
```

### Frontend

```
VITE_API_URL=https://eferdinger-app-backend.onrender.com/api
```

**Wichtig:** Ersetzen Sie `eferdinger-app-backend.onrender.com` mit Ihrer tatsächlichen Backend-URL von Render!

## 📋 Checkliste nach dem Deploy

- [ ] Backend-Service läuft (Health Check: `/api/health`)
- [ ] Datenbank-Migrationen wurden ausgeführt
- [ ] Frontend-URL zeigt die Login-Seite
- [ ] Frontend kann Backend erreichen (keine CORS-Fehler)
- [ ] Login funktioniert
- [ ] PDFs können generiert werden

## 🔍 Troubleshooting

**Backend startet nicht:**
```bash
# Logs in Render Dashboard prüfen
# Häufige Probleme:
# - DATABASE_URL falsch
# - Dependencies fehlen
# - TypeScript-Compile-Fehler
```

**Frontend zeigt Fehler:**
```bash
# Browser-Konsole prüfen (F12)
# Häufige Probleme:
# - VITE_API_URL falsch
# - Backend nicht erreichbar
# - CORS-Fehler
```

**Datenbank-Verbindung:**
```bash
# Prüfen Sie:
# - sslmode=require in DATABASE_URL
# - Datenbank läuft auf Render
# - Firewall-Einstellungen
```

## 📞 Support

Bei Problemen:
1. Prüfen Sie die Logs im Render Dashboard
2. Prüfen Sie die Browser-Konsole (F12)
3. Prüfen Sie die Network-Tab für API-Calls

