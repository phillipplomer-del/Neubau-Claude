/**
 * Hero Force Tree - Decorative Background
 * A simplified, animated force-directed graph for the landing page
 * Uses D3.js for force simulation with static demo data
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

// Node interface for D3
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  type: 'center' | 'primary' | 'secondary' | 'tertiary';
  radius: number;
  color: string;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node | string;
  target: D3Node | string;
}

// Light mode colors (Aqua theme)
const COLORS_LIGHT = {
  center: '#00DEE0',    // teal
  primary: '#00E097',   // mint
  secondary: '#0097E0', // cyan
  tertiary: '#0050E0',  // blue
  link: 'rgba(148, 163, 184, 0.3)', // slate-400 with opacity
};

// Dark mode colors (Gold/Lime theme)
const COLORS_DARK = {
  center: '#E0BD00',    // gold
  primary: '#9EE000',   // lime
  secondary: '#45F600', // green
  tertiary: '#E0D900',  // yellow
  link: 'rgba(74, 85, 104, 0.3)', // gray-600 with opacity
};

// Generate demo nodes for the visualization
function generateDemoData(): { nodes: D3Node[]; links: D3Link[] } {
  const nodes: D3Node[] = [];
  const links: D3Link[] = [];

  // Center node (represents main app)
  nodes.push({
    id: 'center',
    type: 'center',
    radius: 30,
    color: '',
  });

  // Primary nodes (represent main modules: Sales, Production, PM)
  const primaryCount = 3;
  for (let i = 0; i < primaryCount; i++) {
    const id = `primary-${i}`;
    nodes.push({
      id,
      type: 'primary',
      radius: 20,
      color: '',
    });
    links.push({ source: 'center', target: id });

    // Secondary nodes (sub-modules)
    const secondaryCount = 2 + Math.floor(Math.random() * 2);
    for (let j = 0; j < secondaryCount; j++) {
      const secId = `secondary-${i}-${j}`;
      nodes.push({
        id: secId,
        type: 'secondary',
        radius: 12,
        color: '',
      });
      links.push({ source: id, target: secId });

      // Tertiary nodes (details)
      const tertiaryCount = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < tertiaryCount; k++) {
        const terId = `tertiary-${i}-${j}-${k}`;
        nodes.push({
          id: terId,
          type: 'tertiary',
          radius: 6,
          color: '',
        });
        links.push({ source: secId, target: terId });
      }
    }
  }

  return { nodes, links };
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

export default function HeroForceTree() {
  const isDark = useDarkMode();
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Generate demo data
    const { nodes, links } = generateDemoData();

    // Assign colors based on theme
    nodes.forEach(node => {
      node.color = COLORS[node.type];
    });

    // Create main group
    const g = svg.append('g');

    // Force simulation
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance(d => {
          const target = d.target as D3Node;
          return target.type === 'tertiary' ? 60 : 100;
        })
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody<D3Node>()
        .strength(d => d.type === 'center' ? -300 : -100)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<D3Node>()
        .radius(d => d.radius + 10)
      )
      .alpha(0.8)
      .alphaDecay(0.01);

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', COLORS.link)
      .attr('stroke-width', 1.5);

    // Create nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.6)
      .attr('stroke', isDark ? '#1A1A12' : '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.5);

    // Gentle floating animation for nodes
    node.each(function(d, i) {
      const circle = d3.select(this);
      const delay = i * 100;
      const duration = 2000 + Math.random() * 1000;

      function pulse() {
        circle
          .transition()
          .delay(delay)
          .duration(duration)
          .attr('fill-opacity', 0.4)
          .transition()
          .duration(duration)
          .attr('fill-opacity', 0.7)
          .on('end', pulse);
      }
      pulse();
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x || 0)
        .attr('y1', d => (d.source as D3Node).y || 0)
        .attr('x2', d => (d.target as D3Node).x || 0)
        .attr('y2', d => (d.target as D3Node).y || 0);

      node
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);
    });

    return () => {
      simulation.stop();
    };
  }, [COLORS, isDark]);

  return (
    <motion.div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.2 }}
      transition={{ duration: 1, delay: 0.2 }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="w-full h-full"
      />
    </motion.div>
  );
}
