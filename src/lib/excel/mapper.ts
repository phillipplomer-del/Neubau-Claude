/**
 * Column Mapping System
 * Maps Excel columns to our internal data structure
 */

import type { Department } from '@/types/common';

export interface ColumnMapping {
  excelColumn: string; // Name der Spalte im Excel
  internalField: string; // Name des Feldes in unserer App
  required: boolean;
  transform?: (value: unknown) => unknown;
}

export interface DepartmentColumnMapping {
  department: Department;
  mappings: ColumnMapping[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default column mappings based on actual Excel structure
 */
export const DEFAULT_MAPPINGS: Record<Department, ColumnMapping[]> = {
  sales: [
    // Identifiers (mindestens eines sollte vorhanden sein)
    { excelColumn: 'ProductNumber', internalField: 'artikelnummer', required: false },
    { excelColumn: 'PNR', internalField: 'projektnummer', required: false },

    // Order info
    { excelColumn: 'OrderNumber', internalField: 'deliveryNumber', required: false },
    { excelColumn: 'BookingDate', internalField: 'importedAt', required: false },

    // Customer
    { excelColumn: 'CustomerNumber', internalField: 'customerNumber', required: false },
    { excelColumn: 'Matchcode', internalField: 'customerName', required: false },

    // Product
    { excelColumn: 'ProductName', internalField: 'productDescription', required: false },

    // Quantities & Delivery
    { excelColumn: 'Quantity', internalField: 'quantity', required: false },
    { excelColumn: 'QuantityRem1', internalField: 'quantityRemaining', required: true }, // Important for filtering!
    { excelColumn: 'Unit', internalField: 'unit', required: false },
    { excelColumn: 'DeliveryDate', internalField: 'deliveryDate', required: false },
    { excelColumn: 'Wunsch_Liefertermin', internalField: 'requestedDeliveryDate', required: false },

    // Financial
    { excelColumn: 'Turnover', internalField: 'totalPrice', required: false },
    { excelColumn: 'TurnoverRem1', internalField: 'remainingTurnover', required: false },
    { excelColumn: 'offener Umsatz', internalField: 'openTurnover', required: false },

    // Additional
    { excelColumn: 'Projekt_Verantwortlich', internalField: 'projectManager', required: false },
    { excelColumn: 'Bearbeiter', internalField: 'processor', required: false },
    { excelColumn: 'Lieferverzug in Tagen2', internalField: 'delayDays', required: false },
  ],

  production: [
    // Identifiers
    { excelColumn: 'Productnumber', internalField: 'artikelnummer', required: true },
    { excelColumn: 'Projektnummer', internalField: 'projektnummer', required: false },

    // Work order
    { excelColumn: 'PaNummer', internalField: 'workOrderNumber', required: false },
    { excelColumn: 'HauptPaNummer', internalField: 'mainWorkOrderNumber', required: false },

    // Product
    { excelColumn: 'ArtikelBeschreibung', internalField: 'productDescription', required: false },
    { excelColumn: 'Menge', internalField: 'quantity', required: false },

    // Dates (for Gantt)
    { excelColumn: 'StartDatum', internalField: 'plannedStartDate', required: false },
    { excelColumn: 'EndDatum', internalField: 'plannedEndDate', required: false },

    // Soll-Ist (Planned vs Actual)
    { excelColumn: 'Soll', internalField: 'plannedHours', required: false },
    { excelColumn: 'Ist', internalField: 'actualHours', required: false },
    { excelColumn: 'Soll €', internalField: 'plannedCosts', required: false },
    { excelColumn: 'Ist €', internalField: 'actualCosts', required: false },

    // Status & Progress
    { excelColumn: 'PA Status', internalField: 'status', required: false },
    { excelColumn: 'Aktiv', internalField: 'active', required: false },
    { excelColumn: '% Ist', internalField: 'completionPercentage', required: false },

    // Additional
    { excelColumn: 'Gruppe', internalField: 'group', required: false },
    { excelColumn: 'DescriptionText', internalField: 'notes', required: false },
    { excelColumn: 'Arbeitsgangnummer', internalField: 'operationNumber', required: false },
  ],

  projectManagement: [
    // Identifiers
    { excelColumn: 'Projektnummer', internalField: 'projektnummer', required: true },
    { excelColumn: 'Artikelnummer', internalField: 'artikelnummer', required: false },

    // Project info
    { excelColumn: 'Bezeichnung', internalField: 'projectName', required: false },
    { excelColumn: 'Auftraggeber', internalField: 'client', required: false },
    { excelColumn: 'Projektleiter', internalField: 'projectManager', required: false },
    { excelColumn: 'Projektkategorie', internalField: 'category', required: false },

    // Dates
    { excelColumn: 'Liefertermin AB', internalField: 'plannedEndDate', required: false },

    // Financial (Budget & Costs)
    { excelColumn: 'VK', internalField: 'plannedBudget', required: false },
    { excelColumn: 'Aktuell', internalField: 'actualCosts', required: false },
    { excelColumn: 'Voraussichtlich', internalField: 'forecastCosts', required: false },
    { excelColumn: 'Abweichungen', internalField: 'budgetVariance', required: false },

    // Revenue & Margin
    { excelColumn: 'Umsatz', internalField: 'actualRevenue', required: false },
    { excelColumn: 'Marge €', internalField: 'marginEuro', required: false },
    { excelColumn: 'Marge Prozent', internalField: 'profitMargin', required: false },

    // Cost breakdown
    { excelColumn: 'PM', internalField: 'pmCosts', required: false },
    { excelColumn: 'Konstruktion', internalField: 'designCosts', required: false },
    { excelColumn: 'Fertigung', internalField: 'productionCosts', required: false },
    { excelColumn: 'Material', internalField: 'materialCosts', required: false },
    { excelColumn: 'Controlling', internalField: 'controllingCosts', required: false },
  ],
};

/**
 * Map Excel row data to internal structure
 */
export function mapRowData(
  row: Record<string, unknown>,
  mappings: ColumnMapping[],
  department: Department
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    id: generateId(),
    department,
    importedAt: new Date(),
    sourceFile: '', // Will be set by importer
  };

  for (const mapping of mappings) {
    const excelValue = row[mapping.excelColumn];

    // Apply transformation if provided
    const value = mapping.transform
      ? mapping.transform(excelValue)
      : excelValue;

    mapped[mapping.internalField] = value;
  }

  return mapped;
}

/**
 * Generate unique ID for entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save column mapping to localStorage
 */
export function saveColumnMapping(mapping: DepartmentColumnMapping): void {
  const key = `columnMapping_${mapping.department}`;
  localStorage.setItem(key, JSON.stringify(mapping));
}

/**
 * Load column mapping from localStorage
 */
export function loadColumnMapping(department: Department): DepartmentColumnMapping | null {
  const key = `columnMapping_${department}`;
  const stored = localStorage.getItem(key);

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
    };
  } catch {
    return null;
  }
}

/**
 * Get column mapping (from storage or default)
 */
export function getColumnMapping(department: Department): ColumnMapping[] {
  const stored = loadColumnMapping(department);

  if (stored) {
    return stored.mappings;
  }

  return DEFAULT_MAPPINGS[department] ?? [];
}

/**
 * Auto-detect column mapping based on column names
 */
export function autoDetectMapping(
  excelColumns: string[],
  department: Department
): ColumnMapping[] {
  const defaultMappings = DEFAULT_MAPPINGS[department] ?? [];
  const detectedMappings: ColumnMapping[] = [];

  for (const defaultMapping of defaultMappings) {
    // Exact match
    if (excelColumns.includes(defaultMapping.excelColumn)) {
      detectedMappings.push(defaultMapping);
      continue;
    }

    // Fuzzy match (case-insensitive, trimmed)
    const fuzzyMatch = excelColumns.find(
      (col) => col.toLowerCase().trim() === defaultMapping.excelColumn.toLowerCase().trim()
    );

    if (fuzzyMatch) {
      detectedMappings.push({
        ...defaultMapping,
        excelColumn: fuzzyMatch, // Use actual Excel column name
      });
    }
  }

  return detectedMappings;
}

/**
 * Validate that required fields are mapped
 */
export function validateMapping(mappings: ColumnMapping[]): {
  valid: boolean;
  missingFields: string[];
} {
  const requiredMappings = mappings.filter((m) => m.required);
  const missingFields: string[] = [];

  for (const mapping of requiredMappings) {
    if (!mapping.excelColumn) {
      missingFields.push(mapping.internalField);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
