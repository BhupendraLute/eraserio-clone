import type { NodeDecl } from '../dsl/ast';

export interface LaidOutNode extends NodeDecl {
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
}

export interface LaidOutEdge {
  from: string;
  to: string;
  label?: string;
  points: { x: number; y: number }[];
}