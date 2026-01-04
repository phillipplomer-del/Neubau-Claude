/**
 * Treemap Visualization Component
 * Displays PM Controlling projects sized by Umsatz
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { ProjectEntry } from '@/types/controlling';

// Dark mode detection hook
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

// Color palettes
const COLORS_LIGHT = [
  '#00E097', '#00DEE0', '#00B8D4', '#0050E0',
  '#00C9A7', '#00A896', '#02C39A', '#028090',
];

const COLORS_DARK = [
  '#E0BD00', '#9EE000', '#45F600', '#B8E000',
  '#D4E040', '#C9B800', '#A8D000', '#8BC000',
];

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format percentage
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface TreemapNode {
  projektnummer: string;
  auftraggeber: string;
  bezeichnung: string;
  projektleiter: string;
  projektkategorie: 'A' | 'B' | 'C';
  value: number;
  umsatz: number;
  vk: number;
  aktuell: number;
  voraussichtlich: number;
  marge: number;
  margeProzent: number;
  colorIndex: number;
}

interface TreemapVisualizationProps {
  projects: ProjectEntry[];
  loading?: boolean;
}

export default function TreemapVisualization({
  projects,
  loading = false,
}: TreemapVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isDark = useDarkMode();
  const [hoveredNode, setHoveredNode] = useState<TreemapNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Track container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    // Initial measurement
    updateDimensions();

    // Watch for resize
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Transform projects into treemap data
  const treemapData = useMemo(() => {
    const filtered = projects.filter(p => Number(p.umsatz) > 0);
    console.log('Treemap: projects=', projects.length, 'filtered=', filtered.length, 'dimensions=', dimensions);
    return filtered.map((p, index) => ({
      projektnummer: p.projektnummer,
      auftraggeber: p.auftraggeber || 'Unbekannt',
      bezeichnung: p.bezeichnung || p.projektnummer,
      projektleiter: p.projektleiter || 'Unbekannt',
      projektkategorie: p.projektkategorie,
      value: Number(p.umsatz),
      umsatz: Number(p.umsatz),
      vk: Number(p.vk) || 0,
      aktuell: Number(p.aktuell) || 0,
      voraussichtlich: Number(p.voraussichtlich) || 0,
      marge: Number(p.marge) || 0,
      margeProzent: Number(p.margeProzent) || 0,
      colorIndex: index,
    }));
  }, [projects, dimensions]);

  // D3 Treemap rendering
  useEffect(() => {
    if (!svgRef.current || treemapData.length === 0 || dimensions.width === 0) return;

    const { width, height } = dimensions;
    const colors = isDark ? COLORS_DARK : COLORS_LIGHT;
    // Dark text with shadow for contrast on colored backgrounds
    const textColor = '#1a1a1a';
    const textColorSecondary = '#333333';
    const textShadow = isDark ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)';

    // Clear previous render
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Add filter for text shadow
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'text-shadow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    filter.append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '1')
      .attr('stdDeviation', '1')
      .attr('flood-color', isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)');

    // Build hierarchy
    const hierarchyData = {
      name: 'root',
      children: treemapData,
    };

    const root = d3
      .hierarchy(hierarchyData)
      .sum((d: any) => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout
    d3.treemap<typeof hierarchyData>()
      .size([width, height])
      .padding(3)
      .round(true)(root as any);

    // Create cells
    const cells = svg
      .selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

    // Add rectangles
    cells
      .append('rect')
      .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
      .attr('fill', (d: any) => colors[d.data.colorIndex % colors.length])
      .attr('fill-opacity', 0.85)
      .attr('stroke', isDark ? '#1a1a1a' : '#ffffff')
      .attr('stroke-width', 1)
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d: any) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill-opacity', 1)
          .attr('stroke-width', 2);

        setHoveredNode(d.data);
        setTooltipPos({ x: event.pageX, y: event.pageY });
      })
      .on('mousemove', function (event) {
        setTooltipPos({ x: event.pageX, y: event.pageY });
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill-opacity', 0.85)
          .attr('stroke-width', 1);

        setHoveredNode(null);
      });

    // Add labels
    cells.each(function (d: any) {
      const cellWidth = d.x1 - d.x0;
      const cellHeight = d.y1 - d.y0;
      const cell = d3.select(this);
      const padding = 6;

      // Skip labels for very small cells
      if (cellWidth < 50 || cellHeight < 30) return;

      // Projektnummer (always show if space)
      if (cellHeight > 30) {
        cell
          .append('text')
          .attr('x', padding)
          .attr('y', padding + 12)
          .attr('fill', textColor)
          .attr('font-size', '12px')
          .attr('font-weight', '700')
          .attr('font-family', 'monospace')
          .attr('pointer-events', 'none')
          .attr('filter', 'url(#text-shadow)')
          .text(d.data.projektnummer)
          .each(function () {
            const textWidth = (this as SVGTextElement).getComputedTextLength();
            if (textWidth > cellWidth - padding * 2) {
              d3.select(this).text(d.data.projektnummer.slice(0, 8) + '...');
            }
          });
      }

      // Auftraggeber (only if enough space)
      if (cellHeight > 50 && cellWidth > 80) {
        cell
          .append('text')
          .attr('x', padding)
          .attr('y', padding + 28)
          .attr('fill', textColorSecondary)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('pointer-events', 'none')
          .attr('filter', 'url(#text-shadow)')
          .text(d.data.auftraggeber)
          .each(function () {
            const textWidth = (this as SVGTextElement).getComputedTextLength();
            const maxWidth = cellWidth - padding * 2;
            if (textWidth > maxWidth) {
              const chars = Math.floor((maxWidth / textWidth) * d.data.auftraggeber.length) - 3;
              d3.select(this).text(d.data.auftraggeber.slice(0, Math.max(0, chars)) + '...');
            }
          });
      }

      // Umsatz (only if enough space)
      if (cellHeight > 70 && cellWidth > 100) {
        cell
          .append('text')
          .attr('x', padding)
          .attr('y', padding + 46)
          .attr('fill', textColor)
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .attr('pointer-events', 'none')
          .attr('filter', 'url(#text-shadow)')
          .text(formatCurrency(d.data.umsatz));
      }
    });
  }, [treemapData, isDark, dimensions]);

  // Always render container so ref can measure dimensions
  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="relative w-full h-[500px] rounded-lg border border-border bg-card overflow-hidden"
      >
        <svg ref={svgRef} className="w-full h-full" />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <div className="animate-pulse text-muted-foreground">Lade Projekte...</div>
          </div>
        )}

        {/* Empty state overlay */}
        {!loading && treemapData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">Keine Projekte</p>
              <p className="text-sm mt-1">
                {projects.length === 0
                  ? 'Keine Projektdaten vorhanden. Bitte PM-Controlling importieren.'
                  : `${projects.length} Projekte geladen, aber keines mit Umsatz > 0.`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="fixed z-50 pointer-events-none bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs"
          style={{
            left: tooltipPos.x + 15,
            top: tooltipPos.y - 10,
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono font-semibold text-foreground">
              {hoveredNode.projektnummer}
            </span>
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
              hoveredNode.projektkategorie === 'A' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              hoveredNode.projektkategorie === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              Kat. {hoveredNode.projektkategorie}
            </span>
          </div>

          {/* Auftraggeber & Bezeichnung */}
          <p className="text-sm font-medium text-foreground">{hoveredNode.auftraggeber}</p>
          <p className="text-xs text-muted-foreground mb-3">{hoveredNode.bezeichnung}</p>

          {/* Data Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="text-muted-foreground">Umsatz</div>
            <div className="text-right font-medium text-foreground">
              {formatCurrency(hoveredNode.umsatz)}
            </div>

            <div className="text-muted-foreground">VK</div>
            <div className="text-right font-medium text-foreground">
              {formatCurrency(hoveredNode.vk)}
            </div>

            <div className="text-muted-foreground">Aktuell</div>
            <div className="text-right font-medium text-foreground">
              {formatCurrency(hoveredNode.aktuell)}
            </div>

            <div className="text-muted-foreground">Voraussichtlich</div>
            <div className="text-right font-medium text-foreground">
              {formatCurrency(hoveredNode.voraussichtlich)}
            </div>

            <div className="text-muted-foreground">Marge</div>
            <div className="text-right font-medium text-foreground">
              {formatCurrency(hoveredNode.marge)}
              <span className="text-muted-foreground ml-1">
                ({formatPercent(hoveredNode.margeProzent)})
              </span>
            </div>

            <div className="text-muted-foreground">Projektleiter</div>
            <div className="text-right text-foreground">
              {hoveredNode.projektleiter}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
