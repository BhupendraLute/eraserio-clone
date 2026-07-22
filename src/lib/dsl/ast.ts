import type { CstNode, IToken } from "chevrotain";
import { parserInstance } from "./parser";

export interface NodeDecl {
   id: string;
   label: string;
   attrs: Record<string, string>;
   line?: number;
}

export interface EdgeDecl {
   from: string; // references a node's id, not necessarily its label
   to: string;
   label?: string;
   line?: number;
}

export interface DiagramAST {
   type: "flowchart" | "sequence-diagram" | "unknown";
   nodes: NodeDecl[];
   edges: EdgeDecl[];
}

const BaseVisitor = parserInstance.getBaseCstVisitorConstructorWithDefaults();

class AstBuilder extends BaseVisitor {
   private nodes = new Map<string, NodeDecl>();
   private edges: EdgeDecl[] = [];
   private diagramType: DiagramAST["type"] = "unknown";

   constructor() {
      super();
      this.validateVisitor();
   }

   private reset() {
      this.nodes = new Map();
      this.edges = [];
      this.diagramType = "unknown";
   }

   // Implicit node: an edge references an id no nodeDecl line declared.
   // Its label defaults to the id itself.
   private ensureNode(id: string, line?: number) {
      if (!id) return;
      if (!this.nodes.has(id)) {
         this.nodes.set(id, { id, label: id, attrs: {}, line });
      }
   }

   program(ctx: any): DiagramAST {
      this.reset();
      this.visit(ctx.diagramTypeLine[0]);
      ctx.nodeDecl?.forEach((n: CstNode) => this.visit(n));
      ctx.edgeDecl?.forEach((e: CstNode) => this.visit(e));
      return {
         type: this.diagramType,
         nodes: Array.from(this.nodes.values()),
         edges: this.edges,
      };
   }

   diagramTypeLine(ctx: any) {
      const text = (ctx.FreeText[0] as IToken).image.trim().toLowerCase();
      this.diagramType =
         text === "flowchart" || text === "sequence-diagram" ? text : "unknown";
   }

   nodeDecl(ctx: any) {
      const tokens: IToken[] = ctx.FreeText;
      // ctx.Colon only exists when the OPTION branch matched in the
      // parser — that's the reliable signal for "id: Label" form, rather
      // than guessing from ctx.FreeText.length.
      const hasExplicitId = Boolean(ctx.Colon);

      const idTok = tokens[0];
      const labelTok = hasExplicitId ? tokens[1] : tokens[0];

      const id = idTok.image.trim();
      const label = labelTok.image.trim();
      if (!id) return; // blank line matched as FreeText — ignore

      const attrs: Record<string, string> = ctx.attrList
         ? this.visit(ctx.attrList[0])
         : {};

      const existing = this.nodes.get(id);
      if (existing) {
         existing.label = label;
         existing.attrs = { ...existing.attrs, ...attrs };
      } else {
         this.nodes.set(id, {
            id,
            label,
            attrs,
            line: idTok.startLine ?? undefined,
         });
      }
   }

   edgeDecl(ctx: any) {
      const fromTok: IToken = ctx.FreeText[0];
      const toTok: IToken = ctx.FreeText[1];
      const from = fromTok.image.trim(); // references a node's id
      const to = toTok.image.trim();
      if (!from || !to) return;

      const label = ctx.FreeText[2]
         ? (ctx.FreeText[2] as IToken).image.trim()
         : undefined;

      this.ensureNode(from, fromTok.startLine ?? undefined);
      this.ensureNode(to, toTok.startLine ?? undefined);
      this.edges.push({
         from,
         to,
         label,
         line: fromTok.startLine ?? undefined,
      });
   }

   attrList(ctx: any): Record<string, string> {
      const result: Record<string, string> = {};
      ctx.attrPair.forEach((p: CstNode) => {
         const { key, value } = this.visit(p);
         result[key] = value;
      });
      return result;
   }

   attrPair(ctx: any) {
      const key = (ctx.FreeText[0] as IToken).image.trim();
      const value = (ctx.FreeText[1] as IToken).image.trim();
      return { key, value };
   }
}

const builder = new AstBuilder();

export function cstToAst(cst: CstNode): DiagramAST {
   return builder.visit(cst);
}
