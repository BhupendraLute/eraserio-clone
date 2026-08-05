import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiChatStore } from '@/lib/store/ai-chat-store';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { useDiagramRegistry } from '@/lib/store/diagram-registry';
import { useWorkspaceStore } from '@/lib/store/workspace-store';

/** A 200 response whose body emits each line as its own NDJSON chunk. */
function ndjsonResponse(lines: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const line of lines) controller.enqueue(encoder.encode(`${line}\n`));
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

/** A 200 response whose body emits raw byte chunks verbatim. */
function chunkedResponse(chunks: Uint8Array[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

const fetchMock = vi.fn();

function sentRequestBody(): {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  canvasDsl: string;
} {
  const init = fetchMock.mock.calls[0]?.[1];
  if (!init) throw new Error('sendMessage did not call fetch');
  return JSON.parse(String(init.body));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  useAiChatStore.setState({
    messages: [],
    isGenerating: false,
    isConfigured: true,
    authenticated: true,
    model: 'big-pickle',
  });
  // Isolate the stores applyDslToCanvas/refreshConfig tests touch.
  useDiagramStore.setState({ nodeOverrides: {} });
  useDiagramRegistry.setState({ diagrams: {}, order: [], activeDiagramId: null });
  useWorkspaceStore.setState({ activeTab: 'whiteboard', diagramCodeOpen: false });
});

describe('useAiChatStore.sendMessage — streaming', () => {
  it('appends the user message and streams assistant text + DSL', async () => {
    fetchMock.mockResolvedValueOnce(
      ndjsonResponse([
        '{"type":"text","text":"Here is your "}',
        '{"type":"text","text":"diagram:"}',
        '{"type":"dsl","dsl":"flowchart\\nA > B","diagramKind":"flowchart","valid":true,"errors":[]}',
        '{"type":"done"}',
      ])
    );

    await useAiChatStore.getState().sendMessage('make a diagram');

    const { messages, isGenerating } = useAiChatStore.getState();
    expect(messages[0]).toMatchObject({ role: 'user', content: 'make a diagram' });

    const assistant = messages[1];
    expect(assistant.role).toBe('assistant');
    expect(assistant.content).toBe('Here is your diagram:');
    expect(assistant.dsl).toBe('flowchart\nA > B');
    expect(assistant.diagramKind).toBe('flowchart');
    expect(assistant.dslValid).toBe(true);
    expect(assistant.dslErrors).toEqual([]);
    expect(assistant.error).toBeUndefined();
    expect(isGenerating).toBe(false);
  });

  it('accumulates NDJSON lines that are split across network chunks', async () => {
    const encoder = new TextEncoder();
    fetchMock.mockResolvedValueOnce(
      chunkedResponse([
        encoder.encode('{"type":"text","text":"Hello '), // half a line…
        encoder.encode('world"}\n{"type":"text","text":"!"}\n'), // …completes line 1 + a full line
      ])
    );

    await useAiChatStore.getState().sendMessage('hi');

    expect(useAiChatStore.getState().messages[1].content).toBe('Hello world!');
  });

  it('decodes multi-byte UTF-8 that is split across chunks', async () => {
    const line = '{"type":"text","text":"café ☕"}\n';
    const bytes = new TextEncoder().encode(line);
    // Every character before 'é' is ASCII, so char index === byte index.
    const splitAt = line.indexOf('é');
    const chunk1 = bytes.slice(0, splitAt);
    const chunk2 = bytes.slice(splitAt);

    fetchMock.mockResolvedValueOnce(chunkedResponse([chunk1, chunk2]));

    await useAiChatStore.getState().sendMessage('hi');

    expect(useAiChatStore.getState().messages[1].content).toBe('café ☕');
  });

  it('flushes a final NDJSON line that has no trailing newline', async () => {
    const line =
      '{"type":"dsl","dsl":"flowchart\\nA > B","diagramKind":"flowchart","valid":true,"errors":[]}';
    fetchMock.mockResolvedValueOnce(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(line)); // no trailing \n
            controller.close();
          },
        }),
        { status: 200 }
      )
    );

    await useAiChatStore.getState().sendMessage('hi');

    expect(useAiChatStore.getState().messages[1].dsl).toBe('flowchart\nA > B');
  });

  it('attaches validation errors when the DSL payload is invalid', async () => {
    fetchMock.mockResolvedValueOnce(
      ndjsonResponse([
        '{"type":"dsl","dsl":"flowchart\\nA >","diagramKind":null,"valid":false,"errors":["Diagram has a syntax error."]}',
      ])
    );

    await useAiChatStore.getState().sendMessage('hi');

    const assistant = useAiChatStore.getState().messages[1];
    expect(assistant.dsl).toBe('flowchart\nA >');
    expect(assistant.dslValid).toBe(false);
    expect(assistant.dslErrors).toEqual(['Diagram has a syntax error.']);
  });

  it('surfaces in-stream error events in the thread', async () => {
    fetchMock.mockResolvedValueOnce(
      ndjsonResponse([
        '{"type":"text","text":"partial"}',
        '{"type":"error","message":"Generation failed."}',
      ])
    );

    await useAiChatStore.getState().sendMessage('hi');

    const assistant = useAiChatStore.getState().messages[1];
    expect(assistant.error).toBe(true);
    expect(assistant.content).toBe('Generation failed.');
  });
});

describe('useAiChatStore.sendMessage — request payload', () => {
  it('sends the current canvas DSL as context', async () => {
    fetchMock.mockResolvedValueOnce(ndjsonResponse(['{"type":"done"}']));

    await useAiChatStore.getState().sendMessage('edit the diagram');

    expect(sentRequestBody().canvasDsl).toBe(useDiagramStore.getState().source);
  });

  it('sends the prompt as the last message', async () => {
    fetchMock.mockResolvedValueOnce(ndjsonResponse(['{"type":"done"}']));

    await useAiChatStore.getState().sendMessage('  trim me  ');

    expect(sentRequestBody().messages.at(-1)).toEqual({
      role: 'user',
      content: 'trim me',
    });
  });

  it('trims history to the newest 39 messages plus the prompt', async () => {
    fetchMock.mockResolvedValueOnce(ndjsonResponse(['{"type":"done"}']));
    useAiChatStore.setState({
      messages: Array.from({ length: 45 }, (_, i) => ({
        id: `m${i}`,
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `message ${i}`,
      })),
    });

    await useAiChatStore.getState().sendMessage('newest');

    const { messages } = sentRequestBody();
    expect(messages).toHaveLength(40);
    expect(messages[0].content).toBe('message 6'); // 45 - 39 = index 6
    expect(messages.at(-1)).toEqual({ role: 'user', content: 'newest' });
  });
});

describe('useAiChatStore.sendMessage — error responses', () => {
  it('shows the server message for a 401 response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'You must be signed in to use Architecta AI. Sign in and try again.',
        }),
        { status: 401 }
      )
    );

    await useAiChatStore.getState().sendMessage('hi');

    const assistant = useAiChatStore.getState().messages[1];
    expect(assistant.error).toBe(true);
    expect(assistant.content).toMatch(/sign in/i);
    expect(useAiChatStore.getState().isGenerating).toBe(false);
  });

  it('shows the server message for a 429 response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'Too many AI requests. Please wait a moment and try again.' }),
        { status: 429 }
      )
    );

    await useAiChatStore.getState().sendMessage('hi');

    expect(useAiChatStore.getState().messages[1].content).toContain('Too many AI requests');
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>bad gateway</html>', { status: 502 }));

    await useAiChatStore.getState().sendMessage('hi');

    expect(useAiChatStore.getState().messages[1].content).toBe('Request failed (502)');
  });
});

describe('useAiChatStore.sendMessage — guards', () => {
  it('does nothing when not authenticated', async () => {
    useAiChatStore.setState({ authenticated: false });
    await useAiChatStore.getState().sendMessage('hi');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAiChatStore.getState().messages).toEqual([]);
  });

  it('ignores an empty or whitespace-only prompt', async () => {
    await useAiChatStore.getState().sendMessage('   ');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAiChatStore.getState().messages).toEqual([]);
  });

  it('ignores a second sendMessage while one is in flight', async () => {
    let resolveFetch!: (res: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const first = useAiChatStore.getState().sendMessage('first');
    expect(useAiChatStore.getState().isGenerating).toBe(true);

    // Guarded — returns immediately without adding messages or hitting fetch.
    await useAiChatStore.getState().sendMessage('second');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useAiChatStore.getState().messages).toHaveLength(2);

    // Let the first request finish.
    resolveFetch(ndjsonResponse(['{"type":"done"}']));
    await first;

    expect(useAiChatStore.getState().isGenerating).toBe(false);
    expect(useAiChatStore.getState().messages).toHaveLength(2);
  });
});

describe('useAiChatStore.refreshConfig', () => {
  it('parses the config payload from the server', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ authenticated: true, configured: true, model: 'gpt-test' }),
        { status: 200 }
      )
    );

    await useAiChatStore.getState().refreshConfig();

    const s = useAiChatStore.getState();
    expect(s.authenticated).toBe(true);
    expect(s.isConfigured).toBe(true);
    expect(s.model).toBe('gpt-test');
  });

  it('resets both flags when the request fails', async () => {
    useAiChatStore.setState({ authenticated: true, isConfigured: true });
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }));

    await useAiChatStore.getState().refreshConfig();

    expect(useAiChatStore.getState().authenticated).toBe(false);
    expect(useAiChatStore.getState().isConfigured).toBe(false);
  });

  it('resets both flags when the network fails', async () => {
    useAiChatStore.setState({ authenticated: true, isConfigured: true });
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await useAiChatStore.getState().refreshConfig();

    expect(useAiChatStore.getState().authenticated).toBe(false);
    expect(useAiChatStore.getState().isConfigured).toBe(false);
  });
});

describe('useAiChatStore.applyDslToCanvas', () => {
  it('sets the diagram source and clears stale node overrides', () => {
    useDiagramStore.setState({ nodeOverrides: { A: { x: 10, y: 10 } } });

    useAiChatStore.getState().applyDslToCanvas('flowchart\nA > B');

    const d = useDiagramStore.getState();
    expect(d.source).toBe('flowchart\nA > B');
    expect(d.nodeOverrides).toEqual({});
  });

  it('syncs the active registry diagram source', () => {
    useDiagramRegistry.setState({
      activeDiagramId: 'd1',
      diagrams: { d1: { id: 'd1', name: 'Test', source: 'old' } },
      order: ['d1'],
    });

    useAiChatStore.getState().applyDslToCanvas('sequence-diagram\nA > B');

    expect(useDiagramRegistry.getState().diagrams.d1?.source).toBe('sequence-diagram\nA > B');
  });

  it('opens the DSL drawer on the whiteboard tab but not on the code tab', () => {
    useWorkspaceStore.setState({ activeTab: 'whiteboard', diagramCodeOpen: false });
    useAiChatStore.getState().applyDslToCanvas('flowchart\nA');
    expect(useWorkspaceStore.getState().diagramCodeOpen).toBe(true);

    useWorkspaceStore.setState({ activeTab: 'code', diagramCodeOpen: false });
    useAiChatStore.getState().applyDslToCanvas('flowchart\nB');
    expect(useWorkspaceStore.getState().diagramCodeOpen).toBe(false);
  });
});

describe('useAiChatStore.stopGenerating', () => {
  it('aborts the in-flight stream, keeps partial content and marks it stopped', async () => {
    let bodyController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const encoder = new TextEncoder();

    fetchMock.mockImplementationOnce((_url: string, init?: RequestInit) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          bodyController = controller;
          controller.enqueue(encoder.encode('{"type":"text","text":"partial answer"}\n'));
        },
        cancel() {
          // Abort propagates to the body stream, like a real fetch.
        },
      });
      init?.signal?.addEventListener('abort', () => {
        bodyController?.error(new DOMException('The operation was aborted.', 'AbortError'));
      });
      return Promise.resolve(new Response(body, { status: 200 }));
    });

    const sending = useAiChatStore.getState().sendMessage('hello');

    // Let the first chunk land…
    await vi.waitFor(() => {
      const assistant = useAiChatStore.getState().messages[1];
      expect(assistant.content).toBe('partial answer');
    });

    // …then stop mid-stream.
    useAiChatStore.getState().stopGenerating();
    await sending;

    const assistant = useAiChatStore.getState().messages[1];
    expect(assistant.content).toBe('partial answer');
    expect(assistant.stopped).toBe(true);
    expect(assistant.error).toBeUndefined();
    expect(useAiChatStore.getState().isGenerating).toBe(false);
  });

  it('is a no-op when nothing is generating', () => {
    expect(() => useAiChatStore.getState().stopGenerating()).not.toThrow();
  });
});
