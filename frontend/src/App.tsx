import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "/api";
console.log("API_URL FRONTEND =", API_URL);
// ==== Typen ====

// 1) ENUM-ähnliche Typen
type CookingType = "FESTKOCHEND" | "VORWIEGEND_FESTKOCHEND" | "MEHLIG";
type VarietyQuality = "Q1" | "Q2" | "UEBERGROESSE";

// Adresse eines Bauern
type FarmerAddress = {
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
};

// 2) Bauern
type Farmer = {
  id: number;
  name: string;
  farmName?: string | null;          // Hofname für Anzeige
  address?: FarmerAddress | null;    // Straße/PLZ/Ort
  fullAddress?: string | null;
  ggnNumber?: string | null;
  loginEmail?: string | null;
  loginPassword?: string | null;
};

// 3) Sorten
interface Variety {
  id: number;
  name: string;
  cookingType: CookingType;
  quality: VarietyQuality;
}

// 4) Produkte
type Product = {
  id: number;
  name: string;
  cookingType: CookingType;
  packagingType: string;
  productNumber?: string | null;
  unitKg?: number | null;            // Packungsgröße
  unitsPerColli?: number | null;     // Einheiten je Colli
  collisPerPallet?: number | null;   // Colli je Palette
};

// 5) Kunden
type Customer = {
  id: number;
  name: string;
  region?: string | null;
};

type FarmerStock = {
  id: number;
  farmerId: number;
  varietyId: number;
  quantityTons: number;  // wir verwenden kg, Name lassen wir vorerst
  farmer?: Farmer;
  variety?: Variety;
};

// 7) User
type CurrentUser = {
  id: number;
  name: string;
  role: "ORGANISATOR" | "FARMER" | "PACKER" | "EG_ADMIN";
  farmerId?: number | null;
};

// Bestätigung für Inventur / Verkäufe
type ConfirmAction = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

type Tab = "stamm" | "farmerStock";

// === Helfer ===

function formatKg(value: number | string | null | undefined): string {
  if (value == null) return "0,00";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(num)) return "0,00";
  return num.toFixed(2).replace(".", ",");
}

function parseKg(value: string): number {
  if (!value) return 0;
  const v = value.replace(",", ".");
  const num = parseFloat(v);
  return Number.isNaN(num) ? 0 : num;
}

// ---------------------------------------------
// Summenberechnung und Anzeige nach Kocheigenschaft
// ---------------------------------------------
type CookingKey = "FESTKOCHEND" | "VORWIEGEND_FESTKOCHEND" | "MEHLIG" | "UNBEKANNT";

function calcCookingSums(rows: any[]) {
  const sums: Record<CookingKey | "total", number> = {
    FESTKOCHEND: 0,
    VORWIEGEND_FESTKOCHEND: 0,
    MEHLIG: 0,
    UNBEKANNT: 0,
    total: 0,
  };

  for (const r of rows) {
    // im Bauernlager ist quantityTons = kg
    const kg = Number(r.quantityTons ?? r.quantityKg ?? 0);

    // zuerst nach Sorte schauen, falls nicht vorhanden auf Produkt zurückfallen
    const keyRaw =
      ((r.variety?.cookingType || r.product?.cookingType) as CookingKey) ||
      "UNBEKANNT";

    const key: CookingKey =
      keyRaw === "FESTKOCHEND" ||
      keyRaw === "VORWIEGEND_FESTKOCHEND" ||
      keyRaw === "MEHLIG"
        ? keyRaw
        : "UNBEKANNT";

    sums[key] += kg;
    sums.total += kg;
  }

  return sums;
}

function SummaryRow({ label, sums }: { label: string; sums: ReturnType<typeof calcCookingSums> }) {
  const boxStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "0.5rem",
    marginTop: "0.5rem",
  };
const chip: React.CSSProperties = {
  background: "#111827",
  color: "#f9fafb",
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #374151",
  display: "flex",
  justifyContent: "space-between",
  fontSize: "0.9rem",
};
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{label}</div>
      <div style={boxStyle}>
        <div style={chip}><span>festkochend</span><span>{formatKg(sums.FESTKOCHEND)} kg</span></div>
        <div style={chip}><span>vorwiegend festkochend</span><span>{formatKg(sums.VORWIEGEND_FESTKOCHEND)} kg</span></div>
        <div style={chip}><span>mehlig</span><span>{formatKg(sums.MEHLIG)} kg</span></div>
        <div style={chip}><span>Gesamt</span><span>{formatKg(sums.total)} kg</span></div>
      </div>
    </div>
  );
}

// ==== App ====

export default function App() {
  const [tab, setTab] = useState<Tab>("farmerStock");
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const safeProducts = Array.isArray(products) ? products : [];
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [farmerStocks, setFarmerStocks] = useState<FarmerStock[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const safeVarieties = Array.isArray(varieties) ? varieties : [];
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  
  // Login
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

     // Stammdaten-Formulare
 // Stammdaten-Formulare – Bauern
  const [farmerName, setFarmerName] = useState("");
  const [farmerStreet, setFarmerStreet] = useState("");
  const [farmerPostalCode, setFarmerPostalCode] = useState("");
  const [farmerCity, setFarmerCity] = useState("");
  const [farmerGGN, setFarmerGGN] = useState("");
  const [farmerLoginEmail, setFarmerLoginEmail] = useState("");
  const [farmerLoginPassword, setFarmerLoginPassword] = useState("");

  const [productName, setProductName] = useState("");
  const [productCookingType, setProductCookingType] =
    useState<CookingType>("FESTKOCHEND");
  const [productPackagingType, setProductPackagingType] = useState("");
  const [productNumber, setProductNumber] = useState("");
  const [productUnitKg, setProductUnitKg] = useState("2");
  const [productUnitsPerColli, setProductUnitsPerColli] = useState("");
  const [productCollisPerPallet, setProductCollisPerPallet] = useState("");
  
  const [varietyName, setVarietyName] = useState("");
  const [varietyCookingType, setVarietyCookingType] =
    useState<CookingType>("FESTKOCHEND");
  const [varietyQuality, setVarietyQuality] =
  useState<VarietyQuality>("Q1");
  const [customerName, setCustomerName] = useState("");
  const [customerRegion, setCustomerRegion] = useState("");

   // Bauernlager-Filter
   const [stockProductFilterId, setStockProductFilterId] = useState<"alle" | number>("alle");
   const [stockFilterFarmerId, setStockFilterFarmerId] = useState<number | "">(
    ""
  );
  const [stockCookingFilter, setStockCookingFilter] = useState<string>("alle");
  const [stockVarietyFilterId, setStockVarietyFilterId] = useState<
    number | "alle"
  >("alle");
    const [stockQualityFilter, setStockQualityFilter] = useState<string>("alle");

  // Bauernlager-Formulare (nur Bauer) – jetzt auf Sorte
  const [invVarietyId, setInvVarietyId] = useState<number | "">("");
  const [invQuantityKg, setInvQuantityKg] = useState("");

  const [privVarietyId, setPrivVarietyId] = useState<number | "">("");
  const [privQuantityKg, setPrivQuantityKg] = useState("");

  const [egVarietyId, setEgVarietyId] = useState<number | "">("");
  const [egQuantityKg, setEgQuantityKg] = useState("");


  // === Nachrichten-Helfer ===

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2500);
  };

  // === Datenladen ===

  async function loadFarmers() {
    const res = await fetch(`${API_URL}/farmers`);
    const data = await res.json();
    setFarmers(data);
  }

  async function loadProducts() {
  const res = await fetch(`${API_URL}/products`);
  const data = await res.json();
  setProducts(Array.isArray(data) ? data : []);
}

  async function loadCustomers() {
    const res = await fetch(`${API_URL}/customers`);
    const data = await res.json();
    setCustomers(data);
  }

    async function loadVarieties() {
    const res = await fetch(`${API_URL}/varieties`);
    const data = await res.json();
    setVarieties(Array.isArray(data) ? data : []);
  }

  async function loadFarmerStocks(farmerId?: number) {
    const url = farmerId
      ? `${API_URL}/farmer-stock?farmerId=${farmerId}`
      : `${API_URL}/farmer-stock`;
    const res = await fetch(url);
    const data = await res.json();
    setFarmerStocks(data);
  }

  // initial Stammdaten laden
   useEffect(() => {
    loadFarmers().catch(console.error);
    loadProducts().catch(console.error);
    loadCustomers().catch(console.error);
    loadVarieties().catch(console.error);
  }, []);

  // nach Login Lager laden
  useEffect(() => {
    if (!currentUser) {
      setFarmerStocks([]);
      return;
    }
    if (currentUser.role === "FARMER" && currentUser.farmerId) {
      loadFarmerStocks(currentUser.farmerId).catch(console.error);
    } else {
      loadFarmerStocks().catch(console.error);
    }
  }, [currentUser]);

  // === Login ===

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!res.ok) {
        showMessage("Login fehlgeschlagen");
        return;
      }
      const user = (await res.json()) as CurrentUser;
      console.log("LOGIN USER", user);
      setCurrentUser(user);
      showMessage(`Eingeloggt als ${user.name} (${user.role})`);
      setLoginPassword("");
    } catch (err) {
      console.error(err);
      showMessage("Fehler beim Login");
    }
  }

   function handleLogout() {
    setCurrentUser(null);
    setFarmerStocks([]);
    showMessage("Abgemeldet");
  }

  // === Rollenlogik ===

// Rolle auslesen
const role = currentUser?.role;

// Bauer = Rolle FARMER (farmerId prüfen wir extra in den Actions)
const isFarmer = role === "FARMER";

// EG-Admin (kann Stammdaten bearbeiten)
const isEgAdmin = role === "EG_ADMIN";

// Organisator (nur Übersicht, keine Stammdaten)
const isOrganizer = role === "ORGANISATOR";

// PACKER, falls du später was brauchst
const isPacker = role === "PACKER";

// Nutzer, die Stammdaten sehen/bearbeiten dürfen
const canEditStammdaten = !!currentUser && isEgAdmin;

// Nutzer, die die große Bauernlager-Übersicht sehen dürfen
const isAdminOrOrg =
  !!currentUser && (isEgAdmin || isOrganizer || isPacker);

  // === Stammdaten: Bauern, Produkte, Kunden ===

   async function handleCreateFarmer(e: React.FormEvent) {
  e.preventDefault();
  try {
    const res = await fetch(`${API_URL}/farmers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: farmerName,
        street: farmerStreet,
        postalCode: farmerPostalCode,
        city: farmerCity,
        ggn: farmerGGN,
        loginEmail: farmerLoginEmail,
        loginPassword: farmerLoginPassword,
      }),
    });

    if (!res.ok) {
      showMessage("Fehler beim Anlegen des Bauern");
      return;
    }

    // Felder leeren
    setFarmerName("");
    setFarmerStreet("");
    setFarmerPostalCode("");
    setFarmerCity("");
    setFarmerGGN("");
    setFarmerLoginEmail("");
    setFarmerLoginPassword("");

    await loadFarmers();
    showMessage("Bauer gespeichert");
  } catch (err) {
    console.error(err);
    showMessage("Fehler beim Anlegen des Bauern");
  }
}

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();

    // einfache Pflichtfeld-Checks
    if (!productName.trim()) {
      showMessage("Produktname fehlt");
      return;
    }
    if (!productUnitKg.trim()) {
      showMessage("Packungsgröße (kg) fehlt");
      return;
    }

    const unitKgNum = Number(productUnitKg.replace(",", "."));
    const unitsPerColliNum = productUnitsPerColli
      ? Number(productUnitsPerColli.replace(",", "."))
      : undefined;
    const collisPerPalletNum = productCollisPerPallet
      ? Number(productCollisPerPallet.replace(",", "."))
      : undefined;

    if (!Number.isFinite(unitKgNum) || unitKgNum <= 0) {
      showMessage("Packungsgröße (kg) muss eine Zahl > 0 sein");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productName,
          cookingType: productCookingType,
          unitKg: unitKgNum,
          unitsPerColli: unitsPerColliNum,
          collisPerPallet: collisPerPalletNum,
          packagingType: productPackagingType || null, // Enum-Key
          productNumber: productNumber || null,
        }),
      });

      if (!res.ok) {
        showMessage("Fehler beim Anlegen des Produkts");
        return;
      }

      // Felder leeren / Defaults setzen
      setProductName("");
      setProductCookingType("FESTKOCHEND");
      setProductPackagingType("");
      setProductNumber("");
      setProductUnitKg("2");
      setProductUnitsPerColli("");
      setProductCollisPerPallet("");

      await loadProducts();
      showMessage("Produkt gespeichert");
    } catch (err) {
      console.error(err);
      showMessage("Fehler beim Anlegen des Produkts");
    }
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customerName, region: customerRegion }),
      });
      if (!res.ok) {
        showMessage("Fehler beim Anlegen des Kunden");
        return;
      }
      setCustomerName("");
      setCustomerRegion("");
      await loadCustomers();
      showMessage("Kunde gespeichert");
    } catch (err) {
      console.error(err);
      showMessage("Fehler beim Anlegen des Kunden");
    }
  }

   // === Bauernlager: Inventur + Verkäufe (nur Bauer) ===

  // „echte“ Inventur – wird NUR aus der Confirm-Box aufgerufen
  async function doInventory(varietyId: number, qtyKg: number) {
    if (!currentUser?.farmerId) {
      showMessage("Kein Bauer zugeordnet");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/farmer-stock/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: currentUser.farmerId,
          varietyId,             // Sorte
          newQuantityTons: qtyKg // Backend erwartet dieses Feld, Wert in kg
        }),
      });

      if (!res.ok) {
        showMessage("Fehler bei Inventur");
        return;
      }

      setInvQuantityKg("");
      await loadFarmerStocks(currentUser.farmerId);
      showMessage("Inventur gespeichert");
    } catch (err) {
      console.error(err);
      showMessage("Fehler bei Inventur");
    }
  }

  // wird vom Formular aufgerufen – öffnet NUR die Bestätigungsbox
  function handleInventory(e: React.FormEvent) {
    e.preventDefault();

    if (!currentUser?.farmerId) {
      showMessage("Kein Bauer zugeordnet");
      return;
    }
    if (!invVarietyId) {
      showMessage("Sorte wählen");
      return;
    }

    const qtyKg = parseKg(invQuantityKg);
    const variety = safeVarieties.find((v) => v.id === invVarietyId);

    setConfirmAction({
      title: "Inventur speichern?",
      message: `Sorte ${variety?.name ?? ""} auf ${formatKg(qtyKg)} kg setzen. Sind Sie sicher?`,
      confirmLabel: "Ja, Inventur speichern",
      cancelLabel: "Nein, abbrechen",
      onConfirm: () => {
        setConfirmAction(null);
        doInventory(invVarietyId as number, qtyKg);
      },
    });
  }

  // „echter“ Verkauf – wird nur aus Confirm-Box aufgerufen
  async function doSale(
    type: "PRIVATE" | "EG",
    varietyId: number,
    qtyKg: number
  ) {
    if (!currentUser?.farmerId) {
      showMessage("Kein Bauer zugeordnet");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/farmer-stock/direct-sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: currentUser.farmerId,
          varietyId,            // Sorte
          quantityTons: qtyKg,  // Backend erwartet dieses Feld, Wert in kg
          saleType: type,
        }),
      });

      if (!res.ok) {
        showMessage("Fehler beim Verbuchen des Verkaufs");
        return;
      }

      await loadFarmerStocks(currentUser.farmerId);
      showMessage(
        type === "PRIVATE"
          ? "Privatverkauf verbucht"
          : "Verkauf an Eferdinger Landl verbucht"
      );
    } catch (err) {
      console.error(err);
      showMessage("Fehler beim Verbuchen des Verkaufs");
    }
  }

  // wird vom Formular aufgerufen – öffnet NUR die Bestätigungsbox
  function handleSale(
    e: React.FormEvent,
    type: "PRIVATE" | "EG",
    varietyId: number | "",
    qtyInput: string,
    clear: () => void
  ) {
    e.preventDefault();

    if (!currentUser?.farmerId) {
      showMessage("Kein Bauer zugeordnet");
      return;
    }
    if (!varietyId) {
      showMessage("Sorte wählen");
      return;
    }

    const qtyKg = parseKg(qtyInput);
    if (qtyKg <= 0) {
      showMessage("Menge muss > 0 sein");
      return;
    }

    const variety = safeVarieties.find((v) => v.id === varietyId);

    setConfirmAction({
      title:
        type === "PRIVATE"
          ? "Privatverkauf verbuchen?"
          : "Verkauf an Eferdinger Landl verbuchen?",
      message: `Sorte ${variety?.name ?? ""}, Menge ${formatKg(
        qtyKg
      )} kg. Sind Sie sicher?`,
      confirmLabel:
        type === "PRIVATE"
          ? "Ja, Privatverkauf verbuchen"
          : "Ja, Verkauf an EG verbuchen",
      cancelLabel: "Nein, abbrechen",
      onConfirm: () => {
        setConfirmAction(null);
        clear(); // Felder leeren
        doSale(type, varietyId as number, qtyKg);
      },
    });
  }

// === Bauernlager-Ansicht (Sorten) ===

function renderFarmerStockTab() {
  const effectiveFarmerId =
    isFarmer && currentUser?.farmerId
      ? currentUser.farmerId
      : stockFilterFarmerId || undefined;

  let filtered = farmerStocks;

  // 1) Nach Bauer filtern
  if (effectiveFarmerId && typeof effectiveFarmerId === "number") {
    filtered = filtered.filter((s) => s.farmerId === effectiveFarmerId);
  }

  // 2) Nach Kocheigenschaft filtern
  if (stockCookingFilter !== "alle") {
    filtered = filtered.filter(
      (s) =>
        s.variety?.cookingType === stockCookingFilter ||
        (s as any).product?.cookingType === stockCookingFilter
    );
  }

  // 3) Nach Qualität / Sortierung filtern
  if (stockQualityFilter !== "alle") {
    filtered = filtered.filter(
      (s) => s.variety?.quality === stockQualityFilter
    );
  }

  // 4) Nach Sorte filtern (wir benutzen stockProductFilterId als variety-Filter)
  if (
    stockProductFilterId !== "alle" &&
    typeof stockProductFilterId === "number"
  ) {
    filtered = filtered.filter((s) => s.varietyId === stockProductFilterId);
  }

  // 5) Sortierung: Bauer -> Sorte -> Qualität
  const sorted = [...filtered].sort((a, b) => {
    const aFarmer = a.farmer?.name ?? "";
    const bFarmer = b.farmer?.name ?? "";
    if (aFarmer !== bFarmer) {
      return aFarmer.localeCompare(bFarmer, "de");
    }

    const aVar = a.variety?.name ?? "";
    const bVar = b.variety?.name ?? "";
    if (aVar !== bVar) {
      return aVar.localeCompare(bVar, "de");
    }

    const aQual = a.variety?.quality ?? "";
    const bQual = b.variety?.quality ?? "";
    return aQual.localeCompare(bQual, "de");
  });

  // 6) Summen nach Kocheigenschaft aus den gefilterten Zeilen
  const cookingSums = calcCookingSums(sorted);

  return (
    <div className="farmer-stock-grid" style={{ marginTop: "1rem" }}>
      {/* Lagerübersicht */}
      <section style={{ border: "1px solid #4b5563", padding: "1rem" }}>
        <h2>Bauernlager (in kg, nach Sorte)</h2>

        {isAdminOrOrg && (
          <div className="filter-row">
            {/* Bauer-Filter */}
            <div>
              <label>Bauer: </label>
              <select
                value={stockFilterFarmerId}
                onChange={(e) =>
                  setStockFilterFarmerId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
              >
                <option value="">alle</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Kocheigenschaft */}
            <div>
              <label>Kocheigenschaft: </label>
              <select
                value={stockCookingFilter}
                onChange={(e) => setStockCookingFilter(e.target.value)}
              >
                <option value="alle">alle</option>
                <option value="FESTKOCHEND">festkochend</option>
                <option value="VORWIEGEND_FESTKOCHEND">
                  vorwiegend festkochend
                </option>
                <option value="MEHLIG">mehlig</option>
              </select>
            </div>

            {/* Qualität */}
            <div>
              <label>Qualität / Sortierung: </label>
              <select
                value={stockQualityFilter}
                onChange={(e) => setStockQualityFilter(e.target.value)}
              >
                <option value="alle">alle</option>
                <option value="Q1">1. Qualität</option>
                <option value="Q2">2. Qualität</option>
                <option value="UEBERGROESSE">Übergrößen</option>
              </select>
            </div>

            {/* Sorte */}
            <div>
              <label>Sorte: </label>
              <select
                value={stockProductFilterId}
                onChange={(e) =>
                  setStockProductFilterId(
                    e.target.value ? Number(e.target.value) : "alle"
                  )
                }
              >
                <option value="alle">alle</option>
                {safeVarieties.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.quality})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isFarmer && (
          <p style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            Du siehst hier nur deinen eigenen Lagerbestand.
          </p>
        )}

        <table style={{ width: "100%", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th>Bauer</th>
              <th>Sorte</th>
              <th>Kocheigenschaft</th>
              <th>Qualität</th>
              <th>Menge kg</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.farmer?.name ?? "–"}{" "}
                  {s.farmer?.farmName ? `(${s.farmer.farmName})` : ""}
                </td>
                <td>{s.variety?.name ?? "–"}</td>
                <td>{s.variety?.cookingType ?? "–"}</td>
                <td>{s.variety?.quality ?? "–"}</td>
                <td>{formatKg(s.quantityTons)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5}>Keine Lagerdaten vorhanden.</td>
              </tr>
            )}
          </tbody>
        </table>

        <SummaryRow label="Summe nach Kocheigenschaft" sums={cookingSums} />
      </section>

      {/* Lager pflegen – nur für Bauer */}
      {isFarmer && (
        <section style={{ border: "1px solid #4b5563", padding: "1rem" }}>
          <h2>Lager pflegen</h2>

          {/* Inventur */}
          <h3 style={{ marginTop: 0 }}>Inventur</h3>
          <form onSubmit={handleInventory}>
            <label>Sorte</label>
            <select
              value={invVarietyId}
              onChange={(e) =>
                setInvVarietyId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
            >
              <option value="">– Sorte wählen –</option>
              {safeVarieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.quality}, {v.cookingType.toLowerCase()})
                </option>
              ))}
            </select>

            <label>Neuer Bestand (kg)</label>
            <input
              type="number"
              step="0.01"
              value={invQuantityKg}
              onChange={(e) => setInvQuantityKg(e.target.value)}
              required
            />

            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Inventur speichern
            </button>
          </form>

          {/* Verkauf privat */}
          <h3 style={{ marginTop: "1rem" }}>Verkauf privat</h3>
          <form
            onSubmit={(e) =>
              handleSale(
                e,
                "PRIVATE",
                privVarietyId,
                privQuantityKg,
                () => {
                  setPrivQuantityKg("");
                  setPrivVarietyId("");
                }
              )
            }
          >
            <label>Sorte</label>
            <select
              value={privVarietyId}
              onChange={(e) =>
                setPrivVarietyId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
            >
              <option value="">– Sorte –</option>
              {safeVarieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.quality})
                </option>
              ))}
            </select>

            <label>Menge (kg)</label>
            <input
              type="number"
              step="0.01"
              value={privQuantityKg}
              onChange={(e) => setPrivQuantityKg(e.target.value)}
              required
            />

            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Privatverkauf verbuchen
            </button>
          </form>

          {/* Verkauf an Eferdinger Landl */}
          <h3 style={{ marginTop: "1rem" }}>Verkauf an Eferdinger Landl</h3>
          <form
            onSubmit={(e) =>
              handleSale(e, "EG", egVarietyId, egQuantityKg, () => {
                setEgQuantityKg("");
                setEgVarietyId("");
              })
            }
          >
            <label>Sorte</label>
            <select
              value={egVarietyId}
              onChange={(e) =>
                setEgVarietyId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
            >
              <option value="">– Sorte –</option>
              {safeVarieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.quality})
                </option>
              ))}
            </select>

            <label>Menge (kg)</label>
            <input
              type="number"
              step="0.01"
              value={egQuantityKg}
              onChange={(e) => setEgQuantityKg(e.target.value)}
              required
            />

            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Verkauf an EG verbuchen
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
  // === Stammdaten-Tab ===

 function renderStammdatenTab() {
  if (!canEditStammdaten) {
      return <p>Stammdaten können nur von Organisator/Admin gepflegt werden.</p>;
    }

    return (
      <div
        style={{
          marginTop: "1rem",
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(3, 1fr)",
        }}
      >
              {/* Bauern */}
      <section style={{ border: "1px solid #4b5563", padding: "1rem" }}>
  <h2>Bauern</h2>
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

    <label>GGN-Nummer (optional)</label>
    <input
      value={farmerGGN}
      onChange={(e) => setFarmerGGN(e.target.value)}
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
    />

    <button type="submit" style={{ marginTop: "0.5rem" }}>
      Speichern
    </button>
  </form>

  <ul style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
    {farmers.map((f) => (
      <li key={f.id}>
        {f.name}
        {f.address
          ? ` – ${f.address.street ?? ""}, ${f.address.postalCode ?? ""} ${
              f.address.city ?? ""
            }`
          : ""}
      </li>
    ))}
  </ul>
</section>

                {/* Produkte */}
        <section style={{ border: "1px solid #4b5563", padding: "1rem" }}>
          <h2>Produkte</h2>
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
              onChange={(e) => setProductCookingType(e.target.value)}
            >
              <option value="FESTKOCHEND">festkochend</option>
              <option value="VORWIEGEND_FESTKOCHEND">
                vorwiegend festkochend
              </option>
              <option value="MEHLIG">mehlig</option>
            </select>

            <label>Verpackungstyp</label>
            <select
              value={productPackagingType}
              onChange={(e) => setProductPackagingType(e.target.value)}
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
            <input
              type="number"
              step="0.01"
              value={productUnitKg}
              onChange={(e) => setProductUnitKg(e.target.value)}
              required
            />

            <label>Einheiten je Colli (optional)</label>
            <input
              type="number"
              step="1"
              value={productUnitsPerColli}
              onChange={(e) => setProductUnitsPerColli(e.target.value)}
              placeholder="z.B. 9"
            />

            <label>Colli je Palette (optional)</label>
            <input
              type="number"
              step="1"
              value={productCollisPerPallet}
              onChange={(e) => setProductCollisPerPallet(e.target.value)}
              placeholder="z.B. 32"
            />

            <label>Produktnummer (optional)</label>
            <input
              value={productNumber}
              onChange={(e) => setProductNumber(e.target.value)}
              placeholder="z.B. EL-2KG-FK"
            />

            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Speichern
            </button>
          </form>

          <ul style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            {safeProducts.map((p) => (
              <li key={p.id}>
                {p.name} – {p.cookingType} – {p.packagingType} –{" "}
                {p.unitKg} kg, {p.unitsPerColli ?? "-"}/Colli,{" "}
                {p.collisPerPallet ?? "-"} Colli/Palette
              </li>
            ))}
          </ul>
        </section>

                {/* Sorten */}
        <section style={{ border: "1px solid #4b5563", padding: "1rem" }}>
          <h2>Sorten</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch(`${API_URL}/varieties`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: varietyName,
                    cookingType: varietyCookingType,
                    quality: varietyQuality,
                  }),
                });
                if (!res.ok) {
                  showMessage("Fehler beim Anlegen der Sorte");
                  return;
                }
                setVarietyName("");
                setVarietyCookingType("FESTKOCHEND");
                setVarietyQuality("Q1");
                await loadVarieties();
                showMessage("Sorte gespeichert");
              } catch (err) {
                console.error(err);
                showMessage("Fehler beim Anlegen der Sorte");
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
            >
              <option value="FESTKOCHEND">festkochend</option>
              <option value="VORWIEGEND_FESTKOCHEND">
                vorwiegend festkochend
              </option>
              <option value="MEHLIG">mehlig</option>
            </select>

            <label>Qualität / Sortierung</label>
            <select
  value={varietyQuality}
  onChange={(e) =>
    setVarietyQuality(e.target.value as VarietyQuality)
  }
>
              <option value="Q1">1. Qualität</option>
              <option value="Q2">2. Qualität</option>
              <option value="UEBERGROESSE">Übergrößen</option>
            </select>

            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Speichern
            </button>
          </form>

          <ul style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            {safeVarieties.map((v) => (
              <li key={v.id}>
                {v.name} – {v.cookingType} – {v.quality}
              </li>
            ))}
          </ul>
        </section>

        {/* Kunden */}
        <section style={{ border: "1px solid #4b5563", padding: "1rem" }}>
          <h2>Kunden</h2>
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
            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Speichern
            </button>
          </form>

          <ul style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            {customers.map((c) => (
              <li key={c.id}>
                {c.name} {c.region ? `(${c.region})` : ""}
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  // === Haupt-Render ===
  return (
    <div className="app-root">
      <h1 className="app-title">Eferdinger Landl Tool</h1>

      {/* Login-Bereich */}
      <div className="login-bar">
        {!currentUser ? (
          <form onSubmit={handleLogin} className="login-form">
            <input
              placeholder="E-Mail"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Passwort"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <button type="submit">Login</button>
          </form>
        ) : (
          <>
            <span>
              Eingeloggt als{" "}
              <strong>
                {currentUser.name} ({currentUser.role})
              </strong>
            </span>
            <button onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>

      {/* Tabs */}
<div className="tab-bar">
  {canEditStammdaten && (
          <button
            onClick={() => setTab("stamm")}
            className={`tab-button ${
              tab === "stamm" ? "tab-button--active" : ""
            }`}
          >
            Stammdaten
          </button>
        )}
        <button
          onClick={() => setTab("farmerStock")}
          className={`tab-button ${
            tab === "farmerStock" ? "tab-button--active" : ""
          }`}
        >
          Bauernlager
        </button>
      </div>

      {/* Meldungen */}
      {message && <div className="message-bar">{message}</div>}

      {/* Inhalt */}
     {tab === "stamm" && canEditStammdaten && renderStammdatenTab()}
{tab === "stamm" && !canEditStammdaten && (
        <p className="info-text">
          Stammdaten sind nur für Organisator/Admin sichtbar.
        </p>
      )}
      {tab === "farmerStock" && renderFarmerStockTab()}

            {/* Bestätigungsdialog für Lagerbuchungen */}
      {confirmAction && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.5rem 2rem",
              maxWidth: "360px",
              width: "90%",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>
              {confirmAction.title}
            </h2>

            <p style={{ marginBottom: "1.25rem" }}>
              {confirmAction.message}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                style={{
                  padding: "0.4rem 0.9rem",
                  borderRadius: "999px",
                  border: "1px solid #d1d5db",
                  background: "white",
                }}
              >
                {confirmAction.cancelLabel ?? "Abbrechen"}
              </button>

              <button
                type="button"
                onClick={confirmAction.onConfirm}
                style={{
                  padding: "0.4rem 0.9rem",
                  borderRadius: "999px",
                  border: "none",
                  background: "#0f766e",
                  color: "white",
                  fontWeight: 500,
                }}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
