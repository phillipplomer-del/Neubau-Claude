/**
 * Production planning specific types
 * Based on "PP_SollIstVergleich" (Planned vs. Actual Comparison)
 */

import { BaseEntry } from './common';

export interface ProductionEntry extends BaseEntry {
  department: 'production';

  // Planning information
  planningNumber?: string;
  workOrderNumber?: string;

  // Product information
  productDescription?: string;
  quantity?: number;
  unit?: string;

  // Dates (Soll = Planned, Ist = Actual)
  plannedStartDate?: Date; // Soll-Start
  actualStartDate?: Date; // Ist-Start
  plannedEndDate?: Date; // Soll-Ende
  actualEndDate?: Date; // Ist-Ende

  // Resource planning
  plannedHours?: number; // Soll-Stunden
  actualHours?: number; // Ist-Stunden
  resourceName?: string;
  machineId?: string;

  // Progress
  completionPercentage?: number;
  status?: 'planned' | 'in_progress' | 'delayed' | 'completed' | 'on_hold';

  // Variance analysis
  dateVariance?: number; // days difference
  hoursVariance?: number; // hours difference

  // Additional fields
  notes?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ProductionKPI {
  totalWorkOrders: number;
  completedWorkOrders: number;
  delayedWorkOrders: number;
  averageCompletionRate: number; // percentage
  plannedHoursTotal: number;
  actualHoursTotal: number;
  hoursVariance: number;
  efficiencyRate: number; // actual hours / planned hours
}

// Gantt chart specific types
export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number; // 0-100
  dependencies?: string[]; // IDs of dependent tasks
  custom_class?: string; // For styling
  productionEntry: ProductionEntry;
}
