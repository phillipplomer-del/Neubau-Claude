/**
 * Sales-Led Hierarchy Hook
 * Builds a hierarchy where Sales data is ALWAYS leading:
 * Project (from Sales) → Article (from Sales) → PAs (from Production, if available)
 *
 * This ensures ALL sales entries are shown, with production data added when matched.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { salesRepository } from '@/lib/db/repositories/salesRepository';
import { productionRepository } from '@/lib/db/repositories/productionRepository';
import type { SalesEntry } from '@/types/sales';
import type { ProductionEntry } from '@/types/production';

/**
 * Node in the sales-led hierarchy
 */
export interface SalesLedNode {
  id: string;
  type: 'project' | 'article' | 'pa' | 'operation' | 'noProduction';
  name: string;
  identifier: string;

  // Sales data (always present for project/article level)
  salesEntry?: SalesEntry;
  customerName?: string;  // Customer name (for project display)
  bookingDate?: Date;
  deliveryDate?: Date;  // Best delivery date (confirmed > requested > delivery)

  // Production data (optional, only if matched)
  hasProduction: boolean;
  plannedHours: number;
  actualHours: number;
  startDate?: Date;
  endDate?: Date;
  completionPercentage: number;

  // For variance display
  hoursVariance: number;

  // Children
  children: SalesLedNode[];

  // Original production entry (for PA/operation nodes)
  productionEntry?: ProductionEntry;
}

export type ViewMode = 'projects' | 'articles';

export interface UseSalesLedHierarchyOptions {
  viewMode: ViewMode;
  searchQuery?: string;
}

export interface UseSalesLedHierarchyReturn {
  loading: boolean;
  error: string | null;
  hierarchy: SalesLedNode[];
  refresh: () => Promise<void>;

  // Stats
  totalProjects: number;
  totalArticles: number;
  articlesWithProduction: number;
  articlesWithoutProduction: number;
}

/**
 * Deserialize dates in sales entry
 */
function deserializeSalesEntry(entry: SalesEntry): SalesEntry {
  return {
    ...entry,
    bookingDate: entry.bookingDate ? new Date(entry.bookingDate) : undefined,
    deliveryDate: entry.deliveryDate ? new Date(entry.deliveryDate) : undefined,
    requestedDeliveryDate: entry.requestedDeliveryDate ? new Date(entry.requestedDeliveryDate) : undefined,
    confirmedDeliveryDate: entry.confirmedDeliveryDate ? new Date(entry.confirmedDeliveryDate) : undefined,
    importedAt: entry.importedAt ? new Date(entry.importedAt) : undefined,
  };
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
 * Get best delivery date from sales entry
 */
function getBestDeliveryDate(entry: SalesEntry): Date | undefined {
  return entry.confirmedDeliveryDate || entry.requestedDeliveryDate || entry.deliveryDate;
}

/**
 * Build production lookup maps
 * 1. By artikelnummer-projektnummer: for direct article matching
 * 2. By projektnummer: for finding all PAs in a project (needed for sub-PA hierarchy)
 * 3. By mainWorkOrderNumber: for grouping sub-PAs under their main PA
 */
interface ProductionLookups {
  byArticle: Map<string, ProductionEntry[]>;  // artikelnummer-projektnummer -> entries
  byProject: Map<string, ProductionEntry[]>;   // projektnummer -> all entries in project
  byMainPA: Map<string, ProductionEntry[]>;    // mainWorkOrderNumber -> sub-PA entries
}

function buildProductionLookups(productionData: ProductionEntry[]): ProductionLookups {
  const byArticle = new Map<string, ProductionEntry[]>();
  const byProject = new Map<string, ProductionEntry[]>();
  const byMainPA = new Map<string, ProductionEntry[]>();

  for (const entry of productionData) {
    // By article + project
    if (entry.artikelnummer) {
      const key = entry.projektnummer
        ? `${entry.artikelnummer.toLowerCase()}-${entry.projektnummer.toLowerCase()}`
        : `${entry.artikelnummer.toLowerCase()}-__NONE__`;

      if (!byArticle.has(key)) {
        byArticle.set(key, []);
      }
      byArticle.get(key)!.push(entry);
    }

    // By project only
    if (entry.projektnummer) {
      const projKey = entry.projektnummer.toLowerCase();
      if (!byProject.has(projKey)) {
        byProject.set(projKey, []);
      }
      byProject.get(projKey)!.push(entry);
    }

    // By mainWorkOrderNumber (for sub-PAs)
    if (entry.mainWorkOrderNumber && entry.mainWorkOrderNumber !== entry.workOrderNumber) {
      const mainKey = entry.mainWorkOrderNumber;
      if (!byMainPA.has(mainKey)) {
        byMainPA.set(mainKey, []);
      }
      byMainPA.get(mainKey)!.push(entry);
    }
  }

  return { byArticle, byProject, byMainPA };
}

/**
 * Group production entries by PA hierarchy (HauptPA → Unter-PAs)
 * Returns: Map<HauptPaNummer, { mainPA: entries[], subPAs: Map<PaNummer, entries[]> }>
 */
interface PAHierarchy {
  mainPAEntries: ProductionEntry[];
  subPAs: Map<string, ProductionEntry[]>;
}

function groupByPAHierarchy(entries: ProductionEntry[]): Map<string, PAHierarchy> {
  const hierarchyMap = new Map<string, PAHierarchy>();

  for (const entry of entries) {
    const paNumber = entry.workOrderNumber || '__NO_PA__';
    const mainPaNumber = entry.mainWorkOrderNumber || paNumber; // If no main, PA is its own main

    // Initialize hierarchy for this main PA
    if (!hierarchyMap.has(mainPaNumber)) {
      hierarchyMap.set(mainPaNumber, {
        mainPAEntries: [],
        subPAs: new Map(),
      });
    }

    const hierarchy = hierarchyMap.get(mainPaNumber)!;

    if (paNumber === mainPaNumber || !entry.mainWorkOrderNumber) {
      // This IS the main PA (or no hierarchy)
      hierarchy.mainPAEntries.push(entry);
    } else {
      // This is a sub-PA
      if (!hierarchy.subPAs.has(paNumber)) {
        hierarchy.subPAs.set(paNumber, []);
      }
      hierarchy.subPAs.get(paNumber)!.push(entry);
    }
  }

  return hierarchyMap;
}

/**
 * Build PA node from production entries (with optional sub-PAs from lookup)
 */
function buildPANode(
  paNumber: string,
  operations: ProductionEntry[],
  subPAsFromHierarchy?: Map<string, ProductionEntry[]>,
  subPAsFromLookup?: ProductionEntry[]
): SalesLedNode {
  // Combine sub-PAs from hierarchy grouping AND from lookup
  const allSubPAs = new Map<string, ProductionEntry[]>();

  // Add from hierarchy grouping
  if (subPAsFromHierarchy) {
    subPAsFromHierarchy.forEach((entries, subPaNum) => {
      if (!allSubPAs.has(subPaNum)) {
        allSubPAs.set(subPaNum, []);
      }
      allSubPAs.get(subPaNum)!.push(...entries);
    });
  }

  // Add from lookup (sub-PAs with different artikelnummer)
  if (subPAsFromLookup) {
    for (const entry of subPAsFromLookup) {
      const subPaNum = entry.workOrderNumber || '__NO_PA__';
      if (!allSubPAs.has(subPaNum)) {
        allSubPAs.set(subPaNum, []);
      }
      // Avoid duplicates
      const existing = allSubPAs.get(subPaNum)!;
      if (!existing.some(e => e.id === entry.id)) {
        existing.push(entry);
      }
    }
  }

  const subPAs = allSubPAs.size > 0 ? allSubPAs : undefined;
  // Sort operations by operationNumber
  const sortedOps = [...operations].sort((a, b) => {
    const aNum = parseInt(a.operationNumber || '0', 10);
    const bNum = parseInt(b.operationNumber || '0', 10);
    return aNum - bNum;
  });

  // Build operation nodes
  const operationNodes: SalesLedNode[] = sortedOps.map((op, idx) => {
    const plannedHours = (op.plannedHours || 0) / 60; // Convert minutes to hours
    const actualHours = (op.actualHours || 0) / 60;

    return {
      id: `op-${op.id || idx}`,
      type: 'operation',
      name: op.notes || op.operationNumber || `AG ${idx + 1}`,
      identifier: op.operationNumber || '',
      hasProduction: true,
      plannedHours,
      actualHours,
      hoursVariance: actualHours - plannedHours,
      startDate: op.plannedStartDate,
      endDate: op.plannedEndDate,
      completionPercentage: op.completionPercentage || 0,
      children: [],
      productionEntry: op,
    };
  });

  // Build sub-PA nodes (if any)
  const subPANodes: SalesLedNode[] = [];
  if (subPAs && subPAs.size > 0) {
    subPAs.forEach((subOps, subPaNumber) => {
      // Sub-PAs don't have their own sub-PAs, so no recursion needed
      subPANodes.push(buildPANode(subPaNumber, subOps));
    });
    // Sort sub-PAs by number
    subPANodes.sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { numeric: true }));
  }

  // Combine: first operations, then sub-PAs
  const allChildren = [...operationNodes, ...subPANodes];

  // Aggregate PA stats (including sub-PAs)
  const totalPlannedHours = allChildren.reduce((sum, n) => sum + n.plannedHours, 0);
  const totalActualHours = allChildren.reduce((sum, n) => sum + n.actualHours, 0);
  const avgCompletion = allChildren.length > 0
    ? allChildren.reduce((sum, n) => sum + n.completionPercentage, 0) / allChildren.length
    : 0;

  // Get date range
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  for (const child of allChildren) {
    if (child.startDate && (!startDate || child.startDate < startDate)) startDate = child.startDate;
    if (child.endDate && (!endDate || child.endDate > endDate)) endDate = child.endDate;
  }

  // Get description from first operation
  const description = sortedOps[0]?.productDescription || sortedOps[0]?.notes || '';

  return {
    id: `pa-${paNumber}`,
    type: 'pa',
    name: description ? `PA ${paNumber}: ${description}` : `PA ${paNumber}`,
    identifier: paNumber,
    hasProduction: true,
    plannedHours: totalPlannedHours,
    actualHours: totalActualHours,
    hoursVariance: totalActualHours - totalPlannedHours,
    startDate,
    endDate,
    completionPercentage: avgCompletion,
    children: allChildren,
  };
}

/**
 * Build hierarchy from sales and production data
 */
function buildHierarchy(
  salesData: SalesEntry[],
  productionData: ProductionEntry[],
  viewMode: ViewMode,
  searchQuery?: string
): { hierarchy: SalesLedNode[]; stats: { totalProjects: number; totalArticles: number; articlesWithProduction: number; articlesWithoutProduction: number } } {
  // Build production lookups
  const { byArticle: productionLookup, byMainPA } = buildProductionLookups(productionData);

  // Filter sales data based on view mode
  let filteredSales: SalesEntry[];
  if (viewMode === 'projects') {
    // Only entries WITH projektnummer
    filteredSales = salesData.filter(e => e.projektnummer && e.projektnummer.trim() !== '');
  } else {
    // Only entries WITHOUT projektnummer (standalone articles)
    filteredSales = salesData.filter(e => !e.projektnummer || e.projektnummer.trim() === '');
  }

  // Apply search filter
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredSales = filteredSales.filter(e => {
      const projektMatch = e.projektnummer?.toLowerCase().includes(query);
      const artikelMatch = e.artikelnummer?.toLowerCase().includes(query);
      const customerMatch = e.customerName?.toLowerCase().includes(query);
      return projektMatch || artikelMatch || customerMatch;
    });
  }

  // Stats
  let articlesWithProduction = 0;
  let articlesWithoutProduction = 0;

  if (viewMode === 'projects') {
    // Group by projektnummer → artikelnummer
    const projectMap = new Map<string, SalesEntry[]>();

    for (const entry of filteredSales) {
      const projektKey = entry.projektnummer!;
      if (!projectMap.has(projektKey)) {
        projectMap.set(projektKey, []);
      }
      projectMap.get(projektKey)!.push(entry);
    }

    // Build project nodes
    const projectNodes: SalesLedNode[] = [];

    projectMap.forEach((entries, projektnummer) => {
      // Group entries by artikelnummer
      const articleMap = new Map<string, SalesEntry[]>();
      for (const entry of entries) {
        const artikelKey = entry.artikelnummer || '__NO_ARTICLE__';
        if (!articleMap.has(artikelKey)) {
          articleMap.set(artikelKey, []);
        }
        articleMap.get(artikelKey)!.push(entry);
      }

      // Build article nodes
      const articleNodes: SalesLedNode[] = [];

      articleMap.forEach((articleEntries, artikelnummer) => {
        // Use first entry for dates/info
        const primaryEntry = articleEntries[0];
        const deliveryDate = getBestDeliveryDate(primaryEntry);

        // Look up production data
        const productionKey = `${artikelnummer.toLowerCase()}-${projektnummer.toLowerCase()}`;
        const productionEntries = productionLookup.get(productionKey) || [];

        const hasProduction = productionEntries.length > 0;
        if (hasProduction) {
          articlesWithProduction++;
        } else {
          articlesWithoutProduction++;
        }

        // Build PA children with hierarchy (HauptPA → Unter-PAs)
        let children: SalesLedNode[] = [];

        if (hasProduction) {
          const paHierarchy = groupByPAHierarchy(productionEntries);
          paHierarchy.forEach((hierarchy, mainPaNumber) => {
            if (mainPaNumber !== '__NO_PA__') {
              // Get sub-PAs from global lookup (includes sub-PAs with different artikelnummer)
              const subPAsFromLookup = byMainPA.get(mainPaNumber);
              children.push(buildPANode(mainPaNumber, hierarchy.mainPAEntries, hierarchy.subPAs, subPAsFromLookup));
            }
          });
          // Sort PAs by number
          children.sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { numeric: true }));
        } else {
          // No production - add placeholder node
          children.push({
            id: `no-prod-${projektnummer}-${artikelnummer}`,
            type: 'noProduction',
            name: 'Keine Produktionsplanung',
            identifier: '',
            hasProduction: false,
            plannedHours: 0,
            actualHours: 0,
            hoursVariance: 0,
            completionPercentage: 0,
            children: [],
          });
        }

        // Aggregate production stats from children
        const totalPlannedHours = children.reduce((sum, c) => sum + c.plannedHours, 0);
        const totalActualHours = children.reduce((sum, c) => sum + c.actualHours, 0);

        // Get date range from production
        let startDate: Date | undefined;
        let endDate: Date | undefined;
        for (const child of children) {
          if (child.startDate && (!startDate || child.startDate < startDate)) startDate = child.startDate;
          if (child.endDate && (!endDate || child.endDate > endDate)) endDate = child.endDate;
        }

        const articleNode: SalesLedNode = {
          id: `article-${projektnummer}-${artikelnummer}`,
          type: 'article',
          name: primaryEntry.productDescription || `Artikel ${artikelnummer}`,
          identifier: artikelnummer,
          salesEntry: primaryEntry,
          bookingDate: primaryEntry.bookingDate,
          deliveryDate,
          hasProduction,
          plannedHours: totalPlannedHours,
          actualHours: totalActualHours,
          hoursVariance: totalActualHours - totalPlannedHours,
          startDate,
          endDate,
          completionPercentage: hasProduction && children.length > 0
            ? children.filter(c => c.type === 'pa').reduce((sum, c) => sum + c.completionPercentage, 0) / children.filter(c => c.type === 'pa').length
            : 0,
          children,
        };

        articleNodes.push(articleNode);
      });

      // Sort articles by artikelnummer
      articleNodes.sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { numeric: true }));

      // Get project-level dates from first article
      const firstArticle = articleNodes[0];

      // Aggregate project stats
      const totalPlannedHours = articleNodes.reduce((sum, a) => sum + a.plannedHours, 0);
      const totalActualHours = articleNodes.reduce((sum, a) => sum + a.actualHours, 0);

      // Get earliest/latest dates
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      for (const article of articleNodes) {
        if (article.startDate && (!startDate || article.startDate < startDate)) startDate = article.startDate;
        if (article.endDate && (!endDate || article.endDate > endDate)) endDate = article.endDate;
      }

      // Get customer name from first entry that has one
      const customerName = entries.find(e => e.customerName)?.customerName;

      const projectNode: SalesLedNode = {
        id: `project-${projektnummer}`,
        type: 'project',
        name: `Projekt ${projektnummer}`,
        identifier: projektnummer,
        customerName,
        bookingDate: firstArticle?.bookingDate,
        deliveryDate: firstArticle?.deliveryDate,
        hasProduction: articleNodes.some(a => a.hasProduction),
        plannedHours: totalPlannedHours,
        actualHours: totalActualHours,
        hoursVariance: totalActualHours - totalPlannedHours,
        startDate,
        endDate,
        completionPercentage: articleNodes.length > 0
          ? articleNodes.reduce((sum, a) => sum + a.completionPercentage, 0) / articleNodes.length
          : 0,
        children: articleNodes,
      };

      projectNodes.push(projectNode);
    });

    // Sort projects by projektnummer
    projectNodes.sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { numeric: true }));

    return {
      hierarchy: projectNodes,
      stats: {
        totalProjects: projectNodes.length,
        totalArticles: articlesWithProduction + articlesWithoutProduction,
        articlesWithProduction,
        articlesWithoutProduction,
      },
    };
  } else {
    // Articles without project - flat list
    const articleNodes: SalesLedNode[] = [];

    for (const entry of filteredSales) {
      const artikelnummer = entry.artikelnummer || '__NO_ARTICLE__';
      const deliveryDate = getBestDeliveryDate(entry);

      // Look up production (without project)
      const productionKey = `${artikelnummer.toLowerCase()}-__NONE__`;
      const productionEntries = productionLookup.get(productionKey) || [];

      const hasProduction = productionEntries.length > 0;
      if (hasProduction) {
        articlesWithProduction++;
      } else {
        articlesWithoutProduction++;
      }

      // Build PA children with hierarchy (HauptPA → Unter-PAs)
      let children: SalesLedNode[] = [];

      if (hasProduction) {
        const paHierarchy = groupByPAHierarchy(productionEntries);
        paHierarchy.forEach((hierarchy, mainPaNumber) => {
          if (mainPaNumber !== '__NO_PA__') {
            // Get sub-PAs from global lookup (includes sub-PAs with different artikelnummer)
            const subPAsFromLookup = byMainPA.get(mainPaNumber);
            children.push(buildPANode(mainPaNumber, hierarchy.mainPAEntries, hierarchy.subPAs, subPAsFromLookup));
          }
        });
        children.sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { numeric: true }));
      } else {
        children.push({
          id: `no-prod-${artikelnummer}`,
          type: 'noProduction',
          name: 'Keine Produktionsplanung',
          identifier: '',
          hasProduction: false,
          plannedHours: 0,
          actualHours: 0,
          hoursVariance: 0,
          completionPercentage: 0,
          children: [],
        });
      }

      const totalPlannedHours = children.reduce((sum, c) => sum + c.plannedHours, 0);
      const totalActualHours = children.reduce((sum, c) => sum + c.actualHours, 0);

      let startDate: Date | undefined;
      let endDate: Date | undefined;
      for (const child of children) {
        if (child.startDate && (!startDate || child.startDate < startDate)) startDate = child.startDate;
        if (child.endDate && (!endDate || child.endDate > endDate)) endDate = child.endDate;
      }

      const articleNode: SalesLedNode = {
        id: `article-${entry.id || artikelnummer}`,
        type: 'article',
        name: entry.productDescription || `Artikel ${artikelnummer}`,
        identifier: artikelnummer,
        salesEntry: entry,
        bookingDate: entry.bookingDate,
        deliveryDate,
        hasProduction,
        plannedHours: totalPlannedHours,
        actualHours: totalActualHours,
        hoursVariance: totalActualHours - totalPlannedHours,
        startDate,
        endDate,
        completionPercentage: hasProduction && children.length > 0
          ? children.filter(c => c.type === 'pa').reduce((sum, c) => sum + c.completionPercentage, 0) / children.filter(c => c.type === 'pa').length
          : 0,
        children,
      };

      articleNodes.push(articleNode);
    }

    // Sort by artikelnummer
    articleNodes.sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { numeric: true }));

    return {
      hierarchy: articleNodes,
      stats: {
        totalProjects: 0,
        totalArticles: articleNodes.length,
        articlesWithProduction,
        articlesWithoutProduction,
      },
    };
  }
}

export function useSalesLedHierarchy(
  options: UseSalesLedHierarchyOptions
): UseSalesLedHierarchyReturn {
  const { viewMode, searchQuery } = options;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesEntry[]>([]);
  const [productionData, setProductionData] = useState<ProductionEntry[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load both data sources in parallel
      const [salesEntries, productionEntries] = await Promise.all([
        salesRepository.getAll(),
        productionRepository.getAll(),
      ]);

      // Deserialize dates
      const deserializedSales = salesEntries.map(deserializeSalesEntry);
      const deserializedProduction = productionEntries.map(deserializeProductionEntry);

      setSalesData(deserializedSales);
      setProductionData(deserializedProduction);
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

  // Build hierarchy
  const { hierarchy, stats } = useMemo(() => {
    if (salesData.length === 0) {
      return {
        hierarchy: [],
        stats: { totalProjects: 0, totalArticles: 0, articlesWithProduction: 0, articlesWithoutProduction: 0 },
      };
    }
    return buildHierarchy(salesData, productionData, viewMode, searchQuery);
  }, [salesData, productionData, viewMode, searchQuery]);

  return {
    loading,
    error,
    hierarchy,
    refresh: fetchData,
    ...stats,
  };
}
