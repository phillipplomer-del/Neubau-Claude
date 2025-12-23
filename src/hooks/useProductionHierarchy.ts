/**
 * Production Hierarchy Hook
 * Groups production data into a hierarchical structure:
 * Project (optional) → Article → Main PA → PA → Operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { productionRepository } from '@/lib/db/repositories/productionRepository';
import type { ProductionEntry } from '@/types/production';

/**
 * Hierarchy node representing any level in the tree
 */
export interface HierarchyNode {
  id: string;
  type: 'project' | 'article' | 'mainPA' | 'pa' | 'operation';
  name: string;
  identifier: string; // projektnummer, artikelnummer, PA number, etc.
  articleNumber?: string; // Artikelnummer for PA/MainPA nodes
  children: HierarchyNode[];

  // Aggregated values (sum of children)
  plannedHours: number;
  actualHours: number;
  plannedCosts: number;
  actualCosts: number;
  hoursVariance: number;  // actualHours - plannedHours
  costsVariance: number;  // actualCosts - plannedCosts

  // Time range (min/max of children)
  startDate?: Date;
  endDate?: Date;

  // Status (aggregated)
  completionPercentage: number;
  isActive: boolean;
  status?: string;

  // Count
  operationCount: number;
  paCount: number;

  // Original entry (only for leaf nodes / operations)
  entry?: ProductionEntry;
}

export interface UseProductionHierarchyOptions {
  /**
   * If true, filter out completed projects/articles (where all PAs are closed)
   * Default: true for performance
   */
  hideCompleted?: boolean;
}

export interface UseProductionHierarchyReturn {
  loading: boolean;
  error: string | null;
  hierarchy: HierarchyNode[];
  flatList: ProductionEntry[];
  refresh: () => Promise<void>;

  // Stats
  totalPlannedHours: number;
  totalActualHours: number;
  totalPlannedCosts: number;
  totalActualCosts: number;

  // Counts
  totalEntries: number;
  filteredEntries: number;
  completedCount: number;
}

/**
 * Deserialize dates in production entry
 */
function deserializeProductionEntry(entry: ProductionEntry): ProductionEntry {
  return {
    ...entry,
    plannedStartDate: entry.plannedStartDate ? new Date(entry.plannedStartDate) : undefined,
    plannedEndDate: entry.plannedEndDate ? new Date(entry.plannedEndDate) : undefined,
    actualStartDate: entry.actualStartDate ? new Date(entry.actualStartDate) : undefined,
    actualEndDate: entry.actualEndDate ? new Date(entry.actualEndDate) : undefined,
    importedAt: entry.importedAt ? new Date(entry.importedAt) : new Date(),
  };
}

/**
 * Check if a value is valid (not empty or placeholder)
 */
function isValidValue(value: string | undefined | null): value is string {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  // Only filter out clear placeholder values, NOT '0' which could be a valid identifier
  if (trimmed === '-' || trimmed.toLowerCase() === 'n/a') return false;
  return true;
}

/**
 * Check if an entry is completed/closed
 * An entry is completed if:
 * - status contains "geschlossen", "closed", "abgeschlossen", "fertig"
 * - OR active is not "X" and completionPercentage is 100
 */
function isEntryCompleted(entry: ProductionEntry): boolean {
  // Check status field
  if (entry.status) {
    const status = entry.status.toLowerCase();
    if (
      status.includes('geschlossen') ||
      status.includes('closed') ||
      status.includes('abgeschlossen') ||
      status.includes('fertig') ||
      status.includes('erledigt')
    ) {
      return true;
    }
  }

  // Check if not active and 100% complete
  const isActive = entry.active === 'X' || entry.active === true;
  if (!isActive && entry.completionPercentage === 100) {
    return true;
  }

  return false;
}

/**
 * Filter out completely finished top-level nodes from hierarchy
 * Only removes projects/articles where ALL children are completed
 * Keeps all children (PAs, operations) intact - we only filter at root level
 */
function filterCompletedNodes(nodes: HierarchyNode[]): HierarchyNode[] {
  return nodes.filter(node => {
    // Check if this entire node (and all its descendants) is completed
    // If so, remove it from the list
    return !isNodeFullyCompleted(node);
  });
}

/**
 * Check if a node and ALL its descendants are completed
 */
function isNodeFullyCompleted(node: HierarchyNode): boolean {
  // Leaf node: check the entry directly
  if (node.entry) {
    return isEntryCompleted(node.entry);
  }

  // Parent node: all children must be fully completed
  if (node.children.length === 0) {
    return false; // No children = not completed
  }

  return node.children.every(isNodeFullyCompleted);
}

/**
 * Build hierarchy from flat production entries
 */
function buildHierarchy(entries: ProductionEntry[]): HierarchyNode[] {
  // Group entries by: Project → Article → MainPA → PA → Operations
  const projectMap = new Map<string, Map<string, Map<string, Map<string, ProductionEntry[]>>>>();

  for (const entry of entries) {
    const projectKey = isValidValue(entry.projektnummer) ? entry.projektnummer : '__NO_PROJECT__';
    const articleKey = isValidValue(entry.artikelnummer) ? entry.artikelnummer : '__NO_ARTICLE__';
    const mainPAKey = isValidValue(entry.mainWorkOrderNumber) ? entry.mainWorkOrderNumber : '__NO_MAIN_PA__';
    const paKey = isValidValue(entry.workOrderNumber) ? entry.workOrderNumber : '__NO_PA__';

    if (!projectMap.has(projectKey)) {
      projectMap.set(projectKey, new Map());
    }
    const articleMap = projectMap.get(projectKey)!;

    if (!articleMap.has(articleKey)) {
      articleMap.set(articleKey, new Map());
    }
    const mainPAMap = articleMap.get(articleKey)!;

    if (!mainPAMap.has(mainPAKey)) {
      mainPAMap.set(mainPAKey, new Map());
    }
    const paMap = mainPAMap.get(mainPAKey)!;

    if (!paMap.has(paKey)) {
      paMap.set(paKey, []);
    }
    paMap.get(paKey)!.push(entry);
  }

  // Build tree structure
  const rootNodes: HierarchyNode[] = [];

  projectMap.forEach((articleMap, projectKey) => {
    const isNoProject = projectKey === '__NO_PROJECT__';

    // Build article nodes
    const articleNodes: HierarchyNode[] = [];

    articleMap.forEach((mainPAMap, articleKey) => {
      const isNoArticle = articleKey === '__NO_ARTICLE__';

      // Build main PA nodes
      const mainPANodes: HierarchyNode[] = [];

      mainPAMap.forEach((paMap, mainPAKey) => {
        const isNoMainPA = mainPAKey === '__NO_MAIN_PA__';

        // Build PA nodes
        const paNodes: HierarchyNode[] = [];

        paMap.forEach((operations, paKey) => {
          const isNoPA = paKey === '__NO_PA__';

            // Build operation nodes (leaf nodes)
          const operationNodes: HierarchyNode[] = operations.map((entry, idx) => {
            const opName = entry.notes || entry.operationNumber || `Operation ${idx + 1}`;
            return {
              id: `op-${entry.id || idx}`,
              type: 'operation' as const,
              name: opName,
              identifier: entry.operationNumber || '',
              children: [],
              plannedHours: entry.plannedHours || 0,
              actualHours: entry.actualHours || 0,
              plannedCosts: entry.plannedCosts || 0,
              actualCosts: entry.actualCosts || 0,
              hoursVariance: (entry.actualHours || 0) - (entry.plannedHours || 0),
              costsVariance: (entry.actualCosts || 0) - (entry.plannedCosts || 0),
              startDate: entry.plannedStartDate,
              endDate: entry.plannedEndDate,
              completionPercentage: entry.completionPercentage || 0,
              isActive: entry.active === 'X' || entry.active === true,
              status: entry.status,
              operationCount: 1,
              paCount: 0,
              entry,
            };
          });

          // PA node (aggregates operations)
          // Always create PA node if we have a PA number
          if (!isNoPA) {
            const paNode = aggregateNode({
              id: `pa-${paKey}`,
              type: 'pa',
              name: `PA ${paKey}`,
              identifier: paKey,
              articleNumber: isNoArticle ? undefined : articleKey,
              children: operationNodes,
            });
            paNodes.push(paNode);
          } else {
            // No PA - add operations directly
            paNodes.push(...operationNodes);
          }
        });

        // Main PA node - always create if we have a MainPA number
        // Even if PA = MainPA, we still want the structure
        if (!isNoMainPA) {
          // Check if there's exactly one PA with the same number as MainPA
          // In that case, don't create a separate MainPA level to avoid duplication
          const firstPA = paNodes[0];
          const hasSamePA = paNodes.length === 1 &&
            firstPA &&
            firstPA.type === 'pa' &&
            firstPA.identifier === mainPAKey;

          if (hasSamePA) {
            // PA = MainPA, just use the PA node directly
            mainPANodes.push(...paNodes);
          } else {
            // Multiple PAs or different number - create MainPA container
            const mainPANode = aggregateNode({
              id: `mainpa-${mainPAKey}`,
              type: 'mainPA',
              name: `Haupt-PA ${mainPAKey}`,
              identifier: mainPAKey,
              articleNumber: isNoArticle ? undefined : articleKey,
              children: paNodes,
            });
            mainPANodes.push(mainPANode);
          }
        } else {
          // No MainPA - add PA nodes directly
          mainPANodes.push(...paNodes);
        }
      });

      // Article node - always create if we have an article number
      if (!isNoArticle) {
        const firstEntry = findFirstEntry(mainPANodes);
        const description = firstEntry?.productDescription || articleKey;

        const articleNode = aggregateNode({
          id: `article-${articleKey}`,
          type: 'article',
          name: description,
          identifier: articleKey,
          children: mainPANodes,
        });
        articleNodes.push(articleNode);
      } else {
        // No article - add mainPA nodes directly
        articleNodes.push(...mainPANodes);
      }
    });

    // Project node - always create if we have a project number
    if (!isNoProject) {
      const projectNode = aggregateNode({
        id: `project-${projectKey}`,
        type: 'project',
        name: `Projekt ${projectKey}`,
        identifier: projectKey,
        children: articleNodes,
      });
      rootNodes.push(projectNode);
    } else {
      // No project - add articles directly to root
      rootNodes.push(...articleNodes);
    }
  });

  // Sort by identifier
  return sortNodes(rootNodes);
}

/**
 * Find first entry in node tree (for getting descriptions)
 */
function findFirstEntry(nodes: HierarchyNode[]): ProductionEntry | undefined {
  for (const node of nodes) {
    if (node.entry) return node.entry;
    if (node.children.length > 0) {
      const found = findFirstEntry(node.children);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Aggregate values from children to parent node
 */
function aggregateNode(partial: {
  id: string;
  type: HierarchyNode['type'];
  name: string;
  identifier: string;
  articleNumber?: string;
  children: HierarchyNode[];
}): HierarchyNode {
  const children = partial.children;

  let plannedHours = 0;
  let actualHours = 0;
  let plannedCosts = 0;
  let actualCosts = 0;
  let operationCount = 0;
  let paCount = 0;
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let totalCompletion = 0;
  let activeCount = 0;

  for (const child of children) {
    plannedHours += child.plannedHours;
    actualHours += child.actualHours;
    plannedCosts += child.plannedCosts;
    actualCosts += child.actualCosts;
    operationCount += child.operationCount;
    paCount += child.type === 'pa' ? 1 : child.paCount;
    totalCompletion += child.completionPercentage * child.operationCount;
    if (child.isActive) activeCount++;

    if (child.startDate) {
      if (!startDate || child.startDate < startDate) {
        startDate = child.startDate;
      }
    }
    if (child.endDate) {
      if (!endDate || child.endDate > endDate) {
        endDate = child.endDate;
      }
    }
  }

  return {
    ...partial,
    plannedHours,
    actualHours,
    plannedCosts,
    actualCosts,
    hoursVariance: actualHours - plannedHours,
    costsVariance: actualCosts - plannedCosts,
    startDate,
    endDate,
    completionPercentage: operationCount > 0 ? totalCompletion / operationCount : 0,
    isActive: activeCount > 0,
    operationCount,
    paCount,
  };
}

/**
 * Sort nodes recursively by identifier
 */
function sortNodes(nodes: HierarchyNode[]): HierarchyNode[] {
  return nodes
    .map(node => ({
      ...node,
      children: sortNodes(node.children),
    }))
    .sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { numeric: true }));
}

export function useProductionHierarchy(
  options: UseProductionHierarchyOptions = {}
): UseProductionHierarchyReturn {
  const { hideCompleted = true } = options;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flatList, setFlatList] = useState<ProductionEntry[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const entries = await productionRepository.getAll();
      const deserializedEntries = entries.map(deserializeProductionEntry);
      setFlatList(deserializedEntries);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Daten';
      setError(errorMessage);
      console.error('Error fetching production data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build hierarchy from flat list
  const fullHierarchy = useMemo(() => {
    return buildHierarchy(flatList);
  }, [flatList]);

  // Filter out completely finished projects/articles if requested
  const hierarchy = useMemo(() => {
    return hideCompleted ? filterCompletedNodes(fullHierarchy) : fullHierarchy;
  }, [fullHierarchy, hideCompleted]);

  // Count completed entries
  const completedCount = useMemo(() => {
    return flatList.filter(isEntryCompleted).length;
  }, [flatList]);

  // Count filtered entries (entries in the visible hierarchy)
  const filteredEntries = useMemo(() => {
    let count = 0;
    function countEntries(nodes: HierarchyNode[]) {
      for (const node of nodes) {
        if (node.entry) count++;
        countEntries(node.children);
      }
    }
    countEntries(hierarchy);
    return count;
  }, [hierarchy]);

  // Calculate totals (from visible hierarchy only)
  const totals = useMemo(() => {
    let totalPlannedHours = 0;
    let totalActualHours = 0;
    let totalPlannedCosts = 0;
    let totalActualCosts = 0;

    for (const node of hierarchy) {
      totalPlannedHours += node.plannedHours;
      totalActualHours += node.actualHours;
      totalPlannedCosts += node.plannedCosts;
      totalActualCosts += node.actualCosts;
    }

    return { totalPlannedHours, totalActualHours, totalPlannedCosts, totalActualCosts };
  }, [hierarchy]);

  return {
    loading,
    error,
    hierarchy,
    flatList,
    refresh: fetchData,
    ...totals,
    totalEntries: flatList.length,
    filteredEntries,
    completedCount,
  };
}
