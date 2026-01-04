/**
 * Landing Page - PVCS Prism
 * Visual concept: "Dark Side of the Moon" - Animated Prism Data Flow
 * CORRECTIONS:
 * - Spread: +/- 30 Degree Cone.
 * - Reach: Extended to near screen edge.
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { Sun, Moon } from 'lucide-react';
import LoginModal from '@/components/auth/LoginModal';
import { useUserContext } from '@/contexts/UserContext';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  radius: number;
  color: string;
  isLeaf?: boolean;
  delay?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  delay?: number;
}

// Light mode: pastel colors that work well on light backgrounds
const SPECTRUM_COLORS_LIGHT = [
  'hsla(0, 85%, 55%, 0.9)',    // red
  'hsla(30, 90%, 55%, 0.9)',   // orange
  'hsla(50, 95%, 50%, 0.9)',   // gold/yellow
  'hsla(120, 80%, 45%, 0.9)',  // green
  'hsla(200, 85%, 50%, 0.9)',  // cyan
  'hsla(270, 75%, 55%, 0.9)',  // violet
];

// Dark mode: vibrant, saturated colors that pop on dark backgrounds
const SPECTRUM_COLORS_DARK = [
  'hsla(0, 100%, 70%, 0.95)',   // bright red
  'hsla(30, 100%, 70%, 0.95)',  // bright orange
  'hsla(50, 100%, 60%, 0.95)',  // gold
  'hsla(120, 100%, 65%, 0.95)', // bright green
  'hsla(190, 100%, 65%, 0.95)', // bright cyan
  'hsla(270, 100%, 75%, 0.95)', // bright violet
];

function generatePrismData(spectrumColors: string[]) {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  let globalDelay = 1000;

  // 1. ROOTS
  spectrumColors.forEach((color: string, i: number) => {
    nodes.push({
      id: `root-${i}`,
      group: i,
      radius: 3,
      color: color,
      fx: 0,
      fy: 0,
      delay: globalDelay
    });
  });

  // 2. BRANCHES (Rich Tree Structure)
  spectrumColors.forEach((color: string, i: number) => {
    const rootId = `root-${i}`;

    // Level 1: Main branches 
    const level1Count = 2 + Math.floor(Math.random() * 3);
    const level1Ids: string[] = [];

    for (let j = 0; j < level1Count; j++) {
      const id = `l1-${i}-${j}`;
      const delay = globalDelay + 150 + Math.random() * 300;
      nodes.push({ id, group: i, radius: 4, color, delay });
      links.push({ source: rootId, target: id, value: 2.5, delay });
      level1Ids.push(id);
    }

    // Level 2: Sub-branches
    const level2Ids: string[] = [];
    level1Ids.forEach((parentId) => {
      const count = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < count; k++) {
        const id = `l2-${parentId}-${k}`;
        const delay = globalDelay + 400 + Math.random() * 400;
        nodes.push({ id, group: i, radius: 2.5, color, delay });
        links.push({ source: parentId, target: id, value: 1, delay });
        level2Ids.push(id);
      }
    });

    // Level 3: Leaves (Tips) 
    level2Ids.forEach((parentId) => {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let m = 0; m < count; m++) {
        const id = `leaf-${parentId}-${m}`;
        const delay = globalDelay + 700 + Math.random() * 500;
        nodes.push({ id, group: i, radius: 1.5, color, isLeaf: true, delay });
        links.push({ source: parentId, target: id, value: 0.5, delay });
      }
    });
  });

  return { nodes, links };
}

export default function Landing() {
  const { isLoggedIn } = useUserContext();
  const [isDark, setIsDark] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // Redirect to home after successful login
  useEffect(() => {
    if (isLoggedIn && showLogin) {
      setShowLogin(false);
      window.location.href = '/';
    }
  }, [isLoggedIn, showLogin]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    localStorage.setItem('darkMode', 'true');
    setIsDark(true);
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
      setIsDark(true);
    }
  };

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    try {
      const width = containerRef.current.clientWidth || window.innerWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const defs = svg.append('defs');

      // Theme-aware colors
      const beamColor = isDark ? '#fff' : '#000';
      const prismFillLight = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
      const prismFillMid = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
      const prismStroke = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
      const refractionFill = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';

      // Crisp Glow
      const filter = defs.append('filter').attr('id', 'neon-glow').attr('filterUnits', 'userSpaceOnUse');
      filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Beam Gradient
      const beamGrad = defs.append('linearGradient').attr('id', 'beam-grad')
        .attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
      beamGrad.append('stop').attr('offset', '0%').attr('stop-color', beamColor).attr('stop-opacity', 0);
      beamGrad.append('stop').attr('offset', '20%').attr('stop-color', beamColor).attr('stop-opacity', 0.6);
      beamGrad.append('stop').attr('offset', '100%').attr('stop-color', beamColor).attr('stop-opacity', 1);

      const prismGrad = defs.append('linearGradient').attr('id', 'prism-grad')
        .attr('x1', '0%').attr('y1', '100%').attr('x2', '50%').attr('y2', '0%');
      prismGrad.append('stop').attr('offset', '0%').attr('stop-color', prismFillLight);
      prismGrad.append('stop').attr('offset', '50%').attr('stop-color', prismFillMid);
      prismGrad.append('stop').attr('offset', '100%').attr('stop-color', prismFillLight);


      // --- GEOMETRY ---
      const prismSize = 300;
      const prismX = width * 0.42;
      const prismY = height * 0.5;

      const h = prismSize * (Math.sqrt(3) / 2);
      const pTop = { x: prismX, y: prismY - h * 0.5 };
      const pLeft = { x: prismX - prismSize * 0.5, y: prismY + h * 0.5 };
      const pRight = { x: prismX + prismSize * 0.5, y: prismY + h * 0.5 };

      // 1. BEAM ENTRY
      const entryT = 0.6;
      const entryPoint = {
        x: pTop.x + (pLeft.x - pTop.x) * entryT,
        y: pTop.y + (pLeft.y - pTop.y) * entryT
      };
      const beamStart = { x: 0, y: height * 0.65 };

      // 2. BEAM EXIT (Right Face)
      const slopeInv = (pRight.x - pTop.x) / (pRight.y - pTop.y);
      const exitPointCenter = {
        x: pTop.x + (entryPoint.y - pTop.y) * slopeInv,
        y: entryPoint.y
      };

      const spectrumHeight = 25;
      const dxF = pRight.x - pTop.x;
      const dyF = pRight.y - pTop.y;
      const lenF = Math.sqrt(dxF * dxF + dyF * dyF);
      const uxF = dxF / lenF;
      const uyF = dyF / lenF;

      const specStart = { x: exitPointCenter.x - uxF * spectrumHeight / 2, y: exitPointCenter.y - uyF * spectrumHeight / 2 };
      const specEnd = { x: exitPointCenter.x + uxF * spectrumHeight / 2, y: exitPointCenter.y + uyF * spectrumHeight / 2 };

      // --- DRAWING LAYERS ---

      const internalGroup = svg.append('g').attr('opacity', 0);
      internalGroup.transition().delay(800).duration(400).attr('opacity', 1);

      const refractionPoly = `M ${entryPoint.x},${entryPoint.y} L ${specStart.x},${specStart.y} L ${specEnd.x},${specEnd.y} Z`;
      internalGroup.append('path')
        .attr('d', refractionPoly)
        .attr('fill', refractionFill)
        .attr('stroke', 'none');

      // Prism - clickable to shake the tree
      const prismPath = svg.append('path')
        .attr('d', `M ${pTop.x} ${pTop.y} L ${pRight.x} ${pRight.y} L ${pLeft.x} ${pLeft.y} Z`)
        .attr('fill', 'url(#prism-grad)')
        .attr('stroke', prismStroke)
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .style('pointer-events', 'all')
        .on('click', () => {
          // Expand the tree!
          if (simulationRef.current && nodesRef.current.length > 0) {
            // Boost simulation energy
            simulationRef.current.alpha(0.6).restart();

            // Give nodes a directional push outward (based on their position)
            nodesRef.current.forEach(d => {
              if (d.fx === undefined) {
                const dx = d.x! - exitPointCenter.x;
                // Push proportional to distance - further nodes get more push
                const pushStrength = Math.min(dx / 200, 1) * 8;
                d.vx = (d.vx || 0) + pushStrength + Math.random() * 3;
                // Small vertical spread
                d.vy = (d.vy || 0) + (Math.random() - 0.5) * 4;
              }
            });
          }

          // Visual feedback - soft edge glow
          prismPath
            .transition().duration(100)
            .attr('stroke', isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)')
            .attr('stroke-width', 2)
            .attr('filter', 'url(#neon-glow)')
            .transition().duration(500)
            .attr('stroke', prismStroke)
            .attr('stroke-width', 1)
            .attr('filter', null);
        });

      const beamLine = svg.append('line')
        .attr('x1', beamStart.x).attr('y1', beamStart.y)
        .attr('x2', entryPoint.x).attr('y2', entryPoint.y)
        .attr('stroke', 'url(#beam-grad)')
        .attr('stroke-width', 3)
        .attr('filter', 'url(#neon-glow)')
        .attr('opacity', 0);

      const beamLen = Math.sqrt(Math.pow(entryPoint.x - beamStart.x, 2) + Math.pow(entryPoint.y - beamStart.y, 2));
      beamLine.attr('stroke-dasharray', beamLen).attr('stroke-dashoffset', beamLen)
        .transition().duration(800).ease(d3.easeLinear).attr('opacity', 0.9).attr('stroke-dashoffset', 0);

      svg.append('circle').attr('cx', entryPoint.x).attr('cy', entryPoint.y).attr('r', 0)
        .attr('fill', beamColor).attr('filter', 'url(#neon-glow)')
        .transition().delay(750).duration(200).attr('r', 3);


      // 4. Force Tree (Exiting Right)
      const spectrumColors = isDark ? SPECTRUM_COLORS_DARK : SPECTRUM_COLORS_LIGHT;
      const { nodes, links } = generatePrismData(spectrumColors);
      const groups = spectrumColors.length;

      nodes.forEach(node => {
        if (node.id.startsWith('root-')) {
          const t = node.group / (groups - 1);
          node.fx = specStart.x + (specEnd.x - specStart.x) * t;
          node.fy = specStart.y + (specEnd.y - specStart.y) * t;
          node.x = node.fx;
          node.y = node.fy;
        } else {
          node.x = exitPointCenter.x + 10;
          node.y = exitPointCenter.y;
        }
      });

      // TAN(30 deg) ~= 0.577
      const MAX_TAN = 0.577;

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(45))
        .force('charge', d3.forceManyBody().strength(-15))
        .force('collide', d3.forceCollide(4))
        .alphaTarget(0.03) // Keep simulation running forever
        .alphaDecay(0.01)  // Slow decay for smooth movement
        .force('coneRepulsion', () => {
          // Repulsion force from cone edges
          nodes.forEach(d => {
            if (d.fx !== undefined) return;

            const dx = d.x! - exitPointCenter.x;
            const dy = d.y! - exitPointCenter.y;
            const maxDy = dx * MAX_TAN;

            if (maxDy > 0) {
              // Distance to upper and lower cone edge
              const distToUpper = maxDy - dy;
              const distToLower = maxDy + dy;

              // Repulsion strength (stronger when closer to edge)
              const repulsionRange = 80;
              if (distToUpper < repulsionRange) {
                const force = Math.pow(1 - distToUpper / repulsionRange, 2) * 3;
                d.vy = (d.vy || 0) - force; // Push down
              }
              if (distToLower < repulsionRange) {
                const force = Math.pow(1 - distToLower / repulsionRange, 2) * 3;
                d.vy = (d.vy || 0) + force; // Push up
              }
            }
          });
        })
        .force('flow', alpha => {
          nodes.forEach(d => {
            if (d.fx === undefined) {
              // Stronger flow to reach screen edge
              d.vx = (d.vx || 0) + 1.0 * alpha;

              const groupT = d.group / (groups - 1);
              // SPREAD = +/- 25 degrees (keep inside 30)
              const angle = (-25 + groupT * 50) * (Math.PI / 180);

              const speed = Math.sqrt(d.vx! * d.vx! + d.vy! * d.vy!) || 0.1;
              const tvx = Math.cos(angle) * speed;
              const tvy = Math.sin(angle) * speed;

              d.vx = d.vx! * 0.9 + tvx * 0.1;
              d.vy = d.vy! * 0.9 + tvy * 0.1;
            }
          });
        });

      // Store refs for click handler
      simulationRef.current = simulation;
      nodesRef.current = nodes;

      const linkPath = svg.append('g').selectAll('path')
        .data(links).enter().append('path')
        .attr('fill', 'none').attr('stroke-width', d => d.value * 0.5)
        .attr('stroke', d => (d.source as GraphNode).color)
        .attr('stroke-opacity', 0).style('mix-blend-mode', 'screen');

      const nodeCircle = svg.append('g').selectAll('circle')
        .data(nodes).enter().append('circle')
        .attr('r', d => d.radius * 1.0).attr('fill', d => d.color)
        .attr('fill-opacity', 0).style('mix-blend-mode', 'screen');

      linkPath.transition().delay(d => d.delay || 1200).duration(800).attr('stroke-opacity', 0.8);
      nodeCircle.transition().delay(d => d.delay || 1200).duration(800).attr('fill-opacity', 0.9);

      simulation.on('tick', () => {
        nodes.forEach(d => {
          if (d.fx === undefined) {
            // Keep nodes moving right from exit point
            if (d.x! < exitPointCenter.x) d.x = exitPointCenter.x + 1;

            // Hard boundary as safety net only
            const dx = d.x! - exitPointCenter.x;
            const dy = d.y! - exitPointCenter.y;
            const maxDy = dx * MAX_TAN;
            if (Math.abs(dy) > maxDy) {
              d.y = exitPointCenter.y + Math.sign(dy) * maxDy;
            }

            // Screen bounds
            if (d.x! > width - 20) d.x = width - 20;
          }
        });

        linkPath.attr('d', d => {
          const s = d.source as GraphNode;
          const t = d.target as GraphNode;
          if (!s || !t || isNaN(s.x!) || isNaN(t.x!)) return '';
          const dx = (t.x! - s.x!) * 0.4;
          return `M ${s.x},${s.y} C ${s.x! + Math.abs(dx)},${s.y} ${t.x! - Math.abs(dx)},${t.y} ${t.x},${t.y}`;
        });
        nodeCircle.attr('cx', d => d.x!).attr('cy', d => d.y!);
      });

    } catch (e) {
      console.error("D3 Error:", e);
    }
  }, [isDark]);

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden relative font-sans transition-colors duration-300">
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-8 max-w-[1800px] mx-auto"
      >
        <div className="flex flex-col">
          <h1
            className="text-4xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            PVCS <span className="gradient-text">Prism</span>
          </h1>
          <span
            className="text-[11px] tracking-[0.35em] text-muted-foreground uppercase mt-2"
            style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}
          >
            Business Intelligence
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={toggle} className="text-muted-foreground hover:text-foreground transition-colors">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setShowLogin(true)}
            className="group relative px-8 py-3 bg-foreground/5 border border-foreground/10 rounded-full overflow-hidden transition-all hover:bg-foreground/10 hover:border-foreground/20"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <span className="relative text-[11px] font-semibold tracking-[0.2em] uppercase">
              Launch App
            </span>
          </button>
        </div>
      </motion.nav>

      <div ref={containerRef} className="absolute inset-0 z-10 pointer-events-none">
        <svg ref={svgRef} width="100%" height="100%" />
      </div>

      {showLogin && <div className="pointer-events-auto relative z-50"><LoginModal /></div>}
    </div>
  );
}
