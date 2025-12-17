#!/bin/bash
# Exportiert die lokale Datenbank in eine SQL-Datei

cd ~/eferdinger-app || { echo "Fehler: Nicht im Verzeichnis ~/eferdinger-app"; exit 1; }

echo "📤 Exportiere lokale Datenbank..."

# Lade .env für lokale DATABASE_URL
if [ -f .env ]; then
  # Lade nur DATABASE_URL, ignoriere andere Variablen
  export DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL nicht gefunden in .env"
  echo "   Bitte gib die lokale DATABASE_URL manuell ein:"
  read -p "DATABASE_URL: " DATABASE_URL
  if [ -z "$DATABASE_URL" ]; then
    echo "❌ Keine URL eingegeben. Abbruch."
    exit 1
  fi
fi

echo "🔗 Verwende DATABASE_URL: ${DATABASE_URL:0:30}..." # Zeige nur ersten Teil

# Entferne mögliche Query-Parameter, die pg_dump stören könnten
CLEAN_URL=$(echo "$DATABASE_URL" | sed 's/?.*$//')

# Exportiere Schema + Daten
# Verwende --no-owner und --no-acl, um Kompatibilitätsprobleme zu vermeiden
pg_dump "$CLEAN_URL" --no-owner --no-acl --clean --if-exists > local-db-export.sql 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Datenbank exportiert nach: local-db-export.sql"
  echo "📊 Dateigröße: $(du -h local-db-export.sql | cut -f1)"
else
  echo "❌ Fehler beim Exportieren der Datenbank"
  echo ""
  echo "💡 Alternative: Verwende Prisma-basiertes Export-Script:"
  echo "   npm run export-local-db"
  exit 1
fi

