#!/bin/bash

# Test API-Verbindung und Datenbank-Zugriff

echo "🔍 Teste API-Verbindung..."
echo ""

# Backend URL (anpassen falls nötig)
BACKEND_URL="https://backend-production-37d3.up.railway.app/api"

echo "Backend URL: $BACKEND_URL"
echo ""

# Test 1: Health Check
echo "1️⃣ Teste Health Check..."
curl -s "$BACKEND_URL/health" | jq . || echo "❌ Health Check fehlgeschlagen"
echo ""

# Test 2: Kunden laden
echo "2️⃣ Teste Kunden-Endpoint..."
curl -s "$BACKEND_URL/customers" | jq 'length' && echo "Kunden gefunden" || echo "❌ Keine Kunden oder Fehler"
echo ""

# Test 3: Produkte laden
echo "3️⃣ Teste Produkte-Endpoint..."
curl -s "$BACKEND_URL/products" | jq 'length' && echo "Produkte gefunden" || echo "❌ Keine Produkte oder Fehler"
echo ""

# Test 4: Bauern laden
echo "4️⃣ Teste Bauern-Endpoint..."
curl -s "$BACKEND_URL/farmers" | jq 'length' && echo "Bauern gefunden" || echo "❌ Keine Bauern oder Fehler"
echo ""

echo "✅ Tests abgeschlossen"
echo ""
echo "Falls alle Tests erfolgreich sind, sollte das Frontend die Daten anzeigen."
echo "Falls nicht, prüfe:"
echo "  - Backend-Logs in Railway"
echo "  - Frontend Browser-Konsole (F12)"
echo "  - VITE_API_URL Environment Variable im Frontend"

