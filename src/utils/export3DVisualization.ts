/**
 * Export 3D Force Graph Visualization to standalone HTML file
 * Creates a self-contained HTML with Three.js and 3d-force-graph via CDN
 */

interface ExportNode {
  id: string;
  name: string;
  type: string;
  color: string;
  size: number;
  identifier: string;
  isOverdue: boolean;
  isCompleted: boolean;
  completionPercentage: number;
  plannedHours: number;
  actualHours: number;
  description?: string;
  deliveryDate?: string;
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

interface ExportLink {
  source: string;
  target: string;
}

interface ExportData {
  nodes: ExportNode[];
  links: ExportLink[];
}

interface ExportOptions {
  title: string;
  subtitle: string;
  articleInfo?: {
    identifier: string;
    name: string;
    description?: string;
  };
  overdueItems: Array<{
    identifier: string;
    name: string;
    type: string;
    endDate?: string;
  }>;
  showTimeline?: boolean;
  backgroundColor: string;
  colors: {
    article: string;
    link: string;
  };
}

export function export3DVisualization(
  data: ExportData,
  options: ExportOptions
): void {
  // Fix all node positions so they don't move during simulation
  const fixedNodes = data.nodes.map(node => ({
    ...node,
    // Use existing positions or defaults, and fix them
    fx: node.fx ?? node.x ?? 0,
    fy: node.fy ?? node.y ?? 0,
    fz: node.fz ?? node.z ?? 0,
  }));

  const fixedData = {
    nodes: fixedNodes,
    links: data.links,
  };

  const overdueListHtml = options.overdueItems.length > 0
    ? options.overdueItems.map(item => `
        <div class="overdue-item">
          <span class="overdue-type">${item.type}</span>
          <span class="overdue-id">${item.identifier}</span>
          <span class="overdue-name">${item.name}</span>
          ${item.endDate ? `<span class="overdue-date">${item.endDate}</span>` : ''}
        </div>
      `).join('')
    : '<div class="no-overdue">Keine überfälligen Elemente</div>';

  const articleInfoHtml = options.articleInfo ? `
    <div class="article-info">
      <div class="article-id">${options.articleInfo.identifier}</div>
      <div class="article-name">${options.articleInfo.name}</div>
      ${options.articleInfo.description ? `<div class="article-desc">${options.articleInfo.description}</div>` : ''}
    </div>
  ` : '';

  const timelineCode = options.showTimeline ? `
    // Add timeline tube
    const tubePath = new THREE.LineCurve3(
      new THREE.Vector3(-250, 0, 0),
      new THREE.Vector3(250, 0, 0)
    );
    const tubeGeometry = new THREE.TubeGeometry(tubePath, 1, 1.5, 8, false);
    const tubeMaterial = new THREE.MeshLambertMaterial({
      color: '${options.colors.article}',
      transparent: true,
      opacity: 0.6,
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    Graph.scene().add(tube);
  ` : '';

  // Determine if dark mode based on background color
  const isDark = options.backgroundColor === '#1A1A12' ||
                 options.backgroundColor.toLowerCase().includes('1a1a');
  const textColor = isDark ? '#e0e0e0' : '#1a1a1a';
  const mutedColor = isDark ? '#888' : '#666';
  const panelBg = isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)';
  const panelBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: ${options.backgroundColor};
      color: ${textColor};
      overflow: hidden;
    }

    #container {
      width: 100vw;
      height: 100vh;
    }

    .info-panel {
      position: fixed;
      top: 20px;
      left: 20px;
      background: ${panelBg};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: 24px;
      max-width: 340px;
      z-index: 100;
      border: 1px solid ${panelBorder};
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .info-panel h1 {
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 6px;
      color: ${options.colors.article};
    }

    .info-panel .subtitle {
      font-size: 0.85rem;
      color: ${mutedColor};
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid ${panelBorder};
    }

    .article-info {
      background: ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .article-id {
      font-size: 1.2rem;
      font-weight: 700;
      color: ${options.colors.article};
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    }

    .article-name {
      font-size: 0.95rem;
      color: ${textColor};
      margin-top: 6px;
      font-weight: 500;
    }

    .article-desc {
      font-size: 0.8rem;
      color: ${mutedColor};
      margin-top: 10px;
      font-style: italic;
      border-left: 3px solid ${options.colors.article};
      padding-left: 10px;
      line-height: 1.4;
    }

    .overdue-section {
      margin-top: 16px;
    }

    .overdue-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #ef4444;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .overdue-title::before {
      content: '';
      display: inline-block;
      width: 10px;
      height: 10px;
      background: #ef4444;
      border-radius: 50%;
      animation: pulse 1.5s ease-in-out infinite;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.15); }
    }

    .overdue-list {
      max-height: 180px;
      overflow-y: auto;
    }

    .overdue-list::-webkit-scrollbar {
      width: 4px;
    }

    .overdue-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .overdue-list::-webkit-scrollbar-thumb {
      background: ${mutedColor};
      border-radius: 2px;
    }

    .overdue-item {
      display: grid;
      grid-template-columns: 32px 65px 1fr 58px;
      gap: 6px;
      padding: 6px 0;
      border-bottom: 1px solid ${panelBorder};
      font-size: 0.75rem;
      align-items: center;
    }

    .overdue-item:last-child {
      border-bottom: none;
    }

    .overdue-type {
      color: #f87171;
      font-weight: 600;
      font-size: 0.65rem;
      text-transform: uppercase;
    }

    .overdue-id {
      color: ${mutedColor};
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.7rem;
    }

    .overdue-name {
      color: ${textColor};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
      font-size: 0.7rem;
    }

    .overdue-date {
      color: #ef4444;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.65rem;
      text-align: right;
    }

    .no-overdue {
      color: #22c55e;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .no-overdue::before {
      content: '✓';
      font-weight: bold;
    }

    .controls-hint {
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: ${panelBg};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 0.75rem;
      color: ${mutedColor};
      z-index: 100;
      border: 1px solid ${panelBorder};
    }

    .controls-hint div {
      margin: 3px 0;
    }

    .auto-rotate-badge {
      display: inline-block;
      background: ${options.colors.article};
      color: ${isDark ? '#000' : '#fff'};
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stats {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${panelBg};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 0.8rem;
      color: ${mutedColor};
      z-index: 100;
      border: 1px solid ${panelBorder};
    }

    .stats div {
      margin: 2px 0;
    }

    .stats-value {
      color: ${options.colors.article};
      font-weight: 700;
      font-family: 'SF Mono', Monaco, monospace;
    }

    .tooltip {
      position: fixed;
      background: ${panelBg};
      border: 1px solid ${panelBorder};
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 0.8rem;
      pointer-events: none;
      z-index: 200;
      display: none;
      max-width: 280px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .tooltip-type {
      color: ${options.colors.article};
      font-weight: 700;
      margin-bottom: 6px;
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.5px;
    }

    .tooltip-name {
      color: ${textColor};
      margin-bottom: 10px;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .tooltip-details {
      color: ${mutedColor};
      font-size: 0.75rem;
      line-height: 1.6;
    }

    .tooltip-details div {
      margin: 2px 0;
    }

    .tooltip-overdue {
      color: #ef4444;
      font-weight: 700;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid ${panelBorder};
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div id="container"></div>

  <div class="info-panel">
    <h1>${options.title}</h1>
    <div class="subtitle">${options.subtitle}</div>
    ${articleInfoHtml}
    <div class="overdue-section">
      <div class="overdue-title">Überfällige Elemente (${options.overdueItems.length})</div>
      <div class="overdue-list">
        ${overdueListHtml}
      </div>
    </div>
  </div>

  <div class="controls-hint">
    <div class="auto-rotate-badge">Auto-Rotation</div>
    <div>🖱️ Links: Manuell rotieren</div>
    <div>🖱️ Rechts: Verschieben</div>
    <div>🖱️ Scroll: Zoom</div>
  </div>

  <div class="stats">
    <div>Nodes: <span class="stats-value">${fixedData.nodes.length}</span></div>
    <div>Links: <span class="stats-value">${fixedData.links.length}</span></div>
  </div>

  <div class="tooltip" id="tooltip">
    <div class="tooltip-type" id="tooltip-type"></div>
    <div class="tooltip-name" id="tooltip-name"></div>
    <div class="tooltip-details" id="tooltip-details"></div>
    <div class="tooltip-overdue" id="tooltip-overdue"></div>
  </div>

  <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
  <script src="https://unpkg.com/3d-force-graph@1.73.0/dist/3d-force-graph.min.js"></script>

  <script>
    const graphData = ${JSON.stringify(fixedData, null, 2)};

    const typeLabels = {
      project: 'Projekt',
      article: 'Artikel',
      unterartikel: 'Unterartikel',
      mainPA: 'Haupt-PA',
      pa: 'PA',
      operation: 'Arbeitsgang',
      timeline: 'Timeline'
    };

    const tooltip = document.getElementById('tooltip');
    const tooltipType = document.getElementById('tooltip-type');
    const tooltipName = document.getElementById('tooltip-name');
    const tooltipDetails = document.getElementById('tooltip-details');
    const tooltipOverdue = document.getElementById('tooltip-overdue');

    const Graph = ForceGraph3D()
      (document.getElementById('container'))
      .graphData(graphData)
      .backgroundColor('${options.backgroundColor}')
      // Disable force simulation - nodes are already positioned
      .d3AlphaDecay(1)
      .d3VelocityDecay(1)
      .cooldownTicks(0)
      .nodeThreeObject(node => {
        if (node.type === 'timeline') {
          const group = new THREE.Group();
          const geometry = new THREE.SphereGeometry(node.size, 16, 16);
          const material = new THREE.MeshLambertMaterial({
            color: node.color,
            transparent: true,
            opacity: 0.9,
          });
          const sphere = new THREE.Mesh(geometry, material);
          group.add(sphere);

          const ringGeometry = new THREE.RingGeometry(node.size * 1.2, node.size * 1.8, 32);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: node.color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.rotation.x = Math.PI / 2;
          group.add(ring);
          return group;
        }

        const geometry = new THREE.SphereGeometry(node.size, 32, 32);
        const opacity = node.isCompleted ? 1.0 : 0.3 + (node.completionPercentage / 100) * 0.7;
        const material = new THREE.MeshLambertMaterial({
          color: node.color,
          transparent: true,
          opacity,
        });
        const sphere = new THREE.Mesh(geometry, material);

        if (node.isOverdue) {
          const innerGlow = new THREE.Mesh(
            new THREE.SphereGeometry(node.size * 1.2, 32, 32),
            new THREE.MeshBasicMaterial({ color: '#ff0000', transparent: true, opacity: 0.5 })
          );
          sphere.add(innerGlow);

          const outerGlow = new THREE.Mesh(
            new THREE.SphereGeometry(node.size * 1.8, 32, 32),
            new THREE.MeshBasicMaterial({ color: '#ff3333', transparent: true, opacity: 0.25 })
          );
          sphere.add(outerGlow);

          const ringMat = new THREE.MeshBasicMaterial({
            color: '#ff0000',
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
          });
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(node.size * 1.4, node.size * 1.7, 32),
            ringMat
          );
          sphere.add(ring);

          const ring2 = ring.clone();
          ring2.rotation.x = Math.PI / 2;
          sphere.add(ring2);
        }

        return sphere;
      })
      .nodeThreeObjectExtend(false)
      .linkColor(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        if (sourceId && sourceId.startsWith('timeline-anchor-')) {
          return '${options.colors.article}';
        }
        return '${options.colors.link}';
      })
      .linkWidth(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        if (sourceId && sourceId.startsWith('timeline-anchor-')) {
          return 2;
        }
        return 1;
      })
      .linkOpacity(0.6)
      .enableNodeDrag(false)
      .onNodeHover(node => {
        if (!node || node.type === 'timeline') {
          tooltip.style.display = 'none';
          document.body.style.cursor = 'grab';
          return;
        }

        document.body.style.cursor = 'pointer';
        tooltipType.textContent = typeLabels[node.type] || node.type;
        tooltipName.textContent = node.name;
        tooltipDetails.innerHTML = \`
          <div>Nr: \${node.identifier}</div>
          <div>Fortschritt: \${node.completionPercentage.toFixed(0)}%</div>
          <div>Soll: \${node.plannedHours.toFixed(1)}h | Ist: \${node.actualHours.toFixed(1)}h</div>
        \`;
        tooltipOverdue.textContent = node.isOverdue ? '⚠ ÜBERFÄLLIG' : '';
        tooltipOverdue.style.display = node.isOverdue ? 'block' : 'none';
        tooltip.style.display = 'block';
      });

    // Mouse move for tooltip position
    document.addEventListener('mousemove', e => {
      tooltip.style.left = (e.clientX + 15) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
    });

    ${timelineCode}

    // Enable auto-rotation
    const controls = Graph.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Animation loop
    function animate() {
      controls.update();
      requestAnimationFrame(animate);
    }
    animate();

    // Zoom to fit after load
    setTimeout(() => {
      Graph.zoomToFit(400, 100);
    }, 500);
  </script>
</body>
</html>`;

  // Create download
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.title.replace(/[^a-zA-Z0-9]/g, '_')}_3D.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
