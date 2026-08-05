'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAiChatStore, type AiChatMessage } from '@/lib/store/ai-chat-store';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Wifi,
  WifiOff,
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
} from 'lucide-react';

interface QuickPrompt {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: 'Microservices',
    icon: Workflow,
    prompt:
      'Create a microservices architecture diagram with an API Gateway, Auth Service, Database, and a message queue',
  },
  {
    label: 'OAuth 2.0 Flow',
    icon: Lock,
    prompt:
      'Create a sequence diagram of the OAuth 2.0 authorization code flow with Client, Authorization Server, and Resource Server',
  },
  {
    label: 'CI/CD Pipeline',
    icon: GitBranch,
    prompt: 'Create a flowchart of a CI/CD pipeline from code commit to production deployment',
  },
  {
    label: 'Add Redis Cache',
    icon: Database,
    prompt: 'Add a Redis caching layer between the API Gateway and the Database',
  },
];

function StatusBadge({
  authenticated,
  configured,
  model,
}: {
  authenticated: boolean;
  configured: boolean;
  model: string;
}) {
  if (!authenticated) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
        title="Sign in to use Architecta AI"
      >
        <LogIn className="h-2.5 w-2.5" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }
  return configured ? (
    <span
      className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400"
      title={`Connected · ${model}`}
    >
      <Wifi className="h-2.5 w-2.5" />
      <span className="hidden sm:inline">Online</span>
    </span>
  ) : (
    <span
      className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400"
      title="Set AI_API_KEY to enable Architecta AI"
    >
      <WifiOff className="h-2.5 w-2.5" />
      <span className="hidden sm:inline">Offline</span>
    </span>
  );
}

function DiagramCodeCard({
  message,
  onApply,
  onOpenInEditor,
}: {
  message: AiChatMessage;
  onApply: (dsl: string) => void;
  onOpenInEditor: (dsl: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const dsl = message.dsl ?? '';

  const handleCopy = () => {
    navigator.clipboard.writeText(dsl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mt-2 overflow-hidden rounded-xl border bg-background/90">
      {/* Card header */}
      <div className="flex items-center justify-between border-b bg-muted/40 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
          <FileJson className="h-3 w-3 text-purple-500" />
          <span>Diagram DSL</span>
        </div>
        <div className="flex items-center gap-1">
          {message.dslValid ? (
            <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Valid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Invalid
            </span>
          )}
          <button
            onClick={handleCopy}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Copy DSL"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* DSL preview */}
      <pre className="max-h-36 overflow-auto whitespace-pre-wrap px-2.5 py-2 font-mono text-[10px] leading-relaxed text-foreground/80">
        {dsl}
      </pre>

      {/* Validation errors */}
      {!message.dslValid && message.dslErrors && message.dslErrors.length > 0 && (
        <div className="border-t border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5">
          {message.dslErrors.map((err, i) => (
            <p key={i} className="text-[9px] leading-snug text-amber-700 dark:text-amber-400">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 border-t bg-muted/20 px-2.5 py-2">
        <Button
          size="sm"
          className="h-6 flex-1 gap-1 text-[10px]"
          disabled={!message.dslValid}
          onClick={() => onApply(dsl)}
        >
          <Sparkles className="h-3 w-3" />
          Apply to Canvas
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 text-[10px]"
          onClick={() => onOpenInEditor(dsl)}
        >
          <Code2 className="h-3 w-3" />
          Code Editor
        </Button>
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
  const sendMessage = useAiChatStore((s) => s.sendMessage);
  const stopGenerating = useAiChatStore((s) => s.stopGenerating);
  const applyDslToCanvas = useAiChatStore((s) => s.applyDslToCanvas);
  const clearConversation = useAiChatStore((s) => s.clearConversation);
  const refreshConfig = useAiChatStore((s) => s.refreshConfig);

  const setAiChatOpen = useWorkspaceStore((s) => s.setAiChatOpen);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  // Keep the conversation pinned to the newest message while streaming.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isGenerating]);

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleApply = (dsl: string) => {
    applyDslToCanvas(dsl);
    toast.success('Diagram applied to canvas');
  };

  const handleOpenInEditor = (dsl: string) => {
    // Apply the DSL too, so the code editor shows THIS diagram, not the
    // previous canvas source.
    applyDslToCanvas(dsl);
    setActiveTab('code');
    toast.success('Opened in code editor');
  };

  const isEmpty = messages.length === 0;

  return (
    <aside className="z-40 flex h-full w-80 shrink-0 flex-col border-l bg-background shadow-xl animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span>Architecta AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <StatusBadge authenticated={authenticated} configured={isConfigured} model={model} />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={clearConversation}
            disabled={isEmpty || isGenerating}
            title="Clear conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAiChatOpen(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Model / connection strip */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1">
        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          Model
        </span>
        <span className="truncate font-mono text-[10px] text-foreground/80">{model}</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 text-blue-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">What would you like to build?</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Generate architecture diagrams or precisely edit the diagram on your canvas.
              </p>
            </div>

            {authenticated ? (
              <div className="grid w-full grid-cols-1 gap-1.5">
                {QUICK_PROMPTS.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.label}
                      onClick={() => sendMessage(chip.prompt)}
                      disabled={isGenerating}
                      className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium text-foreground transition-all hover:border-blue-500/40 hover:bg-blue-500/5 disabled:opacity-50"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                      <span className="truncate">{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in to use Architecta AI
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  AI diagram generation is available to signed-in users only.
                </p>
                <Link
                  href="/login"
                  className="mt-3 inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
              </div>
            )}

            {authenticated && !isConfigured && (
              <p className="text-[9px] leading-relaxed text-amber-600 dark:text-amber-400">
                AI is offline — add <code className="font-mono">AI_API_KEY</code> to your
                environment and restart to enable generation.
              </p>
            )}
          </div>
        ) : (
          messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <div className="flex max-w-[85%] items-end gap-1.5">
                  <div className="rounded-2xl rounded-br-sm bg-blue-600 px-3 py-2 text-xs leading-relaxed text-white shadow-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                  <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex items-start gap-1.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="min-w-0 max-w-[90%] flex-1">
                  {m.error ? (
                    <div className="rounded-2xl rounded-tl-sm border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs leading-relaxed text-red-600 dark:text-red-400 whitespace-pre-wrap">
                      {m.content}
                    </div>
                  ) : (
                    <>
                      {m.content ? (
                        <div className="rounded-2xl rounded-tl-sm border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                          {m.content}
                        </div>
                      ) : (
                        isGenerating && (
                          <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border bg-muted/40 px-3 py-2.5">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                          </div>
                        )
                      )}
                      {m.stopped &&
                        (m.content ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                            <Square className="h-2.5 w-2.5 fill-current" />
                            Stopped
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-dashed bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                            <Square className="h-2.5 w-2.5 fill-current" />
                            Generation stopped
                          </div>
                        ))}
                      {m.dsl && (
                        <DiagramCodeCard
                          message={m}
                          onApply={handleApply}
                          onOpenInEditor={handleOpenInEditor}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          )
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t p-3">
        <div className="flex items-end gap-1.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            disabled={!authenticated}
            placeholder={authenticated ? 'Ask Architecta AI…' : 'Sign in to use Architecta AI'}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="max-h-28 min-h-9 flex-1 resize-none rounded-lg border bg-muted/30 px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
          {isGenerating ? (
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 border border-red-500/40 bg-red-500/10 text-red-500 transition-colors hover:bg-red-500/20 hover:text-red-600"
              onClick={stopGenerating}
              title="Stop generating"
            >
              <Square className="h-3 w-3 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleSend}
              disabled={!input.trim() || !authenticated}
              title="Send (Enter)"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[9px] text-muted-foreground">
          {authenticated
            ? 'Enter to send · Shift+Enter for a new line'
            : 'Sign in to chat with Architecta AI'}
        </p>
      </div>
    </aside>
  );
}
