import { CstParser, type IToken, type CstNode } from 'chevrotain';
import {
  allTokens,
  NewLine,
  Arrow,
  DashArrow,
  LBracket,
  RBracket,
  Colon,
  Comma,
  FreeText,
} from './lexer';

class DiagramParser extends CstParser {
  constructor() {
    super(allTokens);
    this.performSelfAnalysis();
  }

  public program = this.RULE('program', () => {
    this.MANY(() => this.CONSUME(NewLine));
    this.SUBRULE(this.diagramTypeLine);
    this.MANY2(() => {
      this.MANY3(() => this.CONSUME2(NewLine));
      this.OR([
        { GATE: () => this.lineHasArrow(), ALT: () => this.SUBRULE(this.edgeDecl) },
        { ALT: () => this.SUBRULE(this.nodeDecl) },
      ]);
    });
    this.MANY4(() => this.CONSUME3(NewLine));
  });

  private diagramTypeLine = this.RULE('diagramTypeLine', () => {
    this.CONSUME(FreeText);
  });

  private nodeDecl = this.RULE('nodeDecl', () => {
    this.CONSUME(FreeText);
    this.OPTION(() => {
      this.CONSUME(Colon);
      this.CONSUME2(FreeText);
    });
    this.OPTION2(() => this.SUBRULE(this.attrList));
  });

  private edgeDecl = this.RULE('edgeDecl', () => {
    this.CONSUME(FreeText);
    this.OR([
      { ALT: () => this.CONSUME(Arrow) },
      { ALT: () => this.CONSUME(DashArrow) },
    ]);
    this.CONSUME2(FreeText);
    this.OPTION(() => {
      this.CONSUME(Colon);
      this.CONSUME3(FreeText);
    });
  });

  private attrList = this.RULE('attrList', () => {
    this.CONSUME(LBracket);
    this.SUBRULE(this.attrPair);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.attrPair);
    });
    this.CONSUME(RBracket);
  });

  private attrPair = this.RULE('attrPair', () => {
    this.CONSUME(FreeText);
    this.CONSUME(Colon);
    this.CONSUME2(FreeText);
  });

  // Scans forward to see whether an Arrow or DashArrow appears before
  // the next NewLine — distinguishes node/actor decls from edge/message
  // decls at statement start.
  private lineHasArrow(): boolean {
    const MAX_SCAN = 50;
    for (let i = 1; i <= MAX_SCAN; i++) {
      const tok = this.LA(i);
      if (!tok || tok.tokenType === NewLine || tok.tokenType.name === 'EOF') return false;
      if (tok.tokenType === Arrow || tok.tokenType === DashArrow) return true;
    }
    return false;
  }
}

const parserInstance = new DiagramParser();

export interface ParseResult {
  cst: CstNode;
  errors: ReturnType<DiagramParser['errors']['slice']>;
}

export function parse(tokens: IToken[]): ParseResult {
  parserInstance.input = tokens;
  const cst = parserInstance.program();
  return { cst, errors: parserInstance.errors };
}

export { parserInstance };