/**
 * Common types shared across all departments
 */

// Core identifier types used for matching
export type Artikelnummer = string;
export type Projektnummer = string;

// Department types
export type Department = 'sales' | 'production' | 'projectManagement';

// Base entry that all department data extends
export interface BaseEntry {
  id: string; // UUID generated on import
  artikelnummer?: Artikelnummer;
  projektnummer?: Projektnummer;
  importedAt: Date;
  sourceFile: string;
  department: Department;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  rowsProcessed: number;
  rowsValid: number;
}

export interface ValidationError {
  row: number;
  column: string;
  value: unknown;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  row: number;
  column: string;
  value: unknown;
  message: string;
  severity: 'warning';
}

// Import types
export interface ImportProgress {
  stage: 'parsing' | 'validating' | 'storing' | 'matching' | 'complete';
  processed: number;
  total: number;
  percentage: number;
  message: string;
}

export interface ImportResult {
  success: boolean;
  department: Department;
  fileName: string;
  rowsImported: number;
  validation: ValidationResult;
  importedAt: Date;
  duration: number; // milliseconds
}

// Match types
export interface Match {
  id: string;
  artikelnummer?: Artikelnummer;
  projektnummer?: Projektnummer;
  entries: MatchedEntry[];
  createdAt: Date;
}

export interface MatchedEntry {
  id: string;
  department: Department;
  entry: BaseEntry;
}

// Filter and sort types
export interface FilterOptions {
  artikelnummer?: string;
  projektnummer?: string;
  department?: Department;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  field: string;
  direction: SortDirection;
}

// Pagination types
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
