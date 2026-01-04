/**
 * Hook for Home page KPIs
 * Aggregates data from Sales (IndexedDB), Controlling (IndexedDB) and Firebase
 */

import { useState, useEffect } from 'react';
import { salesRepository } from '@/lib/db/repositories/salesRepository';
import { projectRepository } from '@/lib/db/repositories/projectRepository';
import { getAllWatchedProjects } from '@/lib/firebase/projectWatchRepository';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { SalesEntry } from '@/types/sales';
import type { ProjectManagementEntry } from '@/types/projectManagement';

export interface HomeKPIs {
  offenerUmsatz: number;
  anzahlProjekte: number;
  kritischeProjekte: number;
  beobachteteProjekte: number;
  loading: boolean;
  error: string | null;
}

export function useHomeKPIs(): HomeKPIs {
  const [kpis, setKpis] = useState<HomeKPIs>({
    offenerUmsatz: 0,
    anzahlProjekte: 0,
    kritischeProjekte: 0,
    beobachteteProjekte: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const loadKPIs = async () => {
      try {
        // Load sales data from IndexedDB
        const salesEntries = await salesRepository.getAll() as SalesEntry[];

        // Calculate offener Umsatz (sum of openTurnover or remainingTurnover)
        let offenerUmsatz = 0;
        salesEntries.forEach((entry) => {
          offenerUmsatz += entry.openTurnover || entry.remainingTurnover || 0;
        });

        // Load project data from IndexedDB
        const projectEntries = await projectRepository.getAll() as ProjectManagementEntry[];
        const anzahlProjekte = projectEntries.filter(p => p.projektnummer).length;

        // Load watched projects from Firebase
        const watchedProjects = await getAllWatchedProjects();
        const beobachteteProjekte = watchedProjects.length;

        // Load critical entries from Firebase salesComments
        let kritischeProjekte = 0;
        try {
          const commentsSnapshot = await getDocs(collection(db, 'salesComments'));
          commentsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.commentStatus === 'critical') {
              kritischeProjekte++;
            }
          });
        } catch (firebaseErr) {
          console.warn('Could not load salesComments from Firebase:', firebaseErr);
        }

        setKpis({
          offenerUmsatz,
          anzahlProjekte,
          kritischeProjekte,
          beobachteteProjekte,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Error loading Home KPIs:', err);
        setKpis((prev) => ({
          ...prev,
          loading: false,
          error: 'Fehler beim Laden der KPIs',
        }));
      }
    };

    loadKPIs();
  }, []);

  return kpis;
}
