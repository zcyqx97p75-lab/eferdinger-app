# GitHub Push 403-Fehler beheben

## Problem
```
remote: Permission to zcyqx97p75-lab/eferdinger-app.git denied to zcyqx97p75-lab.
fatal: unable to access 'https://github.com/zcyqx97p75-lab/eferdinger-app.git/': The requested URL returned error: 403
```

## Lösung 1: Personal Access Token verwenden (Empfohlen)

GitHub erlaubt seit 2021 keine Passwort-Authentifizierung mehr für HTTPS. Du musst ein **Personal Access Token** verwenden.

### Schritt 1: Token erstellen

1. Gehe zu: https://github.com/settings/tokens
2. Klicke auf **"Generate new token (classic)"**
3. **Note:** z.B. "Eferdinger App Deployment"
4. **Expiration:** Wähle eine Dauer (z.B. 90 Tage oder "No expiration")
5. **Scopes:** Aktiviere `repo` (vollständiger Zugriff auf Repositories)
6. Klicke auf **"Generate token"**
7. **WICHTIG:** Kopiere den Token sofort (wird nur einmal angezeigt!)

### Schritt 2: Token verwenden

Beim nächsten `git push`:
- **Username:** `zcyqx97p75-lab`
- **Password:** Füge den Token ein (nicht dein GitHub-Passwort!)

### Schritt 3: Token speichern (Optional)

```bash
# Token im macOS Keychain speichern
git config --global credential.helper osxkeychain
```

Dann beim nächsten Push den Token eingeben - macOS speichert ihn dann.

---

## Lösung 2: Credentials zurücksetzen

Falls gespeicherte Credentials falsch sind:

```bash
# Gespeicherte Credentials löschen
git credential-osxkeychain erase
host=github.com
protocol=https
# (Drücke Enter zweimal)

# Oder alle Credentials löschen
git config --global --unset credential.helper
```

---

## Lösung 3: SSH verwenden (Alternative)

Falls du SSH bevorzugst:

### Schritt 1: SSH-Key prüfen

```bash
ls -la ~/.ssh/id_rsa.pub
```

Falls keine SSH-Keys vorhanden:

```bash
# Neuen SSH-Key erstellen
ssh-keygen -t ed25519 -C "ewald.mayr@gemuese-mayr.at"
# Enter drücken für alle Fragen (Standard-Werte)

# Public Key anzeigen
cat ~/.ssh/id_ed25519.pub
```

### Schritt 2: SSH-Key zu GitHub hinzufügen

1. Kopiere den Public Key (Ausgabe von `cat ~/.ssh/id_ed25519.pub`)
2. Gehe zu: https://github.com/settings/keys
3. Klicke auf **"New SSH key"**
4. **Title:** z.B. "MacBook Pro"
5. **Key:** Füge den kopierten Key ein
6. Klicke auf **"Add SSH key"**

### Schritt 3: Remote-URL auf SSH ändern

```bash
cd ~/eferdinger-app
git remote set-url origin git@github.com:zcyqx97p75-lab/eferdinger-app.git
git push origin main
```

---

## Lösung 4: GitHub CLI verwenden

```bash
# GitHub CLI installieren (falls nicht vorhanden)
brew install gh

# Authentifizieren
gh auth login

# Push
git push origin main
```

---

## Schnellste Lösung: Personal Access Token

1. **Token erstellen:** https://github.com/settings/tokens
2. **Beim Push:** Token als Passwort verwenden
3. **Fertig!**

---

## Troubleshooting

### "Permission denied" trotz Token:
- Prüfe, ob der Token `repo` Scope hat
- Prüfe, ob der Token nicht abgelaufen ist
- Prüfe, ob du Zugriff auf das Repository hast

### "Repository not found":
- Prüfe, ob der Repository-Name korrekt ist
- Prüfe, ob du Zugriff auf das Repository hast

### Credentials werden nicht gespeichert:
```bash
git config --global credential.helper osxkeychain
```

