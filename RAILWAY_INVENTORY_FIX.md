# Fix: Inventur speichern funktioniert nicht auf Railway

## Problem
Bauer kann keinen neuen Lagerstand setzen - Speichern funktioniert nicht auf Railway, lokal funktioniert es.

## Mögliche Ursachen

### 1. Datenbank-Migrationen fehlen
Die `FarmerStock` Tabelle oder das `farmerId_varietyId` Unique Constraint fehlt möglicherweise.

**Prüfung:**
```sql
-- In Railway Database prüfen:
SELECT * FROM "FarmerStock" LIMIT 1;
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'FarmerStock' AND constraint_type = 'UNIQUE';
```

**Lösung:**
- Backend-Service auf Railway neu starten (Migrationen werden automatisch ausgeführt)
- Oder manuell: `npx prisma migrate deploy` auf Railway ausführen

### 2. API-Endpoint-Fehler
Der Endpoint `/api/farmer-stock/inventory` gibt einen Fehler zurück.

**Verbesserte Fehlerbehandlung:**
- ✅ Authorization Header hinzugefügt (falls benötigt)
- ✅ Detaillierte Fehlermeldungen in Console
- ✅ Bessere Error-Handling im Frontend

### 3. CORS-Probleme
Frontend kann nicht auf Backend-API zugreifen.

**Prüfung:**
- Railway Logs prüfen auf CORS-Fehler
- `VITE_API_URL` in Railway Frontend Service prüfen

### 4. Environment Variables
`VITE_API_URL` ist nicht korrekt gesetzt auf Railway.

**Prüfung:**
- Railway Frontend Service → Variables
- `VITE_API_URL` sollte auf Backend-URL zeigen (z.B. `https://backend-production.up.railway.app`)

## Was wurde gefixt

1. **Verbesserte Fehlerbehandlung:**
   - Authorization Header hinzugefügt
   - Detaillierte Fehlermeldungen in Console
   - Bessere Error-Messages für User

2. **Code-Änderungen:**
   - `doInventory` Funktion verbessert
   - Fehler werden jetzt in Console geloggt
   - `invVarietyId` wird nach erfolgreichem Speichern zurückgesetzt

## Debugging-Schritte

### 1. Browser Console prüfen
- Öffne Browser DevTools → Console
- Versuche Inventur zu speichern
- Prüfe Fehlermeldungen in Console

### 2. Network Tab prüfen
- DevTools → Network
- Suche nach `/farmer-stock/inventory` Request
- Prüfe Status Code und Response

### 3. Railway Backend Logs prüfen
- Railway Dashboard → Backend Service → Logs
- Suche nach Fehlern beim Inventur-Request
- Prüfe ob Migrationen erfolgreich waren

### 4. Datenbank prüfen
```bash
# Lokal mit Railway-Datenbank verbinden:
export DATABASE_URL="postgresql://postgres:VqSvpoxRMcAhrALScFnGlTeauPiZqKch@gondola.proxy.rlwy.net:32682/railway"
npx prisma studio
```

Dann prüfen:
- Existiert `FarmerStock` Tabelle?
- Existiert `FarmerStockMovement` Tabelle?
- Gibt es das Unique Constraint `farmerId_varietyId`?

## Nächste Schritte

1. **Code pushen:**
   ```bash
   git add frontend/src/App.tsx
   git commit -m "Fix: Verbesserte Fehlerbehandlung für Inventur"
   git push origin main
   ```

2. **Railway neu deployen:**
   - Frontend Service → Redeploy
   - Backend Service → Redeploy (für Migrationen)

3. **Testen:**
   - Als Bauer einloggen
   - Inventur versuchen zu speichern
   - Browser Console prüfen
   - Railway Logs prüfen

