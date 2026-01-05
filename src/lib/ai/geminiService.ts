/**
 * Gemini AI Service for Project Reports
 * Uses Netlify Function to call Gemini 3 Flash Preview (keeps API key server-side)
 */

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
    verspaetetePAs: Array<{
      paNummer: string;
      beschreibung: string;
      endDatum: string;
      tageVerspaetet: number;
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
 * Generate project report using Netlify Function (Gemini 3 Flash)
 */
export async function generateProjectReport(
  request: ProjectReportRequest
): Promise<ProjectReport> {
  const prompt = buildPrompt(request);

  // Call Netlify Function instead of direct API
  const response = await fetch('/.netlify/functions/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
    throw new Error(error.error || `API-Fehler: ${response.status}`);
  }

  return response.json();
}

/**
 * Build the prompt for Gemini
 */
function buildPrompt(request: ProjectReportRequest): string {
  return `Analysiere folgende Projektdaten und erstelle einen Bericht:

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

KRITISCHE PAs (hohe Stundenabweichung):
${
  request.produktionsstruktur.kritischePAs.length > 0
    ? request.produktionsstruktur.kritischePAs
        .slice(0, 5)
        .map((pa) => `- ${pa.paNummer}: ${pa.beschreibung} (${pa.abweichungProzent.toFixed(0)}% Abweichung)`)
        .join('\n')
    : '- Keine kritischen PAs identifiziert'
}

VERSPÄTETE PAs (Enddatum überschritten):
${
  request.produktionsstruktur.verspaetetePAs.length > 0
    ? request.produktionsstruktur.verspaetetePAs
        .slice(0, 5)
        .map((pa) => `- ${pa.paNummer}: ${pa.beschreibung} (${pa.tageVerspaetet} Tage verspätet, Fällig: ${pa.endDatum})`)
        .join('\n')
    : '- Keine verspäteten PAs'
}`
    : ''
}

Erstelle jetzt den Projektbericht im JSON-Format.`;
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
