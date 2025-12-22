/**
 * Controlling Data Types
 */

// Zeitreihen-Daten aus Tabelle2
export interface ControllingEntry {
  date: Date;
  year: number;
  month: number;
  categoryA: number;
  categoryB: number;
  categoryC: number;
  totalProjects: number;
  turnover: number;
}

// Projekt-Daten aus Tabelle1
export interface ProjectEntry {
  projektnummer: string;
  auftraggeber: string;
  bezeichnung: string;
  projektleiter: string;
  projektkategorie: 'A' | 'B' | 'C';
  umsatz: number;
  vk: number;
  aktuell: number;
  voraussichtlich: number;
  marge: number;
  margeProzent: number;
}

export interface ControllingData {
  // Zeitreihen (Tabelle2)
  entries: ControllingEntry[];
  years: number[];
  // Projektdaten (Tabelle1)
  projects: ProjectEntry[];
}
