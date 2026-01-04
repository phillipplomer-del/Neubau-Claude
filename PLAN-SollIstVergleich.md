# Plan: Soll-Ist Vergleich - Hierarchische Produktionsansicht

## Datenstruktur (Hierarchie)

```
Projekt (optional, Projektnummer)
└── Artikel (Artikelnummer / Productnumber)
    └── Haupt-PA (HauptPaNummer)
        └── PA (PaNummer)
            └── Arbeitsgänge (Arbeitsgangnummer + DescriptionText)
                 ├── Soll / Ist (Stunden)
                 ├── Soll € / Ist € (Kosten)
                 ├── StartDatum / EndDatum
                 └── Status (PA Status, Aktiv)
```

## Vorhandene Felder im Mapper (production)

| Excel-Spalte | Internes Feld | Zweck |
|--------------|---------------|-------|
| Productnumber | artikelnummer | Artikel-ID |
| Projektnummer | projektnummer | Projekt-Zuordnung |
| PaNummer | workOrderNumber | Produktionsauftrag |
| HauptPaNummer | mainWorkOrderNumber | Übergeordneter PA |
| ArtikelBeschreibung | productDescription | Artikelname |
| Menge | quantity | Menge |
| StartDatum | plannedStartDate | Geplanter Start |
| EndDatum | plannedEndDate | Geplantes Ende |
| Soll | plannedHours | Geplante Stunden |
| Ist | actualHours | Ist-Stunden |
| Soll € | plannedCosts | Geplante Kosten |
| Ist € | actualCosts | Ist-Kosten |
| PA Status | status | Status des PA |
| Aktiv | active | X = aktiv |
| % Ist | completionPercentage | Fertigstellungsgrad |
| Gruppe | group | Gruppierung |
| DescriptionText | notes | Arbeitsgang-Beschreibung |
| Arbeitsgangnummer | operationNumber | Arbeitsgang-Nr |

---

## Teil 1: Aufklappbare Hierarchie-Liste (ComparisonView)

### Komponenten

1. **ProductionHierarchyView** (Hauptkomponente)
   - Lädt Daten aus IndexedDB
   - Gruppiert nach Hierarchie
   - Filter & Suche

2. **HierarchyTree** (Baum-Komponente)
   - Rekursive Darstellung
   - Expand/Collapse
   - Aggregierte Werte pro Ebene

3. **HierarchyNode** (Einzelner Knoten)
   - Projekt-Node (wenn vorhanden)
   - Artikel-Node
   - HauptPA-Node
   - PA-Node
   - Arbeitsgang-Node (Blatt)

### Datenaufbereitung

```typescript
interface HierarchyNode {
  id: string;
  type: 'project' | 'article' | 'mainPA' | 'pa' | 'operation';
  name: string;
  children: HierarchyNode[];

  // Aggregierte Werte (Summe der Kinder)
  plannedHours: number;
  actualHours: number;
  plannedCosts: number;
  actualCosts: number;

  // Zeitraum (Min/Max der Kinder)
  startDate?: Date;
  endDate?: Date;

  // Status
  status?: string;
  active?: boolean;
  completionPercentage?: number;

  // Original-Daten (nur bei Blättern)
  entry?: ProductionEntry;
}
```

### Gruppierungs-Logik

```typescript
function buildHierarchy(entries: ProductionEntry[]): HierarchyNode[] {
  // 1. Gruppiere nach Projektnummer (falls vorhanden)
  // 2. Innerhalb: Gruppiere nach Artikelnummer
  // 3. Innerhalb: Gruppiere nach HauptPaNummer
  // 4. Innerhalb: Gruppiere nach PaNummer
  // 5. Blätter: Arbeitsgänge (Arbeitsgangnummer)

  // Aggregiere Soll/Ist Werte von unten nach oben
}
```

### UI-Design

```
[▼] Projekt P12345                    Soll: 120h | Ist: 95h | Δ: -25h
    [▼] Artikel 4820.1234             Soll: 80h  | Ist: 60h | Δ: -20h
        [▼] Haupt-PA 50001            Soll: 50h  | Ist: 40h | Δ: -10h
            [▼] PA 50001-01           Soll: 30h  | Ist: 25h | Δ: -5h
                ├─ 10 Sägen           Soll: 5h   | Ist: 4h  | ✓
                ├─ 20 Fräsen          Soll: 15h  | Ist: 12h | ✓
                └─ 30 Montage         Soll: 10h  | Ist: 9h  | ⏳
            [▶] PA 50001-02           Soll: 20h  | Ist: 15h | Δ: -5h
        [▶] Haupt-PA 50002            ...
    [▶] Artikel 4820.5678             ...
```

### Farbcodierung

- **Grün**: Ist < Soll (unter Budget)
- **Gelb**: Ist ≈ Soll (±10%)
- **Rot**: Ist > Soll (über Budget)
- **Grau**: Noch nicht gestartet

---

## Teil 2: Gantt-Diagramm (GanttView)

### Optionen für Gantt-Bibliothek

1. **frappe-gantt** (leichtgewichtig, einfach)
2. **react-gantt-timeline**
3. **Eigene Implementierung** (mehr Kontrolle)

**Empfehlung**: Eigene Implementierung mit CSS Grid für volle Kontrolle

### Komponenten

1. **GanttChart** (Hauptkomponente)
   - Zeitachse (Header)
   - Aufgaben-Zeilen
   - Zoom-Kontrolle (Tag/Woche/Monat)

2. **GanttTimeline** (Zeitachse)
   - Datum-Header
   - Heute-Markierung
   - Grid-Linien

3. **GanttRow** (Einzelne Aufgabe)
   - Balken für Zeitraum
   - Fortschrittsanzeige
   - Hierarchie-Einrückung

4. **GanttBar** (Balken)
   - Start/Ende
   - Fortschritt (innerer Balken)
   - Farbe nach Status

### Datenstruktur für Gantt

```typescript
interface GanttTask {
  id: string;
  name: string;
  level: number;           // Hierarchie-Ebene für Einrückung
  start: Date;
  end: Date;
  progress: number;        // 0-100
  type: 'project' | 'article' | 'mainPA' | 'pa' | 'operation';
  parentId?: string;

  // Soll-Ist Daten
  plannedHours: number;
  actualHours: number;
  status: string;
}
```

### UI-Design

```
                        Jan 2025                    Feb 2025
Name                    1  2  3  4  5  6  7  8  1  2  3  4
─────────────────────────────────────────────────────────────
▼ P12345               [████████████████░░░░░░░]
  ▼ Artikel 4820       [███████████░░░░░]
    ▼ Haupt-PA 50001   [█████████░░░]
      PA 50001-01      [██████]     ← abgeschlossen
      PA 50001-02         [████░░░] ← in Arbeit
    Haupt-PA 50002              [░░░░░░░] ← geplant
```

### Features

- **Zoom**: Tag / Woche / Monat
- **Scroll**: Horizontal für Zeit, Vertikal für Aufgaben
- **Heute-Linie**: Vertikale rote Linie
- **Tooltip**: Details bei Hover
- **Expand/Collapse**: Wie in der Liste
- **Filterbar**: Status, Projekt, Datum

---

## Implementierungsschritte

### Phase 1: Datenaufbereitung
1. Hook `useProductionHierarchy` erstellen
2. Hierarchie-Builder implementieren
3. Aggregations-Logik

### Phase 2: Aufklappbare Liste
1. `ProductionHierarchyView` Komponente
2. `HierarchyTree` mit rekursiver Darstellung
3. Expand/Collapse State
4. Soll/Ist Anzeige mit Farbcodierung
5. Filter & Suche

### Phase 3: Gantt-Diagramm
1. `GanttChart` Grundstruktur
2. `GanttTimeline` Zeitachse
3. `GanttRow` und `GanttBar`
4. Zoom-Kontrolle
5. Synchronisation mit Hierarchie-Liste

### Phase 4: Integration
1. Navigation in Sidebar (bereits vorhanden)
2. Synchronisierte Ansichten (Liste ↔ Gantt)
3. Performance-Optimierung für große Datenmengen

---

## Geklärte Fragen

1. **Projektnummer**: ✓ Ja, es gibt Artikel ohne Projektnummer
2. **Haupt-PA**: ✓ Ja, PA kann gleich Haupt-PA sein (oberste Ebene)
3. **Arbeitsgänge**: ✓ Arbeitsgänge sind in separater Tabelle "AG_Puffer" mit Bezeichnungen, Pufferzeiten, Verrechnungssatz etc.
4. **Datumsformat**: ✓ Start- und Enddatum sind auf PA-Ebene (nicht auf Arbeitsgang-Ebene)

## Angepasste Hierarchie

```
Projekt (optional, kann fehlen)
└── Artikel (Productnumber)
    └── PA / Haupt-PA (wenn PA = HauptPA → oberste PA-Ebene)
        └── Unter-PA (wenn PA ≠ HauptPA)
            └── Arbeitsgänge (aus AG_Puffer Tabelle)
```
