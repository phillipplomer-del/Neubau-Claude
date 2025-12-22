/**
 * Hook for managing comment statuses from Firebase for all entries
 * Provides cached maps for lookup by entryId and projektnummer
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { CommentStatus } from '@/types/sales';
import type { SalesCommentDocument } from '@/types/firebase';

export interface UseCommentStatusesReturn {
  statusMap: Map<string, CommentStatus>;
  projektnummerStatusMap: Map<string, CommentStatus>;
  getStatusForEntry: (entryId: string, projektnummer?: string) => CommentStatus | undefined;
  loading: boolean;
  error: string | null;
}

export function useCommentStatuses(): UseCommentStatusesReturn {
  const [statusMap, setStatusMap] = useState<Map<string, CommentStatus>>(new Map());
  const [projektnummerStatusMap, setProjektnummerStatusMap] = useState<Map<string, CommentStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Subscribe to all salesComments documents
      const unsubscribe = onSnapshot(
        collection(db, 'salesComments'),
        (snapshot) => {
          const newEntryIdMap = new Map<string, CommentStatus>();
          const newProjektnummerMap = new Map<string, CommentStatus>();

          snapshot.forEach((doc) => {
            const data = doc.data() as SalesCommentDocument;

            // Map by entryId
            newEntryIdMap.set(data.entryId, data.commentStatus);

            // Also map by projektnummer if available (for fallback lookup)
            if (data.projektnummer) {
              // Only set if not already set with a higher priority status
              const existing = newProjektnummerMap.get(data.projektnummer);
              if (!existing || getStatusPriority(data.commentStatus) > getStatusPriority(existing)) {
                newProjektnummerMap.set(data.projektnummer, data.commentStatus);
              }
            }
          });

          setStatusMap(newEntryIdMap);
          setProjektnummerStatusMap(newProjektnummerMap);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching comment statuses:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up status listener:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, []);

  // Helper to get status priority (higher = more important)
  const getStatusPriority = (status: CommentStatus): number => {
    switch (status) {
      case 'critical': return 3;
      case 'at-risk': return 2;
      case 'watched': return 1;
      case 'none': return 0;
      default: return 0;
    }
  };

  // Combined lookup function: first try entryId, then fallback to projektnummer
  const getStatusForEntry = useCallback((entryId: string, projektnummer?: string): CommentStatus | undefined => {
    // First try exact entryId match
    const byEntryId = statusMap.get(entryId);
    if (byEntryId) return byEntryId;

    // Fallback: try projektnummer
    if (projektnummer) {
      return projektnummerStatusMap.get(projektnummer);
    }

    return undefined;
  }, [statusMap, projektnummerStatusMap]);

  return {
    statusMap,
    projektnummerStatusMap,
    getStatusForEntry,
    loading,
    error,
  };
}
