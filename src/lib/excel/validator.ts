/**
 * Data Validation Engine
 * Validates imported Excel data against business rules
 */

import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '@/types/common';

export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  message: string;
  severity: 'error' | 'warning';
  validate?: (value: unknown, row: Record<string, unknown>) => boolean;
}

export interface ValidatorOptions {
  rules: ValidationRule[];
  skipRows?: (row: Record<string, unknown>) => boolean;
}

/**
 * Validate a dataset against rules
 */
export function validateData(
  rows: Record<string, unknown>[],
  options: ValidatorOptions
): ValidationResult {
  const { rules, skipRows } = options;
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let rowsProcessed = 0;
  let rowsValid = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;

    // Check if row should be skipped
    if (skipRows && skipRows(row)) {
      continue;
    }

    rowsProcessed++;
    let rowValid = true;

    // Validate against each rule
    for (const rule of rules) {
      const value = row[rule.field];
      const isValid = validateField(value, row, rule);

      if (!isValid) {
        rowValid = false;

        if (rule.severity === 'error') {
          errors.push({
            row: rowIndex + 2, // +2 because Excel is 1-indexed and has header
            column: rule.field,
            value,
            message: rule.message,
            severity: 'error',
          });
        } else {
          warnings.push({
            row: rowIndex + 2,
            column: rule.field,
            value,
            message: rule.message,
            severity: 'warning',
          });
        }
      }
    }

    if (rowValid) {
      rowsValid++;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    rowsProcessed,
    rowsValid,
  };
}

/**
 * Validate a single field against a rule
 */
function validateField(
  value: unknown,
  row: Record<string, unknown>,
  rule: ValidationRule
): boolean {
  switch (rule.type) {
    case 'required':
      return value !== null && value !== undefined && value !== '';

    case 'type':
      return validateType(value, rule);

    case 'range':
      return validateRange(value, rule);

    case 'pattern':
      return validatePattern(value, rule);

    case 'custom':
      return rule.validate ? rule.validate(value, row) : true;

    default:
      return true;
  }
}

/**
 * Type validation
 */
function validateType(value: unknown, rule: ValidationRule): boolean {
  if (value === null || value === undefined || value === '') {
    return true; // Use 'required' rule to check for null/undefined
  }

  // Extract expected type from rule message or custom property
  const expectedType = (rule as { expectedType?: string }).expectedType || 'string';

  switch (expectedType) {
    case 'number':
      return !isNaN(Number(value));
    case 'date':
      return value instanceof Date || !isNaN(Date.parse(String(value)));
    case 'boolean':
      return typeof value === 'boolean' || value === 'true' || value === 'false';
    default:
      return true;
  }
}

/**
 * Range validation (for numbers)
 */
function validateRange(value: unknown, rule: ValidationRule): boolean {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  const num = Number(value);
  if (isNaN(num)) {
    return false;
  }

  const min = (rule as { min?: number }).min;
  const max = (rule as { max?: number }).max;

  if (min !== undefined && num < min) {
    return false;
  }

  if (max !== undefined && num > max) {
    return false;
  }

  return true;
}

/**
 * Pattern validation (regex)
 */
function validatePattern(value: unknown, rule: ValidationRule): boolean {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  const pattern = (rule as { pattern?: RegExp }).pattern;
  if (!pattern) {
    return true;
  }

  return pattern.test(String(value));
}

/**
 * Create validation rules for Sales data
 */
export function createSalesValidationRules(): ValidationRule[] {
  return [
    {
      field: 'ItemNo', // Will be mapped from actual column name
      type: 'required',
      message: 'Artikelnummer ist erforderlich',
      severity: 'error',
    },
    {
      field: 'QuantityRem1',
      type: 'custom',
      message: 'Zeile übersprungen (QuantityRem1 = 0)',
      severity: 'warning',
      validate: (value) => {
        // This is actually used in skipRows, not as error
        return true;
      },
    },
  ];
}

/**
 * Create validation rules for Production data
 */
export function createProductionValidationRules(): ValidationRule[] {
  return [
    {
      field: 'ItemNo',
      type: 'required',
      message: 'Artikelnummer ist erforderlich',
      severity: 'error',
    },
  ];
}

/**
 * Create validation rules for Project Management data
 */
export function createProjectValidationRules(): ValidationRule[] {
  return [
    {
      field: 'ProjectNo',
      type: 'required',
      message: 'Projektnummer ist erforderlich',
      severity: 'error',
    },
  ];
}

/**
 * Skip row function for Sales data
 * Returns true if row should be skipped
 */
export function shouldSkipSalesRow(row: Record<string, unknown>): boolean {
  // Check both the original Excel column name and the mapped field name
  const quantityRem1 = row['QuantityRem1'] ?? row['quantityRemaining'];

  // Skip ONLY if QuantityRem1 is exactly 0 (already delivered)
  // Do NOT skip if value is null/undefined (missing data should be imported)
  if (quantityRem1 === 0 || quantityRem1 === '0') {
    return true;
  }

  return false;
}
