# Refactoring-Plan Phase 2: Weiterer Zerlegung von App.tsx

## Aktuelle Situation
- **App.tsx**: 11.208 Zeilen
- **Bereits ausgelagert**: OrganizerStatsTab
- **Noch in App.tsx**: 9 große Tab-Komponenten + viele Handler-Funktionen

## Vorschläge zur weiteren Zerlegung

### Phase 8: Tab-Komponenten auslagern (Priorität: HOCH)

Die größten Tab-Komponenten sollten in separate Dateien ausgelagert werden:

#### 8.1 Große Tabs (je >500 Zeilen)
1. **renderStammdatenTab** (~1.200 Zeilen, Zeile 7446)
   - Datei: `src/components/tabs/StammdatenTab.tsx`
   - Enthält: Formulare für Bauern, Produkte, Kunden, Preise, Qualitätspreise, Steuersätze, User
   - **Komplexität**: Sehr hoch - viele Formulare und Validierungen

2. **renderPackstationTab** (~1.800 Zeilen, Zeile 9208)
   - Datei: `src/components/tabs/PackstationTab.tsx`
   - Enthält: Packstellen-Lager, Verpackung, Abfall, Inventur auf 0
   - **Komplexität**: Sehr hoch - Karussell-Logik, viele States

3. **renderFarmerStockTab** (~1.500 Zeilen, Zeile 5936)
   - Datei: `src/components/tabs/FarmerStockTab.tsx`
   - Enthält: Farmer-Bestände, Filter, Sortierung
   - **Komplexität**: Mittel-Hoch

4. **renderKalkulationenTab** (~700 Zeilen, Zeile 4839)
   - Datei: `src/components/tabs/KalkulationenTab.tsx`
   - Enthält: PnL, manuelle Kosten
   - **Komplexität**: Mittel

#### 8.2 Mittlere Tabs (je 200-500 Zeilen)
5. **renderVerkaufTab** (~200 Zeilen, Zeile 5541)
   - Datei: `src/components/tabs/VerkaufTab.tsx`
   - Enthält: Verkaufsformulare
   - **Komplexität**: Mittel

6. **renderLagerInventurTab** (~170 Zeilen, Zeile 5368)
   - Datei: `src/components/tabs/LagerInventurTab.tsx`
   - Enthält: Inventur-Formulare
   - **Komplexität**: Niedrig-Mittel

7. **renderAbrechnungenTab** (~700 Zeilen, Zeile 4131)
   - Datei: `src/components/tabs/AbrechnungenTab.tsx`
   - Enthält: Abrechnungs-Formulare
   - **Komplexität**: Mittel-Hoch

8. **renderReklamationTab** (~500 Zeilen, Zeile 3634)
   - Datei: `src/components/tabs/ReklamationTab.tsx`
   - Enthält: Reklamations-Formulare
   - **Komplexität**: Mittel

9. **renderStatistikTab** (~660 Zeilen, Zeile 2975)
   - Datei: `src/components/tabs/StatistikTab.tsx`
   - Enthält: Statistiken für Packbetrieb
   - **Komplexität**: Mittel

10. **renderFarmerStatsPlanningTab** (~540 Zeilen, Zeile 8673)
    - Datei: `src/components/tabs/FarmerStatsPlanningTab.tsx`
    - Enthält: Planung und Statistiken für Bauern
    - **Komplexität**: Mittel

### Phase 9: Handler-Funktionen gruppieren (Priorität: MITTEL)

Viele Handler-Funktionen sind noch in App.tsx. Diese sollten in thematische Handler-Module gruppiert werden:

#### 9.1 Packstation-Handler
- `doInventory`, `handleInventory`
- `doSale`, `handleSale`
- `handlePackbetriebSale`
- Datei: `src/handlers/packstationHandlers.ts`

#### 9.2 Kalkulations-Handler
- `saveManualCost`
- `deleteManualCost`
- `editManualCost`
- Datei: `src/handlers/calculationHandlers.ts`

#### 9.3 Admin-Handler
- `handleResetUserPassword`
- `handleResetFarmerPassword`
- `handleCreateUser` (bereits in userHandlers.ts, aber prüfen)
- Datei: `src/handlers/adminHandlers.ts`

#### 9.4 Wrapper-Funktionen
Viele `load*Wrapper` Funktionen könnten in einen zentralen Service-Wrapper ausgelagert werden:
- `loadAllUsersWrapper`
- `loadPackStationsWrapper`
- `loadPackPlantsWrapper`
- `loadManualCosts`
- `loadPnl`
- `loadTaxRates`
- `loadOrganizerDeliveries`
- `loadPrices`
- `loadQualityPricesWrapper`
- `loadPackPlantStockWrapper`
- `loadPackStationStockWrapper`
- `loadRecentPackagingRunsWrapper`
- `loadRecentWasteMovementsWrapper`
- `loadRecentInventoryZeroMovementsWrapper`
- `loadDeliveryPlansWrapper`
- `loadFarmerStocksWrapper`

**Vorschlag**: Diese könnten in einen `useDataLoader` Hook ausgelagert werden, der die Services aufruft und States aktualisiert.

### Phase 10: State-Management optimieren (Priorität: NIEDRIG)

Viele verwandte States könnten in Custom Hooks gruppiert werden:

#### 10.1 Kalkulations-States
- Alle `pnl*` States
- Alle `mc*` States (manuelle Kosten)
- Hook: `useCalculations.ts`

#### 10.2 Packstation-States
- `packSelection`, `packProductId`, `packColli`, `packUnits`
- `wasteSelection`, `wasteKg`
- `packZeroSelection`, `packZeroComment`
- `packCarouselIndex`
- Hook: `usePackstation.ts`

#### 10.3 Reklamations-States
- Alle `rekl*` States
- Hook: `useReklamation.ts`

#### 10.4 Verkaufs-States
- Alle `sale*` States
- Hook: `useVerkauf.ts`

### Phase 11: Komplexe Logik extrahieren (Priorität: NIEDRIG)

#### 11.1 Filter- und Sortier-Logik
- Farmer-Stock-Filter-Logik
- Packstation-Sortier-Logik
- Datei: `src/utils/filters.ts`

#### 11.2 Berechnungs-Logik
- Saldo-Berechnungen
- Prozent-Berechnungen
- Datei: `src/utils/calculations.ts`

## Empfohlene Reihenfolge

### Schritt 1: Große Tabs auslagern (größter Impact)
1. `renderStammdatenTab` (1.200 Zeilen)
2. `renderPackstationTab` (1.800 Zeilen)
3. `renderFarmerStockTab` (1.500 Zeilen)
4. `renderKalkulationenTab` (700 Zeilen)

**Erwartete Reduktion**: ~5.200 Zeilen

### Schritt 2: Mittlere Tabs auslagern
5. `renderAbrechnungenTab` (700 Zeilen)
6. `renderStatistikTab` (660 Zeilen)
7. `renderFarmerStatsPlanningTab` (540 Zeilen)
8. `renderReklamationTab` (500 Zeilen)
9. `renderVerkaufTab` (200 Zeilen)
10. `renderLagerInventurTab` (170 Zeilen)

**Erwartete Reduktion**: ~2.770 Zeilen

### Schritt 3: Handler-Funktionen gruppieren
- Packstation-Handler
- Kalkulations-Handler
- Admin-Handler

**Erwartete Reduktion**: ~500-800 Zeilen

### Schritt 4: Wrapper-Funktionen optimieren
- `useDataLoader` Hook erstellen
- Alle `load*Wrapper` Funktionen ersetzen

**Erwartete Reduktion**: ~300-500 Zeilen

## Erwartetes Endergebnis

- **App.tsx**: ~2.000-3.000 Zeilen (statt 11.208)
- **Modularität**: Jeder Tab in eigener Datei
- **Wartbarkeit**: Deutlich verbessert
- **Stabilität**: Bessere Isolation von Fehlern

## Vorteile

1. **Einfachere Fehlersuche**: Fehler sind auf spezifische Tab-Komponenten isoliert
2. **Bessere Testbarkeit**: Jede Tab-Komponente kann einzeln getestet werden
3. **Parallele Entwicklung**: Mehrere Entwickler können gleichzeitig an verschiedenen Tabs arbeiten
4. **Code-Wiederverwendung**: Tab-Komponenten können leichter wiederverwendet werden
5. **Performance**: Nur benötigte Tabs werden geladen (könnte später mit Lazy Loading optimiert werden)

## Risiken und Herausforderungen

1. **Props-Drilling**: Viele States müssen als Props weitergegeben werden
   - **Lösung**: Context API oder Zustand-Management-Library (später)
   
2. **Abhängigkeiten**: Tabs haben viele Abhängigkeiten zu States und Services
   - **Lösung**: Props-Interface klar definieren, Services importieren
   
3. **Type-Safety**: Props müssen korrekt typisiert werden
   - **Lösung**: TypeScript Interfaces für jede Tab-Komponente

## Nächste Schritte

Soll ich mit **Phase 8.1** beginnen und die größten Tabs auslagern?

