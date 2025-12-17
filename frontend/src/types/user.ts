import React from "react";

// User
export type CurrentUser = {
  id: number;
  name: string;
  role: "ORGANISATOR" | "FARMER" | "PACKSTELLE" | "PACKBETRIEB" | "EG_ADMIN";
  farmerId?: number | null;
};

// Bestätigung für Inventur / Verkäufe
export type ConfirmAction = {
  title: string;
  message: string | React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

// Tab-Typen
export type Tab = "stamm" | "farmerStock" | "packstation" | "stats" | "verkauf" | "reklamation" | "statistik" | "abrechnungen" | "lagerInventur" | "kalkulationen";


