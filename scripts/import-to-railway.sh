#!/bin/bash
# Importiert die lokale Datenbank-Export-Datei in Railway

cd ~/eferdinger-app || { echo "Fehler: Nicht im Verzeichnis ~/eferdinger-app"; exit 1; }

if [ ! -f "local-db-export.sql" ]; then
  echo "❌ Datei local-db-export.sql nicht gefunden!"
  echo "   Führe zuerst: bash scripts/export-local-db.sh"
  exit 1
fi

echo "⚠️  WICHTIG: Dies wird ALLE Daten in der Railway-Datenbank löschen!"
echo "   Bist du sicher? (ja/nein)"
read -r confirmation

if [ "$confirmation" != "ja" ]; then
  echo "❌ Abgebrochen"
  exit 1
fi

echo ""
echo "📥 Bitte gib die Railway DATABASE_PUBLIC_URL ein:"
echo "   (Railway Dashboard → PostgreSQL Service → Variables → DATABASE_PUBLIC_URL)"
read -p "DATABASE_URL: " RAILWAY_DB_URL

if [ -z "$RAILWAY_DB_URL" ]; then
  echo "❌ Keine URL eingegeben. Abbruch."
  exit 1
fi

echo ""
echo "🗑️  Lösche alle Tabellen in Railway-Datenbank..."
psql "$RAILWAY_DB_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

if [ $? -ne 0 ]; then
  echo "❌ Fehler beim Löschen der Tabellen"
  exit 1
fi

echo ""
echo "📥 Importiere lokale Datenbank nach Railway..."
psql "$RAILWAY_DB_URL" < local-db-export.sql

if [ $? -eq 0 ]; then
  echo "✅ Datenbank erfolgreich importiert!"
  echo ""
  echo "🔄 WICHTIG: Führe jetzt aus, um die Sequenzen zu synchronisieren:"
  echo "   npm run fix-user-sequence"
  echo "   (Oder warte, bis der Server neu startet - die Sequenzen werden automatisch synchronisiert)"
else
  echo "❌ Fehler beim Importieren der Datenbank"
  exit 1
fi

