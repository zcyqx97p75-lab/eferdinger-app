# Datenbank-Verbindung prüfen

## Problem
- Daten sind in Prisma Studio sichtbar (Railway-Datenbank)
- Frontend zeigt keine Daten an
- Neue Kunden werden gespeichert und angezeigt

## Mögliche Ursachen

1. **Backend verwendet andere Datenbank** (lokale vs. Railway)
2. **Frontend API-URL ist falsch**
3. **CORS-Problem**
4. **Daten werden nicht geladen beim Start**

## Lösung

### Schritt 1: Prüfe Backend-Logs in Railway

1. Railway Dashboard → Backend Service → Logs
2. Prüfe, ob API-Calls ankommen
3. Prüfe auf Fehlermeldungen

### Schritt 2: Prüfe Frontend-Browser-Konsole

1. Öffne Frontend im Browser
2. Drücke F12 (Developer Tools)
3. Gehe zu "Console" Tab
4. Prüfe auf Fehler (rot)
5. Gehe zu "Network" Tab
6. Prüfe, ob API-Calls erfolgreich sind

### Schritt 3: Prüfe Environment Variables

**Backend:**
- `DATABASE_URL` sollte auf Railway-Datenbank zeigen
- Railway Dashboard → Backend Service → Variables

**Frontend:**
- `VITE_API_URL` sollte auf Backend-URL zeigen
- Railway Dashboard → Frontend Service → Variables
- Sollte sein: `https://backend-production-37d3.up.railway.app/api`

### Schritt 4: Teste API direkt

Öffne im Browser:
```
https://backend-production-37d3.up.railway.app/api/customers
```

Sollte JSON mit Kunden zurückgeben.

### Schritt 5: Prüfe, ob Daten in Railway-Datenbank sind

In Prisma Studio:
- Prüfe `Customer` Tabelle
- Prüfe andere Tabellen (Farmer, Product, etc.)

