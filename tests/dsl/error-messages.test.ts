import { describe, expect, it } from 'vitest';
import { humanizeParseError } from '@/lib/dsl/error-messages';
import type { IRecognitionException } from 'chevrotain';

interface FakeToken {
  startLine?: number;
  tokenType?: { name?: string };
}

// Minimal stand-ins for Chevrotain's exception objects — only the fields
// humanizeParseError reads are populated.
function fakeError(
  name: string,
  token?: FakeToken,
  message = 'raw chevrotain message'
): IRecognitionException {
  return { name, message, token } as unknown as IRecognitionException;
}

describe('humanizeParseError', () => {
  it('maps a MismatchedTokenException with a Colon token', () => {
    const result = humanizeParseError(
      fakeError('MismatchedTokenException', {
        startLine: 4,
        tokenType: { name: 'Colon' },
      })
    );
    expect(result).toEqual({
      message: "Unexpected ':' here — check the syntax on this line.",
      line: 4,
    });
  });

  it('maps every DSL token type name to a readable label', () => {
    const cases: Array<[string, string]> = [
      ['Arrow', "'>'"],
      ['DashArrow', "'-->'"],
      ['LBracket', "'['"],
      ['RBracket', "']'"],
      ['Comma', "','"],
      ['NewLine', 'end of line'],
      ['FreeText', 'text'],
      ['EOF', 'end of the diagram'],
    ];
    for (const [tokenName, label] of cases) {
      const result = humanizeParseError(
        fakeError('MismatchedTokenException', { tokenType: { name: tokenName } })
      );
      expect(result.message).toBe(
        `Unexpected ${label} here — check the syntax on this line.`
      );
    }
  });

  it('falls back to the raw token type name when unknown', () => {
    const result = humanizeParseError(
      fakeError('MismatchedTokenException', { tokenType: { name: 'WeirdToken' } })
    );
    expect(result.message).toBe(
      "Unexpected 'WeirdToken' here — check the syntax on this line."
    );
  });

  it('uses "that token" when no token is available', () => {
    const result = humanizeParseError(fakeError('MismatchedTokenException'));
    expect(result.message).toBe(
      'Unexpected that token here — check the syntax on this line.'
    );
    expect(result.line).toBeUndefined();
  });

  it('has a fixed message for NoViableAltException', () => {
    const result = humanizeParseError(fakeError('NoViableAltException'));
    expect(result.message).toBe(
      "This line doesn't match a valid node, actor, edge, or message declaration."
    );
  });

  it('has a fixed message for NotAllInputParsedException', () => {
    const result = humanizeParseError(fakeError('NotAllInputParsedException'));
    expect(result.message).toBe(
      'Unexpected text after a complete statement — check for a stray character.'
    );
  });

  it('has a fixed message for EarlyExitException', () => {
    const result = humanizeParseError(fakeError('EarlyExitException'));
    expect(result.message).toBe(
      "Expected something here that's missing — check for an incomplete line."
    );
  });

  it('passes through the raw message for unrecognized exceptions', () => {
    const result = humanizeParseError(
      fakeError('SomeOtherException', { startLine: 7 })
    );
    expect(result).toEqual({ message: 'raw chevrotain message', line: 7 });
  });
});
