'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Sparkles, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useDocumentStore } from '@/lib/store/document-store';

import { useSession } from 'next-auth/react';

interface PendingInvite {
  id: string;
  token: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  inviter?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  workspace: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  };
}

export function PendingInvitesBanner() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loadingToken, setLoadingToken] = useState<string | null>(null);
  const router = useRouter();
  const fetchWorkspaces = useDocumentStore((s) => s.fetchWorkspaces);

  useEffect(() => {
    let ignore = false;
    const fetchInvites = async () => {
      try {
        const url = userEmail
          ? `/api/workspaces/invites/pending?email=${encodeURIComponent(userEmail)}`
          : '/api/workspaces/invites/pending';
        const res = await fetch(url);
        if (res.ok && !ignore) {
          const data = await res.json();
          setInvites(data.invites || []);
        }
      } catch (err) {
        console.warn('[PendingInvitesBanner] Network error fetching pending invites:', err);
      }
    };

    void fetchInvites();
    // Poll for pending invites every 10 seconds
    const interval = setInterval(() => {
      void fetchInvites();
    }, 10000);

    const handleFocus = () => {
      void fetchInvites();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      ignore = true;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userEmail]);

  const handleRespond = async (token: string, action: 'accept' | 'decline') => {
    setLoadingToken(token);
    try {
      const res = await fetch('/api/workspaces/invites/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (action === 'accept') {
          toast.success(data.message || 'Invitation accepted!');
          await fetchWorkspaces();
          if (data.workspaceId) {
            router.push(`/workspace/${data.workspaceId}`);
          }
        } else {
          toast.info('Invitation declined');
        }
        setInvites((prev) => prev.filter((i) => i.token !== token));
      } else {
        toast.error(data.error || 'Failed to process invitation');
      }
    } catch {
      toast.error('Network error processing invitation');
    } finally {
      setLoadingToken(null);
    }
  };

  if (invites.length === 0) return null;

  return (
    <div className="w-full space-y-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {invites.map((invite) => {
        const inviterUser = invite.inviter || invite.workspace.owner;
        const inviterName = inviterUser.name || 'Team Admin';
        const inviterEmail = inviterUser.email || '';
        const inviterInitial = inviterName.charAt(0).toUpperCase();

        return (
          <div
            key={invite.id}
            className="relative flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4 rounded-2xl bg-gradient-to-r from-blue-950/50 via-purple-950/30 to-zinc-900/70 border border-blue-500/40 shadow-2xl backdrop-blur-xl overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-4 min-w-0 z-10">
              {/* User A Inviter Avatar / Shareable Profile */}
              {inviterUser.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inviterUser.image}
                  alt={inviterName}
                  className="h-12 w-12 rounded-2xl object-cover border-2 border-blue-500/40 shadow-md shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white font-extrabold text-lg flex items-center justify-center border-2 border-blue-500/40 shadow-md shrink-0">
                  {inviterInitial}
                </div>
              )}

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Team Invitation
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                      invite.role === 'ADMIN'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : invite.role === 'MEMBER'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-zinc-700/30 text-zinc-300 border-zinc-600/40'
                    }`}
                  >
                    {invite.role}
                  </span>
                </div>

                <h3 className="text-base font-black text-white truncate flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>{invite.workspace.name}</span>
                </h3>

                <p className="text-xs text-zinc-300 font-medium truncate">
                  Invited by <strong className="text-white">{inviterName}</strong>{' '}
                  {inviterEmail && <span className="text-zinc-400 font-mono text-[11px]">({inviterEmail})</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 z-10 w-full md:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingToken === invite.token}
                onClick={() => handleRespond(invite.token, 'decline')}
                className="h-9 px-3.5 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl gap-1.5 font-semibold"
              >
                <X className="h-3.5 w-3.5 text-zinc-400" />
                <span>Decline</span>
              </Button>
              <Button
                size="sm"
                disabled={loadingToken === invite.token}
                onClick={() => handleRespond(invite.token, 'accept')}
                className="h-9 px-4 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-950/40 gap-1.5 transition-all"
              >
                <Check className="h-4 w-4" />
                <span>Accept & Join Workspace</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
