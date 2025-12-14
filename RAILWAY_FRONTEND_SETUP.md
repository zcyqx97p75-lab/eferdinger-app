# Railway Frontend Deployment - Schritt für Schritt

## ✅ Voraussetzungen erfüllt

- ✅ PostgreSQL läuft
- ✅ Backend läuft
- ✅ Backend-URL bekannt

## 🎨 Schritt 1: Frontend Service erstellen

1. **Im Railway Dashboard:**
   - Gehe zu deinem Railway Project
   - Klicke auf **"+ New"** → **"GitHub Repo"**
   - Wähle das gleiche Repository: `zcyqx97p75-lab/eferdinger-app`

## 🔧 Schritt 2: Frontend konfigurieren

### Service Settings:

**Name:** `eferdinger-frontend` (oder wie du willst)

**Root Directory:** `/frontend` ⚠️ **WICHTIG!**

**Service Type:** **"Static Web Service"** (nicht "Web Service"!)

### Build & Deploy:

**Build Command:**
```
npm install && npm run build
```

**Output Directory:**
```
dist
```

### Environment Variables:

Klicke auf **"Variables"** und füge hinzu:

```
VITE_API_URL=${{eferdinger-app.RAILWAY_PUBLIC_DOMAIN}}/api
```

**WICHTIG:** 
- Ersetze `eferdinger-app` mit dem **tatsächlichen Namen deines Backend-Services**
- Falls dein Backend-Service anders heißt (z.B. "Backend" oder "devoted-spirit"), verwende diesen Namen

**Alternative:** Falls die Template-Variable nicht funktioniert, verwende die direkte Backend-URL:
```
VITE_API_URL=https://[deine-backend-url].up.railway.app/api
```

## 🌐 Schritt 3: Backend-URL finden

### Option A: Template-Variable (Empfohlen)

1. Gehe zu deinem **Backend Service** in Railway
2. Klicke auf **"Settings"**
3. Klicke auf **"Generate Domain"** (falls noch nicht geschehen)
4. Notiere dir die URL (z.B. `eferdinger-app-production.up.railway.app`)
5. Im **Frontend Service** → **Variables**:
   ```
   VITE_API_URL=https://eferdinger-app-production.up.railway.app/api
   ```

### Option B: Template-Variable verwenden

Im **Frontend Service** → **Variables**:
```
VITE_API_URL=${{Backend-Service-Name.RAILWAY_PUBLIC_DOMAIN}}/api
```

**Wichtig:** Ersetze `Backend-Service-Name` mit dem **exakten Namen** deines Backend-Services!

## ✅ Schritt 4: Deployen

1. Railway startet automatisch den Build
2. Warte, bis "Deployed" angezeigt wird
3. Klicke auf **"Settings"** → **"Generate Domain"** für das Frontend

## 🔍 Schritt 5: Testen

1. Öffne die Frontend-URL im Browser
2. Prüfe die Browser-Konsole (F12) auf Fehler
3. Prüfe, ob API-Calls funktionieren
4. Teste die Login-Funktion

## ⚠️ Wichtige Hinweise

### Root Directory
- **MUSS** `/frontend` sein (nicht `/`!)
- Sonst findet Railway die `package.json` nicht

### Service Type
- **MUSS** "Static Web Service" sein
- Nicht "Web Service" (das ist für Node.js-Server)

### Environment Variable
- `VITE_API_URL` wird beim **Build** verwendet
- Nach Änderung der Variable muss das Frontend **neu gebaut** werden
- Railway macht das automatisch

### Build Output
- Railway sucht nach `dist/` im Root Directory
- Da Root Directory `/frontend` ist, sucht es nach `/frontend/dist/`
- Das ist korrekt, da Vite in `frontend/dist/` baut

## 🐛 Troubleshooting

### Frontend zeigt keine Daten:
- Prüfe Browser-Konsole auf CORS-Fehler
- Prüfe, ob `VITE_API_URL` korrekt gesetzt ist
- Prüfe Backend-Logs auf Fehler

### Build schlägt fehl:
- Prüfe, ob Root Directory `/frontend` ist
- Prüfe, ob `package.json` im `/frontend` Ordner ist
- Prüfe Build-Logs auf Fehler

### API-Calls schlagen fehl:
- Prüfe, ob Backend läuft
- Prüfe, ob `VITE_API_URL` die korrekte Backend-URL ist
- Prüfe Backend-Logs auf CORS-Fehler

## 📝 Checkliste

- [ ] Frontend Service erstellt
- [ ] Root Directory auf `/frontend` gesetzt
- [ ] Service Type: "Static Web Service"
- [ ] Build Command: `npm install && npm run build`
- [ ] Output Directory: `dist`
- [ ] Environment Variable `VITE_API_URL` gesetzt
- [ ] Backend-URL korrekt (mit `/api` am Ende)
- [ ] Frontend deployed
- [ ] Frontend-URL generiert
- [ ] Frontend im Browser getestet

## 🎯 Quick Setup

**Im Railway Dashboard:**

1. "+ New" → "GitHub Repo" → Gleiches Repo
2. **Root Directory:** `/frontend`
3. **Service Type:** "Static Web Service"
4. **Build Command:** `npm install && npm run build`
5. **Output Directory:** `dist`
6. **Environment Variable:**
   ```
   VITE_API_URL=${{eferdinger-app.RAILWAY_PUBLIC_DOMAIN}}/api
   ```
   (Ersetze `eferdinger-app` mit deinem Backend-Service-Namen)

**Fertig!** 🎉

