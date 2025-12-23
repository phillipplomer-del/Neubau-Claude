/**
 * Soll-Ist Vergleich (Comparison View)
 * Hierarchical tree view of production data with planned vs actual comparison
 */

import { useState, useMemo } from 'react';
import { useProductionHierarchy, type HierarchyNode } from '@/hooks/useProductionHierarchy';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Package,
  Wrench,
  Settings,
  Search,
} from 'lucide-react';

/**
 * Format number with German locale
 */
function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency
 */
function formatCurrency(value: number): string {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Get variance color class
 */
function getVarianceColor(variance: number): string {
  if (variance < -0.1) return 'text-green-600 dark:text-green-400'; // Under budget
  if (variance > 0.1) return 'text-red-600 dark:text-red-400';      // Over budget
  return 'text-muted-foreground';                                    // On budget
}

/**
 * Get icon for node type
 */
function getNodeIcon(type: HierarchyNode['type'], isExpanded: boolean) {
  switch (type) {
    case 'project':
      return isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />;
    case 'article':
      return <Package className="h-4 w-4" />;
    case 'mainPA':
    case 'pa':
      return <Wrench className="h-4 w-4" />;
    case 'operation':
      return <Settings className="h-4 w-4" />;
  }
}

/**
 * Get background color for node type
 */
function getNodeBgClass(type: HierarchyNode['type']): string {
  switch (type) {
    case 'project':
      return 'bg-blue-50 dark:bg-blue-950/30';
    case 'article':
      return 'bg-green-50 dark:bg-green-950/30';
    case 'mainPA':
      return 'bg-orange-50 dark:bg-orange-950/30';
    case 'pa':
      return 'bg-purple-50 dark:bg-purple-950/30';
    case 'operation':
      return '';
  }
}

interface HierarchyRowProps {
  node: HierarchyNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  showCosts: boolean;
}

function HierarchyRow({ node, level, expandedNodes, onToggle, showCosts }: HierarchyRowProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const isLeaf = node.type === 'operation';

  const hoursVariancePercent = node.plannedHours > 0
    ? ((node.actualHours - node.plannedHours) / node.plannedHours)
    : 0;

  const costsVariancePercent = node.plannedCosts > 0
    ? ((node.actualCosts - node.plannedCosts) / node.plannedCosts)
    : 0;

  return (
    <>
      <div
        className={`
          flex items-center gap-2 py-2 px-3 border-b border-border/50
          hover:bg-muted/50 transition-colors cursor-pointer
          ${getNodeBgClass(node.type)}
        `}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        {/* Expand/Collapse button */}
        <div className="w-5 h-5 flex items-center justify-center">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4" />
          )}
        </div>

        {/* Icon */}
        <div className="text-muted-foreground">
          {getNodeIcon(node.type, isExpanded)}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          {node.type === 'article' ? (
            // Article: Show identifier (article number) first, then description
            <>
              <span className="font-medium font-mono">{node.identifier}</span>
              {node.name !== node.identifier && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {node.name}
                </span>
              )}
            </>
          ) : (node.type === 'pa' || node.type === 'mainPA') ? (
            // PA/MainPA: Show name, then article number in brackets
            <>
              <span className="font-medium">{node.name}</span>
              {node.articleNumber && (
                <span className="ml-2 text-xs text-muted-foreground font-mono">
                  [{node.articleNumber}]
                </span>
              )}
            </>
          ) : (
            // Other types: Show name first, then identifier
            <>
              <span className={`font-medium ${isLeaf ? 'text-sm' : ''}`}>
                {node.name}
              </span>
              {node.identifier && node.identifier !== node.name && (
                <span className="ml-2 text-xs text-muted-foreground font-mono">
                  {node.identifier}
                </span>
              )}
            </>
          )}
        </div>

        {/* Status indicator */}
        {node.isActive && (
          <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Aktiv
          </span>
        )}

        {/* Hours: Soll / Ist / Δ */}
        <div className="flex items-center gap-4 text-sm tabular-nums">
          <div className="w-20 text-right">
            <span className="text-muted-foreground">Soll:</span>{' '}
            <span className="font-medium">{formatNumber(node.plannedHours)}h</span>
          </div>
          <div className="w-20 text-right">
            <span className="text-muted-foreground">Ist:</span>{' '}
            <span className="font-medium">{formatNumber(node.actualHours)}h</span>
          </div>
          <div className={`w-24 text-right font-medium ${getVarianceColor(hoursVariancePercent)}`}>
            Δ {node.hoursVariance >= 0 ? '+' : ''}{formatNumber(node.hoursVariance)}h
          </div>
        </div>

        {/* Costs: Soll / Ist / Δ */}
        {showCosts && (
          <div className="flex items-center gap-4 text-sm tabular-nums border-l border-border pl-4">
            <div className="w-24 text-right">
              <span className="text-muted-foreground">Soll:</span>{' '}
              <span className="font-medium">{formatCurrency(node.plannedCosts)}</span>
            </div>
            <div className="w-24 text-right">
              <span className="text-muted-foreground">Ist:</span>{' '}
              <span className="font-medium">{formatCurrency(node.actualCosts)}</span>
            </div>
            <div className={`w-28 text-right font-medium ${getVarianceColor(costsVariancePercent)}`}>
              Δ {node.costsVariance >= 0 ? '+' : ''}{formatCurrency(node.costsVariance)}
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && node.children.map((child) => (
        <HierarchyRow
          key={child.id}
          node={child}
          level={level + 1}
          expandedNodes={expandedNodes}
          onToggle={onToggle}
          showCosts={showCosts}
        />
      ))}
    </>
  );
}

export default function ComparisonView() {
  const [hideCompleted, setHideCompleted] = useState(true);

  const {
    loading,
    error,
    hierarchy,
    flatList,
    refresh,
    totalPlannedHours,
    totalActualHours,
    totalPlannedCosts,
    totalActualCosts,
    totalEntries,
    filteredEntries,
    completedCount,
  } = useProductionHierarchy({ hideCompleted });

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showCosts, setShowCosts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewLevel, setViewLevel] = useState<'all' | 'projects' | 'articles'>('all');

  // Filter hierarchy based on search and view level
  const filteredHierarchy = useMemo(() => {
    let result = hierarchy;

    // Apply view level filter
    if (viewLevel === 'projects') {
      // Show only projects as root - filter out non-project root nodes
      result = result.filter(node => node.type === 'project');
    } else if (viewLevel === 'articles') {
      // Show only articles without project (orphan articles at root level)
      result = result.filter(node => node.type === 'article');
    }

    // Apply search filter
    if (!searchQuery.trim()) return result;

    const query = searchQuery.toLowerCase();

    function filterNode(node: HierarchyNode, parentMatches: boolean = false): HierarchyNode | null {
      // Check if this node matches
      const thisMatches =
        node.name.toLowerCase().includes(query) ||
        node.identifier.toLowerCase().includes(query);

      // If this node or a parent matches, keep ALL children intact
      if (thisMatches || parentMatches) {
        return node; // Return original node with all children
      }

      // Otherwise, filter children recursively
      const filteredChildren = node.children
        .map(child => filterNode(child, false))
        .filter((n): n is HierarchyNode => n !== null);

      // Include this node if it has matching descendants
      if (filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    }

    return result
      .map(node => filterNode(node, false))
      .filter((n): n is HierarchyNode => n !== null);
  }, [hierarchy, searchQuery, viewLevel]);

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

  // Expand/collapse all
  const expandAll = () => {
    const allIds = new Set<string>();
    function collectIds(nodes: HierarchyNode[]) {
      for (const node of nodes) {
        if (node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      }
    }
    collectIds(filteredHierarchy);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Calculate totals
  const totalHoursVariance = totalActualHours - totalPlannedHours;
  const totalCostsVariance = totalActualCosts - totalPlannedCosts;
  const hoursVariancePercent = totalPlannedHours > 0
    ? (totalHoursVariance / totalPlannedHours)
    : 0;
  const costsVariancePercent = totalPlannedCosts > 0
    ? (totalCostsVariance / totalPlannedCosts)
    : 0;

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
          <h1 className="text-xl font-bold text-foreground">Soll-Ist Vergleich</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hideCompleted ? (
              <>
                {filteredEntries} offene Einträge
                <span className="text-muted-foreground/60"> ({completedCount} abgeschlossen ausgeblendet)</span>
              </>
            ) : (
              <>{totalEntries} Einträge gesamt</>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Soll Stunden</div>
            <div className="text-2xl font-bold">{formatNumber(totalPlannedHours)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Ist Stunden</div>
            <div className="text-2xl font-bold">{formatNumber(totalActualHours)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Abweichung Stunden</div>
            <div className={`text-2xl font-bold ${getVarianceColor(hoursVariancePercent)}`}>
              {totalHoursVariance >= 0 ? '+' : ''}{formatNumber(totalHoursVariance)}h
              <span className="text-sm ml-1">
                ({hoursVariancePercent >= 0 ? '+' : ''}{formatNumber(hoursVariancePercent * 100, 0)}%)
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Abweichung Kosten</div>
            <div className={`text-2xl font-bold ${getVarianceColor(costsVariancePercent)}`}>
              {totalCostsVariance >= 0 ? '+' : ''}{formatCurrency(totalCostsVariance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Suche nach Projekt, Artikel, PA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Expand/Collapse buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Alle aufklappen
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Alle zuklappen
          </Button>
        </div>

        {/* View Level Filter */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewLevel('all')}
            className={`px-3 py-1 text-sm rounded ${viewLevel === 'all' ? 'bg-background shadow' : ''}`}
          >
            Alle
          </button>
          <button
            onClick={() => setViewLevel('projects')}
            className={`px-3 py-1 text-sm rounded ${viewLevel === 'projects' ? 'bg-background shadow' : ''}`}
          >
            Nur Projekte
          </button>
          <button
            onClick={() => setViewLevel('articles')}
            className={`px-3 py-1 text-sm rounded ${viewLevel === 'articles' ? 'bg-background shadow' : ''}`}
          >
            Nur Artikel
          </button>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="rounded border-border"
            />
            <span>Abgeschlossene ausblenden</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showCosts}
              onChange={(e) => setShowCosts(e.target.checked)}
              className="rounded border-border"
            />
            <span>Kosten anzeigen</span>
          </label>
        </div>
      </div>

      {/* Hierarchy Tree */}
      <Card>
        <CardHeader className="py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="flex-1">Struktur</div>
            <div className="flex items-center gap-4">
              <div className="w-20 text-right">Soll</div>
              <div className="w-20 text-right">Ist</div>
              <div className="w-24 text-right">Abweichung</div>
            </div>
            {showCosts && (
              <div className="flex items-center gap-4 border-l border-border pl-4">
                <div className="w-24 text-right">Soll €</div>
                <div className="w-24 text-right">Ist €</div>
                <div className="w-28 text-right">Abweichung €</div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            {filteredHierarchy.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Keine Ergebnisse für "{searchQuery}"
              </div>
            ) : (
              filteredHierarchy.map((node) => (
                <HierarchyRow
                  key={node.id}
                  node={node}
                  level={0}
                  expandedNodes={expandedNodes}
                  onToggle={toggleNode}
                  showCosts={showCosts}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
