# ✅ Railway Deployment Checkliste

## Vor dem Deployment

- [x] Repository auf GitHub vorhanden
- [x] `railway.json` konfiguriert
- [x] `package.json` Scripts vorhanden
- [x] Health-Check-Endpoint `/api/health` vorhanden
- [x] Prisma Migrationen vorbereitet
- [x] Environment Variables dokumentiert

## Während des Deployments

### 1. PostgreSQL-Datenbank
- [ ] PostgreSQL-Service erstellt
- [ ] Connection String notiert
- [ ] Service-Name notiert (für Template-Variablen)

### 2. Backend Service
- [ ] Backend-Service erstellt
- [ ] Root Directory: `/` (Root)
- [ ] Environment Variables gesetzt:
  - [ ] `DATABASE_URL=${{Postgres.DATABASE_URL}}`
  - [ ] `DIRECT_URL=${{Postgres.DATABASE_URL}}`
  - [ ] `NODE_ENV=production`
- [ ] Start Command: `npm run prisma:migrate:deploy && npm start`
- [ ] Health Check Path: `/api/health`
- [ ] Service-Name notiert (für Frontend-Template-Variable)

### 3. Frontend Service
- [ ] Frontend-Service erstellt
- [ ] Root Directory: `/frontend` ⚠️
- [ ] Service Type: **"Static Web Service"**
- [ ] Output Directory: `dist`
- [ ] Environment Variable gesetzt:
  - [ ] `VITE_API_URL=${{Backend-Service-Name.RAILWAY_PUBLIC_DOMAIN}}/api`

### 4. URLs
- [ ] Backend-URL generiert und notiert
- [ ] Frontend-URL generiert und notiert
- [ ] Frontend `VITE_API_URL` mit tatsächlicher Backend-URL aktualisiert

## Nach dem Deployment

- [ ] Backend-Logs prüfen (keine Fehler)
- [ ] Frontend-Logs prüfen (Build erfolgreich)
- [ ] Backend-URL im Browser öffnen: `https://[backend-url]/api/health`
- [ ] Frontend-URL im Browser öffnen
- [ ] Login-Seite funktioniert
- [ ] API-Verbindung funktioniert (Browser-Konsole prüfen)

## Troubleshooting

### Backend startet nicht:
- [ ] Prisma Client generiert? (`npx prisma generate` im Build)
- [ ] Migrationen erfolgreich? (`prisma migrate deploy` im Start)
- [ ] DATABASE_URL korrekt?
- [ ] Port korrekt? (Railway setzt automatisch `PORT`)

### Frontend zeigt keine Daten:
- [ ] `VITE_API_URL` korrekt gesetzt?
- [ ] Backend läuft? (Health-Check prüfen)
- [ ] CORS-Fehler? (Backend-Logs prüfen)
- [ ] Browser-Konsole prüfen

### Datenbank-Verbindung:
- [ ] PostgreSQL-Service läuft?
- [ ] `DATABASE_URL` Format korrekt?
- [ ] Template-Variable `${{Postgres.DATABASE_URL}}` korrekt aufgelöst?

---

## Wichtige Railway-Template-Variablen

```
${{ServiceName.DATABASE_URL}}           → Datenbank-Connection-String
${{ServiceName.RAILWAY_PUBLIC_DOMAIN}}  → Öffentliche URL
${{ServiceName.PORT}}                   → Port
${{ServiceName.RAILWAY_PRIVATE_DOMAIN}} → Private URL (Service-zu-Service)
```

**Beispiel:**
- PostgreSQL heißt "Postgres" → `${{Postgres.DATABASE_URL}}`
- Backend heißt "eferdinger-backend" → `${{eferdinger-backend.RAILWAY_PUBLIC_DOMAIN}}`

---

## Nächste Schritte nach erfolgreichem Deployment

1. ✅ App läuft online
2. ✅ Testen aller Funktionen
3. ✅ Custom Domain einrichten (optional)
4. ✅ Monitoring einrichten (optional)

