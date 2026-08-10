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

export type DiagramKind = 'flowchart' | 'sequence';

export interface DslValidationResult {
  ok: boolean;
  kind: DiagramKind | null;
  errors: string[];
}

export const AI_AGENT_IDENTITY = `You are Architecta AI, an elite principal cloud & systems architect built into an enterprise diagram-as-code whiteboard app. You create highly professional, production-grade system design architecture diagrams, infrastructure topologies, and sequence diagrams. You are concise in your conversation (1-2 sentences) and always output a complete, beautifully structured diagram DSL — never partial code or fragments.`;

/** The exact grammar accepted by the Chevrotain parser (`src/lib/dsl/`). */
export const DSL_GRAMMAR_DOC = `## Diagram DSL grammar

The FIRST non-empty line declares the diagram type, exactly one of:
- flowchart        — boxes and directed edges (architecture / system topology / microservices)
- sequence-diagram — actors and messages (API / authentication / protocol flows)

Blank lines are fine. Lines starting with // are comments.

### Nodes (flowchart boxes / sequence-diagram actors)
Name
Name: Display label
Name: Display label [icon: icon-name, color: color-name]

### Edges (flowchart) / messages (sequence-diagram)
From > To            — synchronous call / request (solid arrow)
From > To: label     — labeled sync call (e.g. HTTPS GET /api/v1/user)
From --> To          — asynchronous / event / queue / fallback message (dashed arrow)
From --> To: label   — labeled async event (e.g. Publish user.created event)

### Attributes
- icon: Full access to system architecture and technology icon catalog:
  * AWS: aws-ec2, aws-s3, aws-rds, aws-lambda, aws-sqs, aws-sns, aws-dynamodb, aws-cloudfront, aws-route53, aws-api-gateway, aws-ecs, aws-eks, aws-elasticache, aws-iam, aws-vpc, aws-kinesis
  * GCP & Azure: gcp, gcp-run, gcp-functions, gcp-pubsub, gcp-bigquery, firebase, azure, azure-devops
  * Databases & Caches: redis, postgres, mysql, mongodb, elasticsearch, cassandra, sqlite, supabase, snowflake, neo4j, database
  * DevOps & Cloud: docker, kubernetes, nginx, terraform, ansible, helm, jenkins, github, gitlab, cloudflare, vercel, netlify, digitalocean
  * Streaming & Messaging: rabbitmq, kafka, graphql, grpc, swagger, socketio, queue
  * Monitoring & Security: prometheus, grafana, datadog, sentry, auth0, okta, vault, shield, lock
  * Tech Stacks: nodejs, python, go, rust, java, react, nextjs, typescript
  * Generic Architecture Vectors: server, database, cloud, cpu, router, shield, box, lock, world, user, devices
- color: choice of blue, green, red, amber, purple, rose, gray
- shape: choice of rectangle (default), circle, diamond, triangle, parallelogram, trapezoid, cylinder, capsule, hexagon, star
- multiple attributes are comma-separated inside brackets, e.g.: [icon: redis, color: amber] or [icon: postgres, color: rose]

### Professional Architecture Guidelines
1. Structure flowcharts into clear horizontal Left-to-Right (LR) architectural columns:
   - Far-Left Column (Client & Edge Tier, e.g. Web App, Mobile Client) → color: blue, icon: user / devices / cloudflare
   - Mid-Left Column (Gateway & Security Tier, e.g. AWS API Gateway, Auth0) → color: purple, icon: aws-api-gateway / auth0 / shield
   - Center Column (Microservices & Logic Tier, e.g. Auth Service, Order API) → color: green, icon: docker / kubernetes / nodejs / aws-lambda / server
   - Mid-Right Column (Cache & Messaging Tier, e.g. Redis Cache, Kafka Queue) → color: amber, icon: redis / kafka / rabbitmq / aws-sqs
   - Far-Right Column (Data & Persistence Tier, e.g. PostgreSQL, DynamoDB, S3) → color: rose, icon: postgres / aws-dynamodb / aws-s3 / database
2. ALWAYS assign specific technology icons (e.g. 'icon: aws-api-gateway', 'icon: redis', 'icon: postgres', 'icon: kafka', 'icon: docker', 'icon: user') to every node. Never generate generic slop boxes without icons.
3. Flow relationships horizontally from left-to-right (Clients → Gateways → Microservices → Caches/Queues → Databases).
4. Add informative, technical labels to edges (protocols, RPCs, HTTP methods, event topics).
5. For sequence diagrams, list actors in logical invocation order from left to right.`;

/** Tool-calling behavior rules shared by the generate + update tools. */
export const AGENT_BEHAVIOR_RULES = `## Behavior rules
- ALWAYS output the complete DSL through a tool call — the entire diagram, never a partial snippet or a diff.
- generateDiagram: create a brand-new, enterprise-grade architecture diagram replacing the canvas content.
- updateDiagram: precisely edit the diagram currently on the canvas, keeping existing node names, labels, attributes, and edges intact unless requested to modify.
- Always include rich icons, clean color-coding by architecture tier, and descriptive edge labels.`;

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
