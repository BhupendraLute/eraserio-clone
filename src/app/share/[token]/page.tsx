'use client';

import React, { useEffect, useState, use } from 'react';
import { WhiteboardCanvas } from '@/components/whiteboard/WhiteboardCanvas';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { Button } from '@/components/ui/button';
import { Sparkles, Eye, Share2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params);
  const [title, setTitle] = useState('Shared Whiteboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Enable read-only UI state for shared canvas
    useWhiteboardStore.setState({ hideUI: false });

    // Fetch shared document data
    async function loadSharedDoc() {
      try {
        const res = await fetch(`/api/documents/${token}`);
        if (res.ok) {
          const { document: doc } = await res.json();
          if (doc) {
            setTitle(doc.title);
            if (doc.whiteboardData) {
              const elements =
                typeof doc.whiteboardData === 'string'
                  ? JSON.parse(doc.whiteboardData)
                  : doc.whiteboardData;
              useWhiteboardStore.setState({ elements });
            }
          }
        }
      } catch {
        // Fall back gracefully
      } finally {
        setLoading(false);
      }
    }

    loadSharedDoc();
  }, [token]);

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
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Loading shared diagram...
          </div>
        ) : (
          <WhiteboardCanvas />
        )}
      </main>
    </div>
  );
}
