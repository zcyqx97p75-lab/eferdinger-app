import { useEffect, useState } from "react";

const API_URL =
import.meta.env.VITE_API_URL || "http://localhost:4000/api";
// ==== Typen ====

type Farmer = {
  id: number;
  name: string;
  farmName?: string | null;
  contactInfo?: string | null;
};

type Product = {
  id: number;
  name: string;
  cookingType: string;
  packagingType: string;
  productNumber?: string | null;
};

type Customer = {
  id: number;
  name: string;
  region?: string | null;
};

type FarmerStock = {
  id: number;
  farmerId: number;
  productId: number;
  quantityTons: number; // wir verwenden kg, Name bleibt vorerst so
  farmer?: Farmer;
  product?: Product;
};

type CurrentUser = {
  id: number;
  name: string;
  role: "ORGANISATOR" | "FARMER" | "PACKER" | "EG_ADMIN";
  farmerId?: number | null;
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

// ==== App ====

export default function App() {
  const [tab, setTab] = useState<Tab>("farmerStock");

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [farmerStocks, setFarmerStocks] = useState<FarmerStock[]>([]);

  const [message, setMessage] = useState<string | null>(null);

  // Login
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Stammdaten-Formulare
  const [farmerName, setFarmerName] = useState("");
  const [farmerFarmName, setFarmerFarmName] = useState("");
  const [farmerContact, setFarmerContact] = useState("");

  const [productName, setProductName] = useState("");
  const [productCookingType, setProductCookingType] = useState("FESTKOCHEND");
  const [productPackagingType, setProductPackagingType] = useState("");
  const [productNumber, setProductNumber] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerRegion, setCustomerRegion] = useState("");

  // Bauernlager-Filter
  const [stockFilterFarmerId, setStockFilterFarmerId] = useState<number | "">(
    ""
  );
  const [stockCookingFilter, setStockCookingFilter] = useState<string>("alle");
  const [stockProductFilterId, setStockProductFilterId] = useState<
    number | "alle"
  >("alle");

  // Bauernlager-Formulare (nur Bauer)
  const [invProductId, setInvProductId] = useState<number | "">("");
  const [invQuantityKg, setInvQuantityKg] = useState("");

  const [privProductId, setPrivProductId] = useState<number | "">("");
  const [privQuantityKg, setPrivQuantityKg] = useState("");

  const [egProductId, setEgProductId] = useState<number | "">("");
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
    setProducts(data);
  }

  async function loadCustomers() {
    const res = await fetch(`${API_URL}/customers`);
    const data = await res.json();
    setCustomers(data);
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

// Bauer ist nur, wer die Rolle FARMER hat und eine farmerId besitzt
const isFarmer = role === "FARMER" && currentUser?.farmerId != null;

// ORGANISATOR/Admin sind alle anderen, die eingeloggt sind und NICHT Bauer sind
// (also ORGANISATOR, EG_ADMIN, PACKER, eventuell später ADMIN)
const isAdminOrOrg =
  !!currentUser && (role === "ORGANISATOR" || role === "EG_ADMIN" || role === "PACKER");

  // === Stammdaten: Bauern, Produkte, Kunden ===

  async function handleCreateFarmer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/farmers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: farmerName,
          farmName: farmerFarmName,
          contactInfo: farmerContact,
        }),
      });
      if (!res.ok) {
        showMessage("Fehler beim Anlegen des Bauern");
        return;
      }
      setFarmerName("");
      setFarmerFarmName("");
      setFarmerContact("");
      await loadFarmers();
      showMessage("Bauer gespeichert");
    } catch (err) {
      console.error(err);
      showMessage("Fehler beim Anlegen des Bauern");
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productName,
          cookingType: productCookingType,
          packagingType: productPackagingType,
          productNumber,
        }),
      });
      if (!res.ok) {
        showMessage("Fehler beim Anlegen des Produkts");
        return;
      }
      setProductName("");
      setProductCookingType("FESTKOCHEND");
      setProductPackagingType("");
      setProductNumber("");
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

  async function handleInventory(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser?.farmerId) {
      showMessage("Kein Bauer zugeordnet");
      return;
    }
    if (!invProductId) {
      showMessage("Produkt wählen");
      return;
    }
    const qtyKg = parseKg(invQuantityKg);
    try {
      const res = await fetch(`${API_URL}/farmer-stock/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: currentUser.farmerId,
          productId: invProductId,
          newQuantityTons: qtyKg, // wir benutzen kg
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

  async function handleSale(
    e: React.FormEvent,
    type: "PRIVATE" | "EG",
    productId: number | "",
    qtyInput: string,
    clear: () => void
  ) {
    e.preventDefault();
    if (!currentUser?.farmerId) {
      showMessage("Kein Bauer zugeordnet");
      return;
    }
    if (!productId) {
      showMessage("Produkt wählen");
      return;
    }
    const qtyKg = parseKg(qtyInput);
    if (qtyKg <= 0) {
      showMessage("Menge muss > 0 sein");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/farmer-stock/direct-sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: currentUser.farmerId,
          productId,
          quantityTons: qtyKg, // kg
          saleType: type, // PRIVATE oder EG
        }),
      });
      if (!res.ok) {
        showMessage("Fehler beim Verbuchen des Verkaufs");
        return;
      }
      clear();
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

    // === Bauernlager-Ansicht ===

  function renderFarmerStockTab() {
    // effektiver Farmer-Filter:
    // - Bauer eingeloggt  → immer nur sein eigenes Lager
    // - Admin/ORGANISATOR → benutzt stockFilterFarmerId (Dropdown)
    const effectiveFarmerId =
      isFarmer && currentUser?.farmerId
        ? currentUser.farmerId
        : stockFilterFarmerId || undefined;

    // 1) Basis-Liste
    let filtered = farmerStocks;

    // 2) Nach Bauer filtern
    if (effectiveFarmerId && typeof effectiveFarmerId === "number") {
      filtered = filtered.filter((s) => s.farmerId === effectiveFarmerId);
    }

    // 3) Nach Kocheigenschaft filtern
    if (stockCookingFilter !== "alle") {
      filtered = filtered.filter(
        (s) => s.product?.cookingType === stockCookingFilter
      );
    }

    // 4) Nach Produkt filtern
    if (
      stockProductFilterId !== "alle" &&
      typeof stockProductFilterId === "number"
    ) {
      filtered = filtered.filter((s) => s.productId === stockProductFilterId);
    }

    // 5) Sortierung: Bauer → Produkt → Kocheigenschaft
    const sorted = [...filtered].sort((a, b) => {
      const aFarmer = a.farmer?.name ?? "";
      const bFarmer = b.farmer?.name ?? "";
      if (aFarmer !== bFarmer) {
        return aFarmer.localeCompare(bFarmer, "de");
      }

      const aProduct = a.product?.name ?? "";
      const bProduct = b.product?.name ?? "";
      if (aProduct !== bProduct) {
        return aProduct.localeCompare(bProduct, "de");
      }

      const aCook = a.product?.cookingType ?? "";
      const bCook = b.product?.cookingType ?? "";
      return aCook.localeCompare(bCook, "de");
    });

    return (
      <div
        style={{
          marginTop: "1rem",
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: isFarmer ? "2fr 1fr" : "1fr",
        }}
      >
        {/* Lagerübersicht */}
        <section style={{ border: "1px solid #4b5563", padding: "1rem" }}>
          <h2>Bauernlager (in kg)</h2>

          {/* Filter nur für Organisator/Admin */}
          {isAdminOrOrg && (
            <>
              <div style={{ marginBottom: "0.5rem" }}>
                <label>Bauer: </label>
                <select
                  value={stockFilterFarmerId}
                  onChange={(e) =>
                    setStockFilterFarmerId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                >
                  <option value="">alle Bauern</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.farmName ? `(${f.farmName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
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

                <div>
                  <label>Produkt: </label>
                  <select
                    value={stockProductFilterId}
                    onChange={(e) =>
                      setStockProductFilterId(
                        e.target.value ? Number(e.target.value) : "alle"
                      )
                    }
                  >
                    <option value="alle">alle</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.packagingType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
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
                <th>Produkt</th>
                <th>Kocheigenschaft</th>
                <th>Verpackung</th>
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
                  <td>{s.product?.name ?? "–"}</td>
                  <td>{s.product?.cookingType ?? "–"}</td>
                  <td>{s.product?.packagingType ?? "–"}</td>
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
        </section>

        {/* Lager pflegen – nur für Bauer */}
        {isFarmer && (
          <section style={{ border: "1px solid #4b5563", padding: "1rem" }}>
            <h2>Lager pflegen</h2>

            {/* Inventur */}
            <h3 style={{ marginTop: 0 }}>Inventur</h3>
            <form onSubmit={handleInventory}>
              <label>Produkt</label>
              <select
                value={invProductId}
                onChange={(e) =>
                  setInvProductId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
              >
                <option value="">– Produkt –</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.packagingType})
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
                handleSale(e, "PRIVATE", privProductId, privQuantityKg, () => {
                  setPrivQuantityKg("");
                  setPrivProductId("");
                })
              }
            >
              <label>Produkt</label>
              <select
                value={privProductId}
                onChange={(e) =>
                  setPrivProductId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
              >
                <option value="">– Produkt –</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.packagingType})
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
                handleSale(e, "EG", egProductId, egQuantityKg, () => {
                  setEgQuantityKg("");
                  setEgProductId("");
                })
              }
            >
              <label>Produkt</label>
              <select
                value={egProductId}
                onChange={(e) =>
                  setEgProductId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
              >
                <option value="">– Produkt –</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.packagingType})
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
    if (!isAdminOrOrg) {
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
            <label>Betrieb</label>
            <input
              value={farmerFarmName}
              onChange={(e) => setFarmerFarmName(e.target.value)}
            />
            <label>Kontakt</label>
            <input
              value={farmerContact}
              onChange={(e) => setFarmerContact(e.target.value)}
            />
            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Speichern
            </button>
          </form>

          <ul style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            {farmers.map((f) => (
              <li key={f.id}>
                {f.name} {f.farmName ? `(${f.farmName})` : ""}
              </li>
            ))}
          </ul>
        </section>

        {/* Produkte */}
        <section style={{ border: "1px solid #4b5563", padding: "1rem" }}>
          <h2>Produkte (Sorten)</h2>
          <form onSubmit={handleCreateProduct}>
            <label>Sorte</label>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
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
            <label>Verpackung</label>
            <input
              value={productPackagingType}
              onChange={(e) => setProductPackagingType(e.target.value)}
              placeholder="z.B. lose, 5 kg Sack"
            />
            <label>Produktnummer (optional)</label>
            <input
              value={productNumber}
              onChange={(e) => setProductNumber(e.target.value)}
            />
            <button type="submit" style={{ marginTop: "0.5rem" }}>
              Speichern
            </button>
          </form>

          <ul style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            {products.map((p) => (
              <li key={p.id}>
                {p.name} – {p.cookingType} – {p.packagingType}
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
    <h1 className="app-title">Eferdinger Landl – Erdäpfel-Tool</h1>

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
      {isAdminOrOrg && (
        <button
          onClick={() => setTab("stamm")}
          className={`tab-button ${tab === "stamm" ? "tab-button--active" : ""}`}
        >
          Stammdaten
        </button>
      )}
      <button
        onClick={() => setTab("farmerStock")}
        className={`tab-button ${tab === "farmerStock" ? "tab-button--active" : ""}`}
      >
        Bauernlager
      </button>
    </div>

    {/* Meldungen */}
    {message && <div className="message-bar">{message}</div>}

    {/* Inhalt */}
    {tab === "stamm" && isAdminOrOrg && renderStammdatenTab()}
    {tab === "stamm" && !isAdminOrOrg && (
      <p className="info-text">
        Stammdaten sind nur für Organisator/Admin sichtbar.
      </p>
    )}
    {tab === "farmerStock" && renderFarmerStockTab()}
  </div>
);
}