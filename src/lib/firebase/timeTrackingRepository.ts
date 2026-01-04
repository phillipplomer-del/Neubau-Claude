/**
 * Firestore Time Tracking Repository
 * Handles CRUD operations for time entries and active timers
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
  onSnapshot,
  Timestamp,
  serverTimestamp,
  writeBatch,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import type {
  TimeEntry,
  ActiveTimer,
  StartTimerInput,
  StopTimerInput,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  TimeEntryCategory,
} from '@/types/timeTracking';
import { calculateDuration } from '@/types/timeTracking';

// Collection names
const TIME_ENTRIES_COLLECTION = 'timeEntries';
const ACTIVE_TIMERS_COLLECTION = 'activeTimers';

// ============================================
// ACTIVE TIMER OPERATIONS
// ============================================

/**
 * Start a new timer (stops any existing timer first)
 */
export async function startTimer(input: StartTimerInput): Promise<string> {
  console.log('[Firebase] startTimer called with:', input);

  try {
    // First, check if there's an existing timer and stop it
    const existingTimer = await getActiveTimer(input.userId);
    if (existingTimer) {
      console.log('[Firebase] Stopping existing timer:', existingTimer.id);
      await stopTimer({ timerId: existingTimer.id });
    }

    const timerRef = doc(collection(db, ACTIVE_TIMERS_COLLECTION));
    const timerId = timerRef.id;
    console.log('[Firebase] Creating new timer with ID:', timerId);

    // Build timer object without undefined values (Firebase doesn't accept undefined)
    const newTimer: Record<string, unknown> = {
      id: timerId,
      userId: input.userId,
      userName: input.userName,
      projektnummer: input.projektnummer,
      startTime: Timestamp.now(),
      category: input.category ?? 'other',
    };

    // Only add optional fields if they have values
    if (input.projectName) {
      newTimer.projectName = input.projectName;
    }
    if (input.description) {
      newTimer.description = input.description;
    }

    await setDoc(timerRef, newTimer);
    console.log('[Firebase] Timer saved successfully');
    return timerId;
  } catch (error) {
    console.error('[Firebase] Error in startTimer:', error);
    throw error;
  }
}

/**
 * Stop the active timer and create a time entry
 */
export async function stopTimer(input: StopTimerInput): Promise<string | null> {
  const timerRef = doc(db, ACTIVE_TIMERS_COLLECTION, input.timerId);
  const timerSnap = await getDoc(timerRef);

  if (!timerSnap.exists()) {
    return null;
  }

  const timer = timerSnap.data() as ActiveTimer;
  const endTime = Timestamp.now();
  const duration = calculateDuration(timer.startTime.toDate(), endTime.toDate());

  // Don't create entry if duration is less than 1 minute
  if (duration < 1) {
    await deleteDoc(timerRef);
    return null;
  }

  // Create time entry
  const entryRef = doc(collection(db, TIME_ENTRIES_COLLECTION));
  const entryId = entryRef.id;

  // Build entry object without undefined values (Firebase doesn't accept undefined)
  const newEntry: Record<string, unknown> = {
    id: entryId,
    userId: timer.userId,
    userName: timer.userName,
    projektnummer: timer.projektnummer,
    startTime: timer.startTime,
    endTime: endTime,
    duration: duration,
    category: input.category ?? timer.category ?? 'other',
    billable: input.billable ?? true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Only add optional fields if they have values
  if (timer.projectName) {
    newEntry.projectName = timer.projectName;
  }
  const finalDescription = input.description ?? timer.description;
  if (finalDescription) {
    newEntry.description = finalDescription;
  }

  const batch = writeBatch(db);
  batch.set(entryRef, newEntry);
  batch.delete(timerRef);
  await batch.commit();

  return entryId;
}

/**
 * Update active timer description or category
 */
export async function updateActiveTimer(
  timerId: string,
  updates: { description?: string; category?: TimeEntryCategory }
): Promise<void> {
  const timerRef = doc(db, ACTIVE_TIMERS_COLLECTION, timerId);
  await updateDoc(timerRef, updates);
}

/**
 * Discard active timer without saving
 */
export async function discardTimer(timerId: string): Promise<void> {
  const timerRef = doc(db, ACTIVE_TIMERS_COLLECTION, timerId);
  await deleteDoc(timerRef);
}

/**
 * Get active timer for a user
 */
export async function getActiveTimer(userId: string): Promise<ActiveTimer | null> {
  const q = query(
    collection(db, ACTIVE_TIMERS_COLLECTION),
    where('userId', '==', userId),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : (snapshot.docs[0].data() as ActiveTimer);
}

/**
 * Subscribe to active timer for a user
 */
export function subscribeToActiveTimer(
  userId: string,
  callback: (timer: ActiveTimer | null) => void
): Unsubscribe {
  console.log('[Firebase] Subscribing to active timer for user:', userId);
  const q = query(
    collection(db, ACTIVE_TIMERS_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    console.log('[Firebase] Active timer snapshot:', snapshot.empty ? 'no timer' : 'timer found');
    if (snapshot.empty) {
      callback(null);
    } else {
      const timer = snapshot.docs[0].data() as ActiveTimer;
      console.log('[Firebase] Active timer data:', timer.projektnummer);
      callback(timer);
    }
  }, (error) => {
    console.error('[Firebase] Error in subscribeToActiveTimer:', error);
  });
}

// ============================================
// TIME ENTRY OPERATIONS
// ============================================

/**
 * Create a manual time entry
 */
export async function createTimeEntry(input: CreateTimeEntryInput): Promise<string> {
  const entryRef = doc(collection(db, TIME_ENTRIES_COLLECTION));
  const entryId = entryRef.id;

  const duration = calculateDuration(input.startTime, input.endTime);

  // Build entry object without undefined values (Firebase doesn't accept undefined)
  const newEntry: Record<string, unknown> = {
    id: entryId,
    userId: input.userId,
    userName: input.userName,
    projektnummer: input.projektnummer,
    startTime: Timestamp.fromDate(input.startTime),
    endTime: Timestamp.fromDate(input.endTime),
    duration: duration,
    category: input.category ?? 'other',
    billable: input.billable ?? true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Only add optional fields if they have values
  if (input.projectName) {
    newEntry.projectName = input.projectName;
  }
  if (input.description) {
    newEntry.description = input.description;
  }
  if (input.taskId) {
    newEntry.taskId = input.taskId;
  }

  await setDoc(entryRef, newEntry);
  return entryId;
}

/**
 * Get a single time entry
 */
export async function getTimeEntry(entryId: string): Promise<TimeEntry | null> {
  const docRef = doc(db, TIME_ENTRIES_COLLECTION, entryId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as TimeEntry) : null;
}

/**
 * Update a time entry
 */
export async function updateTimeEntry(
  entryId: string,
  input: UpdateTimeEntryInput
): Promise<void> {
  const docRef = doc(db, TIME_ENTRIES_COLLECTION, entryId);

  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (input.projektnummer !== undefined) updateData.projektnummer = input.projektnummer;
  if (input.projectName !== undefined) updateData.projectName = input.projectName;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.billable !== undefined) updateData.billable = input.billable;
  if (input.taskId !== undefined) updateData.taskId = input.taskId;

  // Handle date updates and recalculate duration
  if (input.startTime || input.endTime) {
    const currentDoc = await getDoc(docRef);
    if (currentDoc.exists()) {
      const current = currentDoc.data() as TimeEntry;
      const newStart = input.startTime ?? current.startTime.toDate();
      const newEnd = input.endTime ?? current.endTime?.toDate() ?? new Date();

      if (input.startTime) updateData.startTime = Timestamp.fromDate(input.startTime);
      if (input.endTime) updateData.endTime = Timestamp.fromDate(input.endTime);
      updateData.duration = calculateDuration(newStart, newEnd);
    }
  }

  await updateDoc(docRef, updateData);
}

/**
 * Delete a time entry
 */
export async function deleteTimeEntry(entryId: string): Promise<void> {
  const docRef = doc(db, TIME_ENTRIES_COLLECTION, entryId);
  await deleteDoc(docRef);
}

/**
 * Get time entries for a user within a date range
 * Note: Simplified query to avoid needing composite Firestore index
 */
export async function getTimeEntries(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeEntry[]> {
  // Simple query by userId only - filter by date in memory to avoid composite index
  const q = query(
    collection(db, TIME_ENTRIES_COLLECTION),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  return snapshot.docs
    .map((doc) => doc.data() as TimeEntry)
    .filter((entry) => {
      const entryMs = entry.startTime.toMillis();
      return entryMs >= startMs && entryMs <= endMs;
    })
    .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
}

/**
 * Get time entries for a project
 */
export async function getTimeEntriesByProject(
  projektnummer: string,
  startDate?: Date,
  endDate?: Date
): Promise<TimeEntry[]> {
  let q = query(
    collection(db, TIME_ENTRIES_COLLECTION),
    where('projektnummer', '==', projektnummer)
  );

  const snapshot = await getDocs(q);
  let entries = snapshot.docs.map((doc) => doc.data() as TimeEntry);

  // Filter by date in memory (to avoid composite index)
  if (startDate) {
    entries = entries.filter((e) => e.startTime.toDate() >= startDate);
  }
  if (endDate) {
    entries = entries.filter((e) => e.startTime.toDate() <= endDate);
  }

  return entries.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
}

/**
 * Get recent projects for quick-start
 * Note: Simplified query to avoid needing composite Firestore index
 */
export async function getRecentProjects(
  userId: string,
  maxCount: number = 5
): Promise<{ projektnummer: string; projectName?: string; lastUsed: Date }[]> {
  // Simple query by userId only - sort in memory to avoid composite index
  const q = query(
    collection(db, TIME_ENTRIES_COLLECTION),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);

  // Sort by startTime descending in memory
  const entries = snapshot.docs
    .map((doc) => doc.data() as TimeEntry)
    .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());

  const projectMap = new Map<string, { projektnummer: string; projectName?: string; lastUsed: Date }>();

  for (const entry of entries) {
    if (!projectMap.has(entry.projektnummer)) {
      projectMap.set(entry.projektnummer, {
        projektnummer: entry.projektnummer,
        projectName: entry.projectName,
        lastUsed: entry.startTime.toDate(),
      });
    }
    if (projectMap.size >= maxCount) break;
  }

  return Array.from(projectMap.values());
}

/**
 * Subscribe to time entries for a user (real-time)
 * Note: Simplified query to avoid needing composite Firestore index
 */
export function subscribeToTimeEntries(
  userId: string,
  startDate: Date,
  endDate: Date,
  callback: (entries: TimeEntry[]) => void
): Unsubscribe {
  // Simple query by userId only - filter by date in memory to avoid composite index
  const q = query(
    collection(db, TIME_ENTRIES_COLLECTION),
    where('userId', '==', userId)
  );

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  return onSnapshot(q, (snapshot) => {
    console.log('[Firebase] Time entries snapshot received:', snapshot.docs.length, 'docs');
    const entries = snapshot.docs
      .map((doc) => doc.data() as TimeEntry)
      .filter((entry) => {
        const entryMs = entry.startTime.toMillis();
        return entryMs >= startMs && entryMs <= endMs;
      })
      .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
    console.log('[Firebase] Filtered entries for week:', entries.length);
    callback(entries);
  }, (error) => {
    console.error('[Firebase] Error in subscribeToTimeEntries:', error);
  });
}

/**
 * Get total time for a user on a specific day
 */
export async function getDayTotal(userId: string, date: Date): Promise<number> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const entries = await getTimeEntries(userId, dayStart, dayEnd);
  return entries.reduce((sum, e) => sum + e.duration, 0);
}

/**
 * Get total time for a user in a week
 */
export async function getWeekTotal(userId: string, weekStart: Date): Promise<number> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const entries = await getTimeEntries(userId, weekStart, weekEnd);
  return entries.reduce((sum, e) => sum + e.duration, 0);
}
