/**
 * Sales Data Hook
 * Fetches and manages sales data from IndexedDB
 */

import { useState, useEffect, useCallback } from 'react';
import { salesRepository } from '@/lib/db/repositories/salesRepository';
import type { SalesEntry } from '@/types/sales';

export interface UseSalesDataReturn {
  data: SalesEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Deserialize dates in sales entry
 * IndexedDB stores dates as ISO strings, we need to convert them back
 */
function deserializeSalesEntry(entry: SalesEntry): SalesEntry {
  return {
    ...entry,
    bookingDate: entry.bookingDate ? new Date(entry.bookingDate) : undefined,
    deliveryDate: entry.deliveryDate ? new Date(entry.deliveryDate) : undefined,
    requestedDeliveryDate: entry.requestedDeliveryDate ? new Date(entry.requestedDeliveryDate) : undefined,
    confirmedDeliveryDate: entry.confirmedDeliveryDate ? new Date(entry.confirmedDeliveryDate) : undefined,
    importedAt: entry.importedAt ? new Date(entry.importedAt) : undefined,
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
    comments: entry.comments?.map(comment => ({
      ...comment,
      createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date(),
    })),
  };
}

export function useSalesData(): UseSalesDataReturn {
  const [data, setData] = useState<SalesEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const entries = await salesRepository.getAll();
      // Deserialize dates
      const deserializedEntries = entries.map(deserializeSalesEntry);
      setData(deserializedEntries);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Fehler beim Laden der Daten';
      setError(errorMessage);
      console.error('Error fetching sales data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}
