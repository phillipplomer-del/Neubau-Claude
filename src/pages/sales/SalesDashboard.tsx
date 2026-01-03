/**
 * Sales Dashboard Page
 * Comprehensive dashboard with KPIs, charts, and tables
 */

import { useMemo } from 'react';
import { useSalesData } from '@/hooks/useSalesData';
import {
  calculateDashboardKPIs,
  calculateRevenueByMonth,
} from '@/lib/sales/kpiCalculator';
import SalesDashboardKPICards from './components/SalesDashboardKPICards';
import SalesRevenueChart from './components/SalesRevenueChart';
import SalesPipelineFunnel from './components/SalesPipelineFunnel';
import SalesDistributionCharts from './components/SalesDistributionCharts';
import SalesHotLeadsTable from './components/SalesHotLeadsTable';
import SalesUpcomingDeliveries from './components/SalesUpcomingDeliveries';
import SalesRiskTable from './components/SalesRiskTable';
import { RefreshCw } from 'lucide-react';

export default function SalesDashboard() {
  const { data, loading, error, refresh } = useSalesData();

  // Calculate KPIs
  const kpis = useMemo(() => {
    return calculateDashboardKPIs(data);
  }, [data]);

  // Calculate revenue by month
  const revenueByMonth = useMemo(() => {
    return calculateRevenueByMonth(data, 12);
  }, [data]);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Sales Dashboard</h1>
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={refresh}
            className="mt-3 px-4 py-2 text-sm font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sales Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Übersicht aller Vertriebskennzahlen
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50"
          title="Aktualisieren"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <SalesDashboardKPICards kpis={kpis} loading={loading} />

      {/* Charts Row 1: Revenue + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesRevenueChart data={revenueByMonth} loading={loading} />
        </div>
        <div>
          <SalesPipelineFunnel data={kpis.pipelineStages} loading={loading} />
        </div>
      </div>

      {/* Charts Row 2: Distribution Charts */}
      <SalesDistributionCharts
        byCategory={kpis.byCategory}
        bySalesRep={kpis.bySalesRep}
        loading={loading}
      />

      {/* Hot Leads Table */}
      <SalesHotLeadsTable data={data} loading={loading} limit={10} />

      {/* Bottom Row: Upcoming Deliveries + Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesUpcomingDeliveries data={data} loading={loading} />
        <SalesRiskTable data={data} loading={loading} />
      </div>
    </div>
  );
}
