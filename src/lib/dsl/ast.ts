import type { CstNode, IToken } from 'chevrotain';
import { parserInstance } from './parser';

export interface NodeDecl {
  id: string;
  label: string;
  attrs: Record<string, string>;
  line?: number;
}

export interface EdgeDecl {
  from: string;
  to: string;
  label?: string;
  arrowType: 'sync' | 'async';
  line?: number;
}

export interface DiagramAST {
  type: 'flowchart' | 'sequence-diagram' | 'unknown';
  nodes: NodeDecl[];
  edges: EdgeDecl[];
}

/** The per-rule children map produced by the Chevrotain CST visitor. */
type CstChildren = Record<string, (IToken | CstNode)[]>;

const BaseVisitor = parserInstance.getBaseCstVisitorConstructorWithDefaults();

class AstBuilder extends BaseVisitor {
  private nodes = new Map<string, NodeDecl>();
  private edges: EdgeDecl[] = [];
  private diagramType: DiagramAST['type'] = 'unknown';

  constructor() {
    super();
    this.validateVisitor();
  }

  private reset() {
    this.nodes = new Map();
    this.edges = [];
    this.diagramType = 'unknown';
  }

  private ensureNode(id: string, line?: number) {
    if (!id) return;
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, label: id, attrs: {}, line });
    }
  }

  program(ctx: CstChildren): DiagramAST {
    this.reset();
    this.visit(ctx.diagramTypeLine[0] as CstNode);
    ctx.nodeDecl?.forEach((n) => this.visit(n as CstNode));
    ctx.edgeDecl?.forEach((e) => this.visit(e as CstNode));
    return {
      type: this.diagramType,
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }

  diagramTypeLine(ctx: CstChildren) {
    const text = (ctx.FreeText[0] as IToken).image.trim().toLowerCase();
    this.diagramType = text === 'flowchart' || text === 'sequence-diagram' ? text : 'unknown';
  }

  nodeDecl(ctx: CstChildren) {
    const tokens = ctx.FreeText as IToken[];
    const hasExplicitId = Boolean(ctx.Colon);

    const idTok = tokens[0];
    const labelTok = hasExplicitId ? tokens[1] : tokens[0];

    const id = idTok.image.trim();
    const label = labelTok.image.trim();
    if (!id) return;

    const attrs: Record<string, string> = ctx.attrList ? this.visit(ctx.attrList[0] as CstNode) : {};

    const existing = this.nodes.get(id);
    if (existing) {
      existing.label = label;
      existing.attrs = { ...existing.attrs, ...attrs };
    } else {
      this.nodes.set(id, { id, label, attrs, line: idTok.startLine ?? undefined });
    }
  }

  edgeDecl(ctx: CstChildren) {
    const fromTok = ctx.FreeText[0] as IToken;
    const toTok = ctx.FreeText[1] as IToken;
    const from = fromTok.image.trim();
    const to = toTok.image.trim();
    if (!from || !to) return;

    const label = ctx.FreeText[2] ? (ctx.FreeText[2] as IToken).image.trim() : undefined;
    const arrowType: 'sync' | 'async' = ctx.DashArrow ? 'async' : 'sync';

    this.ensureNode(from, fromTok.startLine ?? undefined);
    this.ensureNode(to, toTok.startLine ?? undefined);
    this.edges.push({ from, to, label, arrowType, line: fromTok.startLine ?? undefined });
  }

  attrList(ctx: CstChildren): Record<string, string> {
    const result: Record<string, string> = {};
    ctx.attrPair.forEach((p) => {
      const { key, value } = this.visit(p as CstNode);
      result[key] = value;
    });
    return result;
  }

  attrPair(ctx: CstChildren) {
    const key = (ctx.FreeText[0] as IToken).image.trim();
    const value = (ctx.FreeText[1] as IToken).image.trim();
    return { key, value };
  }
}

const builder = new AstBuilder();

export function cstToAst(cst: CstNode): DiagramAST {
  return builder.visit(cst);
}