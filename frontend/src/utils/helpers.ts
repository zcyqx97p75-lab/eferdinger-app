import React from "react";
import type { CookingType } from "../types";

/**
 * Gibt das deutsche Label für einen CookingType zurück
 */
export function getCookingLabel(ct?: CookingType): string {
  switch (ct) {
    case "FESTKOCHEND":
      return "festkochend";
    case "VORWIEGEND_FESTKOCHEND":
      return "vorw. festk.";
    case "MEHLIG":
      return "mehlig";
    default:
      return ct ?? "unbekannt";
  }
}

/**
 * Öffnet den nativen Kalender für Datumsfelder beim Fokus
 * Auf mobilen Geräten öffnet type="date" automatisch den Kalender beim Fokussieren
 */
export const openDatePickerOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  if (e.target.type === 'date') {
    // Kleine Verzögerung, damit der Focus-Event abgeschlossen ist
    setTimeout(() => {
      e.target.showPicker?.();
    }, 0);
  }
};

/**
 * Öffnet ein Select-Dropdown sofort bei Fokus (Tab-Navigation oder Touch)
 */
export const openSelectOnFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
  // Simuliere mousedown um das native Dropdown zu öffnen
  const mouseEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  setTimeout(() => {
    e.target.dispatchEvent(mouseEvent);
  }, 0);
};

