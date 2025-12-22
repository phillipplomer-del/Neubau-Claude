/**
 * Project Filters Hook
 * Manages filtering state and logic for project data
 * Default filter mode is 'projects' (only entries with projektnummer)
 */

import { useState, useMemo } from 'react';
import type { SalesEntry } from '@/types/sales';

export type FilterMode = 'all' | 'projects' | 'articles';
export type StatusFilter = 'all' | 'critical' | 'at-risk' | 'watched' | 'none';

export interface ProjectFilters {
  mode: FilterMode;
  searchQuery: string;
  year: string | null;
  month: string | null;
  statusFilter: StatusFilter;
}

export interface UseProjectFiltersReturn {
  filters: ProjectFilters;
  setFilterMode: (mode: FilterMode) => void;
  setSearchQuery: (query: string) => void;
  setYear: (year: string | null) => void;
  setMonth: (month: string | null) => void;
  setStatusFilter: (status: StatusFilter) => void;
  resetFilters: () => void;
  filteredData: SalesEntry[];
}

// Default to 'projects' mode for Projektmanagement
const initialFilters: ProjectFilters = {
  mode: 'projects',
  searchQuery: '',
  year: null,
  month: null,
  statusFilter: 'all',
};

/**
 * Hook for managing project filters
 */
export function useProjectFilters(data: SalesEntry[]): UseProjectFiltersReturn {
  const [filters, setFilters] = useState<ProjectFilters>(initialFilters);

  const setFilterMode = (mode: FilterMode) => {
    setFilters((prev) => ({ ...prev, mode }));
  };

  const setSearchQuery = (searchQuery: string) => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  };

  const setYear = (year: string | null) => {
    setFilters((prev) => ({ ...prev, year, month: null })); // Reset month when year changes
  };

  const setMonth = (month: string | null) => {
    setFilters((prev) => ({ ...prev, month }));
  };

  const setStatusFilter = (statusFilter: StatusFilter) => {
    setFilters((prev) => ({ ...prev, statusFilter }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  // Apply all filters
  const filteredData = useMemo(() => {
    let result = [...data];

    // Filter by mode (Projekte/Artikel)
    if (filters.mode === 'projects') {
      result = result.filter(
        (row) => row.projektnummer !== null && row.projektnummer !== undefined && row.projektnummer !== ''
      );
    } else if (filters.mode === 'articles') {
      result = result.filter(
        (row) => row.projektnummer === null || row.projektnummer === undefined || row.projektnummer === ''
      );
    }

    // Filter by search query
    if (filters.searchQuery.trim() !== '') {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter((row) => {
        const searchableFields = [
          row.artikelnummer,
          row.projektnummer,
          row.customerName,
          row.customerNumber,
          row.productDescription,
          row.deliveryNumber,
          row.projectManager,
        ];

        return searchableFields.some((field) => {
          if (field === null || field === undefined) return false;
          return String(field).toLowerCase().includes(query);
        });
      });
    }

    // Filter by year and month
    if (filters.year !== null) {
      result = result.filter((row) => {
        const deliveryDate = row.deliveryDate;
        if (!deliveryDate) return false;

        const date = typeof deliveryDate === 'string' ? new Date(deliveryDate) : deliveryDate;
        if (isNaN(date.getTime())) return false;

        const year = date.getFullYear();
        if (String(year) !== filters.year) return false;

        // If month filter is set, check month too
        if (filters.month !== null) {
          const month = date.getMonth() + 1; // getMonth() is 0-indexed
          if (String(month) !== filters.month) return false;
        }

        return true;
      });
    }

    return result;
  }, [data, filters]);

  return {
    filters,
    setFilterMode,
    setSearchQuery,
    setYear,
    setMonth,
    setStatusFilter,
    resetFilters,
    filteredData,
  };
}
