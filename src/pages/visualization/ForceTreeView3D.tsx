/**
 * 3D Force-Directed Tree Visualization
 * Shows article hierarchy as an interactive 3D force-directed graph
 * Uses react-force-graph-3d for WebGL-based 3D rendering
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import { useProductionHierarchy, type HierarchyNode } from '@/hooks/useProductionHierarchy';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { RefreshCw, AlertCircle, Maximize2, Minimize2, Search, X, Box, Circle } from 'lucide-react';

// Node type for 3D graph
interface GraphNode {
  id: string;
  name: string;
  type: 'project' | 'article' | 'mainPA' | 'pa' | 'operation';
  color: string;
  size: number;
  plannedHours: number;
  actualHours: number;
  completionPercentage: number;
  identifier: string;
  articleNumber?: string;
  description?: string;
  isCompleted: boolean;
  isOverdue: boolean;
  depth: number;
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

// Light mode colors (Aqua)
const COLORS_LIGHT = {
  project: '#00E097',
  article: '#00DEE0',
  mainPA: '#00B8D4',
  pa: '#0050E0',
  operation: '#00C9A7',
  link: '#94a3b8',
  background: '#ffffff',
};

// Dark mode colors (Gold/Lime)
const COLORS_DARK = {
  project: '#E0BD00',
  article: '#9EE000',
  mainPA: '#45F600',
  pa: '#B8E000',
  operation: '#D4E040',
  link: '#4a5568',
  background: '#1A1A12',
};

// Base node sizes by type
const NODE_BASE_SIZES = {
  project: 12,
  article: 8,
  mainPA: 6,
  pa: 5,
  operation: 3,
};

// Maximum node sizes by type
const NODE_MAX_SIZES = {
  project: 25,
  article: 18,
  mainPA: 12,
  pa: 10,
  operation: 6,
};

function calculateNodeSize(type: string, plannedHours: number, maxHours: number): number {
  const baseSize = NODE_BASE_SIZES[type as keyof typeof NODE_BASE_SIZES] || 5;
  const maxSize = NODE_MAX_SIZES[type as keyof typeof NODE_MAX_SIZES] || 10;

  if (maxHours <= 0 || plannedHours <= 0) return baseSize;

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

// Filter out articles with number "100"
function filterHierarchy(nodes: HierarchyNode[]): HierarchyNode[] {
  return nodes.map(node => {
    const filteredChildren = node.children
      .filter(child => {
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

interface LevelVisibility {
  showArticles: boolean;
  showPAs: boolean;
  showOperations: boolean;
  hideCompleted: boolean;
}

function filterByLevels(nodes: HierarchyNode[], visibility: LevelVisibility): HierarchyNode[] {
  return nodes
    .filter(node => {
      if (visibility.hideCompleted && node.isCompleted) {
        if (node.type === 'article' || node.type === 'pa' || node.type === 'mainPA' || node.type === 'operation') {
          return false;
        }
      }
      return true;
    })
    .map(node => {
      let filteredChildren = node.children;

      if (node.type === 'project' && !visibility.showArticles) {
        return { ...node, children: [] };
      }

      if (node.type === 'article' && !visibility.showPAs) {
        return { ...node, children: [] };
      }

      if ((node.type === 'pa' || node.type === 'mainPA') && !visibility.showOperations) {
        return { ...node, children: [] };
      }

      filteredChildren = filterByLevels(node.children, visibility);

      return {
        ...node,
        children: filteredChildren,
      };
    });
}

// Convert hierarchy to graph data for react-force-graph-3d
function hierarchyToGraphData(
  hierarchy: HierarchyNode[],
  colors: typeof COLORS_LIGHT
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  if (hierarchy.length === 0) return { nodes, links };

  // Calculate max hours by type for sizing
  const maxHoursByType: Record<string, number> = {};
  function calcMaxHours(node: HierarchyNode) {
    const type = node.type;
    const hours = node.plannedHours;
    if (!maxHoursByType[type] || hours > maxHoursByType[type]) {
      maxHoursByType[type] = hours;
    }
    node.children.forEach(calcMaxHours);
  }
  hierarchy.forEach(calcMaxHours);

  // Process each tree in the hierarchy
  function processNode(node: HierarchyNode, depth: number, parentId: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = node.isActive &&
                      !node.isCompleted &&
                      node.endDate !== undefined &&
                      node.endDate < today;

    const graphNode: GraphNode = {
      id: node.id,
      name: node.name,
      type: node.type,
      color: colors[node.type] || colors.operation,
      size: calculateNodeSize(node.type, node.plannedHours, maxHoursByType[node.type] || 1),
      plannedHours: node.plannedHours,
      actualHours: node.actualHours,
      completionPercentage: node.completionPercentage,
      identifier: node.identifier,
      articleNumber: node.articleNumber,
      description: node.description,
      isCompleted: node.isCompleted,
      isOverdue,
      depth,
    };

    nodes.push(graphNode);

    if (parentId) {
      links.push({
        source: parentId,
        target: node.id,
      });
    }

    node.children.forEach(child => processNode(child, depth + 1, node.id));
  }

  hierarchy.forEach(root => processNode(root, 0, null));

  return { nodes, links };
}

function formatHours(hours: number): string {
  if (hours < 1) return `${(hours * 60).toFixed(0)} min`;
  return `${hours.toFixed(1)} h`;
}

interface ForceTreeView3DProps {
  onSwitchTo2D?: () => void;
}

export default function ForceTreeView3D({ onSwitchTo2D }: ForceTreeView3DProps) {
  const isDark = useDarkMode();
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;

  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedVerkaufsartikel, setSelectedVerkaufsartikel] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Level visibility toggles
  const [showUnterartikel, setShowUnterartikel] = useState(true);
  const [showPAs, setShowPAs] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const isAllExpanded = showUnterartikel && showPAs && showOperations;
  const handleExpandAll = (expand: boolean) => {
    setShowUnterartikel(expand);
    setShowPAs(expand);
    setShowOperations(expand);
  };

  const { loading, error, hierarchy, refresh } = useProductionHierarchy({
    hideCompleted: false,
  });

  const filteredHierarchy = useMemo(() => {
    return filterHierarchy(hierarchy);
  }, [hierarchy]);

  const projectList = useMemo(() => {
    return filteredHierarchy
      .filter(node => node.type === 'project' && node.isActive)
      .map(project => ({
        id: project.id,
        name: project.name,
        identifier: project.identifier,
        articleCount: project.children.filter(c => c.type === 'article' && c.isMainArticle === true && c.identifier !== '100').length,
      }))
      .filter(p => p.articleCount > 0);
  }, [filteredHierarchy]);

  const verkaufsartikelList = useMemo(() => {
    const result: Array<{ id: string; name: string; identifier: string; projectName: string; projectId: string }> = [];

    filteredHierarchy
      .filter(node => node.type === 'project' && node.isActive)
      .forEach(project => {
        project.children
          .filter(child =>
            child.type === 'article' &&
            child.identifier !== '100' &&
            child.isMainArticle === true
          )
          .forEach(article => {
            result.push({
              id: article.id,
              name: article.name,
              identifier: article.identifier,
              projectName: project.name.replace('Projekt ', ''),
              projectId: project.id,
            });
          });
      });

    return result;
  }, [filteredHierarchy]);

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return [];

    const query = searchQuery.toLowerCase();

    return verkaufsartikelList
      .filter(article =>
        article.identifier.toLowerCase().includes(query) ||
        article.name.toLowerCase().includes(query) ||
        article.projectName.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [verkaufsartikelList, searchQuery]);

  const selectedHierarchy = useMemo(() => {
    const visibility: LevelVisibility = {
      showArticles: showUnterartikel,
      showPAs,
      showOperations,
      hideCompleted
    };

    if (selectedVerkaufsartikel && !selectedProject) {
      for (const project of filteredHierarchy) {
        for (const article of project.children) {
          if (article.id === selectedVerkaufsartikel) {
            return filterByLevels([article], visibility);
          }
        }
      }
      return [];
    }

    if (selectedProject) {
      const project = filteredHierarchy.find(p => p.id === selectedProject);
      if (project) {
        const verkaufsartikel = project.children.filter(
          c => c.type === 'article' && c.isMainArticle === true && c.identifier !== '100'
        );
        return verkaufsartikel
          .map(article => filterByLevels([article], visibility)[0])
          .filter((node): node is HierarchyNode => node !== undefined);
      }
      return [];
    }

    const firstArticle = verkaufsartikelList[0];
    if (firstArticle) {
      for (const project of filteredHierarchy) {
        for (const article of project.children) {
          if (article.id === firstArticle.id) {
            return filterByLevels([article], visibility);
          }
        }
      }
    }

    return [];
  }, [filteredHierarchy, selectedVerkaufsartikel, selectedProject, verkaufsartikelList, showUnterartikel, showPAs, showOperations, hideCompleted]);

  // Auto-select first Verkaufsartikel
  useEffect(() => {
    if (!selectedProject && verkaufsartikelList.length > 0 && !selectedVerkaufsartikel) {
      setSelectedVerkaufsartikel(verkaufsartikelList[0]!.id);
    }
  }, [verkaufsartikelList, selectedVerkaufsartikel, selectedProject]);

  // Convert to graph data
  const graphData = useMemo(() => {
    return hierarchyToGraphData(selectedHierarchy, COLORS);
  }, [selectedHierarchy, COLORS]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 600,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isFullscreen]);

  // Custom node rendering - 3D spheres
  const nodeThreeObject = useCallback((node: GraphNode) => {
    const geometry = new THREE.SphereGeometry(node.size, 32, 32);

    // Calculate opacity based on completion
    const opacity = node.isCompleted ? 1.0 : 0.3 + (node.completionPercentage / 100) * 0.7;

    const material = new THREE.MeshLambertMaterial({
      color: node.color,
      transparent: true,
      opacity,
    });

    const sphere = new THREE.Mesh(geometry, material);

    // Add prominent glow effect for overdue nodes
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

  // Handle node hover
  const handleNodeHover = useCallback((node: GraphNode | null, event?: MouseEvent) => {
    setHoveredNode(node);
    if (event) {
      setTooltipPos({ x: event.clientX, y: event.clientY });
    }
    // Change cursor
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? 'pointer' : 'grab';
    }
  }, []);

  // Handle node click - expand/collapse
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === 'article') {
      if (!showPAs) {
        setShowUnterartikel(true);
        setShowPAs(true);
      }
    } else if (node.type === 'pa' || node.type === 'mainPA') {
      if (!showOperations) {
        setShowUnterartikel(true);
        setShowPAs(true);
        setShowOperations(true);
      }
    }
  }, [showPAs, showOperations]);

  // Handle right-click - collapse
  const handleNodeRightClick = useCallback((node: GraphNode, event: MouseEvent) => {
    event.preventDefault();
    if (node.type === 'article') {
      setShowUnterartikel(false);
      setShowPAs(false);
      setShowOperations(false);
    } else if (node.type === 'pa' || node.type === 'mainPA') {
      setShowPAs(false);
      setShowOperations(false);
    } else if (node.type === 'operation') {
      setShowOperations(false);
    }
  }, []);

  // Zoom to fit when data changes and enable auto-rotation
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 100);
      }, 500);

      // Enable slow auto-rotation
      const controls = fgRef.current.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5; // Slow rotation speed
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
            Force-Directed Tree 3D
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Interaktive 3D-Artikelstruktur (Verkaufsartikel &rarr; Unterartikel &rarr; PAs &rarr; Arbeitsgänge)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onSwitchTo2D && (
            <Button variant="outline" size="sm" onClick={onSwitchTo2D}>
              <Circle className="h-4 w-4 mr-2" />
              2D View
            </Button>
          )}
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
            {/* Search */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  placeholder="Verkaufsartikel suchen..."
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

              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-[var(--radius-card)] shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
                      onClick={() => {
                        setSelectedVerkaufsartikel(result.id);
                        setSelectedProject(null);
                        setSearchQuery('');
                        setShowSearchResults(false);
                      }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS.article }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {result.identifier}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {result.name.replace(/^Artikel /, '')} ({result.projectName})
                        </div>
                      </div>
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
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    setSelectedProject(value);
                    setSelectedVerkaufsartikel(null);
                  } else {
                    setSelectedProject(null);
                  }
                }}
                className="px-3 py-1.5 rounded-[var(--radius-chip)] bg-card-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-mint)]"
              >
                <option value="">-- Einzelartikel --</option>
                {projectList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.identifier} ({p.articleCount} Artikel)
                  </option>
                ))}
              </select>
            </div>

            {/* Verkaufsartikel Selector */}
            {!selectedProject && (
              <div className="flex items-center gap-2 border-l border-border pl-4">
                <label className="text-sm font-medium text-muted-foreground">Artikel:</label>
                <select
                  value={selectedVerkaufsartikel || ''}
                  onChange={(e) => setSelectedVerkaufsartikel(e.target.value)}
                  className="px-3 py-1.5 rounded-[var(--radius-chip)] bg-card-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-mint)]"
                >
                  {verkaufsartikelList.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.identifier} - {a.name.replace('Artikel ', '')} ({a.projectName})
                    </option>
                  ))}
                </select>
              </div>
            )}

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

      {/* 3D Visualization */}
      <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}>
        <CardHeader className={`py-3 border-b border-border ${isFullscreen ? 'flex flex-row items-center justify-between gap-4' : ''}`}>
          <CardTitle className="text-base flex-shrink-0 flex items-center gap-2">
            <Box className="h-4 w-4" />
            {selectedProject
              ? `Projekt ${projectList.find(p => p.id === selectedProject)?.identifier || ''} (${selectedHierarchy.length} Artikel)`
              : selectedHierarchy.length > 0
                ? selectedHierarchy[0]!.name
                : 'Kein Artikel ausgewählt'}
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
            style={{ height: isFullscreen ? 'calc(100vh - 70px)' : '600px' }}
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
                linkColor={() => COLORS.link}
                linkWidth={1.5}
                linkOpacity={0.6}
                onNodeHover={handleNodeHover as any}
                onNodeClick={handleNodeClick as any}
                onNodeRightClick={handleNodeRightClick as any}
                enableNodeDrag={true}
                enableNavigationControls={true}
                showNavInfo={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Kein Verkaufsartikel ausgewählt oder keine Daten verfügbar
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
                  {hoveredNode.articleNumber && hoveredNode.type !== 'article' && (
                    <>
                      <span className="text-muted-foreground">Artikel-Nr:</span>
                      <span className="text-foreground">{hoveredNode.articleNumber}</span>
                    </>
                  )}
                </div>
                {hoveredNode.description && (
                  <div className="text-xs text-muted-foreground mb-2 italic border-l-2 border-border pl-2">
                    {hoveredNode.description}
                  </div>
                )}
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
