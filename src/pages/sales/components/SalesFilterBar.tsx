/**
 * Sales Filter Bar Component
 * Quick filters, search, and date filter for sales data
 */

import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
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
    <div className="rounded-[var(--radius-card)] bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Quick Filter Chips */}
        <div className="flex items-center gap-2">
          <Chip
            active={filters.mode === 'all'}
            onClick={() => onFilterModeChange('all')}
          >
            Alle
          </Chip>
          <Chip
            active={filters.mode === 'projects'}
            onClick={() => onFilterModeChange('projects')}
          >
            Projekte
          </Chip>
          <Chip
            active={filters.mode === 'articles'}
            onClick={() => onFilterModeChange('articles')}
          >
            Artikel
          </Chip>
        </div>

        <div className="h-6 w-px bg-border/50"></div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2">
          <Chip
            active={filters.statusFilter === 'all'}
            onClick={() => onStatusFilterChange('all')}
          >
            Alle Status
          </Chip>
          <Chip
            active={filters.statusFilter === 'critical'}
            onClick={() => onStatusFilterChange('critical')}
            className={filters.statusFilter === 'critical' ? '!bg-[var(--danger)]' : ''}
          >
            Kritisch
          </Chip>
          <Chip
            active={filters.statusFilter === 'at-risk'}
            onClick={() => onStatusFilterChange('at-risk')}
            className={filters.statusFilter === 'at-risk' ? '!bg-[var(--warning)] !text-foreground' : ''}
          >
            Gefährdet
          </Chip>
          <Chip
            active={filters.statusFilter === 'watched'}
            onClick={() => onStatusFilterChange('watched')}
            className={filters.statusFilter === 'watched' ? '!bg-purple-600' : ''}
          >
            Beobachtet
          </Chip>
          <Chip
            active={filters.statusFilter === 'none'}
            onClick={() => onStatusFilterChange('none')}
          >
            Keine Markierung
          </Chip>
        </div>

        <div className="h-6 w-px bg-border/50"></div>

        {/* Search Field */}
        <div className="flex-1 min-w-[250px]">
          <input
            type="text"
            placeholder="Suche: Artikelnr., Projektnr., Kunde, Produkt, Projektverantw..."
            value={filters.searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 px-4 rounded-[var(--radius-input)] bg-card-muted text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
          />
        </div>

        {/* Year Filter */}
        <select
          id="year"
          className="h-9 rounded-[var(--radius-chip)] border-none bg-card-muted text-foreground px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
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
          className="h-9 rounded-[var(--radius-chip)] border-none bg-card-muted text-foreground px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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
            <div className="h-6 w-px bg-border/50"></div>
            <Button variant="ghost" size="sm" onClick={onReset}>
              Zurücksetzen
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
