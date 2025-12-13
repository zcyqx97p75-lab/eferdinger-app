# Bilder für die Eferdinger App

Dieser Ordner enthält die Bilder für die Login-Startseite.

## Benötigte Bilder

### 1. Logo (`logo.png`)
- **Dateiname:** `logo.png` (oder `.jpg`, `.svg`)
- **Format:** PNG, JPG oder SVG
- **Größe:** Empfohlen max. 400px Breite
- **Hintergrund:** Transparent (bei PNG) oder weiß/hell
- **Beschreibung:** Das Eferdinger Landl Erdäpfel-Logo

### 2. Hintergrundbild (optional) (`background.jpg`)
- **Dateiname:** `background.jpg` (oder `.png`, `.webp`)
- **Format:** JPG, PNG oder WebP
- **Größe:** Empfohlen min. 1920x1080px (wird automatisch skaliert)
- **Motiv:** 
  - Erdäpfel
  - Feld / Ernte
  - Kiste mit Erdäpfeln
  - Detailaufnahme (leicht unscharf für bessere Lesbarkeit)
- **Hinweis:** Das Bild wird automatisch abgedunkelt, damit der Login-Container gut lesbar bleibt

## Verwendung

Die Bilder werden automatisch von der Login-Seite geladen:
- Logo: `/images/logo.png`
- Hintergrund: `/images/background.jpg`

Falls ein Bild nicht vorhanden ist, wird ein Fallback verwendet (Logo wird ausgeblendet, Hintergrund bleibt dunkel).

## Optimierung

Für beste Performance:
- Bilder komprimieren (z.B. mit TinyPNG oder ImageOptim)
- WebP-Format verwenden (wird von modernen Browsern unterstützt)
- Hintergrundbild sollte nicht zu groß sein (max. 500KB empfohlen)

