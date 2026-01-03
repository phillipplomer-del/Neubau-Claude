/**
 * KPI Calculator for Sales Data
 * Pure functions to calculate key performance indicators
 */

import type { SalesEntry, SalesDashboardKPIs, PipelineStage } from '@/types/sales';

export interface SalesKPIs {
  totalDeliveries: number;
  totalOpenRevenue: number;
  delayedDeliveries: number;
  averageDelay: number;
}

// Pipeline stage labels (German)
export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  quote: 'Angebote',
  order: 'Aufträge',
  production: 'In Produktion',
  ready: 'Versandbereit',
  delivered: 'Geliefert',
};

/**
 * Calculate all KPIs from sales data
 */
export function calculateSalesKPIs(data: SalesEntry[]): SalesKPIs {
  if (data.length === 0) {
    return {
      totalDeliveries: 0,
      totalOpenRevenue: 0,
      delayedDeliveries: 0,
      averageDelay: 0,
    };
  }

  let totalOpenRevenue = 0;
  let delayedDeliveries = 0;
  let totalDelay = 0;
  let delayCount = 0;

  for (const entry of data) {
    // Sum open revenue (remainingTurnover or openTurnover)
    const revenue =
      entry.remainingTurnover || entry.openTurnover || 0;
    if (typeof revenue === 'number') {
      totalOpenRevenue += revenue;
    } else if (typeof revenue === 'string') {
      const parsed = parseFloat(revenue.replace(',', '.'));
      if (!isNaN(parsed)) {
        totalOpenRevenue += parsed;
      }
    }

    // Count delayed deliveries
    const delay = entry.delayDays;
    if (delay !== null && delay !== undefined) {
      const delayNum = typeof delay === 'number' ? delay : parseFloat(String(delay));
      if (!isNaN(delayNum) && delayNum > 0) {
        delayedDeliveries++;
        totalDelay += delayNum;
        delayCount++;
      }
    }
  }

  const averageDelay = delayCount > 0 ? totalDelay / delayCount : 0;

  return {
    totalDeliveries: data.length,
    totalOpenRevenue: Math.round(totalOpenRevenue * 100) / 100,
    delayedDeliveries,
    averageDelay: Math.round(averageDelay * 10) / 10,
  };
}

/**
 * Format currency value (German format)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format number (German format with thousand separators)
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value);
}

/**
 * Format currency with intelligent scaling (€, T€, Mio €)
 */
export function formatCurrencyShort(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(2)} Mio €`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)} T€`;
  }
  return `${value.toFixed(0)} €`;
}

/**
 * Calculate Dashboard KPIs from sales data
 */
export function calculateDashboardKPIs(
  data: SalesEntry[],
  previousPeriodData?: SalesEntry[]
): SalesDashboardKPIs {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Helper to get revenue value
  const getRevenue = (entry: SalesEntry): number => {
    const value = entry.remainingTurnover || entry.openTurnover || entry.totalPrice || 0;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(String(value).replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to get delay days
  const getDelayDays = (entry: SalesEntry): number => {
    const delay = entry.delayDays;
    if (delay === null || delay === undefined) return 0;
    const delayNum = typeof delay === 'number' ? delay : parseFloat(String(delay));
    return isNaN(delayNum) ? 0 : delayNum;
  };

  // Main KPI calculations
  let pipelineValue = 0;
  let monthlyOrders = 0;
  let openDeliveries = 0;
  let delayedOrders = 0;
  let totalMargin = 0;
  let marginCount = 0;

  // Category aggregation
  const byCategory = {
    A: { count: 0, value: 0 },
    B: { count: 0, value: 0 },
    C: { count: 0, value: 0 },
  };

  // Sales rep aggregation
  const salesRepMap = new Map<string, { count: number; value: number }>();

  // Pipeline stages
  const stageMap = new Map<string, { count: number; value: number }>();
  const stages: PipelineStage[] = ['quote', 'order', 'production', 'ready', 'delivered'];
  stages.forEach(stage => stageMap.set(stage, { count: 0, value: 0 }));

  // Process each entry
  for (const entry of data) {
    const revenue = getRevenue(entry);
    const delayDays = getDelayDays(entry);

    // Pipeline value (all open entries)
    if (entry.status !== 'completed' && entry.status !== 'cancelled') {
      pipelineValue += revenue;
      openDeliveries++;
    }

    // Monthly orders (bookingDate in current month)
    if (entry.bookingDate) {
      const bookingDate = entry.bookingDate instanceof Date
        ? entry.bookingDate
        : new Date(entry.bookingDate);
      if (bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear) {
        monthlyOrders++;
      }
    }

    // Delayed orders
    if (delayDays > 0) {
      delayedOrders++;
    }

    // Margin (if available via extended entry)
    const extEntry = entry as SalesEntry & { marginPercent?: number; category?: 'A' | 'B' | 'C'; salesRep?: string; pipelineStage?: PipelineStage };
    if (extEntry.marginPercent !== undefined) {
      totalMargin += extEntry.marginPercent;
      marginCount++;
    }

    // Category aggregation
    const category = extEntry.category || 'C'; // Default to C
    if (category in byCategory) {
      byCategory[category].count++;
      byCategory[category].value += revenue;
    }

    // Sales rep aggregation
    const salesRep = extEntry.salesRep || entry.projectManager || 'Unbekannt';
    const repData = salesRepMap.get(salesRep) || { count: 0, value: 0 };
    repData.count++;
    repData.value += revenue;
    salesRepMap.set(salesRep, repData);

    // Pipeline stage
    const stage = extEntry.pipelineStage || inferPipelineStage(entry);
    const stageData = stageMap.get(stage) || { count: 0, value: 0 };
    stageData.count++;
    stageData.value += revenue;
    stageMap.set(stage, stageData);
  }

  // Calculate previous period values for trend comparison
  let prevPipelineValue = 0;
  let prevMonthlyOrders = 0;
  let prevDelayedOrders = 0;

  if (previousPeriodData) {
    for (const entry of previousPeriodData) {
      const revenue = getRevenue(entry);
      const delayDays = getDelayDays(entry);

      if (entry.status !== 'completed' && entry.status !== 'cancelled') {
        prevPipelineValue += revenue;
      }
      prevMonthlyOrders++;
      if (delayDays > 0) {
        prevDelayedOrders++;
      }
    }
  }

  // Calculate percentage changes
  const calcChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Convert salesRepMap to sorted array (top 5)
  const bySalesRep = Array.from(salesRepMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Pipeline stages array
  const pipelineStages = stages.map(stage => ({
    stage: PIPELINE_STAGE_LABELS[stage],
    ...stageMap.get(stage)!,
  }));

  return {
    pipelineValue: Math.round(pipelineValue * 100) / 100,
    monthlyOrders,
    planVsActualPercent: 0, // Requires planned data
    openDeliveries,
    delayedOrders,
    averageMargin: marginCount > 0 ? Math.round((totalMargin / marginCount) * 10) / 10 : 0,

    pipelineValueChange: Math.round(calcChange(pipelineValue, prevPipelineValue) * 10) / 10,
    monthlyOrdersChange: Math.round(calcChange(monthlyOrders, prevMonthlyOrders) * 10) / 10,
    delayedOrdersChange: Math.round(calcChange(delayedOrders, prevDelayedOrders) * 10) / 10,

    byCategory,
    bySalesRep,
    revenueByMonth: [], // Will be calculated separately
    pipelineStages,
  };
}

/**
 * Infer pipeline stage from entry status
 */
function inferPipelineStage(entry: SalesEntry): PipelineStage {
  if (entry.status === 'completed') return 'delivered';
  if (entry.deliveryStatus?.toLowerCase().includes('versand')) return 'ready';
  if (entry.deliveryStatus?.toLowerCase().includes('produktion')) return 'production';
  if (entry.status === 'open') return 'order';
  return 'order';
}

/**
 * Calculate revenue by month for chart
 */
export function calculateRevenueByMonth(
  data: SalesEntry[],
  months: number = 12
): Array<{ month: string; plan: number; actual: number }> {
  const now = new Date();
  const result: Array<{ month: string; plan: number; actual: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });

    let actual = 0;
    for (const entry of data) {
      const bookingDate = entry.bookingDate instanceof Date
        ? entry.bookingDate
        : entry.bookingDate ? new Date(entry.bookingDate) : null;

      if (bookingDate &&
          bookingDate.getMonth() === date.getMonth() &&
          bookingDate.getFullYear() === date.getFullYear()) {
        actual += entry.totalPrice || entry.openTurnover || 0;
      }
    }

    result.push({
      month: monthStr,
      plan: 0, // Would need planned data
      actual: Math.round(actual),
    });
  }

  return result;
}
