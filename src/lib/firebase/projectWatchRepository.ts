/**
 * Firestore Project Watch Repository
 * Handles watched projects - status applies to all entries with same projektnummer
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION_NAME = 'watchedProjects';

export interface WatchedProject {
  projektnummer: string;
  watchedBy: string;
  watchedAt: Timestamp;
  comment?: string;
}

/**
 * Check if a project is watched
 */
export async function isProjectWatched(projektnummer: string): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, projektnummer);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking if project is watched:', error);
    return false;
  }
}

/**
 * Get watched project details
 */
export async function getWatchedProject(projektnummer: string): Promise<WatchedProject | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, projektnummer);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as WatchedProject;
  } catch (error) {
    console.error('Error getting watched project:', error);
    return null;
  }
}

/**
 * Add a project to watched list
 */
export async function watchProject(
  projektnummer: string,
  watchedBy: string,
  comment?: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, projektnummer);

    const watchData: WatchedProject = {
      projektnummer,
      watchedBy,
      watchedAt: Timestamp.now(),
      comment,
    };

    await setDoc(docRef, watchData);
  } catch (error) {
    console.error('Error watching project:', error);
    throw error;
  }
}

/**
 * Remove a project from watched list
 */
export async function unwatchProject(projektnummer: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, projektnummer);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error unwatching project:', error);
    throw error;
  }
}

/**
 * Get all watched project numbers
 */
export async function getAllWatchedProjects(): Promise<string[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => doc.data().projektnummer);
  } catch (error) {
    console.error('Error getting all watched projects:', error);
    return [];
  }
}
