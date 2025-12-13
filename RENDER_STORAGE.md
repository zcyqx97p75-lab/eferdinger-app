# Speicherplatz-Bedarf für Render Deployment

## Aktuelle Größen-Analyse

### Backend Service

**Build-Zeit (temporär):**
- `node_modules/`: ~449 MB
- `frontend/node_modules/`: ~93 MB (wird nicht deployed, nur für Build)
- **Gesamt Build:** ~542 MB

**Runtime (nach Build):**
- `dist/` (kompiliertes Backend): ~64 KB
- `node_modules/` (Production): ~449 MB
- `documents/` (PDFs - wächst): aktuell ~132 KB (40 PDFs)
- `statements/` (PDFs - wächst): aktuell ~28 KB
- **Gesamt Runtime:** ~450 MB + wachsende PDFs

**Wachstum:**
- Jede Rechnung/Gutschrift: ~50-200 KB
- Jede Bauernabrechnung: ~100-500 KB
- Bei 100 Dokumenten/Monat: ~5-20 MB/Monat

### Frontend Service (Static Site)

**Build-Zeit (temporär):**
- `frontend/node_modules/`: ~93 MB
- **Build Output:** ~284 KB + 13 MB Bilder = ~13.3 MB

**Deployed:**
- `frontend/dist/`: ~284 KB (kompiliertes Frontend)
- Bilder: ~13 MB
- **Gesamt:** ~13.3 MB

## Render Plan-Empfehlung

### Option 1: Starter Plan (Empfohlen für Start)

**Backend:**
- **Plan:** Starter
- **RAM:** 512 MB
- **Disk Space:** 1 GB
- **Kosten:** ~$7/Monat

**Frontend:**
- **Plan:** Free (Static Sites sind kostenlos)
- **Disk Space:** Unbegrenzt (für Static Sites)

**Gesamt:** ~$7/Monat

**Hinweis:** 
- Reicht für den Start
- Bei vielen PDFs (>1000 Dokumente) könnte Disk Space knapp werden
- PDFs sollten regelmäßig archiviert/gelöscht werden

### Option 2: Standard Plan (Für Production)

**Backend:**
- **Plan:** Standard
- **RAM:** 2 GB
- **Disk Space:** 10 GB
- **Kosten:** ~$25/Monat

**Vorteile:**
- Mehr RAM für bessere Performance
- 10 GB Disk Space für viele PDFs
- Bessere Performance bei mehreren gleichzeitigen Usern

### Option 3: PDFs extern speichern (Kostenoptimiert)

**Backend:**
- **Plan:** Starter (512 MB RAM, 1 GB Disk)
- **PDFs:** Extern speichern (z.B. AWS S3, Cloudinary)
- **Kosten:** ~$7/Monat + Storage-Kosten

**Vorteile:**
- Geringere Render-Kosten
- Unbegrenzte PDF-Speicherung
- Bessere Skalierbarkeit

## Empfehlung

**Für den Start:**
- ✅ **Backend: Starter Plan** (~$7/Monat)
- ✅ **Frontend: Free** (Static Site)
- ✅ **PDFs lokal speichern** (1 GB reicht für ~5000-10000 PDFs)

**Für Production (nach einigen Monaten):**
- ⬆️ **Backend: Standard Plan** (~$25/Monat) wenn:
  - Viele gleichzeitige User
  - Viele PDFs generiert werden
  - Performance wichtig ist

**Alternative (kostenoptimiert):**
- 💾 **PDFs extern speichern** (AWS S3, Cloudinary, etc.)
- Bleibt bei Starter Plan
- Zusätzliche Storage-Kosten: ~$1-5/Monat je nach Volumen

## PDF-Verwaltung

Um den Speicherplatz zu optimieren:

1. **Alte PDFs archivieren:** Regelmäßig alte PDFs löschen oder extern speichern
2. **PDFs komprimieren:** Bereits implementiert (PDFKit)
3. **Externe Storage:** Für Production empfohlen

## Datenbank

Die PostgreSQL-Datenbank auf Render ist separat:
- **Free Tier:** 90 Tage, dann Upgrade nötig
- **Standard:** ~$20/Monat (inkl. Backups)

## Gesamtkosten (Schätzung)

**Minimal (Start):**
- Backend Starter: $7/Monat
- Frontend Free: $0/Monat
- Datenbank Standard: $20/Monat
- **Gesamt: ~$27/Monat**

**Production:**
- Backend Standard: $25/Monat
- Frontend Free: $0/Monat
- Datenbank Standard: $20/Monat
- **Gesamt: ~$45/Monat**

