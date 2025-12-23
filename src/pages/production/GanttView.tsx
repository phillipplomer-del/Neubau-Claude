/**
 * Gantt View - Sales-Led
 * Timeline visualization where Sales data is ALWAYS leading.
 * Shows all projects/articles from Sales, with production data added when matched.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSalesLedHierarchy, type SalesLedNode, type ViewMode } from '@/hooks/useSalesLedHierarchy';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Calendar,
  Search,
  Layers,
  Package,
} from 'lucide-react';

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Get date range from hierarchy
 */
function getDateRange(nodes: SalesLedNode[]): { start: Date; end: Date } {
  let minDate: Date | undefined;
  let maxDate: Date | undefined;

  function traverse(node: SalesLedNode) {
    // Check production dates
    if (node.startDate) {
      if (!minDate || node.startDate < minDate) minDate = node.startDate;
    }
    if (node.endDate) {
      if (!maxDate || node.endDate > maxDate) maxDate = node.endDate;
    }
    // Check sales dates (booking/delivery)
    if (node.bookingDate) {
      if (!minDate || node.bookingDate < minDate) minDate = node.bookingDate;
    }
    if (node.deliveryDate) {
      if (!maxDate || node.deliveryDate > maxDate) maxDate = node.deliveryDate;
    }
    node.children.forEach(traverse);
  }

  nodes.forEach(traverse);

  // Default to current month if no dates
  const now = new Date();
  const start = minDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const end = maxDate || new Date(now.getFullYear(), now.getMonth() + 3, 0);

  // Add padding
  const paddedStart = new Date(start);
  paddedStart.setDate(paddedStart.getDate() - 14);
  const paddedEnd = new Date(end);
  paddedEnd.setDate(paddedEnd.getDate() + 14);

  return { start: paddedStart, end: paddedEnd };
}

/**
 * Generate timeline headers
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

    let topLabel: string | undefined;

    switch (zoom) {
      case 'day':
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
      case 'quarter':
        if (currentYear !== lastYear) {
          topLabel = `${currentYear}`;
          lastYear = currentYear;
        }
        const quarter = Math.floor(currentMonth / 3) + 1;
        headers.push({
          date: new Date(current),
          label: `Q${quarter}`,
          isToday: false,
          topLabel,
        });
        current.setMonth(current.getMonth() + 3);
        break;
      case 'year':
        headers.push({
          date: new Date(current),
          label: `${currentYear}`,
          isToday: false,
        });
        current.setFullYear(current.getFullYear() + 1);
        break;
    }
  }

  return headers;
}

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
  const width = Math.max(duration * dayWidth, 20);

  return { left: Math.max(0, left), width };
}

/**
 * Get bar color based on variance
 */
function getBarColor(node: SalesLedNode): string {
  if (!node.plannedHours || node.plannedHours === 0) {
    return 'bg-gray-400 dark:bg-gray-600';
  }

  const variance = (node.actualHours - node.plannedHours) / node.plannedHours;

  if (variance < -0.1) return 'bg-green-500 dark:bg-green-600';
  if (variance > 0.1) return 'bg-red-500 dark:bg-red-600';
  return 'bg-blue-500 dark:bg-blue-600';
}

function formatDate(date: Date | undefined): string {
  if (!date) return '-';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface GanttRowProps {
  node: SalesLedNode;
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
  const hasChildren = node.children.length > 0 && node.type !== 'noProduction';
  const barStyle = node.hasProduction ? calculateBarStyle(node.startDate, node.endDate, timelineStart, timelineEnd, dayWidth) : null;

  // Row styling based on type
  const getRowBgClass = () => {
    switch (node.type) {
      case 'project': return 'bg-muted/50';
      case 'article': return '';
      case 'noProduction': return 'bg-yellow-50 dark:bg-yellow-950/20';
      default: return '';
    }
  };

  // Name styling
  const getNameClass = () => {
    switch (node.type) {
      case 'project': return 'font-semibold text-foreground';
      case 'article': return 'font-medium text-foreground';
      case 'pa': return 'text-foreground';
      case 'operation': return 'text-muted-foreground text-xs';
      case 'noProduction': return 'text-yellow-600 dark:text-yellow-400 italic';
      default: return '';
    }
  };

  return (
    <>
      <div className={`flex border-b border-border/50 hover:bg-muted/30 transition-colors ${getRowBgClass()}`}>
        {/* Left panel - Task name (fixed width, sticky) */}
        <div
          className="flex items-center gap-1 py-2 px-2 border-r border-border bg-background sticky left-0 z-20 w-[300px] min-w-[300px] max-w-[300px] flex-shrink-0"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => onToggle(node.id)}
              className="p-0.5 hover:bg-muted rounded flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-4 flex-shrink-0" />
          )}
          <span className={`text-sm truncate ${getNameClass()}`} title={node.customerName ? `${node.name} - ${node.customerName}` : node.name}>
            {node.type === 'project' && (
              <>
                <span>{node.identifier}</span>
                {node.customerName && (
                  <span className="text-muted-foreground ml-1.5 font-normal">({node.customerName})</span>
                )}
              </>
            )}
            {node.type === 'article' && node.identifier && (
              <>
                <span className="text-muted-foreground mr-1">{node.identifier}:</span>
                {node.name}
              </>
            )}
            {node.type !== 'project' && node.type !== 'article' && node.name}
          </span>
        </div>

        {/* Right panel - Timeline (fixed width for proper bar positioning) */}
        <div
          className="relative h-10 flex-shrink-0"
          style={{ width: `${timelineWidth}px` }}
        >
          {/* Production bar (only if has production data) */}
          {barStyle && node.hasProduction && (() => {
            const sollIstProgress = node.plannedHours > 0
              ? Math.min((node.actualHours / node.plannedHours) * 100, 100)
              : 0;

            return (
              <div
                className={`
                  absolute top-2 h-6 rounded border
                  ${getBarColor(node).replace('bg-', 'border-')}
                  bg-opacity-30 cursor-pointer
                `}
                style={{
                  left: `${barStyle.left}px`,
                  width: `${barStyle.width}px`,
                  backgroundColor: 'rgba(156, 163, 175, 0.2)',
                }}
                title={`${node.name}\n${formatDate(node.startDate)} - ${formatDate(node.endDate)}\nSoll: ${node.plannedHours.toFixed(1)}h | Ist: ${node.actualHours.toFixed(1)}h`}
              >
                <div
                  className={`absolute top-0 left-0 h-full ${getBarColor(node)} rounded-l ${sollIstProgress >= 100 ? 'rounded-r' : ''}`}
                  style={{ width: `${sollIstProgress}%` }}
                />
              </div>
            );
          })()}

          {/* Milestones - BookingDate (blue) and DeliveryDate (purple) */}
          {(node.type === 'project' || node.type === 'article') && (
            <>
              {/* Booking Date */}
              {node.bookingDate && (() => {
                const daysFromStart = Math.ceil(
                  (node.bookingDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
                );
                const position = daysFromStart * dayWidth;
                if (position < 0 || position > timelineWidth) return null;

                return (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 cursor-pointer group"
                    style={{ left: `${position}px` }}
                    title={`Buchung: ${formatDate(node.bookingDate)}`}
                  >
                    <div className="w-4 h-4 bg-blue-500 rotate-45 transform -translate-x-1/2 shadow-md border-2 border-white dark:border-gray-800" />
                  </div>
                );
              })()}

              {/* Delivery Date */}
              {node.deliveryDate && (() => {
                const daysFromStart = Math.ceil(
                  (node.deliveryDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
                );
                const position = daysFromStart * dayWidth;
                if (position < 0 || position > timelineWidth) return null;

                return (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 cursor-pointer group"
                    style={{ left: `${position}px` }}
                    title={`Liefertermin: ${formatDate(node.deliveryDate)}`}
                  >
                    <div className="w-4 h-4 bg-purple-500 rotate-45 transform -translate-x-1/2 shadow-md border-2 border-white dark:border-gray-800" />
                  </div>
                );
              })()}
            </>
          )}
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
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToToday = useRef(false);

  const {
    loading,
    error,
    hierarchy,
    refresh,
    totalProjects,
    totalArticles,
    articlesWithProduction,
    articlesWithoutProduction,
  } = useSalesLedHierarchy({ viewMode, searchQuery });

  // Calculate date range
  const { start: timelineStart, end: timelineEnd } = useMemo(
    () => getDateRange(hierarchy),
    [hierarchy]
  );

  // Generate timeline headers
  const headers = useMemo(
    () => generateTimelineHeaders(timelineStart, timelineEnd, zoom),
    [timelineStart, timelineEnd, zoom]
  );

  const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));

  const timelineWidth = useMemo(() => {
    switch (zoom) {
      case 'day': return headers.length * 30;
      case 'week': return headers.length * 84;
      case 'month': return headers.length * 120;
      case 'quarter': return headers.length * 180;
      case 'year': return headers.length * 200;
    }
  }, [zoom, headers.length]);

  const dayWidth = timelineWidth / totalDays;

  const headerColumnWidth = useMemo(() => {
    switch (zoom) {
      case 'day': return 30;
      case 'week': return 84;
      case 'month': return 120;
      case 'quarter': return 180;
      case 'year': return 200;
    }
  }, [zoom]);

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

  // Collect all expandable node IDs from hierarchy
  const getAllNodeIds = useCallback((nodes: SalesLedNode[]): string[] => {
    const ids: string[] = [];
    const traverse = (node: SalesLedNode) => {
      if (node.children.length > 0 && node.type !== 'noProduction') {
        ids.push(node.id);
      }
      node.children.forEach(traverse);
    };
    nodes.forEach(traverse);
    return ids;
  }, []);

  const expandAll = () => {
    const allIds = getAllNodeIds(hierarchy);
    setExpandedNodes(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Fit to view function - calculates best zoom level
  const fitToView = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const containerWidth = scrollContainerRef.current.clientWidth - 300; // minus left panel
    if (containerWidth <= 0) return;

    const daysPerLevel: Record<ZoomLevel, number> = {
      day: 1,
      week: 7,
      month: 30,
      quarter: 91,
      year: 365,
    };
    const pixelPerUnit: Record<ZoomLevel, number> = {
      day: 30,
      week: 84,
      month: 120,
      quarter: 180,
      year: 200,
    };

    // Find best fit
    const levels: ZoomLevel[] = ['day', 'week', 'month', 'quarter', 'year'];
    for (const level of levels) {
      const unitsNeeded = Math.ceil(totalDays / daysPerLevel[level]);
      const widthNeeded = unitsNeeded * pixelPerUnit[level];
      if (widthNeeded <= containerWidth) {
        setZoom(level);
        return;
      }
    }
    setZoom('year'); // Fallback to most zoomed out
  }, [totalDays]);

  // Track if initial fit has been done
  const hasInitialFit = useRef(false);

  // Auto fit on initial load
  useEffect(() => {
    if (hierarchy.length > 0 && !hasInitialFit.current && scrollContainerRef.current) {
      setTimeout(() => {
        fitToView();
        hasInitialFit.current = true;
      }, 150);
    }
  }, [hierarchy, fitToView]);

  // Debounced search with auto-fit
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Reset expanded nodes when search or view mode changes
  const previousSearch = useRef(searchQuery);
  const previousViewMode = useRef(viewMode);
  useEffect(() => {
    if (searchQuery !== previousSearch.current || viewMode !== previousViewMode.current) {
      previousSearch.current = searchQuery;
      previousViewMode.current = viewMode;
      setExpandedNodes(new Set());
      hasScrolledToToday.current = false;

      // Auto-fit after search/view change with debounce
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        fitToView();
      }, 500); // Wait 500ms after typing stops
    }
  }, [searchQuery, viewMode, fitToView]);

  const scrollToToday = () => {
    if (!scrollContainerRef.current) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysFromStart = Math.ceil((today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    const scrollPosition = daysFromStart * dayWidth - scrollContainerRef.current.clientWidth / 2;

    scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
  };

  // Auto-scroll to today
  useEffect(() => {
    if (hierarchy.length > 0 && !hasScrolledToToday.current && scrollContainerRef.current) {
      setTimeout(() => {
        scrollToToday();
        hasScrolledToToday.current = true;
      }, 100);
    }
  }, [hierarchy, timelineStart, dayWidth]);

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
          <p className="text-muted-foreground">Lade Daten...</p>
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gantt-Ansicht</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {viewMode === 'projects' ? (
              <>
                {totalProjects} Projekte, {totalArticles} Artikel
                {articlesWithoutProduction > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                    ({articlesWithoutProduction} ohne Produktion)
                  </span>
                )}
              </>
            ) : (
              <>
                {totalArticles} Einzelartikel (ohne Projekt)
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <button
              onClick={() => setViewMode('projects')}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1.5 ${viewMode === 'projects' ? 'bg-background shadow' : ''}`}
            >
              <Layers className="h-4 w-4" />
              Projekte
            </button>
            <button
              onClick={() => setViewMode('articles')}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1.5 ${viewMode === 'articles' ? 'bg-background shadow' : ''}`}
            >
              <Package className="h-4 w-4" />
              Einzelartikel
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={viewMode === 'projects' ? 'Projekt suchen...' : 'Artikel suchen...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-background w-64 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <Button variant="outline" size="sm" onClick={scrollToToday}>
            <Calendar className="h-4 w-4 mr-2" />
            Heute
          </Button>

          {/* Expand/Collapse controls */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={expandAll} title="Alle aufklappen">
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} title="Alle zuklappen">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Zoom controls */}
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
          <button
            onClick={() => setZoom('quarter')}
            className={`px-3 py-1 text-sm rounded ${zoom === 'quarter' ? 'bg-background shadow' : ''}`}
          >
            Quartal
          </button>
          <button
            onClick={() => setZoom('year')}
            className={`px-3 py-1 text-sm rounded ${zoom === 'year' ? 'bg-background shadow' : ''}`}
          >
            Jahr
          </button>
        </div>
        <button
          onClick={fitToView}
          className="px-3 py-1 text-sm rounded bg-muted hover:bg-muted/80 border"
          title="Ansicht einpassen"
        >
          Einpassen
        </button>

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

          {/* Milestone legend */}
          <div className="border-l border-border pl-4 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rotate-45" />
              <span className="text-muted-foreground text-xs">Buchung</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-500 rotate-45" />
              <span className="text-muted-foreground text-xs">Liefertermin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      {hierarchy.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground">
              {searchQuery ? 'Keine Ergebnisse' : 'Keine Daten'}
            </p>
            <p className="mt-2 text-muted-foreground">
              {searchQuery
                ? `Keine ${viewMode === 'projects' ? 'Projekte' : 'Artikel'} mit "${searchQuery}" gefunden.`
                : 'Bitte importieren Sie zuerst Sales-Daten.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-hidden">
            {/* Fixed header row */}
            <div className="flex border-b border-border bg-background">
              {/* Fixed left header cell */}
              <div className="min-w-[300px] max-w-[300px] w-[300px] flex-shrink-0 border-r border-border bg-muted/50 flex flex-col">
                <div className="h-7 border-b border-border/50" />
                <div className="py-2 px-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {viewMode === 'projects' ? 'Projekt / Artikel' : 'Artikel'}
                  </span>
                </div>
              </div>
              {/* Scrollable timeline header */}
              <div
                className="overflow-hidden flex-1"
                style={{ marginRight: '0px' }}
              >
                <div
                  className="flex flex-col"
                  style={{
                    width: `${timelineWidth}px`,
                    transform: `translateX(-${(scrollContainerRef.current?.scrollLeft || 0)}px)`,
                  }}
                  id="timeline-header"
                >
                  {/* Top level: Year/Month */}
                  <div className="flex h-7 border-b border-border/50">
                    {headers.map((header, idx) => (
                      <div
                        key={idx}
                        className="text-center text-xs py-1 border-r border-border/50 font-medium text-muted-foreground flex-shrink-0"
                        style={{ width: `${headerColumnWidth}px` }}
                      >
                        {header.topLabel || ''}
                      </div>
                    ))}
                  </div>
                  {/* Bottom level */}
                  <div className="flex">
                    {headers.map((header, idx) => (
                      <div
                        key={idx}
                        className={`
                          text-center text-xs py-2 border-r border-border/50 flex-shrink-0
                          ${header.isToday ? 'bg-primary/10 font-bold' : ''}
                        `}
                        style={{ width: `${headerColumnWidth}px` }}
                      >
                        {header.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable content area */}
            <div
              ref={scrollContainerRef}
              className="overflow-auto max-h-[550px]"
              onScroll={(e) => {
                const header = document.getElementById('timeline-header');
                if (header) {
                  header.style.transform = `translateX(-${e.currentTarget.scrollLeft}px)`;
                }
              }}
            >
              {/* Rows */}
              <div className="relative" style={{ minWidth: `${300 + timelineWidth}px` }}>
                {/* Today line */}
                {todayPosition !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-5 pointer-events-none"
                    style={{ left: `${300 + todayPosition}px` }}
                  />
                )}

                {hierarchy.map((node) => (
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
