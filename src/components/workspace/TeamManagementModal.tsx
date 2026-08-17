'use client';

import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '@/lib/store/document-store';
import { Button } from '@/components/ui/button';
import { Users, Mail, UserPlus, ShieldCheck, Check, Copy, Trash2, Crown, Eye, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  token: string;
  createdAt: string;
}

interface TeamManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamManagementModal({ open, onOpenChange }: TeamManagementModalProps) {
  const activeWorkspaceId = useDocumentStore((s) => s.activeWorkspaceId);
  const [activeTab, setActiveTab] = useState<'members' | 'invite'>('members');

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !activeWorkspaceId) return;

    setIsLoading(true);
    fetch(`/api/workspaces/${activeWorkspaceId}/members`)
      .then((res) => res.json())
      .then((data) => {
        if (data.members) setMembers(data.members);
        if (data.invites) setInvites(data.invites);
        if (data.currentUserRole) setCurrentUserRole(data.currentUserRole);
      })
      .catch((err) => {
        console.error('Failed to load team members:', err);
      })
      .finally(() => setIsLoading(false));
  }, [open, activeWorkspaceId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !activeWorkspaceId) return;

    setIsInviting(true);
    setGeneratedInviteUrl(null);

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send invite');
        return;
      }

      setGeneratedInviteUrl(data.inviteUrl);
      toast.success(`Invite created for ${inviteEmail}!`);
      setInviteEmail('');

      // Refresh invites list
      fetch(`/api/workspaces/${activeWorkspaceId}/members`)
        .then((r) => r.json())
        .then((d) => {
          if (d.invites) setInvites(d.invites);
        });
    } catch {
      toast.error('Network error creating invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    if (!activeWorkspaceId) return;

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, newRole }),
      });

      if (!res.ok) {
        toast.error('Failed to update role');
        return;
      }

      setMembers((prev) =>
        prev.map((m) => (m.user.id === targetUserId ? { ...m, role: newRole as TeamMember['role'] } : m))
      );
      toast.success('Member role updated!');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!activeWorkspaceId) return;

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/members?userId=${targetUserId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        toast.error('Failed to remove member');
        return;
      }

      setMembers((prev) => prev.filter((m) => m.user.id !== targetUserId));
      toast.success('Member removed from team');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-xl border bg-background/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/15 text-blue-500">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Team & Organization Management</h2>
              <p className="text-xs text-muted-foreground">Manage organization members, roles, and remote access permissions</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 flex rounded-lg border bg-muted/40 p-1">
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-semibold transition-all',
              activeTab === 'members'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Team Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('invite')}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-semibold transition-all',
              activeTab === 'invite'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Invite Members
          </button>
        </div>

        {/* Tab 1: Members List */}
        {activeTab === 'members' && (
          <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Loading team members...</div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">No organization members found.</div>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-2xs transition-colors hover:border-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-xs">
                      {m.user.image ? (
                        <img src={m.user.image} alt={m.user.name || ''} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        (m.user.name || m.user.email || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        {m.user.name || 'Team Member'}
                        {m.role === 'OWNER' && <Crown className="h-3 w-3 text-amber-500" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{m.user.email}</div>
                    </div>
                  </div>

                  {/* Role Selector & Actions */}
                  <div className="flex items-center gap-2">
                    {m.role === 'OWNER' ? (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        OWNER
                      </span>
                    ) : (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleChangeRole(m.user.id, e.target.value)}
                        className="rounded-md border bg-background px-2 py-1 text-xs font-medium text-foreground shadow-xs focus:ring-1 focus:ring-primary"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {m.role}
                      </span>
                    )}

                    {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && m.role !== 'OWNER' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveMember(m.user.id)}
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Pending Invites List */}
            {invites.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pending Invitations ({invites.length})</h4>
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{inv.email}</span>
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.2 text-[9px] font-bold text-blue-500 border border-blue-500/20">{inv.role}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Invite Form */}
        {activeTab === 'invite' && (
          <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Role Permissions</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setInviteRole('MEMBER')}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all',
                    inviteRole === 'MEMBER'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-border text-muted-foreground hover:border-foreground'
                  )}
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="text-xs">MEMBER</span>
                  <span className="text-[9px] text-muted-foreground">Can view & edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInviteRole('ADMIN')}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all',
                    inviteRole === 'ADMIN'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold'
                      : 'border-border text-muted-foreground hover:border-foreground'
                  )}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs">ADMIN</span>
                  <span className="text-[9px] text-muted-foreground">Manage team & docs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInviteRole('VIEWER')}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all',
                    inviteRole === 'VIEWER'
                      ? 'border-slate-500 bg-slate-500/10 text-slate-600 dark:text-slate-400 font-bold'
                      : 'border-border text-muted-foreground hover:border-foreground'
                  )}
                >
                  <Eye className="h-4 w-4" />
                  <span className="text-xs">VIEWER</span>
                  <span className="text-[9px] text-muted-foreground">Read-only access</span>
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isInviting} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2">
              {isInviting ? 'Generating Invite Link...' : 'Create Invite Link'}
            </Button>

            {/* Generated Invite Link Box */}
            {generatedInviteUrl && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-2 animate-in fade-in duration-200">
                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Invite Link Generated</span>
                  <span className="text-[10px] text-emerald-500 font-bold">Valid for 7 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteUrl}
                    className="flex-1 rounded-md border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => copyToClipboard(generatedInviteUrl)}
                  >
                    {copiedToken ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
