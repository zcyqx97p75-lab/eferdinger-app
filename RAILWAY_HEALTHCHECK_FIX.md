# Railway Healthcheck-Fehler beheben

## Problem
Build erfolgreich, aber Healthcheck schlägt fehl:
```
Attempt #1 failed with service unavailable
1/1 replicas never became healthy!
```

## Mögliche Ursachen

### 1. Migration-Fehler beim Start
Die Migration schlägt fehl und der Server startet nicht.

### 2. Datenbank-Verbindung
`DATABASE_URL` ist nicht korrekt gesetzt oder die Datenbank ist nicht erreichbar.

### 3. Port-Konfiguration
Der Server hört nicht auf dem richtigen Port.

### 4. Server-Start-Fehler
Ein Fehler beim Start verhindert, dass der Server läuft.

## Lösung: Logs prüfen

### Schritt 1: Logs im Railway Dashboard öffnen

1. Gehe zu deinem Backend Service in Railway
2. Klicke auf **"Logs"** Tab
3. Scrolle nach unten zu den neuesten Logs
4. Suche nach Fehlermeldungen

### Schritt 2: Häufige Fehler und Lösungen

#### Fehler: "Migration failed"
```
Error: P3009
migrate found failed migrations
```

**Lösung:** Der Migration-Fix sollte das beheben. Prüfe, ob der Start Command korrekt ist:
```
npm run prisma:migrate:deploy:safe && npm start
```

#### Fehler: "Can't reach database server"
```
Error: P1001: Can't reach database server
```

**Lösung:** Prüfe Environment Variables:
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `DIRECT_URL=${{Postgres.DATABASE_URL}}`

**Wichtig:** Ersetze `Postgres` mit dem Namen deines PostgreSQL-Services!

#### Fehler: "Port already in use" oder "EADDRINUSE"
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Lösung:** Railway setzt automatisch `PORT`. Prüfe, ob dein Server `process.env.PORT` verwendet:

```typescript
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
```

#### Fehler: "Module not found"
```
Error: Cannot find module '...'
```

**Lösung:** Prüfe, ob alle Dependencies in `package.json` sind und `npm install` erfolgreich war.

---

## Debugging-Schritte

### 1. Prüfe Environment Variables

Im Railway Dashboard → Backend Service → "Variables":
- ✅ `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- ✅ `DIRECT_URL=${{Postgres.DATABASE_URL}}`
- ✅ `NODE_ENV=production`
- ✅ `PORT=${{PORT}}` (optional, Railway setzt automatisch)

### 2. Prüfe Start Command

Im Railway Dashboard → Backend Service → "Settings" → "Deploy":
```
npm run prisma:migrate:deploy:safe && npm start
```

### 3. Prüfe Health Check Path

Im Railway Dashboard → Backend Service → "Settings":
- **Healthcheck Path:** `/api/health`
- **Healthcheck Timeout:** 100

### 4. Prüfe Server-Code

Stelle sicher, dass der Server auf `process.env.PORT` hört:

```typescript
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
```

**Wichtig:** `'0.0.0.0'` ist wichtig für Railway!

---

## Schnelltest: Server lokal testen

```bash
cd ~/eferdinger-app
npm run build
npm start
```

Prüfe, ob der Server lokal startet.

---

## Nächste Schritte

1. **Logs prüfen** - Was steht in den Railway Logs?
2. **Environment Variables prüfen** - Sind alle korrekt gesetzt?
3. **Start Command prüfen** - Ist der Command korrekt?
4. **Server-Code prüfen** - Hört der Server auf `process.env.PORT`?

Sende mir die Logs, dann kann ich dir genau sagen, was das Problem ist!

