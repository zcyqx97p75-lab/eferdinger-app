import React from "react";
import type { Farmer, PackPlant, CurrentUser } from "../../types";
import { formatAmount, formatKg, openDatePickerOnFocus } from "../../utils";
import { ActionCard } from "../ActionCard";
import { API_URL } from "../../services";

type DocResult = {
  success: boolean;
  message?: string;
  document?: {
    documentNumber: string;
  };
  pdf?: {
    filename: string;
    downloadUrl: string;
  };
};

interface AbrechnungenTabProps {
  isEgAdmin: boolean;
  currentUser: CurrentUser | null;
  safeFarmers: Farmer[];
  packPlants: PackPlant[];
  abrechnungSubTab: "bauer" | "packbetrieb";
  setAbrechnungSubTab: (value: "bauer" | "packbetrieb") => void;
  abrFarmerId: number | "";
  setAbrFarmerId: (value: number | "") => void;
  abrDateFrom: string;
  setAbrDateFrom: (value: string) => void;
  abrDateTo: string;
  setAbrDateTo: (value: string) => void;
  abrLoading: boolean;
  setAbrLoading: (value: boolean) => void;
  abrResult: {
    success: boolean;
    message: string;
    statement?: {
      farmerName: string;
      totalAmount: number;
      totalDeliveryKg: number;
      lineCount: number;
    };
    pdf?: {
      filename: string;
      downloadUrl: string;
    };
    farmerEmail?: string | null;
  } | null;
  setAbrResult: (value: {
    success: boolean;
    message: string;
    statement?: {
      farmerName: string;
      totalAmount: number;
      totalDeliveryKg: number;
      lineCount: number;
    };
    pdf?: {
      filename: string;
      downloadUrl: string;
    };
    farmerEmail?: string | null;
  } | null) => void;
  ppPackPlantId: number | "";
  setPpPackPlantId: (value: number | "") => void;
  ppDateFrom: string;
  setPpDateFrom: (value: string) => void;
  ppDateTo: string;
  setPpDateTo: (value: string) => void;
  ppLoadingInvoice: boolean;
  setPpLoadingInvoice: (value: boolean) => void;
  ppLoadingCredit: boolean;
  setPpLoadingCredit: (value: boolean) => void;
  ppInvoiceResult: DocResult | null;
  setPpInvoiceResult: (value: DocResult | null) => void;
  ppCreditResult: DocResult | null;
  setPpCreditResult: (value: DocResult | null) => void;
  loadPackPlants: () => Promise<void>;
  showMessage: (text: string) => void;
  setConfirmAction: (action: any) => void;
}

export const AbrechnungenTab: React.FC<AbrechnungenTabProps> = ({
  isEgAdmin,
  currentUser,
  safeFarmers,
  packPlants,
  abrechnungSubTab,
  setAbrechnungSubTab,
  abrFarmerId,
  setAbrFarmerId,
  abrDateFrom,
  setAbrDateFrom,
  abrDateTo,
  setAbrDateTo,
  abrLoading,
  setAbrLoading,
  abrResult,
  setAbrResult,
  ppPackPlantId,
  setPpPackPlantId,
  ppDateFrom,
  setPpDateFrom,
  ppDateTo,
  setPpDateTo,
  ppLoadingInvoice,
  setPpLoadingInvoice,
  ppLoadingCredit,
  setPpLoadingCredit,
  ppInvoiceResult,
  setPpInvoiceResult,
  ppCreditResult,
  setPpCreditResult,
  loadPackPlants,
  showMessage,
  setConfirmAction,
}) => {
  if (!isEgAdmin) {
    return <p>Nur für Administratoren sichtbar.</p>;
  }

  const resolvePdfLink = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const apiBase =
      API_URL && API_URL.startsWith("http")
        ? API_URL.replace(/\/api$/, "")
        : "";
    return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const handleCreateStatement = async () => {
    if (!abrFarmerId) {
      showMessage("Bitte einen Bauern auswählen");
      return;
    }
    if (!abrDateFrom || !abrDateTo) {
      showMessage("Bitte Zeitraum auswählen");
      return;
    }
    if (new Date(abrDateFrom) > new Date(abrDateTo)) {
      showMessage("'Von' muss vor 'Bis' liegen");
      return;
    }

    const farmer = safeFarmers.find((f: Farmer) => f.id === abrFarmerId);

    setConfirmAction({
      title: "Abrechnung erstellen?",
      message: `Möchten Sie eine Akonto-Abrechnung für "${farmer?.name || "Bauer"}" im Zeitraum ${abrDateFrom} bis ${abrDateTo} wirklich erstellen?`,
      confirmLabel: "Ja, erstellen",
      cancelLabel: "Nein, abbrechen",
      onConfirm: async () => {
        setConfirmAction(null);
    setAbrLoading(true);
    setAbrResult(null);

    try {
      const res = await fetch(`${API_URL}/admin/farmer-statement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: abrFarmerId,
          dateFrom: abrDateFrom,
          dateTo: abrDateTo,
          sendEmail: false, // Kein automatischer Versand
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Erstellen");
      }

      // E-Mail des Bauern hinzufügen
      const farmer = safeFarmers.find((f: Farmer) => f.id === abrFarmerId);
      setAbrResult({
        ...data,
        farmerEmail: farmer?.loginEmail || data.email?.to || null,
      });
      
      showMessage("Abrechnung erstellt! PDF kann jetzt geöffnet werden.");
    } catch (err: any) {
      showMessage(err.message || "Fehler beim Erstellen der Abrechnung");
    } finally {
      setAbrLoading(false);
    }
      },
    });
  };

  // Mailto-Link für E-Mail im Standard-Mailprogramm
  const generateMailtoLink = () => {
    if (!abrResult?.farmerEmail || !abrResult?.statement) return "";
    
    const farmerName = abrResult.statement.farmerName;
    const adminName = currentUser?.name || "Ihr Team";
    
    const subject = encodeURIComponent(`Ihre Akonto-Abrechnung - Eferdinger Landl`);
    const body = encodeURIComponent(
`Sehr geehrte/r ${farmerName},

im Anhang finden Sie Ihre aktuelle Akonto-Abrechnung.

Es freut uns, dass Sie Teil unserer Gemeinschaft sind! Bei Fragen können Sie sich jederzeit an uns wenden.

Liebe Grüße
${adminName}
Erzeugergemeinschaft Eferdinger Landl Erdäpfel`
    );
    
    return `mailto:${abrResult.farmerEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div style={{ maxWidth: "900px" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>📊 Abrechnungen</h1>

      {/* Sub-Navigation */}
      <div style={{ 
        display: "flex", 
        gap: "0.5rem", 
        marginBottom: "1.5rem",
        borderBottom: "1px solid #334155",
        paddingBottom: "0.75rem",
      }}>
        <button
          type="button"
          onClick={() => setAbrechnungSubTab("bauer")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            background: abrechnungSubTab === "bauer" ? "#3b82f6" : "transparent",
            border: abrechnungSubTab === "bauer" ? "none" : "1px solid #475569",
            color: abrechnungSubTab === "bauer" ? "#fff" : "#94a3b8",
            cursor: "pointer",
            fontWeight: abrechnungSubTab === "bauer" ? 600 : 400,
          }}
        >
          🧑‍🌾 Bauernabrechnung
        </button>
        <button
          type="button"
          onClick={() => {
            setAbrechnungSubTab("packbetrieb");
            if (packPlants.length === 0) {
              loadPackPlants();
            }
          }}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            background: abrechnungSubTab === "packbetrieb" ? "#3b82f6" : "transparent",
            border: abrechnungSubTab === "packbetrieb" ? "none" : "1px solid #475569",
            color: abrechnungSubTab === "packbetrieb" ? "#fff" : "#94a3b8",
            cursor: "pointer",
            fontWeight: abrechnungSubTab === "packbetrieb" ? 600 : 400,
          }}
        >
          🏭 Packbetriebsabrechnung
        </button>
      </div>

      {/* Bauernabrechnung */}
      {abrechnungSubTab === "bauer" && (
        <ActionCard title="Akonto-Abrechnung erstellen" icon="📄">
          <p style={{ color: "#94a3b8", marginBottom: "1rem", fontSize: "0.875rem" }}>
            Erstellt eine Akonto-Abrechnung für einen Bauern, generiert ein PDF und versendet es per E-Mail.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Bauer auswählen */}
            <div>
              <label>Bauer auswählen</label>
              <select
                value={abrFarmerId === "" ? "" : String(abrFarmerId)}
                onChange={(e) => setAbrFarmerId(e.target.value ? Number(e.target.value) : "")}
                style={{ width: "100%" }}
              >
                <option value="">-- Bauer wählen --</option>
                {safeFarmers.map((f: Farmer) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.name} {f.farmName ? `(${f.farmName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Zeitraum */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label>Von</label>
                <input
                  type="date"
                  value={abrDateFrom}
                  onChange={(e) => setAbrDateFrom(e.target.value)}
                  onFocus={openDatePickerOnFocus}
                />
              </div>
              <div>
                <label>Bis</label>
                <input
                  type="date"
                  value={abrDateTo}
                  onChange={(e) => setAbrDateTo(e.target.value)}
                  onFocus={openDatePickerOnFocus}
                />
              </div>
            </div>

            {/* Schnellauswahl */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ color: "#64748b", fontSize: "0.8125rem", alignSelf: "center" }}>Schnellauswahl:</span>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 1);
                  setAbrDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10));
                  setAbrDateTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10));
                }}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "0.375rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                Letzter Monat
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setAbrDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10));
                  setAbrDateTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10));
                }}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "0.375rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                Aktueller Monat
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setAbrDateFrom(new Date(d.getFullYear(), 0, 1).toISOString().substring(0, 10));
                  setAbrDateTo(new Date(d.getFullYear(), 11, 31).toISOString().substring(0, 10));
                }}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "0.375rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                Gesamtes Jahr
              </button>
            </div>

            {/* Button */}
            <button
              type="button"
              onClick={handleCreateStatement}
              disabled={abrLoading || !abrFarmerId}
              style={{
                marginTop: "0.5rem",
                padding: "0.875rem 1.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                background: abrLoading || !abrFarmerId 
                  ? "#475569" 
                  : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                border: "none",
                borderRadius: "0.5rem",
                color: "#fff",
                cursor: abrLoading || !abrFarmerId ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {abrLoading ? (
                <>
                  <span className="spinner" style={{ 
                    width: "1rem", 
                    height: "1rem", 
                    border: "2px solid #fff", 
                    borderTopColor: "transparent", 
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  Wird erstellt...
                </>
              ) : (
                <>📄 Abrechnung erstellen</>
              )}
            </button>
          </div>

          {/* Ergebnis */}
          {abrResult && (
            <div style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              background: abrResult.success ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${abrResult.success ? "#22c55e" : "#ef4444"}`,
            }}>
              <p style={{ 
                fontWeight: 600, 
                color: abrResult.success ? "#22c55e" : "#ef4444",
                marginBottom: "1rem",
              }}>
                {abrResult.success ? "✅ Abrechnung erstellt" : "❌ " + abrResult.message}
              </p>

              {abrResult.statement && (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(2, 1fr)", 
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#cbd5e1",
                  marginBottom: "1.25rem",
                }}>
                  <div>Bauer: <strong>{abrResult.statement.farmerName}</strong></div>
                  <div>Positionen: <strong>{abrResult.statement.lineCount}</strong></div>
                  <div>Liefermenge: <strong>{formatKg(abrResult.statement.totalDeliveryKg)} kg</strong></div>
                  <div>Betrag: <strong style={{ color: "#22c55e" }}>
                    {formatAmount(abrResult.statement.totalAmount)} €
                  </strong></div>
                </div>
              )}

              {/* Schritt 1: PDF öffnen */}
              {abrResult.pdf && (
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "0.75rem",
                  padding: "1rem",
                  background: "rgba(30, 41, 59, 0.5)",
                  borderRadius: "0.5rem",
                  marginBottom: "1rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ 
                      background: "#3b82f6", 
                      color: "#fff", 
                      borderRadius: "50%", 
                      width: "1.5rem", 
                      height: "1.5rem", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}>1</span>
                    <span style={{ fontWeight: 500 }}>PDF öffnen / speichern</span>
                  </div>
                  <a
                    href={resolvePdfLink(abrResult.pdf.downloadUrl)}
                    download
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      padding: "0.75rem 1.25rem",
                      background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                      border: "none",
                      borderRadius: "0.5rem",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                    }}
                  >
                    📄 PDF öffnen
                  </a>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                    Im PDF-Viewer können Sie das Dokument ansehen und bei Bedarf speichern (Strg+S / Cmd+S).
                  </p>
                </div>
              )}

              {/* Schritt 2: E-Mail versenden */}
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "0.75rem",
                padding: "1rem",
                background: "rgba(30, 41, 59, 0.5)",
                borderRadius: "0.5rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ 
                    background: "#22c55e", 
                    color: "#fff", 
                    borderRadius: "50%", 
                    width: "1.5rem", 
                    height: "1.5rem", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}>2</span>
                  <span style={{ fontWeight: 500 }}>E-Mail versenden</span>
                </div>
                
                {abrResult.farmerEmail ? (
                  <>
                    <a
                      href={generateMailtoLink()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        padding: "0.75rem 1.25rem",
                        background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                        border: "none",
                        borderRadius: "0.5rem",
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                      }}
                    >
                      ✉️ E-Mail an {abrResult.farmerEmail}
                    </a>
                    <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                      Öffnet Ihr Standard-Mailprogramm mit vorausgefülltem Text. 
                      <strong> Vergessen Sie nicht, das PDF anzuhängen!</strong>
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: "0.875rem", color: "#f59e0b", margin: 0 }}>
                    ⚠️ Keine E-Mail-Adresse für diesen Bauern hinterlegt. 
                    Bitte in den Stammdaten ergänzen.
                  </p>
                )}
              </div>
            </div>
          )}
        </ActionCard>
      )}

      {/* Packbetriebsabrechnung */}
      {abrechnungSubTab === "packbetrieb" && (
        <ActionCard title="Packbetrieb: Rechnung & Gutschrift" icon="🏭">
          <p style={{ color: "#94a3b8", marginBottom: "1rem", fontSize: "0.875rem" }}>
            Rechnung EG → Packbetrieb (verkaufte Produkte) und Gutschrift für Abpackkosten. PDF wird generiert, Download- und Mailto-Link stehen zur Verfügung.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label>Packbetrieb</label>
              <select
                value={ppPackPlantId}
                onChange={(e) => setPpPackPlantId(e.target.value ? Number(e.target.value) : "")}
                style={{ width: "100%" }}
              >
                <option value="">-- Packbetrieb wählen --</option>
                {packPlants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.vatId ? `(UID: ${p.vatId})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label>Von</label>
                <input
                  type="date"
                  value={ppDateFrom}
                  onChange={(e) => setPpDateFrom(e.target.value)}
                  onFocus={openDatePickerOnFocus}
                />
              </div>
              <div>
                <label>Bis</label>
                <input
                  type="date"
                  value={ppDateTo}
                  onChange={(e) => setPpDateTo(e.target.value)}
                  onFocus={openDatePickerOnFocus}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ color: "#64748b", fontSize: "0.8125rem", alignSelf: "center" }}>Schnellauswahl:</span>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 1);
                  setPpDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10));
                  setPpDateTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10));
                }}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "0.375rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                Letzter Monat
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setPpDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10));
                  setPpDateTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10));
                }}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "0.375rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                Aktueller Monat
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-action-primary"
                onClick={async () => {
                  if (!ppPackPlantId || !ppDateFrom || !ppDateTo) {
                    showMessage("Packbetrieb und Zeitraum wählen");
                    return;
                  }
                  setPpInvoiceResult(null);
                  setPpLoadingInvoice(true);
                  try {
                    const res = await fetch(`${API_URL}/admin/packplant-invoice`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        packPlantId: ppPackPlantId,
                        dateFrom: ppDateFrom,
                        dateTo: ppDateTo,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.error || "Fehler beim Erstellen der Rechnung");
                    }
                    setPpInvoiceResult(data);
                    showMessage("Rechnung erstellt");
                  } catch (err: any) {
                    console.error(err);
                    showMessage(err.message || "Fehler beim Erstellen der Rechnung");
                  } finally {
                    setPpLoadingInvoice(false);
                  }
                }}
                disabled={ppLoadingInvoice}
              >
                {ppLoadingInvoice ? "⏳ Erstelle..." : "📄 Rechnung erstellen"}
              </button>

              <button
                type="button"
                className="btn-action-secondary"
                onClick={async () => {
                  if (!ppPackPlantId || !ppDateFrom || !ppDateTo) {
                    showMessage("Packbetrieb und Zeitraum wählen");
                    return;
                  }
                  setPpCreditResult(null);
                  setPpLoadingCredit(true);
                  try {
                    const res = await fetch(`${API_URL}/admin/packplant-credit-note`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        packPlantId: ppPackPlantId,
                        dateFrom: ppDateFrom,
                        dateTo: ppDateTo,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.error || "Fehler beim Erstellen der Gutschrift");
                    }
                    setPpCreditResult(data);
                    showMessage("Gutschrift erstellt");
                  } catch (err: any) {
                    console.error(err);
                    showMessage(err.message || "Fehler beim Erstellen der Gutschrift");
                  } finally {
                    setPpLoadingCredit(false);
                  }
                }}
                disabled={ppLoadingCredit}
              >
                {ppLoadingCredit ? "Erstelle..." : "Gutschrift Abpackkosten"}
              </button>
            </div>

            {(ppInvoiceResult || ppCreditResult) && (
              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {ppInvoiceResult && (
                  <div
                    style={{
                      background: "rgba(56, 189, 248, 0.1)",
                      border: "1px solid #38bdf8",
                      borderRadius: "0.5rem",
                      padding: "0.75rem",
                    }}
                  >
                    <strong>Rechnung erstellt</strong>
                    <p style={{ margin: "0.35rem 0" }}>
                      Nummer: {ppInvoiceResult.document?.documentNumber ?? "n/a"}
                    </p>
                    {ppInvoiceResult.pdf && (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <a
                              href={resolvePdfLink(ppInvoiceResult.pdf.downloadUrl)}
                              download
                          className="btn-link"
                        >
                          PDF herunterladen
                        </a>
                        <a
                          href={`mailto:?subject=${encodeURIComponent(
                            `Rechnung ${ppInvoiceResult.document?.documentNumber ?? ""}`
                          )}&body=${encodeURIComponent(
                            `PDF-Link: ${resolvePdfLink(ppInvoiceResult.pdf.downloadUrl)}`
                          )}`}
                          className="btn-link"
                        >
                          E-Mail (Standard-Mailprogramm)
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {ppCreditResult && (
                  <div
                    style={{
                      background: "rgba(74, 222, 128, 0.1)",
                      border: "1px solid #4ade80",
                      borderRadius: "0.5rem",
                      padding: "0.75rem",
                    }}
                  >
                    <strong>Gutschrift erstellt</strong>
                    <p style={{ margin: "0.35rem 0" }}>
                      Nummer: {ppCreditResult.document?.documentNumber ?? "n/a"}
                    </p>
                    {ppCreditResult.pdf && (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <a
                          href={resolvePdfLink(ppCreditResult.pdf.downloadUrl)}
                          download
                          className="btn-link"
                        >
                          PDF herunterladen
                        </a>
                        <a
                          href={`mailto:?subject=${encodeURIComponent(
                            `Gutschrift ${ppCreditResult.document?.documentNumber ?? ""}`
                          )}&body=${encodeURIComponent(
                            `PDF-Link: ${resolvePdfLink(ppCreditResult.pdf.downloadUrl)}`
                          )}`}
                          className="btn-link"
                        >
                          E-Mail (Standard-Mailprogramm)
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ActionCard>
      )}

    </div>
  );
};

