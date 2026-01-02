/**
 * Landing Page - PVCS Prism
 * Visual concept: Light Beam → Prism → Force Tree (data visualization)
 * Dark mode as default, modern minimal design
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import * as d3 from 'd3';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useUserContext } from '@/contexts/UserContext';
import LoginModal from '@/components/auth/LoginModal';

// Force Tree Node interface
interface TreeNode extends d3.SimulationNodeDatum {
  id: string;
  depth: number;
  color: string;
  radius: number;
  angle?: number; // For fan-out positioning
}

interface TreeLink extends d3.SimulationLinkDatum<TreeNode> {
  source: TreeNode | string;
  target: TreeNode | string;
  color: string;
}

// Rainbow spectrum colors
const RAINBOW_COLORS = [
  '#FF3333', // Red
  '#FF8833', // Orange
  '#FFDD33', // Yellow
  '#33FF55', // Green
  '#33DDFF', // Cyan
  '#3388FF', // Blue
  '#AA33FF', // Violet
];

// Generate tree data that fans out from prism
function generatePrismTree(): { nodes: TreeNode[]; links: TreeLink[] } {
  const nodes: TreeNode[] = [];
  const links: TreeLink[] = [];

  // Root node (exit point of prism)
  nodes.push({ id: 'root', depth: 0, color: '#FFFFFF', radius: 0, angle: 0 });

  // Generate 7 branches for 7 rainbow colors - fan out evenly
  const branches = 7;
  const fanAngle = 120; // Total fan angle in degrees
  const startAngle = -fanAngle / 2;

  for (let i = 0; i < branches; i++) {
    const branchId = `b${i}`;
    const color = RAINBOW_COLORS[i];
    const angle = startAngle + (i / (branches - 1)) * fanAngle;

    nodes.push({ id: branchId, depth: 1, color, radius: 5, angle });
    links.push({ source: 'root', target: branchId, color });

    // Sub-branches - same color as parent
    const subBranches = 2 + Math.floor(Math.random() * 2);
    for (let j = 0; j < subBranches; j++) {
      const subId = `b${i}-${j}`;
      const subAngle = angle + (j - (subBranches - 1) / 2) * 8;
      nodes.push({ id: subId, depth: 2, color, radius: 4, angle: subAngle });
      links.push({ source: branchId, target: subId, color });

      // Leaf nodes
      const leaves = 2 + Math.floor(Math.random() * 2);
      for (let k = 0; k < leaves; k++) {
        const leafId = `b${i}-${j}-${k}`;
        const leafAngle = subAngle + (k - (leaves - 1) / 2) * 5;
        nodes.push({ id: leafId, depth: 3, color, radius: 3, angle: leafAngle });
        links.push({ source: subId, target: leafId, color });
      }
    }
  }

  return { nodes, links };
}

export default function Landing() {
  const { isDark, toggle } = useDarkMode();
  const { isLoggedIn } = useUserContext();
  const [showLogin, setShowLogin] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure dark mode on landing page (modern default)
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('dark')) {
      root.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    }
  }, []);

  // Handle login success
  useEffect(() => {
    if (isLoggedIn && showLogin) {
      setShowLogin(false);
      window.location.href = '/';
    }
  }, [isLoggedIn, showLogin]);

  // D3 Force Tree Animation - integrated with beam and prism
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.selectAll('*').remove();

    // Key positions - prism centered more to the left
    const prismX = width * 0.25;
    const prismY = height * 0.5;
    const prismSize = Math.min(height * 0.4, 180);
    // Tree starts exactly at prism's right vertex
    const prismRightX = prismX + prismSize * 0.5;
    const treeStartX = prismRightX;

    // Create defs for gradients
    const defs = svg.append('defs');

    // Beam gradient
    defs.append('linearGradient')
      .attr('id', 'beamGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: 'rgba(255,255,255,0)' },
        { offset: '50%', color: 'rgba(255,255,255,0.6)' },
        { offset: '100%', color: 'rgba(255,255,255,1)' },
      ])
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    // Prism gradient (glass effect)
    const prismGradient = defs.append('linearGradient')
      .attr('id', 'prismGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    prismGradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(255,255,255,0.15)');
    prismGradient.append('stop').attr('offset', '50%').attr('stop-color', 'rgba(255,255,255,0.08)');
    prismGradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(255,255,255,0.12)');

    // Rainbow gradient for prism edge
    const rainbowGradient = defs.append('linearGradient')
      .attr('id', 'rainbowGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    RAINBOW_COLORS.forEach((color, i) => {
      rainbowGradient.append('stop')
        .attr('offset', `${(i / (RAINBOW_COLORS.length - 1)) * 100}%`)
        .attr('stop-color', color);
    });

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Prism vertices
    const prismLeft = prismX - prismSize * 0.5;
    const prismTop = prismY - prismSize * 0.55;
    const prismBottom = prismY + prismSize * 0.55;

    // 1. Draw Light Beam (from left edge to prism's left side)
    svg.append('line')
      .attr('x1', 0)
      .attr('y1', prismY)
      .attr('x2', prismLeft)
      .attr('y2', prismY)
      .attr('stroke', 'url(#beamGradient)')
      .attr('stroke-width', 5)
      .attr('filter', 'url(#glow)');

    // 2. Draw Prism (triangle pointing right)
    const prismPoints = [
      [prismLeft, prismTop],      // Top left
      [prismLeft, prismBottom],   // Bottom left
      [prismRightX, prismY],      // Right point (where tree starts)
    ];

    // Prism outer glow
    svg.append('polygon')
      .attr('points', prismPoints.map(p => p.join(',')).join(' '))
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.15)')
      .attr('stroke-width', 20)
      .attr('filter', 'url(#glow)');

    // Prism fill
    svg.append('polygon')
      .attr('points', prismPoints.map(p => p.join(',')).join(' '))
      .attr('fill', 'url(#prismGradient)')
      .attr('stroke', 'rgba(255,255,255,0.4)')
      .attr('stroke-width', 2);

    // Inner highlight (glass refraction)
    const innerOffset = prismSize * 0.08;
    const innerPoints = [
      [prismLeft + innerOffset, prismTop + innerOffset * 1.5],
      [prismLeft + innerOffset, prismBottom - innerOffset * 1.5],
      [prismRightX - innerOffset * 2, prismY],
    ];
    svg.append('polygon')
      .attr('points', innerPoints.map(p => p.join(',')).join(' '))
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.1)')
      .attr('stroke-width', 1);

    // Rainbow edge on right sides of prism (top edge)
    svg.append('line')
      .attr('x1', prismPoints[0][0])
      .attr('y1', prismPoints[0][1])
      .attr('x2', prismPoints[2][0])
      .attr('y2', prismPoints[2][1])
      .attr('stroke', 'url(#rainbowGradient)')
      .attr('stroke-width', 4)
      .attr('stroke-opacity', 0.6);

    // Rainbow edge (bottom edge)
    svg.append('line')
      .attr('x1', prismPoints[2][0])
      .attr('y1', prismPoints[2][1])
      .attr('x2', prismPoints[1][0])
      .attr('y2', prismPoints[1][1])
      .attr('stroke', 'url(#rainbowGradient)')
      .attr('stroke-width', 4)
      .attr('stroke-opacity', 0.6);

    // Draw initial rainbow rays from prism tip (before force tree connects)
    const rayLength = 30;
    RAINBOW_COLORS.forEach((color, i) => {
      const angle = -60 + (i / (RAINBOW_COLORS.length - 1)) * 120;
      const rad = (angle * Math.PI) / 180;
      svg.append('line')
        .attr('x1', prismRightX)
        .attr('y1', prismY)
        .attr('x2', prismRightX + Math.cos(rad) * rayLength)
        .attr('y2', prismY + Math.sin(rad) * rayLength)
        .attr('stroke', color)
        .attr('stroke-width', 3)
        .attr('stroke-opacity', 0.8)
        .attr('filter', 'url(#glow)');
    });

    // 3. Draw Force Tree
    const { nodes, links } = generatePrismTree();

    // Position root at prism exit
    nodes[0].fx = treeStartX;
    nodes[0].fy = prismY;

    // Set initial positions based on angles for fan effect
    // Use remaining screen width for tree spread
    const availableWidth = width - treeStartX - 50;
    const depthDistance = [0, availableWidth * 0.3, availableWidth * 0.55, availableWidth * 0.8];
    nodes.forEach(node => {
      if (node.depth > 0 && node.angle !== undefined) {
        const rad = (node.angle * Math.PI) / 180;
        const dist = depthDistance[node.depth];
        node.x = treeStartX + Math.cos(rad) * dist;
        node.y = prismY + Math.sin(rad) * dist;
      }
    });

    const simulation = d3.forceSimulation<TreeNode>(nodes)
      .force('link', d3.forceLink<TreeNode, TreeLink>(links)
        .id(d => d.id)
        .distance(d => {
          const target = d.target as TreeNode;
          return availableWidth * 0.15 + target.depth * 15;
        })
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-40))
      .force('x', d3.forceX(d => {
        if (d.depth === 0) return treeStartX;
        const rad = ((d.angle || 0) * Math.PI) / 180;
        return treeStartX + Math.cos(rad) * depthDistance[d.depth];
      }).strength(0.4))
      .force('y', d3.forceY(d => {
        if (d.depth === 0) return prismY;
        const rad = ((d.angle || 0) * Math.PI) / 180;
        return prismY + Math.sin(rad) * depthDistance[d.depth];
      }).strength(0.4))
      .force('collision', d3.forceCollide<TreeNode>().radius(d => d.radius + 3));

    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.7)
      .attr('filter', 'url(#glow)');

    // Draw nodes (skip root node - it's invisible)
    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes.filter(n => n.depth > 0))
      .enter()
      .append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.9)
      .attr('filter', 'url(#glow)');

    // Gentle pulsing animation
    node.each(function(d, i) {
      const circle = d3.select(this);
      const delay = i * 30;

      function pulse() {
        circle
          .transition()
          .delay(delay)
          .duration(2000)
          .attr('fill-opacity', 0.5)
          .attr('r', d.radius * 0.8)
          .transition()
          .duration(2000)
          .attr('fill-opacity', 0.9)
          .attr('r', d.radius)
          .on('end', pulse);
      }
      pulse();
    });

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as TreeNode).x || 0)
        .attr('y1', d => (d.source as TreeNode).y || 0)
        .attr('x2', d => (d.target as TreeNode).x || 0)
        .attr('y2', d => (d.target as TreeNode).y || 0);

      node
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);
    });

    return () => simulation.stop();
  }, []);

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden relative">

      {/* Background Ambient Glow - subtle rainbow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-red-500/5 via-yellow-500/5 to-green-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-0 left-0 right-0 z-20 flex justify-between items-start p-6 max-w-[1400px] mx-auto"
      >
        {/* Logo: PVCS / Prism - Two Lines */}
        <div className="flex flex-col leading-tight tracking-tight">
          <span className="font-bold text-2xl text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            PVCS
          </span>
          <span
            className="font-medium text-2xl gradient-text"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Prism
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card-muted text-muted-foreground hover:text-foreground transition-colors"
            title={isDark ? 'Hell-Modus' : 'Dunkel-Modus'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Launch App Button */}
          <button
            onClick={() => setShowLogin(true)}
            className="px-6 py-3 rounded-full font-semibold text-[#1A1A12] gradient-main hover:scale-105 transition-transform duration-300 shadow-[var(--shadow-glow)]"
          >
            Launch App
          </button>
        </div>
      </motion.nav>

      {/* Main Visual: Full-screen SVG with Beam → Prism → Tree */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="absolute inset-0 z-10"
      >
        <svg ref={svgRef} width="100%" height="100%" className="w-full h-full" />
      </motion.div>

      {/* Login Modal */}
      {showLogin && <LoginModal />}
    </div>
  );
}
