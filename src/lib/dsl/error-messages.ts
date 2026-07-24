import type { IRecognitionException } from 'chevrotain';

// Maps internal Chevrotain token type names to the actual DSL symbol a
// user would recognize, for readable error messages.
const TOKEN_LABELS: Record<string, string> = {
  Colon: "':'",
  Arrow: "'>'",
  DashArrow: "'-->'",
  LBracket: "'['",
  RBracket: "']'",
  Comma: "','",
  NewLine: 'end of line',
  FreeText: 'text',
  EOF: 'end of the diagram',
};

function labelFor(tokenTypeName: string | undefined): string {
  if (!tokenTypeName) return 'that token';
  return TOKEN_LABELS[tokenTypeName] ?? `'${tokenTypeName}'`;
}

// Chevrotain's own error messages reference internal grammar rule names
// and token classes, which mean nothing to someone writing the DSL.
// This maps each exception type to a plain-English message instead.
export function humanizeParseError(err: IRecognitionException): {
  message: string;
  line?: number;
} {
  const line = err.token?.startLine ?? undefined;
  const found = err.token?.tokenType?.name;

  switch (err.name) {
    case 'MismatchedTokenException':
      return {
        message: `Unexpected ${labelFor(found)} here — check the syntax on this line.`,
        line,
      };
    case 'NoViableAltException':
      return {
        message: `This line doesn't match a valid node, actor, edge, or message declaration.`,
        line,
      };
    case 'NotAllInputParsedException':
      return {
        message: `Unexpected text after a complete statement — check for a stray character.`,
        line,
      };
    case 'EarlyExitException':
      return {
        message: `Expected something here that's missing — check for an incomplete line.`,
        line,
      };
    default:
      return { message: err.message, line };
  }
}