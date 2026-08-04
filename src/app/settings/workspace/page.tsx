'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  Building2,
  UserPlus,
  Mail,
  Copy,
  Check,
  Shield,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsNav } from '@/components/settings/SettingsNav';

interface WorkspaceItem {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  _count: {
    documents: number;
    members: number;
  };
}

export default function WorkspaceSettingsPage() {
  const { data: session, status } = useSession();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  // Member invite states
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/workspaces');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setWorkspaces(data.workspaces || []);
            if (data.workspaces?.length > 0) {
              setSelectedWorkspaceId(data.workspaces[0].id);
            }
          }
        }
      } catch {
        // offline
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create workspace');

      setWorkspaces((prev) => [data.workspace, ...prev]);
      setSelectedWorkspaceId(data.workspace.id);
      setNewWorkspaceName('');
      toast.success('Workspace created successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId || !inviteEmail.trim()) return;

    setInviting(true);
    setGeneratedInviteUrl(null);
    try {
      const res = await fetch(`/api/workspaces/${selectedWorkspaceId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invite');

      setGeneratedInviteUrl(data.inviteUrl);
      setInviteEmail('');
      toast.success('Invite link generated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedInviteUrl) {
      navigator.clipboard.writeText(generatedInviteUrl);
      setCopied(true);
      toast.success('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex items-center gap-3">
          <Link href="/whiteboard">
            <span className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </span>
          </Link>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm font-bold text-xs">
            A
          </div>
          <span className="text-sm font-semibold text-foreground">Workspace Settings</span>
        </div>
        <SettingsNav active="workspace" />
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          {/* Workspaces Overview */}
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-bold text-foreground">Your Workspaces</h2>
              </div>
            </div>

            <div className="space-y-3">
              {workspaces.length === 0 ? (
                <div className="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">
                  No workspaces found. Create your first team workspace below!
                </div>
              ) : (
                workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => setSelectedWorkspaceId(ws.id)}
                    className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                      selectedWorkspaceId === ws.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'bg-card hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground flex items-center gap-2">
                          {ws.name}
                          {ws.ownerId === session?.user?.id && (
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
                              Owner
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {ws._count?.documents || 0} document(s) · {ws._count?.members || 1} member(s)
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Create New Workspace */}
            <form onSubmit={handleCreateWorkspace} className="mt-4 flex gap-2">
              <Input
                placeholder="New workspace name…"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="h-9 text-xs"
              />
              <Button type="submit" size="sm" disabled={creating || !newWorkspaceName.trim()} className="gap-1.5 shrink-0">
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create
              </Button>
            </form>
          </section>

          {/* Member Invitations */}
          {selectedWorkspaceId && (
            <section className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-bold text-foreground">Invite Team Members</h2>
              </div>

              <div className="rounded-xl border bg-card p-5 space-y-4">
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Member Email Address
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="teammate@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="h-9 text-xs pl-9"
                          required
                        />
                      </div>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER')}
                        className="h-9 rounded-md border bg-background px-3 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="MEMBER">Member (Editor)</option>
                        <option value="ADMIN">Admin</option>
                        <option value="VIEWER">Viewer (Read Only)</option>
                      </select>
                    </div>
                  </div>

                  <Button type="submit" size="sm" disabled={inviting || !inviteEmail.trim()} className="gap-1.5">
                    {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                    Generate Invite Link
                  </Button>
                </form>

                {generatedInviteUrl && (
                  <div className="rounded-lg border bg-muted/40 p-3.5 space-y-2 border-emerald-500/30">
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      Invite Link Created (Valid for 7 days)
                    </div>
                    <div className="flex items-center gap-2">
                      <Input value={generatedInviteUrl} readOnly className="h-8 text-xs font-mono bg-background" />
                      <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-1.5 shrink-0">
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
