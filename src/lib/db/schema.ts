/**
 * IndexedDB Schema Definition
 * Defines database structure with stores and indexes
 */

import {
  DB_NAME,
  DB_VERSION,
  STORE_NAMES,
  INDEX_NAMES,
  type StoreSchema,
} from '@/types/database';

// Complete database schema
export const DATABASE_SCHEMA: StoreSchema[] = [
  {
    name: STORE_NAMES.SALES,
    keyPath: 'id',
    indexes: [
      {
        name: INDEX_NAMES.ARTIKELNUMMER,
        keyPath: 'artikelnummer',
        unique: false,
      },
      {
        name: INDEX_NAMES.PROJEKTNUMMER,
        keyPath: 'projektnummer',
        unique: false,
      },
      {
        name: INDEX_NAMES.IMPORTED_AT,
        keyPath: 'importedAt',
        unique: false,
      },
      {
        name: INDEX_NAMES.STATUS,
        keyPath: 'status',
        unique: false,
      },
    ],
  },
  {
    name: STORE_NAMES.PRODUCTION,
    keyPath: 'id',
    indexes: [
      {
        name: INDEX_NAMES.ARTIKELNUMMER,
        keyPath: 'artikelnummer',
        unique: false,
      },
      {
        name: INDEX_NAMES.PROJEKTNUMMER,
        keyPath: 'projektnummer',
        unique: false,
      },
      {
        name: INDEX_NAMES.IMPORTED_AT,
        keyPath: 'importedAt',
        unique: false,
      },
      {
        name: INDEX_NAMES.STATUS,
        keyPath: 'status',
        unique: false,
      },
    ],
  },
  {
    name: STORE_NAMES.PROJECT_MANAGEMENT,
    keyPath: 'id',
    indexes: [
      {
        name: INDEX_NAMES.ARTIKELNUMMER,
        keyPath: 'artikelnummer',
        unique: false,
      },
      {
        name: INDEX_NAMES.PROJEKTNUMMER,
        keyPath: 'projektnummer',
        unique: false,
      },
      {
        name: INDEX_NAMES.IMPORTED_AT,
        keyPath: 'importedAt',
        unique: false,
      },
      {
        name: 'projectStatus',
        keyPath: 'projectStatus',
        unique: false,
      },
    ],
  },
  {
    name: STORE_NAMES.MATCHES,
    keyPath: 'id',
    indexes: [
      {
        name: INDEX_NAMES.ARTIKELNUMMER,
        keyPath: 'artikelnummer',
        unique: false,
      },
      {
        name: INDEX_NAMES.PROJEKTNUMMER,
        keyPath: 'projektnummer',
        unique: false,
      },
      {
        name: 'createdAt',
        keyPath: 'createdAt',
        unique: false,
      },
    ],
  },
  {
    name: STORE_NAMES.METADATA,
    keyPath: 'key',
    indexes: [
      {
        name: 'updatedAt',
        keyPath: 'updatedAt',
        unique: false,
      },
    ],
  },
];

export { DB_NAME, DB_VERSION };
