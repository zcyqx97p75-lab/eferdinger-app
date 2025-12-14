#!/bin/bash

# Railway Datenbank verbinden - Prisma Studio
# 
# ANLEITUNG:
# 1. Gehe zu Railway Dashboard → PostgreSQL Service → Variables
# 2. Kopiere den Wert von "DATABASE_PUBLIC_URL" (oder "DATABASE_URL")
# 3. Ersetze [DEINE_DATABASE_URL_HIER] unten mit der kopierten URL
# 4. Führe dieses Script aus: bash connect-database.sh

# ============================================
# HIER DEINE DATABASE_URL EINFÜGEN:
# ============================================
DATABASE_URL="[DEINE_DATABASE_URL_HIER]"

# Prüfe ob URL gesetzt wurde
if [ "$DATABASE_URL" == "[DEINE_DATABASE_URL_HIER]" ]; then
    echo "❌ FEHLER: Bitte setze die DATABASE_URL im Script!"
    echo ""
    echo "So findest du die URL:"
    echo "1. Railway Dashboard → PostgreSQL Service"
    echo "2. Klicke auf 'Variables' Tab"
    echo "3. Kopiere 'DATABASE_PUBLIC_URL' oder 'DATABASE_URL'"
    echo "4. Ersetze [DEINE_DATABASE_URL_HIER] oben mit der kopierten URL"
    exit 1
fi

echo "🔗 Verbinde mit Railway Datenbank..."
echo ""

# Wechsle ins Projekt-Verzeichnis
cd ~/eferdinger-app || exit 1

# Setze Environment Variable und starte Prisma Studio
export DATABASE_URL="$DATABASE_URL"
echo "✅ DATABASE_URL gesetzt"
echo "🚀 Starte Prisma Studio..."
echo ""
echo "Prisma Studio öffnet sich automatisch im Browser unter:"
echo "👉 http://localhost:5555"
echo ""
echo "Drücke Ctrl+C zum Beenden"
echo ""

npx prisma studio

