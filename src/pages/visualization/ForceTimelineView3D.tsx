/**
 * 3D Force Timeline Visualization
 * Shows Verkaufsartikel on a 3D timeline based on deliveryDate
 * Trees extend in 3D space from their positions on the timeline
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import { useProductionHierarchy, type HierarchyNode } from '@/hooks/useProductionHierarchy';
import { useSalesData } from '@/hooks/useSalesData';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { RefreshCw, AlertCircle, Maximize2, Minimize2, Box, Circle, Expand, Shrink, Download } from 'lucide-react';
import { export3DVisualization } from '@/utils/export3DVisualization';

// Node type for 3D graph
interface GraphNode {
  id: string;
  name: string;
  type: 'article' | 'unterartikel' | 'pa' | 'operation' | 'timeline';
  color: string;
  size: number;
  plannedHours: number;
  actualHours: number;
  completionPercentage: number;
  identifier: string;
  deliveryDate?: Date;
  endDate?: Date;
  isCompleted: boolean;
  isOverdue: boolean;
  depth: number;
  rootId: string;
  isAbove: boolean;
  // Force graph internal properties
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Colors
const COLORS_LIGHT = {
  article: '#00DEE0',
  unterartikel: '#00B8D4',
  pa: '#0050E0',
  operation: '#00C9A7',
  timeline: '#94a3b8',
  link: '#94a3b8',
  background: '#ffffff',
};

const COLORS_DARK = {
  article: '#9EE000',
  unterartikel: '#45F600',
  pa: '#B8E000',
  operation: '#D4E040',
  timeline: '#4a5568',
  link: '#4a5568',
  background: '#1A1A12',
};

// Node sizes
const NODE_SIZES = {
  article: 10,
  unterartikel: 8,
  pa: 6,
  operation: 4,
  timeline: 3,
};

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

// Week/Month helpers
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
  const month = parseInt(monthStr!, 10) - 1;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start, end };
}

function formatHours(hours: number): string {
  if (hours < 1) return `${(hours * 60).toFixed(0)} min`;
  return `${hours.toFixed(1)} h`;
}

interface ForceTimelineView3DProps {
  onSwitchTo2D?: () => void;
}

export default function ForceTimelineView3D({ onSwitchTo2D }: ForceTimelineView3DProps) {
  const isDark = useDarkMode();
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;

  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);

  const [timeUnit, setTimeUnit] = useState<'week' | 'month'>('week');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [showUnterartikel, setShowUnterartikel] = useState(false);
  const [showPAs, setShowPAs] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const { hierarchy, loading: hierarchyLoading, error: hierarchyError, refresh: refreshHierarchy } = useProductionHierarchy({
    hideCompleted: false,
  });
  const { data: salesData, loading: salesLoading, error: salesError, refresh: refreshSales } = useSalesData();

  const loading = hierarchyLoading || salesLoading;
  const error = hierarchyError || salesError;

  const refresh = () => {
    refreshHierarchy();
    refreshSales();
  };

  const allExpanded = showUnterartikel && showPAs && showOperations;
  const handleExpandCollapseAll = () => {
    if (allExpanded) {
      setShowOperations(false);
      setShowPAs(false);
      setShowUnterartikel(false);
    } else {
      setShowUnterartikel(true);
      setShowPAs(true);
      setShowOperations(true);
    }
  };

  // Delivery date mapping
  const deliveryDateMap = useMemo(() => {
    const map = new Map<string, Date>();
    salesData.forEach(entry => {
      if (entry.artikelnummer && entry.deliveryDate) {
        map.set(entry.artikelnummer, new Date(entry.deliveryDate));
      }
    });
    return map;
  }, [salesData]);

  // Date range
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

  const weekOptions = useMemo(() => getWeekOptions(dateRange.min, dateRange.max), [dateRange]);
  const monthOptions = useMemo(() => getMonthOptions(dateRange.min, dateRange.max), [dateRange]);

  // Auto-select current week/month
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

  // Get articles with delivery dates
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

  // Filter by selected time period
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

  // Convert to 3D graph data
  const graphData = useMemo((): GraphData => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    if (filteredArticles.length === 0) return { nodes, links };

    // Get time range
    const { start: startDate, end: endDate } = timeUnit === 'week'
      ? parseWeekRange(selectedWeek)
      : parseMonthRange(selectedMonth);

    const timeRange = endDate.getTime() - startDate.getTime();

    // Sort articles by delivery date
    const sortedArticles = [...filteredArticles].sort(
      (a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime()
    );

    // Process each article
    sortedArticles.forEach((item, index) => {
      const isAbove = index % 2 === 0;
      const laneDepth = Math.floor(index / 2) * 60; // Z separation for lanes

      // Calculate X position based on delivery date
      const timePos = (item.deliveryDate.getTime() - startDate.getTime()) / timeRange;
      const baseX = (timePos - 0.5) * 400; // Scale to -200 to 200
      const baseY = isAbove ? 80 : -80;
      const baseZ = laneDepth;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create timeline anchor point for this article (on the timeline at y=0)
      const anchorId = `timeline-anchor-${item.article.id}`;
      nodes.push({
        id: anchorId,
        name: '',
        type: 'timeline',
        color: COLORS.article,
        size: 4,
        plannedHours: 0,
        actualHours: 0,
        completionPercentage: 0,
        identifier: item.article.identifier,
        deliveryDate: item.deliveryDate,
        isCompleted: false,
        isOverdue: false,
        depth: -1,
        rootId: item.article.id,
        isAbove,
        x: baseX,
        y: 0,
        z: 0,
        fx: baseX, // Fixed X position on timeline
        fy: 0,     // Fixed Y on timeline
        fz: 0,     // Fixed Z on timeline
      });

      // Process node tree
      function processNode(
        node: HierarchyNode,
        depth: number,
        parentId: string | null,
        offsetX: number,
        offsetY: number,
        offsetZ: number
      ) {
        const isRoot = depth === 0;
        const isUnterartikel = depth === 1 && node.type === 'article';
        const isPA = node.type === 'pa' || node.type === 'mainPA';
        const isOperation = node.type === 'operation';

        // Filter based on visibility
        if (!isRoot) {
          if (isUnterartikel && !showUnterartikel) return;
          if (isPA && !showPAs) return;
          if (isOperation && !showOperations) return;
          if (hideCompleted && node.isCompleted) return;
        }

        const nodeType = isUnterartikel ? 'unterartikel' :
                        isPA ? 'pa' :
                        isOperation ? 'operation' : 'article';

        const isOverdue = node.isActive &&
                          !node.isCompleted &&
                          node.endDate !== undefined &&
                          node.endDate < today;

        const graphNode: GraphNode = {
          id: node.id,
          name: node.name,
          type: nodeType,
          color: COLORS[nodeType] || COLORS.article,
          size: NODE_SIZES[nodeType] || 6,
          plannedHours: node.plannedHours,
          actualHours: node.actualHours,
          completionPercentage: node.completionPercentage,
          identifier: node.identifier,
          deliveryDate: item.deliveryDate,
          endDate: node.endDate,
          isCompleted: node.isCompleted,
          isOverdue,
          depth,
          rootId: item.article.id,
          isAbove,
          x: baseX + offsetX,
          y: baseY + offsetY * (isAbove ? 1 : -1),
          z: baseZ + offsetZ,
        };

        nodes.push(graphNode);

        // Link root node to timeline anchor
        if (isRoot) {
          links.push({ source: anchorId, target: node.id });
        } else if (parentId) {
          links.push({ source: parentId, target: node.id });
        }

        // Process children with spread
        const childCount = node.children.length;
        node.children.forEach((child, childIdx) => {
          const spreadX = childCount > 1 ? (childIdx - (childCount - 1) / 2) * 25 : 0;
          const spreadY = 40; // Move away from root
          const spreadZ = childCount > 1 ? (childIdx - (childCount - 1) / 2) * 15 : 0;

          processNode(
            child,
            depth + 1,
            node.id,
            offsetX + spreadX,
            offsetY + spreadY,
            offsetZ + spreadZ
          );
        });
      }

      processNode(item.article, 0, null, 0, 0, 0);
    });

    // Add timeline markers (small spheres along the X axis)
    const numMarkers = 7;
    for (let i = 0; i <= numMarkers; i++) {
      const x = (i / numMarkers - 0.5) * 400;
      nodes.push({
        id: `timeline-marker-${i}`,
        name: '',
        type: 'timeline',
        color: COLORS.timeline,
        size: 2,
        plannedHours: 0,
        actualHours: 0,
        completionPercentage: 0,
        identifier: '',
        isCompleted: false,
        isOverdue: false,
        depth: -1,
        rootId: '',
        isAbove: false,
        x,
        y: 0,
        z: 0,
        fx: x,
        fy: 0,
        fz: 0,
      });
    }

    return { nodes, links };
  }, [filteredArticles, timeUnit, selectedWeek, selectedMonth, showUnterartikel, showPAs, showOperations, hideCompleted, COLORS]);

  // Update dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 500,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isFullscreen]);

  // Custom node rendering
  const nodeThreeObject = useCallback((node: GraphNode) => {
    if (node.type === 'timeline') {
      // Timeline anchor points - larger spheres with glow
      const group = new THREE.Group();

      // Main sphere
      const geometry = new THREE.SphereGeometry(node.size, 16, 16);
      const material = new THREE.MeshLambertMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.9,
      });
      const sphere = new THREE.Mesh(geometry, material);
      group.add(sphere);

      // Glow ring around timeline anchor
      const ringGeometry = new THREE.RingGeometry(node.size * 1.2, node.size * 1.8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      return group;
    }

    const geometry = new THREE.SphereGeometry(node.size, 32, 32);
    const opacity = node.isCompleted ? 1.0 : 0.3 + (node.completionPercentage / 100) * 0.7;

    const material = new THREE.MeshLambertMaterial({
      color: node.color,
      transparent: true,
      opacity,
    });

    const sphere = new THREE.Mesh(geometry, material);

    // Prominent glow effect for overdue nodes
    if (node.isOverdue) {
      // Inner glow - bright red
      const innerGlowGeometry = new THREE.SphereGeometry(node.size * 1.2, 32, 32);
      const innerGlowMaterial = new THREE.MeshBasicMaterial({
        color: '#ff0000',
        transparent: true,
        opacity: 0.5,
      });
      const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
      sphere.add(innerGlow);

      // Outer glow - larger, softer
      const outerGlowGeometry = new THREE.SphereGeometry(node.size * 1.8, 32, 32);
      const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: '#ff3333',
        transparent: true,
        opacity: 0.25,
      });
      const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
      sphere.add(outerGlow);

      // Ring around node for extra visibility
      const ringGeometry = new THREE.RingGeometry(node.size * 1.4, node.size * 1.7, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: '#ff0000',
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      sphere.add(ring);

      // Second ring perpendicular
      const ring2 = ring.clone();
      ring2.rotation.x = Math.PI / 2;
      sphere.add(ring2);
    }

    return sphere;
  }, []);

  // Handle hover
  const handleNodeHover = useCallback((node: GraphNode | null, event?: MouseEvent) => {
    if (node?.type === 'timeline') {
      setHoveredNode(null);
      return;
    }
    setHoveredNode(node);
    if (event) {
      setTooltipPos({ x: event.clientX, y: event.clientY });
    }
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? 'pointer' : 'grab';
    }
  }, []);

  // Handle click - expand levels
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === 'timeline') return;

    if (node.type === 'article' || node.type === 'unterartikel') {
      if (!showPAs) {
        setShowUnterartikel(true);
        setShowPAs(true);
      }
    } else if (node.type === 'pa') {
      if (!showOperations) {
        setShowUnterartikel(true);
        setShowPAs(true);
        setShowOperations(true);
      }
    }
  }, [showPAs, showOperations]);

  // Add timeline line to scene
  useEffect(() => {
    if (!fgRef.current || graphData.nodes.length === 0) return;

    const scene = fgRef.current.scene();
    if (!scene) return;

    // Remove existing timeline line if any
    const existingLine = scene.getObjectByName('timeline-line');
    if (existingLine) {
      scene.remove(existingLine);
    }

    // Create timeline line along X-axis at y=0, z=0
    const lineGeometry = new THREE.BufferGeometry();
    const points = [
      new THREE.Vector3(-250, 0, 0),
      new THREE.Vector3(250, 0, 0),
    ];
    lineGeometry.setFromPoints(points);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: COLORS.article,
      linewidth: 3,
      transparent: true,
      opacity: 0.8,
    });

    const timelineLine = new THREE.Line(lineGeometry, lineMaterial);
    timelineLine.name = 'timeline-line';
    scene.add(timelineLine);

    // Add a thin tube for better visibility (lines are always 1px in WebGL)
    const tubeRadius = 1.5;
    const tubePath = new THREE.LineCurve3(
      new THREE.Vector3(-250, 0, 0),
      new THREE.Vector3(250, 0, 0)
    );
    const tubeGeometry = new THREE.TubeGeometry(tubePath, 1, tubeRadius, 8, false);
    const tubeMaterial = new THREE.MeshLambertMaterial({
      color: COLORS.article,
      transparent: true,
      opacity: 0.6,
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tube.name = 'timeline-tube';

    // Remove existing tube if any
    const existingTube = scene.getObjectByName('timeline-tube');
    if (existingTube) {
      scene.remove(existingTube);
    }
    scene.add(tube);

    return () => {
      const line = scene.getObjectByName('timeline-line');
      const tube = scene.getObjectByName('timeline-tube');
      if (line) scene.remove(line);
      if (tube) scene.remove(tube);
    };
  }, [graphData, COLORS]);

  // Setup auto-rotation and zoom
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 150);
      }, 500);

      const controls = fgRef.current.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.3;
      }
    }
  }, [graphData]);

  // Animation loop for auto-rotation
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      if (fgRef.current) {
        const controls = fgRef.current.controls();
        if (controls?.autoRotate) {
          controls.update();
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Export to HTML handler
  const handleExportHTML = useCallback(() => {
    if (graphData.nodes.length === 0) return;

    // Get time period for title
    const periodLabel = timeUnit === 'week'
      ? weekOptions.find(o => o.value === selectedWeek)?.label || selectedWeek
      : monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth;

    // Get overdue items (only articles and PAs, not operations)
    const overdueItems = graphData.nodes
      .filter(n => n.isOverdue && n.type !== 'timeline' && n.type !== 'operation')
      .map(n => ({
        identifier: n.identifier,
        name: n.name,
        type: n.type === 'article' ? 'Art' :
              n.type === 'unterartikel' ? 'UA' :
              n.type === 'pa' ? 'PA' : n.type,
        endDate: n.endDate ? n.endDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : undefined,
      }));

    export3DVisualization(
      {
        nodes: graphData.nodes.map(n => ({
          ...n,
          deliveryDate: n.deliveryDate?.toISOString(),
        })),
        links: graphData.links,
      },
      {
        title: 'Force Timeline 3D',
        subtitle: `${filteredArticles.length} Artikel - ${periodLabel}`,
        articleInfo: undefined,
        overdueItems,
        showTimeline: true,
        backgroundColor: COLORS.background,
        colors: {
          article: COLORS.article,
          link: COLORS.link,
        },
      }
    );
  }, [graphData, filteredArticles, timeUnit, selectedWeek, selectedMonth, weekOptions, monthOptions, COLORS]);

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
            Force Timeline 3D
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            3D-Visualisierung der Verkaufsartikel nach Lieferdatum
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onSwitchTo2D && (
            <Button variant="outline" size="sm" onClick={onSwitchTo2D}>
              <Circle className="h-4 w-4 mr-2" />
              2D View
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportHTML} disabled={graphData.nodes.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            HTML Export
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
        </div>
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
              <Button variant="outline" size="sm" onClick={handleExpandCollapseAll}>
                {allExpanded ? <Shrink className="h-4 w-4 mr-2" /> : <Expand className="h-4 w-4 mr-2" />}
                {allExpanded ? "Einklappen" : "Ausklappen"}
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

            {/* Legend */}
            <div className="flex items-center gap-4 border-l border-border pl-4">
              {Object.entries(NODE_SIZES).filter(([type]) => type !== 'timeline').map(([type, size]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div
                    className="rounded-full"
                    style={{
                      width: Math.min(size * 1.5, 14),
                      height: Math.min(size * 1.5, 14),
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

      {/* 3D Visualization */}
      <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}>
        <CardHeader className={`py-3 border-b border-border ${isFullscreen ? 'flex flex-row items-center justify-between gap-4' : ''}`}>
          <CardTitle className="text-base flex-shrink-0 flex items-center gap-2">
            <Box className="h-4 w-4" />
            {filteredArticles.length} Verkaufsartikel im Zeitraum
          </CardTitle>
          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-[var(--radius-chip)] bg-card-muted hover:bg-muted transition-colors"
              title="Vollbild beenden"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={containerRef}
            className="relative w-full"
            style={{ height: isFullscreen ? 'calc(100vh - 70px)' : '500px' }}
          >
            {graphData.nodes.length > 0 ? (
              <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                width={dimensions.width}
                height={isFullscreen ? window.innerHeight - 70 : dimensions.height}
                backgroundColor={COLORS.background}
                nodeThreeObject={nodeThreeObject}
                nodeThreeObjectExtend={false}
                linkColor={(link: any) => {
                  // Timeline-to-root links get article color, others get default
                  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                  if (sourceId?.startsWith('timeline-anchor-')) {
                    return COLORS.article;
                  }
                  return COLORS.link;
                }}
                linkWidth={(link: any) => {
                  // Timeline-to-root links are thicker
                  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                  if (sourceId?.startsWith('timeline-anchor-')) {
                    return 2;
                  }
                  return 1;
                }}
                linkOpacity={0.6}
                onNodeHover={handleNodeHover as any}
                onNodeClick={handleNodeClick as any}
                enableNodeDrag={true}
                enableNavigationControls={true}
                showNavInfo={false}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.4}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Keine Verkaufsartikel mit Lieferdatum im gewählten Zeitraum
              </div>
            )}

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
                  {hoveredNode.deliveryDate && (
                    <>
                      <span className="text-muted-foreground">Lieferdatum:</span>
                      <span className="text-foreground">
                        {hoveredNode.deliveryDate.toLocaleDateString('de-DE')}
                      </span>
                    </>
                  )}
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

            {/* 3D Controls Hint */}
            <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-2 rounded-lg">
              <div className="text-foreground/70 mb-1">Auto-Rotation aktiv</div>
              <div>Linke Maustaste: Manuell rotieren</div>
              <div>Rechte Maustaste: Verschieben</div>
              <div>Scrollrad: Zoom</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
