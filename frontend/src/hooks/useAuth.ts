import { useState, useEffect } from "react";
import type { CurrentUser } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export function useAuth(
  showMessage: (text: string) => void,
  onLogout?: () => void
) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Login aus localStorage laden (damit Reload nicht ausloggt)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("currentUser");
      if (saved) {
        const user = JSON.parse(saved);
        setCurrentUser(user);
      }
    } catch (err) {
      console.error("Fehler beim Lesen von currentUser aus localStorage", err);
    }
  }, []);

  // Login in localStorage speichern
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  async function handleLogin(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
    }

    if (!loginEmail.trim() || !loginPassword.trim()) {
      showMessage("Bitte E-Mail und Passwort eingeben");
      return;
    }

    console.log("handleLogin START", { loginEmail, loginPassword: "***" });

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });

      console.log("Login-Fetch Response", res.status, res.statusText);

      const text = await res.text().catch(() => "");
      console.log("Login response body:", text);

      if (!res.ok) {
        let errorMessage = "Login fehlgeschlagen";
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Wenn kein JSON, verwende den Text direkt
          if (text) {
            errorMessage = text;
          }
        }
        console.error("Login error:", errorMessage);
        showMessage(errorMessage);
        return;
      }

      let user: CurrentUser;
      try {
        user = JSON.parse(text);
      } catch (err) {
        console.error("Konnte Login-JSON nicht parsen", err, "Raw text:", text);
        showMessage("Antwort vom Server ungültig");
        return;
      }

      // Validierung der User-Daten
      if (!user || typeof user !== "object") {
        console.error("Ungültige User-Daten: Kein Objekt", user);
        showMessage("Ungültige Benutzerdaten erhalten");
        return;
      }
      
      if (!user.id || typeof user.id !== "number" || user.id < 1) {
        console.error("Ungültige User-ID:", user.id);
        showMessage("Ungültige Benutzerdaten erhalten");
        return;
      }
      
      if (!user.role || typeof user.role !== "string") {
        console.error("Ungültige User-Rolle:", user.role);
        showMessage("Ungültige Benutzerdaten erhalten");
        return;
      }
      
      const validRoles = ["ORGANISATOR", "FARMER", "PACKSTELLE", "PACKBETRIEB", "EG_ADMIN"];
      if (!validRoles.includes(user.role)) {
        console.error("Unbekannte User-Rolle:", user.role);
        showMessage("Ungültige Benutzerdaten erhalten");
        return;
      }
      
      if (!user.name || typeof user.name !== "string" || user.name.trim() === "") {
        console.error("Ungültiger User-Name:", user.name);
        showMessage("Ungültige Benutzerdaten erhalten");
        return;
      }

      console.log("LOGIN USER parsed", user);
      setCurrentUser(user);
      showMessage(`Eingeloggt als ${user.name} (${user.role})`);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err) {
      console.error("Fetch-Fehler beim Login:", err);
      const errorMsg = err instanceof Error ? err.message : "Netzwerkfehler";
      showMessage(`Fehler beim Login: ${errorMsg}`);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    if (onLogout) {
      onLogout();
    }
    showMessage("Abgemeldet");
  }

  return {
    currentUser,
    setCurrentUser,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    handleLogin,
    handleLogout,
  };
}

