import { describe, expect, it } from 'vitest';
import {
  buildAgentSystemPrompt,
  extractDslFromText,
  findDiagramDslInSteps,
  validateDslSource,
  DSL_GRAMMAR_DOC,
  AI_AGENT_IDENTITY,
} from '@/lib/ai/agent-prompt';

describe('validateDslSource', () => {
  it('accepts a valid flowchart', () => {
    const result = validateDslSource('flowchart\n\nClient\nAPI Gateway\nDatabase\n\nClient > API Gateway: request\nAPI Gateway > Database: query');
    expect(result.ok).toBe(true);
    expect(result.kind).toBe('flowchart');
    expect(result.errors).toEqual([]);
  });

  it('accepts a valid sequence diagram', () => {
    const result = validateDslSource('sequence-diagram\n\nUser\nAuth Server\nDB\n\nUser > Auth Server: login\nAuth Server --> User: token');
    expect(result.ok).toBe(true);
    expect(result.kind).toBe('sequence');
    expect(result.errors).toEqual([]);
  });

  it('rejects an empty source', () => {
    const result = validateDslSource('   ');
    expect(result.ok).toBe(false);
    expect(result.kind).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects an unknown diagram type', () => {
    const result = validateDslSource('barchart\nA > B');
    expect(result.ok).toBe(false);
    expect(result.kind).toBeNull();
  });

  it('rejects a syntax error', () => {
    const result = validateDslSource('flowchart\nA > B: label: extra');
    expect(result.ok).toBe(false);
  });

  it('auto-declares nodes that appear only in edges', () => {
    // The grammar auto-declares edge endpoints, so this must be valid.
    const result = validateDslSource('flowchart\nA\n\nA > Missing: ping');
    expect(result.ok).toBe(true);
    expect(result.kind).toBe('flowchart');
  });

  it('treats an unknown icon as a non-blocking warning', () => {
    const result = validateDslSource('flowchart\nServer [icon: not-a-real-icon]');
    expect(result.ok).toBe(true);
    expect(result.kind).toBe('flowchart');
  });
});

describe('extractDslFromText', () => {
  it('extracts a fenced dsl block', () => {
    const text = 'Here is your diagram:\n\n```dsl\nflowchart\nA > B\n```\n\nLet me know if you want changes.';
    expect(extractDslFromText(text)).toBe('flowchart\nA > B');
  });

  it('extracts a fenced block with a flowchart language tag', () => {
    const text = '```flowchart\nA > B\n```';
    expect(extractDslFromText(text)).toBe('A > B');
  });

  it('treats text that starts with a diagram type as DSL', () => {
    expect(extractDslFromText('sequence-diagram\nUser > Server: hello')).toBe(
      'sequence-diagram\nUser > Server: hello'
    );
  });

  it('returns undefined when there is no DSL', () => {
    expect(extractDslFromText('Just a friendly chat message.')).toBeUndefined();
  });

  it('returns undefined for an empty fenced block', () => {
    expect(extractDslFromText('```dsl\n```')).toBeUndefined();
  });

  it('accepts a foreign fence tag when the content starts with a diagram type', () => {
    expect(extractDslFromText('```text\nflowchart\nA > B\n```')).toBe('flowchart\nA > B');
  });

  it('rejects a foreign fence tag whose content is not DSL', () => {
    expect(extractDslFromText('```text\nconst x = 1;\n```')).toBeUndefined();
  });
});

describe('findDiagramDslInSteps', () => {
  it('returns the DSL from the most recent diagram tool call', () => {
    const steps = [
      { toolCalls: [{ toolName: 'updateDiagram', input: { dsl: 'flowchart\nA > B', changeSummary: 'x' } }] },
      { toolCalls: [{ toolName: 'updateDiagram', input: { dsl: 'flowchart\nA > B > C', changeSummary: 'fixed' } }] },
    ];
    expect(findDiagramDslInSteps(steps)).toBe('flowchart\nA > B > C');
  });

  it('ignores non-diagram tool calls', () => {
    const steps = [{ toolCalls: [{ toolName: 'someOtherTool', input: { dsl: 'nope' } }] }];
    expect(findDiagramDslInSteps(steps)).toBeUndefined();
  });

  it('returns undefined when no diagram tool carries DSL', () => {
    const steps = [{ toolCalls: [{ toolName: 'generateDiagram', input: { title: 't' } }] }];
    expect(findDiagramDslInSteps(steps)).toBeUndefined();
  });

  it('handles empty steps', () => {
    expect(findDiagramDslInSteps([])).toBeUndefined();
  });
});

describe('buildAgentSystemPrompt', () => {
  it('embeds the current canvas DSL when provided', () => {
    const prompt = buildAgentSystemPrompt({ canvasDsl: 'flowchart\nA > B' });
    expect(prompt).toContain('flowchart\nA > B');
    expect(prompt).toContain('updateDiagram');
  });

  it('mentions an empty canvas when no DSL is provided', () => {
    const prompt = buildAgentSystemPrompt({});
    expect(prompt).toContain('canvas is currently empty');
    expect(prompt).toContain('generateDiagram');
  });

  it('includes the grammar and identity sections', () => {
    const prompt = buildAgentSystemPrompt({});
    expect(prompt).toContain(AI_AGENT_IDENTITY);
    expect(prompt).toContain(DSL_GRAMMAR_DOC);
  });
});
