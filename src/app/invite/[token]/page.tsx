'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptInvite = async () => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/workspaces/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to accept invitation');
        toast.error(data.error || 'Failed to accept invitation');
        return;
      }

      toast.success(`Joined workspace "${data.workspace.name}"! Redirecting...`);
      setTimeout(() => {
        router.push(`/workspace/${data.workspace.id}`);
      }, 1000);
    } catch {
      setError('Network error processing invitation');
      toast.error('Network error processing invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 select-none">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg text-xl font-black">
          A
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Team Invitation</h1>
          <p className="mt-1 text-sm text-muted-foreground">You have been invited to join an organization on Architecta</p>
        </div>

        {/* Feature Highlights */}
        <div className="rounded-xl border bg-muted/40 p-4 space-y-3 text-left">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-500 shrink-0" />
            <span className="text-xs font-medium text-foreground">Secure Multi-Tenant Work Isolation</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-purple-500 shrink-0" />
            <span className="text-xs font-medium text-foreground">Role-Based Organization Permissions</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <span className="text-xs font-medium text-foreground">Real-time Multiplayer Collaboration</span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Accept Trigger Button */}
        <Button
          onClick={handleAcceptInvite}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 text-sm shadow-md gap-2"
        >
          <span>{isSubmitting ? 'Joining Team...' : 'Accept Invitation & Join Team'}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
