# PVCS Prism - Knowledge Database Overview

Diese Dokumentation dient als zentrale Wissensquelle für KI-Assistenten und Entwickler bei der Arbeit am PVCS Prism Projekt.

---

## Projektübersicht

**PVCS Prism** ist ein Business Intelligence Dashboard für Maschinenbau- und Fertigungsunternehmen. Die Anwendung vereint Sales-Tracking, Produktionsplanung, Projektcontrolling und Zeiterfassung in einer modernen React-Oberfläche.

### Tech Stack

| Technologie | Verwendung |
|-------------|------------|
| React 18 | Frontend Framework |
| TypeScript | Typsicherheit |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| Firebase | Cloud-Datenbank (User-spezifische Daten) |
| IndexedDB | Lokale Datenspeicherung (Excel-Imports) |
| Recharts | Diagramme und Charts |
| D3.js | Force-Tree Visualisierungen |
| Framer Motion | Animationen |
| xlsx | Excel-Parsing |
| Netlify | Hosting & Serverless Functions |

---

## Architektur

```
src/
├── components/          # Wiederverwendbare UI-Komponenten
│   ├── auth/           # Login-Modal
│   ├── import/         # Multi-File-Uploader
│   ├── layout/         # Header, Sidebar, Layout
│   └── ui/             # Card, Modal, StatCard, etc.
├── contexts/           # React Context (UserContext)
├── hooks/              # Custom Hooks
├── lib/                # Business Logic
│   ├── ai/             # Gemini KI-Service
│   ├── excel/          # Excel Parser & Mapper
│   ├── firebase/       # Firebase Config & Services
│   ├── indexeddb/      # IndexedDB Repositories
│   ├── production/     # Produktions-Berechnungen
│   ├── projectManagement/  # PM-Berechnungen
│   └── sales/          # Sales KPI-Calculator
├── pages/              # Seitenkomponenten
│   ├── dataComparison/ # Datenabgleich
│   ├── production/     # Produktionsmodul
│   ├── projectManagement/  # PM mit Planner & Einzelcontrolling
│   ├── sales/          # Sales Dashboard & Lieferungen
│   ├── timeTracking/   # Zeiterfassung
│   └── visualization/  # Force-Tree Ansichten
├── types/              # TypeScript Interfaces
└── utils/              # Hilfsfunktionen
```

---

## Module

### 1. Sales

**Route:** `/sales`, `/sales/dashboard`, `/sales/deliveries`

**Funktionen:**
- Dashboard mit 6 KPIs (Pipeline, Auftragseingang, Plan/Ist, Lieferungen, Verzug, Marge)
- Lieferungsliste mit Filter und Sortierung
- Kritische & beobachtete Projekte (Speicherung in Firebase)
- Detailansicht pro Lieferung
- Charts: Umsatzentwicklung, Pipeline-Funnel, Verteilung nach Kategorie/Mitarbeiter

**Datenquelle:** Excel-Import (Offene Lieferungen)

**Wichtige Dateien:**
- `src/pages/sales/Dashboard.tsx`
- `src/pages/sales/SalesDashboard.tsx`
- `src/lib/sales/kpiCalculator.ts`
- `src/types/sales.ts`

---

### 2. Produktion

**Route:** `/production`, `/production/planning`, `/production/gantt`, `/production/comparison`

**Funktionen:**
- Produktions-Dashboard mit KPIs
- Gantt-Diagramm mit Zoom (Tage/Wochen/Monate)
- Planungsübersicht
- Soll-Ist-Vergleich

**Datenquelle:** Excel-Import (PP_SollIstVergleich)

**Wichtige Dateien:**
- `src/pages/production/Dashboard.tsx`
- `src/pages/production/GanttView.tsx`
- `src/pages/production/ComparisonView.tsx`
- `src/types/production.ts`

---

### 3. Projektmanagement

**Route:** `/projects`, `/projects/list`, `/projects/controlling`

**Funktionen:**
- Controlling-Dashboard mit Deckungsbeitrag-Übersicht
- Projektliste mit Status-Indikatoren
- Detailansicht pro Projekt

**Datenquelle:** Excel-Import (Controlling)

**Wichtige Dateien:**
- `src/pages/projectManagement/Dashboard.tsx`
- `src/pages/projectManagement/ControllingView.tsx`
- `src/types/projectManagement.ts`

---

### 4. Planner (Kanban)

**Route:** `/planner`, `/planner/:boardId`

**Funktionen:**
- Kanban-Board mit Drag & Drop
- Multiple Boards pro Projekt
- Task-Templates (M1, V1, V2.1, etc.)
- **Abhängigkeitssystem (alle 4 Typen):**
  - FS (Ende-Anfang): Nachfolger startet wenn Vorgänger endet
  - SS (Anfang-Anfang): Beide Tasks starten zusammen
  - FF (Ende-Ende): Beide Tasks enden zusammen
  - SF (Anfang-Ende): Nachfolger endet wenn Vorgänger startet
- Lag/Lead Time (positive = Verzögerung, negativ = Vorlaufzeit)
- Gantt-Ansicht mit Auto-Terminierung
- Lokale Speicherung in IndexedDB

**Wichtige Dateien:**
- `src/pages/projectManagement/planner/PlannerDashboard.tsx`
- `src/pages/projectManagement/planner/BoardView.tsx`
- `src/pages/projectManagement/planner/components/GanttTaskReactView.tsx`
- `src/pages/projectManagement/planner/components/TaskModal.tsx`
- `src/types/planner.ts`

---

### 5. Einzelcontrolling

**Route:** `/einzelcontrolling`

**Funktionen:**
- Upload einzelner Controlling-Excel-Dateien
- Detaillierte Kostenanalyse nach Bereichen
- Balkendiagramm Kosten nach Bereich
- Produktions-Arbeitsgänge mit Status
- **KI-Projektbericht** (Gemini 3 Flash)

**Excel-Struktur:**
- Sheet "Info": Projektnummer, Kunde, Auftragsvolumen
- Sheet "Tabellen": Kostenaufstellung nach Bereichen

**Wichtige Dateien:**
- `src/pages/projectManagement/einzelcontrolling/EinzelcontrollingView.tsx`
- `src/lib/ai/geminiService.ts`
- `src/hooks/useProjectReport.ts`

---

### 6. Zeiterfassung

**Route:** `/time-tracking`

**Funktionen:**
- Timer starten/stoppen (auch aus Header)
- Manuelle Zeiteinträge
- Projektzuordnung (Projektnummer oder Freitext)
- Kategorien: Entwicklung, Besprechung, Planung, Verwaltung, Review, Sonstiges
- Wochen-Übersicht mit Summen
- PDF-Export
- Speicherung in Firebase (geräteübergreifend)

**Wichtige Dateien:**
- `src/pages/timeTracking/Dashboard.tsx`
- `src/components/layout/TimerWidget.tsx`
- `src/lib/firebase/timeEntryService.ts`

---

### 7. KI-Projektbericht

**Integration in:** Einzelcontrolling

**Funktionen:**
- Automatische Analyse der Projektdaten
- Generierung eines strukturierten Berichts:
  - Zusammenfassung
  - Stärken
  - Risiken
  - Handlungsempfehlungen
  - Fazit
- Verwendet Google Gemini 3 Flash über Netlify Function

**API-Konfiguration:**
- API Key wird serverseitig in Netlify Function verwendet
- Environment Variable: `GEMINI_API_KEY` (Netlify)
- Netlify Function: `netlify/functions/generate-report.ts`

**Wichtige Dateien:**
- `src/lib/ai/geminiService.ts`
- `netlify/functions/generate-report.ts`
- `docs/plan-ki-projektbericht.md`

---

## Datenspeicherung

### Firebase (Cloud)

Speichert benutzerspezifische Daten:
- Kritische/beobachtete Projekte (Status-Markierungen)
- Zeiteinträge
- User-Preferences

**Konfiguration:** `src/lib/firebase/config.ts`

### IndexedDB (Lokal)

Speichert importierte Excel-Daten:
- Sales Entries
- Production Entries
- Project Management Entries
- Matches (Verknüpfungen)
- Metadata

**Repositories:** `src/lib/indexeddb/`

---

## Datenimport

**Route:** `/import`

**Unterstützte Dateien:**

| Datei | Modul | Erkennung |
|-------|-------|-----------|
| Lieferungen.xlsx | Sales | Automatisch |
| Planung.xlsx | Produktion | Automatisch |
| Controlling.xlsx | Projektmanagement | Automatisch |
| Einzelcontrolling.xlsx | Einzelcontrolling | Manuell |

**Features:**
- Drag & Drop Upload
- Automatische Dateityp-Erkennung
- Multi-File-Upload
- Validierung der Spaltenstruktur

**Wichtige Dateien:**
- `src/pages/Import.tsx`
- `src/components/import/MultiFileUploader.tsx`
- `src/lib/excel/parser.ts`
- `src/lib/excel/mappers/`

---

## UI/UX

### Design System

- **Fonts:** Space Grotesk (Display), Inter (Body)
- **Farben:** Gradient-basiert mit Theme-Support (Light/Dark)
- **Komponenten:** Card, StatCard, Modal, Button, Input

### Theme

- Dark Mode als Standard
- Toggle im Header (Sun/Moon Icon)
- Persistierung in localStorage

### Responsive

- Mobile-first Approach
- Collapsible Sidebar
- Grid-Layouts mit Breakpoints

---

## Benutzeranleitung

Die vollständige Benutzeranleitung ist verfügbar unter:
**`/anleitung.html`** (im Browser öffnen oder via `/public/anleitung.html`)

---

## Dokumentation für Entwickler

| Datei | Inhalt |
|-------|--------|
| `AI_CHANGELOG.md` | Änderungsprotokoll für KI-Assistenten |
| `ANALYSIS_SUMMARY.md` | Excel-Analysetools und Spalten-Mappings |
| `EXCEL_ANALYSIS_README.md` | Detaillierte Excel-Struktur |
| `docs/plan-ki-projektbericht.md` | Implementierungsplan KI-Bericht |
| `QUICK_START.md` | Schnellstart-Anleitung |
| `public/anleitung.html` | Benutzerhandbuch (HTML) |

---

## Deployment

### Netlify

- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Functions Directory:** `netlify/functions`

### Environment Variables (Netlify)

| Variable | Beschreibung |
|----------|--------------|
| `GEMINI_API_KEY` | Google Gemini API Key (serverseitig) |

---

## Wichtige Geschäftsregeln

### Sales-Import
- Zeilen mit `QuantityRem1 = 0` werden übersprungen (bereits geliefert)

### Projekt-Status
- **Normal:** Keine besondere Aufmerksamkeit nötig
- **Beobachtet:** Erhöhte Aufmerksamkeit (Eye Icon)
- **Kritisch:** Hohes Risiko (Warning Icon)

### Planner Task-Order
Standard-Reihenfolge für Projekt-Tasks:
```
M1 → V1 → V2.1 → M3 → V2.3 → M4 → V3.1 → V3.2 → V3.3 → V3.4 →
V4.1 → M5 → V4.3 → V4.4 → M6 → V5.1 → M7 → M8
```

---

## Letzte Aktualisierung

**Januar 2026** - Version 2.0

Neue Features:
- Zeiterfassung mit Timer-Widget
- KI-Projektbericht (Gemini 3 Flash)
- Erweitertes Sales Dashboard
- Planner Abhängigkeitssystem (FS/SS/FF/SF)
- Auto-Terminierung im Gantt-View
