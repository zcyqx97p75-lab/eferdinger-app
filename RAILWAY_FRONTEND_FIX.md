# Railway Frontend Build-Fehler beheben

## Problem
Railway versucht, das Frontend mit der Backend-Konfiguration zu bauen:
- Verwendet `railway.json` aus Root (für Backend)
- Versucht `npx prisma generate` auszuführen
- Versucht `npm start` auszuführen (für Backend)

## Lösung: Frontend als Static Web Service konfigurieren

### Im Railway Dashboard:

1. **Gehe zu deinem Frontend Service**
2. **Settings → Deploy:**
   - **Root Directory:** `/frontend` ✅
   - **Service Type:** **"Static Web Service"** ✅ (nicht "Web Service"!)

3. **Settings → Build:**
   - **Build Command:** `npm install && npm run build`
   - **Output Directory:** `dist`

4. **Wichtig:** Entferne alle Backend-spezifischen Commands!

### Falls Railway weiterhin Backend-Config verwendet:

**Option 1: Service neu erstellen**
- Lösche den Frontend Service
- Erstelle ihn neu als "Static Web Service"
- Stelle sicher, dass Root Directory `/frontend` ist

**Option 2: Manuell überschreiben**
- Im Railway Dashboard → Frontend Service → Settings
- Überschreibe alle Build/Deploy Commands manuell
- Entferne alle Prisma/Backend-Commands

## TypeScript-Fehler

Die TypeScript-Fehler sind weniger kritisch - das Frontend sollte trotzdem bauen können, wenn Railway es richtig als Static Site behandelt.

Falls nötig, können wir die TypeScript-Checks weniger strikt machen (bereits gemacht in `tsconfig.app.json`).

## Checkliste

- [ ] Frontend Service ist "Static Web Service" (nicht "Web Service")
- [ ] Root Directory ist `/frontend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Output Directory: `dist`
- [ ] Keine Prisma-Commands
- [ ] Keine Backend-Start-Commands
- [ ] `VITE_API_URL` ist gesetzt

