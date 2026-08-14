'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { GithubIcon, GoogleIcon } from './OAuthIcons';
import { signIn, getProviders } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'login' | 'signup';
}

type ProviderInfo = {
  id: string;
  name: string;
};

export function AuthModal({ open, onOpenChange, defaultTab = 'login' }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const router = useRouter();

  // Fetch the OAuth providers that are actually configured server-side.
  // Unconfigured providers (e.g. empty GOOGLE_CLIENT_ID) never appear.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getProviders().then((result) => {
      if (cancelled) return;
      if (result) {
        const configured = Object.values(result).filter(
          (p) => p.id === 'github' || p.id === 'google'
        );
        setProviders(configured.map((p) => ({ id: p.id, name: p.name })));
      }
      setProvidersLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleOAuth = async (provider: string) => {
    setLoadingProvider(provider);
    try {
      const result = await signIn(provider, {
        callbackUrl: '/dashboard/all',
        redirect: false,
      });
      if (result?.error) {
        toast.error(`Sign-in with ${provider} failed. Please try again.`);
      } else if (result?.ok) {
        toast.success(`Signed in with ${provider}!`);
        onOpenChange(false);
        router.push('/dashboard/all');
      }
    } catch {
      toast.error(`Could not reach the ${provider} provider. Please try again.`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGuest = () => {
    onOpenChange(false);
    toast.info('Continuing as guest — documents stay local in your browser.');
    router.push('/dashboard/all');
  };

  // Keep the active tab + provider loading state in sync with the requested
  // `defaultTab` every time the dialog (re)opens — including programmatic opens
  // from the parent, which don't fire base-ui's onOpenChange. This follows
  // React's documented "adjusting state when a prop changes" pattern.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setTab(defaultTab);
      setProvidersLoading(true);
    }
  }

  const renderProviderButton = (provider: ProviderInfo) => {
    const isLoading = loadingProvider === provider.id;
    const Icon = provider.id === 'github' ? GithubIcon : GoogleIcon;
    return (
      <Button
        key={provider.id}
        type="button"
        variant="outline"
        className="h-10 w-full text-xs font-semibold gap-3 border-muted hover:bg-accent justify-center rounded-xl"
        onClick={() => handleOAuth(provider.id)}
        disabled={loadingProvider !== null}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon />
        )}
        <span>
          {tab === 'login' ? 'Continue' : 'Sign up'} with {provider.name}
        </span>
      </Button>
    );
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
            {tab === 'login' ? 'Welcome Back to Architecta' : 'Welcome to Architecta'}
          </DialogTitle>
          <DialogDescription className="text-xs text-blue-100 mt-1">
            {tab === 'login'
              ? 'Sign in with your preferred account to sync diagrams across devices'
              : 'Create an account to save diagrams securely to the cloud'}
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4">
          {/* Login / Signup Tabs */}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v === 'signup' ? 'signup' : 'login')}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Social OAuth Providers */}
          <div className="flex flex-col gap-3">
            {providersLoading ? (
              <div className="flex h-10 items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Checking providers...</span>
              </div>
            ) : providers.length > 0 ? (
              providers.map(renderProviderButton)
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                No social providers configured yet. You can still continue as a guest.
              </div>
            )}
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
            onClick={handleGuest}
            disabled={loadingProvider !== null}
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
