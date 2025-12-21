/**
 * KPI Calculator for Sales Data
 * Pure functions to calculate key performance indicators
 */

import type { SalesEntry } from '@/types/sales';

export interface SalesKPIs {
  totalDeliveries: number;
  totalOpenRevenue: number;
  delayedDeliveries: number;
  averageDelay: number;
}

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
