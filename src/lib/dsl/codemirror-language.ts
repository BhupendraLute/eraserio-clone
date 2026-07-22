import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { StreamParser } from '@codemirror/language';

interface DslState {
  afterDiagramType: boolean; // true once we've consumed the first non-blank line
}

const DIAGRAM_TYPES = new Set(['flowchart', 'sequence-diagram']);

// A hand-rolled StreamParser is enough here — no need for a full Lezer
// grammar just to color tokens. It reads one "word" at a time per line
// and classifies it based on position and surrounding punctuation.
export const dslStreamParser: StreamParser<DslState> = {
  startState(): DslState {
    return { afterDiagramType: false };
  },

  token(stream, state) {
    if (stream.sol()) {
      stream.eatSpace();
    }

    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }

    if (stream.eat('[')) return 'bracket';
    if (stream.eat(']')) return 'bracket';
    if (stream.eat(':')) return 'punctuation';
    if (stream.eat(',')) return 'punctuation';

    if (stream.match('>')) return 'operator';

    if (stream.eatSpace()) return null;

    // First real token in the file is the diagram type keyword.
    if (!state.afterDiagramType) {
      stream.match(/[^\n]+/);
      state.afterDiagramType = true;
      return DIAGRAM_TYPES.has(stream.current().trim().toLowerCase())
        ? 'keyword'
        : 'invalid';
    }

    // Everything else: consume up to the next delimiter as a "word"
    // (node name, label, or attr key/value — the parser disambiguates
    // by position, so for highlighting we just treat it as an identifier
    // unless it looks like an attribute key right before a colon).
    if (stream.match(/[^[\]:>,\n]+/)) {
      const text = stream.current();
      const rest = stream.string.slice(stream.pos);
      if (/^\s*:/.test(rest) && stream.string.trimStart().startsWith('[') === false) {
        return 'string'; // edge label following a colon context is rare to detect pre-hoc; default identifier
      }
      return 'variableName';
    }

    stream.next();
    return null;
  },
};

export const dslLanguage = StreamLanguage.define(dslStreamParser);

export const dslHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--color-blue-500, #3b82f6)', fontWeight: 'bold' },
  { tag: t.comment, color: 'var(--color-muted-foreground, #6b7280)', fontStyle: 'italic' },
  { tag: t.bracket, color: 'var(--color-amber-500, #f59e0b)' },
  { tag: t.operator, color: 'var(--color-rose-500, #f43f5e)', fontWeight: 'bold' },
  { tag: t.punctuation, color: 'var(--color-muted-foreground, #6b7280)' },
  { tag: t.string, color: 'var(--color-emerald-500, #10b981)' },
  { tag: t.variableName, color: 'inherit' },
  { tag: t.invalid, color: 'var(--color-destructive, #ef4444)', textDecoration: 'underline wavy' },
]);

export const dslHighlightExtension = syntaxHighlighting(dslHighlightStyle);