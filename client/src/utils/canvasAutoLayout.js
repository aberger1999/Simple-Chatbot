import dagre from 'dagre';

/**
 * Dagre top-to-bottom hierarchical layout for flowcharts.
 */
export function layoutFlowchart(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });

  nodes.forEach((node) => {
    const w = node.measured?.width ?? 200;
    const h = node.measured?.height ?? 80;
    g.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    const w = node.measured?.width ?? 200;
    const h = node.measured?.height ?? 80;
    return {
      ...node,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    };
  });
}

/**
 * Radial layout from root node (node with no incoming edges).
 */
export function layoutMindMap(nodes, edges) {
  if (nodes.length === 0) return nodes;

  const targetSet = new Set(edges.map((e) => e.target));
  const root = nodes.find((n) => !targetSet.has(n.id)) || nodes[0];

  // Build adjacency (parent → children)
  const childrenMap = new Map();
  nodes.forEach((n) => childrenMap.set(n.id, []));
  edges.forEach((e) => {
    if (childrenMap.has(e.source)) {
      childrenMap.get(e.source).push(e.target);
    }
  });

  const positionMap = new Map();
  positionMap.set(root.id, { x: 0, y: 0 });

  function layoutSubtree(nodeId, angle, spread, depth) {
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    const radius = 180 + depth * 60;
    const childSpread = spread / Math.max(children.length, 1);

    children.forEach((childId, i) => {
      const childAngle = angle - spread / 2 + childSpread * (i + 0.5);
      const x = Math.cos(childAngle) * radius;
      const y = Math.sin(childAngle) * radius;

      const parentPos = positionMap.get(nodeId) || { x: 0, y: 0 };
      positionMap.set(childId, { x: parentPos.x + x, y: parentPos.y + y });
      layoutSubtree(childId, childAngle, childSpread, depth + 1);
    });
  }

  layoutSubtree(root.id, -Math.PI / 2, Math.PI * 2, 0);

  return nodes.map((node) => {
    const pos = positionMap.get(node.id);
    if (pos) {
      return { ...node, position: { x: pos.x, y: pos.y } };
    }
    return node;
  });
}

/**
 * Clean grid layout — ceil(sqrt(n)) columns, 280x200 cells + 40px gaps.
 */
export function layoutGrid(nodes) {
  if (nodes.length === 0) return nodes;

  const cols = Math.ceil(Math.sqrt(nodes.length));
  const cellW = 280;
  const cellH = 200;
  const gap = 40;

  return nodes.map((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      ...node,
      position: { x: col * (cellW + gap), y: row * (cellH + gap) },
    };
  });
}
