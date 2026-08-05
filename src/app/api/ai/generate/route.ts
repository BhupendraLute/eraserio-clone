import { NextRequest, NextResponse } from 'next/server';
import { streamText, tool, zodSchema, isStepCount, type ToolSet } from 'ai';
import { z } from 'zod';
import { aiChatSchema } from '@/lib/api-validation';
import { AI_BASE_URL, AI_MODEL, AI_PROVIDER_NAME, getAiModel, isAiConfigured } from '@/lib/ai/provider';
import { AI_RATE_LIMIT_MAX, aiRateLimiter } from '@/lib/ai/rate-limit';
import { getUserId } from '@/lib/auth/session';
import {
  buildAgentSystemPrompt,
  extractDslFromText,
  findDiagramDslInSteps,
  validateDslSource,
} from '@/lib/ai/agent-prompt';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/** Safety cap for the agentic tool-calling loop (validate → fix → answer). */
const MAX_TOOL_STEPS = 5;

/**
 * The agent's tools. Both accept the COMPLETE DSL and return a validation
 * report to the model, so a malformed diagram can be corrected in a follow-up
 * step before the response is finalized.
 */
const diagramTools: ToolSet = {
  generateDiagram: tool({
    description:
      'Create a brand-new diagram, replacing whatever is currently on the canvas. ' +
      'Call this when the user asks for a new diagram or when the canvas is empty.',
    inputSchema: zodSchema(
      z.object({
        title: z.string().optional().describe('Short title describing the diagram'),
        dsl: z
          .string()
          .describe(
            'The complete DSL source for the new diagram, starting with "flowchart" or "sequence-diagram".'
          ),
      })
    ),
    execute: async ({ dsl }) => validateDslSource(dsl),
  }),
  updateDiagram: tool({
    description:
      'Precisely update the diagram currently on the canvas. Provide the COMPLETE updated ' +
      'DSL (all existing nodes/edges plus the requested change).',
    inputSchema: zodSchema(
      z.object({
        changeSummary: z.string().describe('One-line summary of what changed and why'),
        dsl: z
          .string()
          .describe(
            'The complete updated DSL source, preserving everything the user did not ask to change.'
          ),
      })
    ),
    execute: async ({ dsl }) => validateDslSource(dsl),
  }),
};

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    return msg.length > 300 ? `${msg.slice(0, 300)}…` : msg;
  }
  return String(err);
}

/** Public config so the client can render the online/offline status badge. */
export async function GET() {
  const authenticated = Boolean(await getUserId());
  return NextResponse.json({
    authenticated,
    configured: isAiConfigured(),
    model: AI_MODEL,
    provider: AI_PROVIDER_NAME,
    baseUrl: AI_BASE_URL,
  });
}

export async function POST(req: NextRequest) {
  // Auth gate: AI generation is a signed-in feature (it costs API tokens).
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'You must be signed in to use Architecta AI. Sign in and try again.' },
      { status: 401 }
    );
  }

  // Simple per-user rate limit so the API key can't be burned by a single
  // session. Counts every POST (valid or not) before reading the body.
  const rate = aiRateLimiter(userId);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many AI requests. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = aiChatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      {
        error:
          'Architecta AI is not configured. Set AI_API_KEY (or OPENCODE_ZEN_API_KEY) in your environment and restart the dev server.',
      },
      { status: 503 }
    );
  }

  const { messages, canvasDsl } = parsed.data;
  const system = buildAgentSystemPrompt({ canvasDsl });
  const modelMessages = messages.map((m) => ({ role: m.role, content: m.content }));

  const encoder = new TextEncoder();

  // Flipped by `cancel()` when the client disconnects mid-stream so we stop
  // writing; the model call itself is aborted via `req.signal`.
  let cancelled = false;

  // Newline-delimited JSON stream. Events:
  //   { type: 'text', text }      — assistant text delta
  //   { type: 'dsl', dsl, diagramKind, valid, errors } — final structured payload
  //   { type: 'error', message }  — terminal failure
  //   { type: 'done' }            — end of stream
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
        } catch {
          cancelled = true;
        }
      };

      let sentChunks = 0;

      const emitResult = async (result: Awaited<ReturnType<typeof streamText>>, withTools: boolean) => {
        for await (const delta of result.textStream) {
          sentChunks++;
          send({ type: 'text', text: delta });
        }

        const finalText = await result.text;

        let dsl: string | undefined;
        if (withTools) {
          const steps = await result.steps;
          dsl = findDiagramDslInSteps(steps);
        }
        if (!dsl) dsl = extractDslFromText(finalText);

        if (dsl) {
          const validation = validateDslSource(dsl);
          send({
            type: 'dsl',
            dsl,
            diagramKind: validation.kind,
            valid: validation.ok,
            errors: validation.errors,
          });
        }

        send({ type: 'done' });
      };

      try {
        // Attempt 1: agentic tool calling. If the model/provider rejects tools
        // before producing any output, retry once without tools and rely on a
        // fenced DSL code block in the response instead.
        try {
          const result = await streamText({
            model: getAiModel(),
            instructions: system,
            messages: modelMessages,
            tools: diagramTools,
            stopWhen: isStepCount(MAX_TOOL_STEPS),
            abortSignal: req.signal,
          });
          await emitResult(result, true);
          return;
        } catch (err) {
          // User clicked Stop — propagate without the no-tools retry.
          if (req.signal.aborted || cancelled) throw err;
          if (sentChunks > 0) throw err;
        }

        const result = await streamText({
          model: getAiModel(),
          instructions: system,
          messages: modelMessages,
          abortSignal: req.signal,
        });
        await emitResult(result, false);
      } catch (err) {
        // An intentional Stop is not a failure — don't log an error trace.
        if (!req.signal.aborted && !cancelled) {
          console.error('[ai/generate] generation failed:', err);
        }
        send({ type: 'error', message: toErrorMessage(err) });
        send({ type: 'done' });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      // Client went away — stop writing; req.signal aborts the model call.
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'X-RateLimit-Limit': String(AI_RATE_LIMIT_MAX),
      'X-RateLimit-Remaining': String(rate.remaining),
    },
  });
}
