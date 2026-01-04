/**
 * Gemini AI Service for Project Reports
 * Uses Gemini 3 Flash Preview for generating project analysis
 */

import { GoogleGenAI } from '@google/genai';
import type { EinzelcontrollingSnapshot } from '@/types/einzelcontrolling';

// Types for the AI report
export interface ProjectReportRequest {
  projektInfo: {
    projektnummer: string;
    projektname: string;
    kunde: string;
    kalenderwoche: string;
  };
  controlling: {
    auftragsvolumen: number;
    gesamtkosten: number;
    deckungsbeitrag: number;
    deckungsbeitragProzent: number;
    fortschrittProzent: number;
    planKosten: number;
    istKosten: number;
    kostenabweichung: number;
    kostenabweichungProzent: number;
    stundenPlan: number;
    stundenIst: number;
    stundenabweichung: number;
    topKostenverursacher: Array<{
      bereich: string;
      kosten: number;
      anteilProzent: number;
    }>;
  };
  kostenstruktur: {
    vorkalkulation: number;
    pmKonstruktion: number;
    einkauf: number;
    produktion: number;
    versand: number;
    vertrieb: number;
    sonstiges: number;
  };
  produktionsstruktur?: {
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

export interface ProjectReport {
  zusammenfassung: string;
  staerken: string[];
  risiken: string[];
  handlungsempfehlungen: string[];
  fazit: string;
  generatedAt: string;
}

const SYSTEM_PROMPT = `Du bist ein erfahrener Projektcontroller in einem deutschen Maschinenbauunternehmen.
Du analysierst Projektdaten und erstellst prägnante Berichte für das Management.

Deine Aufgabe:
- Analysiere die übergebenen Controlling-Daten objektiv
- Identifiziere Stärken und Risiken des Projekts
- Gib konkrete, umsetzbare Handlungsempfehlungen
- Schreibe auf Deutsch in professionellem Ton
- Halte dich kurz und prägnant

Antworte IMMER im folgenden JSON-Format:
{
  "zusammenfassung": "2-3 Sätze Zusammenfassung des Projektstatus",
  "staerken": ["Stärke 1", "Stärke 2", ...],
  "risiken": ["Risiko 1", "Risiko 2", ...],
  "handlungsempfehlungen": ["1. Empfehlung", "2. Empfehlung", ...],
  "fazit": "Gesamtbewertung in 1-2 Sätzen"
}

Wichtige Schwellenwerte für die Bewertung:
- Kostenabweichung > 10%: kritisch
- Kostenabweichung > 5%: erhöht
- Deckungsbeitrag < 15%: niedrig
- Deckungsbeitrag < 25%: akzeptabel
- Fortschritt deutlich hinter Plan: Risiko`;

/**
 * Transform Einzelcontrolling snapshot to report request format
 */
export function transformSnapshotToRequest(
  snapshot: EinzelcontrollingSnapshot,
  projektname: string,
  kunde: string,
  produktionsstruktur?: ProjectReportRequest['produktionsstruktur']
): ProjectReportRequest {
  return {
    projektInfo: {
      projektnummer: snapshot.projektnummer,
      projektname,
      kunde,
      kalenderwoche: snapshot.kalenderwoche,
    },
    controlling: {
      auftragsvolumen: snapshot.uebersicht.auftragsvolumen,
      gesamtkosten: snapshot.uebersicht.gesamtkosten,
      deckungsbeitrag: snapshot.uebersicht.deckungsbeitrag,
      deckungsbeitragProzent: snapshot.uebersicht.deckungsbeitragProzent,
      fortschrittProzent: snapshot.uebersicht.fortschrittProzent,
      planKosten: snapshot.kpis.planKosten,
      istKosten: snapshot.kpis.istKosten,
      kostenabweichung: snapshot.kpis.kostenabweichung,
      kostenabweichungProzent: snapshot.kpis.kostenabweichungProzent,
      stundenPlan: snapshot.kpis.stundenPlan,
      stundenIst: snapshot.kpis.stundenIst,
      stundenabweichung: snapshot.kpis.stundenabweichung,
      topKostenverursacher: snapshot.kpis.topKostenverursacher,
    },
    kostenstruktur: {
      vorkalkulation: snapshot.vorkalkulation.gesamt,
      pmKonstruktion: snapshot.pmKonstruktion.gesamt,
      einkauf: snapshot.einkauf.gesamt,
      produktion: snapshot.produktion.gesamt,
      versand: snapshot.versand.gesamt,
      vertrieb: snapshot.vertrieb.gesamt,
      sonstiges: snapshot.sonstiges.gesamt,
    },
    produktionsstruktur,
  };
}

/**
 * Generate project report using Gemini 3 Flash
 */
export async function generateProjectReport(
  request: ProjectReportRequest
): Promise<ProjectReport> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Gemini API Key nicht konfiguriert. Bitte VITE_GEMINI_API_KEY in .env setzen.'
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const userPrompt = `Analysiere folgende Projektdaten und erstelle einen Bericht:

PROJEKT: ${request.projektInfo.projektnummer} - ${request.projektInfo.projektname}
KUNDE: ${request.projektInfo.kunde}
STAND: ${request.projektInfo.kalenderwoche}

FINANZEN:
- Auftragsvolumen: ${formatCurrency(request.controlling.auftragsvolumen)}
- Gesamtkosten: ${formatCurrency(request.controlling.gesamtkosten)}
- Deckungsbeitrag: ${formatCurrency(request.controlling.deckungsbeitrag)} (${request.controlling.deckungsbeitragProzent.toFixed(1)}%)
- Plan-Kosten: ${formatCurrency(request.controlling.planKosten)}
- Ist-Kosten: ${formatCurrency(request.controlling.istKosten)}
- Kostenabweichung: ${formatCurrency(request.controlling.kostenabweichung)} (${request.controlling.kostenabweichungProzent.toFixed(1)}%)

FORTSCHRITT: ${request.controlling.fortschrittProzent.toFixed(0)}%

STUNDEN:
- Plan: ${request.controlling.stundenPlan.toFixed(0)} h
- Ist: ${request.controlling.stundenIst.toFixed(0)} h
- Abweichung: ${request.controlling.stundenabweichung.toFixed(0)} h

KOSTENVERTEILUNG:
${Object.entries(request.kostenstruktur)
  .map(([key, value]) => `- ${capitalizeFirst(key)}: ${formatCurrency(value)}`)
  .join('\n')}

TOP KOSTENVERURSACHER:
${request.controlling.topKostenverursacher
  .slice(0, 5)
  .map((k) => `- ${k.bereich}: ${formatCurrency(k.kosten)} (${k.anteilProzent.toFixed(1)}%)`)
  .join('\n')}
${
  request.produktionsstruktur
    ? `
PRODUKTIONSSTRUKTUR:
- Anzahl PAs: ${request.produktionsstruktur.anzahlPAs}
- Anzahl Arbeitsgänge: ${request.produktionsstruktur.anzahlArbeitsgaenge}
- Stunden Plan: ${request.produktionsstruktur.stundenPlan.toFixed(0)} h
- Stunden Ist: ${request.produktionsstruktur.stundenIst.toFixed(0)} h
- Abweichung: ${request.produktionsstruktur.abweichungStunden.toFixed(0)} h

KRITISCHE PAs (hohe Abweichung):
${
  request.produktionsstruktur.kritischePAs.length > 0
    ? request.produktionsstruktur.kritischePAs
        .slice(0, 5)
        .map((pa) => `- ${pa.paNummer}: ${pa.beschreibung} (${pa.abweichungProzent.toFixed(0)}% Abweichung)`)
        .join('\n')
    : '- Keine kritischen PAs identifiziert'
}`
    : ''
}

Erstelle jetzt den Projektbericht im JSON-Format.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        thinkingConfig: { thinkingLevel: 'medium' },
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Keine Antwort von Gemini erhalten');
    }

    // Parse JSON response
    const parsed = JSON.parse(text);

    return {
      zusammenfassung: parsed.zusammenfassung || '',
      staerken: parsed.staerken || [],
      risiken: parsed.risiken || [],
      handlungsempfehlungen: parsed.handlungsempfehlungen || [],
      fazit: parsed.fazit || '',
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Gemini-Antwort konnte nicht als JSON interpretiert werden');
    }
    throw error;
  }
}

// Helper functions
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
