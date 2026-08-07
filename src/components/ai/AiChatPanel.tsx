'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAiChatStore, type AiChatMessage } from '@/lib/store/ai-chat-store';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import type { WhiteboardElement } from '@/lib/whiteboard/whiteboard-types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Wifi,
  RotateCcw,
  Copy,
  Check,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  Workflow,
  Database,
  GitBranch,
  Lock,
  Square,
  Code2,
  LogIn,
  Layers,
  Wand2,
  Eye,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react';

interface QuickPrompt {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
  category: string;
}

import { FormattedMarkdown } from '@/components/ui/FormattedMarkdown';

const autoResizeTextarea = (target: HTMLTextAreaElement | null, maxHeight = 220) => {
  if (!target) return;
  target.style.height = 'auto';
  const scrollH = target.scrollHeight;
  const nextHeight = Math.min(scrollH, maxHeight);
  target.style.height = `${Math.max(38, nextHeight)}px`;
  if (scrollH > maxHeight) {
    target.style.overflowY = 'auto';
  } else {
    target.style.overflowY = 'hidden';
  }
};

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: 'Microservices Architecture',
    category: 'System Topology',
    icon: Workflow,
    prompt:
      'Create a full microservices architecture diagram with an API Gateway, Auth Service, PostgreSQL Database, Redis Cache, and Kafka Message Queue',
  },
  {
    label: 'OAuth 2.0 Auth Flow',
    category: 'Sequence Diagram',
    icon: Lock,
    prompt:
      'Create a sequence diagram of the OAuth 2.0 authorization code flow with Client App, API Gateway, Auth0 Server, and User DB',
  },
  {
    label: 'CI/CD Pipeline',
    category: 'DevOps',
    icon: GitBranch,
    prompt: 'Create a flowchart of an automated CI/CD pipeline from Code Commit to Docker Build, K8s Cluster, and Production Cloud',
  },
  {
    label: 'Add Redis & Read Replica',
    category: 'Data Persistence',
    icon: Database,
    prompt: 'Add a Redis caching layer and PostgreSQL Read Replica cluster to the existing architecture',
  },
];

function StatusBadge({
  authenticated,
  configured,
}: {
  authenticated: boolean;
  configured: boolean;
  model?: string;
}) {
  if (!authenticated) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
        title="Sign in to use Architecta AI"
      >
        <LogIn className="h-3 w-3" />
        <span>Sign in</span>
      </Link>
    );
  }
  return null;
}

function DiagramCodeCard({
  message,
  onApply,
  onInsertAsShapes,
  onOpenInEditor,
  onRefineWithAi,
}: {
  message: AiChatMessage;
  onApply: (dsl: string) => void;
  onInsertAsShapes: (dsl: string) => void;
  onOpenInEditor: (dsl: string) => void;
  onRefineWithAi: (dsl: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(true);
  const dsl = message.dsl ?? '';

  const activePreviewDsl = useAiChatStore((s) => s.activePreviewDsl);
  const setPreviewDsl = useAiChatStore((s) => s.setPreviewDsl);
  const acceptPreviewChanges = useAiChatStore((s) => s.acceptPreviewChanges);
  const rejectPreviewChanges = useAiChatStore((s) => s.rejectPreviewChanges);

  const isPreviewing = activePreviewDsl === dsl;

  const handleCopy = () => {
    navigator.clipboard.writeText(dsl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-md transition-all">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <FileJson className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-bold text-foreground">Diagram DSL Code</span>
        </div>
        <div className="flex items-center gap-1.5">
          {message.dslValid ? (
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Valid DSL
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Syntax Warning
            </span>
          )}
          <button
            onClick={() => setShowCode(!showCode)}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={showCode ? 'Collapse Code' : 'Expand Code'}
          >
            {showCode ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleCopy}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Copy DSL Code"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Code Area */}
      {showCode && (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap px-3 py-2.5 font-mono text-[10px] leading-relaxed text-foreground/90 bg-slate-950/90 dark:bg-slate-950 text-slate-100 selection:bg-blue-500/30">
          {dsl}
        </pre>
      )}

      {/* Validation Errors */}
      {!message.dslValid && message.dslErrors && message.dslErrors.length > 0 && (
        <div className="border-t border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
          {message.dslErrors.map((err, i) => (
            <p key={i} className="text-[9px] leading-snug text-amber-700 dark:text-amber-400 font-mono">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Live Preview Banner */}
      {isPreviewing && (
        <div className="flex items-center justify-between border-t border-blue-500/30 bg-blue-500/15 px-3 py-2">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 animate-pulse">
            <Eye className="h-3.5 w-3.5" />
            Live Preview Modal Active
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-6 px-2.5 gap-1 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onClick={acceptPreviewChanges}
            >
              <Check className="h-3 w-3" />
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-500/10"
              onClick={rejectPreviewChanges}
            >
              <X className="h-3 w-3" />
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col gap-1.5 border-t bg-muted/20 px-3 py-2.5">
        <Button
          size="sm"
          className="h-8 w-full gap-2 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all hover:scale-[1.01]"
          disabled={!message.dslValid}
          onClick={(e) => {
            (e.currentTarget as HTMLElement)?.blur();
            onInsertAsShapes(dsl);
          }}
        >
          <Layers className="h-4 w-4" />
          Insert as Canvas Shapes
        </Button>
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            variant={isPreviewing ? 'default' : 'outline'}
            size="sm"
            className="h-7 gap-1 text-[10px] font-medium"
            disabled={!message.dslValid}
            onClick={(e) => {
              (e.currentTarget as HTMLElement)?.blur();
              setPreviewDsl(isPreviewing ? null : dsl);
            }}
          >
            <Eye className="h-3 w-3 text-blue-500" />
            {isPreviewing ? 'Close' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[10px] font-medium"
            disabled={!message.dslValid}
            onClick={(e) => {
              (e.currentTarget as HTMLElement)?.blur();
              onApply(dsl);
            }}
          >
            <Sparkles className="h-3 w-3 text-emerald-500" />
            Apply Code
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[10px] font-medium"
            onClick={(e) => {
              (e.currentTarget as HTMLElement)?.blur();
              onRefineWithAi(dsl);
            }}
          >
            <MessageSquare className="h-3 w-3 text-purple-500" />
            Refine
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AiChatPanel() {
  const messages = useAiChatStore((s) => s.messages);
  const isGenerating = useAiChatStore((s) => s.isGenerating);
  const isConfigured = useAiChatStore((s) => s.isConfigured);
  const authenticated = useAiChatStore((s) => s.authenticated);
  const model = useAiChatStore((s) => s.model);

  const refreshConfig = useAiChatStore((s) => s.refreshConfig);
  const sendMessage = useAiChatStore((s) => s.sendMessage);
  const stopGenerating = useAiChatStore((s) => s.stopGenerating);
  const applyDslToCanvas = useAiChatStore((s) => s.applyDslToCanvas);
  const insertAsCanvasShapes = useAiChatStore((s) => s.insertAsCanvasShapes);
  const clearConversation = useAiChatStore((s) => s.clearConversation);

  const toggleAiChat = useWorkspaceStore((s) => s.toggleAiChat);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);

  const [input, setInput] = useState('');
  const [panelWidth, setPanelWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isGenerating]);

  const handleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const minWidth = 300;
    let finalWidth = panelWidth;

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      animFrameRef.current = requestAnimationFrame(() => {
        const maxWidth = Math.min(840, window.innerWidth * 0.6);
        const calculated = window.innerWidth - moveEvt.clientX;
        finalWidth = Math.max(minWidth, Math.min(maxWidth, calculated));

        if (asideRef.current) {
          asideRef.current.style.width = `${finalWidth}px`;
        }
      });
    };

    const onPointerUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setPanelWidth(finalWidth);

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) {
      autoResizeTextarea(textareaRef.current);
    }
  };

  const handleApply = (dsl: string) => {
    applyDslToCanvas(dsl);
    toast.success('Diagram code applied to editor');
  };

  const handleInsertAsShapes = (dsl: string) => {
    const ok = insertAsCanvasShapes(dsl);
    if (ok) {
      toast.success('Inserted diagram as native canvas shapes!');
    } else {
      toast.error('Could not convert diagram code to shapes');
    }
  };

  const handleOpenInEditor = (dsl: string) => {
    applyDslToCanvas(dsl);
    setActiveTab('code');
    toast.success('Opened in code editor');
  };

  const handleRefineWithAi = (dsl: string) => {
    setInput('Refine this diagram architecture to add ');
    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => autoResizeTextarea(textareaRef.current), 0);
    }
  };

  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);
  const setSelectedIds = useWhiteboardStore((s) => s.setSelectedIds);
  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));

  const isEmpty = messages.length === 0;

  return (
    <aside
      ref={asideRef}
      className="relative z-40 flex h-full shrink-0 flex-col border-l bg-background shadow-2xl select-none"
      style={{ width: `${panelWidth}px` }}
    >
      {/* Left Resizable Drag Handle Bar */}
      <div
        className="group absolute -left-1 top-0 bottom-0 z-50 w-2.5 cursor-ew-resize hover:bg-blue-500/30 active:bg-blue-600/50 transition-colors"
        onPointerDown={handleResizeStart}
        title="Drag to resize Architecta AI panel"
      >
        <div className="absolute left-1 top-1/2 -translate-y-1/2 h-10 w-1 rounded-full bg-border group-hover:bg-blue-500 group-active:bg-blue-600 transition-colors" />
      </div>

      {/* AI Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b bg-card/60 px-3.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold leading-none text-foreground">Architecta AI</h2>
            <p className="mt-0.5 text-[9px] text-muted-foreground">System Architecture Copilot</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <StatusBadge authenticated={authenticated} configured={isConfigured} model={model} />
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={clearConversation}
              title="Clear Conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={toggleAiChat}
            title="Close Assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {isEmpty && (
          <div className="py-4 space-y-4 animate-in fade-in">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                <Wand2 className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-xs font-bold text-foreground">System Architecture Generator</h3>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                Describe your cloud topology, microservices, or API flows to generate interactive whiteboard diagrams.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                Suggested Prompts
              </span>
              <div className="grid grid-cols-1 gap-2">
                {QUICK_PROMPTS.map((qp, idx) => {
                  const Icon = qp.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (isGenerating) return;
                        sendMessage(qp.prompt);
                        setInput('');
                        if (textareaRef.current) {
                          autoResizeTextarea(textareaRef.current);
                        }
                      }}
                      className="group flex items-start gap-2.5 rounded-xl border border-border/70 bg-card p-2.5 text-left transition-all hover:border-blue-500/50 hover:bg-blue-500/5 hover:shadow-sm"
                    >
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-foreground">{qp.label}</span>
                          <span className="rounded bg-muted px-1 py-0.2 text-[8px] font-medium text-muted-foreground">
                            {qp.category}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                          {qp.prompt}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  isUser
                    ? 'bg-foreground text-background'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className={`max-w-[85%] space-y-1 ${isUser ? 'items-end text-right' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-xs font-medium'
                      : 'bg-card border border-border/80 text-foreground rounded-tl-xs'
                  }`}
                >
                  <FormattedMarkdown content={m.content} />
                </div>

                {!isUser && m.dsl && (
                  <DiagramCodeCard
                    message={m}
                    onApply={handleApply}
                    onInsertAsShapes={handleInsertAsShapes}
                    onOpenInEditor={handleOpenInEditor}
                    onRefineWithAi={handleRefineWithAi}
                  />
                )}
              </div>
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[11px] text-blue-600 dark:text-blue-400 animate-pulse">
            <Cpu className="h-4 w-4 animate-spin" />
            <span>Analyzing architecture requirements & generating diagram...</span>
          </div>
        )}
      </div>

      {/* Floating Prompt Input (AI SDK Elements Style) */}
      <div className="border-t bg-card/80 p-3 backdrop-blur space-y-2">
        {/* Linked Canvas Context Indicator Banner */}
        {selectedElements.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-300 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-500 fill-blue-500/20" />
              <span>
                Linked {selectedElements.length} Canvas Component
                {selectedElements.length > 1 ? 's' : ''}
                {selectedElements.map((e: WhiteboardElement) => e.label).filter(Boolean).length > 0 &&
                  ` (${selectedElements
                    .map((e: WhiteboardElement) => e.label)
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(', ')})`}
              </span>
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-[9px] font-normal text-muted-foreground hover:text-foreground hover:underline"
              title="Unlink canvas context"
            >
              Unlink
            </button>
          </div>
        )}

        <div className="relative rounded-2xl border border-border/90 bg-background p-2 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
          <textarea
            ref={(node) => {
              textareaRef.current = node;
              if (node) autoResizeTextarea(node);
            }}
            rows={1}
            value={input}
            onInput={(e) => autoResizeTextarea(e.currentTarget)}
            onChange={(e) => {
              setInput(e.target.value);
              autoResizeTextarea(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe your system architecture or prompt edits..."
            className="w-full resize-none bg-transparent px-1 text-xs text-foreground outline-none placeholder:text-muted-foreground/60 leading-relaxed max-h-[220px] overflow-y-hidden [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-blue-500/50"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[9px] font-medium text-muted-foreground">
              Enter to send · Shift+Enter newline
            </span>

            {isGenerating ? (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2.5 gap-1 text-[10px] font-semibold"
                onClick={stopGenerating}
              >
                <Square className="h-3 w-3 fill-current" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-7 w-7 rounded-xl p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                disabled={!input.trim()}
                onClick={handleSend}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
