# Rückverfolgbarkeits-Analyse: Verkauf → Reklamation → Bauer

## Aktuelle Datenbankstruktur

### CustomerSale
- ✅ `customerId` - Verbindung zum Kunden
- ✅ `productId` - Verbindung zum Produkt
- ❌ **FEHLT:** `farmerId` - Keine direkte Verbindung zum Bauern
- ❌ **FEHLT:** `varietyId` - Keine direkte Verbindung zur Sorte
- ❌ **FEHLT:** `farmerNameSnapshot` - Kein Snapshot des Bauern
- ❌ **FEHLT:** `varietyNameSnapshot` - Kein Snapshot der Sorte
- ❌ **FEHLT:** `packagingRunId` - Keine Verbindung zum PackagingRun

### PackPlantStockMovement
- ✅ `productId` - Verbindung zum Produkt
- ✅ `customerId` - Verbindung zum Kunden (bei Verkäufen)
- ❌ **FEHLT:** `farmerId` - Keine Verbindung zum Bauern
- ❌ **FEHLT:** `varietyId` - Keine Verbindung zur Sorte
- ❌ **FEHLT:** `packagingRunId` - Keine Verbindung zum PackagingRun, der das Lager gefüllt hat
- ❌ **FEHLT:** `customerSaleId` - Keine direkte Verbindung zum Verkauf

### CustomerSaleComplaint
- ✅ `customerSaleId` - Verbindung zum Verkauf
- ✅ `farmerId` - Verbindung zum Bauern (manuell ausgewählt)
- ❌ **FEHLT:** `varietyId` - Keine Verbindung zur Sorte
- ❌ **FEHLT:** `packagingRunId` - Keine Verbindung zum ursprünglichen PackagingRun

## Problem

Die Rückverfolgbarkeit basiert aktuell auf:
1. **FIFO-Logik** - Berechnung zur Laufzeit, nicht gespeichert
2. **Manuelle Auswahl** - Bei Reklamationen muss der Benutzer den Bauern manuell auswählen
3. **Keine direkte Verbindung** - CustomerSale → PackagingRun ist nicht dokumentiert

## Risiken

1. **FIFO kann sich ändern** - Wenn PackagingRuns nachträglich geändert werden, stimmt die Zuordnung nicht mehr
2. **Fehleranfällig** - Manuelle Auswahl kann falsch sein
3. **Keine Nachvollziehbarkeit** - Es ist nicht dokumentiert, welche PackagingRuns für einen Verkauf verwendet wurden
4. **Audit-Trail fehlt** - Bei Prüfungen kann die Herkunft nicht nachgewiesen werden

## Empfohlene Lösung

### Option 1: Snapshots in CustomerSale (Minimal)
- `farmerNameSnapshot` String?
- `varietyNameSnapshot` String?
- Vorteil: Einfach, keine Schema-Änderung für Relations
- Nachteil: Keine direkte Verbindung, nur Text

### Option 2: Foreign Keys in CustomerSale (Empfohlen)
- `farmerId` Int?
- `varietyId` Int?
- `farmerNameSnapshot` String?
- `varietyNameSnapshot` String?
- Vorteil: Direkte Verbindung, bessere Abfragen
- Nachteil: Schema-Änderung nötig

### Option 3: Junction Table (Maximal)
- Neue Tabelle `CustomerSalePackagingRun` mit:
  - `customerSaleId`
  - `packagingRunId`
  - `quantityUnits` (wie viele Einheiten aus diesem Run)
- Vorteil: Vollständige Dokumentation, mehrere Runs pro Verkauf
- Nachteil: Komplexer, mehr Tabellen

### Option 4: PackagingRunId in PackPlantStockMovement
- `packagingRunId` Int? in `PackPlantStockMovement`
- `customerSaleId` Int? in `PackPlantStockMovement`
- Vorteil: Dokumentiert, welche Runs für welchen Verkauf verwendet wurden
- Nachteil: Nur bei Verkäufen relevant

## Empfehlung

**Kombination aus Option 2 + Option 4:**
1. Füge `farmerId`, `varietyId` und Snapshots zu `CustomerSale` hinzu
2. Füge `packagingRunId` und `customerSaleId` zu `PackPlantStockMovement` hinzu
3. Beim Verkauf: Speichere die Farmer/Variety-Informationen direkt im CustomerSale
4. Beim Verkauf: Verknüpfe den PackPlantStockMovement mit dem CustomerSale

Dies gewährleistet:
- ✅ Vollständige Rückverfolgbarkeit
- ✅ Direkte Verbindungen in der Datenbank
- ✅ Audit-Trail
- ✅ Keine Abhängigkeit von FIFO-Logik zur Laufzeit


