/**
 * Hook for Time Tracking functionality
 * Provides timer control and time entry management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import type {
  TimeEntry,
  ActiveTimer,
  TimeEntryCategory,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
} from '@/types/timeTracking';
import { getWeekStart, getWeekEnd } from '@/types/timeTracking';
import {
  startTimer,
  stopTimer,
  updateActiveTimer,
  discardTimer,
  subscribeToActiveTimer,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  subscribeToTimeEntries,
  getRecentProjects,
} from '@/lib/firebase/timeTrackingRepository';

export interface UseTimeTrackingReturn {
  // Active timer
  activeTimer: ActiveTimer | null;
  isTimerRunning: boolean;
  elapsedSeconds: number;

  // Time entries for current week
  entries: TimeEntry[];
  loading: boolean;
  error: string | null;

  // Recent projects for quick start
  recentProjects: { projektnummer: string; projectName?: string; lastUsed: Date }[];

  // Timer actions
  start: (projektnummer: string, projectName?: string, category?: TimeEntryCategory) => Promise<void>;
  stop: (description?: string, category?: TimeEntryCategory) => Promise<void>;
  discard: () => Promise<void>;
  updateTimer: (updates: { description?: string; category?: TimeEntryCategory }) => Promise<void>;

  // Time entry actions
  createEntry: (input: Omit<CreateTimeEntryInput, 'userId' | 'userName'>) => Promise<string>;
  updateEntry: (entryId: string, input: UpdateTimeEntryInput) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;

  // Week navigation
  currentWeekStart: Date;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;

  // Computed
  weekTotal: number;
  todayTotal: number;
  entriesByDay: Map<string, TimeEntry[]>;
  entriesByProject: Map<string, TimeEntry[]>;
}

export function useTimeTracking(): UseTimeTrackingReturn {
  const { user } = useUserContext();
  const userId = user?.fullName ?? '';

  // State
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [recentProjects, setRecentProjects] = useState<{ projektnummer: string; projectName?: string; lastUsed: Date }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));

  // Subscribe to active timer
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToActiveTimer(userId, (timer) => {
      setActiveTimer(timer);
    });

    return () => unsubscribe();
  }, [userId]);

  // Update elapsed seconds every second when timer is running
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const start = activeTimer.startTime.toDate().getTime();
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Subscribe to time entries for current week
  useEffect(() => {
    if (!userId) return;

    const weekEnd = getWeekEnd(currentWeekStart);

    const unsubscribe = subscribeToTimeEntries(
      userId,
      currentWeekStart,
      weekEnd,
      (newEntries) => {
        setEntries(newEntries);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, currentWeekStart]);

  // Load recent projects
  useEffect(() => {
    if (!userId) return;

    const loadRecent = async () => {
      try {
        const recent = await getRecentProjects(userId, 5);
        setRecentProjects(recent);
      } catch (err) {
        console.error('Error loading recent projects:', err);
      }
    };

    loadRecent();
  }, [userId, entries]); // Reload when entries change

  // Timer actions
  const start = useCallback(
    async (projektnummer: string, projectName?: string, category?: TimeEntryCategory) => {
      console.log('[TimeTracking] Starting timer:', { projektnummer, userId, userName: user?.fullName });

      if (!userId || !user?.fullName) {
        console.error('[TimeTracking] User not logged in:', { userId, user });
        setError('User not logged in');
        return;
      }

      try {
        const timerId = await startTimer({
          userId,
          userName: user.fullName,
          projektnummer,
          projectName,
          category: category ?? 'other',
        });
        console.log('[TimeTracking] Timer started successfully:', timerId);
      } catch (err) {
        console.error('[TimeTracking] Error starting timer:', err);
        setError(err instanceof Error ? err.message : 'Failed to start timer');
      }
    },
    [userId, user]
  );

  const stop = useCallback(
    async (description?: string, category?: TimeEntryCategory) => {
      if (!activeTimer) return;

      try {
        await stopTimer({
          timerId: activeTimer.id,
          description,
          category,
        });
      } catch (err) {
        console.error('Error stopping timer:', err);
        setError(err instanceof Error ? err.message : 'Failed to stop timer');
      }
    },
    [activeTimer]
  );

  const discard = useCallback(async () => {
    if (!activeTimer) return;

    try {
      await discardTimer(activeTimer.id);
    } catch (err) {
      console.error('Error discarding timer:', err);
      setError(err instanceof Error ? err.message : 'Failed to discard timer');
    }
  }, [activeTimer]);

  const updateTimer = useCallback(
    async (updates: { description?: string; category?: TimeEntryCategory }) => {
      if (!activeTimer) return;

      try {
        await updateActiveTimer(activeTimer.id, updates);
      } catch (err) {
        console.error('Error updating timer:', err);
        setError(err instanceof Error ? err.message : 'Failed to update timer');
      }
    },
    [activeTimer]
  );

  // Time entry actions
  const createEntry = useCallback(
    async (input: Omit<CreateTimeEntryInput, 'userId' | 'userName'>): Promise<string> => {
      if (!userId || !user?.fullName) {
        throw new Error('User not logged in');
      }

      return createTimeEntry({
        ...input,
        userId,
        userName: user.fullName,
      });
    },
    [userId, user]
  );

  const updateEntry = useCallback(
    async (entryId: string, input: UpdateTimeEntryInput) => {
      await updateTimeEntry(entryId, input);
    },
    []
  );

  const deleteEntry = useCallback(async (entryId: string) => {
    await deleteTimeEntry(entryId);
  }, []);

  // Week navigation
  const goToPreviousWeek = useCallback(() => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeekStart(getWeekStart(new Date()));
  }, []);

  // Computed values
  const weekTotal = useMemo(() => {
    return entries.reduce((sum, e) => sum + e.duration, 0);
  }, [entries]);

  const todayTotal = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return entries
      .filter((e) => {
        const entryDate = e.startTime.toDate();
        return entryDate >= today && entryDate < tomorrow;
      })
      .reduce((sum, e) => sum + e.duration, 0);
  }, [entries]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();

    for (const entry of entries) {
      const dateKey = entry.startTime.toDate().toISOString().split('T')[0];
      const dayEntries = map.get(dateKey) || [];
      dayEntries.push(entry);
      map.set(dateKey, dayEntries);
    }

    return map;
  }, [entries]);

  const entriesByProject = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();

    for (const entry of entries) {
      const projectEntries = map.get(entry.projektnummer) || [];
      projectEntries.push(entry);
      map.set(entry.projektnummer, projectEntries);
    }

    return map;
  }, [entries]);

  return {
    activeTimer,
    isTimerRunning: !!activeTimer,
    elapsedSeconds,
    entries,
    loading,
    error,
    recentProjects,
    start,
    stop,
    discard,
    updateTimer,
    createEntry,
    updateEntry,
    deleteEntry,
    currentWeekStart,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    weekTotal,
    todayTotal,
    entriesByDay,
    entriesByProject,
  };
}
