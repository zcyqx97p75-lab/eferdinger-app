# Refactoring-Ziel: Minimales App.tsx

## Vision

**App.tsx soll NUR noch enthalten:**
1. ✅ Login-Entscheidung (Login-Formular vs. Haupt-App)
2. ✅ Rollen-Erkennung (isFarmer, isOrganizer, isEgAdmin, etc.)
3. ✅ Routing / Tab-Auswahl (welcher Tab ist aktiv)
4. ✅ Übergabe an Sub-Komponenten (Tab-Komponenten rendern)

**App.tsx soll NICHT mehr enthalten:**
- ❌ Tabellen
- ❌ Formulare
- ❌ Business-Logik
- ❌ State-Management für Tab-spezifische Daten
- ❌ Handler-Funktionen
- ❌ Wrapper-Funktionen

## Zielgröße

**Aktuell**: 11.208 Zeilen
**Ziel**: ~200-300 Zeilen

## Vorteile

1. **Klarheit**: App.tsx wird zur reinen "Orchestrierung"
2. **Wartbarkeit**: Änderungen an Tabs betreffen nur die Tab-Komponenten
3. **Testbarkeit**: Jede Tab-Komponente kann isoliert getestet werden
4. **Performance**: Potenzial für Lazy Loading der Tabs
5. **Teamarbeit**: Parallele Entwicklung ohne Konflikte
6. **Onboarding**: Neue Entwickler verstehen die Struktur sofort

## Herausforderungen

### 1. Props-Drilling
**Problem**: Viele States müssen an Tab-Komponenten weitergegeben werden
**Lösung**: 
- Context API für gemeinsame States (currentUser, farmers, products, etc.)
- Oder: Custom Hooks, die States bereitstellen
- Oder: Zustand-Management-Library (später)

### 2. Service-Aufrufe
**Problem**: Tab-Komponenten müssen Daten laden können
**Lösung**: 
- Services direkt in Tab-Komponenten importieren
- Oder: Custom Hooks für Data-Loading

### 3. Shared State
**Problem**: Manche States werden von mehreren Tabs verwendet
**Lösung**: 
- Context API für shared state
- Oder: Custom Hooks, die States teilen

### 4. Message/Notification System
**Problem**: `showMessage` wird überall benötigt
**Lösung**: 
- Context API für Notifications
- Oder: Globaler Hook

## Struktur-Vision

```typescript
// App.tsx (Ziel: ~200-300 Zeilen)
export default function App() {
  // 1. Auth
  const { currentUser, handleLogin, handleLogout, ... } = useAuth();
  
  // 2. Rollen-Erkennung
  const isFarmer = currentUser?.role === "FARMER";
  const isOrganizer = currentUser?.role === "ORGANISATOR";
  // ...
  
  // 3. Tab-Management
  const { tab, setTab } = useTabs(currentUser);
  
  // 4. Shared Context (optional)
  const sharedState = useSharedState();
  
  // 5. Login-Entscheidung
  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }
  
  // 6. Routing / Tab-Auswahl
  return (
    <SharedStateProvider value={sharedState}>
      <Navigation tab={tab} setTab={setTab} role={currentUser.role} />
      <main>
        {tab === "stamm" && <StammdatenTab />}
        {tab === "farmerStock" && <FarmerStockTab />}
        {tab === "packstation" && <PackstationTab />}
        {tab === "stats" && <OrganizerStatsTab />}
        {/* ... weitere Tabs */}
      </main>
    </SharedStateProvider>
  );
}
```

## Umsetzungs-Plan

### Phase 1: Tab-Komponenten auslagern (AKTUELL)
- Alle Tab-Render-Funktionen → separate Komponenten
- Props-Interface definieren
- Services direkt importieren

### Phase 2: Shared State Context
- Context für gemeinsame States (farmers, products, customers, etc.)
- Context für Notifications (showMessage)
- Custom Hooks für Context-Zugriff

### Phase 3: Handler-Funktionen auslagern
- Alle Handler → separate Handler-Module
- Tab-Komponenten importieren Handler direkt

### Phase 4: State-Management optimieren
- Tab-spezifische States → in Tab-Komponenten
- Shared States → Context API

### Phase 5: Finale Bereinigung
- App.tsx auf Minimum reduzieren
- Nur noch Orchestrierung

## Erwartete Dateistruktur

```
frontend/src/
├── App.tsx                    # ~200-300 Zeilen (NUR Orchestrierung)
├── components/
│   ├── LoginForm.tsx          # Login-Komponente
│   ├── Navigation.tsx         # Tab-Navigation
│   └── tabs/
│       ├── StammdatenTab.tsx
│       ├── FarmerStockTab.tsx
│       ├── PackstationTab.tsx
│       ├── OrganizerStatsTab.tsx
│       └── ...
├── contexts/
│   ├── SharedStateContext.tsx # Gemeinsame States
│   └── NotificationContext.tsx # Notifications
├── hooks/
│   ├── useAuth.ts
│   ├── useTabs.ts
│   ├── useSharedState.ts
│   └── ...
├── services/
│   └── ... (bereits vorhanden)
└── handlers/
    └── ... (bereits vorhanden)
```

## Realistische Einschätzung

**Machbar?** ✅ Ja, absolut!

**Zeitaufwand?** 
- Phase 1 (Tabs auslagern): ~2-3 Stunden
- Phase 2 (Context API): ~1-2 Stunden
- Phase 3 (Handler auslagern): ~1 Stunde
- Phase 4 (State optimieren): ~1-2 Stunden
- Phase 5 (Finale Bereinigung): ~1 Stunde

**Gesamt**: ~6-9 Stunden Arbeit

**Risiken?**
- Props-Drilling kann komplex werden → Context API löst das
- Viele Abhängigkeiten → Schrittweise Migration
- Breaking Changes → Gute Tests helfen

## Fazit

**Das Ziel ist sehr gut und absolut machbar!**

Es wird App.tsx zu einer klaren, wartbaren Orchestrierungs-Komponente machen. Die Herausforderungen sind lösbar, und der Nutzen ist enorm.

**Soll ich mit der Umsetzung beginnen?**


