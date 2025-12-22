/**
 * Project List Page
 * Main list for project data with filters and grouped table view
 * Default filter mode is 'projects' - shows only entries with projektnummer
 */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSalesData } from '@/hooks/useSalesData';
import { useProjectFilters } from '@/hooks/useProjectFilters';
import { useCommentStatuses } from '@/hooks/useCommentStatuses';
import { useWatchedProjects } from '@/hooks/useWatchedProjects';
import ProjectFilterBar from './components/ProjectFilterBar';
import GroupedProjectsTable from '@/pages/sales/components/GroupedProjectsTable';
import CommentModal from '@/pages/sales/components/CommentModal';
import type { SalesEntry, CommentStatus } from '@/types/sales';

export default function ProjectList() {
  const [searchParams] = useSearchParams();
  const { data, loading, error } = useSalesData();
  const { statusMap } = useCommentStatuses();
  const { watchedProjects } = useWatchedProjects();
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

  // Apply filters - default mode is 'projects'
  const {
    filters,
    setFilterMode,
    setSearchQuery,
    setYear,
    setMonth,
    setStatusFilter,
    resetFilters,
    filteredData: baseFilteredData,
  } = useProjectFilters(data);

  // Apply status filter from Firebase (using combined status map)
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

  // Row click handler - open comment modal
  const handleRowClick = (entry: SalesEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  // Get page title based on current filter/view
  const getPageTitle = (): string => {
    const statusParam = searchParams.get('status');

    if (statusParam === 'watched') {
      return 'Beobachtete Projekte';
    }
    if (statusParam === 'critical,at-risk') {
      return 'Kritische Projekte';
    }
    if (statusParam === 'critical') {
      return 'Kritische Projekte';
    }
    if (statusParam === 'at-risk') {
      return 'Gefährdete Projekte';
    }

    return 'Projekte';
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
      </div>

      {/* Filter Bar */}
      {!loading && data.length > 0 && (
        <ProjectFilterBar
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

      {/* Grouped Projects Table - always use grouped view for expandable projects */}
      {!loading && filteredData.length > 0 && (
        <GroupedProjectsTable
          data={filteredData}
          onRowClick={handleRowClick}
          statusMap={combinedStatusMap}
        />
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
