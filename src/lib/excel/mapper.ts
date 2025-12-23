/**
 * Column Mapping System
 * Maps Excel columns to our internal data structure
 */

import type { Department } from '@/types/common';

/**
 * Parse date string from Excel (handles multiple formats)
 * Supports: DD.MM.YYYY, MM/DD/YYYY, M/D/YYYY, and Date objects
 */
function parseExcelDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    // Filter out placeholder dates
    if (value.getFullYear() === 1900 && value.getMonth() === 0 && value.getDate() === 1) {
      return null;
    }
    return value;
  }

  const str = String(value).trim();
  if (!str) return null;

  let date: Date | null = null;

  // Try DD.MM.YYYY format (German)
  const germanMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (germanMatch) {
    const [, day, month, year] = germanMatch;
    date = new Date(Number(year), Number(month) - 1, Number(day));
  }

  // Try MM/DD/YYYY or M/D/YYYY format (American)
  const americanMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (americanMatch && !date) {
    const [, first, second, yearStr] = americanMatch;

    // Handle 2-digit or 4-digit year
    let year = Number(yearStr);
    if (year < 100) {
      // Assume 20xx for years 00-99
      year += 2000;
    }

    // Try as MM/DD/YYYY first
    const month = Number(first);
    const day = Number(second);

    // Basic validation: month should be 1-12, day should be 1-31
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      date = new Date(year, month - 1, day);
    }
  }

  // Validate the date
  if (!date || isNaN(date.getTime())) return null;

  // Filter out placeholder dates
  if (date.getFullYear() === 1900 && date.getMonth() === 0 && date.getDate() === 1) {
    return null; // "01.01.1900" is a placeholder
  }

  return date;
}

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
    { excelColumn: 'PNR', internalField: 'projektnummer', required: false }, // Spalte C

    // Order info
    { excelColumn: 'OrderNumber', internalField: 'deliveryNumber', required: false },
    { excelColumn: 'BookingDate', internalField: 'bookingDate', required: false, transform: parseExcelDate },
    { excelColumn: 'Buchungsdatum', internalField: 'bookingDate', required: false, transform: parseExcelDate }, // German alternative

    // Customer
    { excelColumn: 'CustomerNumber', internalField: 'customerNumber', required: false },
    { excelColumn: 'Matchcode', internalField: 'customerName', required: false },
    { excelColumn: 'Country', internalField: 'country', required: false },

    // Product
    { excelColumn: 'ProductGroup', internalField: 'productGroup', required: false },
    { excelColumn: 'ProductName', internalField: 'productDescription', required: false },

    // Quantities & Delivery
    { excelColumn: 'Quantity', internalField: 'quantity', required: false },
    { excelColumn: 'QuantityRem1', internalField: 'quantityRemaining', required: true }, // Important for filtering!
    { excelColumn: 'Unit', internalField: 'unit', required: false },
    { excelColumn: 'DeliveryDate', internalField: 'deliveryDate', required: false, transform: parseExcelDate },
    { excelColumn: 'Wunsch_Liefertermin', internalField: 'requestedDeliveryDate', required: false, transform: parseExcelDate },
    { excelColumn: 'erster_Bestaetigter_Liefertermin', internalField: 'confirmedDeliveryDate', required: false, transform: parseExcelDate },

    // Financial
    { excelColumn: 'Turnover', internalField: 'totalPrice', required: false },
    { excelColumn: 'TurnoverRem1', internalField: 'remainingTurnover', required: false },
    { excelColumn: 'offener Umsatz', internalField: 'openTurnover', required: false }, // Spalte AJ

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

    // Only set value if it's non-null, or if the field hasn't been set yet
    // This allows multiple Excel columns to map to the same internal field (e.g., BookingDate and Buchungsdatum)
    if (value !== null && value !== undefined) {
      mapped[mapping.internalField] = value;
    } else if (!(mapping.internalField in mapped)) {
      mapped[mapping.internalField] = value;
    }
  }

  // Generate stable ID based on mapped data
  mapped.id = generateStableId(mapped, department);

  return mapped;
}

/**
 * Generate stable ID based on data fields
 * Uses a combination of stable fields to create reproducible IDs
 */
function generateStableId(data: Record<string, unknown>, department: Department): string {
  let keyParts: string[] = [];

  switch (department) {
    case 'sales':
      // Use OrderNumber + ProductNumber + Quantity for unique identification
      keyParts = [
        String(data.deliveryNumber || ''),
        String(data.artikelnummer || ''),
        String(data.projektnummer || ''),
        String(data.quantity || ''),
      ];
      break;
    case 'production':
      // Use work order number + product number
      keyParts = [
        String(data.workOrderNumber || ''),
        String(data.artikelnummer || ''),
        String(data.operationNumber || ''),
      ];
      break;
    case 'projectManagement':
      // Use project number + article number
      keyParts = [
        String(data.projektnummer || ''),
        String(data.artikelnummer || ''),
      ];
      break;
  }

  // Create a hash from the key parts
  const keyString = keyParts.filter(p => p).join('-');

  if (keyString) {
    // Simple hash function for stable IDs
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `${department}-${Math.abs(hash).toString(36)}`;
  }

  // Fallback to random ID if no key fields available
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
 * Always applies transform functions from DEFAULT_MAPPINGS
 */
export function getColumnMapping(department: Department): ColumnMapping[] {
  const stored = loadColumnMapping(department);
  const defaultMappings = DEFAULT_MAPPINGS[department] ?? [];

  if (stored) {
    // Merge stored mappings with transform functions from defaults
    return stored.mappings.map((mapping) => {
      // Find matching default mapping to get transform function
      const defaultMapping = defaultMappings.find(
        (dm) => dm.internalField === mapping.internalField
      );
      return {
        ...mapping,
        transform: defaultMapping?.transform,
      };
    });
  }

  return defaultMappings;
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
