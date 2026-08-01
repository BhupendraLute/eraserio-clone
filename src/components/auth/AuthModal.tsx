'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'login' | 'signup';
}

export function AuthModal({ open, onOpenChange, defaultTab = 'login' }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleOAuthLogin = (provider: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onOpenChange(false);
      router.push('/whiteboard');
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border bg-background shadow-2xl rounded-2xl">
        {/* Top Header Card */}
        <div className="bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur border border-white/30 text-white font-black text-xl mb-3 shadow-lg">
            A
          </div>
          <DialogTitle className="text-xl font-extrabold text-white">
            Welcome to Architecta
          </DialogTitle>
          <DialogDescription className="text-xs text-blue-100 mt-1">
            Sign in with your preferred account to sync diagrams across devices
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4">
          {/* Social OAuth Providers */}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs font-semibold gap-3 border-muted hover:bg-accent justify-center rounded-xl"
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>Continue with GitHub</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs font-semibold gap-3 border-muted hover:bg-accent justify-center rounded-xl"
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-background px-2 text-[10px] uppercase font-bold text-muted-foreground">
              Or Instant Access
            </span>
          </div>

          {/* Guest Mode Option */}
          <Button
            type="button"
            onClick={() => handleOAuthLogin('guest')}
            className="w-full h-10 text-xs font-semibold gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md"
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>Continue as Instant Guest</span>
            <ArrowRight className="h-3.5 w-3.5 ml-auto" />
          </Button>

          <div className="pt-2 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Instant guest workspace saved locally in browser</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
