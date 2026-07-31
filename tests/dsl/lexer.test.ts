import { describe, expect, it } from 'vitest';
import { tokenize, NewLine, FreeText, DashArrow } from '@/lib/dsl/lexer';

// The Chevrotain lexer appends an EOF token; it is noise for token
// assertions, so filter it out up front.
//
// NOTE: `//` comments are only tokenized at the start of a line. Because
// FreeText is greedy (spaces and slashes are valid FreeText characters),
// text after `//` mid-line is swallowed into the FreeText token instead.
function visibleTokens(source: string) {
  const { tokens } = tokenize(source);
  return tokens.filter((t) => t.tokenType.name !== 'EOF');
}

describe('tokenize', () => {
  it('produces no lexing errors for typical input', () => {
    const { errors } = tokenize('flowchart\nA --> B\n');
    expect(errors).toHaveLength(0);
  });

  it('returns no tokens and no errors for empty input', () => {
    const { errors } = tokenize('');
    expect(visibleTokens('')).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('tokenizes the diagram type line as a single FreeText', () => {
    const tokens = visibleTokens('flowchart');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenType).toBe(FreeText);
    expect(tokens[0].image).toBe('flowchart');
  });

  it('keeps hyphens inside words as FreeText (sequence-diagram)', () => {
    const tokens = visibleTokens('sequence-diagram');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].image).toBe('sequence-diagram');
  });

  it('emits a NewLine token per line break', () => {
    const tokens = visibleTokens('flowchart\nA');
    expect(tokens.filter((t) => t.tokenType === NewLine)).toHaveLength(1);
  });

  it('skips // comments entirely', () => {
    const tokens = visibleTokens('// header comment\nflowchart');
    expect(tokens.some((t) => t.image.startsWith('//'))).toBe(false);
    expect(tokens.map((t) => t.tokenType.name)).toEqual(['NewLine', 'FreeText']);
    expect(tokens[1].image).toBe('flowchart');
  });

  it('emits a single DashArrow token for -->', () => {
    const tokens = visibleTokens('A --> B');
    const dashes = tokens.filter((t) => t.tokenType === DashArrow);
    expect(dashes).toHaveLength(1);
    expect(dashes[0].image).toBe('-->');
  });

  it('stops FreeText right before --> so the arrow stays intact', () => {
    const tokens = visibleTokens('a-->b');
    expect(tokens.map((t) => t.tokenType.name)).toEqual([
      'FreeText',
      'DashArrow',
      'FreeText',
    ]);
    expect(tokens[0].image).toBe('a');
    expect(tokens[2].image).toBe('b');
  });

  it('does not treat a lone hyphen as an arrow', () => {
    const tokens = visibleTokens('a-b');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].image).toBe('a-b');
  });

  it('recognizes Arrow, Colon, brackets and Comma tokens', () => {
    const tokens = visibleTokens('a > b [x: y, z]');
    const names = tokens.map((t) => t.tokenType.name);
    expect(names).toContain('Arrow');
    expect(names).toContain('Colon');
    expect(names).toContain('LBracket');
    expect(names).toContain('RBracket');
    expect(names).toContain('Comma');
  });
});
