import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree, StringStream } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import {
  dslHighlightExtension,
  dslHighlightStyle,
  dslLanguage,
  dslStreamParser,
} from '@/lib/dsl/codemirror-language';

// DslState is not exported; derive its shape from startState().
type DslState = ReturnType<NonNullable<typeof dslStreamParser.startState>>;

function freshState(overrides: Partial<DslState> = {}): DslState {
  return { afterDiagramType: false, ...overrides };
}

// Tokenize one line by invoking the parser's token() repeatedly, exactly the
// way StreamLanguage drives it (once per line, until end-of-line). The guard
// protects against zero-width tokens looping forever.
function tokenizeLine(line: string, state: DslState = freshState()): (string | null)[] {
  const stream = new StringStream(line, 2, 2);
  const styles: (string | null)[] = [];
  let guard = 0;
  do {
    styles.push(dslStreamParser.token(stream, state));
    guard += 1;
  } while (!stream.eol() && guard < 100);
  return styles;
}

describe('dslStreamParser', () => {
  it('starts with afterDiagramType false', () => {
    expect(dslStreamParser.startState?.(2)).toEqual({ afterDiagramType: false });
  });

  it('tags the diagram type keyword on the first line', () => {
    expect(tokenizeLine('flowchart')).toEqual(['keyword']);
  });

  it('accepts sequence-diagram as a keyword too', () => {
    expect(tokenizeLine('sequence-diagram')).toEqual(['keyword']);
  });

  it('trims leading whitespace before detecting the diagram type', () => {
    expect(tokenizeLine('  flowchart')).toEqual(['keyword']);
  });

  it('marks an unknown first word as invalid', () => {
    expect(tokenizeLine('banana')).toEqual(['invalid']);
  });

  it('tags comments and skips to end of line', () => {
    expect(tokenizeLine('// this is a note')).toEqual(['comment']);
    expect(tokenizeLine('  // indented comment')).toEqual(['comment']);
  });

  it('tags brackets and punctuation', () => {
    expect(tokenizeLine('[')).toEqual(['bracket']);
    expect(tokenizeLine(']')).toEqual(['bracket']);
    expect(tokenizeLine(':')).toEqual(['punctuation']);
    expect(tokenizeLine(',')).toEqual(['punctuation']);
  });

  it('tags the arrow operator', () => {
    expect(tokenizeLine('>')).toEqual(['operator']);
  });

  it('tags words after the diagram type as variable names', () => {
    expect(tokenizeLine('Title', freshState({ afterDiagramType: true }))).toEqual([
      'variableName',
    ]);
  });

  it('tags a word followed by a colon as a string label', () => {
    expect(tokenizeLine('title: x', freshState({ afterDiagramType: true }))).toEqual([
      'string',
      'punctuation',
      null,
      'variableName',
    ]);
  });

  it('keeps attribute keys on bracket lines as variable names', () => {
    expect(tokenizeLine('[node] fill: red', freshState({ afterDiagramType: true }))).toEqual([
      'bracket',
      'variableName',
      'bracket',
      null,
      'variableName',
      'punctuation',
      null,
      'variableName',
    ]);
  });

  it('splits an edge arrow into a variable name and the operator', () => {
    expect(tokenizeLine('A -> B', freshState({ afterDiagramType: true }))).toEqual([
      'variableName',
      'operator',
      null,
      'variableName',
    ]);
  });

  it('keeps the afterDiagramType flag set for subsequent lines', () => {
    const state = freshState();
    expect(tokenizeLine('flowchart', state)).toEqual(['keyword']);
    expect(state.afterDiagramType).toBe(true);
    expect(tokenizeLine('A -> B', state)).toEqual([
      'variableName',
      'operator',
      null,
      'variableName',
    ]);
  });
});

describe('dslLanguage (StreamLanguage integration)', () => {
  // Parse a doc with the real dslLanguage extension and collect the Lezer
  // node names that StreamLanguage generated from the stream parser's tags.
  function nodeNames(source: string): string[] {
    const state = EditorState.create({ doc: source, extensions: [dslLanguage] });
    const tree = ensureSyntaxTree(state, state.doc.length);
    if (!tree) return [];
    const names: string[] = [];
    tree.iterate({
      enter: (node) => {
        names.push(node.name);
      },
    });
    return names;
  }

  it('maps the keyword token to a keyword node', () => {
    expect(nodeNames('flowchart')).toContain('keyword');
  });

  it('produces comment, variableName, and operator nodes', () => {
    const names = nodeNames('flowchart\n// note\nA -> B');
    expect(names).toContain('comment');
    expect(names).toContain('variableName');
    expect(names).toContain('operator');
  });

  it('produces string and punctuation nodes for labels', () => {
    const names = nodeNames('flowchart\ntitle: hello');
    expect(names).toContain('string');
    expect(names).toContain('punctuation');
  });

  it('installs alongside the highlight extension', () => {
    const state = EditorState.create({
      doc: 'flowchart',
      extensions: [dslLanguage, dslHighlightExtension],
    });
    expect(state.doc.toString()).toBe('flowchart');
  });
});

describe('dslHighlightStyle', () => {
  it('registers a style spec for every token kind', () => {
    const tags = dslHighlightStyle.specs.map((spec) => spec.tag);
    expect(tags).toEqual(
      expect.arrayContaining([
        t.keyword,
        t.comment,
        t.bracket,
        t.operator,
        t.punctuation,
        t.string,
        t.variableName,
        t.invalid,
      ])
    );
  });
});
