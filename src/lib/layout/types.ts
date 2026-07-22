import type { NodeDecl } from '../dsl/ast';

export interface LaidOutNode extends NodeDecl {
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[]; // pre-wrapped label lines, computed once during layout
}

export interface LaidOutEdge {
  from: string;
  to: string;
  label?: string;
  points: { x: number; y: number }[];
}

export interface LayoutEngine {
  layout(ast: import('../dsl/ast').DiagramAST): { nodes: LaidOutNode[]; edges: LaidOutEdge[] };
}