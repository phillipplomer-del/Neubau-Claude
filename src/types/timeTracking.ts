/**
 * Time Tracking Types
 * Type definitions for the Time Tracking feature
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Time Entry - A recorded time block
 */
export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;

  // Project reference
  projektnummer: string;
  projectName?: string;

  // Time data
  startTime: Timestamp;
  endTime?: Timestamp;           // null = timer still running
  duration: number;              // Duration in minutes (calculated)

  // Description
  description?: string;
  taskId?: string;               // Optional: Link to Planner task

  // Categorization
  category: TimeEntryCategory;
  billable: boolean;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Active Timer - Only one per user
 */
export interface ActiveTimer {
  id: string;
  userId: string;
  userName: string;
  projektnummer: string;
  projectName?: string;
  startTime: Timestamp;
  description?: string;
  category: TimeEntryCategory;
}

/**
 * Time entry categories
 */
export type TimeEntryCategory =
  | 'development'    // Entwicklung/Konstruktion
  | 'meeting'        // Besprechung
  | 'planning'       // Planung
  | 'admin'          // Verwaltung
  | 'review'         // Review/Prüfung
  | 'other';         // Sonstiges

/**
 * Category display info
 */
export const CATEGORY_INFO: Record<TimeEntryCategory, { label: string; color: string; icon: string }> = {
  development: { label: 'Entwicklung', color: '#3B82F6', icon: 'Code' },
  meeting: { label: 'Besprechung', color: '#8B5CF6', icon: 'Users' },
  planning: { label: 'Planung', color: '#F59E0B', icon: 'Calendar' },
  admin: { label: 'Verwaltung', color: '#94A3B8', icon: 'FileText' },
  review: { label: 'Review', color: '#10B981', icon: 'CheckCircle' },
  other: { label: 'Sonstiges', color: '#6B7280', icon: 'MoreHorizontal' },
};

// ============================================
// Input types
// ============================================

export interface StartTimerInput {
  userId: string;
  userName: string;
  projektnummer: string;
  projectName?: string;
  description?: string;
  category?: TimeEntryCategory;
}

export interface StopTimerInput {
  timerId: string;
  description?: string;
  category?: TimeEntryCategory;
  billable?: boolean;
}

export interface CreateTimeEntryInput {
  userId: string;
  userName: string;
  projektnummer: string;
  projectName?: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  category?: TimeEntryCategory;
  billable?: boolean;
  taskId?: string;
}

export interface UpdateTimeEntryInput {
  projektnummer?: string;
  projectName?: string;
  startTime?: Date;
  endTime?: Date;
  description?: string;
  category?: TimeEntryCategory;
  billable?: boolean;
  taskId?: string;
}

// ============================================
// Aggregation types
// ============================================

/**
 * Daily summary for a project
 */
export interface DailyProjectSummary {
  projektnummer: string;
  projectName?: string;
  totalMinutes: number;
  entries: TimeEntry[];
}

/**
 * Weekly summary
 */
export interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  totalMinutes: number;
  byProject: Map<string, number>;      // projektnummer -> minutes
  byDay: Map<string, number>;          // YYYY-MM-DD -> minutes
  byCategory: Map<TimeEntryCategory, number>;
}

/**
 * Project time summary
 */
export interface ProjectTimeSummary {
  projektnummer: string;
  projectName?: string;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  entryCount: number;
  lastEntry?: Timestamp;
}

// ============================================
// Helper functions
// ============================================

/**
 * Format duration in minutes to HH:MM string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format duration to human-readable string
 */
export function formatDurationHuman(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}min`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}min`;
}

/**
 * Calculate duration between two timestamps in minutes
 */
export function calculateDuration(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Get week start date (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get week end date (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
