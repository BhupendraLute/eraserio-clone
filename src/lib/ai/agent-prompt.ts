/**
 * Architecta AI — agent prompt & DSL tooling.
 *
 * Pure TypeScript (no React, no DOM, no AI SDK imports) so it can be unit
 * tested in Node and safely imported by the `/api/ai/generate` route.
 * It owns:
 *  - the DSL grammar documentation injected into the model's system prompt,
 *  - the system prompt builder (with the active canvas DSL as context),
 *  - server-side DSL validation + DSL extraction helpers used to turn the
 *    model's output into something the canvas can render.
 */
import { tokenize } from '@/lib/dsl/lexer';
import { parse } from '@/lib/dsl/parser';
import { cstToAst } from '@/lib/dsl/ast';
import { validate } from '@/lib/dsl/validator';
import { ICON_NAMES } from '@/lib/render/node-style';

export type DiagramKind = 'flowchart' | 'sequence';

export interface DslValidationResult {
  ok: boolean;
  kind: DiagramKind | null;
  errors: string[];
}

/** Model identity + tone. Kept separate so tests can assert on it cheaply. */
export const AI_AGENT_IDENTITY = `You are Architecta AI, an expert diagram assistant built into a
diagram-as-code whiteboard app. You help users generate and edit architecture
diagrams, flowcharts, and sequence diagrams. You are concise (a few sentences
per turn) and always produce the COMPLETE diagram in the app's DSL — never a
diff, never a fragment.`;

/** The exact grammar accepted by the Chevrotain parser (`src/lib/dsl/`). */
export const DSL_GRAMMAR_DOC = `## Diagram DSL grammar

The FIRST non-empty line declares the diagram type, exactly one of:
- flowchart        — boxes and directed edges (architecture / process / topology)
- sequence-diagram — actors and messages (interaction / API flows)

Blank lines are fine. Lines starting with // are comments.

### Nodes (flowchart boxes / sequence-diagram actors)
Name
Name: Display label
Name: Display label [icon: icon-name, color: color-name]

### Edges (flowchart) / messages (sequence-diagram)
From > To            — synchronous call (solid arrow)
From > To: label     — labeled sync call
From --> To          — asynchronous / return message (dashed arrow)
From --> To: label   — labeled async message

### Attributes
- icon: one of ${ICON_NAMES.join(', ')}
- color: one of blue, green, red, amber, purple, gray
- multiple attributes are comma-separated inside the brackets.

### Rules
- Node names and labels must NOT contain any of: : > [ ] ,
- Node names must be unique.
- Every edge must connect declared nodes; a node that only appears as an edge
  endpoint is auto-declared, but declare it explicitly when it needs a label
  or attributes.
- Flowchart nodes are laid out in declaration order (top-to-bottom).
- For sequence diagrams, the FIRST actor declared is the leftmost participant.`;

/** Tool-calling behavior rules shared by the generate + update tools. */
export const AGENT_BEHAVIOR_RULES = `## Behavior rules
- ALWAYS output the complete DSL through a tool call — the entire diagram,
  never a partial snippet or a diff.
- generateDiagram: create a brand-new diagram, replacing the canvas content.
- updateDiagram: precisely edit the diagram currently on the canvas. Preserve
  every node name, label, attribute, and edge the user did not ask to change.
  If you rename a node, update every edge that references it.
- When converting a diagram to another type, rewrite the entire diagram in the
  new type, keeping semantically equivalent components.
- The DSL you provide is validated automatically. If validation errors are
  returned to you, fix the DSL and call the tool again with corrected code.
- Choose sensible icons and colors; don't over-decorate. Keep labels short,
  precise, and technical.`;

/**
 * Builds the full system prompt for a generation turn, embedding the current
 * canvas DSL so the model can make context-aware edits.
 */
export function buildAgentSystemPrompt(options: { canvasDsl?: string }): string {
  const { canvasDsl } = options;
  const hasCanvas = typeof canvasDsl === 'string' && canvasDsl.trim().length > 0;

  const canvasSection = hasCanvas
    ? `## Current diagram on the canvas\n\nThe canvas currently contains this diagram (DSL source). Use the updateDiagram tool to modify it, preserving every node, label, attribute, and edge the user did not ask to change:\n\n\`\`\`dsl\n${canvasDsl}\n\`\`\``
    : '## Current canvas state\n\nThe canvas is currently empty. Use the generateDiagram tool to create a new diagram.';

  return [AI_AGENT_IDENTITY, DSL_GRAMMAR_DOC, AGENT_BEHAVIOR_RULES, canvasSection].join('\n\n');
}

/**
 * Parses + validates a DSL source without running the (heavier) layout engine.
 * Mirrors the worker pipeline's error semantics so generated code behaves the
 * same as hand-written code.
 */
export function validateDslSource(source: string): DslValidationResult {
  const trimmed = source.trim();
  if (!trimmed) {
    return { ok: false, kind: null, errors: ['Diagram source is empty.'] };
  }

  const lexResult = tokenize(trimmed);
  if (lexResult.errors.length > 0) {
    return {
      ok: false,
      kind: null,
      errors: lexResult.errors.map((e) => e.message),
    };
  }

  const parseResult = parse(lexResult.tokens);
  if (parseResult.errors.length > 0) {
    return { ok: false, kind: null, errors: ['Diagram has a syntax error.'] };
  }

  const ast = cstToAst(parseResult.cst);
  const diagnostics = validate(ast);
  const blocking = diagnostics.filter((e) => e.severity === 'error');
  const kind: DiagramKind | null =
    ast.type === 'sequence-diagram' ? 'sequence' : ast.type === 'flowchart' ? 'flowchart' : null;

  return {
    ok: blocking.length === 0 && kind !== null,
    kind,
    errors: blocking.map((e) => e.message),
  };
}

function isDiagramTypeLine(line: string | undefined): boolean {
  return line === 'flowchart' || line === 'sequence-diagram';
}

/**
 * Extracts a DSL source from free-form model text. Tries a fenced code block
 * first (```dsl / ```flowchart / ```sequence-diagram — or any other tag whose
 * content starts with a diagram type, e.g. ```text), then falls back to a
 * response whose very first line is already a diagram type declaration.
 * Used when the model answers without (or fails to) call a tool.
 */
export function extractDslFromText(text: string): string | undefined {
  const fenced = /```([a-zA-Z0-9_-]*)\s*\r?\n([\s\S]*?)(?:```|$)/i.exec(text);
  if (fenced) {
    const tag = (fenced[1] ?? '').trim().toLowerCase();
    const dsl = fenced[2].trim();
    if (dsl) {
      // Known DSL tags are trusted; for any other tag, only accept the block
      // when it actually starts with a diagram type declaration.
      const knownTag = tag === 'dsl' || tag === 'flowchart' || tag === 'sequence-diagram';
      if (knownTag || isDiagramTypeLine(dsl.split('\n')[0]?.trim().toLowerCase())) {
        return dsl;
      }
    }
  }

  if (isDiagramTypeLine(text.trimStart().split('\n')[0]?.trim().toLowerCase())) {
    return text.trim();
  }

  return undefined;
}

/**
 * A structural view of a generation step that only exposes the fields the
 * diagram DSL extractor needs (keeps the route decoupled from the AI SDK).
 */
export interface DiagramToolStep {
  toolCalls: Array<{ toolName: string; input: unknown }>;
}

/**
 * Returns the DSL from the most recent diagram tool call across all steps.
 * The agent may call a tool several times while fixing validation errors, so
 * we scan backwards and take the last generate/update call that carried DSL.
 */
export function findDiagramDslInSteps(steps: DiagramToolStep[]): string | undefined {
  for (let i = steps.length - 1; i >= 0; i--) {
    const toolCalls = steps[i]?.toolCalls ?? [];
    for (let j = toolCalls.length - 1; j >= 0; j--) {
      const call = toolCalls[j];
      if (call?.toolName !== 'generateDiagram' && call?.toolName !== 'updateDiagram') continue;
      const input = call.input as { dsl?: unknown };
      if (typeof input?.dsl === 'string' && input.dsl.trim()) {
        return input.dsl;
      }
    }
  }
  return undefined;
}
