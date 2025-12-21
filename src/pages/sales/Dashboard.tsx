/**
 * Sales Dashboard Page
 * Main dashboard for sales data with KPIs, filters, and table
 */

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useSalesData } from '@/hooks/useSalesData';
import { useSalesFilters } from '@/hooks/useSalesFilters';
import { useCommentStatuses } from '@/hooks/useCommentStatuses';
import { useWatchedProjects } from '@/hooks/useWatchedProjects';
import { calculateSalesKPIs } from '@/lib/sales/kpiCalculator';
import { exportSalesToPDF } from '@/lib/sales/salesExport';
import SalesFilterBar from './components/SalesFilterBar';
import SalesTable from './components/SalesTable';
import GroupedProjectsTable from './components/GroupedProjectsTable';
import CommentModal from './components/CommentModal';
import Button from '@/components/ui/Button';
import type { SortingState } from '@tanstack/react-table';
import type { SalesEntry, CommentStatus } from '@/types/sales';
import type { StatusFilter } from '@/hooks/useSalesFilters';

export default function SalesDashboard() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { data, loading, error } = useSalesData();
  const { statusMap } = useCommentStatuses();
  const { watchedProjects } = useWatchedProjects();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedEntry, setSelectedEntry] = useState<SalesEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Combine comment status and watched project status
  const combinedStatusMap = useMemo(() => {
    const combined = new Map<string, CommentStatus>();

    // First, add all comment statuses
    statusMap.forEach((status, entryId) => {
      combined.set(entryId, status);
    });

    // Then, override with 'watched' for all entries with watched projektnummer
    data.forEach((entry) => {
      if (entry.id && entry.projektnummer && watchedProjects.has(entry.projektnummer)) {
        // Only set to 'watched' if not already critical or at-risk
        const currentStatus = combined.get(entry.id);
        if (!currentStatus || currentStatus === 'none') {
          combined.set(entry.id, 'watched');
        }
      }
    });

    return combined;
  }, [statusMap, watchedProjects, data]);

  // Apply filters (but NOT status filters from useSalesFilters)
  const {
    filters,
    setFilterMode,
    setSearchQuery,
    setYear,
    setMonth,
    setStatusFilter,
    resetFilters,
    filteredData: baseFilteredData,
  } = useSalesFilters(data);

  // Apply status filter from Firebase (using combined status map)
  // This uses the base filtered data (search, year, month) but applies status filtering here
  const filteredData = useMemo(() => {
    const statusParam = searchParams.get('status');

    // Handle URL parameter filters (from sidebar)
    if (statusParam === 'critical,at-risk') {
      return baseFilteredData.filter((entry) => {
        if (!entry.id) return false;
        const status = combinedStatusMap.get(entry.id);
        return status === 'critical' || status === 'at-risk';
      });
    }

    if (statusParam === 'watched') {
      return baseFilteredData.filter((entry) => {
        if (!entry.id) return false;
        const status = combinedStatusMap.get(entry.id);
        return status === 'watched';
      });
    }

    if (statusParam === 'critical') {
      return baseFilteredData.filter((entry) => {
        if (!entry.id) return false;
        const status = combinedStatusMap.get(entry.id);
        return status === 'critical';
      });
    }

    if (statusParam === 'at-risk') {
      return baseFilteredData.filter((entry) => {
        if (!entry.id) return false;
        const status = combinedStatusMap.get(entry.id);
        return status === 'at-risk';
      });
    }

    // No URL parameter - apply normal status filter from FilterBar
    if (filters.statusFilter === 'all' || !filters.statusFilter) {
      return baseFilteredData;
    }

    return baseFilteredData.filter((entry) => {
      if (!entry.id) return false;
      const status = combinedStatusMap.get(entry.id);

      if (filters.statusFilter === 'none') {
        return !status || status === 'none';
      }
      return status === filters.statusFilter;
    });
  }, [baseFilteredData, filters.statusFilter, combinedStatusMap, searchParams]);

  // Calculate KPIs from filtered data
  const kpis = useMemo(() => calculateSalesKPIs(filteredData), [filteredData]);

  // Row click handler - open comment modal
  const handleRowClick = (entry: SalesEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  // Get page title based on current filter/view
  const getPageTitle = (): string => {
    const statusParam = searchParams.get('status');

    if (statusParam === 'watched') {
      return 'Beobachtete';
    }
    if (statusParam === 'critical,at-risk') {
      return 'Kritische';
    }
    if (statusParam === 'critical') {
      return 'Kritische';
    }
    if (statusParam === 'at-risk') {
      return 'Gefährdete';
    }

    // Default based on route
    if (location.pathname === '/sales/deliveries') {
      return 'Lieferungen';
    }

    return 'Offene Lieferungen';
  };

  // PDF Export handler
  const handleExportPDF = async () => {
    const hasFilters =
      filters.mode !== 'all' ||
      filters.searchQuery !== '' ||
      filters.year !== null ||
      filters.month !== null;

    await exportSalesToPDF(filteredData, kpis, {
      mode: filters.mode,
      hasFilters,
      searchQuery: filters.searchQuery,
      year: filters.year,
      month: filters.month,
    });
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-900">Fehler beim Laden</h3>
        <p className="mt-2 text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
        {!loading && filteredData.length > 0 && (
          <Button onClick={handleExportPDF} variant="primary" size="sm">
            PDF Export
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      {!loading && data.length > 0 && (
        <SalesFilterBar
          filters={filters}
          onFilterModeChange={setFilterMode}
          onSearchChange={setSearchQuery}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onStatusFilterChange={setStatusFilter}
          onReset={resetFilters}
          totalCount={data.length}
          filteredCount={filteredData.length}
        />
      )}

      {/* Sales Table - use grouped view for "Beobachtete" */}
      {!loading && filteredData.length > 0 && (
        <>
          {searchParams.get('status') === 'watched' ? (
            <GroupedProjectsTable
              data={filteredData}
              onRowClick={handleRowClick}
              statusMap={combinedStatusMap}
            />
          ) : (
            <SalesTable
              data={filteredData}
              sorting={sorting}
              onSortingChange={setSorting}
              onRowClick={handleRowClick}
              statusMap={combinedStatusMap}
            />
          )}
        </>
      )}

      {/* Comment Modal */}
      {selectedEntry && (
        <CommentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEntry(null);
          }}
          entry={selectedEntry}
        />
      )}

      {/* No results after filtering */}
      {!loading && data.length > 0 && filteredData.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-lg font-medium text-gray-900">Keine Ergebnisse</p>
          <p className="mt-2 text-gray-600">
            Keine Einträge entsprechen den aktuellen Filterkriterien.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && data.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-lg font-medium text-gray-900">Keine Daten vorhanden</p>
          <p className="mt-2 text-gray-600">
            Bitte importieren Sie zuerst eine Excel-Datei über die Import-Seite.
          </p>
        </div>
      )}
    </div>
  );
}
