import type { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

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
- Fortschritt deutlich hinter Plan: Risiko
- Verspätete PAs: WICHTIG - jede verspätete PA ist ein Terminrisiko und sollte in den Risiken und Handlungsempfehlungen adressiert werden`;

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'GEMINI_API_KEY nicht konfiguriert' }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt fehlt' }),
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        thinkingConfig: { thinkingLevel: 'medium' },
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Keine Antwort von Gemini' }),
      };
    }

    // Parse and return
    const parsed = JSON.parse(text);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        zusammenfassung: parsed.zusammenfassung || '',
        staerken: parsed.staerken || [],
        risiken: parsed.risiken || [],
        handlungsempfehlungen: parsed.handlungsempfehlungen || [],
        fazit: parsed.fazit || '',
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      }),
    };
  }
};
