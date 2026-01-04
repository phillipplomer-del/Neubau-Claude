# Plan: KI-Projektbericht für Einzelcontrolling

## Übersicht
Erweiterung des Einzelcontrolling-Features um einen KI-generierten Projektbericht mit Handlungsempfehlungen. Die KI (Google Gemini) analysiert Controlling-Daten kombiniert mit PA/Arbeitsgang-Strukturdaten.

---

## Datenquellen

### 1. Einzelcontrolling-Daten (Firebase)
- **Hook:** `useEinzelcontrolling()`
- **Daten:** `EinzelcontrollingSnapshot` mit:
  - Übersicht (Auftragsvolumen, Gesamtkosten, Deckungsbeitrag, Fortschritt)
  - KPIs (Plan/Ist-Kosten, Abweichungen, Stunden)
  - Kostenblöcke: Vorkalkulation, PM/Konstruktion, Einkauf, Produktion, Versand, Vertrieb, Sonstiges
  - Nachkalkulation

### 2. PA/Arbeitsgang-Daten (IndexedDB)
- **Repository:** `productionRepository`
- **Daten:** `ProductionEntry[]` gefiltert nach `projektnummer`:
  - PA-Nummer, Arbeitsgang-Nummer
  - Plan/Ist-Stunden, Plan/Ist-Kosten
  - Status, Fertigstellungsgrad
  - Start/End-Datum

---

## Implementierung

### Schritt 1: Gemini API Service
**Neue Datei:** `src/lib/ai/geminiService.ts`

**Gemini 3 Flash Preview Modell:**
| Eigenschaft | Wert |
|-------------|------|
| Model ID | `gemini-3-flash-preview` |
| Endpoint | `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent` |
| Context Window | 1M Tokens |
| NPM Package | `@google/genai` |

```typescript
import { GoogleGenAI } from "@google/genai";

interface ProjectReportRequest {
  projektInfo: {
    projektnummer: string;
    projektname: string;
    kunde: string;
  };
  controlling: EinzelcontrollingSnapshot;
  produktionsstruktur: {
    anzahlPAs: number;
    anzahlArbeitsgaenge: number;
    stundenPlan: number;
    stundenIst: number;
    abweichungStunden: number;
    kritischePAs: Array<{
      paNummer: string;
      beschreibung: string;
      abweichungProzent: number;
    }>;
  };
}

interface ProjectReport {
  zusammenfassung: string;
  staerken: string[];
  risiken: string[];
  handlungsempfehlungen: string[];
  fazit: string;
}

// API Call Example
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: JSON.stringify(projectData),
  config: {
    thinkingConfig: { thinkingLevel: "medium" },  // low/medium/high
    responseMimeType: "application/json",
  },
});
```

- Gemini API Key aus Environment Variable: `VITE_GEMINI_API_KEY`
- Strukturierter Prompt für deutsche Projektberichte
- JSON-Output-Format via `responseMimeType`
- `thinkingLevel: "medium"` für gute Balance aus Speed und Reasoning

### Schritt 2: Hook für kombinierte Daten
**Neue Datei:** `src/hooks/useProjectReportData.ts`

- Input: `projektnummer`
- Lädt Einzelcontrolling-Daten via `useEinzelcontrolling()`
- Lädt PA/Arbeitsgang-Daten via `productionRepository.findByProjektnummer()`
- Aggregiert und bereitet Daten für KI auf
- Identifiziert kritische PAs (hohe Abweichungen)

### Schritt 3: Report Generation Hook
**Neue Datei:** `src/hooks/useProjectReport.ts`

```typescript
function useProjectReport(projektnummer: string) {
  return {
    generateReport: () => Promise<ProjectReport>,
    report: ProjectReport | null,
    loading: boolean,
    error: string | null
  };
}
```

### Schritt 4: UI-Komponenten
**Neue Datei:** `src/pages/projectManagement/einzelcontrolling/components/ProjectReportPanel.tsx`

- Button "KI-Bericht erstellen" im EinzelcontrollingView
- Modal/Panel für Berichtanzeige:
  - Zusammenfassung
  - Stärken (grün, Checkmarks)
  - Risiken (rot, Warnungen)
  - Handlungsempfehlungen (blau, nummeriert)
  - Fazit
- Export als PDF möglich

### Schritt 5: Integration in EinzelcontrollingView
**Änderung:** `src/pages/projectManagement/einzelcontrolling/EinzelcontrollingView.tsx`

- Button in Header-Bereich neben Projekt-Selektor
- Nur aktiv wenn Projekt ausgewählt
- Öffnet Report-Panel

---

## Kritische Dateien

| Datei | Aktion |
|-------|--------|
| `src/lib/ai/geminiService.ts` | NEU |
| `src/hooks/useProjectReportData.ts` | NEU |
| `src/hooks/useProjectReport.ts` | NEU |
| `src/pages/.../components/ProjectReportPanel.tsx` | NEU |
| `src/pages/.../EinzelcontrollingView.tsx` | ÄNDERN |
| `.env.example` | ÄNDERN (API Key Dokumentation) |

---

## Gemini Prompt-Struktur

```
Du bist ein erfahrener Projektcontroller. Analysiere die folgenden Projektdaten
und erstelle einen strukturierten Projektbericht auf Deutsch.

PROJEKTDATEN:
[JSON mit Controlling + Produktionsdaten]

Erstelle einen Bericht mit:
1. Kurze Zusammenfassung (2-3 Sätze)
2. Stärken des Projekts (max 4 Punkte)
3. Risiken und Problembereiche (max 4 Punkte)
4. Konkrete Handlungsempfehlungen (max 5 Punkte, priorisiert)
5. Fazit mit Gesamtbewertung

Antworte im JSON-Format.
```

---

## API Key Konfiguration

Der User muss den Gemini API Key in einer `.env` Datei hinterlegen:
```
VITE_GEMINI_API_KEY=your-api-key-here
```

**NPM Package installieren:**
```bash
npm install @google/genai
```

**API Key erhalten:**
1. https://aistudio.google.com/ besuchen
2. "Get API Key" klicken
3. Key in `.env` eintragen

---

## Ablauf im UI

```
┌─────────────────────────────────────────────────────────┐
│  Einzelcontrolling                                      │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ Projekt wählen  │  │ 🤖 KI-Bericht erstellen     │  │
│  └─────────────────┘  └──────────────────────────────┘  │
│                              ↓                          │
│         ┌────────────────────────────────────┐          │
│         │        KI-Projektbericht           │          │
│         │ ─────────────────────────────────  │          │
│         │ 📋 Zusammenfassung                 │          │
│         │ ✅ Stärken                         │          │
│         │ ⚠️ Risiken                         │          │
│         │ 💡 Handlungsempfehlungen           │          │
│         │ 📊 Fazit                           │          │
│         │                                    │          │
│         │ [PDF Export]  [Schließen]          │          │
│         └────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## Nächste Schritte nach Implementierung
1. User gibt Gemini API Key
2. Testen mit echtem Projekt
3. Prompt-Feintuning basierend auf Ergebnissen
