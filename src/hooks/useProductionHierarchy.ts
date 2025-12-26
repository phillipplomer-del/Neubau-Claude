/**
 * Production Hierarchy Hook
 * Groups production data into a hierarchical structure:
 * Project (optional) → Verkaufsartikel → Unterartikel → PA → Operations
 *
 * Verkaufsartikel = Article that:
 *   1. Has NO HauptPaNummer (mainWorkOrderNumber)
 *   2. Does NOT match pattern TR-0000xxxx (min 4 zeros after TR-)
 *   3. IS in the SalesList (artikelnummer matches)
 *
 * Unterartikel = Everything else (has HauptPaNummer OR matches TR-pattern OR not in SalesList)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { productionRepository } from '@/lib/db/repositories/productionRepository';
import { salesRepository } from '@/lib/db/repositories/salesRepository';
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
 * Check if article number matches TR-0000xxxx pattern (min 4 zeros after TR-)
 * These are ALWAYS Unterartikel, never Verkaufsartikel
 */
function isTRUnterartikelPattern(artikelnummer: string): boolean {
  // Pattern: TR- followed by at least 4 zeros, then anything
  // Examples: TR-000012345, TR-00001, TR-0000 all match
  return /^TR-0{4,}/.test(artikelnummer);
}

/**
 * Check if article number ends with "-R" (Rohartikel)
 * These are raw material articles that belong under their parent article
 * E.g., "12345-R" belongs under "12345"
 */
function isRohartikel(artikelnummer: string): boolean {
  return artikelnummer.endsWith('-R');
}

/**
 * Get parent article number for Rohartikel
 * E.g., "12345-R" → "12345"
 */
function getRohartikelParent(artikelnummer: string): string {
  return artikelnummer.slice(0, -2); // Remove "-R"
}

/**
 * Check if an article can be a Verkaufsartikel
 * Must meet ALL criteria:
 * 1. No HauptPaNummer (checked separately)
 * 2. Not matching TR-0000xxxx pattern
 * 3. Not a Rohartikel (ending with -R)
 * 4. In the SalesList
 */
function canBeVerkaufsartikel(
  artikelnummer: string,
  salesArticleNumbers: Set<string>
): boolean {
  // Rule 1: Not TR-0000xxxx pattern
  if (isTRUnterartikelPattern(artikelnummer)) {
    return false;
  }

  // Rule 2: Not a Rohartikel
  if (isRohartikel(artikelnummer)) {
    return false;
  }

  // Rule 3: Must be in SalesList
  if (!salesArticleNumbers.has(artikelnummer)) {
    return false;
  }

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
 * Verkaufsartikel = Article that:
 *   1. Has NO HauptPaNummer (mainWorkOrderNumber)
 *   2. Does NOT match pattern TR-0000xxxx
 *   3. IS in the SalesList
 *
 * Unterartikel = Everything else, nested under parent Verkaufsartikel
 *
 * IMPORTANT: Same artikelnummer can appear multiple times (serial production)
 * - For Unterartikel: Each distinct mainWorkOrderNumber creates a separate instance
 * - For Verkaufsartikel: Each set of PAs that are NOT referenced as HauptPA by Unterartikel
 */
function buildHierarchy(entries: ProductionEntry[], salesArticleNumbers: Set<string>): HierarchyNode[] {
  // Group entries by: Project → (Article + HauptPA context) → PA → Operations
  // Key insight: Group by (artikelnummer, mainWorkOrderNumber) to handle serial production
  const projectMap = new Map<string, {
    // Verkaufsartikel: artikelnummer → PA → Operations (no mainWorkOrderNumber)
    verkaufsartikel: Map<string, Map<string, ProductionEntry[]>>;
    // Unterartikel: (artikelnummer + mainWorkOrderNumber) → PA → Operations
    unterartikel: Map<string, Map<string, ProductionEntry[]>>;
    // Track which PAs belong to which Verkaufsartikel
    paToVerkaufsartikel: Map<string, string>;
  }>();

  // First pass: Separate Verkaufsartikel and Unterartikel entries
  // An entry is Verkaufsartikel if:
  //   1. No HauptPaNummer
  //   2. artikelnummer does NOT match TR-0000xxxx pattern
  //   3. artikelnummer IS in SalesList
  for (const entry of entries) {
    const projectKey = isValidValue(entry.projektnummer) ? entry.projektnummer : '__NO_PROJECT__';
    const articleKey = isValidValue(entry.artikelnummer) ? entry.artikelnummer : '__NO_ARTICLE__';
    const paKey = isValidValue(entry.workOrderNumber) ? entry.workOrderNumber : '__NO_PA__';
    const hauptPaKey = isValidValue(entry.mainWorkOrderNumber) ? entry.mainWorkOrderNumber : null;

    if (!projectMap.has(projectKey)) {
      projectMap.set(projectKey, {
        verkaufsartikel: new Map(),
        unterartikel: new Map(),
        paToVerkaufsartikel: new Map(),
      });
    }
    const projectData = projectMap.get(projectKey)!;

    // Determine if this is a Verkaufsartikel or Unterartikel
    const isVerkaufsartikelEntry =
      !hauptPaKey && // No HauptPaNummer
      articleKey !== '__NO_ARTICLE__' &&
      canBeVerkaufsartikel(articleKey, salesArticleNumbers);

    if (!isVerkaufsartikelEntry) {
      // This is an Unterartikel entry
      // Group by (artikelnummer + hauptPaNummer) for separate instances
      // If no hauptPaKey, use a special marker
      const instanceKey = hauptPaKey
        ? `${articleKey}:::${hauptPaKey}`
        : `${articleKey}:::__FORCED_UNTER__`;

      if (!projectData.unterartikel.has(instanceKey)) {
        projectData.unterartikel.set(instanceKey, new Map());
      }
      const paMap = projectData.unterartikel.get(instanceKey)!;

      if (!paMap.has(paKey)) {
        paMap.set(paKey, []);
      }
      paMap.get(paKey)!.push(entry);
    } else {
      // This is a Verkaufsartikel entry (no HauptPaNummer + passes all checks)
      if (!projectData.verkaufsartikel.has(articleKey)) {
        projectData.verkaufsartikel.set(articleKey, new Map());
      }
      const paMap = projectData.verkaufsartikel.get(articleKey)!;

      if (!paMap.has(paKey)) {
        paMap.set(paKey, []);
      }
      paMap.get(paKey)!.push(entry);

      // Track PA ownership
      if (paKey !== '__NO_PA__') {
        projectData.paToVerkaufsartikel.set(paKey, articleKey);
      }
    }
  }

  // Build tree structure
  const rootNodes: HierarchyNode[] = [];

  projectMap.forEach((projectData, projectKey) => {
    const isNoProject = projectKey === '__NO_PROJECT__';
    const { verkaufsartikel, unterartikel, paToVerkaufsartikel } = projectData;

    // Build Verkaufsartikel nodes
    const verkaufsartikelNodes: HierarchyNode[] = [];

    verkaufsartikel.forEach((paMap, articleKey) => {
      const isNoArticle = articleKey === '__NO_ARTICLE__';
      const paNodes: HierarchyNode[] = [];

      paMap.forEach((operations, paKey) => {
        const isNoPA = paKey === '__NO_PA__';
        const operationNodes = buildOperationNodes(operations, projectKey, articleKey, paKey);

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
          paNodes.push(...operationNodes);
        }
      });

      if (!isNoArticle) {
        const articleNode = aggregateNode({
          id: `article-${projectKey}-${articleKey}`,
          type: 'article',
          name: `Artikel ${articleKey}`,
          identifier: articleKey,
          articleNumber: articleKey,
          isMainArticle: true,
          children: paNodes,
        });
        verkaufsartikelNodes.push(articleNode);
      } else {
        verkaufsartikelNodes.push(...paNodes);
      }
    });

    // Build Unterartikel nodes and nest them under their Verkaufsartikel
    unterartikel.forEach((paMap, instanceKey) => {
      const [articleKey, hauptPaNummer] = instanceKey.split(':::');
      const isNoArticle = articleKey === '__NO_ARTICLE__';
      const paNodes: HierarchyNode[] = [];

      paMap.forEach((operations, paKey) => {
        const isNoPA = paKey === '__NO_PA__';
        const operationNodes = buildOperationNodes(operations, projectKey, articleKey!, paKey);

        if (!isNoPA) {
          const paNode = aggregateNode({
            id: `pa-${projectKey}-${instanceKey}-${paKey}`,
            type: 'pa',
            name: `PA ${paKey}`,
            identifier: paKey,
            articleNumber: isNoArticle ? undefined : articleKey,
            children: operationNodes,
          });
          paNodes.push(paNode);
        } else {
          paNodes.push(...operationNodes);
        }
      });

      if (!isNoArticle) {
        const unterartikelNode = aggregateNode({
          id: `article-${projectKey}-${instanceKey}`,
          type: 'article',
          name: `Artikel ${articleKey}`,
          identifier: articleKey!,
          articleNumber: articleKey,
          isMainArticle: false,
          children: paNodes,
        });

        // Find parent Verkaufsartikel via HauptPaNummer
        // IMPORTANT: Unterartikel must ALWAYS be nested under a Verkaufsartikel
        // They are NEVER shown at project level
        const parentArticleKey = paToVerkaufsartikel.get(hauptPaNummer!);
        const parentNode = parentArticleKey
          ? verkaufsartikelNodes.find(v => v.identifier === parentArticleKey && v.isMainArticle === true)
          : null;

        if (parentNode) {
          // Nest under parent Verkaufsartikel
          parentNode.children.push(unterartikelNode);
        }
        // If no parent found, the Unterartikel is NOT added (better than wrong hierarchy)
      }
    });

    // Nest Rohartikel (-R suffix) under their parent article
    // E.g., "12345-R" should be nested under "12345"
    // This requires a second pass after all Unterartikel are built
    function nestRohartikelRecursively(nodes: HierarchyNode[]): void {
      // Collect Rohartikel and their indices for removal
      const rohartikelToMove: { node: HierarchyNode; parentIdentifier: string; index: number }[] = [];

      nodes.forEach((node, index) => {
        if (node.type === 'article' && isRohartikel(node.identifier)) {
          const parentIdentifier = getRohartikelParent(node.identifier);
          rohartikelToMove.push({ node, parentIdentifier, index });
        }
      });

      // Remove Rohartikel from current level and nest under parent
      // Process in reverse order to preserve indices during removal
      rohartikelToMove.reverse().forEach(({ node, parentIdentifier, index }) => {
        // Find parent article at this level or in children
        const parentNode = nodes.find(n =>
          n.type === 'article' &&
          n.identifier === parentIdentifier &&
          !isRohartikel(n.identifier)
        );

        if (parentNode) {
          // Remove from current level
          nodes.splice(index, 1);
          // Add to parent's children
          parentNode.children.push(node);
        }
      });

      // Recursively process children
      nodes.forEach(node => {
        if (node.children.length > 0) {
          nestRohartikelRecursively(node.children);
        }
      });
    }

    // Apply Rohartikel nesting to all Verkaufsartikel
    verkaufsartikelNodes.forEach(vNode => {
      if (vNode.children.length > 0) {
        nestRohartikelRecursively(vNode.children);
      }
    });

    // Re-aggregate Verkaufsartikel after adding Unterartikel and Rohartikel
    const finalArticleNodes = verkaufsartikelNodes.map(v => {
      if (v.type === 'article') {
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
      }
      return v;
    });

    // Project node
    if (!isNoProject) {
      const projectNode = aggregateNode({
        id: `project-${projectKey}`,
        type: 'project',
        name: `Projekt ${projectKey}`,
        identifier: projectKey,
        children: finalArticleNodes,
      });
      rootNodes.push(projectNode);
    } else {
      rootNodes.push(...finalArticleNodes);
    }
  });

  return sortNodes(rootNodes);
}

/**
 * Build operation nodes from entries
 */
function buildOperationNodes(
  operations: ProductionEntry[],
  projectKey: string,
  articleKey: string,
  paKey: string
): HierarchyNode[] {
  return operations.map((entry, idx) => {
    const opName = entry.notes || entry.operationNumber || `Operation ${idx + 1}`;
    const plannedHours = (entry.plannedHours || 0) / 60;
    const actualHours = (entry.actualHours || 0) / 60;
    return {
      id: `op-${projectKey}-${articleKey}-${paKey}-${entry.id || idx}`,
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
  const [salesArticleNumbers, setSalesArticleNumbers] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both production and sales data in parallel
      const [productionEntries, salesEntries] = await Promise.all([
        productionRepository.getAll(),
        salesRepository.getAll(),
      ]);

      const deserializedEntries = productionEntries.map(deserializeProductionEntry);
      setFlatList(deserializedEntries);

      // Build set of article numbers from sales data
      const salesArticles = new Set<string>();
      for (const entry of salesEntries) {
        if (entry.artikelnummer) {
          salesArticles.add(entry.artikelnummer);
        }
      }
      setSalesArticleNumbers(salesArticles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Daten';
      setError(errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build hierarchy from flat list (using sales data for Verkaufsartikel detection)
  const fullHierarchy = useMemo(() => {
    return buildHierarchy(flatList, salesArticleNumbers);
  }, [flatList, salesArticleNumbers]);

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
