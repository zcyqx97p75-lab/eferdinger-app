#!/bin/bash

# Script zum Prüfen der Railway-Datenbank
# 
# ANLEITUNG:
# 1. Gehe zu Railway Dashboard → PostgreSQL Service → Variables
# 2. Kopiere den Wert von "DATABASE_PUBLIC_URL" (oder "DATABASE_URL")
# 3. Ersetze [DEINE_RAILWAY_DATABASE_URL] unten mit der kopierten URL
# 4. Führe dieses Script aus: bash check-railway-db.sh

# ============================================
# HIER DEINE DATABASE_URL EINFÜGEN:
# ============================================
RAILWAY_DATABASE_URL="[DEINE_RAILWAY_DATABASE_URL]"

# Prüfe ob URL gesetzt wurde
if [ "$RAILWAY_DATABASE_URL" == "[DEINE_RAILWAY_DATABASE_URL]" ]; then
    echo "❌ FEHLER: Bitte setze die RAILWAY_DATABASE_URL im Script!"
    echo ""
    echo "So findest du die URL:"
    echo "1. Railway Dashboard → PostgreSQL Service"
    echo "2. Klicke auf 'Variables' Tab"
    echo "3. Kopiere 'DATABASE_PUBLIC_URL' oder 'DATABASE_URL'"
    echo "4. Ersetze [DEINE_RAILWAY_DATABASE_URL] oben mit der kopierten URL"
    exit 1
fi

echo "🔍 Prüfe Railway-Datenbank..."
echo ""

cd ~/eferdinger-app || exit 1

# Setze Environment Variable
export DATABASE_URL="$RAILWAY_DATABASE_URL"
export DIRECT_URL="$RAILWAY_DATABASE_URL"

echo "✅ DATABASE_URL gesetzt"
echo ""

# Prüfe Farmer-Tabelle
echo "📊 Farmer-Tabelle:"
echo "-------------------"
npx prisma db execute --stdin <<EOF
SELECT 
  id, 
  name, 
  email, 
  ggn,
  "isFlatRate",
  "createdAt"
FROM "Farmer" 
ORDER BY id DESC 
LIMIT 10;
EOF

echo ""
echo ""

# Prüfe User-Tabelle (FARMER-Rolle)
echo "📊 User-Tabelle (FARMER-Rolle):"
echo "-------------------"
npx prisma db execute --stdin <<EOF
SELECT 
  id, 
  name, 
  email, 
  role,
  "farmerId",
  "createdAt"
FROM "User" 
WHERE role = 'FARMER'
ORDER BY id DESC 
LIMIT 10;
EOF

echo ""
echo ""

# Prüfe Unique Constraints
echo "📊 Prüfe Unique Constraints auf Farmer.email:"
echo "-------------------"
npx prisma db execute --stdin <<EOF
SELECT 
  email, 
  COUNT(*) as anzahl
FROM "Farmer" 
WHERE email IS NOT NULL
GROUP BY email 
HAVING COUNT(*) > 1;
EOF

echo ""
echo "✅ Prüfung abgeschlossen"
echo ""
echo "💡 Tipp: Falls Duplikate gefunden wurden, müssen diese zuerst behoben werden."

