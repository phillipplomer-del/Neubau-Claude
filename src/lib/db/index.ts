/**
 * IndexedDB Connection and Setup
 * Uses the 'idb' library for a cleaner Promise-based API
 */

import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, DATABASE_SCHEMA } from './schema';
import type { StoreName } from '@/types/database';

// Database instance (singleton)
let dbInstance: IDBPDatabase | null = null;

/**
 * Initialize and open the database
 */
export async function initDatabase(): Promise<IDBPDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(
          `Upgrading database from version ${oldVersion} to ${newVersion}`
        );

        // Create all stores and indexes
        DATABASE_SCHEMA.forEach((storeSchema) => {
          // Create store if it doesn't exist
          let store;
          if (!db.objectStoreNames.contains(storeSchema.name)) {
            store = db.createObjectStore(storeSchema.name, {
              keyPath: storeSchema.keyPath,
              autoIncrement: storeSchema.autoIncrement,
            });
            console.log(`Created object store: ${storeSchema.name}`);
          } else {
            store = transaction.objectStore(storeSchema.name);
          }

          // Create indexes
          storeSchema.indexes.forEach((indexSchema) => {
            if (!store.indexNames.contains(indexSchema.name)) {
              store.createIndex(indexSchema.name, indexSchema.keyPath, {
                unique: indexSchema.unique,
                multiEntry: indexSchema.multiEntry,
              });
              console.log(
                `Created index: ${indexSchema.name} on ${storeSchema.name}`
              );
            }
          });
        });
      },
      blocked() {
        console.warn(
          'Database upgrade blocked - please close other tabs with this app'
        );
      },
      blocking() {
        console.warn('This database connection is blocking a version upgrade');
      },
      terminated() {
        console.error('Database connection was unexpectedly terminated');
        dbInstance = null;
      },
    });

    console.log('Database initialized successfully');
    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(
      `Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get the database instance (initializes if needed)
 */
export async function getDatabase(): Promise<IDBPDatabase> {
  if (!dbInstance) {
    return await initDatabase();
  }
  return dbInstance;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('Database connection closed');
  }
}

/**
 * Delete the entire database (use with caution!)
 */
export async function deleteDatabase(): Promise<void> {
  await closeDatabase();

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      console.log('Database deleted successfully');
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to delete database:', request.error);
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn('Database deletion blocked - close all tabs using this database');
    };
  });
}

/**
 * Clear all data from a specific store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).clear();
  await tx.done;
  console.log(`Cleared all data from store: ${storeName}`);
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const db = await getDatabase();
  const stats: Record<string, number> = {};

  for (const storeName of DATABASE_SCHEMA.map((s) => s.name)) {
    const count = await db.count(storeName as StoreName);
    stats[storeName] = count;
  }

  return stats;
}
