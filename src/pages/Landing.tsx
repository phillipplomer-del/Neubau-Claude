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

const SPECTRUM_COLORS = [
  'hsla(0, 100%, 75%, 0.85)',
  'hsla(30, 100%, 75%, 0.85)',
  'hsla(60, 100%, 75%, 0.85)',
  'hsla(120, 100%, 75%, 0.85)',
  'hsla(200, 100%, 75%, 0.85)',
  'hsla(270, 100%, 75%, 0.85)',
];

function generatePrismData() {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  let globalDelay = 1000;

  // 1. ROOTS 
  SPECTRUM_COLORS.forEach((color, i) => {
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
  SPECTRUM_COLORS.forEach((color, i) => {
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
  const [isDark, setIsDark] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

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

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    try {
      const width = containerRef.current.clientWidth || window.innerWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const defs = svg.append('defs');

      // Crisp Glow
      const filter = defs.append('filter').attr('id', 'neon-glow').attr('filterUnits', 'userSpaceOnUse');
      filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Beam Gradient
      const beamGrad = defs.append('linearGradient').attr('id', 'beam-grad')
        .attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
      beamGrad.append('stop').attr('offset', '0%').attr('stop-color', '#fff').attr('stop-opacity', 0);
      beamGrad.append('stop').attr('offset', '20%').attr('stop-color', '#fff').attr('stop-opacity', 0.6);
      beamGrad.append('stop').attr('offset', '100%').attr('stop-color', '#fff').attr('stop-opacity', 1);

      const prismGrad = defs.append('linearGradient').attr('id', 'prism-grad')
        .attr('x1', '0%').attr('y1', '100%').attr('x2', '50%').attr('y2', '0%');
      prismGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(255,255,255,0.02)');
      prismGrad.append('stop').attr('offset', '50%').attr('stop-color', 'rgba(255,255,255,0.1)');
      prismGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(255,255,255,0.02)');


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
        .attr('fill', 'rgba(255,255,255,0.15)')
        .attr('stroke', 'none');

      const prismBody = svg.append('path')
        .attr('d', `M ${pTop.x} ${pTop.y} L ${pRight.x} ${pRight.y} L ${pLeft.x} ${pLeft.y} Z`)
        .attr('fill', 'url(#prism-grad)')
        .attr('stroke', 'rgba(255,255,255,0.15)')
        .attr('stroke-width', 1);

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
        .attr('fill', '#fff').attr('filter', 'url(#neon-glow)')
        .transition().delay(750).duration(200).attr('r', 3);


      // 4. Force Tree (Exiting Right)
      const { nodes, links } = generatePrismData();
      const groups = SPECTRUM_COLORS.length;

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
        // INCREASED DISTANCE slightly to 28 for better reach
        .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(28))
        .force('charge', d3.forceManyBody().strength(-8))
        .force('collide', d3.forceCollide(2))
        .force('flow', alpha => {
          nodes.forEach(d => {
            if (d.fx === undefined) {
              // MODERATE flow to reach end
              d.vx = (d.vx || 0) + 0.6 * alpha;

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

      const linkPath = svg.append('g').selectAll('path')
        .data(links).enter().append('path')
        .attr('fill', 'none').attr('stroke-width', d => d.value * 0.5)
        .attr('stroke', d => (d.source as GraphNode).color)
        .attr('stroke-opacity', 0).style('mix-blend-mode', 'screen');

      const nodeCircle = svg.append('g').selectAll('circle')
        .data(nodes).enter().append('circle')
        .attr('r', d => d.radius * 0.6).attr('fill', d => d.color)
        .attr('fill-opacity', 0).style('mix-blend-mode', 'screen');

      linkPath.transition().delay(d => d.delay || 1200).duration(800).attr('stroke-opacity', 0.8);
      nodeCircle.transition().delay(d => d.delay || 1200).duration(800).attr('fill-opacity', 0.9);

      simulation.on('tick', () => {
        nodes.forEach(d => {
          if (d.fx === undefined) {
            if (d.x! < exitPointCenter.x) d.x = exitPointCenter.x + 1;
            const dx = d.x! - exitPointCenter.x;
            const dy = d.y! - exitPointCenter.y;
            const maxDy = dx * MAX_TAN;

            // Cone constraint
            if (dy > maxDy) d.y = exitPointCenter.y + maxDy;
            if (dy < -maxDy) d.y = exitPointCenter.y - maxDy;
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
  }, []);

  return (
    <div className="h-screen w-full bg-[#050505] text-white overflow-hidden relative font-sans">
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-8 max-w-[1800px] mx-auto"
      >
        <div className="flex flex-col">
          <h1 className="text-3xl font-black tracking-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
            PVCS <span className="gradient-text">Prism</span>
          </h1>
          <span className="text-[10px] tracking-[0.4em] text-gray-400 uppercase mt-1">
            Business Intelligence
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={toggle} className="text-gray-400 hover:text-white transition-colors">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => setShowLogin(true)} className="group relative px-8 py-3 bg-white/5 border border-white/10 rounded-full overflow-hidden transition-all hover:bg-white/10">
            <span className="relative text-xs font-bold tracking-widest uppercase">Launch App</span>
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
