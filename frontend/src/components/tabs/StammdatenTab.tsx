import React from "react";
import type {
  CookingType,
  VarietyQuality,
  Farmer,
  Variety,
  Product,
  Customer,
  ConfirmAction,
} from "../../types";
import { formatKg, formatAmount, getCookingLabel, openDatePickerOnFocus, openSelectOnFocus } from "../../utils";
import { CalcInput } from "../CalcInput";
import { ActionCard } from "../ActionCard";
import { API_URL } from "../../services";
import type { Price, QualityPrice, TaxRate, AdminUser } from "../../services";

interface StammdatenTabProps {
  canEditStammdaten: boolean;
  isEgAdmin: boolean;
  stammdatenSubTab: "benutzer" | "planmengen" | "stammdaten" | "preise";
  setStammdatenSubTab: (value: "benutzer" | "planmengen" | "stammdaten" | "preise") => void;
  stammdatenFunction: string;
  setStammdatenFunction: (value: string) => void;
  
  // User-Verwaltung
  userName: string;
  setUserName: (value: string) => void;
  userEmail: string;
  setUserEmail: (value: string) => void;
  userPassword: string;
  setUserPassword: (value: string) => void;
  userRole: "EG_ADMIN" | "ORGANISATOR" | "PACKSTELLE" | "PACKBETRIEB";
  setUserRole: (value: "EG_ADMIN" | "ORGANISATOR" | "PACKSTELLE" | "PACKBETRIEB") => void;
  userCreateError: string | null;
  handleCreateUser: (e: React.FormEvent) => Promise<void>;
  
  // Passwort-Reset User
  allUsers: AdminUser[];
  selectedUserId: number | "";
  setSelectedUserId: (value: number | "") => void;
  newUserPassword: string;
  setNewUserPassword: (value: string) => void;
  passwordResetError: string | null;
  handleResetUserPassword: (e: React.FormEvent) => Promise<void>;
  
  // Passwort-Reset Farmer
  selectedFarmerId: number | "";
  setSelectedFarmerId: (value: number | "") => void;
  newFarmerPassword: string;
  setNewFarmerPassword: (value: string) => void;
  farmerPasswordResetError: string | null;
  handleResetFarmerPassword: (e: React.FormEvent) => Promise<void>;
  
  // Planmengen
  planFarmerIdInput: number | "";
  setPlanFarmerIdInput: (value: number | "") => void;
  planCookingTypeInput: CookingType;
  setPlanCookingTypeInput: (value: CookingType) => void;
  planMonthInput: number | "";
  setPlanMonthInput: (value: number | "") => void;
  planWeekInput: number | "";
  setPlanWeekInput: (value: number | "") => void;
  planQuantityKgInput: string;
  setPlanQuantityKgInput: (value: string) => void;
  handleImportPlansFromCsv: () => Promise<void>;
  handleSavePlanmenge: (e: React.FormEvent) => Promise<void>;
  loadDeliveryPlans: (year: number, farmerId?: number) => Promise<void>;
  
  // Farmer
  farmers: Farmer[];
  farmerName: string;
  setFarmerName: (value: string) => void;
  farmerStreet: string;
  setFarmerStreet: (value: string) => void;
  farmerPostalCode: string;
  setFarmerPostalCode: (value: string) => void;
  farmerCity: string;
  setFarmerCity: (value: string) => void;
  farmerGGN: string;
  setFarmerGGN: (value: string) => void;
  farmerIsFlatRate: boolean;
  setFarmerIsFlatRate: (value: boolean) => void;
  farmerFlatRateNote: string;
  setFarmerFlatRateNote: (value: string) => void;
  farmerLoginEmail: string;
  setFarmerLoginEmail: (value: string) => void;
  farmerLoginPassword: string;
  setFarmerLoginPassword: (value: string) => void;
  editingFarmerId: number | null;
  setEditingFarmerId: (value: number | null) => void;
  handleCreateFarmer: (e: React.FormEvent) => Promise<void>;
  
  // Produkte
  safeProducts: Product[];
  productName: string;
  setProductName: (value: string) => void;
  productCookingType: CookingType;
  setProductCookingType: (value: CookingType) => void;
  productPackagingType: string;
  setProductPackagingType: (value: string) => void;
  productUnitKg: string;
  setProductUnitKg: (value: string) => void;
  productUnitsPerColli: string;
  setProductUnitsPerColli: (value: string) => void;
  productCollisPerPallet: string;
  setProductCollisPerPallet: (value: string) => void;
  productNumber: string;
  setProductNumber: (value: string) => void;
  productTaxRateId: number | "";
  setProductTaxRateId: (value: number | "") => void;
  editingProductId: number | null;
  setEditingProductId: (value: number | null) => void;
  handleCreateProduct: (e: React.FormEvent) => Promise<void>;
  
  // Sorten
  safeVarieties: Variety[];
  varietyName: string;
  setVarietyName: (value: string) => void;
  varietyCookingType: CookingType;
  setVarietyCookingType: (value: CookingType) => void;
  varietyQuality: VarietyQuality;
  setVarietyQuality: (value: VarietyQuality) => void;
  editingVarietyId: number | null;
  setEditingVarietyId: (value: number | null) => void;
  loadVarieties: () => Promise<void>;
  
  // Kunden
  customers: Customer[];
  customerName: string;
  setCustomerName: (value: string) => void;
  customerRegion: string;
  setCustomerRegion: (value: string) => void;
  editingCustomerId: number | null;
  setEditingCustomerId: (value: number | null) => void;
  handleCreateCustomer: (e: React.FormEvent) => Promise<void>;
  
  // Preise
  prices: Price[];
  priceCustomerId: number | "";
  setPriceCustomerId: (value: number | "") => void;
  priceProductId: number | "";
  setPriceProductId: (value: number | "") => void;
  pricePerUnit: string;
  setPricePerUnit: (value: string) => void;
  pricePackingCostPerUnit: string;
  setPricePackingCostPerUnit: (value: string) => void;
  priceValidFrom: string;
  setPriceValidFrom: (value: string) => void;
  editingPriceId: number | null;
  setEditingPriceId: (value: number | null) => void;
  handleCreatePrice: (e: React.FormEvent) => Promise<void>;
  loadPrices: (customerId?: number, productId?: number) => Promise<void>;
  
  // Qualitätspreise
  qualityPrices: QualityPrice[];
  qpQuality: VarietyQuality;
  setQpQuality: (value: VarietyQuality) => void;
  qpValidFrom: string;
  setQpValidFrom: (value: string) => void;
  qpValidTo: string;
  setQpValidTo: (value: string) => void;
  qpPricePerKg: string;
  setQpPricePerKg: (value: string) => void;
  qpTaxRateId: number | "";
  setQpTaxRateId: (value: number | "") => void;
  editingQualityPriceId: number | null;
  setEditingQualityPriceId: (value: number | null) => void;
  loadQualityPrices: () => Promise<void>;
  
  // Tax Rates
  taxRates: TaxRate[];
  
  // Allgemein
  showMessage: (text: string) => void;
  setConfirmAction: (action: ConfirmAction | null) => void;
}

export function StammdatenTab(props: StammdatenTabProps) {
  const {
    canEditStammdaten,
    isEgAdmin,
    stammdatenSubTab,
    setStammdatenSubTab,
    stammdatenFunction,
    setStammdatenFunction,
    userName,
    setUserName,
    userEmail,
    setUserEmail,
    userPassword,
    setUserPassword,
    userRole,
    setUserRole,
    userCreateError,
    handleCreateUser,
    allUsers,
    selectedUserId,
    setSelectedUserId,
    newUserPassword,
    setNewUserPassword,
    passwordResetError,
    handleResetUserPassword,
    selectedFarmerId,
    setSelectedFarmerId,
    newFarmerPassword,
    setNewFarmerPassword,
    farmerPasswordResetError,
    handleResetFarmerPassword,
    planFarmerIdInput,
    setPlanFarmerIdInput,
    planCookingTypeInput,
    setPlanCookingTypeInput,
    planMonthInput,
    setPlanMonthInput,
    planWeekInput,
    setPlanWeekInput,
    planQuantityKgInput,
    setPlanQuantityKgInput,
    handleImportPlansFromCsv,
    handleSavePlanmenge,
    loadDeliveryPlans,
    farmers,
    farmerName,
    setFarmerName,
    farmerStreet,
    setFarmerStreet,
    farmerPostalCode,
    setFarmerPostalCode,
    farmerCity,
    setFarmerCity,
    farmerGGN,
    setFarmerGGN,
    farmerIsFlatRate,
    setFarmerIsFlatRate,
    farmerFlatRateNote,
    setFarmerFlatRateNote,
    farmerLoginEmail,
    setFarmerLoginEmail,
    farmerLoginPassword,
    setFarmerLoginPassword,
    editingFarmerId,
    setEditingFarmerId,
    handleCreateFarmer,
    safeProducts,
    productName,
    setProductName,
    productCookingType,
    setProductCookingType,
    productPackagingType,
    setProductPackagingType,
    productUnitKg,
    setProductUnitKg,
    productUnitsPerColli,
    setProductUnitsPerColli,
    productCollisPerPallet,
    setProductCollisPerPallet,
    productNumber,
    setProductNumber,
    productTaxRateId,
    setProductTaxRateId,
    editingProductId,
    setEditingProductId,
    handleCreateProduct,
    safeVarieties,
    varietyName,
    setVarietyName,
    varietyCookingType,
    setVarietyCookingType,
    varietyQuality,
    setVarietyQuality,
    editingVarietyId,
    setEditingVarietyId,
    loadVarieties,
    customers,
    customerName,
    setCustomerName,
    customerRegion,
    setCustomerRegion,
    editingCustomerId,
    setEditingCustomerId,
    handleCreateCustomer,
    prices,
    priceCustomerId,
    setPriceCustomerId,
    priceProductId,
    setPriceProductId,
    pricePerUnit,
    setPricePerUnit,
    pricePackingCostPerUnit,
    setPricePackingCostPerUnit,
    priceValidFrom,
    setPriceValidFrom,
    editingPriceId,
    setEditingPriceId,
    handleCreatePrice,
    loadPrices,
    qualityPrices,
    qpQuality,
    setQpQuality,
    qpValidFrom,
    setQpValidFrom,
    qpValidTo,
    setQpValidTo,
    qpPricePerKg,
    setQpPricePerKg,
    qpTaxRateId,
    setQpTaxRateId,
    editingQualityPriceId,
    setEditingQualityPriceId,
    loadQualityPrices,
    taxRates,
    showMessage,
    setConfirmAction,
  } = props;

  if (!canEditStammdaten) {
    return <p>Stammdaten können nur von Admin gepflegt werden.</p>;
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* Sub-Navigation */}
      <div style={{ 
        display: "flex", 
        gap: "0.5rem", 
        marginBottom: "1.5rem",
        borderBottom: "1px solid #334155",
        paddingBottom: "0.75rem",
        flexWrap: "wrap",
      }}>
        <button
          type="button"
          onClick={() => {
            setStammdatenSubTab("benutzer");
            setStammdatenFunction("userAnlegen");
          }}
          className={`btn-subtab ${stammdatenSubTab === "benutzer" ? "active" : ""}`}
        >
          👤 Benutzer & Passwörter
        </button>
        <button
          type="button"
          onClick={() => {
            setStammdatenSubTab("planmengen");
            setStammdatenFunction("importieren");
          }}
          className={`btn-subtab ${stammdatenSubTab === "planmengen" ? "active" : ""}`}
        >
          📝 Planmengen
        </button>
        <button
          type="button"
          onClick={() => {
            setStammdatenSubTab("stammdaten");
            setStammdatenFunction("bauern");
          }}
          className={`btn-subtab ${stammdatenSubTab === "stammdaten" ? "active" : ""}`}
        >
          📋 Stammdaten
        </button>
        <button
          type="button"
          onClick={() => {
            setStammdatenSubTab("preise");
            setStammdatenFunction("kundeProdukt");
          }}
          className={`btn-subtab ${stammdatenSubTab === "preise" ? "active" : ""}`}
        >
          💰 Preise
        </button>
      </div>

      {/* Benutzer & Passwörter */}
      {stammdatenSubTab === "benutzer" && (
        <>
          {/* Unter-Navigation für Benutzer & Passwörter */}
          <div style={{ 
            display: "flex", 
            gap: "0.5rem", 
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}>
            {isEgAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setStammdatenFunction("userAnlegen")}
                  className={`btn-subtab ${stammdatenFunction === "userAnlegen" ? "active" : ""}`}
                >
                  👤 User anlegen
                </button>
                <button
                  type="button"
                  onClick={() => setStammdatenFunction("userPasswort")}
                  className={`btn-subtab ${stammdatenFunction === "userPasswort" ? "active" : ""}`}
                >
                  🔑 User-Passwort
                </button>
                <button
                  type="button"
                  onClick={() => setStammdatenFunction("farmerPasswort")}
                  className={`btn-subtab ${stammdatenFunction === "farmerPasswort" ? "active" : ""}`}
                >
                  🔐 Bauern-Passwort
                </button>
              </>
            )}
          </div>

          {/* User anlegen */}
          {isEgAdmin && stammdatenFunction === "userAnlegen" && (
            <ActionCard icon="👤" title="User anlegen">
          <p style={{ fontSize: "0.9375rem" }}>
            Erstelle einen neuen Login-User für Packbetriebe, Packstellen, Organisatoren oder weitere Admins.
          </p>
          {userCreateError && (
            <div style={{
              padding: "0.75rem",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "0.5rem",
              color: "#991b1b",
              marginBottom: "1rem",
            }}>
              {userCreateError}
            </div>
          )}
          <form onSubmit={handleCreateUser} noValidate>
            <label>Name (Anzeigename)</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="z.B. Max Mustermann"
            />

            <label>E-Mail (Pflicht, Login-Name)</label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value.trim())}
              onBlur={(e) => setUserEmail(e.target.value.trim())}
              placeholder="user@example.com"
              autoComplete="email"
            />

            <label>Passwort (Pflicht)</label>
            <input
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              placeholder="Passwort eingeben"
            />

            <label>Rolle</label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as typeof userRole)}
              onFocus={openSelectOnFocus}
            >
              <option value="PACKBETRIEB">Packbetrieb</option>
              <option value="PACKSTELLE">Packstelle</option>
              <option value="ORGANISATOR">Organisator</option>
              <option value="EG_ADMIN">EG Admin</option>
            </select>

            <button 
              type="submit" 
              className="btn-action-primary"
              onClick={(e) => {
                console.log("Button geklickt - handleCreateUser wird aufgerufen");
              }}
            >
              👤 User anlegen
            </button>
          </form>
        </ActionCard>
          )}

          {/* User-Passwort zurücksetzen */}
          {isEgAdmin && stammdatenFunction === "userPasswort" && (
            <ActionCard icon="🔑" title="User-Passwort zurücksetzen">
          <p style={{ fontSize: "0.9375rem" }}>
            Setzen Sie das Passwort für einen bestehenden User zurück.
          </p>
          {passwordResetError && (
            <div style={{
              padding: "0.75rem",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "0.5rem",
              color: "#991b1b",
              marginBottom: "1rem",
            }}>
              {passwordResetError}
            </div>
          )}
          <form onSubmit={handleResetUserPassword} noValidate>
            <label>User auswählen</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : "")}
              required
              onFocus={openSelectOnFocus}
            >
              <option value="">– User wählen –</option>
              {allUsers.length === 0 ? (
                <option value="" disabled>Keine User verfügbar - Liste wird geladen...</option>
              ) : (
                allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) - {u.role}
                  </option>
                ))
              )}
            </select>

            <label>Neues Passwort</label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Neues Passwort eingeben"
              required
            />

            <button type="submit" className="btn-action-primary">
              🔑 Passwort zurücksetzen
            </button>
          </form>
        </ActionCard>
          )}

          {/* Bauern-Passwort zurücksetzen */}
          {isEgAdmin && stammdatenFunction === "farmerPasswort" && (
            <ActionCard icon="🔐" title="Bauern-Passwort zurücksetzen">
          <p style={{ fontSize: "0.9375rem" }}>
            Setzen Sie das Passwort für einen Bauern zurück (nur wenn Login aktiviert ist).
          </p>
          {farmerPasswordResetError && (
            <div style={{
              padding: "0.75rem",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "0.5rem",
              color: "#991b1b",
              marginBottom: "1rem",
            }}>
              {farmerPasswordResetError}
            </div>
          )}
          <form onSubmit={handleResetFarmerPassword} noValidate>
            <label>Bauer auswählen</label>
            <select
              value={selectedFarmerId}
              onChange={(e) => setSelectedFarmerId(e.target.value ? Number(e.target.value) : "")}
              required
              onFocus={openSelectOnFocus}
            >
              <option value="">– Bauer wählen –</option>
              {farmers.filter(f => f.loginEmail).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.loginEmail})
                </option>
              ))}
            </select>

            <label>Neues Passwort</label>
            <input
              type="password"
              value={newFarmerPassword}
              onChange={(e) => setNewFarmerPassword(e.target.value)}
              placeholder="Neues Passwort eingeben"
              required
            />

            <button type="submit" className="btn-action-primary">
              🔑 Passwort zurücksetzen
            </button>
          </form>
        </ActionCard>
          )}
        </>
      )}

      {/* Planmengen */}
      {stammdatenSubTab === "planmengen" && (
        <>
          {/* Unter-Navigation für Planmengen */}
          <div style={{ 
            display: "flex", 
            gap: "0.5rem", 
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}>
            <button
              type="button"
              onClick={() => setStammdatenFunction("importieren")}
              className={`btn-subtab ${stammdatenFunction === "importieren" ? "active" : ""}`}
            >
              📥 Importieren
            </button>
            <button
              type="button"
              onClick={() => setStammdatenFunction("manuell")}
              className={`btn-subtab ${stammdatenFunction === "manuell" ? "active" : ""}`}
            >
              📝 Manuell erfassen
            </button>
          </div>

          {/* Planmengen importieren */}
          {stammdatenFunction === "importieren" && (
            <ActionCard icon="📥" title="Planmengen importieren">
        <p style={{ fontSize: "0.9375rem" }}>
          Liest die Datei <code>planmengen.csv</code> im Server-Ordner ein
          und speichert die Planmengen in der Datenbank. Nur verwenden,
          wenn die CSV aktuell und korrekt ist.
        </p>
        <button type="button" onClick={handleImportPlansFromCsv} className="btn-action-primary">
          📥 Planmengen aus CSV importieren
        </button>
      </ActionCard>
          )}

          {/* Planmenge manuell erfassen */}
          {stammdatenFunction === "manuell" && (
            <ActionCard icon="📝" title="Planmenge manuell erfassen">
        <p style={{ fontSize: "0.9375rem" }}>
          Einzelne Planmenge eintragen oder ändern. Bei Auswahl einer{" "}
          <strong>Kalenderwoche</strong> wird die Menge direkt eingetragen.
          Bei Auswahl eines <strong>Monats</strong> wird die Menge gleichmäßig
          auf alle Kalenderwochen des Monats aufgeteilt.
        </p>
        <form onSubmit={handleSavePlanmenge}>
          <label>Bauer</label>
          <select
            value={planFarmerIdInput}
            onChange={(e) =>
              setPlanFarmerIdInput(e.target.value ? Number(e.target.value) : "")
            }
            required
            onFocus={openSelectOnFocus}
          >
            <option value="">– Bauer wählen –</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <label>Kochtyp</label>
          <select
            value={planCookingTypeInput}
            onChange={(e) =>
              setPlanCookingTypeInput(e.target.value as CookingType)
            }
            required
            onFocus={openSelectOnFocus}
          >
            <option value="FESTKOCHEND">festkochend</option>
            <option value="VORWIEGEND_FESTKOCHEND">vorw. festk.</option>
            <option value="MEHLIG">mehlig</option>
          </select>

          <label>Monat (für Aufteilung auf KWs)</label>
          <select
            value={planMonthInput}
            onChange={(e) => {
              setPlanMonthInput(e.target.value ? Number(e.target.value) : "");
              if (e.target.value) setPlanWeekInput(""); // Wenn Monat gewählt, KW zurücksetzen
            }}
            onFocus={openSelectOnFocus}
          >
            <option value="">– kein Monat –</option>
            <option value="1">Jänner</option>
            <option value="2">Februar</option>
            <option value="3">März</option>
            <option value="4">April</option>
            <option value="5">Mai</option>
            <option value="6">Juni</option>
            <option value="7">Juli</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Dezember</option>
          </select>

          <label>Kalenderwoche (direkt eintragen)</label>
          <select
            value={planWeekInput}
            onChange={(e) => {
              setPlanWeekInput(e.target.value ? Number(e.target.value) : "");
              if (e.target.value) setPlanMonthInput(""); // Wenn KW gewählt, Monat zurücksetzen
            }}
            onFocus={openSelectOnFocus}
          >
            <option value="">– keine KW –</option>
            {Array.from({ length: 53 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                KW {w}
              </option>
            ))}
          </select>

          <label>Geplante Menge (kg)</label>
          <input
            type="text"
            value={planQuantityKgInput}
            onChange={(e) => setPlanQuantityKgInput(e.target.value)}
            placeholder="z.B. 5000"
            required
          />

          <button type="submit" className="btn-action-primary">
            💾 Planmenge speichern
          </button>
        </form>
      </ActionCard>
          )}
        </>
      )}

      {/* Stammdaten */}
      {stammdatenSubTab === "stammdaten" && (
        <>
          {/* Unter-Navigation für Stammdaten */}
          <div style={{ 
            display: "flex", 
            gap: "0.5rem", 
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}>
            <button
              type="button"
              onClick={() => setStammdatenFunction("bauern")}
              className={`btn-subtab ${stammdatenFunction === "bauern" ? "active" : ""}`}
            >
              👨‍🌾 Bauern
            </button>
            <button
              type="button"
              onClick={() => setStammdatenFunction("produkte")}
              className={`btn-subtab ${stammdatenFunction === "produkte" ? "active" : ""}`}
            >
              🥔 Produkte
            </button>
            <button
              type="button"
              onClick={() => setStammdatenFunction("sorten")}
              className={`btn-subtab ${stammdatenFunction === "sorten" ? "active" : ""}`}
            >
              🌱 Sorten
            </button>
            <button
              type="button"
              onClick={() => setStammdatenFunction("kunden")}
              className={`btn-subtab ${stammdatenFunction === "kunden" ? "active" : ""}`}
            >
              🏪 Kunden
            </button>
          </div>

          {/* Bauern */}
          {stammdatenFunction === "bauern" && (
            <ActionCard icon="👨‍🌾" title="Bauern">
        <form onSubmit={handleCreateFarmer}>
          <label>Name</label>
          <input
            value={farmerName}
            onChange={(e) => setFarmerName(e.target.value)}
            required
          />

          <label>Straße / Hausnummer</label>
          <input
            value={farmerStreet}
            onChange={(e) => setFarmerStreet(e.target.value)}
          />

          <label>PLZ</label>
          <input
            value={farmerPostalCode}
            onChange={(e) => setFarmerPostalCode(e.target.value)}
          />

          <label>Ort</label>
          <input
            value={farmerCity}
            onChange={(e) => setFarmerCity(e.target.value)}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
          <label>GGN-Nummer (optional)</label>
          <input
            value={farmerGGN}
            onChange={(e) => setFarmerGGN(e.target.value)}
          />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div 
                  onClick={() => setFarmerIsFlatRate(!farmerIsFlatRate)}
                  style={{ 
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                >
                  <div 
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      border: "2px solid #64748b",
                      borderRadius: "0.25rem",
                      backgroundColor: farmerIsFlatRate ? "#3b82f6" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.2s"
                    }}
                  >
                    {farmerIsFlatRate && (
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 12 12" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ pointerEvents: "none" }}
                      >
                        <path 
                          d="M2 6L5 9L10 2" 
                          stroke="white" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <label 
                    htmlFor="farmerFlatRate" 
                    style={{ 
                      fontWeight: 600, 
                      marginTop: "0", 
                      whiteSpace: "nowrap",
                      cursor: "pointer"
                    }}
                  >
                    Pauschalierter Betrieb
                  </label>
                </div>
            <input
              id="farmerFlatRate"
              type="checkbox"
              checked={farmerIsFlatRate}
              onChange={(e) => setFarmerIsFlatRate(e.target.checked)}
                  style={{ 
                    position: "absolute",
                    opacity: 0,
                    width: 0,
                    height: 0,
                    pointerEvents: "none"
                  }}
                  tabIndex={-1}
                />
              </div>
            </div>
            <div style={{ paddingTop: "1.5rem", fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.5 }}>
              <div>
                <strong style={{ color: "#cbd5e1" }}>GGN-Nummer:</strong> Global GAP Nummer für Zertifizierung
              </div>
            </div>
          </div>

          <label style={{ marginTop: "0.25rem" }}>
            Bankverbindung und UID Nummer (optional)
          </label>
          <input
            value={farmerFlatRateNote}
            onChange={(e) => setFarmerFlatRateNote(e.target.value)}
            placeholder="z.B. IBAN: AT..., UID: ATU..."
          />

          <label>Login E-Mail (für Bauern-Zugang)</label>
          <input
            type="email"
            value={farmerLoginEmail}
            onChange={(e) => setFarmerLoginEmail(e.target.value)}
          />

          <label>Login Passwort</label>
          <input
            type="password"
            value={farmerLoginPassword}
            onChange={(e) => setFarmerLoginPassword(e.target.value)}
            placeholder={editingFarmerId !== null ? "Leer lassen, um Passwort nicht zu ändern" : ""}
          />

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="submit" className="btn-action-primary">
              {editingFarmerId !== null ? "✏️ Ändern" : "💾 Speichern"}
            </button>
            {editingFarmerId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingFarmerId(null);
                  setFarmerName("");
                  setFarmerStreet("");
                  setFarmerPostalCode("");
                  setFarmerCity("");
                  setFarmerGGN("");
                  setFarmerLoginEmail("");
                  setFarmerLoginPassword("");
                  setFarmerIsFlatRate(false);
                  setFarmerFlatRateNote("");
                }}
                className="btn-action-secondary"
              >
                ❌ Abbrechen
              </button>
            )}
          </div>
        </form>

        <ul style={{ marginTop: "0.5rem", fontSize: "0.9375rem" }}>
          {farmers.map((f) => (
            <li key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span>
              {f.name}
              {f.address
                ? ` – ${f.address.street ?? ""}, ${
                    f.address.postalCode ?? ""
                  } ${f.address.city ?? ""}`
                : ""}
              </span>
              <button
                type="button"
                style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem", marginLeft: "0.5rem" }}
                onClick={() => {
                  setEditingFarmerId(f.id);
                  setFarmerName(f.name);
                  setFarmerStreet(f.address?.street || "");
                  setFarmerPostalCode(f.address?.postalCode || "");
                  setFarmerCity(f.address?.city || "");
                  setFarmerGGN(f.ggnNumber || "");
                  setFarmerIsFlatRate(f.isFlatRate || false);
                  setFarmerFlatRateNote(f.flatRateNote || "");
                  setFarmerLoginEmail(f.loginEmail || "");
                  setFarmerLoginPassword(""); // Passwort nicht anzeigen
                  // Scroll zum Formular
                  const formElement = document.querySelector('form[onSubmit]');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                ✏️ Bearbeiten
              </button>
            </li>
          ))}
        </ul>
      </ActionCard>
          )}

          {/* Produkte */}
          {stammdatenFunction === "produkte" && (
            <ActionCard icon="🥔" title="Produkte">
        <form onSubmit={handleCreateProduct}>
          <label>Produktname</label>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            placeholder="z.B. Eferdinger Landl Erdäpfel festkochend 2 kg"
          />
          <label>Kocheigenschaft</label>
          <select
            value={productCookingType}
            onChange={(e) =>
              setProductCookingType(e.target.value as CookingType)
            }
            onFocus={openSelectOnFocus}
          >
            <option value="FESTKOCHEND">festkochend</option>
            <option value="VORWIEGEND_FESTKOCHEND">
              vorw. festk.
            </option>
            <option value="MEHLIG">mehlig</option>
          </select>

          <label>Verpackungstyp</label>
          <select
            value={productPackagingType}
            onChange={(e) => setProductPackagingType(e.target.value)}
            onFocus={openSelectOnFocus}
          >
            <option value="">– wählen –</option>
            <option value="NETZSACK">Netzsack</option>
            <option value="CLIPNETZ">Clipnetz</option>
            <option value="KISTE">Kiste</option>
            <option value="KARTON">Karton</option>
            <option value="VERTPACK">Vertpack</option>
            <option value="PE_BEUTEL">PE-Beutel</option>
            <option value="LOSE">lose</option>
            <option value="GROSSKISTEN">Großkiste</option>
            <option value="BIGBAG">BigBag</option>
          </select>

          <label>Packungsgröße (kg)</label>
          <CalcInput
            value={productUnitKg}
            onChange={setProductUnitKg}
            label="Packungsgröße (kg)"
            step="0.01"
            required
          />

          <label>Einheiten je Colli (optional)</label>
          <CalcInput
            value={productUnitsPerColli}
            onChange={setProductUnitsPerColli}
            label="Einheiten je Colli"
            step="1"
            placeholder="z.B. 9"
          />

          <label>Colli je Palette (optional)</label>
          <CalcInput
            value={productCollisPerPallet}
            onChange={setProductCollisPerPallet}
            label="Colli je Palette"
            step="1"
            placeholder="z.B. 32"
          />

          <label>Produktnummer (optional)</label>
          <input
            value={productNumber}
            onChange={(e) => setProductNumber(e.target.value)}
            placeholder="z.B. EL-2KG-FK"
          />

          <label>MWSt (optional)</label>
          <select
            value={productTaxRateId}
            onChange={(e) => setProductTaxRateId(e.target.value ? Number(e.target.value) : "")}
            onFocus={openSelectOnFocus}
          >
            <option value="">– Steuersatz wählen –</option>
            {taxRates.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.name} ({tr.ratePercent}%)
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="submit" className="btn-action-primary">
              {editingProductId !== null ? "✏️ Ändern" : "💾 Speichern"}
            </button>
            {editingProductId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingProductId(null);
                  setProductName("");
                  setProductCookingType("FESTKOCHEND");
                  setProductPackagingType("");
                  setProductNumber("");
                  setProductUnitKg("2");
                  setProductUnitsPerColli("");
                  setProductCollisPerPallet("");
                }}
                className="btn-action-secondary"
              >
                ❌ Abbrechen
              </button>
            )}
          </div>
        </form>

        <ul style={{ marginTop: "0.5rem", fontSize: "0.9375rem" }}>
          {safeProducts.map((p) => (
            <li key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span>
              {p.name} – {p.cookingType} – {p.packagingType} – {p.unitKg} kg,{" "}
              {p.unitsPerColli ?? "-"}/Colli, {p.collisPerPallet ?? "-"} Colli/Palette
              </span>
              <button
                type="button"
                style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem", marginLeft: "0.5rem" }}
                onClick={() => {
                  setEditingProductId(p.id);
                  setProductName(p.name);
                  setProductCookingType(p.cookingType);
                  setProductPackagingType(p.packagingType || "");
                  setProductNumber(p.productNumber || "");
                  setProductUnitKg(String(p.unitKg || "2"));
                  setProductUnitsPerColli(p.unitsPerColli ? String(p.unitsPerColli) : "");
                  setProductCollisPerPallet(p.collisPerPallet ? String(p.collisPerPallet) : "");
                  // Scroll zum Formular
                  const formElement = document.querySelector('form[onSubmit]');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                ✏️ Bearbeiten
              </button>
            </li>
          ))}
        </ul>
      </ActionCard>
          )}

          {/* Sorten */}
          {stammdatenFunction === "sorten" && (
            <ActionCard icon="🌱" title="Sorten">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const isEditing = editingVarietyId !== null;
            try {
              const url = isEditing
                ? `${API_URL}/varieties/${editingVarietyId}`
                : `${API_URL}/varieties`;
              const method = isEditing ? "PUT" : "POST";
              
              const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: varietyName,
                  cookingType: varietyCookingType,
                  quality: varietyQuality,
                }),
              });
              if (!res.ok) {
                showMessage(isEditing ? "Fehler beim Ändern der Sorte" : "Fehler beim Anlegen der Sorte");
                return;
              }
              setVarietyName("");
              setVarietyCookingType("FESTKOCHEND");
              setVarietyQuality("Q1");
              setEditingVarietyId(null);
              await loadVarieties();
              showMessage(isEditing ? "Sorte geändert" : "Sorte gespeichert");
            } catch (err) {
              console.error(err);
              showMessage(isEditing ? "Fehler beim Ändern der Sorte" : "Fehler beim Anlegen der Sorte");
            }
          }}
        >
          <label>Name der Sorte</label>
          <input
            value={varietyName}
            onChange={(e) => setVarietyName(e.target.value)}
            required
          />

          <label>Kocheigenschaft</label>
          <select
            value={varietyCookingType}
            onChange={(e) =>
              setVarietyCookingType(e.target.value as CookingType)
            }
            onFocus={openSelectOnFocus}
          >
            <option value="FESTKOCHEND">festkochend</option>
            <option value="VORWIEGEND_FESTKOCHEND">
              vorw. festk.
            </option>
            <option value="MEHLIG">mehlig</option>
          </select>

          <label>Qualität / Sortierung</label>
          <select
            value={varietyQuality}
            onChange={(e) =>
              setVarietyQuality(e.target.value as VarietyQuality)
            }
            onFocus={openSelectOnFocus}
          >
            <option value="Q1">1. Qualität</option>
            <option value="Q2">2. Qualität</option>
            <option value="UEBERGROESSE">Übergrößen</option>
          </select>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="submit" className="btn-action-primary">
              {editingVarietyId !== null ? "✏️ Ändern" : "💾 Speichern"}
            </button>
            {editingVarietyId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingVarietyId(null);
                  setVarietyName("");
                  setVarietyCookingType("FESTKOCHEND");
                  setVarietyQuality("Q1");
                }}
                className="btn-action-secondary"
              >
                ❌ Abbrechen
              </button>
            )}
          </div>
        </form>

        <ul style={{ marginTop: "0.5rem", fontSize: "0.9375rem" }}>
          {safeVarieties.map((v) => (
            <li key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span>{v.name} – {v.cookingType} – {v.quality}</span>
              <button
                type="button"
                style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem", marginLeft: "0.5rem" }}
                onClick={() => {
                  setEditingVarietyId(v.id);
                  setVarietyName(v.name);
                  setVarietyCookingType(v.cookingType);
                  setVarietyQuality(v.quality);
                  // Scroll zum Formular
                  const formElement = document.querySelector('form[onSubmit]');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                ✏️ Bearbeiten
              </button>
            </li>
          ))}
        </ul>
      </ActionCard>
          )}

          {/* Kunden */}
          {stammdatenFunction === "kunden" && (
            <ActionCard icon="🏪" title="Kunden">
        <form onSubmit={handleCreateCustomer}>
          <label>Name</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
          <label>Region/Bemerkung</label>
          <input
            value={customerRegion}
            onChange={(e) => setCustomerRegion(e.target.value)}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="submit" className="btn-action-primary">
              {editingCustomerId !== null ? "✏️ Ändern" : "💾 Speichern"}
            </button>
            {editingCustomerId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingCustomerId(null);
                  setCustomerName("");
                  setCustomerRegion("");
                }}
                className="btn-action-secondary"
              >
                ❌ Abbrechen
              </button>
            )}
          </div>
        </form>

        <ul style={{ marginTop: "0.5rem", fontSize: "0.9375rem" }}>
          {customers.map((c) => (
            <li key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span>{c.name} {c.region ? `(${c.region})` : ""}</span>
              <button
                type="button"
                style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem", marginLeft: "0.5rem" }}
                onClick={() => {
                  setEditingCustomerId(c.id);
                  setCustomerName(c.name);
                  setCustomerRegion(c.region || "");
                  // Scroll zum Formular
                  const formElement = document.querySelector('form[onSubmit]');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                ✏️ Bearbeiten
              </button>
            </li>
          ))}
        </ul>
      </ActionCard>
          )}
        </>
      )}

      {/* Preise */}
      {stammdatenSubTab === "preise" && (
        <>
          {/* Unter-Navigation für Preise */}
          <div style={{ 
            display: "flex", 
            gap: "0.5rem", 
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}>
            <button
              type="button"
              onClick={() => setStammdatenFunction("kundeProdukt")}
              className={`btn-subtab ${stammdatenFunction === "kundeProdukt" ? "active" : ""}`}
            >
              💰 Kunde × Produkt
            </button>
            <button
              type="button"
              onClick={() => setStammdatenFunction("qualitaetspreise")}
              className={`btn-subtab ${stammdatenFunction === "qualitaetspreise" ? "active" : ""}`}
            >
              💵 Qualitätspreise
            </button>
          </div>

          {/* Preise Kunde × Produkt */}
          {stammdatenFunction === "kundeProdukt" && (
            <ActionCard icon="💰" title="Preise (Kunde × Produkt)">

        <form
          onSubmit={handleCreatePrice}
          style={{
            display: "grid",
            gap: "0.5rem",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            alignItems: "flex-end",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Kunde</label>
            <select
              value={priceCustomerId}
              onChange={(e) =>
                setPriceCustomerId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              onFocus={openSelectOnFocus}
            >
              <option value="">– Kunde –</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.region ? ` (${c.region})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Produkt</label>
            <select
              value={priceProductId}
              onChange={(e) =>
                setPriceProductId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              onFocus={openSelectOnFocus}
            >
              <option value="">– Produkt –</option>
              {safeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} – {getCookingLabel(p.cookingType)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Preis je Colli</label>
            <CalcInput
              value={pricePerUnit}
              onChange={setPricePerUnit}
              label="Preis je Colli (€)"
              step="0.01"
              placeholder="z.B. 11,61"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Abpackkosten je Colli</label>
            <CalcInput
              value={pricePackingCostPerUnit}
              onChange={setPricePackingCostPerUnit}
              label="Abpackkosten je Colli (€)"
              step="0.01"
              placeholder="z.B. 0,50"
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>gültig ab</label>
            <input
              type="date"
              value={priceValidFrom}
              onChange={(e) => setPriceValidFrom(e.target.value)}
              onFocus={openDatePickerOnFocus}
            />
          </div>

          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              gap: "0.5rem",
              marginTop: "0.25rem",
            }}
          >
            <button type="submit" className="btn-action-primary">
              {editingPriceId !== null ? "✏️ Ändern" : "💾 Speichern"}
            </button>
            {editingPriceId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingPriceId(null);
                  setPriceCustomerId("");
                  setPriceProductId("");
                  setPricePerUnit("");
                  setPricePackingCostPerUnit("");
                  setPriceValidFrom("");
                }}
                className="btn-action-secondary"
              >
                ❌ Abbrechen
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const cId =
                  typeof priceCustomerId === "number"
                    ? priceCustomerId
                    : undefined;
                const pId =
                  typeof priceProductId === "number"
                    ? priceProductId
                    : undefined;
                loadPrices(cId, pId).catch(console.error);
              }}
              className="btn-action-secondary"
            >
              🔄 Preise laden / filtern
            </button>
          </div>
        </form>

        <table style={{ width: "100%", fontSize: "0.9375rem" }}>
          <thead>
            <tr>
              <th>Kunde</th>
              <th>Produkt</th>
              <th>Kocheigenschaft</th>
              <th>Preis je Colli</th>
              <th>Abpackkosten</th>
              <th>gültig ab</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.id}>
                <td>{p.customer?.name ?? ""}</td>
                <td>{p.product?.name ?? ""}</td>
                <td>{p.product?.cookingType ? getCookingLabel(p.product.cookingType as CookingType) : "-"}</td>
                <td>{formatKg(p.pricePerUnit).replace(" kg", "")} €</td>
                <td>{(p as any).packingCostPerUnit ? formatAmount(Number((p as any).packingCostPerUnit)) + " €" : "-"}</td>
                <td>{p.validFrom?.substring(0, 10)}</td>
                <td>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const price = prices.find((pr) => pr.id === p.id);
                      if (price) {
                        setEditingPriceId(price.id);
                        setPriceCustomerId(price.customerId);
                        setPriceProductId(price.productId);
                        setPricePerUnit(String(price.pricePerUnit));
                        setPricePackingCostPerUnit((price as any).packingCostPerUnit ? String((price as any).packingCostPerUnit) : "");
                        setPriceValidFrom(price.validFrom?.substring(0, 10) || "");
                        // Scroll zum Formular
                        setTimeout(() => {
                          const formElement = document.querySelector('form[onSubmit]');
                          if (formElement) {
                            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }
                    }}
                    style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem" }}
                  >
                    Bearbeiten
                  </button>
                </td>
              </tr>
            ))}
            {prices.length === 0 && (
              <tr>
                <td colSpan={7}>
                  Noch keine Preise erfasst oder Filter liefert keine Daten.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ActionCard>
          )}

          {/* Qualitätspreise */}
          {stammdatenFunction === "qualitaetspreise" && (
            <ActionCard icon="💵" title="Qualitätspreise (Rohware-Ankauf)">
        <p style={{ fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
          Preise je kg für die verschiedenen Qualitätsstufen (Q1, Q2, Übergrößen).
          Diese werden auf Lieferscheinen und Etiketten angedruckt.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!qpValidFrom || !qpPricePerKg) {
              showMessage("Bitte alle Pflichtfelder ausfüllen");
              return;
            }
            
            const qualityLabel = qpQuality === "Q1" ? "1. Qualität" : qpQuality === "Q2" ? "2. Qualität" : "Übergrößen";
            const priceNum = Number(qpPricePerKg.replace(",", "."));
            
            const isEditing = editingQualityPriceId !== null;
            setConfirmAction({
              title: isEditing ? "Qualitätspreis ändern?" : "Qualitätspreis anlegen?",
              message: isEditing
                ? `Möchten Sie diesen Qualitätspreis wirklich ändern?`
                : `Möchten Sie einen Qualitätspreis von ${formatAmount(priceNum)} €/kg für ${qualityLabel} (gültig ab ${qpValidFrom}) wirklich anlegen?`,
              confirmLabel: isEditing ? "Ja, ändern" : "Ja, anlegen",
              cancelLabel: "Nein, abbrechen",
              onConfirm: async () => {
                setConfirmAction(null);
                try {
                  const url = isEditing
                    ? `${API_URL}/variety-quality-prices/${editingQualityPriceId}`
                    : `${API_URL}/variety-quality-prices`;
                  const method = isEditing ? "PUT" : "POST";
                  
                  const res = await fetch(url, {
                    method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  quality: qpQuality,
                  validFrom: qpValidFrom,
                  validTo: qpValidTo || null,
                      pricePerKg: priceNum,
                }),
              });
              if (!res.ok) {
                    showMessage(isEditing ? "Fehler beim Ändern des Qualitätspreises" : "Fehler beim Speichern des Qualitätspreises");
                return;
              }
              setQpQuality("Q1");
              setQpValidFrom("");
              setQpValidTo("");
              setQpPricePerKg("");
              setQpTaxRateId("");
                  setEditingQualityPriceId(null);
              await loadQualityPrices();
                  showMessage(isEditing ? "Qualitätspreis geändert" : "Qualitätspreis gespeichert");
            } catch (err) {
              console.error(err);
              showMessage("Fehler beim Speichern");
            }
              },
            });
          }}
          style={{
            display: "grid",
            gap: "0.5rem",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            alignItems: "flex-end",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Qualität</label>
            <select
              value={qpQuality}
              onChange={(e) => setQpQuality(e.target.value as VarietyQuality)}
              onFocus={openSelectOnFocus}
            >
              <option value="Q1">1. Qualität</option>
              <option value="Q2">2. Qualität</option>
              <option value="UEBERGROESSE">Übergrößen</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>gültig ab</label>
            <input
              type="date"
              value={qpValidFrom}
              onChange={(e) => setQpValidFrom(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>gültig bis (optional)</label>
            <input
              type="date"
              value={qpValidTo}
              onChange={(e) => setQpValidTo(e.target.value)}
              onFocus={openDatePickerOnFocus}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Preis je kg (€)</label>
            <input
              type="text"
              value={qpPricePerKg}
              onChange={(e) => setQpPricePerKg(e.target.value)}
              placeholder="z.B. 0,35"
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>MWSt (optional)</label>
            <select
              value={qpTaxRateId}
              onChange={(e) => setQpTaxRateId(e.target.value ? Number(e.target.value) : "")}
              onFocus={openSelectOnFocus}
            >
              <option value="">– Steuersatz wählen –</option>
              {taxRates.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.name} ({tr.ratePercent}%)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
            <button type="submit" className="btn-action-primary">
              {editingQualityPriceId !== null ? "✏️ Ändern" : "💾 Speichern"}
            </button>
            {editingQualityPriceId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingQualityPriceId(null);
                  setQpQuality("Q1");
                  setQpValidFrom("");
                  setQpValidTo("");
                  setQpPricePerKg("");
                  setQpTaxRateId("");
                }}
                className="btn-action-secondary"
              >
                ❌ Abbrechen
              </button>
            )}
          </div>
        </form>

        <table style={{ width: "100%", fontSize: "0.9375rem" }}>
          <thead>
            <tr>
              <th>Qualität</th>
              <th>gültig ab</th>
              <th>gültig bis</th>
              <th>Preis je kg</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {qualityPrices.map((qp) => (
              <tr key={qp.id}>
                <td>
                  {qp.quality === "Q1"
                    ? "1. Qualität"
                    : qp.quality === "Q2"
                    ? "2. Qualität"
                    : "Übergrößen"}
                </td>
                <td>{qp.validFrom?.substring(0, 10) ?? "-"}</td>
                <td>{qp.validTo?.substring(0, 10) ?? "-"}</td>
                <td>{formatAmount(Number(qp.pricePerKg))} €</td>
                <td>
                  {(qp as any).taxRate ? `${(qp as any).taxRate.ratePercent}%` : "-"}
                </td>
                <td>
                  <button
                    type="button"
                    style={{ fontSize: "0.875rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => {
                      setEditingQualityPriceId(qp.id);
                      setQpQuality(qp.quality);
                      setQpValidFrom(qp.validFrom?.substring(0, 10) || "");
                      setQpValidTo(qp.validTo?.substring(0, 10) || "");
                      setQpPricePerKg(String(qp.pricePerKg));
                      // Scroll zum Formular
                      const formElement = document.querySelector('form[onSubmit]');
                      if (formElement) {
                        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                  >
                    Bearbeiten
                  </button>
                </td>
              </tr>
            ))}
            {qualityPrices.length === 0 && (
              <tr>
                <td colSpan={5}>Noch keine Qualitätspreise erfasst.</td>
              </tr>
            )}
          </tbody>
        </table>
      </ActionCard>
          )}
        </>
      )}
    </div>
  );
}

