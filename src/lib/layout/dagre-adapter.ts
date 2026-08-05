import dagre from 'dagre';
import type { DiagramAST } from '../dsl/ast';
import type { LaidOutNode, LaidOutEdge } from './types';
import { measureTextWidth } from './text-measure';
import { wrapLabel } from './wrap-text';
import { resolveIconName, ICON_SIZE, ICON_GAP } from '../render/node-style';
import {
  NODE_FONT,
  NODE_PADDING_X,
  NODE_PADDING_Y,
  NODE_MIN_WIDTH,
  NODE_MAX_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_LINE_HEIGHT,
  NODE_MAX_LINES,
} from '../render/text-style';

interface NodeSizing {
  width: number;
  height: number;
  lines: string[];
  hasIcon: boolean;
}

function sizeForLabel(label: string, iconAttr: string | undefined): NodeSizing {
  const hasIcon = resolveIconName(iconAttr) !== null;
  const iconSpace = hasIcon ? ICON_SIZE + ICON_GAP : 0;

  // Text has less room to wrap into when an icon eats into the node's
  // width — subtract it before wrapping so lines don't run under/over
  // the icon.
  const innerMaxWidth = NODE_MAX_WIDTH - NODE_PADDING_X - iconSpace;

  let lines = wrapLabel(label, NODE_FONT, innerMaxWidth);

  if (lines.length > NODE_MAX_LINES) {
    lines = lines.slice(0, NODE_MAX_LINES);
    const lastIdx = lines.length - 1;
    lines[lastIdx] = `${lines[lastIdx].trimEnd()}…`;
  }

  const widestLine = Math.max(...lines.map((l) => measureTextWidth(l, NODE_FONT)));
  const width = Math.min(
    NODE_MAX_WIDTH,
    Math.max(NODE_MIN_WIDTH, widestLine + NODE_PADDING_X + iconSpace)
  );
  const height = Math.max(
    NODE_MIN_HEIGHT,
    lines.length * NODE_LINE_HEIGHT + NODE_PADDING_Y * 2
  );

  return { width, height, lines, hasIcon };
}

export function dagreLayout(ast: DiagramAST): { nodes: LaidOutNode[]; edges: LaidOutEdge[] } {
  // Dynamically compute separation based on longest edge labels and node labels
  const maxEdgeLabelLength = Math.max(0, ...ast.edges.map((e) => (e.label || '').length));
  const maxNodeLabelLength = Math.max(0, ...ast.nodes.map((n) => (n.label || '').length));

  // Longer edge labels require wider rank separation so connector text pills fit comfortably
  const dynamicRankSep = Math.min(280, Math.max(160, 140 + maxEdgeLabelLength * 4.5));
  // Longer node text requires dynamic vertical separation between rows
  const dynamicNodeSep = Math.min(180, Math.max(100, 80 + Math.min(maxNodeLabelLength, 25) * 2));

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: dynamicNodeSep, ranksep: dynamicRankSep, marginx: 50, marginy: 50 });
  g.setDefaultEdgeLabel(() => ({}));

  const sizingByNodeId = new Map<string, NodeSizing>();

  for (const node of ast.nodes) {
    const sizing = sizeForLabel(node.label, node.attrs.icon);
    sizingByNodeId.set(node.id, sizing);
    g.setNode(node.id, { width: sizing.width, height: sizing.height });
  }

  for (const edge of ast.edges) {
    g.setEdge(edge.from, edge.to, { label: edge.label });
  }

  dagre.layout(g);

  const nodes: LaidOutNode[] = ast.nodes.map((node) => {
    const laidOut = g.node(node.id);
    const sizing = sizingByNodeId.get(node.id)!;
    return {
      ...node,
      x: laidOut.x - laidOut.width / 2,
      y: laidOut.y - laidOut.height / 2,
      width: laidOut.width,
      height: laidOut.height,
      lines: sizing.lines,
    };
  });

  const edges: LaidOutEdge[] = ast.edges.map((edge) => {
    const laidOut = g.edge(edge.from, edge.to);
    return { ...edge, points: (laidOut?.points ?? []).map((p) => ({ x: p.x, y: p.y })) };
  });

  return { nodes, edges };
}