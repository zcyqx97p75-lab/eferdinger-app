#!/bin/bash
# Komplettes Reset der Railway-Datenbank und Import der lokalen DB

cd ~/eferdinger-app || { echo "Fehler: Nicht im Verzeichnis ~/eferdinger-app"; exit 1; }

echo "🔄 Railway-Datenbank Reset & Import"
echo ""
echo "⚠️  WICHTIG: Dies wird ALLE Daten in der Railway-Datenbank löschen!"
echo "   Bist du sicher? (ja/nein)"
read -r confirmation

if [ "$confirmation" != "ja" ]; then
  echo "❌ Abgebrochen"
  exit 1
fi

# Schritt 1: Lokale DB exportieren
echo ""
echo "📤 Schritt 1: Exportiere lokale Datenbank..."
bash scripts/export-local-db.sh

if [ $? -ne 0 ]; then
  echo "❌ Export fehlgeschlagen"
  exit 1
fi

# Schritt 2: Railway DB importieren
echo ""
echo "📥 Schritt 2: Importiere nach Railway..."
bash scripts/import-to-railway.sh

if [ $? -ne 0 ]; then
  echo "❌ Import fehlgeschlagen"
  exit 1
fi

echo ""
echo "✅ Fertig! Railway-Datenbank wurde mit lokaler Datenbank synchronisiert."

