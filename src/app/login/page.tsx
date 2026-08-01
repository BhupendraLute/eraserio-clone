'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { GithubIcon, GoogleIcon } from '@/components/auth/OAuthIcons';
import { signIn, getProviders } from 'next-auth/react';
import { toast } from 'sonner';
import { safeCallbackUrl } from '@/lib/utils';

function LoginForm() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'));

  useEffect(() => {
    let cancelled = false;
    getProviders().then((result) => {
      if (cancelled) return;
      if (result) {
        setProviders(
          Object.values(result)
            .filter((p) => p.id === 'github' || p.id === 'google')
            .map((p) => ({ id: p.id, name: p.name }))
        );
      }
      setProvidersLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOAuthLogin = async (provider: string) => {
    setLoadingProvider(provider);
    try {
      const result = await signIn(provider, { callbackUrl, redirect: false });
      if (result?.error) {
        toast.error(`Sign-in failed. ${result.error}`);
      } else if (result?.ok) {
        toast.success('Signed in successfully!');
        router.push(callbackUrl);
      }
    } catch {
      toast.error('Could not reach the provider. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGuest = () => {
    toast.info('Continuing as guest — documents stay local in your browser.');
    router.push('/whiteboard');
  };

  const renderProviderButton = (provider: { id: string; name: string }) => {
    const isLoading = loadingProvider === provider.id;
    const Icon = provider.id === 'github' ? GithubIcon : GoogleIcon;
    return (
      <Button
        key={provider.id}
        variant="outline"
        disabled={loadingProvider !== null}
        onClick={() => handleOAuthLogin(provider.id)}
        className="h-11 text-xs font-semibold gap-3 border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800 justify-center rounded-xl"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon />
        )}
        <span>Continue with {provider.name}</span>
      </Button>
    );
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        {/* Top Back Link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Landing Page</span>
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-lg shadow-lg">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Sign In to Architecta</h1>
            <p className="text-xs text-slate-400">Diagram-as-code & whiteboards with AI</p>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          {providersLoading ? (
            <div className="flex h-11 items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Checking providers...</span>
            </div>
          ) : providers.length > 0 ? (
            providers.map(renderProviderButton)
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-400">
              No social providers configured yet. You can still continue as a guest.
            </div>
          )}
        </div>

        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-slate-900 px-2 text-[10px] uppercase font-bold text-slate-500">
            Or Instant Access
          </span>
        </div>

        <Button
          onClick={handleGuest}
          disabled={loadingProvider !== null}
          className="w-full h-11 text-xs font-semibold gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/30"
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span>Continue as Instant Guest</span>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>No password required — instant guest mode available</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
