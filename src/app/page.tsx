'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppButton } from '@/components/ui/app-button';
import { useSession, signOut } from 'next-auth/react';
import {
  Sparkles,
  UserPlus,
  LogIn,
  LogOut,
  LayoutGrid,
  Code2,
  Layout,
  FileText,
  Zap,
  ShieldCheck,
  Globe,
  Database,
  ChevronRight,
} from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';

export default function LandingPage() {
  const { status } = useSession();
  const isSignedIn = status === 'authenticated';
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'signup'>('signup');
  const [activeDemoTab, setActiveDemoTab] = useState<'flowchart' | 'sequence' | 'whiteboard'>('flowchart');

  const openAuth = (tab: 'login' | 'signup') => {
    setAuthDefaultTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white font-sans overflow-x-hidden">
      {/* Background Gradient Orbs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[140px]" />
        <div className="absolute top-40 left-1/3 w-80 h-80 bg-cyan-500/15 rounded-full blur-[100px]" />
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-white font-black text-lg shadow-lg shadow-blue-500/20">
              A
            </div>
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Architecta<span className="text-blue-500">.io</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Interactive Demo</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/BhupendraLute/eraserio-clone"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>

            {isSignedIn ? (
              <>
                <Link href="/dashboard/all">
                  <AppButton
                    appearance="brand"
                    size="sm"
                    label="Dashboard"
                    icon={<LayoutGrid className="h-3.5 w-3.5" />}
                  />
                </Link>
                <AppButton
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
                  icon={<LogOut className="h-3.5 w-3.5" />}
                  label="Sign Out"
                  onClick={() => signOut({ callbackUrl: '/' })}
                />
              </>
            ) : (
              <>
                <AppButton
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
                  icon={<LogIn className="h-3.5 w-3.5" />}
                  label="Sign In"
                  onClick={() => openAuth('login')}
                />
                <AppButton
                  appearance="brand"
                  size="sm"
                  label="Get Started"
                  icon={<UserPlus className="h-3.5 w-3.5" />}
                  onClick={() => openAuth('signup')}
                />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-6 text-center">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 backdrop-blur-md shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            <span>Architecta.io v1.0 — Next.js 16 + React 19 + NeonDB</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Diagram-as-Code & Freeform Whiteboard <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Built for Modern Developers
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-base md:text-lg text-slate-400 font-normal leading-relaxed">
            Create high-level architecture flowcharts, sequence diagrams, and technical docs in seconds. Combine live code syntax with a freeform infinite canvas.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/dashboard/all">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-sm font-bold gap-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-600/30 border border-blue-400/30">
                <Zap className="h-4 w-4 text-amber-300" />
                <span>Launch User Dashboard</span>
              </Button>
            </Link>
            <AppButton
              appearance="brand-outline"
              size="lg"
              label="Create Account"
              icon={<UserPlus className="h-4 w-4" />}
              className="w-full sm:w-auto h-12 rounded-2xl"
              onClick={() => openAuth('signup')}
            />
          </div>

          {/* Stats Bar */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="text-2xl font-black text-white">258+</div>
              <div className="text-xs text-slate-400 font-medium">Automated Tests</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="text-2xl font-black text-cyan-400">100%</div>
              <div className="text-xs text-slate-400 font-medium">Pure TS DSL Engine</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="text-2xl font-black text-purple-400">NeonDB</div>
              <div className="text-xs text-slate-400 font-medium">Serverless Postgres</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="text-2xl font-black text-emerald-400">Web Worker</div>
              <div className="text-xs text-slate-400 font-medium">Off-main-thread Parsing</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Interactive Hero Canvas Preview Card */}
      <section id="demo" className="relative z-10 px-6 max-w-6xl mx-auto pb-24">
        <div className="rounded-3xl border border-white/10 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-2xl">
          {/* Mock Window Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-slate-950/60">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400">eraserio-clone / architecture.eraser</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-0.5 border border-white/5">
              <button
                onClick={() => setActiveDemoTab('flowchart')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeDemoTab === 'flowchart' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
              >
                Flowchart DSL
              </button>
              <button
                onClick={() => setActiveDemoTab('sequence')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeDemoTab === 'sequence' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
              >
                Sequence Diagram
              </button>
              <button
                onClick={() => setActiveDemoTab('whiteboard')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeDemoTab === 'whiteboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
              >
                Freeform Whiteboard
              </button>
            </div>
          </div>

          {/* Mock Split Canvas Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
            {/* Code Panel */}
            <div className="lg:col-span-5 border-r border-white/10 bg-slate-950/80 p-5 font-mono text-xs text-slate-300 space-y-2">
              <div className="text-slate-500 font-sans text-[11px] font-bold uppercase tracking-wider mb-3">
                DSL Input Editor (CodeMirror 6)
              </div>
              {activeDemoTab === 'flowchart' ? (
                <>
                  <div className="text-purple-400">flowchart</div>
                  <br />
                  <div className="text-blue-400">Client <span className="text-slate-400">[icon: user]</span></div>
                  <div className="text-blue-400">API Gateway</div>
                  <div className="text-blue-400">Auth Service</div>
                  <div className="text-blue-400">Neon Database <span className="text-slate-400">[icon: database]</span></div>
                  <br />
                  <div className="text-emerald-400">Client &gt; API Gateway: <span className="text-slate-300">HTTPS request</span></div>
                  <div className="text-emerald-400">API Gateway &gt; Auth Service: <span className="text-slate-300">validate session</span></div>
                  <div className="text-emerald-400">Auth Service &gt; Neon Database: <span className="text-slate-300">query user token</span></div>
                </>
              ) : activeDemoTab === 'sequence' ? (
                <>
                  <div className="text-purple-400">sequence-diagram</div>
                  <br />
                  <div className="text-blue-400">participant User</div>
                  <div className="text-blue-400">participant App</div>
                  <div className="text-blue-400">participant Database</div>
                  <br />
                  <div className="text-emerald-400">User -&gt; App: Login Prompt</div>
                  <div className="text-emerald-400">App -&gt; Database: Verify Passkey</div>
                  <div className="text-emerald-400">Database --&gt; App: JWT Token</div>
                  <div className="text-emerald-400">App --&gt; User: Authenticated</div>
                </>
              ) : (
                <>
                  <div className="text-slate-400">{'// Freeform canvas element tree'}</div>
                  <div className="text-cyan-400">const rectangle = &#123; type: &apos;rectangle&apos;, x: 120, y: 80 &#125;;</div>
                  <div className="text-cyan-400">const arrow = &#123; type: &apos;arrow&apos;, style: &apos;orthogonal&apos; &#125;;</div>
                  <div className="text-amber-400">const comment = &quot;LGTM! Architecture updated.&quot;;</div>
                </>
              )}
            </div>

            {/* Canvas Render Preview Panel */}
            <div className="lg:col-span-7 bg-slate-900/60 p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

              {/* Render Nodes Mockup */}
              <div className="relative z-10 flex flex-col items-center justify-center my-auto space-y-6">
                <div className="flex items-center justify-center gap-8 w-full max-w-md">
                  <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/50 p-3 text-center shadow-lg backdrop-blur">
                    <div className="text-xs font-bold text-cyan-300">Client App</div>
                    <div className="text-[10px] text-cyan-400/70">React 19</div>
                  </div>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 border border-blue-500/30 px-1.5 py-0.5 rounded text-[9px] text-blue-300">
                      HTTPS
                    </div>
                  </div>
                  <div className="rounded-xl border border-blue-500/40 bg-blue-950/50 p-3 text-center shadow-lg backdrop-blur">
                    <div className="text-xs font-bold text-blue-300">API Gateway</div>
                    <div className="text-[10px] text-blue-400/70">Next.js 16</div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8 w-full max-w-md">
                  <div className="rounded-xl border border-purple-500/40 bg-purple-950/50 p-3 text-center shadow-lg backdrop-blur">
                    <div className="text-xs font-bold text-purple-300">Auth Service</div>
                    <div className="text-[10px] text-purple-400/70">Prisma Client</div>
                  </div>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-purple-500 to-emerald-500 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 border border-purple-500/30 px-1.5 py-0.5 rounded text-[9px] text-purple-300">
                      SSL Pool
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-3 text-center shadow-lg backdrop-blur">
                    <div className="text-xs font-bold text-emerald-300">Neon Database</div>
                    <div className="text-[10px] text-emerald-400/70">Postgres</div>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-3">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Worker Pipeline Parsed in 4ms</span>
                </span>
                <Link href="/whiteboard">
                  <span className="text-blue-400 font-semibold hover:underline flex items-center gap-1">
                    Try Live Canvas <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="relative z-10 py-20 border-t border-white/10 bg-slate-950/60 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold text-white">Everything You Need for Technical Architecture</h2>
            <p className="text-slate-400 text-sm">
              Combine code-based diagramming, freeform drawing, markdown docs, and serverless database persistence in a single unified workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-blue-500/40 transition-all hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 font-bold">
                <Code2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Diagram-as-Code</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Write flowcharts and sequence diagrams using our custom Chevrotain parser DSL. Auto-arranged with Dagre layout engine.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-purple-500/40 transition-all hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 font-bold">
                <Layout className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Freeform Whiteboard</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Infinite SVG canvas with shapes, arrows, pencil tool, sticky notes, icons, orthogonal connector routing, and comments.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-emerald-500/40 transition-all hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 font-bold">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">NeonDB Cloud Sync</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Debounced cloud persistence backed by Neon serverless PostgreSQL & Prisma ORM. Share read-only diagram links instantly.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-cyan-500/40 transition-all hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 font-bold">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Markdown Docs Editor</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rich-text Tiptap document editor with embedded live diagram previews, slash commands, and markdown shortcut styling.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-amber-500/40 transition-all hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 font-bold">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Architecta AI Assistant</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Collapsible AI sidebar to generate architecture DSL code directly from natural language prompts.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-indigo-500/40 transition-all hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 font-bold">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Public Share Links</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                One-click shareable read-only URLs (`/share/[token]`) for team reviews and public documentation embeds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="relative z-10 py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <h2 className="text-3xl font-black">Ready to Create Breathtaking Diagrams?</h2>
            <p className="text-blue-100 text-sm max-w-xl mx-auto">
              Start building flowcharts, sequence diagrams, and whiteboards instantly in your browser.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href="/whiteboard">
                <Button size="lg" className="h-12 px-8 text-sm font-bold bg-white text-blue-950 hover:bg-slate-100 rounded-2xl shadow-xl">
                  Open Free Workspace
                </Button>
              </Link>
              <AppButton
                appearance="light-outline"
                size="lg"
                label="Create Account"
                icon={<UserPlus className="h-4 w-4" />}
                className="h-12 rounded-2xl shadow-none"
                onClick={() => openAuth('signup')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-8 px-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white font-bold text-xs">
              A
            </div>
            <span className="font-semibold text-slate-300">Architecta.io</span>
            <span>— Open Source Developer Architecture</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/whiteboard" className="hover:text-slate-300 transition-colors">Whiteboard</Link>
            <a
              href="https://github.com/BhupendraLute/eraserio-clone"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub Repository
            </a>
            <Link href="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-slate-300 transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab={authDefaultTab}
      />
    </div>
  );
}
