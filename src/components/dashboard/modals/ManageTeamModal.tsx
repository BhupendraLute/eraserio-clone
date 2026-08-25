'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Users, UserPlus, Mail, Copy, Check, Shield, Trash2, Send, Loader2, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { useDocumentStore } from '@/lib/store/document-store';
import { RemoveMemberConfirmModal } from './RemoveMemberConfirmModal';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

import { useEffect } from 'react';
import { toast } from 'sonner';

interface ManageTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceName?: string;
  workspaceId?: string | null;
}

interface MockMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  avatar?: string;
}

export function ManageTeamModal({
  open,
  onOpenChange,
  workspaceName,
  workspaceId,
}: ManageTeamModalProps) {
  const { data: session } = useSession();
  const storeWorkspaceId = useDocumentStore((s) => s.activeWorkspaceId);
  const currentWorkspaceId = workspaceId || storeWorkspaceId;
  const [activeTab, setActiveTab] = useState<'members' | 'invite'>('members');

  // Permissions state
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER');
  const [canAdmin, setCanAdmin] = useState<boolean>(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<MockMember | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  const handleLeaveWorkspace = async () => {
    if (!currentWorkspaceId) return;
    try {
      await useDocumentStore.getState().leaveWorkspace(currentWorkspaceId);
      toast.success(`You have left ${workspaceName || 'the workspace'}`);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to leave workspace';
      toast.error(msg);
    }
  };

  // Members state
  const currentUserName = session?.user?.name || 'You';
  const currentUserEmail = session?.user?.email || 'user@example.com';
  const currentUserImage = session?.user?.image || undefined;

  const [members, setMembers] = useState<MockMember[]>([
    {
      id: 'm-current',
      name: currentUserName,
      email: currentUserEmail,
      role: 'OWNER',
      avatar: currentUserImage,
    },
  ]);

  useEffect(() => {
    if (!open || !currentWorkspaceId) return;

    fetch(`/api/workspaces/${currentWorkspaceId}/members`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) {
          setMembers(
            data.members.map((m: { id: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'; user: { name: string | null; email: string | null; image: string | null } }) => ({
              id: m.id,
              name: m.user.name || m.user.email || 'Member',
              email: m.user.email || '',
              role: m.role,
              avatar: m.user.image || undefined,
            }))
          );
          if (data.currentUserRole) setCurrentUserRole(data.currentUserRole);
          setCanAdmin(data.canAdmin ?? (data.currentUserRole === 'OWNER' || data.currentUserRole === 'ADMIN'));
        }
      })
      .catch(() => {});
  }, [open, currentWorkspaceId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsGenerating(true);
    try {
      if (currentWorkspaceId) {
        const res = await fetch(`/api/workspaces/${currentWorkspaceId}/invites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.inviteUrl) {
            setGeneratedLink(data.inviteUrl);
            toast.success(`Invite sent to ${inviteEmail.trim()}`);
            return;
          }
        }
      }

      // Offline / guest invite fallback URL
      const mockToken = Math.random().toString(36).substring(2, 10);
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://architecta.app';
      const fallbackUrl = `${origin}/invite/${mockToken}?email=${encodeURIComponent(inviteEmail.trim())}&role=${inviteRole}`;
      setGeneratedLink(fallbackUrl);

      // Add to local member list for preview
      setMembers((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          name: inviteEmail.split('@')[0],
          email: inviteEmail.trim(),
          role: inviteRole,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    if (currentWorkspaceId) {
      try {
        const res = await fetch(`/api/workspaces/${currentWorkspaceId}/members`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, role: newRole }),
        });
        if (res.ok) {
          toast.success(`Role updated to ${newRole}`);
        } else {
          toast.error('Failed to update role');
          return;
        }
      } catch {
        toast.error('Network error');
        return;
      }
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    if (currentWorkspaceId) {
      try {
        const res = await fetch(`/api/workspaces/${currentWorkspaceId}/members?memberId=${memberToRemove.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          toast.success(`${memberToRemove.name} removed from team`);
        } else {
          toast.error('Failed to remove member');
          return;
        }
      } catch {
        toast.error('Network error');
        return;
      }
    }
    setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
    setMemberToRemove(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-extrabold tracking-tight text-white">
              {workspaceName ? `${workspaceName} Team` : 'Workspace Team & Members'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Manage teammates, roles, and collaborative permissions for this workspace.
          </DialogDescription>
        </DialogHeader>

        {/* Tab navigation */}
        <div className="flex border-b border-zinc-800 gap-4 mt-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-2 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
              activeTab === 'members'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Members ({members.length})</span>
          </button>
          {canAdmin && (
            <button
              onClick={() => setActiveTab('invite')}
              className={`pb-2 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
                activeTab === 'invite'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Invite Teammates</span>
            </button>
          )}
        </div>

        {/* Tab 1: Members List */}
        {activeTab === 'members' && (
          <div className="py-3 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {member.avatar ? (
                    <Image
                      src={member.avatar}
                      alt={member.name}
                      width={32}
                      height={32}
                      unoptimized
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-zinc-700"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-xs">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-zinc-200 truncate flex items-center gap-1.5">
                      <span>{member.name}</span>
                      {member.role === 'OWNER' && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 text-[9px] font-bold">
                          OWNER
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">{member.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {member.role === 'OWNER' ? (
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                      <Shield className="h-3 w-3 text-amber-400" />
                      <span>Owner</span>
                    </span>
                  ) : canAdmin ? (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER')}
                        className="h-7 px-2 rounded-lg bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <button
                        onClick={() => setMemberToRemove(member)}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Remove Member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        member.role === 'ADMIN'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : member.role === 'MEMBER'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Invite Teammates */}
        {activeTab === 'invite' && (
          <div className="py-2 space-y-4">
            <form onSubmit={handleSendInvite} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Team Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER')}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="MEMBER">Member (Can create, edit, and export diagrams)</option>
                  <option value="VIEWER">Viewer (Can view and comment only)</option>
                  <option value="ADMIN">Admin (Full workspace administration)</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={!inviteEmail.trim() || isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 rounded-xl shadow-md gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating Invite...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Invite & Create Link</span>
                  </>
                )}
              </Button>
            </form>

            {generatedLink && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-400">
                  <span>Shareable Invite Link</span>
                  <span className="text-[10px] text-zinc-400">Expires in 7 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 h-8 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 focus:outline-none select-all"
                  />
                  <Button
                    type="button"
                    onClick={handleCopy}
                    className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          {currentUserRole !== 'OWNER' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLeaveModalOpen(true)}
              className="h-8 text-xs border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/15 hover:text-amber-300 gap-1.5 cursor-pointer rounded-xl"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Leave Workspace</span>
            </Button>
          ) : (
            <div />
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Close
          </Button>
        </div>

        {/* Custom Shadcn UI Remove Member Confirmation Modal */}
        <RemoveMemberConfirmModal
          open={!!memberToRemove}
          onOpenChange={(open) => !open && setMemberToRemove(null)}
          memberName={memberToRemove?.name || memberToRemove?.email || 'Team Member'}
          memberEmail={memberToRemove?.email}
          memberRole={memberToRemove?.role}
          memberImage={memberToRemove?.avatar}
          workspaceName={workspaceName}
          onConfirm={handleConfirmRemoveMember}
        />

        {/* Leave Workspace Confirmation Modal */}
        <ConfirmationModal
          open={leaveModalOpen}
          onOpenChange={setLeaveModalOpen}
          title="Leave Workspace Team?"
          description={
            <>
              Are you sure you want to leave <strong className="text-zinc-200">&quot;{workspaceName || 'this workspace'}&quot;</strong>? You will lose access to all documents and whiteboards in this workspace until an admin invites you back.
            </>
          }
          icon={<LogOut className="h-5 w-5 text-amber-400" />}
          variant="warning"
          confirmLabel="Leave Workspace"
          confirmIcon={<LogOut className="h-3.5 w-3.5" />}
          onConfirm={handleLeaveWorkspace}
        />
      </DialogContent>
    </Dialog>
  );
}
