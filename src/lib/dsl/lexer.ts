import { createToken, Lexer, type IToken } from 'chevrotain';

export const NewLine = createToken({ name: 'NewLine', pattern: /\r?\n/ });

// Full-line comments only: "// like this" at the start of a line.
export const Comment = createToken({
  name: 'Comment',
  pattern: /\/\/[^\n]*/,
  group: Lexer.SKIPPED,
});

export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Arrow = createToken({ name: 'Arrow', pattern: />/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });

// Matches node names, labels, and attr keys/values — anything that
// isn't a delimiter. Deliberately greedy so "API Gateway" is one token.
export const FreeText = createToken({
  name: 'FreeText',
  pattern: /[^[\]:>,\r\n]+/,
});

// Order matters: Chevrotain tries tokens in array order and takes the
// first match at each position, so Comment must precede FreeText.
export const allTokens = [
  Comment,
  NewLine,
  LBracket,
  RBracket,
  Colon,
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

export function tokenize(source: string): { tokens: IToken[]; errors: TokenizeError[] } {
  const result = diagramLexer.tokenize(source);
  const errors: TokenizeError[] = result.errors.map((e) => ({
    message: e.message,
    line: e.line,
    column: e.column,
  }));
  return { tokens: result.tokens, errors };
}