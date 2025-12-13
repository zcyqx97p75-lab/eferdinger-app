# 🚀 Railway Quick Start (5 Minuten)

## Schritt 1: Repository verbinden
1. Railway.app → "New Project" → "Deploy from GitHub repo"
2. Repository wählen: `zcyqx97p75-lab/eferdinger-app`

## Schritt 2: PostgreSQL hinzufügen
1. "+ New" → "Database" → "Add PostgreSQL"
2. ✅ Fertig! Railway erstellt automatisch die DB

## Schritt 3: Backend Service
1. "+ New" → "GitHub Repo" → Gleiches Repo
2. **Root Directory:** `/` (Root)
3. **Environment Variables:**
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   DIRECT_URL=${{Postgres.DATABASE_URL}}
   NODE_ENV=production
   ```
   ⚠️ **Wichtig:** Verwende `DATABASE_URL` (nicht `DATABASE_PUBLIC_URL`)
4. **Start Command:** `npm run prisma:migrate:deploy && npm start`

## Schritt 4: Frontend Service
1. "+ New" → "GitHub Repo" → Gleiches Repo
2. **Root Directory:** `/frontend` ⚠️
3. **Service Type:** "Static Web Service"
4. **Output Directory:** `dist`
5. **Environment Variable:**
   ```
   VITE_API_URL=${{eferdinger-backend.RAILWAY_PUBLIC_DOMAIN}}/api
   ```
   (Ersetze `eferdinger-backend` mit deinem Backend-Service-Namen)

## Schritt 5: Deployen
✅ Railway startet automatisch! Warte auf "Deployed" Status.

## Schritt 6: URLs generieren
1. Backend → Settings → "Generate Domain"
2. Frontend → Settings → "Generate Domain"
3. Frontend → Variables → `VITE_API_URL` mit Backend-URL aktualisieren

## ✅ Fertig!
App läuft online! 🎉

**Detaillierte Anleitung:** Siehe `RAILWAY_SETUP.md`

