# Railway Datenbank-Synchronisation

## Problem
Die Railway-Datenbank ist nicht mit der lokalen Datenbank synchron.

## Lösung

### Option 1: Migrationen manuell auf Railway ausführen (Empfohlen)

1. **Railway Dashboard öffnen**
   - Gehe zu deinem Backend-Service auf Railway
   - Öffne die "Deployments" oder "Logs"

2. **Prisma Studio auf Railway öffnen (optional)**
   - Im Railway Dashboard: Service → Settings → Variables
   - Prüfe, ob `DATABASE_URL` gesetzt ist

3. **Migrationen manuell ausführen**
   
   **Via Railway CLI:**
   ```bash
   railway run npx prisma migrate deploy
   ```
   
   **Oder via Railway Dashboard:**
   - Service → Settings → Deploy
   - Trigger Redeploy (Migrationen werden beim Start automatisch ausgeführt)

### Option 2: Migrationen werden beim nächsten Deploy automatisch ausgeführt

Die `railway-backend.json` ist bereits konfiguriert:
```json
{
  "deploy": {
    "startCommand": "npm run prisma:migrate:deploy:safe && npm start"
  }
}
```

**Migrationen werden automatisch ausgeführt, wenn:**
- Der Backend-Service neu gestartet wird
- Ein neues Deployment getriggert wird

### Option 3: Prisma Migrate Status prüfen

**Lokal prüfen, welche Migrationen noch fehlen:**
```bash
cd ~/eferdinger-app
export DATABASE_URL="postgresql://postgres:VqSvpoxRMcAhrALScFnGlTeauPiZqKch@gondola.proxy.rlwy.net:32682/railway"
npx prisma migrate status
```

**Migrationen auf Railway ausführen:**
```bash
npx prisma migrate deploy
```

## Aktuelle Migrationen (25 Migrationen)

Die folgenden Migrationen sollten auf Railway ausgeführt werden:
- `20251105195638_init`
- `20251106072433_add_farmer_stock`
- `20251112_drop_variety_fix`
- `20251112_product_remove_variety`
- `20251129213023_init_clean`
- `20251129225755_add_price_snapshots`
- `20251203183332_add_sortiergroesse`
- `20251203185439_add_variety_quality_and_price`
- `20251204174852_add_packing_cost_and_complaints`
- `20251204175128_remove_action_model`
- `20251204175421_remove_customer_product_models`
- `20251204180343_add_customer_sale_snapshots`
- `20251204182923_add_snapshots_delivery_order_complaint`
- `20251204183401_remove_delivery_order_complaint`
- `20251204183810_remove_inventory`
- `20251204190552_add_customer_sale_complaint`
- `20251204190818_add_retour_movement_fields`
- `20251205100859_add_tax_uid_docs`
- `20251205104618_packplant_org_invoice_data`
- `20251205125241_org_packplant_firmendaten`
- `20251205130451_accounting_recipient_legal_snapshots`
- `20251212150322_add_packing_cost_to_product_price`
- `20251213080001_add_traceability_fields`
- `20251213124257_add_manual_costs`

## Schnelllösung

**Einfachste Methode: Backend-Service auf Railway neu starten**

1. Railway Dashboard → Backend Service
2. Settings → Deploy
3. "Redeploy" klicken
4. Migrationen werden automatisch beim Start ausgeführt

## Prüfen ob Migrationen erfolgreich waren

**In Railway Logs nachsehen:**
- Suche nach: `"Running migration"`
- Suche nach: `"Applied migration"`
- Suche nach Fehlern: `"Migration failed"`

**Via Prisma Studio:**
```bash
./open-prisma-studio.sh
```
Dann in Prisma Studio die Tabellen prüfen.

