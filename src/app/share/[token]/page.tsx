'use client';

import React, { useEffect, useState, use } from 'react';
import { WhiteboardCanvas } from '@/components/whiteboard/WhiteboardCanvas';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { Button } from '@/components/ui/button';
import { Sparkles, Eye, Share2, ArrowLeft, Lock, ShieldAlert, PlusCircle, LayoutDashboard, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params);
  const [title, setTitle] = useState('Shared Whiteboard');
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<'none' | 'not_found' | 'rate_limited'>('none');

  useEffect(() => {
    // Enable read-only UI state for shared canvas
    useWhiteboardStore.setState({ hideUI: false });

    async function loadSharedDoc() {
      try {
        const res = await fetch(`/api/documents/share/${token}`);
        if (res.status === 429) {
          setErrorState('rate_limited');
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setErrorState('not_found');
          setLoading(false);
          return;
        }

        const { document: doc } = await res.json();
        if (doc && doc.isPublic) {
          setTitle(doc.title);
          if (doc.whiteboardData) {
            const elements =
              typeof doc.whiteboardData === 'string'
                ? JSON.parse(doc.whiteboardData)
                : doc.whiteboardData;
            useWhiteboardStore.setState({ elements });
          }
          setErrorState('none');
        } else {
          setErrorState('not_found');
        }
      } catch {
        setErrorState('not_found');
      } finally {
        setLoading(false);
      }
    }

    loadSharedDoc();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground select-none">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card/40 p-8 backdrop-blur-md shadow-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading shared diagram...</p>
        </div>
      </div>
    );
  }

  if (errorState !== 'none') {
    return (
      <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-background text-foreground select-none">
        {/* Background ambient lighting */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-500/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/15 blur-[120px]" />

        {/* Top Navbar */}
        <header className="absolute top-0 left-0 right-0 flex h-14 items-center justify-between border-b border-border/40 px-6 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-blue-600 text-white font-bold shadow-md">
              A
            </div>
            <span className="text-sm font-bold tracking-tight">Architecta</span>
          </div>
          <Link href="/whiteboard">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-lg">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Go to App</span>
            </Button>
          </Link>
        </header>

        {/* Central Error Card */}
        <div className="relative z-10 max-w-md w-full mx-4 flex flex-col items-center text-center rounded-2xl border border-border/60 bg-card/70 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 mb-5 shadow-inner">
            {errorState === 'rate_limited' ? (
              <ShieldAlert className="h-8 w-8" />
            ) : (
              <Lock className="h-8 w-8" />
            )}
          </div>

          <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">
            {errorState === 'rate_limited'
              ? 'Too Many Requests'
              : 'Link Invalid or Private Document'}
          </h1>

          <p className="text-xs leading-relaxed text-muted-foreground mb-6">
            {errorState === 'rate_limited'
              ? 'You have made too many share lookup requests. Please wait a moment and refresh.'
              : 'This shared link is no longer active. The owner may have made the document private or revoked public sharing access.'}
          </p>

          <div className="w-full flex flex-col gap-2.5">
            <Link href="/whiteboard" className="w-full">
              <Button className="w-full h-9 text-xs font-semibold gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-md rounded-lg">
                <PlusCircle className="h-4 w-4" />
                <span>Create Your Own Diagram</span>
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full h-9 text-xs font-medium gap-2 rounded-lg">
                <span>Sign In to Your Account</span>
              </Button>
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-border/40 text-[11px] text-muted-foreground/80 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            <span>Are you the owner? Sign in to view it in your workspace.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* Shared Document Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4 bg-background/95 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <Link href="/whiteboard">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to App</span>
            </Button>
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-bold text-foreground">{title}</span>
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>Read Only</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/whiteboard">
            <Button size="sm" className="h-7 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <Share2 className="h-3.5 w-3.5" />
              <span>Open in Editor</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="relative flex-1 overflow-hidden">
        <WhiteboardCanvas />
      </main>
    </div>
  );
}
