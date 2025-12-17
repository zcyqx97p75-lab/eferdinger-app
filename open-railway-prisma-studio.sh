#!/bin/bash
# Öffne Prisma Studio mit Railway-Datenbank

cd ~/eferdinger-app || { echo "Fehler: Nicht im Verzeichnis ~/eferdinger-app"; exit 1; }

# Railway DATABASE_PUBLIC_URL
RAILWAY_DB_URL="postgresql://postgres:VqSvpoxRMcAhrALScFnGlTeauPiZqKch@gondola.proxy.rlwy.net:32682/railway"

echo "🔗 Verbinde Prisma Studio mit Railway-Datenbank..."
echo "   URL: ${RAILWAY_DB_URL:0:50}..."
echo ""

# Temporär .env umbenennen, falls vorhanden, damit Prisma Studio die Railway-URL verwendet
if [ -f .env ]; then
  echo "📦 Temporär umbenennen von .env zu .env.local..."
  mv .env .env.local.backup
  echo "✅ .env temporär umbenannt"
fi

# Setze DATABASE_URL und starte Prisma Studio
export DATABASE_URL="$RAILWAY_DB_URL"
export DIRECT_URL="$RAILWAY_DB_URL"

echo "🚀 Starte Prisma Studio..."
echo "   (Dies kann einen Moment dauern)"
echo ""

# Starte Prisma Studio
npx prisma studio

# Nach dem Beenden: .env zurückbenennen
if [ -f .env.local.backup ]; then
  echo ""
  echo "🔄 Stelle .env wieder her..."
  mv .env.local.backup .env
  echo "✅ .env wiederhergestellt"
fi

