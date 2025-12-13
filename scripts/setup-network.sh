#!/bin/bash

# Script zur automatischen Konfiguration der Netzwerk-URLs
# Erkennt die aktuelle IP-Adresse und setzt die .env Dateien entsprechend

echo "🔍 Erkenne Netzwerk-Konfiguration..."

# Funktion zur Ermittlung der lokalen IP-Adresse
get_local_ip() {
    # Versuche verschiedene Methoden, um die IP zu finden
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
        if [ -z "$ip" ]; then
            # Fallback: verwende die erste nicht-localhost IPv4 Adresse
            ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
        fi
    else
        # Linux
        ip=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "")
        if [ -z "$ip" ]; then
            ip=$(ip route get 1.1.1.1 | awk '{print $7; exit}' 2>/dev/null || echo "")
        fi
    fi
    
    if [ -z "$ip" ]; then
        echo "localhost"
    else
        echo "$ip"
    fi
}

LOCAL_IP=$(get_local_ip)
BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

echo "📍 Gefundene IP-Adresse: $LOCAL_IP"
echo "🔧 Backend-Port: $BACKEND_PORT"
echo "🔧 Frontend-Port: $FRONTEND_PORT"

# Frontend .env aktualisieren
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_ENV="$PROJECT_ROOT/frontend/.env"
if [ -f "$FRONTEND_ENV" ]; then
    # Erstelle Backup
    cp "$FRONTEND_ENV" "$FRONTEND_ENV.backup" 2>/dev/null || true
    
    # Aktualisiere VITE_API_URL
    if grep -q "VITE_API_URL" "$FRONTEND_ENV"; then
        if [ "$LOCAL_IP" != "localhost" ]; then
            sed -i.bak "s|VITE_API_URL=.*|VITE_API_URL=http://${LOCAL_IP}:${BACKEND_PORT}/api|" "$FRONTEND_ENV"
            rm -f "$FRONTEND_ENV.bak" 2>/dev/null || true
            echo "✅ Frontend .env aktualisiert: VITE_API_URL=http://${LOCAL_IP}:${BACKEND_PORT}/api"
        else
            echo "⚠️  Keine Netzwerk-IP gefunden, verwende localhost"
        fi
    else
        echo "VITE_API_URL=http://${LOCAL_IP}:${BACKEND_PORT}/api" >> "$FRONTEND_ENV"
        echo "✅ VITE_API_URL zur Frontend .env hinzugefügt"
    fi
else
    echo "VITE_API_URL=http://${LOCAL_IP}:${BACKEND_PORT}/api" > "$FRONTEND_ENV"
    echo "✅ Frontend .env erstellt"
fi

echo ""
echo "🌐 Netzwerk-URLs:"
echo "   Frontend: http://${LOCAL_IP}:${FRONTEND_PORT}"
echo "   Backend:  http://${LOCAL_IP}:${BACKEND_PORT}"
echo ""
echo "💡 Tipp: Starte Frontend und Backend neu, damit die Änderungen wirksam werden."

