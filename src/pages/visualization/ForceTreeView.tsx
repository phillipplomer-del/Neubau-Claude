/**
 * Force-Directed Tree Visualization
 * Shows project hierarchy as an interactive force-directed graph
 * Hierarchy: Project → Articles → PAs → Operations
 * Excludes articles with number "100" (Fracht und Verpackung)
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useProductionHierarchy, type HierarchyNode } from '@/hooks/useProductionHierarchy';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { RefreshCw, AlertCircle, Maximize2, Minimize2, Search, X } from 'lucide-react';

// Node types for D3
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'project' | 'article' | 'mainPA' | 'pa' | 'operation';
  radius: number;
  color: string;
  plannedHours: number;
  actualHours: number;
  completionPercentage: number;
  depth: number; // Hierarchy depth for layout
  children?: D3Node[];
  // Additional info for tooltip
  identifier: string;
  articleNumber?: string;
  description?: string;
  isCompleted: boolean;
  isOverdue: boolean; // Active but end date is in the past
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node | string;
  target: D3Node | string;
}

// Light mode colors (Aqua)
const COLORS_LIGHT = {
  project: '#00E097',    // mint
  article: '#00DEE0',    // cyan
  mainPA: '#00B8D4',     // teal
  pa: '#0050E0',         // blue
  operation: '#00C9A7',  // sea green
  link: '#94a3b8',       // slate-400
  linkHover: '#00E097',
};

// Dark mode colors (Gold/Lime)
const COLORS_DARK = {
  project: '#E0BD00',    // gold
  article: '#9EE000',    // lime
  mainPA: '#45F600',     // green
  pa: '#B8E000',         // lime-green
  operation: '#D4E040',  // yellow-lime
  link: '#4a5568',       // gray-600
  linkHover: '#E0BD00',
};

// Base node sizes by type (minimum sizes)
const NODE_BASE_SIZES = {
  project: 25,
  article: 15,
  mainPA: 12,
  pa: 10,
  operation: 5,
};

// Maximum node sizes by type
const NODE_MAX_SIZES = {
  project: 50,
  article: 35,
  mainPA: 25,
  pa: 20,
  operation: 12,
};

/**
 * Calculate node size based on plannedHours value
 * Uses logarithmic scale to handle large value differences
 */
function calculateNodeSize(type: string, plannedHours: number, maxHours: number): number {
  const baseSize = NODE_BASE_SIZES[type as keyof typeof NODE_BASE_SIZES] || 10;
  const maxSize = NODE_MAX_SIZES[type as keyof typeof NODE_MAX_SIZES] || 20;

  if (maxHours <= 0 || plannedHours <= 0) return baseSize;

  // Use logarithmic scale for better visualization of different magnitudes
  const logValue = Math.log(plannedHours + 1);
  const logMax = Math.log(maxHours + 1);
  const ratio = logValue / logMax;

  return baseSize + (maxSize - baseSize) * ratio;
}

// Hook to detect dark mode
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

/**
 * Filter out articles with number "100" (Fracht und Verpackung)
 */
function filterHierarchy(nodes: HierarchyNode[]): HierarchyNode[] {
  return nodes.map(node => {
    // Filter children recursively
    const filteredChildren = node.children
      .filter(child => {
        // Exclude articles with identifier "100"
        if (child.type === 'article' && child.identifier === '100') {
          return false;
        }
        return true;
      })
      .map(child => ({
        ...child,
        children: filterHierarchy([child])[0]?.children || [],
      }));

    return {
      ...node,
      children: filteredChildren,
    };
  });
}

/**
 * Filter hierarchy by visible levels
 */
interface LevelVisibility {
  showArticles: boolean;
  showPAs: boolean;
  showOperations: boolean;
  hideCompleted: boolean;
}

function filterByLevels(nodes: HierarchyNode[], visibility: LevelVisibility): HierarchyNode[] {
  return nodes
    .filter(node => {
      // Filter out completed items if hideCompleted is true
      if (visibility.hideCompleted && node.isCompleted) {
        // Filter articles, PAs, and operations (not projects)
        if (node.type === 'article' || node.type === 'pa' || node.type === 'mainPA' || node.type === 'operation') {
          return false;
        }
      }
      return true;
    })
    .map(node => {
      let filteredChildren = node.children;

      // Filter based on visibility settings
      if (node.type === 'project' && !visibility.showArticles) {
        // Don't show articles - stop here
        return { ...node, children: [] };
      }

      if (node.type === 'article' && !visibility.showPAs) {
        // Don't show PAs - stop here
        return { ...node, children: [] };
      }

      if ((node.type === 'pa' || node.type === 'mainPA') && !visibility.showOperations) {
        // Don't show operations - stop here
        return { ...node, children: [] };
      }

      // Recursively filter children
      filteredChildren = filterByLevels(node.children, visibility);

      return {
        ...node,
        children: filteredChildren,
      };
    });
}

/**
 * Convert hierarchy to flat nodes and links for D3
 * Also calculates initial tree positions to reduce line crossings
 */
function hierarchyToD3(
  hierarchy: HierarchyNode[],
  colors: typeof COLORS_LIGHT,
  width: number,
  height: number
): { nodes: D3Node[]; links: D3Link[] } {
  const nodes: D3Node[] = [];
  const links: D3Link[] = [];

  // First, build a proper D3 hierarchy for tree layout
  if (hierarchy.length === 0) return { nodes, links };

  const rootHierarchy = hierarchy[0]!;

  // Convert to D3 hierarchy format
  interface HierarchyData {
    id: string;
    name: string;
    type: HierarchyNode['type'];
    plannedHours: number;
    actualHours: number;
    completionPercentage: number;
    identifier: string;
    articleNumber?: string;
    description?: string;
    isCompleted: boolean;
    isActive: boolean;
    endDate?: Date;
    children?: HierarchyData[];
  }

  function toHierarchyData(node: HierarchyNode): HierarchyData {
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      plannedHours: node.plannedHours,
      actualHours: node.actualHours,
      completionPercentage: node.completionPercentage,
      identifier: node.identifier,
      articleNumber: node.articleNumber,
      description: node.description,
      isCompleted: node.isCompleted,
      isActive: node.isActive,
      endDate: node.endDate,
      children: node.children.length > 0 ? node.children.map(toHierarchyData) : undefined,
    };
  }

  const hierarchyData = toHierarchyData(rootHierarchy);
  const root = d3.hierarchy(hierarchyData);

  // Calculate max hours for each node type (for size scaling)
  const maxHoursByType: Record<string, number> = {};
  root.each((d) => {
    const type = d.data.type;
    const hours = d.data.plannedHours;
    if (!maxHoursByType[type] || hours > maxHoursByType[type]) {
      maxHoursByType[type] = hours;
    }
  });

  // Use radial tree layout for initial positions (works better for force-directed graphs)
  const treeLayout = d3.tree<HierarchyData>()
    .size([2 * Math.PI, Math.min(width, height) / 3])
    .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

  treeLayout(root);

  // Convert tree positions to Cartesian coordinates and create D3 nodes
  root.each((d) => {
    // Convert polar to Cartesian (radial layout)
    const angle = d.x as number;
    const radius = d.y as number;
    const x = width / 2 + radius * Math.cos(angle - Math.PI / 2);
    const y = height / 2 + radius * Math.sin(angle - Math.PI / 2);

    // Calculate size based on plannedHours
    const nodeRadius = calculateNodeSize(
      d.data.type,
      d.data.plannedHours,
      maxHoursByType[d.data.type] || 1
    );

    // Check if overdue: active, not completed, and end date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = d.data.isActive &&
                      !d.data.isCompleted &&
                      d.data.endDate !== undefined &&
                      d.data.endDate < today;

    const d3Node: D3Node = {
      id: d.data.id,
      name: d.data.name,
      type: d.data.type,
      radius: nodeRadius,
      color: colors[d.data.type] || colors.operation,
      plannedHours: d.data.plannedHours,
      actualHours: d.data.actualHours,
      completionPercentage: d.data.completionPercentage,
      depth: d.depth,
      // Additional info for tooltip
      identifier: d.data.identifier,
      articleNumber: d.data.articleNumber,
      description: d.data.description,
      isCompleted: d.data.isCompleted,
      isOverdue,
      // Set initial positions from tree layout
      x,
      y,
    };

    nodes.push(d3Node);
  });

  // Create links from parent-child relationships
  root.links().forEach((link) => {
    links.push({
      source: link.source.data.id,
      target: link.target.data.id,
    });
  });

  return { nodes, links };
}

/**
 * Format hours for display
 */
function formatHours(hours: number): string {
  if (hours < 1) return `${(hours * 60).toFixed(0)} min`;
  return `${hours.toFixed(1)} h`;
}

export default function ForceTreeView() {
  const isDark = useDarkMode();
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<D3Node | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Level visibility toggles (PAs and operations collapsed by default)
  const [showArticles, setShowArticles] = useState(true);
  const [showPAs, setShowPAs] = useState(false);
  const [showOperations, setShowOperations] = useState(false);

  // Hide completed PAs/operations
  const [hideCompleted, setHideCompleted] = useState(false);

  // Fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto fit-to-view when fullscreen changes
  useEffect(() => {
    if (svgRef.current && containerRef.current) {
      // Wait for the layout to update
      const timeout = setTimeout(() => {
        const svg = d3.select(svgRef.current);
        const g = svg.select('g');
        const bounds = (g.node() as SVGGElement)?.getBBox();
        const container = containerRef.current;
        if (!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight || 600;

        if (bounds && bounds.width > 0 && bounds.height > 0) {
          const fullWidth = bounds.width;
          const fullHeight = bounds.height;
          const midX = bounds.x + fullWidth / 2;
          const midY = bounds.y + fullHeight / 2;

          const scale = 0.75 / Math.max(fullWidth / width, fullHeight / height);
          const translateX = width / 2 - scale * midX;
          const translateY = height / 2 - scale * midY;

          svg.transition()
            .duration(400)
            .call(
              d3.zoom<SVGSVGElement, unknown>().transform as any,
              d3.zoomIdentity.translate(translateX, translateY).scale(scale)
            );
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isFullscreen]);

  // Expand all helper
  const isAllExpanded = showArticles && showPAs && showOperations;
  const handleExpandAll = (expand: boolean) => {
    setShowArticles(expand);
    setShowPAs(expand);
    setShowOperations(expand);
  };

  // Track previous level states for auto-fit
  const prevLevelsRef = useRef({ showArticles, showPAs, showOperations });
  const fitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto fit-to-view when levels change
  useEffect(() => {
    const prevLevels = prevLevelsRef.current;
    const levelsChanged =
      prevLevels.showArticles !== showArticles ||
      prevLevels.showPAs !== showPAs ||
      prevLevels.showOperations !== showOperations;

    if (levelsChanged) {
      prevLevelsRef.current = { showArticles, showPAs, showOperations };

      // Clear any pending fit timeout
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current);
      }

      // Wait for simulation to settle, then fit to view
      fitTimeoutRef.current = setTimeout(() => {
        if (svgRef.current && containerRef.current) {
          const svg = d3.select(svgRef.current);
          const g = svg.select('g');
          const bounds = (g.node() as SVGGElement)?.getBBox();
          const container = containerRef.current;
          const width = container.clientWidth;
          const height = container.clientHeight || 600;

          if (bounds && bounds.width > 0 && bounds.height > 0) {
            const fullWidth = bounds.width;
            const fullHeight = bounds.height;
            const midX = bounds.x + fullWidth / 2;
            const midY = bounds.y + fullHeight / 2;

            // Use a smaller scale factor to ensure nothing is cut off
            const scale = 0.75 / Math.max(fullWidth / width, fullHeight / height);
            const translateX = width / 2 - scale * midX;
            const translateY = height / 2 - scale * midY;

            svg.transition()
              .duration(400)
              .call(
                d3.zoom<SVGSVGElement, unknown>().transform as any,
                d3.zoomIdentity.translate(translateX, translateY).scale(scale)
              );
          }
        }
      }, 600); // Wait for simulation to settle
    }

    return () => {
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current);
      }
    };
  }, [showArticles, showPAs, showOperations]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { loading, error, hierarchy, refresh } = useProductionHierarchy({
    hideCompleted: false,
  });

  // Filter hierarchy to exclude article 100
  const filteredHierarchy = useMemo(() => {
    return filterHierarchy(hierarchy);
  }, [hierarchy]);

  // Get list of active projects for dropdown
  const projects = useMemo(() => {
    return filteredHierarchy
      .filter(node => node.type === 'project' && node.isActive)
      .map(node => ({
        id: node.id,
        name: node.name,
        identifier: node.identifier,
      }));
  }, [filteredHierarchy]);

  // Search results - find matching projects and articles
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return [];

    const query = searchQuery.toLowerCase();
    const results: Array<{ id: string; name: string; type: 'project' | 'article'; identifier: string; projectId?: string }> = [];

    filteredHierarchy
      .filter(node => node.type === 'project' && node.isActive)
      .forEach(project => {
        // Check if project matches
        if (project.identifier.toLowerCase().includes(query) ||
            project.name.toLowerCase().includes(query)) {
          results.push({
            id: project.id,
            name: project.name,
            type: 'project',
            identifier: project.identifier,
          });
        }

        // Check articles within this project
        project.children
          .filter(child => child.type === 'article' && child.identifier !== '100')
          .forEach(article => {
            if (article.identifier.toLowerCase().includes(query) ||
                article.name.toLowerCase().includes(query)) {
              results.push({
                id: article.id,
                name: article.name,
                type: 'article',
                identifier: article.identifier,
                projectId: project.id,
              });
            }
          });
      });

    return results.slice(0, 10); // Limit to 10 results
  }, [filteredHierarchy, searchQuery]);

  // Get selected project's hierarchy with level filtering
  // Center logic:
  // - If only 1 Verkaufsartikel (isMainArticle=true), that article is center
  // - If multiple Verkaufsartikel, project is center with Verkaufsartikel as first level
  const selectedHierarchy = useMemo(() => {
    if (!selectedProject) return [];
    const project = filteredHierarchy.find(p => p.id === selectedProject);
    if (!project) return [];

    // Get Verkaufsartikel (main articles, excluding article 100)
    const mainArticles = project.children.filter(
      c => c.type === 'article' && c.identifier !== '100' && c.isMainArticle === true
    );

    // If only 1 Verkaufsartikel, use that as the center/root
    if (mainArticles.length === 1) {
      const singleMainArticle = mainArticles[0]!;
      // When article is root, showArticles toggle is irrelevant (article IS the root)
      // showPAs controls PAs (children of article), showOperations controls operations
      const visibility: LevelVisibility = { showArticles: true, showPAs, showOperations, hideCompleted };
      return filterByLevels([singleMainArticle], visibility);
    }

    // Multiple Verkaufsartikel (or none): project is center, articles are first level
    const visibility: LevelVisibility = { showArticles, showPAs, showOperations, hideCompleted };
    return filterByLevels([project], visibility);
  }, [filteredHierarchy, selectedProject, showArticles, showPAs, showOperations, hideCompleted]);

  // Check if we're in single-article mode (Verkaufsartikel is center instead of project)
  const isSingleArticleMode = useMemo(() => {
    if (!selectedProject) return false;
    const project = filteredHierarchy.find(p => p.id === selectedProject);
    if (!project) return false;
    const mainArticles = project.children.filter(
      c => c.type === 'article' && c.identifier !== '100' && c.isMainArticle === true
    );
    return mainArticles.length === 1;
  }, [filteredHierarchy, selectedProject]);

  // Auto-select first project
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]!.id);
    }
  }, [projects, selectedProject]);

  // D3 Force Simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || selectedHierarchy.length === 0) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    // Clear previous content
    svg.selectAll('*').remove();

    // Convert hierarchy to D3 format (with initial tree positions)
    const { nodes, links } = hierarchyToD3(selectedHierarchy, COLORS, width, height);

    if (nodes.length === 0) return;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
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

    // Create main group for zoom/pan
    const g = svg.append('g');

    // Force simulation that preserves tree structure
    // Since nodes already have good initial positions from tree layout,
    // use gentle forces to spread them out slightly while keeping structure
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance(d => {
          // Shorter distances for operations (leaves), longer for main branches
          const target = d.target as D3Node;
          return target.type === 'operation' ? 40 : 80;
        })
        .strength(0.8)
      )
      .force('charge', d3.forceManyBody<D3Node>()
        .strength(d => d.type === 'operation' ? -30 : -150)
      )
      .force('collision', d3.forceCollide<D3Node>()
        .radius(d => d.radius + 5)
        .strength(0.7)
      )
      .alpha(0.3) // Start with lower alpha since positions are already good
      .alphaDecay(0.02); // Slower decay for smoother settling

    simulationRef.current = simulation;

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', COLORS.link)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5);

    // Create node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, D3Node>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Calculate opacity based on completion percentage (min 0.3, max 1.0)
    // Completed items always get full opacity (no transparency)
    const getOpacity = (d: D3Node) => {
      if (d.isCompleted) {
        return 1.0; // Completed items: no transparency
      }
      const completion = d.completionPercentage / 100;
      return 0.3 + completion * 0.7; // Range from 0.3 (0%) to 1.0 (100%)
    };

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('fill-opacity', d => getOpacity(d))
      .attr('stroke', d => d.isOverdue ? '#ef4444' : (isDark ? '#1A1A12' : '#ffffff'))
      .attr('stroke-width', d => d.isOverdue ? 3 : 2)
      .attr('filter', d => d.isOverdue ? 'url(#overdue-glow)' : null)
      .on('mouseenter', function(event, d) {
        const baseOpacity = getOpacity(d);
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', d.radius * 1.2)
          .attr('fill-opacity', Math.min(baseOpacity + 0.2, 1));

        // Highlight connected links
        link
          .attr('stroke', l => {
            const source = (l.source as D3Node).id;
            const target = (l.target as D3Node).id;
            return source === d.id || target === d.id ? COLORS.linkHover : COLORS.link;
          })
          .attr('stroke-width', l => {
            const source = (l.source as D3Node).id;
            const target = (l.target as D3Node).id;
            return source === d.id || target === d.id ? 3 : 1.5;
          })
          .attr('stroke-opacity', l => {
            const source = (l.source as D3Node).id;
            const target = (l.target as D3Node).id;
            return source === d.id || target === d.id ? 1 : 0.3;
          });

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
          .attr('fill-opacity', getOpacity(d))
          .attr('stroke-width', d.isOverdue ? 3 : 2);

        link
          .attr('stroke', COLORS.link)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.6);

        setHoveredNode(null);
      })
      // Double-click to expand next level
      .on('dblclick', function(event, d) {
        event.preventDefault();
        event.stopPropagation();

        // Expand the next level based on current node type
        if (d.type === 'project') {
          // Project → expand articles
          if (!showArticles) setShowArticles(true);
        } else if (d.type === 'article') {
          // Article → expand PAs
          if (!showPAs) {
            setShowArticles(true);
            setShowPAs(true);
          }
        } else if (d.type === 'pa' || d.type === 'mainPA') {
          // PA → expand operations
          if (!showOperations) {
            setShowArticles(true);
            setShowPAs(true);
            setShowOperations(true);
          }
        }
      })
      // Right-click to collapse this level
      .on('contextmenu', function(event, d) {
        event.preventDefault();
        event.stopPropagation();

        // Collapse the clicked level and all levels below
        if (d.type === 'article') {
          // Collapse articles → also hides PAs and operations
          setShowArticles(false);
          setShowPAs(false);
          setShowOperations(false);
        } else if (d.type === 'pa' || d.type === 'mainPA') {
          // Collapse PAs → also hides operations
          setShowPAs(false);
          setShowOperations(false);
        } else if (d.type === 'operation') {
          // Collapse operations
          setShowOperations(false);
        }
      });

    // Add labels only to project nodes
    node.filter(d => d.type === 'project')
      .append('text')
      .attr('dy', d => d.radius + 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', isDark ? '#a3a3a3' : '#525252')
      .text(d => {
        const name = d.name.replace(/^Projekt /, '');
        return name.length > 15 ? name.substring(0, 12) + '...' : name;
      });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x || 0)
        .attr('y1', d => (d.source as D3Node).y || 0)
        .attr('x2', d => (d.target as D3Node).x || 0)
        .attr('y2', d => (d.target as D3Node).y || 0);

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [selectedHierarchy, COLORS, isDark]);

  // Type label mapping
  const typeLabels: Record<string, string> = {
    project: 'Projekt',
    article: 'Artikel',
    mainPA: 'Haupt-PA',
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
            Force-Directed Tree
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Interaktive Projektstruktur-Visualisierung
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
            {/* Search */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  placeholder="Projekt/Artikel suchen..."
                  className="w-48 px-3 py-1.5 rounded-[var(--radius-chip)] bg-card-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-mint)]"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className="p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-[var(--radius-card)] shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
                      onClick={() => {
                        if (result.type === 'project') {
                          setSelectedProject(result.id);
                        } else if (result.projectId) {
                          setSelectedProject(result.projectId);
                        }
                        setSearchQuery('');
                        setShowSearchResults(false);
                      }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: result.type === 'project' ? COLORS.project : COLORS.article }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {result.identifier}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {result.name.replace(/^(Projekt |Artikel )/, '')}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {result.type === 'project' ? 'Projekt' : 'Artikel'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Project Selector */}
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <label className="text-sm font-medium text-muted-foreground">Projekt:</label>
              <select
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-1.5 rounded-[var(--radius-chip)] bg-card-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-mint)]"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.identifier} - {p.name.replace('Projekt ', '')}
                  </option>
                ))}
              </select>
            </div>

            {/* Global Toggles */}
            <div className="flex items-center gap-4 border-l border-border pl-4">
              <ToggleSwitch
                checked={isAllExpanded}
                onChange={(e) => handleExpandAll(e.target.checked)}
                label="Alle"
              />
              <ToggleSwitch
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                label="Offene"
              />
            </div>

            {/* Level Toggles */}
            <div className="flex items-center gap-4 border-l border-border pl-4">
              <ToggleSwitch
                checked={showArticles}
                onChange={(e) => setShowArticles(e.target.checked)}
                label="Artikel"
                disabled={isSingleArticleMode}
                title={isSingleArticleMode ? 'Nur 1 Artikel - automatisch im Zentrum' : undefined}
              />
              <ToggleSwitch
                checked={showPAs}
                onChange={(e) => setShowPAs(e.target.checked)}
                label="PAs"
                disabled={!showArticles && !isSingleArticleMode}
              />
              <ToggleSwitch
                checked={showOperations}
                onChange={(e) => setShowOperations(e.target.checked)}
                label="Arbeitsgänge"
                disabled={(!showArticles && !isSingleArticleMode) || !showPAs}
              />
            </div>

            {/* Fullscreen Button */}
            <div className="flex items-center gap-1 ml-auto">
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

            {/* Legend */}
            <div className="flex items-center gap-4 border-l border-border pl-4">
              {Object.entries(NODE_BASE_SIZES).map(([type, size]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div
                    className="rounded-full"
                    style={{
                      width: Math.min(size, 16),
                      height: Math.min(size, 16),
                      backgroundColor: COLORS[type as keyof typeof COLORS],
                      opacity: 0.85,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {typeLabels[type]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualization */}
      <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}>
        <CardHeader className={`py-3 border-b border-border ${isFullscreen ? 'flex flex-row items-center justify-between gap-4' : ''}`}>
          <CardTitle className="text-base flex-shrink-0">
            {selectedHierarchy.length > 0 ? selectedHierarchy[0]!.name : 'Kein Projekt ausgewählt'}
          </CardTitle>
          {isFullscreen && (
            <div className="flex items-center gap-4 flex-1 justify-end">
              {/* Project Selector */}
              <select
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-1.5 rounded-[var(--radius-chip)] bg-card-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-mint)]"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.identifier} - {p.name.replace('Projekt ', '')}
                  </option>
                ))}
              </select>

              {/* Toggles */}
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={isAllExpanded}
                  onChange={(e) => handleExpandAll(e.target.checked)}
                  label="Alle"
                />
                <ToggleSwitch
                  checked={hideCompleted}
                  onChange={(e) => setHideCompleted(e.target.checked)}
                  label="Offene"
                />
              </div>

              {/* Level Toggles */}
              <div className="flex items-center gap-3 border-l border-border pl-4">
                <ToggleSwitch
                  checked={showArticles}
                  onChange={(e) => setShowArticles(e.target.checked)}
                  label="Artikel"
                  disabled={isSingleArticleMode}
                />
                <ToggleSwitch
                  checked={showPAs}
                  onChange={(e) => setShowPAs(e.target.checked)}
                  label="PAs"
                  disabled={!showArticles && !isSingleArticleMode}
                />
                <ToggleSwitch
                  checked={showOperations}
                  onChange={(e) => setShowOperations(e.target.checked)}
                  label="AGs"
                  disabled={(!showArticles && !isSingleArticleMode) || !showPAs}
                />
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-[var(--radius-chip)] bg-card-muted hover:bg-muted transition-colors"
                title="Vollbild beenden"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={containerRef}
            className="relative w-full bg-card"
            style={{ height: isFullscreen ? 'calc(100vh - 70px)' : '600px' }}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              className="cursor-grab active:cursor-grabbing"
            />

            {/* Tooltip */}
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
                    {typeLabels[hoveredNode.type]}
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
                {/* Additional identifiers */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                  {hoveredNode.identifier && (
                    <>
                      <span className="text-muted-foreground">
                        {hoveredNode.type === 'project' ? 'Projekt-Nr:' :
                         hoveredNode.type === 'article' ? 'Artikel-Nr:' :
                         hoveredNode.type === 'pa' || hoveredNode.type === 'mainPA' ? 'PA-Nr:' :
                         'AG-Nr:'}
                      </span>
                      <span className="text-foreground font-medium">{hoveredNode.identifier}</span>
                    </>
                  )}
                  {/* Show articleNumber only for PAs and operations (not for articles themselves) */}
                  {hoveredNode.articleNumber && hoveredNode.type !== 'article' && (
                    <>
                      <span className="text-muted-foreground">Artikel-Nr:</span>
                      <span className="text-foreground">{hoveredNode.articleNumber}</span>
                    </>
                  )}
                </div>
                {/* Description */}
                {hoveredNode.description && (
                  <div className="text-xs text-muted-foreground mb-2 italic border-l-2 border-border pl-2">
                    {hoveredNode.description}
                  </div>
                )}
                {/* Hours and progress */}
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

            {/* Empty State */}
            {selectedHierarchy.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Kein Projekt ausgewählt oder keine Daten verfügbar
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
