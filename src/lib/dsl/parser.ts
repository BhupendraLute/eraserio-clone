import { CstParser, type IToken, type CstNode } from "chevrotain";
import {
   allTokens,
   NewLine,
   Arrow,
   LBracket,
   RBracket,
   Colon,
   Comma,
   FreeText,
} from "./lexer";

class DiagramParser extends CstParser {
   constructor() {
      super(allTokens);
      this.performSelfAnalysis();
   }

   public program = this.RULE("program", () => {
      this.MANY(() => this.CONSUME(NewLine));
      this.SUBRULE(this.diagramTypeLine);
      this.MANY2(() => {
         this.MANY3(() => this.CONSUME2(NewLine));
         this.OR([
            {
               GATE: () => this.lineHasArrow(),
               ALT: () => this.SUBRULE(this.edgeDecl),
            },
            { ALT: () => this.SUBRULE(this.nodeDecl) },
         ]);
      });
      this.MANY4(() => this.CONSUME3(NewLine));
   });

   private diagramTypeLine = this.RULE("diagramTypeLine", () => {
      this.CONSUME(FreeText);
   });

   private nodeDecl = this.RULE("nodeDecl", () => {
      // Always consume one FreeText first. If it's immediately followed
      // by a Colon, this was the "id: Label" form and we consume a second
      // FreeText as the label. Otherwise it was a plain "Label" line, and
      // id defaults to the label (handled in ast.ts).
      // OPTION is used instead of OR to avoid lookahead ambiguity — both
      // "id: Label" and "Label" start with FreeText, which Chevrotain's
      // automatic lookahead can't distinguish reliably as two OR
      // alternatives. OPTION only needs a single unambiguous check: is
      // the next token a Colon?
      this.CONSUME(FreeText);
      this.OPTION(() => {
         this.CONSUME(Colon);
         this.CONSUME2(FreeText);
      });
      this.OPTION2(() => this.SUBRULE(this.attrList));
   });

   private edgeDecl = this.RULE("edgeDecl", () => {
      this.CONSUME(FreeText);
      this.CONSUME(Arrow);
      this.CONSUME2(FreeText);
      this.OPTION(() => {
         this.CONSUME(Colon);
         this.CONSUME3(FreeText);
      });
   });

   private attrList = this.RULE("attrList", () => {
      this.CONSUME(LBracket);
      this.SUBRULE(this.attrPair);
      this.MANY(() => {
         this.CONSUME(Comma);
         this.SUBRULE2(this.attrPair);
      });
      this.CONSUME(RBracket);
   });

   private attrPair = this.RULE("attrPair", () => {
      this.CONSUME(FreeText);
      this.CONSUME(Colon);
      this.CONSUME2(FreeText);
   });

   // Scans forward from the current position to see whether an Arrow
   // appears before the next NewLine — this is what distinguishes
   // "Node [attrs]" / "id: Label" from "A > B: label" at statement start.
   private lineHasArrow(): boolean {
      const MAX_SCAN = 50;
      for (let i = 1; i <= MAX_SCAN; i++) {
         const tok = this.LA(i);
         if (
            !tok ||
            tok.tokenType === NewLine ||
            tok.tokenType.name === "EOF"
         ) {
            return false;
         }
         if (tok.tokenType === Arrow) return true;
      }
      return false;
   }
}

const parserInstance = new DiagramParser();

export interface ParseResult {
   cst: CstNode;
   errors: ReturnType<DiagramParser["errors"]["slice"]>;
}

export function parse(tokens: IToken[]): ParseResult {
   parserInstance.input = tokens;
   const cst = parserInstance.program();
   return { cst, errors: parserInstance.errors };
}

// Exported so ast.ts can build a matching CstVisitor off the same parser.
export { parserInstance };
