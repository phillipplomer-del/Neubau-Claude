/**
 * Hook for managing watched projects from Firebase
 * Provides a set of watched projektnummer values
 */

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface UseWatchedProjectsReturn {
  watchedProjects: Set<string>;
  loading: boolean;
  error: string | null;
}

export function useWatchedProjects(): UseWatchedProjectsReturn {
  const [watchedProjects, setWatchedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Subscribe to all watched projects
      const unsubscribe = onSnapshot(
        collection(db, 'watchedProjects'),
        (snapshot) => {
          const projectNumbers = new Set<string>();

          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.projektnummer) {
              projectNumbers.add(data.projektnummer);
            }
          });

          setWatchedProjects(projectNumbers);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching watched projects:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up watched projects listener:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, []);

  return {
    watchedProjects,
    loading,
    error,
  };
}
