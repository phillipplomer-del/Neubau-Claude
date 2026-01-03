# AI Development Changelog

Dieses Dokument dient der Synchronisation und Dokumentation von Änderungen, die durch AI-Assistenten (Antigravity, Claude, etc.) an der Codebasis vorgenommen wurden.

---

## Session: 03.01.2026 - Planner Abhängigkeitssystem & Gantt-Optimierungen

**Branch:** `feature/design-experiments`
**Agent:** Claude (Opus 4.5)

### Zusammenfassung
Implementierung eines vollständigen Abhängigkeitssystems für den Planner mit allen vier Standard-Projektmanagement-Typen (FS, SS, FF, SF). Behebung des Gantt-Sortierungsproblems und Hinzufügen von Auto-Terminierung.

### Neue Features

#### Abhängigkeitssystem (alle 4 Standardtypen)

| Typ | Deutsch | Beschreibung |
|-----|---------|--------------|
| **FS** | Ende-Anfang (EA) | Nachfolger startet, wenn Vorgänger endet |
| **SS** | Anfang-Anfang (AA) | Beide Tasks können zusammen starten |
| **FF** | Ende-Ende (EE) | Beide Tasks müssen zusammen enden |
| **SF** | Anfang-Ende (AE) | Nachfolger endet, wenn Vorgänger startet |

#### Lag/Lead Time
- **Positive Werte** = Verzögerung (Task startet X Tage später)
- **Negative Werte** = Vorlaufzeit (Task kann X Tage früher starten/überlappen)

#### Auto-Terminierung
- Button "Auto-Terminierung" im Gantt-View
- Sortiert Tasks nach TASK_ORDER (M1, V1, V2.1, ...)
- Berechnet Start/Ende basierend auf Abhängigkeiten
- Respektiert alle vier Abhängigkeitstypen

### Technische Details

#### `src/types/planner.ts`
*   **Neue Types:**
    *   `PMDependencyType = 'FS' | 'SS' | 'FF' | 'SF'`
*   **Neue Interfaces:**
    *   `PMTaskDependency` - `{ predecessorId, type, lagDays }`
*   **Neue Exports:**
    *   `DEPENDENCY_TYPE_LABELS` - Deutsche Labels (EA, AA, EE, AE)
    *   `DEPENDENCY_TYPE_SHORT` - Kurzform
    *   `calculateDependencyStartDate()` - Berechnet Startdatum aus Abhängigkeiten
    *   `getSuccessorTasks()` - Findet alle abhängigen Tasks
    *   `getDependencyChain()` - Topologische Sortierung

#### `src/pages/projectManagement/planner/components/TaskModal.tsx`
*   **Neuer Tab "Abhängigkeiten":**
    *   Dropdown zur Vorgänger-Auswahl
    *   Typ-Selektor (EA/AA/EE/AE)
    *   Lag/Lead Time Input (Tage)
    *   Legende mit Beschreibungen
*   **Neue Funktionen:**
    *   `handleAddDependency()`
    *   `handleRemoveDependency()`
    *   `handleUpdateDependencyType()`
    *   `handleUpdateDependencyLag()`
*   **Bugfix:** Modal schließt nach Speichern (`onClose()` nach `onSave()`)

#### `src/pages/projectManagement/planner/components/GanttTaskReactView.tsx`
*   **Bugfix Sortierung:**
    *   `displayOrder: index + 1` statt `index` (Library-Bug: 0 ist falsy)
    *   M1 erscheint nun korrekt oben
*   **Neue Funktion `handleAutoSchedule()`:**
    *   Iteriert über Tasks in TASK_ORDER
    *   Berechnet Constraints aus allen Abhängigkeiten
    *   Switch für FS/SS/FF/SF mit unterschiedlicher Logik
    *   Speichert neue Start/End-Daten

### Projekt-Template (TASK_ORDER)

```typescript
const TASK_ORDER = [
  'M1', 'V1', 'V2.1', 'M3', 'V2.3', 'M4',      // Projektstart + Konstruktion
  'V3.1', 'V3.2', 'V3.3', 'V3.4',               // Beschaffung
  'V4.1', 'M5', 'V4.3', 'V4.4', 'M6',           // Produktion
  'V5.1', 'M7', 'M8',                           // Logistik + Abschluss
];
```

### Commits
- `a635eb1` - feat: fix Gantt chart ordering + add dependency editing
- `2715c82` - feat: expand dependency system with all four standard types (FS, SS, FF, SF)

---

## Session: 03.01.2026 - Sales Dashboard Implementation

**Branch:** `feature/design-experiments`
**Agent:** Claude (Opus 4.5)

### Zusammenfassung
Vollständige Implementierung eines umfassenden Sales Dashboards mit 6 KPIs, 4 Chart-Typen und 3 Tabellen. Das Dashboard bietet eine Übersicht aller Vertriebskennzahlen mit interaktiven Filtern und Theme-aware Design (Light/Dark Mode).

### Neue Dateien

#### Komponenten (`src/pages/sales/components/`)

| Datei | Beschreibung |
|-------|--------------|
| `SalesDashboardKPICards.tsx` | 6 KPI-Karten mit Icons, Werten und Trend-Indikatoren |
| `SalesRevenueChart.tsx` | Area Chart für Umsatzentwicklung (Plan vs. Ist) mit Zeitfilter |
| `SalesPipelineFunnel.tsx` | Horizontaler Balken-Trichter für Pipeline-Stufen |
| `SalesDistributionCharts.tsx` | 2 Donut-Charts (nach Kategorie A/B/C und nach Mitarbeiter) |
| `SalesHotLeadsTable.tsx` | Tabelle der aktiven Aufträge, sortiert nach Wert |
| `SalesUpcomingDeliveries.tsx` | Liste anstehender Lieferungen mit Tage-Filter (7/14/30) |
| `SalesRiskTable.tsx` | Gefährdete Projekte mit Risiko-Level und Verzug |

### Erweiterte Dateien

#### `src/types/sales.ts`
*   **Neue Interfaces:**
    *   `SalesDashboardKPIs` - Vollständige KPI-Struktur mit:
        *   Main KPIs: `pipelineValue`, `monthlyOrders`, `planVsActualPercent`, `openDeliveries`, `delayedOrders`, `averageMargin`
        *   Trends: `pipelineValueChange`, `monthlyOrdersChange`, `delayedOrdersChange`
        *   Aggregationen: `byCategory`, `bySalesRep`, `revenueByMonth`, `pipelineStages`
    *   `SalesEntryExtended` - Erweiterte Sales Entry mit Dashboard-Feldern (`margin`, `salesRep`, `pipelineStage`, `category`)
*   **Neue Types:**
    *   `PipelineStage` - Union Type für Pipeline-Stufen (`'quote' | 'order' | 'production' | 'ready' | 'delivered'`)

#### `src/lib/sales/kpiCalculator.ts`
*   **Neue Exports:**
    *   `PIPELINE_STAGE_LABELS` - Deutsche Labels für Pipeline-Stufen
    *   `formatCurrencyShort(value)` - Intelligente Währungsformatierung (€, T€, Mio €)
    *   `calculateDashboardKPIs(data, previousPeriodData?)` - Berechnet alle Dashboard-KPIs
    *   `calculateRevenueByMonth(data, months)` - Aggregiert Umsatz nach Monat
*   **Interne Funktionen:**
    *   `inferPipelineStage(entry)` - Leitet Pipeline-Stufe aus Entry-Status ab

#### `src/pages/sales/SalesDashboard.tsx`
*   **Komplett neu implementiert:**
    *   Integration aller neuen Komponenten
    *   Responsive Grid-Layout (1/2/3 Spalten je nach Viewport)
    *   Loading States für alle Komponenten
    *   Error Handling mit Retry-Button
    *   Refresh-Funktionalität

### KPI-Übersicht

| KPI | Label | Berechnung |
|-----|-------|------------|
| Pipeline | Offenes Auftragsvolumen | `SUM(openTurnover)` wo Status ≠ completed/cancelled |
| Auftragseingang | Monat | Anzahl Entries mit `bookingDate` im aktuellen Monat |
| Plan/Ist | % | `actualRevenue / plannedRevenue * 100` |
| Lieferungen | Offene Lieferungen | Count wo Status ≠ completed/cancelled |
| Verzug | Verzögerte Aufträge | Count wo `delayDays > 0` |
| Marge | Durchschn. Marge % | `AVG(marginPercent)` |

### Design-Entscheidungen

*   **Farbschema:** Theme-aware mit automatischer Erkennung via MutationObserver
    *   Light Mode: Aqua-Palette (#00E097, #00DEE0, #0050E0)
    *   Dark Mode: Orange-Gold-Green (#FFAA80, #E0BD00, #80FF80)
*   **Charts:** Recharts Library mit custom Tooltips und Gradient Fills
*   **Layout:** CSS Grid mit responsive Breakpoints (lg:grid-cols-3, md:grid-cols-2)

### Route
Das Dashboard ist erreichbar unter: `/sales/dashboard`

---

## Session: 27.12.2025 - Import Page Modernization

**Branch:** `feature/antigravity-dev`
**Agent:** Antigravity

### Zusammenfassung
Umfassende Modernisierung der Import-Seite (`/import`), um das Design an die "Galadriel"-Ästhetik (Home/Dashboard) anzupassen. Beinhaltet visuelle Updates, kritische Bugfixes bei der Datenlöschung und UX-Verbesserungen.

### Technische Details & Code-Änderungen

#### 1. `src/pages/Import.tsx`
*   **Layout & Styling:**
    *   Container auf `max-w-5xl mx-auto` begrenzt für bessere Lesbarkeit.
    *   Header mit `gradient-text` (Primary zu Purple) und `font-display` versehen.
    *   Einsatz von `Card`-Komponenten für Status-Meldungen und Success-Banner.
*   **Logik-Fix (Critical):**
    *   `handleClearData` wurde komplett neu geschrieben.
    *   **Vorher:** Löschte nur `STORE_NAMES.SALES`.
    *   **Nachher:** Löscht atomar alle Stores (`SALES`, `PRODUCTION`, `PROJECT_MANAGEMENT`, `MATCHES`, `METADATA`) mittels `Promise.all`.
*   **UX / Modal:**
    *   State `showDeleteModal` eingeführt.
    *   Native `window.confirm` Abfrage entfernt.
    *   Integration von `<Modal />` für die Sicherheitsabfrage beim Löschen der Datenbank.

#### 2. `src/components/import/MultiFileUploader.tsx`
*   **Komplettes Re-Design:**
    *   Implementation einer großen Dropzone mit `CloudUpload` Icon (Lucide).
    *   Visuelles Feedback bei Drag-Over (`scale-105`, Border-Color Change).
    *   Dateiliste zeigt nun Department-Chips (Sales/Production/Controlling) mit Farbcodes anstelle von Plain-Text.
    *   Buttons und Inputs nutzen nun standardisierte Tailwind-Klassen des Projekts.

### Verwendete Komponenten
*   `src/components/ui/Modal.tsx` (Wiederverwendung für Delete-Confirm)
*   `lucide-react` (Icons: `Trash2`, `CloudUpload`, `CheckCircle`, `AlertTriangle`)

---

## Template für zukünftige Einträge

Bitte das folgende Format nutzen, um Konsistenz zu wahren:

```markdown
## Session: DD.MM.YYYY - [Titel der Änderung]

**Branch:** [branch-name]
**Agent:** [Name des AI-Assistenten]

### Zusammenfassung
[Kurze Beschreibung der Ziele und Ergebnisse]

### Technische Details
*   **[Datei/Pfad]**: [Beschreibung der Änderung]
*   **[Datei/Pfad]**: [Beschreibung der Änderung]
```
