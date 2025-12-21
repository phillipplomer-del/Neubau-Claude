/**
 * Sales Filter Bar Component
 * Quick filters, search, and date filter for sales data
 */

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { FilterMode, SalesFilters, StatusFilter } from '@/hooks/useSalesFilters';

interface SalesFilterBarProps {
  filters: SalesFilters;
  onFilterModeChange: (mode: FilterMode) => void;
  onSearchChange: (query: string) => void;
  onYearChange: (year: string | null) => void;
  onMonthChange: (month: string | null) => void;
  onStatusFilterChange: (status: StatusFilter) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
}

export default function SalesFilterBar({
  filters,
  onFilterModeChange,
  onSearchChange,
  onYearChange,
  onMonthChange,
  onStatusFilterChange,
  onReset,
  totalCount,
  filteredCount,
}: SalesFilterBarProps) {
  // Generate year options (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Month options
  const months = [
    { value: '1', label: 'Januar' },
    { value: '2', label: 'Februar' },
    { value: '3', label: 'März' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mai' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Dezember' },
  ];

  const hasActiveFilters =
    filters.mode !== 'all' ||
    filters.searchQuery !== '' ||
    filters.year !== null ||
    filters.month !== null ||
    filters.statusFilter !== 'all';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={filters.mode === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onFilterModeChange('all')}
          >
            Alle
          </Button>
          <Button
            variant={filters.mode === 'projects' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onFilterModeChange('projects')}
          >
            Projekte
          </Button>
          <Button
            variant={filters.mode === 'articles' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onFilterModeChange('articles')}
          >
            Artikel
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-300"></div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={filters.statusFilter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onStatusFilterChange('all')}
          >
            Alle Status
          </Button>
          <Button
            variant={filters.statusFilter === 'critical' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onStatusFilterChange('critical')}
            className={filters.statusFilter === 'critical' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            🔴 Kritisch
          </Button>
          <Button
            variant={filters.statusFilter === 'at-risk' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onStatusFilterChange('at-risk')}
            className={filters.statusFilter === 'at-risk' ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            🟠 Gefährdet
          </Button>
          <Button
            variant={filters.statusFilter === 'watched' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onStatusFilterChange('watched')}
            className={filters.statusFilter === 'watched' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            🟣 Beobachtet
          </Button>
          <Button
            variant={filters.statusFilter === 'none' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onStatusFilterChange('none')}
          >
            Keine Markierung
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-300"></div>

        {/* Search Field */}
        <div className="flex-1 min-w-[250px]">
          <Input
            id="search"
            type="text"
            placeholder="Suche: Artikelnr., Projektnr., Kunde, Produkt, Projektverantw..."
            value={filters.searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Year Filter */}
        <select
          id="year"
          className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          value={filters.year || ''}
          onChange={(e) => onYearChange(e.target.value || null)}
        >
          <option value="">Alle Jahre</option>
          {years.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </select>

        {/* Month Filter */}
        <select
          id="month"
          className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={filters.month || ''}
          onChange={(e) => onMonthChange(e.target.value || null)}
          disabled={filters.year === null}
        >
          <option value="">Alle Monate</option>
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>

        {/* Reset Button */}
        {hasActiveFilters && (
          <>
            <div className="h-6 w-px bg-gray-300"></div>
            <Button variant="ghost" size="sm" onClick={onReset}>
              Zurücksetzen
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
