/**
 * Hook for managing comment statuses from Firebase for all entries
 * Provides a cached map of entryId -> commentStatus
 */

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { CommentStatus } from '@/types/sales';
import type { SalesCommentDocument } from '@/types/firebase';

export interface UseCommentStatusesReturn {
  statusMap: Map<string, CommentStatus>;
  loading: boolean;
  error: string | null;
}

export function useCommentStatuses(): UseCommentStatusesReturn {
  const [statusMap, setStatusMap] = useState<Map<string, CommentStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Subscribe to all salesComments documents
      const unsubscribe = onSnapshot(
        collection(db, 'salesComments'),
        (snapshot) => {
          const newMap = new Map<string, CommentStatus>();

          snapshot.forEach((doc) => {
            const data = doc.data() as SalesCommentDocument;
            newMap.set(data.entryId, data.commentStatus);
          });

          setStatusMap(newMap);
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

  return {
    statusMap,
    loading,
    error,
  };
}
