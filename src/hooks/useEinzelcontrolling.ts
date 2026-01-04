/**
 * Hook for managing Einzelcontrolling projects and snapshots
 * Provides real-time updates for project data
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  EinzelcontrollingProject,
  EinzelcontrollingSnapshot,
  ECSnapshotComparison,
  ECChangeEntry,
} from '@/types/einzelcontrolling';
import {
  subscribeToProjects,
  subscribeToSnapshots,
  getSnapshotsByProjektnummer,
  deleteProject,
  deleteSnapshot,
} from '@/lib/firebase/einzelcontrollingRepository';

export interface UseEinzelcontrollingReturn {
  // Project state
  projects: EinzelcontrollingProject[];
  loading: boolean;
  error: string | null;

  // Selected project state
  selectedProject: EinzelcontrollingProject | null;
  snapshots: EinzelcontrollingSnapshot[];

  // Actions
  selectProject: (project: EinzelcontrollingProject | null) => void;
  deleteProject: (projectId: string) => Promise<void>;
  deleteSnapshot: (snapshotId: string) => Promise<void>;
  loadSnapshots: (projektnummer: string) => Promise<EinzelcontrollingSnapshot[]>;
  compareSnapshots: (
    snapshot1: EinzelcontrollingSnapshot,
    snapshot2: EinzelcontrollingSnapshot
  ) => ECSnapshotComparison;
}

export function useEinzelcontrolling(): UseEinzelcontrollingReturn {
  const [projects, setProjects] = useState<EinzelcontrollingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<EinzelcontrollingProject | null>(null);
  const [snapshots, setSnapshots] = useState<EinzelcontrollingSnapshot[]>([]);

  // Subscribe to projects
  useEffect(() => {
    const unsubscribe = subscribeToProjects(
      (updatedProjects) => {
        setProjects(updatedProjects);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to projects:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Subscribe to snapshots when project is selected
  useEffect(() => {
    if (!selectedProject) {
      setSnapshots([]);
      return;
    }

    const unsubscribe = subscribeToSnapshots(
      selectedProject.id,
      (updatedSnapshots) => {
        setSnapshots(updatedSnapshots);
      },
      (err) => {
        console.error('Error subscribing to snapshots:', err);
      }
    );

    return () => unsubscribe();
  }, [selectedProject]);

  // Select project
  const selectProject = useCallback((project: EinzelcontrollingProject | null) => {
    setSelectedProject(project);
  }, []);

  // Delete project
  const handleDeleteProject = useCallback(async (projectId: string): Promise<void> => {
    try {
      await deleteProject(projectId);
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  }, [selectedProject]);

  // Delete snapshot
  const handleDeleteSnapshot = useCallback(async (snapshotId: string): Promise<void> => {
    try {
      await deleteSnapshot(snapshotId);
    } catch (err) {
      console.error('Error deleting snapshot:', err);
      throw err;
    }
  }, []);

  // Load snapshots by projektnummer
  const loadSnapshots = useCallback(
    async (projektnummer: string): Promise<EinzelcontrollingSnapshot[]> => {
      try {
        return await getSnapshotsByProjektnummer(projektnummer);
      } catch (err) {
        console.error('Error loading snapshots:', err);
        throw err;
      }
    },
    []
  );

  // Compare two snapshots
  const compareSnapshots = useCallback(
    (
      snapshot1: EinzelcontrollingSnapshot,
      snapshot2: EinzelcontrollingSnapshot
    ): ECSnapshotComparison => {
      const changes: ECChangeEntry[] = [];

      // Helper to add change entry
      const addChange = (
        field: string,
        label: string,
        fromValue: number,
        toValue: number
      ) => {
        if (fromValue !== toValue) {
          changes.push({
            field,
            label,
            fromValue,
            toValue,
            changeAbsolut: toValue - fromValue,
            changeProzent: fromValue !== 0 ? ((toValue - fromValue) / fromValue) * 100 : 0,
          });
        }
      };

      // Compare Übersicht
      addChange(
        'uebersicht.auftragsvolumen',
        'Auftragsvolumen',
        snapshot1.uebersicht.auftragsvolumen,
        snapshot2.uebersicht.auftragsvolumen
      );
      addChange(
        'uebersicht.gesamtkosten',
        'Gesamtkosten',
        snapshot1.uebersicht.gesamtkosten,
        snapshot2.uebersicht.gesamtkosten
      );
      addChange(
        'uebersicht.deckungsbeitrag',
        'Deckungsbeitrag',
        snapshot1.uebersicht.deckungsbeitrag,
        snapshot2.uebersicht.deckungsbeitrag
      );

      // Compare KPIs
      addChange(
        'kpis.planKosten',
        'Plankosten',
        snapshot1.kpis.planKosten,
        snapshot2.kpis.planKosten
      );
      addChange(
        'kpis.istKosten',
        'Ist-Kosten',
        snapshot1.kpis.istKosten,
        snapshot2.kpis.istKosten
      );
      addChange(
        'kpis.fertigstellungsgradProzent',
        'Fertigstellungsgrad',
        snapshot1.kpis.fertigstellungsgradProzent,
        snapshot2.kpis.fertigstellungsgradProzent
      );

      // Compare sections
      addChange(
        'produktion.gesamt',
        'Produktion Gesamt',
        snapshot1.produktion.gesamt,
        snapshot2.produktion.gesamt
      );
      addChange(
        'einkauf.gesamt',
        'Einkauf Gesamt',
        snapshot1.einkauf.gesamt,
        snapshot2.einkauf.gesamt
      );
      addChange(
        'pmKonstruktion.gesamt',
        'PM/Konstruktion Gesamt',
        snapshot1.pmKonstruktion.gesamt,
        snapshot2.pmKonstruktion.gesamt
      );

      return {
        fromSnapshot: snapshot1.kalenderwoche,
        toSnapshot: snapshot2.kalenderwoche,
        changes,
      };
    },
    []
  );

  return {
    projects,
    loading,
    error,
    selectedProject,
    snapshots,
    selectProject,
    deleteProject: handleDeleteProject,
    deleteSnapshot: handleDeleteSnapshot,
    loadSnapshots,
    compareSnapshots,
  };
}
