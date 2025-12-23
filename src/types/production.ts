/**
 * Production planning specific types
 * Based on "PP_SollIstVergleich" (Planned vs. Actual Comparison)
 */

import { BaseEntry } from './common';

export interface ProductionEntry extends BaseEntry {
  department: 'production';

  // Planning information
  planningNumber?: string;
  workOrderNumber?: string;      // PaNummer
  mainWorkOrderNumber?: string;  // HauptPaNummer

  // Product information
  productDescription?: string;
  quantity?: number;
  unit?: string;

  // Dates (on PA level)
  plannedStartDate?: Date; // StartDatum
  plannedEndDate?: Date;   // EndDatum
  actualStartDate?: Date;
  actualEndDate?: Date;

  // Resource planning (Soll-Ist)
  plannedHours?: number;   // Soll
  actualHours?: number;    // Ist
  plannedCosts?: number;   // Soll €
  actualCosts?: number;    // Ist €
  resourceName?: string;
  machineId?: string;

  // Progress & Status
  completionPercentage?: number; // % Ist
  status?: string;               // PA Status (open/closed)
  active?: boolean | string;     // Aktiv (X = active)

  // Grouping
  group?: string;                // Gruppe

  // Operation (Arbeitsgang)
  operationNumber?: string;      // Arbeitsgangnummer
  notes?: string;                // DescriptionText (Arbeitsgang-Beschreibung)

  // Variance analysis
  dateVariance?: number;
  hoursVariance?: number;

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
