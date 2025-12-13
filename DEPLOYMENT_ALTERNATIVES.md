# Alternative Deployment-Optionen (Kostenlos/Ohne Kreditkarte)

## Option 1: Railway.app (Empfohlen - Einfachste Alternative)

**Vorteile:**
- ✅ Kostenloser Plan verfügbar ($5 Credit/Monat)
- ✅ Keine Kreditkarte für Free Tier nötig
- ✅ Automatisches Deployment aus Git
- ✅ PostgreSQL-Datenbank inklusive
- ✅ Einfache Konfiguration

**Setup:**
1. Gehe zu https://railway.app
2. Sign up mit GitHub/GitLab
3. "New Project" → "Deploy from GitHub repo"
4. Wähle dein Repository

**Backend konfigurieren:**
- Build Command: `npm install && npm run build && npx prisma generate`
- Start Command: `npm run prisma:migrate:deploy && npm start`
- Environment Variables:
  ```
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  DIRECT_URL=${{Postgres.DATABASE_URL}}
  NODE_ENV=production
  PORT=${{PORT}}
  ```

**Frontend konfigurieren:**
- Neuer Service im gleichen Project
- Build Command: `cd frontend && npm install && npm run build`
- Output Directory: `frontend/dist`
- Environment Variable: `VITE_API_URL=${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api`

**Kosten:** $5 Credit/Monat kostenlos, danach Pay-as-you-go

---

## Option 2: Fly.io (Kostenloser Plan)

**Vorteile:**
- ✅ Kostenloser Plan (3 VMs)
- ✅ PostgreSQL inklusive
- ✅ Globales Edge-Network

**Setup:**
1. Installiere Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Sign up: `fly auth signup`
3. Erstelle App: `fly launch`

**Kosten:** Kostenlos für kleine Apps

---

## Option 3: Vercel (Frontend) + Railway/Render (Backend)

**Vorteile:**
- ✅ Vercel Frontend: Komplett kostenlos
- ✅ Backend separat auf Railway/Render

**Setup Frontend (Vercel):**
1. Gehe zu https://vercel.com
2. Import GitHub Repository
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variable: `VITE_API_URL=https://[dein-backend-url]/api`

**Kosten:** Komplett kostenlos

---

## Option 4: Netlify (Frontend) + Backend separat

**Vorteile:**
- ✅ Netlify: Komplett kostenlos für Static Sites
- ✅ Einfaches Setup

**Setup:**
Ähnlich wie Vercel, siehe Option 3

---

## Option 5: Lokales Deployment mit ngrok (Für Testing)

**Vorteile:**
- ✅ Komplett kostenlos
- ✅ Lokale Entwicklung
- ✅ Öffentliche URL für Testing

**Setup:**
```bash
# Terminal 1: Backend
cd ~/eferdinger-app
npm run dev

# Terminal 2: ngrok (Backend)
ngrok http 4000

# Terminal 3: Frontend
cd ~/eferdinger-app/frontend
VITE_API_URL=https://[ngrok-url]/api npm run dev

# Terminal 4: ngrok (Frontend)
ngrok http 5173
```

**Kosten:** Kostenlos (mit ngrok Free Plan)

---

## Option 6: DigitalOcean App Platform (Trial)

**Vorteile:**
- ✅ $200 Credit für 60 Tage
- ✅ Keine Kreditkarte für Trial nötig
- ✅ Ähnlich wie Render

**Setup:**
1. Gehe zu https://www.digitalocean.com
2. Erstelle Account (Trial)
3. App Platform → Create App
4. Ähnliche Konfiguration wie Render

**Kosten:** $200 Credit für 60 Tage, danach ~$12/Monat

---

## Empfehlung: Railway.app

**Warum Railway:**
1. ✅ Keine Kreditkarte für Free Tier
2. ✅ $5 Credit/Monat kostenlos
3. ✅ PostgreSQL inklusive
4. ✅ Einfaches Setup
5. ✅ Automatisches Deployment

**Nächste Schritte:**
1. Gehe zu https://railway.app
2. Sign up mit GitHub
3. Erstelle neues Project
4. Deploy Backend und Frontend als separate Services
5. PostgreSQL-Datenbank automatisch verfügbar

---

## Quick Setup für Railway

### Backend Service

1. **Neues Project erstellen**
2. **PostgreSQL hinzufügen** (automatisch verfügbar)
3. **GitHub Repo verbinden**
4. **Service konfigurieren:**
   - Build Command: `npm install && npm run build && npx prisma generate`
   - Start Command: `npm run prisma:migrate:deploy && npm start`
   - Environment Variables:
     ```
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     DIRECT_URL=${{Postgres.DATABASE_URL}}
     NODE_ENV=production
     ```

### Frontend Service

1. **Neuer Service im gleichen Project**
2. **GitHub Repo verbinden** (gleiches Repo)
3. **Service konfigurieren:**
   - Root Directory: `/frontend`
   - Build Command: `npm install && npm run build`
   - Output Directory: `dist`
   - Environment Variable:
     ```
     VITE_API_URL=${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api
     ```

### Datenbank-Migrationen

Werden automatisch beim Start ausgeführt (`npm run prisma:migrate:deploy`)

---

## Kosten-Vergleich

| Service | Kosten | Kreditkarte | PostgreSQL |
|---------|--------|-------------|------------|
| Railway | $5/Monat gratis | Nein (Free Tier) | ✅ Inklusive |
| Fly.io | Kostenlos | Nein | ✅ Inklusive |
| Vercel | Kostenlos | Nein | ❌ Extern nötig |
| Netlify | Kostenlos | Nein | ❌ Extern nötig |
| DigitalOcean | $200 Trial | Nein (Trial) | ✅ Inklusive |
| ngrok | Kostenlos | Nein | ❌ Lokal |

**Beste Option:** Railway.app - Keine Kreditkarte, $5 gratis, alles inklusive!

