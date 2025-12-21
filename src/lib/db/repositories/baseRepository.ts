/**
 * Base Repository with common CRUD operations
 * All specific repositories extend this
 */

import { getDatabase } from '../index';
import type {
  StoreName,
  StoreDataType,
  QueryOptions,
  TransactionMode,
} from '@/types/database';

export class BaseRepository<T extends StoreName> {
  constructor(protected readonly storeName: T) {}

  /**
   * Get a single item by ID
   */
  async getById(id: string): Promise<StoreDataType<T> | undefined> {
    const db = await getDatabase();
    return await db.get(this.storeName, id);
  }

  /**
   * Get all items from the store
   */
  async getAll(): Promise<StoreDataType<T>[]> {
    const db = await getDatabase();
    return await db.getAll(this.storeName);
  }

  /**
   * Get items with query options
   */
  async query(options: QueryOptions = {}): Promise<StoreDataType<T>[]> {
    const db = await getDatabase();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);

    let source: IDBObjectStore | IDBIndex = store;
    if (options.index) {
      source = store.index(options.index);
    }

    const items: StoreDataType<T>[] = [];
    let cursor = await source.openCursor(options.range, options.direction);
    let skipped = 0;
    let count = 0;

    while (cursor) {
      // Handle offset
      if (options.offset && skipped < options.offset) {
        skipped++;
        cursor = await cursor.continue();
        continue;
      }

      // Handle limit
      if (options.limit && count >= options.limit) {
        break;
      }

      items.push(cursor.value as StoreDataType<T>);
      count++;
      cursor = await cursor.continue();
    }

    await tx.done;
    return items;
  }

  /**
   * Count items in the store
   */
  async count(indexName?: string, range?: IDBKeyRange): Promise<number> {
    const db = await getDatabase();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);

    if (indexName) {
      const index = store.index(indexName);
      return await index.count(range);
    }

    return await store.count(range);
  }

  /**
   * Add a new item
   */
  async add(item: StoreDataType<T>): Promise<string> {
    const db = await getDatabase();
    const id = await db.add(this.storeName, item as never);
    return id as string;
  }

  /**
   * Add multiple items in a single transaction
   */
  async addMany(items: StoreDataType<T>[]): Promise<void> {
    const db = await getDatabase();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);

    await Promise.all(items.map((item) => store.add(item as never)));
    await tx.done;
  }

  /**
   * Update an existing item
   */
  async update(item: StoreDataType<T>): Promise<void> {
    const db = await getDatabase();
    await db.put(this.storeName, item as never);
  }

  /**
   * Update multiple items in a single transaction
   */
  async updateMany(items: StoreDataType<T>[]): Promise<void> {
    const db = await getDatabase();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);

    await Promise.all(items.map((item) => store.put(item as never)));
    await tx.done;
  }

  /**
   * Delete an item by ID
   */
  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete(this.storeName, id);
  }

  /**
   * Delete multiple items by IDs
   */
  async deleteMany(ids: string[]): Promise<void> {
    const db = await getDatabase();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);

    await Promise.all(ids.map((id) => store.delete(id)));
    await tx.done;
  }

  /**
   * Clear all items from the store
   */
  async clear(): Promise<void> {
    const db = await getDatabase();
    const tx = db.transaction(this.storeName, 'readwrite');
    await tx.objectStore(this.storeName).clear();
    await tx.done;
  }

  /**
   * Find items by index value
   */
  async findByIndex(
    indexName: string,
    value: string | number | Date
  ): Promise<StoreDataType<T>[]> {
    const db = await getDatabase();
    const tx = db.transaction(this.storeName, 'readonly');
    const index = tx.objectStore(this.storeName).index(indexName);
    return await index.getAll(value as never);
  }

  /**
   * Execute a custom transaction
   */
  async transaction<R>(
    mode: TransactionMode,
    callback: (store: IDBObjectStore) => Promise<R>
  ): Promise<R> {
    const db = await getDatabase();
    const tx = db.transaction(this.storeName, mode);
    const store = tx.objectStore(this.storeName);
    const result = await callback(store);
    await tx.done;
    return result;
  }
}
