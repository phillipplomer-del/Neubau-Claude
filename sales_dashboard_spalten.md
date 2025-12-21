# Sales Dashboard - Angezeigte Spalten

## Übersicht

Basierend auf der Konfiguration in `constants.js` werden im Sales Dashboard folgende Spalten angezeigt (in dieser Reihenfolge).

---

## AUTO_ACTIVATE_SALES_COLUMNS (Standardmäßig aktiviert)

| Nr. | Spalte | Beschreibung |
|-----|--------|-------------|
| 1 | **OrderNumber** | Bestellnummer |
| 2 | **PNR** | Projektnummer |
| 3 | **BookingDate** | Buchungsdatum |
| 4 | **CustomerNumber** | Kundennummer |
| 5 | **Matchcode** | Matchcode (Kundenname) |
| 6 | **Country** | Land |
| 7 | **ProductGroup** | Produktgruppe |
| 8 | **ProductNumber** | Produktnummer |
| 9 | **ProductName** | Produktname |
| 10 | **Wunsch_Liefertermin** | Gewünschter Liefertermin |
| 11 | **erster_Bestaetigter_Liefertermin** | Erster bestätigter Liefertermin |
| 12 | **DeliveryDate** | Tatsächliches Lieferdatum |
| 13 | **Unit** | Einheit |
| 14 | **Quantity** | Menge |
| 15 | **Projekt_Verantwortlich** | Projektverantwortlicher |
| 16 | **UserClearName** | Bearbeitername |
| 17 | **offener Umsatz** | Offener Umsatz (in €) |
| 18 | **Lieferverzug in Tagen2** | Lieferverzug in Tagen |

---

## Wichtige Hinweise

### Datenverfügbarkeit
- Diese Spalten werden **nur angezeigt, wenn sie in der hochgeladenen Excel-Datei vorhanden sind**
- Fehlende Spalten werden automatisch ausgeblendet

### Benutzer-Konfiguration
- Der Benutzer kann in den **Settings (Einstellungen)** jede Spalte einzeln aktivieren/deaktivieren
- Die Reihenfolge folgt der `AUTO_ACTIVATE_SALES_COLUMNS` Liste aus `constants.js`
- Zusätzliche Spalten aus der Excel-Datei können ebenfalls aktiviert werden

### Spaltentypen
- **Datums-Spalten**: Automatisch formatiert (z.B. `01.01.2024`)
- **Währungs-Spalten**: Automatisch formatiert als Euro (z.B. `1.234,56 €`)
- **Zahlen-Spalten**: Mit Monospace-Schriftart dargestellt
- **Text-Spalten**: Normal formatiert

---

## Verwandte Komponenten

- **Konfiguration**: `constants.js` → `AUTO_ACTIVATE_SALES_COLUMNS`
- **UI-Komponente**: `SalesView.js`
- **Einstellungen**: `SettingsView.js`
- **State Management**: `useAppLogic.js` → Sales-Reducer
