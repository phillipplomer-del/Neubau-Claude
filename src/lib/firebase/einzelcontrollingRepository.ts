/**
 * Firestore Einzelcontrolling Repository
 * Handles CRUD operations for Einzelcontrolling projects and snapshots
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import type {
  EinzelcontrollingProject,
  EinzelcontrollingSnapshot,
  CreateSnapshotInput,
} from '@/types/einzelcontrolling';

// Collection names
const PROJECTS_COLLECTION = 'ecProjects';
const SNAPSHOTS_COLLECTION = 'ecSnapshots';

// ============================================
// PROJECT OPERATIONS
// ============================================

/**
 * Get or create a project by projektnummer
 */
export async function getOrCreateProject(
  projektnummer: string,
  projektname?: string,
  kundenname?: string
): Promise<EinzelcontrollingProject> {
  // Check if project exists
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where('projektnummer', '==', projektnummer)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return snapshot.docs[0].data() as EinzelcontrollingProject;
  }

  // Create new project
  const projectRef = doc(collection(db, PROJECTS_COLLECTION));
  const newProject: EinzelcontrollingProject = {
    id: projectRef.id,
    projektnummer,
    snapshots: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Only add optional fields if they have values (Firestore doesn't allow undefined)
  if (projektname) newProject.projektname = projektname;
  if (kundenname) newProject.kundenname = kundenname;

  await setDoc(projectRef, newProject);
  return newProject;
}

/**
 * Get a project by ID
 */
export async function getProject(projectId: string): Promise<EinzelcontrollingProject | null> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as EinzelcontrollingProject) : null;
}

/**
 * Get all projects
 */
export async function getProjects(): Promise<EinzelcontrollingProject[]> {
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    orderBy('updatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as EinzelcontrollingProject);
}

/**
 * Delete a project and all its snapshots
 */
export async function deleteProject(projectId: string): Promise<void> {
  const batch = writeBatch(db);

  // Delete all snapshots
  const snapshotsQuery = query(
    collection(db, SNAPSHOTS_COLLECTION),
    where('projektId', '==', projectId)
  );
  const snapshotsSnapshot = await getDocs(snapshotsQuery);
  snapshotsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete project
  batch.delete(doc(db, PROJECTS_COLLECTION, projectId));

  await batch.commit();
}

/**
 * Subscribe to projects (real-time updates)
 */
export function subscribeToProjects(
  callback: (projects: EinzelcontrollingProject[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, PROJECTS_COLLECTION));

  return onSnapshot(
    q,
    (snapshot) => {
      const projects = snapshot.docs
        .map((doc) => doc.data() as EinzelcontrollingProject)
        .sort((a, b) => {
          const timeA = a.updatedAt?.toMillis?.() || 0;
          const timeB = b.updatedAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      callback(projects);
    },
    (error) => {
      console.error('Einzelcontrolling subscription error:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

// ============================================
// SNAPSHOT OPERATIONS
// ============================================

/**
 * Create a new snapshot
 */
export async function createSnapshot(input: CreateSnapshotInput): Promise<string> {
  // Get or create the project
  const project = await getOrCreateProject(input.projektnummer);

  // Check if snapshot for this KW already exists
  const existingQuery = query(
    collection(db, SNAPSHOTS_COLLECTION),
    where('projektId', '==', project.id),
    where('kalenderwoche', '==', input.kalenderwoche)
  );
  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    // Update existing snapshot
    const existingDoc = existingSnapshot.docs[0];
    await updateDoc(existingDoc.ref, {
      ...input.data,
      importedAt: Timestamp.now(),
      importedBy: input.importedBy,
    });
    return existingDoc.id;
  }

  // Create new snapshot
  const snapshotRef = doc(collection(db, SNAPSHOTS_COLLECTION));
  const newSnapshot: EinzelcontrollingSnapshot = {
    id: snapshotRef.id,
    projektId: project.id,
    projektnummer: input.projektnummer,
    kalenderwoche: input.kalenderwoche,
    importedAt: Timestamp.now(),
    importedBy: input.importedBy,
    ...input.data,
  };

  const batch = writeBatch(db);
  batch.set(snapshotRef, newSnapshot);

  // Update project with latest snapshot
  const projectRef = doc(db, PROJECTS_COLLECTION, project.id);
  batch.update(projectRef, {
    latestSnapshot: newSnapshot,
    updatedAt: Timestamp.now(),
  });

  await batch.commit();
  return snapshotRef.id;
}

/**
 * Get a snapshot by ID
 */
export async function getSnapshot(snapshotId: string): Promise<EinzelcontrollingSnapshot | null> {
  const docRef = doc(db, SNAPSHOTS_COLLECTION, snapshotId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as EinzelcontrollingSnapshot) : null;
}

/**
 * Get all snapshots for a project
 */
export async function getSnapshotsByProject(projektId: string): Promise<EinzelcontrollingSnapshot[]> {
  const q = query(
    collection(db, SNAPSHOTS_COLLECTION),
    where('projektId', '==', projektId)
  );
  const snapshot = await getDocs(q);
  // Sort in memory by kalenderwoche
  return snapshot.docs
    .map((doc) => doc.data() as EinzelcontrollingSnapshot)
    .sort((a, b) => {
      // Parse KW format "KW01/2025" for sorting
      const parseKW = (kw: string) => {
        const match = kw.match(/KW(\d+)\/(\d+)/);
        if (match) {
          return parseInt(match[2]) * 100 + parseInt(match[1]);
        }
        return 0;
      };
      return parseKW(b.kalenderwoche) - parseKW(a.kalenderwoche);
    });
}

/**
 * Get all snapshots for a projektnummer
 */
export async function getSnapshotsByProjektnummer(
  projektnummer: string
): Promise<EinzelcontrollingSnapshot[]> {
  const q = query(
    collection(db, SNAPSHOTS_COLLECTION),
    where('projektnummer', '==', projektnummer)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((doc) => doc.data() as EinzelcontrollingSnapshot)
    .sort((a, b) => {
      const parseKW = (kw: string) => {
        const match = kw.match(/KW(\d+)\/(\d+)/);
        if (match) {
          return parseInt(match[2]) * 100 + parseInt(match[1]);
        }
        return 0;
      };
      return parseKW(b.kalenderwoche) - parseKW(a.kalenderwoche);
    });
}

/**
 * Delete a snapshot
 */
export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const snapshotRef = doc(db, SNAPSHOTS_COLLECTION, snapshotId);
  const snapshotSnap = await getDoc(snapshotRef);

  if (!snapshotSnap.exists()) return;

  const snapshot = snapshotSnap.data() as EinzelcontrollingSnapshot;
  const batch = writeBatch(db);

  batch.delete(snapshotRef);

  // Update project's latest snapshot if needed
  const projectRef = doc(db, PROJECTS_COLLECTION, snapshot.projektId);
  const projectSnap = await getDoc(projectRef);

  if (projectSnap.exists()) {
    const project = projectSnap.data() as EinzelcontrollingProject;
    if (project.latestSnapshot?.id === snapshotId) {
      // Find the next latest snapshot
      const remainingSnapshots = await getSnapshotsByProject(snapshot.projektId);
      const filtered = remainingSnapshots.filter((s) => s.id !== snapshotId);

      batch.update(projectRef, {
        latestSnapshot: filtered.length > 0 ? filtered[0] : null,
        updatedAt: Timestamp.now(),
      });
    }
  }

  await batch.commit();
}

/**
 * Subscribe to snapshots for a project (real-time updates)
 */
export function subscribeToSnapshots(
  projektId: string,
  callback: (snapshots: EinzelcontrollingSnapshot[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, SNAPSHOTS_COLLECTION),
    where('projektId', '==', projektId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const snapshots = snapshot.docs
        .map((doc) => doc.data() as EinzelcontrollingSnapshot)
        .sort((a, b) => {
          const parseKW = (kw: string) => {
            const match = kw.match(/KW(\d+)\/(\d+)/);
            if (match) {
              return parseInt(match[2]) * 100 + parseInt(match[1]);
            }
            return 0;
          };
          return parseKW(b.kalenderwoche) - parseKW(a.kalenderwoche);
        });
      callback(snapshots);
    },
    (error) => {
      console.error('Snapshots subscription error:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}
