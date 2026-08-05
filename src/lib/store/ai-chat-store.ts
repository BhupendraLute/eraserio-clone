import { create } from 'zustand';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { useDiagramRegistry } from '@/lib/store/diagram-registry';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { convertDslToWhiteboardElements } from '@/lib/whiteboard/convert-dsl-to-whiteboard';

export type AiChatRole = 'user' | 'assistant';
export type AiDiagramKind = 'flowchart' | 'sequence' | null;

export interface AiChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  /** Generated/edited diagram DSL attached to this assistant message, if any. */
  dsl?: string;
  diagramKind?: AiDiagramKind;
  dslValid?: boolean;
  dslErrors?: string[];
  /** True when the request failed — `content` then holds the error message. */
  error?: boolean;
  /** True when the user stopped generation mid-stream (partial content kept). */
  stopped?: boolean;
}

/** One NDJSON event emitted by `/api/ai/generate`. */
export interface AiStreamEvent {
  type: 'text' | 'dsl' | 'error' | 'done';
  text?: string;
  dsl?: string;
  diagramKind?: AiDiagramKind;
  valid?: boolean;
  errors?: string[];
  message?: string;
}

interface AiChatState {
  messages: AiChatMessage[];
  isGenerating: boolean;
  isConfigured: boolean;
  authenticated: boolean;
  model: string;
  refreshConfig: () => Promise<void>;
  sendMessage: (prompt: string) => Promise<void>;
  /** Aborts the in-flight generation; partial output stays in the thread. */
  stopGenerating: () => void;
  applyDslToCanvas: (dsl: string) => void;
  /** Converts DSL into native Whiteboard Canvas shapes and appends them to the whiteboard. */
  insertAsCanvasShapes: (dsl: string) => boolean;
  clearConversation: () => void;
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Tracks the currently in-flight generation so stopGenerating() can abort it.
let activeController: AbortController | null = null;

export const useAiChatStore = create<AiChatState>((set, get) => ({
  messages: [],
  isGenerating: false,
  isConfigured: false,
  authenticated: false,
  model: 'big-pickle',

  refreshConfig: async () => {
    try {
      const res = await fetch('/api/ai/generate');
      if (res.ok) {
        const data = (await res.json()) as {
          configured?: boolean;
          authenticated?: boolean;
          model?: string;
        };
        set({
          isConfigured: Boolean(data.configured),
          authenticated: Boolean(data.authenticated),
          model: data.model ?? 'big-pickle',
        });
      } else {
        set({ isConfigured: false, authenticated: false });
      }
    } catch {
      set({ isConfigured: false, authenticated: false });
    }
  },

  sendMessage: async (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed || get().isGenerating) return;

    // The route requires a signed-in session (and enforces it server-side
    // with a 401); skip the pointless round-trip when the client already
    // knows the session is missing. The UI also hides the input in this
    // state, so this is a defensive fast-path only.
    if (!get().authenticated) return;

    // Snapshot history BEFORE pushing the new user message, and read the
    // current canvas DSL so the model can make context-aware edits.
    const history = get().messages.map((m) => ({ role: m.role, content: m.content }));
    const canvasDsl = useDiagramStore.getState().source;

    const userMsg: AiChatMessage = { id: createId(), role: 'user', content: trimmed };
    const assistantMsg: AiChatMessage = { id: createId(), role: 'assistant', content: '' };

    // Abortable fetch — stopGenerating() cancels it (and, via the request
    // abort signal, the server-side model call too).
    const controller = new AbortController();
    activeController = controller;

    set({
      messages: [...get().messages, userMsg, assistantMsg],
      isGenerating: true,
    });

    const patchAssistant = (patch: Partial<AiChatMessage>) =>
      set((s) => ({
        messages: s.messages.map((m) => (m.id === assistantMsg.id ? { ...m, ...patch } : m)),
      }));

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history.slice(-(40 - 1)), { role: 'user', content: trimmed }],
          canvasDsl,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let message = `Request failed (${res.status})`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          // keep the generic message
        }
        throw new Error(message);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processLine = (line: string) => {
        if (!line.trim()) return;
        let event: AiStreamEvent;
        try {
          event = JSON.parse(line) as AiStreamEvent;
        } catch {
          return;
        }

        if (event.type === 'text' && event.text) {
          const current = get().messages.find((m) => m.id === assistantMsg.id)?.content ?? '';
          patchAssistant({ content: current + event.text });
        } else if (event.type === 'dsl') {
          patchAssistant({
            dsl: event.dsl,
            diagramKind: event.diagramKind ?? null,
            dslValid: event.valid,
            dslErrors: event.errors ?? [],
          });
        } else if (event.type === 'error') {
          throw new Error(event.message ?? 'Generation failed.');
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) processLine(line);
      }

      // Defensive flush: a final line without a trailing newline would
      // otherwise be dropped (the route always sends one, but be safe).
      if (buffer.trim()) processLine(buffer);
    } catch (err) {
      // User hit Stop — keep whatever already streamed, mark it stopped.
      if (controller.signal.aborted) {
        patchAssistant({ stopped: true });
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Something went wrong while generating.';
      patchAssistant({ error: true, content: message });
      return;
    } finally {
      activeController = null;
      set({ isGenerating: false });
    }
  },

  stopGenerating: () => {
    if (get().isGenerating) {
      activeController?.abort();
    }
  },

  /**
   * Applies generated/edited DSL straight to the active canvas + CodeMirror
   * editor. The pipeline worker watches `source` and re-renders automatically.
   */
  applyDslToCanvas: (dsl) => {
    const diagram = useDiagramStore.getState();
    diagram.resetNodeOverrides();
    diagram.setSource(dsl);

    // Keep the diagram registry (docs embeds, multi-diagram switcher) in sync.
    const registry = useDiagramRegistry.getState();
    if (registry.activeDiagramId) {
      registry.updateSource(registry.activeDiagramId, dsl);
    }

    // On the freeform whiteboard tab the DSL lives in the code drawer — open
    // it so the applied change is visible instead of appearing to do nothing.
    const workspace = useWorkspaceStore.getState();
    if (workspace.activeTab === 'whiteboard') {
      workspace.setDiagramCodeOpen(true);
    }
  },

  insertAsCanvasShapes: (dsl) => {
    const elements = convertDslToWhiteboardElements(dsl);
    if (elements.length === 0) return false;

    useWhiteboardStore.getState().addElements(elements);

    // Switch to canvas / whiteboard tab if on code tab
    const workspace = useWorkspaceStore.getState();
    if (workspace.activeTab !== 'whiteboard') {
      workspace.setActiveTab('whiteboard');
    }

    return true;
  },

  clearConversation: () => set({ messages: [], isGenerating: false }),
}));
