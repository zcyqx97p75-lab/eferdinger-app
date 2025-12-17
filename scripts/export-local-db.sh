#!/bin/bash
# Exportiert die lokale Datenbank in eine SQL-Datei

cd ~/eferdinger-app || { echo "Fehler: Nicht im Verzeichnis ~/eferdinger-app"; exit 1; }

echo "📤 Exportiere lokale Datenbank..."

# Lade .env für lokale DATABASE_URL
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL nicht gefunden in .env"
  exit 1
fi

# Exportiere Schema + Daten
pg_dump "$DATABASE_URL" > local-db-export.sql

if [ $? -eq 0 ]; then
  echo "✅ Datenbank exportiert nach: local-db-export.sql"
  echo "📊 Dateigröße: $(du -h local-db-export.sql | cut -f1)"
else
  echo "❌ Fehler beim Exportieren der Datenbank"
  exit 1
fi

