/**
 * IndexedDB related types
 */

import { SalesEntry } from './sales';
import { ProductionEntry } from './production';
import { ProjectManagementEntry } from './projectManagement';
import { Match } from './common';

// Database schema version
export const DB_VERSION = 3;
export const DB_NAME = 'PPSDatabase';

// Store names
export const STORE_NAMES = {
  SALES: 'sales',
  PRODUCTION: 'production',
  PROJECT_MANAGEMENT: 'projectManagement',
  MATCHES: 'matches',
  METADATA: 'metadata',
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

// Index names
export const INDEX_NAMES = {
  ARTIKELNUMMER: 'artikelnummer',
  PROJEKTNUMMER: 'projektnummer',
  IMPORTED_AT: 'importedAt',
  STATUS: 'status',
} as const;

// Store data types
export type StoreDataType<T extends StoreName> = T extends 'sales'
  ? SalesEntry
  : T extends 'production'
  ? ProductionEntry
  : T extends 'projectManagement'
  ? ProjectManagementEntry
  : T extends 'matches'
  ? Match
  : T extends 'metadata'
  ? MetadataEntry
  : never;

// Metadata for tracking imports and app state
export interface MetadataEntry {
  key: string;
  value: unknown;
  updatedAt: Date;
}

// Database schema definition
export interface StoreSchema {
  name: StoreName;
  keyPath: string;
  autoIncrement?: boolean;
  indexes: IndexSchema[];
}

export interface IndexSchema {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry?: boolean;
}

// Query types
export interface QueryOptions {
  index?: string;
  range?: IDBKeyRange;
  direction?: IDBCursorDirection;
  limit?: number;
  offset?: number;
}

export interface CountOptions {
  index?: string;
  range?: IDBKeyRange;
}

// Transaction types
export type TransactionMode = 'readonly' | 'readwrite';
