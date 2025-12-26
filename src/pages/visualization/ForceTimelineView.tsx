/**
 * Force Timeline Visualization
 * Shows Verkaufsartikel on a timeline based on deliveryDate
 *
 * NEW APPROACH: Lane-based Layout
 * 1. Calculate maximum tree size (fully expanded) for each Verkaufsartikel
 * 2. Assign exclusive horizontal "lanes" to each tree
 * 3. Position trees within their lanes
 * 4. Connection lines are guaranteed not to cross
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useProductionHierarchy, type HierarchyNode } from '@/hooks/useProductionHierarchy';
import { useSalesData } from '@/hooks/useSalesData';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { RefreshCw, AlertCircle, Maximize2, Minimize2, Shuffle, Expand, Shrink } from 'lucide-react';

// Timeline node with position info
interface TimelineNode {
  id: string;
  type: 'article' | 'pa' | 'operation';
  name: string;
  identifier: string;
  deliveryDate: Date;
  x: number;
  y: number;
  radius: number;
  color: string;
  depth: number;
  parentId?: string;
  rootId: string;
  laneIndex: number; // Which lane this tree belongs to
  isAbove: boolean; // Above or below timeline
  parentAngle: number; // Angle from parent - children inherit this direction
  plannedHours: number;
  actualHours: number;
  completionPercentage: number;
  isCompleted: boolean;
  isOverdue: boolean; // Active but end date is in the past
  children: TimelineNode[];
}

// Tree metadata for lane calculation
interface TreeMeta {
  id: string;
  article: HierarchyNode;
  deliveryDate: Date;
  timelineX: number;
  maxDescendants: number; // Total nodes when fully expanded
  maxWidth: number; // Estimated width when expanded
  maxHeight: number; // Estimated height when expanded
  isAbove: boolean;
  laneIndex: number;
  laneX: number; // Center X of assigned lane
}

// Colors by type
const COLORS_LIGHT = {
  article: '#00DEE0',
  unterartikel: '#00B8D4',
  pa: '#0050E0',
  operation: '#00C9A7',
  axis: '#94a3b8',
  baseline: '#e2e8f0',
};

const COLORS_DARK = {
  article: '#9EE000',
  unterartikel: '#45F600',
  pa: '#B8E000',
  operation: '#D4E040',
  axis: '#4a5568',
  baseline: '#374151',
};

// Node sizes
const NODE_SIZES = {
  article: 18,
  unterartikel: 14,
  pa: 10,
  operation: 6,
};

// Lane spacing constants
const LANE_MIN_WIDTH = 80; // Wider lanes
const LANE_PADDING = 20; // More padding between lanes
const TREE_BASE_Y_OFFSET = 80; // Distance from timeline to tree root (much further)
const TREE_VERTICAL_STAGGER = 25; // More vertical stagger between trees

// Dark mode hook
function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

function getWeekOptions(minDate: Date, maxDate: Date): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const current = new Date(minDate);

  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  current.setDate(diff);

  while (current <= maxDate) {
    const week = getWeekNumber(current);
    const year = getWeekYear(current);
    const shortYear = year % 100;
    const value = `${year}-W${String(week).padStart(2, '0')}`;
    const label = `KW${week}/${shortYear}`;
    options.push({ value, label });
    current.setDate(current.getDate() + 7);
  }

  return options;
}

function parseWeekRange(value: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = value.split('-W');
  const year = parseInt(yearStr!, 10);
  const week = parseInt(weekStr!, 10);

  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay() || 7;

  const firstMonday = new Date(jan1);
  if (dayOfWeek <= 4) {
    firstMonday.setDate(jan1.getDate() - dayOfWeek + 1);
  } else {
    firstMonday.setDate(jan1.getDate() + 8 - dayOfWeek);
  }

  const start = new Date(firstMonday);
  start.setDate(firstMonday.getDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

// Month helper functions
const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function getMonthOptions(minDate: Date, maxDate: Date): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

  while (current <= maxDate) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const shortYear = year % 100;
    const value = `${year}-M${String(month + 1).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[month]}/${shortYear}`;
    options.push({ value, label });
    current.setMonth(current.getMonth() + 1);
  }

  return options;
}

function parseMonthRange(value: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = value.split('-M');
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10) - 1; // 0-indexed

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // Last day of month

  return { start, end };
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatHours(hours: number): string {
  if (hours < 1) return `${(hours * 60).toFixed(0)} min`;
  return `${hours.toFixed(1)} h`;
}

// Count all descendants of a node (for max tree size calculation)
// This ALWAYS counts the full tree, regardless of current expansion state
function countAllDescendants(node: HierarchyNode): number {
  let count = 1; // Count self
  node.children.forEach(child => {
    count += countAllDescendants(child);
  });
  return count;
}

// Count branches (Unterartikel) for width estimation
function countBranches(node: HierarchyNode): number {
  return node.children.filter(c => c.type === 'article').length;
}

// Find the maximum number of children at any level (for radius calculation)
function findMaxChildrenPerLevel(node: HierarchyNode): number {
  let maxChildren = node.children.length;
  node.children.forEach(child => {
    maxChildren = Math.max(maxChildren, findMaxChildrenPerLevel(child));
  });
  return maxChildren;
}

// Estimate tree dimensions when FULLY expanded
// Reduced width calculation for more compact trees
function estimateTreeSize(node: HierarchyNode): { width: number; height: number; descendants: number } {
  const descendants = countAllDescendants(node);
  const maxChildrenPerLevel = findMaxChildrenPerLevel(node);

  // Compact width calculation
  const baseWidth = 50;
  const widthPerChild = 10;
  const width = Math.max(baseWidth, baseWidth + (maxChildrenPerLevel - 1) * widthPerChild);

  // Height based on depth levels
  const height = Math.min(180, descendants * 6);

  return { width, height, descendants };
}

export default function ForceTimelineView() {
  const isDark = useDarkMode();
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform | null>(null);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
  const nodesRef = useRef<TimelineNode[]>([]);

  const { hierarchy, loading: hierarchyLoading, error: hierarchyError, refresh: refreshHierarchy } = useProductionHierarchy({
    hideCompleted: false,
  });
  const { data: salesData, loading: salesLoading, error: salesError, refresh: refreshSales } = useSalesData();

  const [timeUnit, setTimeUnit] = useState<'week' | 'month'>('week');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [showUnterartikel, setShowUnterartikel] = useState(false);
  const [showPAs, setShowPAs] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<TimelineNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ node: TimelineNode; x: number; y: number } | null>(null);
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());

  const loading = hierarchyLoading || salesLoading;
  const error = hierarchyError || salesError;

  const refresh = () => {
    refreshHierarchy();
    refreshSales();
  };

  // Reorganize function: animate outward, then animate back
  const handleReorganize = () => {
    if (!simulationRef.current || nodesRef.current.length === 0) return;

    const simulation = simulationRef.current;
    const nodes = nodesRef.current;
    simulation.stop();

    // Find root nodes
    const rootNodes = new Map<string, TimelineNode>();
    nodes.forEach(n => {
      if (n.depth === 0) rootNodes.set(n.rootId, n);
    });

    // Calculate target positions (pushed out)
    const startPositions = new Map<string, { x: number; y: number }>();
    const targetPositions = new Map<string, { x: number; y: number }>();

    nodes.forEach(node => {
      startPositions.set(node.id, { x: node.x, y: node.y });

      if (node.depth === 0) {
        targetPositions.set(node.id, { x: node.x, y: node.y });
      } else {
        const root = rootNodes.get(node.rootId);
        if (root) {
          const dx = node.x - root.x;
          const dy = node.y - root.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const factor = 5;
            targetPositions.set(node.id, {
              x: root.x + dx * factor,
              y: root.y + dy * factor,
            });
          } else {
            targetPositions.set(node.id, { x: node.x, y: node.y });
          }
        } else {
          targetPositions.set(node.id, { x: node.x, y: node.y });
        }
      }
    });

    // Animate outward over 400ms
    const outwardDuration = 400;
    const outwardStart = performance.now();

    const animateOutward = (now: number) => {
      const elapsed = now - outwardStart;
      const t = Math.min(1, elapsed / outwardDuration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);

      nodes.forEach(node => {
        const start = startPositions.get(node.id)!;
        const target = targetPositions.get(node.id)!;
        node.x = start.x + (target.x - start.x) * eased;
        node.y = start.y + (target.y - start.y) * eased;
      });

      // Trigger re-render
      simulation.alpha(0.001).restart();
      simulation.stop();

      if (t < 1) {
        requestAnimationFrame(animateOutward);
      } else {
        // Outward complete - now let force simulation animate back
        simulation.alpha(0.5).restart();
      }
    };

    requestAnimationFrame(animateOutward);
  };

  // Expand/Collapse all levels at once
  const allExpanded = showUnterartikel && showPAs && showOperations;
  const handleExpandCollapseAll = () => {
    if (allExpanded) {
      // Collapse all
      setShowOperations(false);
      setShowPAs(false);
      setShowUnterartikel(false);
      setExpandedRoots(new Set()); // Clear individual expansions
    } else {
      // Expand all
      setShowUnterartikel(true);
      setShowPAs(true);
      setShowOperations(true);
    }
  };

  // Toggle expansion for a single root article
  const handleToggleRootExpansion = (rootId: string) => {
    setExpandedRoots(prev => {
      const next = new Set(prev);
      if (next.has(rootId)) {
        next.delete(rootId);
      } else {
        next.add(rootId);
      }
      return next;
    });
    setContextMenu(null);
  };

  // Reorganize a single tree - animate outward, then back (only affects this tree)
  const handleReorganizeSingleTree = (rootId: string) => {
    if (!simulationRef.current || nodesRef.current.length === 0) return;

    const simulation = simulationRef.current;
    const nodes = nodesRef.current;
    simulation.stop();

    // Find the root node for this tree
    const rootNode = nodes.find(n => n.id === rootId && n.depth === 0);
    if (!rootNode) return;

    // Save positions of OTHER trees (these stay fixed)
    const otherTreePositions = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => {
      if (node.rootId !== rootId) {
        otherTreePositions.set(node.id, { x: node.x, y: node.y });
      }
    });

    // Calculate target positions for THIS tree only
    const startPositions = new Map<string, { x: number; y: number }>();
    const targetPositions = new Map<string, { x: number; y: number }>();

    nodes.forEach(node => {
      if (node.rootId !== rootId) return;

      startPositions.set(node.id, { x: node.x, y: node.y });

      if (node.depth === 0) {
        targetPositions.set(node.id, { x: node.x, y: node.y });
      } else {
        const dx = node.x - rootNode.x;
        const dy = node.y - rootNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const factor = 6;
          targetPositions.set(node.id, {
            x: rootNode.x + dx * factor,
            y: rootNode.y + dy * factor,
          });
        } else {
          targetPositions.set(node.id, { x: node.x, y: node.y });
        }
      }
    });

    // Animate outward over 400ms
    const outwardDuration = 400;
    const outwardStart = performance.now();

    const animateOutward = (now: number) => {
      const elapsed = now - outwardStart;
      const t = Math.min(1, elapsed / outwardDuration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);

      // Animate this tree's nodes
      nodes.forEach(node => {
        if (node.rootId === rootId) {
          const start = startPositions.get(node.id)!;
          const target = targetPositions.get(node.id)!;
          node.x = start.x + (target.x - start.x) * eased;
          node.y = start.y + (target.y - start.y) * eased;
        }
      });

      // Keep other trees fixed
      otherTreePositions.forEach((pos, id) => {
        const node = nodes.find(n => n.id === id);
        if (node) {
          node.x = pos.x;
          node.y = pos.y;
        }
      });

      // Trigger re-render
      simulation.alpha(0.001).restart();
      simulation.stop();

      if (t < 1) {
        requestAnimationFrame(animateOutward);
      } else {
        // Outward complete - now let force simulation animate back
        // But keep restoring other trees during the simulation
        const originalTick = simulation.on('tick');
        simulation.on('tick', () => {
          otherTreePositions.forEach((pos, id) => {
            const node = nodes.find(n => n.id === id);
            if (node) {
              node.x = pos.x;
              node.y = pos.y;
            }
          });
          if (originalTick) originalTick();
        });
        simulation.alpha(0.5).restart();
      }
    };

    requestAnimationFrame(animateOutward);
    setContextMenu(null);
  };

  // Close context menu when clicking elsewhere
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const deliveryDateMap = useMemo(() => {
    const map = new Map<string, Date>();
    salesData.forEach(entry => {
      if (entry.artikelnummer && entry.deliveryDate) {
        map.set(entry.artikelnummer, new Date(entry.deliveryDate));
      }
    });
    return map;
  }, [salesData]);

  const dateRange = useMemo(() => {
    const dates = salesData
      .filter(e => e.deliveryDate)
      .map(e => new Date(e.deliveryDate!));

    if (dates.length === 0) {
      const now = new Date();
      return {
        min: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        max: new Date(now.getFullYear(), now.getMonth() + 4, 0),
      };
    }

    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));

    min.setDate(min.getDate() - 14);
    max.setDate(max.getDate() + 14);

    return { min, max };
  }, [salesData]);

  const weekOptions = useMemo(() => {
    return getWeekOptions(dateRange.min, dateRange.max);
  }, [dateRange]);

  const monthOptions = useMemo(() => {
    return getMonthOptions(dateRange.min, dateRange.max);
  }, [dateRange]);

  useEffect(() => {
    if (weekOptions.length > 0 && !selectedWeek) {
      const now = new Date();
      const currentWeek = getWeekNumber(now);
      const currentYear = getWeekYear(now);
      const defaultWeek = `${currentYear}-W${String(currentWeek).padStart(2, '0')}`;

      const weekOpt = weekOptions.find(o => o.value >= defaultWeek) || weekOptions[0];
      setSelectedWeek(weekOpt?.value || weekOptions[0]?.value || '');
    }
  }, [weekOptions, selectedWeek]);

  useEffect(() => {
    if (monthOptions.length > 0 && !selectedMonth) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const defaultMonth = `${currentYear}-M${String(currentMonth).padStart(2, '0')}`;

      const monthOpt = monthOptions.find(o => o.value >= defaultMonth) || monthOptions[0];
      setSelectedMonth(monthOpt?.value || monthOptions[0]?.value || '');
    }
  }, [monthOptions, selectedMonth]);

  const verkaufsartikelWithDates = useMemo(() => {
    const result: Array<{
      article: HierarchyNode;
      deliveryDate: Date;
      project: HierarchyNode;
    }> = [];

    hierarchy
      .filter(node => node.type === 'project' && node.isActive)
      .forEach(project => {
        project.children
          .filter(child =>
            child.type === 'article' &&
            child.identifier !== '100' &&
            child.isMainArticle === true
          )
          .forEach(article => {
            const deliveryDate = deliveryDateMap.get(article.identifier);
            if (deliveryDate) {
              result.push({ article, deliveryDate, project });
            }
          });
      });

    return result;
  }, [hierarchy, deliveryDateMap]);

  const filteredArticles = useMemo(() => {
    let start: Date, end: Date;

    if (timeUnit === 'week') {
      if (!selectedWeek) return [];
      ({ start, end } = parseWeekRange(selectedWeek));
    } else {
      if (!selectedMonth) return [];
      ({ start, end } = parseMonthRange(selectedMonth));
    }

    return verkaufsartikelWithDates.filter(item => {
      return item.deliveryDate >= start && item.deliveryDate <= end;
    });
  }, [verkaufsartikelWithDates, selectedWeek, selectedMonth, timeUnit]);

  // D3 Rendering with Lane-based Layout
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 500;
    const margin = { top: 40, right: 40, bottom: 80, left: 40 };

    svg.selectAll('*').remove();

    if (filteredArticles.length === 0) return;

    // Get date range based on selected time unit
    const { start: startDate, end: endDate } = timeUnit === 'week'
      ? parseWeekRange(selectedWeek)
      : parseMonthRange(selectedMonth);

    // X Scale (time)
    const xScale = d3.scaleTime()
      .domain([startDate, endDate])
      .range([margin.left, width - margin.right]);

    // Timeline Y position
    const timelineY = height - margin.bottom;

    // ============================================
    // STEP 1: Calculate tree metadata (max sizes)
    // ============================================
    const treeMetas: TreeMeta[] = filteredArticles.map(item => {
      const { width: maxWidth, height: maxHeight, descendants } = estimateTreeSize(item.article);
      return {
        id: item.article.id,
        article: item.article,
        deliveryDate: item.deliveryDate,
        timelineX: xScale(item.deliveryDate),
        maxDescendants: descendants,
        maxWidth,
        maxHeight,
        isAbove: false, // Will be set later
        laneIndex: 0,
        laneX: 0,
      };
    });

    // Sort by timeline X position (left to right)
    treeMetas.sort((a, b) => a.timelineX - b.timelineX);

    // ============================================
    // STEP 2: Assign lanes (alternating above/below)
    // ============================================
    const lanesAbove: TreeMeta[] = [];
    const lanesBelow: TreeMeta[] = [];

    treeMetas.forEach((meta, index) => {
      // Alternate: even goes above, odd goes below
      if (index % 2 === 0) {
        meta.isAbove = true;
        meta.laneIndex = lanesAbove.length;
        lanesAbove.push(meta);
      } else {
        meta.isAbove = false;
        meta.laneIndex = lanesBelow.length;
        lanesBelow.push(meta);
      }
    });

    // ============================================
    // STEP 3: Calculate lane X positions
    // CENTERED: Position lanes directly at their timeline X
    // No rightward bias - let simulation handle collisions
    // ============================================
    function assignLanePositions(lanes: TreeMeta[]) {
      if (lanes.length === 0) return;

      // Simply position each lane at its timeline X position
      // The tree bounding box collision will separate them if needed
      lanes.forEach(meta => {
        meta.laneX = meta.timelineX;
      });
    }

    assignLanePositions(lanesAbove);
    assignLanePositions(lanesBelow);

    // ============================================
    // STEP 4: Build visible nodes based on current expansion
    // ============================================
    const allNodes: TimelineNode[] = [];
    const links: Array<{ source: string; target: string }> = [];

    function buildNodes(
      node: HierarchyNode,
      meta: TreeMeta,
      depth: number,
      parentNode: TimelineNode | null,
      childIndex: number
    ): TimelineNode | null {
      // Determine if this node should be shown
      const isRoot = depth === 0;
      const isUnterartikel = depth === 1 && node.type === 'article';
      const isPA = node.type === 'pa' || node.type === 'mainPA';
      const isOperation = node.type === 'operation';

      if (!isRoot) {
        // Check global expansion OR individual root expansion
        const rootExpanded = expandedRoots.has(meta.id);
        if (isUnterartikel && !showUnterartikel && !rootExpanded) return null;
        if (isPA && !showPAs && !rootExpanded) return null;
        if (isOperation && !showOperations && !rootExpanded) return null;
        if (hideCompleted && node.isCompleted) return null;
      }

      // Determine node type for coloring/sizing
      let nodeType: 'article' | 'pa' | 'operation' = 'article';
      let colorKey = 'article';
      if (isUnterartikel) {
        colorKey = 'unterartikel';
      } else if (isPA) {
        nodeType = 'pa';
        colorKey = 'pa';
      } else if (isOperation) {
        nodeType = 'operation';
        colorKey = 'operation';
      }

      // Calculate position within the lane
      // Root is at lane center, children spread outward
      // Use smaller vertical stagger to keep trees closer together
      const baseY = meta.isAbove
        ? timelineY - TREE_BASE_Y_OFFSET - meta.laneIndex * TREE_VERTICAL_STAGGER
        : timelineY + TREE_BASE_Y_OFFSET + meta.laneIndex * TREE_VERTICAL_STAGGER;

      let x: number, y: number;
      let nodeAngle: number = meta.isAbove ? -Math.PI / 2 : Math.PI / 2; // Default: away from timeline

      // Get the root node position for radial calculation
      const rootX = meta.laneX;
      const rootY = baseY;

      if (isRoot) {
        x = rootX;
        y = rootY;
        // Root has no parent angle, use default
      } else if (parentNode) {
        // RADIAL EXPANSION: Position relative to ROOT (not parent)
        // All children spread radially from the tree's center (root node)

        // Count siblings at this level
        const numSiblings = parentNode.children.length || 1;

        // Distance from root increases with depth - more spread out
        const baseRadius = 450; // Base distance from root (9x original)
        const radiusPerDepth = 45; // Additional distance per depth level (increased)
        const totalRadius = baseRadius + (depth - 1) * radiusPerDepth;

        // Calculate angle based on position in the full tree
        // Use a VERY NARROW sector (almost purely vertical)
        const sectorStart = meta.isAbove ? -Math.PI * 0.62 : Math.PI * 0.38; // Very narrow
        const sectorEnd = meta.isAbove ? -Math.PI * 0.38 : Math.PI * 0.62;   // Very narrow
        const sectorRange = sectorEnd - sectorStart;

        // For first-level children (Unterartikel), spread evenly across the sector
        if (depth === 1) {
          if (numSiblings === 1) {
            nodeAngle = meta.isAbove ? -Math.PI / 2 : Math.PI / 2; // Straight up/down
          } else {
            const t = childIndex / (numSiblings - 1);
            nodeAngle = sectorStart + t * sectorRange;
          }
        } else {
          // Deeper levels: spread around parent's angle with smaller arc
          const parentAngle = parentNode.parentAngle;
          const spreadArc = Math.PI * 0.3 / depth; // Smaller spread at deeper levels

          if (numSiblings === 1) {
            nodeAngle = parentAngle;
          } else {
            const t = childIndex / (numSiblings - 1);
            nodeAngle = parentAngle + (t - 0.5) * spreadArc;
          }
        }

        // Position radially from ROOT
        x = rootX + Math.cos(nodeAngle) * totalRadius;
        y = rootY + Math.sin(nodeAngle) * totalRadius;
      } else {
        x = rootX;
        y = rootY;
      }

      // Determine if node is overdue (active, not completed, end date in the past)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue = node.isActive &&
                        !node.isCompleted &&
                        node.endDate !== undefined &&
                        node.endDate < today;

      const timelineNode: TimelineNode = {
        id: node.id,
        type: nodeType,
        name: node.name,
        identifier: node.identifier,
        deliveryDate: meta.deliveryDate,
        x,
        y,
        radius: NODE_SIZES[colorKey as keyof typeof NODE_SIZES] || NODE_SIZES.article,
        color: COLORS[colorKey as keyof typeof COLORS] || COLORS.article,
        depth,
        parentId: parentNode?.id,
        rootId: meta.id,
        laneIndex: meta.laneIndex,
        isAbove: meta.isAbove,
        parentAngle: nodeAngle, // Store the angle for children to inherit
        plannedHours: node.plannedHours,
        actualHours: node.actualHours,
        completionPercentage: node.completionPercentage,
        isCompleted: node.isCompleted,
        isOverdue,
        children: [],
      };

      allNodes.push(timelineNode);

      if (parentNode) {
        links.push({ source: parentNode.id, target: node.id });
      }

      // Process children
      let validChildIndex = 0;
      node.children.forEach(child => {
        const childNode = buildNodes(child, meta, depth + 1, timelineNode, validChildIndex);
        if (childNode) {
          timelineNode.children.push(childNode);
          validChildIndex++;
        }
      });

      return timelineNode;
    }

    treeMetas.forEach(meta => {
      buildNodes(meta.article, meta, 0, null, 0);
    });

    // Store nodes in ref for reorganize function
    nodesRef.current = allNodes;

    // ============================================
    // STEP 5: Apply force simulation for fine-tuning
    // (within lanes, not crossing lanes)
    // ============================================

    // Create a map for quick node lookup
    const nodeMap = new Map<string, TimelineNode>();
    allNodes.forEach(n => nodeMap.set(n.id, n));

    // Convert links to use node references
    const linkObjects = links.map(l => ({
      source: nodeMap.get(l.source)!,
      target: nodeMap.get(l.target)!,
    })).filter(l => l.source && l.target);

    // ============================================
    // Helper: Calculate bounding box for a set of nodes
    // ============================================
    interface BoundingBox {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      centerX: number;
      centerY: number;
      nodes: TimelineNode[];
    }

    function calculateBounds(nodes: TimelineNode[], padding = 15): BoundingBox {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        minX = Math.min(minX, n.x - n.radius - padding);
        maxX = Math.max(maxX, n.x + n.radius + padding);
        minY = Math.min(minY, n.y - n.radius - padding);
        maxY = Math.max(maxY, n.y + n.radius + padding);
      });
      return {
        minX, maxX, minY, maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        nodes,
      };
    }

    // ============================================
    // Force: Tree Bounding Box Collision
    // ============================================
    function forceTreeBoundingBoxes(alpha: number) {
      // Group nodes by rootId
      const treeGroups = new Map<string, TimelineNode[]>();
      allNodes.forEach(node => {
        if (!treeGroups.has(node.rootId)) {
          treeGroups.set(node.rootId, []);
        }
        treeGroups.get(node.rootId)!.push(node);
      });

      const treeBounds: Array<BoundingBox & { rootId: string; isAbove: boolean }> = [];
      treeGroups.forEach((nodes, rootId) => {
        const rootNode = nodes.find(n => n.id === rootId);
        if (rootNode) {
          treeBounds.push({
            ...calculateBounds(nodes, 20),
            rootId,
            isAbove: rootNode.isAbove,
          });
        }
      });

      // Check pairs on same side
      for (let i = 0; i < treeBounds.length; i++) {
        for (let j = i + 1; j < treeBounds.length; j++) {
          const b1 = treeBounds[i]!;
          const b2 = treeBounds[j]!;

          if (b1.isAbove !== b2.isAbove) continue;

          // Check overlap
          const overlapX = Math.max(0, Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX));
          const overlapY = Math.max(0, Math.min(b1.maxY, b2.maxY) - Math.max(b1.minY, b2.minY));

          if (overlapX > 0 && overlapY > 0) {
            // Push apart horizontally
            const dx = b2.centerX - b1.centerX;
            const pushStrength = alpha * 0.8;
            const push = (overlapX / 2 + 20) * pushStrength;

            const dir = dx > 0 ? 1 : -1;
            b1.nodes.forEach(n => { n.x -= dir * push; });
            b2.nodes.forEach(n => { n.x += dir * push; });
          }
        }
      }
    }

    // ============================================
    // Force: Branch Bounding Box Collision (within each tree)
    // Branch = Unterartikel + all its sub-articles + all PAs (complete subtree)
    // ============================================
    function forceBranchBoundingBoxes(alpha: number) {
      // For each tree, get the branches (children of root = Unterartikel)
      const treeGroups = new Map<string, TimelineNode[]>();
      allNodes.forEach(node => {
        if (!treeGroups.has(node.rootId)) {
          treeGroups.set(node.rootId, []);
        }
        treeGroups.get(node.rootId)!.push(node);
      });

      treeGroups.forEach((treeNodes, rootId) => {
        const rootNode = treeNodes.find(n => n.id === rootId);
        if (!rootNode) return;

        // Find Unterartikel (depth 1, direct children of root)
        const branches: TimelineNode[][] = [];
        const unterartikel = treeNodes.filter(n => n.parentId === rootId && n.depth === 1);

        unterartikel.forEach(ua => {
          // Collect the complete subtree: Unterartikel + all nested articles + PAs + operations
          const branchNodes: TimelineNode[] = [ua];

          const collectAllDescendants = (parentId: string) => {
            treeNodes.forEach(n => {
              if (n.parentId === parentId) {
                branchNodes.push(n);
                collectAllDescendants(n.id); // Recursively get all descendants
              }
            });
          };

          collectAllDescendants(ua.id);

          // Only add branches with nodes
          if (branchNodes.length > 0) {
            branches.push(branchNodes);
          }
        });

        // Check branch pairs for overlap - gentle separation
        for (let i = 0; i < branches.length; i++) {
          for (let j = i + 1; j < branches.length; j++) {
            const b1 = calculateBounds(branches[i]!, 8);
            const b2 = calculateBounds(branches[j]!, 8);

            const overlapX = Math.max(0, Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX));
            const overlapY = Math.max(0, Math.min(b1.maxY, b2.maxY) - Math.max(b1.minY, b2.minY));

            if (overlapX > 0 && overlapY > 0) {
              const dx = b2.centerX - b1.centerX;
              const dy = b2.centerY - b1.centerY;
              const pushStrength = alpha * 0.4; // Gentler push

              // Push in the direction of greater overlap (minimal movement)
              if (overlapX < overlapY) {
                // Horizontal push (smaller overlap = easier to resolve)
                const push = (overlapX / 2 + 5) * pushStrength;
                const dir = dx > 0 ? 1 : -1;
                b1.nodes.forEach(n => { n.x -= dir * push; });
                b2.nodes.forEach(n => { n.x += dir * push; });
              } else {
                // Vertical push (away from timeline)
                const push = (overlapY / 2 + 5) * pushStrength;
                const dir = dy > 0 ? 1 : -1;
                b1.nodes.forEach(n => { n.y -= dir * push; });
                b2.nodes.forEach(n => { n.y += dir * push; });
              }
            }
          }
        }
      });
    }

    const simulation = d3.forceSimulation(allNodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(linkObjects)
        .distance((d: any) => {
          // Match the radial layout: radiusPerDepth = 45
          return 45;
        })
        .strength(0.8) // Moderate strength for radial layout
      )
      .force('collide', d3.forceCollide<TimelineNode>()
        .radius(d => d.radius + 4) // Tighter collision
        .strength(0.6)
      )
      // Only pull ROOT nodes to lane center (not children - they follow via links)
      .force('laneX', d3.forceX<TimelineNode>()
        .x(d => {
          if (d.depth !== 0) return d.x; // Children stay where they are
          const meta = treeMetas.find(m => m.id === d.rootId);
          return meta?.laneX || d.x;
        })
        .strength(d => d.depth === 0 ? 0.2 : 0) // Only apply to roots
      )
      // Keep nodes away from timeline (barrier)
      .force('barrier', () => {
        allNodes.forEach(node => {
          const minDist = 35; // Reduced to keep trees closer
          if (node.isAbove) {
            if (node.y > timelineY - minDist) {
              node.y = timelineY - minDist;
            }
          } else {
            if (node.y < timelineY + minDist) {
              node.y = timelineY + minDist;
            }
          }
        });
      })
      // Tree bounding box collision
      .force('treeBounds', (alpha: number) => forceTreeBoundingBoxes(alpha))
      // Branch bounding box collision (gentler)
      .force('branchBounds', (alpha: number) => forceBranchBoundingBoxes(alpha * 0.5))
      .alphaDecay(0.003) // Ultra slow decay = very slow animation
      .velocityDecay(0.55) // High friction = very slow, visible flow back
      .alpha(0.6); // Lower start energy

    // Store simulation in ref for reorganize function
    simulationRef.current = simulation;

    // ============================================
    // STEP 6: Render
    // ============================================
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        zoomTransformRef.current = event.transform;
      });

    svg.call(zoom);

    // Create defs for filters (glow effect for overdue nodes)
    const defs = svg.append('defs');

    // Red glow filter for overdue nodes
    const glowFilter = defs.append('filter')
      .attr('id', 'overdue-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');

    glowFilter.append('feColorMatrix')
      .attr('in', 'blur')
      .attr('type', 'matrix')
      .attr('values', '1 0 0 0 0  0 0.2 0 0 0  0 0 0.2 0 0  0 0 0 1 0')
      .attr('result', 'redGlow');

    glowFilter.append('feMerge')
      .selectAll('feMergeNode')
      .data(['redGlow', 'SourceGraphic'])
      .enter()
      .append('feMergeNode')
      .attr('in', d => d);

    const g = svg.append('g');

    if (zoomTransformRef.current) {
      g.attr('transform', zoomTransformRef.current.toString());
      svg.call(zoom.transform, zoomTransformRef.current);
    }

    // Draw X axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(d3.timeDay.every(1))
      .tickFormat(d => {
        const date = d as Date;
        const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        return `${dayNames[date.getDay()]} ${date.getDate()}.`;
      });

    const axisGroup = g.append('g')
      .attr('transform', `translate(0, ${timelineY})`)
      .call(xAxis);

    axisGroup.selectAll('text')
      .attr('fill', isDark ? '#a3a3a3' : '#525252')
      .attr('font-size', 9)
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em');

    axisGroup.select('.domain')
      .attr('stroke', COLORS.article)
      .attr('stroke-width', 3);

    axisGroup.selectAll('.tick line')
      .attr('stroke', COLORS.axis)
      .attr('stroke-width', 1);

    // Week labels
    const weeks = d3.timeMondays(startDate, endDate);
    g.selectAll('.week-label')
      .data(weeks)
      .enter()
      .append('text')
      .attr('x', d => xScale(d))
      .attr('y', timelineY + 55)
      .attr('text-anchor', 'start')
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .attr('fill', isDark ? '#d4d4d4' : '#374151')
      .text(d => {
        const week = getWeekNumber(d);
        const year = getWeekYear(d) % 100;
        return `KW${week}/${year}`;
      });

    // Connection lines group
    const linesGroup = g.append('g').attr('class', 'lines');

    // Timeline dots
    linesGroup.selectAll('.timeline-dot')
      .data(treeMetas)
      .enter()
      .append('circle')
      .attr('class', 'timeline-dot')
      .attr('cx', d => d.timelineX)
      .attr('cy', timelineY)
      .attr('r', 6)
      .attr('fill', COLORS.article)
      .attr('fill-opacity', 0.9);

    // Connection lines from timeline to tree roots
    const rootNodes = allNodes.filter(n => n.depth === 0);

    const timelineLinks = linesGroup.selectAll('.timeline-link')
      .data(rootNodes)
      .enter()
      .append('path')
      .attr('class', 'timeline-link')
      .attr('stroke', COLORS.article)
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.7)
      .attr('fill', 'none');

    // Child connection lines
    const childLinks = linesGroup.selectAll('.child-link')
      .data(linkObjects)
      .enter()
      .append('line')
      .attr('class', 'child-link')
      .attr('stroke', COLORS.axis)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4);

    // Draw nodes
    const nodeGroups = g.selectAll('.node')
      .data(allNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, TimelineNode>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Circles
    nodeGroups.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('fill-opacity', d => d.isCompleted ? 1 : 0.3 + d.completionPercentage / 100 * 0.7)
      .attr('stroke', d => d.isOverdue ? '#ef4444' : (isDark ? '#1A1A12' : '#ffffff'))
      .attr('stroke-width', d => d.isOverdue ? 3 : 2)
      .attr('filter', d => d.isOverdue ? 'url(#overdue-glow)' : null)
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', d.radius * 1.3);

        setHoveredNode(d);
        setTooltipPos({ x: event.pageX, y: event.pageY });
      })
      .on('mousemove', function(event) {
        setTooltipPos({ x: event.pageX, y: event.pageY });
      })
      .on('mouseleave', function(_, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', d.radius)
          .attr('stroke-width', d.isOverdue ? 3 : 2);

        setHoveredNode(null);
      })
      .on('contextmenu', function(event, d) {
        // Right-click on root nodes opens context menu
        if (d.depth === 0) {
          event.preventDefault();
          setContextMenu({ node: d, x: event.pageX, y: event.pageY });
        }
      });

    // Labels for root nodes
    nodeGroups.filter(d => d.depth === 0)
      .append('text')
      .attr('dy', d => -d.radius - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('font-weight', 500)
      .attr('fill', isDark ? '#a3a3a3' : '#525252')
      .text(d => d.identifier.length > 12 ? d.identifier.substring(0, 10) + '...' : d.identifier);

    // Update positions on each simulation tick
    simulation.on('tick', () => {
      // Update node positions
      nodeGroups.attr('transform', d => `translate(${d.x}, ${d.y})`);

      // Update timeline connection lines
      timelineLinks.attr('d', d => {
        const meta = treeMetas.find(m => m.id === d.rootId)!;
        const timelineX = meta.timelineX;
        const treeX = d.x;
        const treeY = d.y;
        const endY = d.isAbove ? treeY + d.radius : treeY - d.radius;

        // Quadratic bezier curve
        const controlY = (timelineY + endY) / 2;

        return `M ${timelineX} ${timelineY} Q ${timelineX} ${controlY} ${treeX} ${endY}`;
      });

      // Update child connection lines
      childLinks
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
    });

    // Run many initial ticks BEFORE rendering to eliminate stuttering
    // Stop the simulation, run ticks silently, then start fresh
    simulation.stop();
    for (let i = 0; i < 200; i++) {
      simulation.tick();
    }
    // Now start with very low alpha for smooth continuation
    simulation.alpha(0.1).restart();

    return () => {
      simulation.stop();
      svg.selectAll('*').remove();
    };
  }, [filteredArticles, selectedWeek, selectedMonth, timeUnit, showUnterartikel, showPAs, showOperations, hideCompleted, expandedRoots, COLORS, isDark]);

  const typeLabels: Record<string, string> = {
    article: 'Verkaufsartikel',
    unterartikel: 'Unterartikel',
    pa: 'PA',
    operation: 'Arbeitsgang',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={refresh}>
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Force Timeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verkaufsartikel nach Lieferdatum (Lane-basiertes Layout)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Time unit toggle */}
              <div className="flex rounded-[var(--radius-chip)] border border-border overflow-hidden">
                <button
                  onClick={() => setTimeUnit('week')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    timeUnit === 'week'
                      ? 'gradient-main text-white'
                      : 'bg-card-muted text-muted-foreground hover:bg-muted'
                  }`}
                >
                  KW
                </button>
                <button
                  onClick={() => setTimeUnit('month')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    timeUnit === 'month'
                      ? 'gradient-main text-white'
                      : 'bg-card-muted text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Monat
                </button>
              </div>
              {/* Time period selector */}
              {timeUnit === 'week' ? (
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-1.5 rounded-[var(--radius-chip)] bg-card-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-mint)]"
                >
                  {weekOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-[var(--radius-chip)] bg-card-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-mint)]"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-4 border-l border-border pl-4">
              <ToggleSwitch
                checked={showUnterartikel}
                onChange={(e) => setShowUnterartikel(e.target.checked)}
                label="Unterartikel"
              />
              <ToggleSwitch
                checked={showPAs}
                onChange={(e) => setShowPAs(e.target.checked)}
                label="PAs"
                disabled={!showUnterartikel}
              />
              <ToggleSwitch
                checked={showOperations}
                onChange={(e) => setShowOperations(e.target.checked)}
                label="Arbeitsgänge"
                disabled={!showUnterartikel || !showPAs}
              />
            </div>

            <div className="flex items-center gap-4 border-l border-border pl-4">
              <ToggleSwitch
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                label="Offene"
              />
            </div>

            <div className="flex items-center gap-2 border-l border-border pl-4">
              <Button variant="outline" size="sm" onClick={handleExpandCollapseAll} title={allExpanded ? "Alle einklappen" : "Alle ausklappen"}>
                {allExpanded ? <Shrink className="h-4 w-4 mr-2" /> : <Expand className="h-4 w-4 mr-2" />}
                {allExpanded ? "Einklappen" : "Ausklappen"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleReorganize} title="Neu organisieren">
                <Shuffle className="h-4 w-4 mr-2" />
                Reorganisieren
              </Button>
            </div>

            <div className="ml-auto">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`p-2 rounded-[var(--radius-chip)] transition-colors ${
                  isFullscreen
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card-muted hover:bg-muted'
                }`}
                title={isFullscreen ? "Vollbild beenden" : "Vollbild"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center gap-4 border-l border-border pl-4">
              {Object.entries(NODE_SIZES).map(([type, size]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div
                    className="rounded-full"
                    style={{
                      width: Math.min(size, 14),
                      height: Math.min(size, 14),
                      backgroundColor: COLORS[type as keyof typeof COLORS] || COLORS.article,
                      opacity: 0.85,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {typeLabels[type] || type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualization */}
      <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none flex flex-col' : ''}>
        {isFullscreen && (
          <div className="p-4 border-b border-border bg-card flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Time unit toggle */}
              <div className="flex rounded-[var(--radius-chip)] border border-border overflow-hidden">
                <button
                  onClick={() => setTimeUnit('week')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    timeUnit === 'week'
                      ? 'gradient-main text-white'
                      : 'bg-card-muted text-muted-foreground hover:bg-muted'
                  }`}
                >
                  KW
                </button>
                <button
                  onClick={() => setTimeUnit('month')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    timeUnit === 'month'
                      ? 'gradient-main text-white'
                      : 'bg-card-muted text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Monat
                </button>
              </div>
              {/* Time period selector */}
              {timeUnit === 'week' ? (
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-1.5 rounded-[var(--radius-chip)] bg-card-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-mint)]"
                >
                  {weekOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-[var(--radius-chip)] bg-card-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-mint)]"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-4 border-l border-border pl-4">
              <ToggleSwitch checked={showUnterartikel} onChange={(e) => setShowUnterartikel(e.target.checked)} label="Unterartikel" />
              <ToggleSwitch checked={showPAs} onChange={(e) => setShowPAs(e.target.checked)} label="PAs" disabled={!showUnterartikel} />
              <ToggleSwitch checked={showOperations} onChange={(e) => setShowOperations(e.target.checked)} label="Arbeitsgänge" disabled={!showUnterartikel || !showPAs} />
            </div>
            <div className="flex items-center gap-4 border-l border-border pl-4">
              <ToggleSwitch checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} label="Offene" />
            </div>
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <Button variant="outline" size="sm" onClick={handleExpandCollapseAll} title={allExpanded ? "Alle einklappen" : "Alle ausklappen"}>
                {allExpanded ? <Shrink className="h-4 w-4 mr-2" /> : <Expand className="h-4 w-4 mr-2" />}
                {allExpanded ? "Einklappen" : "Ausklappen"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleReorganize} title="Neu organisieren">
                <Shuffle className="h-4 w-4 mr-2" />
                Reorganisieren
              </Button>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{filteredArticles.length} Artikel</span>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-[var(--radius-chip)] bg-primary text-primary-foreground"
                title="Vollbild beenden"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        {!isFullscreen && (
          <CardHeader className="py-3 border-b border-border">
            <CardTitle className="text-base">
              {filteredArticles.length} Verkaufsartikel im Zeitraum
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={`p-0 ${isFullscreen ? 'flex-1' : ''}`}>
          <div
            ref={containerRef}
            className="relative w-full bg-card"
            style={{ height: isFullscreen ? '100%' : '500px' }}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              className="cursor-grab active:cursor-grabbing"
            />

            {hoveredNode && (
              <div
                className="fixed z-50 pointer-events-none bg-card border border-border rounded-[12px] shadow-lg p-3 max-w-xs"
                style={{
                  left: tooltipPos.x + 15,
                  top: tooltipPos.y - 10,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: hoveredNode.color }}
                  />
                  <span className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                    {typeLabels[hoveredNode.type] || hoveredNode.type}
                  </span>
                  {hoveredNode.isCompleted && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400">
                      Abgeschlossen
                    </span>
                  )}
                  {hoveredNode.isOverdue && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-600 dark:text-red-400">
                      Überfällig
                    </span>
                  )}
                </div>
                <div className="text-sm text-foreground font-medium mb-2">
                  {hoveredNode.name}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                  <span className="text-muted-foreground">Nr:</span>
                  <span className="text-foreground font-medium">{hoveredNode.identifier}</span>
                  <span className="text-muted-foreground">Lieferdatum:</span>
                  <span className="text-foreground">
                    {hoveredNode.deliveryDate.toLocaleDateString('de-DE')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-t border-border pt-2">
                  <span className="text-muted-foreground">Soll:</span>
                  <span className="text-foreground">{formatHours(hoveredNode.plannedHours)}</span>
                  <span className="text-muted-foreground">Ist:</span>
                  <span className="text-foreground">{formatHours(hoveredNode.actualHours)}</span>
                  <span className="text-muted-foreground">Fortschritt:</span>
                  <span className="text-foreground">{hoveredNode.completionPercentage.toFixed(0)}%</span>
                </div>
              </div>
            )}

            {/* Context Menu for right-click on root nodes */}
            {contextMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-[60]"
                  onClick={handleCloseContextMenu}
                  onContextMenu={(e) => { e.preventDefault(); handleCloseContextMenu(); }}
                />
                {/* Menu */}
                <div
                  className="fixed z-[70] bg-card border border-border rounded-[12px] shadow-lg py-2 min-w-[160px]"
                  style={{
                    left: contextMenu.x,
                    top: contextMenu.y,
                  }}
                >
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border mb-1">
                    {contextMenu.node.identifier}
                  </div>
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
                    onClick={() => handleToggleRootExpansion(contextMenu.node.id)}
                  >
                    {expandedRoots.has(contextMenu.node.id) ? (
                      <>
                        <Shrink className="h-4 w-4" />
                        Einklappen
                      </>
                    ) : (
                      <>
                        <Expand className="h-4 w-4" />
                        Ausklappen
                      </>
                    )}
                  </button>
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
                    onClick={() => handleReorganizeSingleTree(contextMenu.node.id)}
                  >
                    <Shuffle className="h-4 w-4" />
                    Reorganisieren
                  </button>
                </div>
              </>
            )}

            {filteredArticles.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Keine Verkaufsartikel mit Lieferdatum im gewählten Zeitraum
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
