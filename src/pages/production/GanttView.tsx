/**
 * Gantt View
 * Timeline visualization of production orders with hierarchical structure
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useProductionHierarchy, type HierarchyNode } from '@/hooks/useProductionHierarchy';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
  Search,
} from 'lucide-react';

type ZoomLevel = 'day' | 'week' | 'month';

/**
 * Get date range from hierarchy
 */
function getDateRange(nodes: HierarchyNode[]): { start: Date; end: Date } {
  let minDate: Date | undefined;
  let maxDate: Date | undefined;

  function traverse(node: HierarchyNode) {
    if (node.startDate) {
      if (!minDate || node.startDate < minDate) minDate = node.startDate;
    }
    if (node.endDate) {
      if (!maxDate || node.endDate > maxDate) maxDate = node.endDate;
    }
    node.children.forEach(traverse);
  }

  nodes.forEach(traverse);

  // Default to current month if no dates
  const now = new Date();
  const start = minDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const end = maxDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Add padding
  const paddedStart = new Date(start);
  paddedStart.setDate(paddedStart.getDate() - 7);
  const paddedEnd = new Date(end);
  paddedEnd.setDate(paddedEnd.getDate() + 7);

  return { start: paddedStart, end: paddedEnd };
}

/**
 * Generate timeline headers based on zoom level
 * Returns two-level headers: top (year/month) and bottom (week/day)
 */
function generateTimelineHeaders(
  start: Date,
  end: Date,
  zoom: ZoomLevel
): { date: Date; label: string; isToday: boolean; topLabel?: string }[] {
  const headers: { date: Date; label: string; isToday: boolean; topLabel?: string }[] = [];
  const current = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  let lastMonth = -1;
  let lastYear = -1;

  while (current <= end) {
    const isToday = current.getTime() === today.getTime();
    const currentMonth = current.getMonth();
    const currentYear = current.getFullYear();

    // Determine if we need a new top-level label
    let topLabel: string | undefined;

    switch (zoom) {
      case 'day':
        // Show month/year when month changes
        if (currentMonth !== lastMonth || currentYear !== lastYear) {
          topLabel = `${monthNames[currentMonth]} ${currentYear}`;
          lastMonth = currentMonth;
          lastYear = currentYear;
        }
        headers.push({
          date: new Date(current),
          label: `${current.getDate()}`,
          isToday,
          topLabel,
        });
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        // Show month/year when month changes
        if (currentMonth !== lastMonth || currentYear !== lastYear) {
          topLabel = `${monthNames[currentMonth]} ${currentYear}`;
          lastMonth = currentMonth;
          lastYear = currentYear;
        }
        headers.push({
          date: new Date(current),
          label: `KW${getWeekNumber(current)}`,
          isToday: false,
          topLabel,
        });
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        // Show year when year changes
        if (currentYear !== lastYear) {
          topLabel = `${currentYear}`;
          lastYear = currentYear;
        }
        headers.push({
          date: new Date(current),
          label: monthNames[currentMonth],
          isToday: false,
          topLabel,
        });
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return headers;
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

/**
 * Calculate bar position and width
 */
function calculateBarStyle(
  nodeStart: Date | undefined,
  nodeEnd: Date | undefined,
  timelineStart: Date,
  timelineEnd: Date,
  dayWidth: number
): { left: number; width: number } | null {
  if (!nodeStart || !nodeEnd) return null;

  const startOffset = Math.ceil((nodeStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
  const duration = Math.ceil((nodeEnd.getTime() - nodeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const left = startOffset * dayWidth;
  const width = Math.max(duration * dayWidth, 20); // Min width 20px

  return { left: Math.max(0, left), width };
}

/**
 * Get bar color based on variance
 */
function getBarColor(node: HierarchyNode): string {
  if (!node.plannedHours || node.plannedHours === 0) {
    return 'bg-gray-400 dark:bg-gray-600';
  }

  const variance = (node.actualHours - node.plannedHours) / node.plannedHours;

  if (variance < -0.1) return 'bg-green-500 dark:bg-green-600'; // Under budget
  if (variance > 0.1) return 'bg-red-500 dark:bg-red-600';       // Over budget
  return 'bg-blue-500 dark:bg-blue-600';                          // On budget
}

/**
 * Format date for tooltip
 */
function formatDate(date: Date | undefined): string {
  if (!date) return '-';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Find description from node's entry or first child entry
 */
function findDescription(node: HierarchyNode): string | undefined {
  // If node has an entry, use its productDescription or notes
  if (node.entry) {
    return node.entry.productDescription || node.entry.notes;
  }

  // Otherwise search children
  for (const child of node.children) {
    const desc = findDescription(child);
    if (desc) return desc;
  }

  return undefined;
}

interface GanttRowProps {
  node: HierarchyNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  timelineStart: Date;
  timelineEnd: Date;
  dayWidth: number;
  timelineWidth: number;
}

function GanttRow({
  node,
  level,
  expandedNodes,
  onToggle,
  timelineStart,
  timelineEnd,
  dayWidth,
  timelineWidth,
}: GanttRowProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const barStyle = calculateBarStyle(node.startDate, node.endDate, timelineStart, timelineEnd, dayWidth);

  // Get display name - for PA level, use description from entry if available
  const getDisplayName = () => {
    if (node.type === 'pa' || node.type === 'mainPA') {
      // Try to get description from first child entry or find a description
      const description = findDescription(node);
      if (description) {
        return `${node.identifier}: ${description}`;
      }
    }
    return node.name;
  };

  const displayName = getDisplayName();

  return (
    <>
      <div className="flex border-b border-border/50 hover:bg-muted/30 transition-colors">
        {/* Left panel - Task name */}
        <div
          className="flex items-center gap-1 py-2 px-2 border-r border-border bg-background sticky left-0 z-10 min-w-[250px] max-w-[250px]"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => onToggle(node.id)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
          <span className="text-sm truncate" title={displayName}>
            {displayName}
          </span>
        </div>

        {/* Right panel - Timeline */}
        <div
          className="relative h-10 flex-1"
          style={{ minWidth: `${timelineWidth}px` }}
        >
          {/* Bar */}
          {barStyle && (() => {
            // Calculate Ist/Soll progress percentage
            const sollIstProgress = node.plannedHours > 0
              ? Math.min((node.actualHours / node.plannedHours) * 100, 100)
              : 0;
            const isSmallBar = barStyle.width < 80;
            const label = node.identifier || node.name;

            return (
              <>
                <div
                  className={`
                    absolute top-2 h-6 rounded border
                    ${getBarColor(node).replace('bg-', 'border-')}
                    bg-opacity-30 cursor-pointer group
                  `}
                  style={{
                    left: `${barStyle.left}px`,
                    width: `${barStyle.width}px`,
                    backgroundColor: 'rgba(156, 163, 175, 0.2)', // Light gray background
                  }}
                  title={`${node.name}\n${formatDate(node.startDate)} - ${formatDate(node.endDate)}\nSoll: ${node.plannedHours.toFixed(1)}h | Ist: ${node.actualHours.toFixed(1)}h (${sollIstProgress.toFixed(0)}%)`}
                >
                  {/* Soll/Ist fill - shows actual progress */}
                  <div
                    className={`absolute top-0 left-0 h-full ${getBarColor(node)} rounded-l ${sollIstProgress >= 100 ? 'rounded-r' : ''}`}
                    style={{ width: `${sollIstProgress}%` }}
                  />

                  {/* Label inside bar (only for large bars) */}
                  {!isSmallBar && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium truncate px-1 z-10 drop-shadow-sm">
                      {label}
                    </span>
                  )}
                </div>

                {/* Label outside bar (for small bars) */}
                {isSmallBar && (
                  <span
                    className="absolute top-2.5 text-xs text-foreground font-medium truncate whitespace-nowrap"
                    style={{ left: `${barStyle.left + barStyle.width + 4}px`, maxWidth: '150px' }}
                  >
                    {label}
                  </span>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Children */}
      {isExpanded && node.children.map((child) => (
        <GanttRow
          key={child.id}
          node={child}
          level={level + 1}
          expandedNodes={expandedNodes}
          onToggle={onToggle}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
          dayWidth={dayWidth}
          timelineWidth={timelineWidth}
        />
      ))}
    </>
  );
}

export default function GanttView() {
  const [hideCompleted, setHideCompleted] = useState(true);
  const [projectSearch, setProjectSearch] = useState('');

  const {
    loading,
    error,
    hierarchy,
    flatList,
    refresh,
    filteredEntries,
    completedCount,
    totalEntries,
  } = useProductionHierarchy({ hideCompleted });

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToToday = useRef(false);

  // Filter hierarchy by project search
  const filteredHierarchy = useMemo(() => {
    if (!projectSearch.trim()) return [];

    const query = projectSearch.trim().toLowerCase();

    return hierarchy.filter(node => {
      // Match project nodes by identifier or name
      if (node.type === 'project') {
        return node.identifier.toLowerCase().includes(query) ||
               node.name.toLowerCase().includes(query);
      }
      return false;
    });
  }, [hierarchy, projectSearch]);

  // Calculate date range based on filtered hierarchy
  const { start: timelineStart, end: timelineEnd } = useMemo(
    () => getDateRange(filteredHierarchy.length > 0 ? filteredHierarchy : hierarchy),
    [filteredHierarchy, hierarchy]
  );

  // Generate timeline headers
  const headers = useMemo(
    () => generateTimelineHeaders(timelineStart, timelineEnd, zoom),
    [timelineStart, timelineEnd, zoom]
  );

  // Total days in the timeline
  const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate timeline width based on headers (not days)
  // This ensures headers align correctly with the timeline
  const timelineWidth = useMemo(() => {
    switch (zoom) {
      case 'day': return headers.length * 30;     // 30px per day
      case 'week': return headers.length * 84;    // 84px per week
      case 'month': return headers.length * 120;  // 120px per month
    }
  }, [zoom, headers.length]);

  // Width per day (for bar positioning) = total width / total days
  const dayWidth = timelineWidth / totalDays;

  // Column width for headers (visual width per header cell)
  const headerColumnWidth = useMemo(() => {
    switch (zoom) {
      case 'day': return 30;     // 1 day = 30px
      case 'week': return 84;    // 1 week = 84px
      case 'month': return 120;  // 1 month = 120px
    }
  }, [zoom]);

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Keep all nodes collapsed when project is searched (don't auto-expand)
  useEffect(() => {
    if (filteredHierarchy.length > 0) {
      // Reset expanded nodes - start collapsed
      setExpandedNodes(new Set());
      // Reset scroll flag so we scroll to today for new search
      hasScrolledToToday.current = false;
    }
  }, [filteredHierarchy]);

  // Scroll to today
  const scrollToToday = () => {
    if (!scrollContainerRef.current) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysFromStart = Math.ceil((today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    const scrollPosition = daysFromStart * dayWidth - scrollContainerRef.current.clientWidth / 2;

    scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
  };

  // Auto-scroll to today when chart is first displayed
  useEffect(() => {
    if (filteredHierarchy.length > 0 && !hasScrolledToToday.current && scrollContainerRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        scrollToToday();
        hasScrolledToToday.current = true;
      }, 100);
    }
  }, [filteredHierarchy, timelineStart, dayWidth]);

  // Calculate today line position
  const todayPosition = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today < timelineStart || today > timelineEnd) return null;

    const daysFromStart = (today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    return daysFromStart * dayWidth;
  }, [timelineStart, timelineEnd, dayWidth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Lade Produktionsdaten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (flatList.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted p-12 text-center">
        <p className="text-lg font-medium text-foreground">Keine Produktionsdaten vorhanden</p>
        <p className="mt-2 text-muted-foreground">
          Bitte importieren Sie zuerst eine Produktions-Excel-Datei über die Import-Seite.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gantt-Ansicht</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredHierarchy.length > 0 ? (
              <>
                {filteredHierarchy.length} Projekt{filteredHierarchy.length !== 1 ? 'e' : ''} gefunden
              </>
            ) : projectSearch.trim() ? (
              <>Kein Projekt gefunden</>
            ) : (
              <>Projekt suchen, um Gantt anzuzeigen</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Project search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Projektnummer eingeben..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-background w-64 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <Button variant="outline" size="sm" onClick={scrollToToday} disabled={filteredHierarchy.length === 0}>
            <Calendar className="h-4 w-4 mr-2" />
            Heute
          </Button>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Zoom controls - only show when project is selected */}
      {filteredHierarchy.length > 0 && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Zoom:</span>
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <button
              onClick={() => setZoom('day')}
              className={`px-3 py-1 text-sm rounded ${zoom === 'day' ? 'bg-background shadow' : ''}`}
            >
              Tag
            </button>
            <button
              onClick={() => setZoom('week')}
              className={`px-3 py-1 text-sm rounded ${zoom === 'week' ? 'bg-background shadow' : ''}`}
            >
              Woche
            </button>
            <button
              onClick={() => setZoom('month')}
              className={`px-3 py-1 text-sm rounded ${zoom === 'month' ? 'bg-background shadow' : ''}`}
            >
              Monat
            </button>
          </div>

          {/* Toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="rounded border-border"
            />
            <span>Abgeschlossene ausblenden</span>
          </label>

          {/* Legend */}
          <div className="flex items-center gap-4 ml-auto text-sm">
            <div className="flex items-center gap-1">
              <div className="w-6 h-3 rounded border border-green-500 bg-gray-200 relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-1/2 bg-green-500" />
              </div>
              <span className="text-muted-foreground">Unter Soll</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-3 rounded border border-blue-500 bg-gray-200 relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-3/4 bg-blue-500" />
              </div>
              <span className="text-muted-foreground">Im Soll</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-3 rounded border border-red-500 bg-gray-200 relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-full bg-red-500" />
              </div>
              <span className="text-muted-foreground">Über Soll</span>
            </div>
            <span className="text-muted-foreground/60 text-xs ml-2">(Füllung = Ist/Soll)</span>
          </div>
        </div>
      )}

      {/* Gantt Chart or Empty State */}
      {filteredHierarchy.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground">
              {projectSearch.trim() ? 'Kein Projekt gefunden' : 'Projekt suchen'}
            </p>
            <p className="mt-2 text-muted-foreground">
              {projectSearch.trim()
                ? `Kein Projekt mit "${projectSearch}" gefunden. Bitte prüfen Sie die Projektnummer.`
                : 'Geben Sie eine Projektnummer ein, um das Gantt-Diagramm anzuzeigen.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div
              ref={scrollContainerRef}
              className="overflow-auto max-h-[600px]"
            >
              {/* Timeline header - two levels */}
              <div className="sticky top-0 bg-background z-20">
                {/* Top level: Year/Month */}
                <div className="flex border-b border-border">
                  <div className="min-w-[250px] max-w-[250px] border-r border-border bg-muted/50 sticky left-0 z-30" />
                  <div className="flex" style={{ minWidth: `${timelineWidth}px` }}>
                    {headers.map((header, idx) => (
                      <div
                        key={idx}
                        className="text-center text-xs py-1 border-r border-border/50 font-medium text-muted-foreground"
                        style={{ width: `${headerColumnWidth}px`, minWidth: `${headerColumnWidth}px` }}
                      >
                        {header.topLabel || ''}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Bottom level: Week/Day/Month */}
                <div className="flex border-b border-border">
                  <div className="min-w-[250px] max-w-[250px] border-r border-border bg-muted/50 py-2 px-3 sticky left-0 z-30">
                    <span className="text-sm font-medium text-muted-foreground">Aufgabe</span>
                  </div>
                  <div className="flex" style={{ minWidth: `${timelineWidth}px` }}>
                    {headers.map((header, idx) => (
                      <div
                        key={idx}
                        className={`
                          text-center text-xs py-2 border-r border-border/50
                          ${header.isToday ? 'bg-primary/10 font-bold' : ''}
                        `}
                        style={{ width: `${headerColumnWidth}px`, minWidth: `${headerColumnWidth}px` }}
                      >
                        {header.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rows */}
              <div className="relative">
                {/* Today line */}
                {todayPosition !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                    style={{ left: `${250 + todayPosition}px` }}
                  />
                )}

                {filteredHierarchy.map((node) => (
                  <GanttRow
                    key={node.id}
                    node={node}
                    level={0}
                    expandedNodes={expandedNodes}
                    onToggle={toggleNode}
                    timelineStart={timelineStart}
                    timelineEnd={timelineEnd}
                    dayWidth={dayWidth}
                    timelineWidth={timelineWidth}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
