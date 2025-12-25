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
  description?: string; // Product description (from productDescription field)
  isMainArticle?: boolean; // True if this is a Verkaufsartikel (no HauptPaNummer)
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
  isCompleted: boolean; // True if status indicates closed OR (inactive AND 100%)
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
 * Structure: Project → Verkaufsartikel → (Unterartikel + PAs) → Operations
 *
 * Verkaufsartikel = Article with NO HauptPaNummer (mainWorkOrderNumber)
 * Unterartikel = Article WITH HauptPaNummer, nested under parent Verkaufsartikel
 */
function buildHierarchy(entries: ProductionEntry[]): HierarchyNode[] {
  // Group entries by: Project → Article → PA → Operations
  const projectMap = new Map<string, Map<string, Map<string, ProductionEntry[]>>>();

  for (const entry of entries) {
    const projectKey = isValidValue(entry.projektnummer) ? entry.projektnummer : '__NO_PROJECT__';
    const articleKey = isValidValue(entry.artikelnummer) ? entry.artikelnummer : '__NO_ARTICLE__';
    const paKey = isValidValue(entry.workOrderNumber) ? entry.workOrderNumber : '__NO_PA__';

    if (!projectMap.has(projectKey)) {
      projectMap.set(projectKey, new Map());
    }
    const articleMap = projectMap.get(projectKey)!;

    if (!articleMap.has(articleKey)) {
      articleMap.set(articleKey, new Map());
    }
    const paMap = articleMap.get(articleKey)!;

    if (!paMap.has(paKey)) {
      paMap.set(paKey, []);
    }
    paMap.get(paKey)!.push(entry);
  }

  // Build tree structure
  const rootNodes: HierarchyNode[] = [];

  projectMap.forEach((articleMap, projectKey) => {
    const isNoProject = projectKey === '__NO_PROJECT__';

    // First pass: Build all article nodes and track their PAs
    const allArticleNodes: HierarchyNode[] = [];
    const paToArticleMap = new Map<string, string>(); // PA number → Article number

    articleMap.forEach((paMap, articleKey) => {
      const isNoArticle = articleKey === '__NO_ARTICLE__';

      // Build PA nodes under article
      const paNodes: HierarchyNode[] = [];

      paMap.forEach((operations, paKey) => {
        const isNoPA = paKey === '__NO_PA__';

        // Track which article owns this PA
        if (!isNoPA && !isNoArticle) {
          paToArticleMap.set(paKey, articleKey);
        }

        // Build operation nodes (leaf nodes)
        const operationNodes: HierarchyNode[] = operations.map((entry, idx) => {
          const opName = entry.notes || entry.operationNumber || `Operation ${idx + 1}`;
          // Convert from minutes to hours (data comes in minutes from Excel)
          const plannedHours = (entry.plannedHours || 0) / 60;
          const actualHours = (entry.actualHours || 0) / 60;
          return {
            id: `op-${entry.id || idx}`,
            type: 'operation' as const,
            name: opName,
            identifier: entry.operationNumber || '',
            description: entry.productDescription,
            children: [],
            plannedHours,
            actualHours,
            plannedCosts: entry.plannedCosts || 0,
            actualCosts: entry.actualCosts || 0,
            hoursVariance: actualHours - plannedHours,
            costsVariance: (entry.actualCosts || 0) - (entry.plannedCosts || 0),
            startDate: entry.plannedStartDate,
            endDate: entry.plannedEndDate,
            completionPercentage: entry.completionPercentage || 0,
            isActive: entry.active === 'X' || entry.active === true,
            isCompleted: isEntryCompleted(entry),
            status: entry.status,
            operationCount: 1,
            paCount: 0,
            entry,
          };
        });

        // PA node (aggregates operations)
        if (!isNoPA) {
          const paNode = aggregateNode({
            id: `pa-${projectKey}-${articleKey}-${paKey}`,
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

      // Article node (aggregates PAs)
      if (!isNoArticle) {
        // Check if this is a Verkaufsartikel (main article)
        // A Verkaufsartikel has NO mainWorkOrderNumber (HauptPaNummer) in any of its operations
        let isMainArticle = true;
        let hauptPaNummer: string | undefined; // The HauptPA this article is linked to

        paMap.forEach((operations) => {
          for (const op of operations) {
            if (isValidValue(op.mainWorkOrderNumber)) {
              isMainArticle = false;
              hauptPaNummer = op.mainWorkOrderNumber;
              break;
            }
          }
        });

        const articleNode = aggregateNode({
          id: `article-${projectKey}-${articleKey}`,
          type: 'article',
          name: `Artikel ${articleKey}`,
          identifier: articleKey,
          articleNumber: articleKey,
          isMainArticle,
          // Store HauptPA reference temporarily for restructuring
          description: hauptPaNummer ? `__HAUPT_PA__:${hauptPaNummer}` : undefined,
          children: paNodes,
        });
        allArticleNodes.push(articleNode);
      } else {
        // No article - add PAs directly (shouldn't happen normally)
        allArticleNodes.push(...paNodes as HierarchyNode[]);
      }
    });

    // Second pass: Restructure - nest Unterartikel under their Verkaufsartikel
    const verkaufsartikel = allArticleNodes.filter(a => a.isMainArticle === true);
    const unterartikel = allArticleNodes.filter(a => a.isMainArticle === false && a.type === 'article');

    // For each Unterartikel, find its parent Verkaufsartikel via HauptPaNummer
    for (const unter of unterartikel) {
      // Extract HauptPA number from temporary description field
      const hauptPaMatch = unter.description?.match(/^__HAUPT_PA__:(.+)$/);
      if (hauptPaMatch) {
        const hauptPaNummer = hauptPaMatch[1];
        // Find which Verkaufsartikel owns this HauptPA
        const parentArticleKey = paToArticleMap.get(hauptPaNummer!);

        if (parentArticleKey) {
          // Find the parent Verkaufsartikel
          const parent = verkaufsartikel.find(v => v.identifier === parentArticleKey);
          if (parent) {
            // Clear the temporary description and add to parent
            unter.description = undefined;
            parent.children.push(unter);
            continue;
          }
        }
      }
      // Clear temporary description even if no parent found
      if (unter.description?.startsWith('__HAUPT_PA__:')) {
        unter.description = undefined;
      }
    }

    // Re-aggregate Verkaufsartikel after adding Unterartikel
    const finalArticleNodes = verkaufsartikel.map(v => {
      // Re-aggregate to update counts and sums
      return aggregateNode({
        id: v.id,
        type: v.type,
        name: v.name,
        identifier: v.identifier,
        articleNumber: v.articleNumber,
        isMainArticle: v.isMainArticle,
        description: v.description,
        children: v.children,
      });
    });

    // Add any orphaned Unterartikel (ones without a parent) directly
    const nestedUnterartikelIds = new Set(
      finalArticleNodes.flatMap(v =>
        v.children.filter(c => c.type === 'article').map(c => c.id)
      )
    );
    const orphanedUnterartikel = unterartikel.filter(u => !nestedUnterartikelIds.has(u.id));

    const projectChildren = [...finalArticleNodes, ...orphanedUnterartikel];

    // Project node - always create if we have a project number
    if (!isNoProject) {
      const projectNode = aggregateNode({
        id: `project-${projectKey}`,
        type: 'project',
        name: `Projekt ${projectKey}`,
        identifier: projectKey,
        children: projectChildren,
      });
      rootNodes.push(projectNode);
    } else {
      // No project - add articles directly to root
      rootNodes.push(...projectChildren);
    }
  });

  // Sort by identifier (numeric sorting ensures PA order: small → large = production sequence)
  return sortNodes(rootNodes);
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
  description?: string;
  isMainArticle?: boolean;
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
  let allCompleted = children.length > 0; // Start true, becomes false if any child is not completed
  let description = partial.description;

  for (const child of children) {
    plannedHours += child.plannedHours;
    actualHours += child.actualHours;
    plannedCosts += child.plannedCosts;
    actualCosts += child.actualCosts;
    operationCount += child.operationCount;
    paCount += child.type === 'pa' ? 1 : child.paCount;
    totalCompletion += child.completionPercentage * child.operationCount;
    if (child.isActive) activeCount++;
    if (!child.isCompleted) allCompleted = false;

    // Inherit description from first child that has one
    if (!description && child.description) {
      description = child.description;
    }

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
    description,
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
    isCompleted: allCompleted,
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
