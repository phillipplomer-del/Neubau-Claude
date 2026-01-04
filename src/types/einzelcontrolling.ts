/**
 * Einzelcontrolling Types
 * Type definitions for project-level controlling with Excel import
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Main project container for Einzelcontrolling
 */
export interface EinzelcontrollingProject {
  id: string;
  projektnummer: string;
  projektname?: string;
  kundenname?: string;
  snapshots: EinzelcontrollingSnapshot[];
  latestSnapshot?: EinzelcontrollingSnapshot;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * A snapshot of project data at a specific point in time (calendar week)
 */
export interface EinzelcontrollingSnapshot {
  id: string;
  projektId: string;
  projektnummer: string;
  kalenderwoche: string; // Format: "KW01/2025"
  importedAt: Timestamp;
  importedBy: string;

  // Main sections
  uebersicht: ECUebersicht;
  vorkalkulation: ECVorkalkulation;
  pmKonstruktion: ECPMKonstruktion;
  einkauf: ECEinkauf;
  produktion: ECProduktion;
  versand: ECVersand;
  vertrieb: ECVertrieb;
  sonstiges: ECSonstiges;
  nachkalkulation: ECNachkalkulation;

  // Calculated KPIs
  kpis: ECKPIs;
}

/**
 * Übersicht - Project Overview/Summary
 */
export interface ECUebersicht {
  auftragsvolumen: number;
  gesamtkosten: number;
  deckungsbeitrag: number;
  deckungsbeitragProzent: number;
  projektstatus: string;
  fortschrittProzent: number;
}

/**
 * Vorkalkulation - Pre-calculation estimates
 */
export interface ECVorkalkulation {
  material: number;
  fertigung: number;
  montage: number;
  konstruktion: number;
  projektmanagement: number;
  sonstiges: number;
  gesamt: number;
}

/**
 * PM/Konstruktion - Project Management & Design costs
 */
export interface ECPMKonstruktion {
  stundenPM: number;
  stundenKonstruktion: number;
  kostenPM: number;
  kostenKonstruktion: number;
  gesamt: number;
}

/**
 * Einkauf - Procurement costs
 */
export interface ECEinkauf {
  materialkosten: number;
  zukaufteile: number;
  dienstleistungen: number;
  gesamt: number;
}

/**
 * Produktion - Production costs
 */
export interface ECProduktion {
  stundenFertigung: number;
  stundenMontage: number;
  kostenFertigung: number;
  kostenMontage: number;
  materialverbrauch: number;
  gesamt: number;
}

/**
 * Versand - Shipping costs
 */
export interface ECVersand {
  verpackung: number;
  transport: number;
  versicherung: number;
  gesamt: number;
}

/**
 * Vertrieb - Sales costs
 */
export interface ECVertrieb {
  provision: number;
  reisekosten: number;
  sonstiges: number;
  gesamt: number;
}

/**
 * Sonstiges - Miscellaneous costs
 */
export interface ECSonstiges {
  garantie: number;
  risiko: number;
  sonstiges: number;
  gesamt: number;
}

/**
 * Nachkalkulation - Post-calculation/Actual costs
 */
export interface ECNachkalkulation {
  istKostenGesamt: number;
  abweichungAbsolut: number;
  abweichungProzent: number;
}

/**
 * Key Performance Indicators
 */
export interface ECKPIs {
  // Profitability
  deckungsbeitragAbsolut: number;
  deckungsbeitragProzent: number;
  roiProzent: number;

  // Cost tracking
  planKosten: number;
  istKosten: number;
  kostenabweichung: number;
  kostenabweichungProzent: number;

  // Progress
  fertigstellungsgradProzent: number;

  // Efficiency
  stundenPlan: number;
  stundenIst: number;
  stundenabweichung: number;

  // Top cost drivers
  topKostenverursacher: ECKostenverursacher[];
}

/**
 * Cost driver entry
 */
export interface ECKostenverursacher {
  bereich: string;
  kosten: number;
  anteilProzent: number;
}

/**
 * Comparison data between snapshots
 */
export interface ECSnapshotComparison {
  fromSnapshot: string;
  toSnapshot: string;
  changes: ECChangeEntry[];
}

/**
 * Individual change entry
 */
export interface ECChangeEntry {
  field: string;
  label: string;
  fromValue: number;
  toValue: number;
  changeAbsolut: number;
  changeProzent: number;
}

// ============================================
// Input types for creating/updating
// ============================================

export interface CreateSnapshotInput {
  projektnummer: string;
  kalenderwoche: string;
  importedBy: string;
  data: Omit<EinzelcontrollingSnapshot, 'id' | 'projektId' | 'projektnummer' | 'importedAt' | 'importedBy' | 'kalenderwoche'>;
}

// ============================================
// Excel Import Types
// ============================================

export interface ECExcelRow {
  [key: string]: string | number | undefined;
}

export interface ECImportResult {
  success: boolean;
  projektnummer?: string;
  kalenderwoche?: string;
  snapshot?: EinzelcontrollingSnapshot;
  error?: string;
}

// ============================================
// UI State Types
// ============================================

export interface ECProjectFilter {
  projektnummer?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface ECViewState {
  selectedProject: string | null;
  selectedSnapshot: string | null;
  compareSnapshot: string | null;
  showComparison: boolean;
}

// ============================================
// Chart Data Types
// ============================================

export interface ECChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface ECTimeSeriesDataPoint {
  kalenderwoche: string;
  plan: number;
  ist: number;
  deckungsbeitrag?: number;
}

// ============================================
// Default/Empty values
// ============================================

export const EMPTY_VORKALKULATION: ECVorkalkulation = {
  material: 0,
  fertigung: 0,
  montage: 0,
  konstruktion: 0,
  projektmanagement: 0,
  sonstiges: 0,
  gesamt: 0,
};

export const EMPTY_PM_KONSTRUKTION: ECPMKonstruktion = {
  stundenPM: 0,
  stundenKonstruktion: 0,
  kostenPM: 0,
  kostenKonstruktion: 0,
  gesamt: 0,
};

export const EMPTY_EINKAUF: ECEinkauf = {
  materialkosten: 0,
  zukaufteile: 0,
  dienstleistungen: 0,
  gesamt: 0,
};

export const EMPTY_PRODUKTION: ECProduktion = {
  stundenFertigung: 0,
  stundenMontage: 0,
  kostenFertigung: 0,
  kostenMontage: 0,
  materialverbrauch: 0,
  gesamt: 0,
};

export const EMPTY_VERSAND: ECVersand = {
  verpackung: 0,
  transport: 0,
  versicherung: 0,
  gesamt: 0,
};

export const EMPTY_VERTRIEB: ECVertrieb = {
  provision: 0,
  reisekosten: 0,
  sonstiges: 0,
  gesamt: 0,
};

export const EMPTY_SONSTIGES: ECSonstiges = {
  garantie: 0,
  risiko: 0,
  sonstiges: 0,
  gesamt: 0,
};

export const BEREICH_LABELS: Record<string, string> = {
  vorkalkulation: 'Vorkalkulation',
  pmKonstruktion: 'PM/Konstruktion',
  einkauf: 'Einkauf',
  produktion: 'Produktion',
  versand: 'Versand',
  vertrieb: 'Vertrieb',
  sonstiges: 'Sonstiges',
};

// Dark mode colors (Orange → Gold → Green)
export const BEREICH_COLORS: Record<string, string> = {
  vorkalkulation: '#FFAA80',   // orange
  pmKonstruktion: '#FFC060',   // light orange
  einkauf: '#E0BD00',          // gold
  produktion: '#C5A800',       // dark gold
  versand: '#9EE000',          // lime
  vertrieb: '#80FF80',         // green
  sonstiges: '#60E060',        // dark green
};
