import { createToken, Lexer, type IToken } from "chevrotain";

export const NewLine = createToken({ name: "NewLine", pattern: /\r?\n/ });

export const Comment = createToken({
   name: "Comment",
   pattern: /\/\/[^\n]*/,
   group: Lexer.SKIPPED,
});

export const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
export const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });

// Async/return arrow, e.g. "db --> api: results". Must be tried before
// Arrow and FreeText so "-->" isn't split across tokens.
export const DashArrow = createToken({ name: "DashArrow", pattern: /-->/ });
export const Arrow = createToken({ name: "Arrow", pattern: />/ });
export const Comma = createToken({ name: "Comma", pattern: /,/ });

// Same exclusions as before, but with a per-character negative lookahead
// so the greedy match stops right before it would consume the start of
// "-->" — that leaves "-->" intact for the DashArrow token to match,
// while ordinary single hyphens (e.g. "sequence-diagram") still work.
export const FreeText = createToken({
   name: "FreeText",
   pattern: /(?:(?!-->)[^[\]:>,\r\n])+/,
});
export const allTokens = [
   Comment,
   NewLine,
   LBracket,
   RBracket,
   Colon,
   DashArrow,
   Arrow,
   Comma,
   FreeText,
];

const diagramLexer = new Lexer(allTokens);

export interface TokenizeError {
   message: string;
   line?: number;
   column?: number;
}

export function tokenize(source: string): {
   tokens: IToken[];
   errors: TokenizeError[];
} {
   const result = diagramLexer.tokenize(source);
   const errors: TokenizeError[] = result.errors.map((e) => ({
      message: e.message,
      line: e.line,
      column: e.column,
   }));
   return { tokens: result.tokens, errors };
}
