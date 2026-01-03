/**
 * Production Dashboard
 * Overview of production KPIs with focus on on-time delivery
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProductionHierarchy } from '@/hooks/useProductionHierarchy';
import {
  calculateProductionKPIs,
  identifyCriticalOrders,
  calculateTrendData,
} from '@/lib/production/kpiCalculator';
import type { ProductionEntry } from '@/types/production';
import ProductionKPICards from './components/ProductionKPICards';
import ProductionTrendChart from './components/ProductionTrendChart';
import CriticalOrdersTable from './components/CriticalOrdersTable';
import Button from '@/components/ui/Button';
import { RefreshCw, BarChart3, AlertCircle } from 'lucide-react';

/**
 * Convert hierarchy nodes back to flat ProductionEntry list for KPI calculation
 */
function extractEntriesFromHierarchy(
  nodes: ReturnType<typeof useProductionHierarchy>['hierarchy']
): ProductionEntry[] {
  const entries: ProductionEntry[] = [];

  function traverse(nodeList: typeof nodes) {
    for (const node of nodeList) {
      if (node.entry) {
        entries.push(node.entry);
      }
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return entries;
}

export default function ProductionDashboard() {
  const {
    loading,
    error,
    hierarchy,
    flatList,
    refresh,
  } = useProductionHierarchy({ hideCompleted: false }); // Need all data for KPI calculation

  // Extract entries from hierarchy for KPI calculation
  const entries = useMemo(() => {
    return flatList;
  }, [flatList]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    return calculateProductionKPIs(entries);
  }, [entries]);

  // Identify critical orders
  const criticalOrders = useMemo(() => {
    return identifyCriticalOrders(entries);
  }, [entries]);

  // Generate trend data
  const trendData = useMemo(() => {
    return calculateTrendData(entries, 8);
  }, [entries]);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Produktionsdashboard</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-6">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Fehler beim Laden der Daten</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={refresh}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Produktionsdashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {entries.length} Einträge insgesamt
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/production/comparison">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Soll-Ist Vergleich
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <ProductionKPICards kpis={kpis} loading={loading} />

      {/* Charts and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend Chart */}
        <ProductionTrendChart data={trendData} loading={loading} />

        {/* Critical Orders */}
        <CriticalOrdersTable orders={criticalOrders} loading={loading} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Abgeschlossen (Woche)</div>
          <div className="text-lg font-semibold">{kpis.completedThisWeek}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Stunden-Abweichung</div>
          <div className={`text-lg font-semibold ${
            kpis.hoursVariance > 0 ? 'text-red-600 dark:text-red-400' :
            kpis.hoursVariance < 0 ? 'text-green-600 dark:text-green-400' :
            ''
          }`}>
            {kpis.hoursVariance > 0 ? '+' : ''}{kpis.hoursVariance.toFixed(1)}h
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Backlog</div>
          <div className="text-lg font-semibold">{kpis.backlogHours.toLocaleString('de-DE')}h</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Gefährdet</div>
          <div className={`text-lg font-semibold ${
            kpis.atRiskCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''
          }`}>
            {kpis.atRiskCount}
          </div>
        </div>
      </div>
    </div>
  );
}
