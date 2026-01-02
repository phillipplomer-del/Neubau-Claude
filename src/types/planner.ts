/**
 * Planner Types
 * Type definitions for the Project Management Tool (Planner)
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Board - Container for columns and tasks
 */
export interface PMBoard {
  id: string;
  name: string;
  description?: string;
  projektnummer?: string;      // null = global board, set = project-specific
  isGlobal: boolean;
  columns: string[];           // Ordered column IDs
  defaultView: PMViewType;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archived: boolean;
}

/**
 * Column - A bucket/stage within a board
 */
export interface PMColumn {
  id: string;
  boardId: string;
  name: string;
  color?: string;              // Hex color for visual distinction
  order: number;
  taskIds: string[];           // Ordered task IDs in this column
  limit?: number;              // WIP limit (optional)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Label - Tag for categorizing tasks
 */
export interface PMLabel {
  id: string;
  name: string;
  color: string;               // Hex color
}

/**
 * Checklist Item - Subtask within a task
 */
export interface PMChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: Timestamp;
}

/**
 * Dependency Types (like MS Project)
 * - FS (Finish-to-Start): Task B starts when Task A finishes (most common)
 * - SS (Start-to-Start): Task B starts when Task A starts
 * - FF (Finish-to-Finish): Task B finishes when Task A finishes
 * - SF (Start-to-Finish): Task B finishes when Task A starts (rare)
 */
export type PMDependencyType = 'FS' | 'SS' | 'FF' | 'SF';

/**
 * Task Dependency - Link between two tasks
 */
export interface PMTaskDependency {
  /** ID of the predecessor task (Vorgänger) */
  predecessorId: string;
  /** Type of dependency relationship */
  type: PMDependencyType;
  /** Lag in days (positive = delay, negative = overlap/lead) */
  lagDays: number;
}

export const DEPENDENCY_TYPE_LABELS: Record<PMDependencyType, string> = {
  FS: 'Ende-Anfang (EA)',
  SS: 'Anfang-Anfang (AA)',
  FF: 'Ende-Ende (EE)',
  SF: 'Anfang-Ende (AE)',
};

export const DEPENDENCY_TYPE_SHORT: Record<PMDependencyType, string> = {
  FS: 'EA',
  SS: 'AA',
  FF: 'EE',
  SF: 'AE',
};

/**
 * Task - Individual work item (card)
 */
export interface PMTask {
  id: string;
  boardId: string;
  columnId: string;
  projektnummer?: string;      // Link to project (inherited from board or explicit)

  // Core fields
  title: string;
  description?: string;
  order: number;               // Position within column
  code?: string;               // Task code like [M1], [V2.1] for project templates
  taskType?: PMTaskType;       // milestone or activity

  // Dates
  startDate?: Timestamp;
  dueDate?: Timestamp;
  completedAt?: Timestamp;

  // Assignment & Status
  assignee?: string;           // User name
  priority: PMPriority;

  // Categorization
  labels: PMLabel[];

  // Progress
  checklist: PMChecklistItem[];
  completionPercentage: number; // 0-100, calculated from checklist

  // Dependencies (for Gantt) - Vorgänger
  dependencies: PMTaskDependency[];  // Tasks this depends on (predecessors)

  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  hasComments: boolean;        // Quick flag for UI
}

/**
 * Task Comment
 */
export interface PMTaskComment {
  id: string;
  taskId: string;
  name: string;                // Commenter name
  text: string;
  createdAt: Timestamp;
}

/**
 * Priority levels
 */
export type PMPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Task types - Milestone (M) vs Activity/Vorgang (V)
 */
export type PMTaskType = 'milestone' | 'activity';

/**
 * View types for board display
 */
export type PMViewType = 'kanban' | 'list' | 'gantt';

/**
 * Shared label definitions (across boards)
 */
export interface PMLabelDefinition {
  id: string;
  name: string;
  color: string;
  createdAt: Timestamp;
}

// ============================================
// Input types for creating/updating entities
// ============================================

export interface CreateBoardInput {
  name: string;
  description?: string;
  projektnummer?: string;
  isGlobal?: boolean;
  defaultView?: PMViewType;
  createdBy: string;
}

export interface UpdateBoardInput {
  name?: string;
  description?: string;
  projektnummer?: string;
  defaultView?: PMViewType;
  archived?: boolean;
}

export interface CreateColumnInput {
  boardId: string;
  name: string;
  color?: string;
  order: number;
  limit?: number;
}

export interface UpdateColumnInput {
  name?: string;
  color?: string;
  limit?: number;
}

export interface CreateTaskInput {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  projektnummer?: string;
  assignee?: string;
  priority?: PMPriority;
  startDate?: Date;
  dueDate?: Date;
  labels?: PMLabel[];
  code?: string;               // Task code like [M1], [V2.1]
  taskType?: PMTaskType;       // milestone or activity
  createdBy: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  columnId?: string;
  order?: number;
  assignee?: string;
  priority?: PMPriority;
  startDate?: Date | null;
  dueDate?: Date | null;
  labels?: PMLabel[];
  checklist?: PMChecklistItem[];
  dependencies?: PMTaskDependency[];
  completedAt?: Date | null;
}

export interface MoveTaskInput {
  taskId: string;
  targetColumnId: string;
  targetOrder: number;
}

// ============================================
// UI State types
// ============================================

export interface DragState {
  isDragging: boolean;
  draggedTaskId: string | null;
  sourceColumnId: string | null;
  targetColumnId: string | null;
  targetOrder: number | null;
}

export interface BoardFilters {
  search: string;
  assignee: string | null;
  priority: PMPriority | null;
  labels: string[];
  showCompleted: boolean;
}

// ============================================
// Default values
// ============================================

export const DEFAULT_COLUMNS: Omit<CreateColumnInput, 'boardId'>[] = [
  { name: 'Backlog', order: 0, color: '#94A3B8' },
  { name: 'To Do', order: 1, color: '#3B82F6' },
  { name: 'In Arbeit', order: 2, color: '#F59E0B' },
  { name: 'Review', order: 3, color: '#8B5CF6' },
  { name: 'Erledigt', order: 4, color: '#10B981' },
];

export const DEFAULT_LABELS: Omit<PMLabelDefinition, 'id' | 'createdAt'>[] = [
  { name: 'Bug', color: '#EF4444' },
  { name: 'Feature', color: '#3B82F6' },
  { name: 'Dringend', color: '#F59E0B' },
  { name: 'Dokumentation', color: '#8B5CF6' },
  { name: 'Verbesserung', color: '#10B981' },
];

export const PRIORITY_COLORS: Record<PMPriority, string> = {
  low: '#94A3B8',
  medium: '#3B82F6',
  high: '#F59E0B',
  critical: '#EF4444',
};

export const PRIORITY_LABELS: Record<PMPriority, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  critical: 'Kritisch',
};

// ============================================
// Project Template - Standard phases and tasks
// ============================================

export interface ProjectTemplateTask {
  code: string;
  title: string;
  taskType: PMTaskType;
  /** Start offset in days from phase start */
  startOffsetDays: number;
  /** Duration in days (for activities) or 0 for milestones */
  durationDays: number;
  /** Predecessor task codes (Vorgänger) - all FS type with 0 lag */
  predecessorCodes?: string[];
}

export interface ProjectTemplatePhase {
  name: string;
  color: string;
  /** Phase duration in weeks */
  durationWeeks: number;
  tasks: ProjectTemplateTask[];
}

/**
 * Standard project template with phases (columns) and tasks
 * [M] = Milestone, [V] = Vorgang/Activity
 *
 * Default durations:
 * - Projektstart: 1 Woche
 * - Konstruktion: 3 Wochen
 * - Beschaffung: 3 Wochen
 * - Produktion: 10 Wochen
 * - Logistik: 1 Woche
 * - Projektabschluss: immediate
 */
export const PROJECT_TEMPLATE: ProjectTemplatePhase[] = [
  {
    name: 'Projektstart',
    color: '#3B82F6', // Blue
    durationWeeks: 1,
    tasks: [
      { code: 'M1', title: 'Bestellung eingegangen', taskType: 'milestone', startOffsetDays: 0, durationDays: 0 },
      { code: 'V1', title: 'Interne Klärung', taskType: 'activity', startOffsetDays: 0, durationDays: 7, predecessorCodes: ['M1'] },
    ],
  },
  {
    name: 'Konstruktion',
    color: '#8B5CF6', // Violet
    durationWeeks: 3,
    tasks: [
      { code: 'V2.1', title: 'Konstruktion Entwurfserstellung', taskType: 'activity', startOffsetDays: 0, durationDays: 7, predecessorCodes: ['V1'] },
      { code: 'M3', title: 'Konstruktion Entwurf freigegeben', taskType: 'milestone', startOffsetDays: 7, durationDays: 0, predecessorCodes: ['V2.1'] },
      { code: 'V2.3', title: 'Konstruktion Zeichnungsfreigabe', taskType: 'activity', startOffsetDays: 7, durationDays: 14, predecessorCodes: ['M3'] },
      { code: 'M4', title: 'Konstruktion Übergabe PP erfolgt', taskType: 'milestone', startOffsetDays: 21, durationDays: 0, predecessorCodes: ['V2.3'] },
    ],
  },
  {
    name: 'Beschaffung',
    color: '#F59E0B', // Amber
    durationWeeks: 3,
    tasks: [
      { code: 'V3.4', title: 'Produktionsplanung', taskType: 'activity', startOffsetDays: 0, durationDays: 21, predecessorCodes: ['M4'] },
      { code: 'V3.1', title: 'Beschaffung für Produktionsbeginn', taskType: 'activity', startOffsetDays: 0, durationDays: 7, predecessorCodes: ['V3.4'] },
      { code: 'V3.2', title: 'Beschaffung für Langläufer Montage', taskType: 'activity', startOffsetDays: 0, durationDays: 14, predecessorCodes: ['V3.4'] },
      { code: 'V3.3', title: 'Beschaffung für Montagebeginn', taskType: 'activity', startOffsetDays: 7, durationDays: 14, predecessorCodes: ['V3.4'] },
    ],
  },
  {
    name: 'Produktion',
    color: '#EF4444', // Red
    durationWeeks: 10,
    tasks: [
      { code: 'V4.1', title: 'Produktion/Fertigung', taskType: 'activity', startOffsetDays: 0, durationDays: 28, predecessorCodes: ['V3.1'] },
      { code: 'M5', title: 'Montagebereitschaft erreicht', taskType: 'milestone', startOffsetDays: 28, durationDays: 0, predecessorCodes: ['V4.1', 'V3.2', 'V3.3'] },
      { code: 'V4.3', title: 'Montage', taskType: 'activity', startOffsetDays: 28, durationDays: 28, predecessorCodes: ['M5'] },
      { code: 'V4.4', title: 'Produktprüfung', taskType: 'activity', startOffsetDays: 56, durationDays: 7, predecessorCodes: ['V4.3'] },
      { code: 'M6', title: 'FAT durchgeführt', taskType: 'milestone', startOffsetDays: 70, durationDays: 0, predecessorCodes: ['V4.4'] },
    ],
  },
  {
    name: 'Logistik',
    color: '#06B6D4', // Cyan
    durationWeeks: 1,
    tasks: [
      { code: 'V5.1', title: 'Verpackung', taskType: 'activity', startOffsetDays: 0, durationDays: 5, predecessorCodes: ['M6'] },
      { code: 'M7', title: 'Produkt versendet', taskType: 'milestone', startOffsetDays: 7, durationDays: 0, predecessorCodes: ['V5.1'] },
    ],
  },
  {
    name: 'Projektabschluss',
    color: '#10B981', // Emerald
    durationWeeks: 0,
    tasks: [
      { code: 'M8', title: 'Rechnungsstellung', taskType: 'milestone', startOffsetDays: 0, durationDays: 0, predecessorCodes: ['M7'] },
    ],
  },
];

// ============================================
// Dependency Calculation Utilities
// ============================================

/**
 * Calculate a task's start date based on its dependencies
 * @param task The task to calculate dates for
 * @param allTasks All tasks in the board (to find predecessors)
 * @returns Calculated start date, or null if no dependencies or predecessors have no dates
 */
export function calculateDependencyStartDate(
  task: { dependencies: PMTaskDependency[] },
  allTasks: { id: string; startDate?: { toDate: () => Date }; dueDate?: { toDate: () => Date } }[]
): Date | null {
  if (!task.dependencies || task.dependencies.length === 0) return null;

  let latestDate: Date | null = null;

  for (const dep of task.dependencies) {
    const predecessor = allTasks.find((t) => t.id === dep.predecessorId);
    if (!predecessor) continue;

    let referenceDate: Date | null = null;

    switch (dep.type) {
      case 'FS': // Finish-to-Start: this task starts after predecessor finishes
        referenceDate = predecessor.dueDate?.toDate() || predecessor.startDate?.toDate() || null;
        break;
      case 'SS': // Start-to-Start: this task starts when predecessor starts
        referenceDate = predecessor.startDate?.toDate() || predecessor.dueDate?.toDate() || null;
        break;
      case 'FF': // Finish-to-Finish: calculate backwards from when we need to finish
        // For FF, we'd need to know the task duration to calculate start date
        // For now, use the predecessor's end date as reference
        referenceDate = predecessor.dueDate?.toDate() || predecessor.startDate?.toDate() || null;
        break;
      case 'SF': // Start-to-Finish: this task finishes when predecessor starts
        // Similar to FF, would need task duration
        referenceDate = predecessor.startDate?.toDate() || predecessor.dueDate?.toDate() || null;
        break;
    }

    if (referenceDate) {
      // Apply lag (in days)
      const adjustedDate = new Date(referenceDate);
      adjustedDate.setDate(adjustedDate.getDate() + dep.lagDays);

      // For FS, add 1 day (start day after predecessor ends)
      if (dep.type === 'FS') {
        adjustedDate.setDate(adjustedDate.getDate() + 1);
      }

      // Take the latest date among all dependencies
      if (!latestDate || adjustedDate > latestDate) {
        latestDate = adjustedDate;
      }
    }
  }

  return latestDate;
}

/**
 * Get all tasks that depend on a given task (successors)
 * @param taskId The task ID to find successors for
 * @param allTasks All tasks in the board
 * @returns Array of successor tasks
 */
export function getSuccessorTasks<T extends { id: string; dependencies: PMTaskDependency[] }>(
  taskId: string,
  allTasks: T[]
): T[] {
  return allTasks.filter((task) =>
    task.dependencies?.some((dep) => dep.predecessorId === taskId)
  );
}

/**
 * Build a dependency chain starting from a task
 * Returns tasks in order they should be updated (topological sort)
 * @param startTaskId The task that was changed
 * @param allTasks All tasks in the board
 * @returns Array of task IDs in update order
 */
export function getDependencyChain<T extends { id: string; dependencies: PMTaskDependency[] }>(
  startTaskId: string,
  allTasks: T[]
): string[] {
  const visited = new Set<string>();
  const chain: string[] = [];

  function visit(taskId: string) {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const successors = getSuccessorTasks(taskId, allTasks);
    for (const successor of successors) {
      visit(successor.id);
    }
    chain.push(taskId);
  }

  // Start with successors of the changed task
  const successors = getSuccessorTasks(startTaskId, allTasks);
  for (const successor of successors) {
    visit(successor.id);
  }

  return chain.reverse();
}
