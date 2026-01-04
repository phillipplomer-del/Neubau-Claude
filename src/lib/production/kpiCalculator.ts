/**
 * KPI Calculator for Production Data
 * Pure functions to calculate key performance indicators for the Production Dashboard
 */

import type {
  ProductionEntry,
  ProductionDashboardKPIs,
  CriticalOrder,
  CriticalOrderStatus,
  ProductionTrendDataPoint,
} from '@/types/production';

// Days threshold for "at risk" classification
const AT_RISK_THRESHOLD_DAYS = 3;

/**
 * Calculate all Dashboard KPIs from production data
 */
export function calculateProductionKPIs(
  data: ProductionEntry[],
  previousWeekData?: ProductionEntry[]
): ProductionDashboardKPIs {
  const now = new Date();
  const weekStart = getWeekStart(now);

  // Initialize counters
  let openOrders = 0;
  let completedThisWeek = 0;
  let overdueCount = 0;
  let atRiskCount = 0;
  let totalDelayDays = 0;
  let delayedCount = 0;
  let completedOnTime = 0;
  let completedTotal = 0;
  let totalPlannedHours = 0;
  let totalActualHours = 0;
  let backlogHours = 0;

  for (const entry of data) {
    const isOpen = entry.status !== 'closed' && entry.status !== 'completed';
    const isCompleted = entry.status === 'closed' || entry.status === 'completed';

    // Open orders
    if (isOpen) {
      openOrders++;
      backlogHours += entry.plannedHours || 0;
    }

    // Completed this week
    if (isCompleted && entry.actualEndDate) {
      const completedDate = entry.actualEndDate instanceof Date
        ? entry.actualEndDate
        : new Date(entry.actualEndDate);
      if (completedDate >= weekStart) {
        completedThisWeek++;
      }
    }

    // Delay analysis for open orders
    if (isOpen && entry.plannedEndDate) {
      const plannedEnd = entry.plannedEndDate instanceof Date
        ? entry.plannedEndDate
        : new Date(entry.plannedEndDate);
      const daysUntilDue = Math.ceil((plannedEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 0) {
        // Overdue
        overdueCount++;
        totalDelayDays += Math.abs(daysUntilDue);
        delayedCount++;
      } else if (daysUntilDue <= AT_RISK_THRESHOLD_DAYS) {
        // At risk
        atRiskCount++;
      }
    }

    // On-time delivery rate (for completed orders)
    if (isCompleted) {
      completedTotal++;
      const wasOnTime = !entry.dateVariance || entry.dateVariance <= 0;
      if (wasOnTime) {
        completedOnTime++;
      }
    }

    // Hours variance
    totalPlannedHours += entry.plannedHours || 0;
    totalActualHours += entry.actualHours || 0;
  }

  // Calculate previous week values for comparison
  let prevOpenOrders = 0;
  let prevOverdueCount = 0;
  let prevDelayDays = 0;
  let prevDelayedCount = 0;
  let prevCompletedOnTime = 0;
  let prevCompletedTotal = 0;

  if (previousWeekData) {
    for (const entry of previousWeekData) {
      const isOpen = entry.status !== 'closed' && entry.status !== 'completed';
      const isCompleted = entry.status === 'closed' || entry.status === 'completed';

      if (isOpen) {
        prevOpenOrders++;
        if (entry.dateVariance && entry.dateVariance > 0) {
          prevOverdueCount++;
          prevDelayDays += entry.dateVariance;
          prevDelayedCount++;
        }
      }

      if (isCompleted) {
        prevCompletedTotal++;
        if (!entry.dateVariance || entry.dateVariance <= 0) {
          prevCompletedOnTime++;
        }
      }
    }
  }

  // Calculate KPIs
  const onTimeDeliveryRate = completedTotal > 0
    ? Math.round((completedOnTime / completedTotal) * 1000) / 10
    : 100;

  const averageDelayDays = delayedCount > 0
    ? Math.round((totalDelayDays / delayedCount) * 10) / 10
    : 0;

  const hoursVariance = Math.round((totalActualHours - totalPlannedHours) * 10) / 10;

  // Calculate changes vs previous week
  const prevOnTimeRate = prevCompletedTotal > 0
    ? (prevCompletedOnTime / prevCompletedTotal) * 100
    : 100;
  const prevAvgDelay = prevDelayedCount > 0
    ? prevDelayDays / prevDelayedCount
    : 0;

  return {
    onTimeDeliveryRate,
    overdueCount,
    averageDelayDays,
    atRiskCount,
    openOrders,
    completedThisWeek,
    hoursVariance,
    backlogHours: Math.round(backlogHours),

    onTimeDeliveryRateChange: Math.round((onTimeDeliveryRate - prevOnTimeRate) * 10) / 10,
    overdueCountChange: overdueCount - prevOverdueCount,
    averageDelayDaysChange: Math.round((averageDelayDays - prevAvgDelay) * 10) / 10,
    openOrdersChange: openOrders - prevOpenOrders,
  };
}

/**
 * Identify critical orders (overdue or at risk)
 */
export function identifyCriticalOrders(data: ProductionEntry[]): CriticalOrder[] {
  const now = new Date();
  const criticalOrders: CriticalOrder[] = [];

  for (const entry of data) {
    const isOpen = entry.status !== 'closed' && entry.status !== 'completed';

    if (!isOpen || !entry.plannedEndDate) continue;

    const plannedEnd = entry.plannedEndDate instanceof Date
      ? entry.plannedEndDate
      : new Date(entry.plannedEndDate);
    const daysUntilDue = Math.ceil((plannedEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let status: CriticalOrderStatus;
    if (daysUntilDue < 0) {
      status = 'overdue';
    } else if (daysUntilDue <= AT_RISK_THRESHOLD_DAYS) {
      status = 'at_risk';
    } else {
      continue; // Not critical
    }

    criticalOrders.push({
      id: entry.id || entry.workOrderNumber || '',
      projektnummer: entry.projektnummer || entry.workOrderNumber || 'Unbekannt',
      name: entry.productDescription || entry.workOrderNumber || 'Unbekannt',
      dueDate: plannedEnd,
      delayDays: daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0,
      status,
      hoursVariance: entry.hoursVariance,
    });
  }

  // Sort: overdue first, then by delay days (descending)
  return criticalOrders.sort((a, b) => {
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (a.status !== 'overdue' && b.status === 'overdue') return 1;
    return b.delayDays - a.delayDays;
  });
}

/**
 * Generate trend data for the last N weeks
 */
export function calculateTrendData(
  data: ProductionEntry[],
  weeks: number = 8
): ProductionTrendDataPoint[] {
  const result: ProductionTrendDataPoint[] = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() - (i * 7));
    const weekNumber = getWeekNumber(weekDate);
    const weekLabel = `KW${String(weekNumber).padStart(2, '0')}`;

    // For demo/placeholder: generate reasonable mock data
    // In production, this would filter data by week
    const baseRate = 92 + Math.random() * 6;
    const overdueBase = Math.floor(3 + Math.random() * 5);
    const openBase = Math.floor(40 + Math.random() * 15);

    result.push({
      week: weekLabel,
      onTimeRate: Math.round(baseRate * 10) / 10,
      overdueCount: overdueBase,
      openOrders: openBase,
    });
  }

  return result;
}

/**
 * Format number with German locale
 */
export function formatNumber(value: number, decimals: number = 1): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format hours with unit
 */
export function formatHours(value: number): string {
  return `${formatNumber(value, 1)}h`;
}

/**
 * Get the start of the current week (Monday)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
