# Netzwerk-Setup für Präsentationen und wechselnde Netzwerkumgebungen

Dieses Projekt wurde so konfiguriert, dass es zuverlässig in verschiedenen Netzwerkumgebungen funktioniert.

## 🚀 Schnellstart

### Automatische Konfiguration (Empfohlen)

1. **Netzwerk-Setup ausführen:**
   ```bash
   npm run setup-network
   ```

2. **Backend starten:**
   ```bash
   npm run dev
   ```

3. **Frontend starten (mit automatischer Netzwerk-Erkennung):**
   ```bash
   cd frontend
   npm run dev:network
   ```

   Oder manuell:
   ```bash
   cd frontend
   npm run dev
   ```

### Manuelle Konfiguration

Falls die automatische Erkennung nicht funktioniert:

1. **Ermittle deine aktuelle IP-Adresse:**
   ```bash
   # macOS
   ipconfig getifaddr en0
   
   # Oder alle IPs anzeigen
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Aktualisiere `frontend/.env`:**
   ```env
   VITE_API_URL=http://<DEINE_IP>:4000/api
   ```
   
   Beispiel:
   ```env
   VITE_API_URL=http://10.0.10.251:4000/api
   ```

3. **Starte Backend und Frontend neu**

## 📋 Was wurde geändert?

### Backend (`src/server.ts`)
- ✅ Hört jetzt auf `0.0.0.0` statt nur `localhost` → erreichbar im Netzwerk
- ✅ Zeigt automatisch die Netzwerk-IP beim Start an
- ✅ Port konfigurierbar über `PORT` Umgebungsvariable (Standard: 4000)

### Frontend (`frontend/vite.config.ts`)
- ✅ Hört auf `0.0.0.0` → erreichbar im Netzwerk
- ✅ Port konfigurierbar über `VITE_PORT` Umgebungsvariable (Standard: 5173)
- ✅ Verwendet `VITE_API_URL` aus `.env` für API-Aufrufe

### Scripts
- ✅ `scripts/setup-network.sh`: Erkennt automatisch die IP-Adresse und aktualisiert die Konfiguration
- ✅ `npm run setup-network`: Führt das Setup-Script aus
- ✅ `npm run dev:network` (Frontend): Startet Frontend mit automatischer Netzwerk-Konfiguration

## 🔧 Umgebungsvariablen

### Backend (`.env` im Projekt-Root)
```env
PORT=4000          # Backend-Port (optional, Standard: 4000)
HOST=0.0.0.0      # Host (optional, Standard: 0.0.0.0)
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:4000/api  # Für lokale Entwicklung
# Oder für Netzwerk:
VITE_API_URL=http://10.0.10.251:4000/api  # Mit deiner IP-Adresse
VITE_PORT=5173                            # Frontend-Port (optional)
```

## 🌐 Für Präsentationen

1. **Vor der Präsentation:**
   ```bash
   npm run setup-network
   ```

2. **Backend starten:**
   ```bash
   npm run dev
   ```
   → Notiere dir die angezeigte Netzwerk-URL (z.B. `http://10.0.10.251:4000`)

3. **Frontend starten:**
   ```bash
   cd frontend
   npm run dev:network
   ```
   → Notiere dir die angezeigte Netzwerk-URL (z.B. `http://10.0.10.251:5173`)

4. **Im Browser öffnen:**
   - Öffne die Frontend-URL auf deinem Gerät oder auf anderen Geräten im selben Netzwerk
   - Beispiel: `http://10.0.10.251:5173`

## 🔍 Troubleshooting

### Problem: Frontend kann Backend nicht erreichen

**Lösung:**
1. Prüfe, ob Backend läuft: `curl http://localhost:4000/api/farmers`
2. Prüfe `frontend/.env`: `VITE_API_URL` muss die richtige IP enthalten
3. Führe `npm run setup-network` erneut aus

### Problem: Andere Geräte können nicht zugreifen

**Lösung:**
1. Prüfe Firewall-Einstellungen (Ports 4000 und 5173 müssen erlaubt sein)
2. Stelle sicher, dass alle Geräte im selben Netzwerk sind
3. Verwende die IP-Adresse statt `localhost` in der URL

### Problem: IP-Adresse ändert sich häufig

**Lösung:**
- Führe `npm run setup-network` vor jedem Start aus
- Oder verwende `npm run dev:network` im Frontend (führt Setup automatisch aus)

## 📝 Hinweise

- Die automatische IP-Erkennung funktioniert am besten, wenn du mit einem Kabel verbunden bist
- Bei WLAN kann die IP-Adresse sich ändern, wenn du das Netzwerk wechselst
- Für Produktions-Deployments sollte eine feste Domain/IP verwendet werden



