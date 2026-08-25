import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Shield, Mail, Trash2, Copy, RefreshCw, X, Building2, Search, CheckCircle2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useDocumentStore } from '@/lib/store/document-store';
import { InviteTeamModal } from './modals/InviteTeamModal';
import { RemoveMemberConfirmModal } from './modals/RemoveMemberConfirmModal';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

interface Member {
  id: string;
  role: string;
  createdAt: string;
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
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export function TeamManagementHub() {
  const activeWorkspaceId = useDocumentStore((s) => s.activeWorkspaceId);
  const workspaces = useDocumentStore((s) => s.workspaces);
  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER');
  const [canAdmin, setCanAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  const workspaceId = currentWorkspace?.id;

  const handleLeaveWorkspace = async () => {
    if (!workspaceId) return;
    try {
      await useDocumentStore.getState().leaveWorkspace(workspaceId);
      toast.success(`You have left ${currentWorkspace?.name || 'the workspace'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to leave workspace';
      toast.error(msg);
    }
  };

  const loadData = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/members`),
        fetch(`/api/workspaces/${workspaceId}/invites`),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
        if (data.currentUserRole) setCurrentUserRole(data.currentUserRole);
        setCanAdmin(data.canAdmin ?? (data.currentUserRole === 'OWNER' || data.currentUserRole === 'ADMIN'));
      }

      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvites(data.invites || []);
      }
    } catch {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      if (!workspaceId) {
        if (!ignore) setLoading(false);
        return;
      }

      try {
        const [membersRes, invitesRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/members`),
          fetch(`/api/workspaces/${workspaceId}/invites`),
        ]);

        if (!ignore && membersRes.ok) {
          const data = await membersRes.json();
          setMembers(data.members || []);
          if (data.currentUserRole) setCurrentUserRole(data.currentUserRole);
          setCanAdmin(data.canAdmin ?? (data.currentUserRole === 'OWNER' || data.currentUserRole === 'ADMIN'));
        }

        if (!ignore && invitesRes.ok) {
          const data = await invitesRes.json();
          setInvites(data.invites || []);
        }
      } catch {
        if (!ignore) toast.error('Failed to load team data');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void fetchData();
    return () => {
      ignore = true;
    };
  }, [workspaceId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const start = Date.now();
    await loadData();
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, 500 - elapsed);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Team member & invite data refreshed');
    }, remaining);
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      if (res.ok) {
        toast.success(`Role updated to ${newRole}`);
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update role');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!workspaceId || !memberToRemove) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members?memberId=${memberToRemove.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(`${memberToRemove.user.name || 'Member'} removed from team`);
        setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
        setMemberToRemove(null);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove member');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleRevokeInvite = async (inviteId: string, email: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invites?inviteId=${inviteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.info(`Invitation for ${email} revoked`);
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      } else {
        toast.error('Failed to revoke invite');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    void navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.user.name?.toLowerCase().includes(q) ||
      m.user.email?.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  const filteredInvites = invites.filter((i) => i.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-zinc-900/60 border border-zinc-800 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-inner">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">{currentWorkspace?.name || 'Organization Team'}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider">
                Multi-Tenant Enterprise
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Manage organization members, assign access permissions, and manage pending invitations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || isRefreshing}
            onClick={handleManualRefresh}
            className="h-9 px-3 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5 rounded-xl transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading || isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
          {currentUserRole !== 'OWNER' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLeaveModalOpen(true)}
              className="h-9 px-3.5 text-xs border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/15 hover:text-amber-300 gap-1.5 rounded-xl transition-all cursor-pointer"
              title="Leave this workspace team"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Leave Workspace</span>
            </Button>
          )}
          {canAdmin && (
            <Button
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              className="h-9 px-4 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-950/40 gap-1.5 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Team Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#161618] border border-zinc-800/80 shadow-md flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{members.length}</div>
            <div className="text-xs text-zinc-400 font-medium">Active Team Members</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#161618] border border-zinc-800/80 shadow-md flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{invites.length}</div>
            <div className="text-xs text-zinc-400 font-medium">Pending Invitations</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#161618] border border-zinc-800/80 shadow-md flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {members.filter((m) => m.role === 'OWNER' || m.role === 'ADMIN').length}
            </div>
            <div className="text-xs text-zinc-400 font-medium">Organization Admins</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'members'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Team Members ({members.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'invites'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Pending Invites ({invites.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input
            placeholder={`Search ${activeTab === 'members' ? 'members' : 'invites'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-[#161618] border-zinc-800 text-zinc-200 focus:border-blue-500 rounded-xl"
          />
        </div>
      </div>

      {/* Tab 1: Active Members Table */}
      {activeTab === 'members' && (
        <div className="rounded-2xl border border-zinc-800/80 bg-[#161618] overflow-hidden shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-900/50">
                <th className="py-3.5 px-6">Member</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Joined</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold flex items-center justify-center shadow-md">
                        {member.user.name ? member.user.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{member.user.name || 'Anonymous User'}</div>
                        <div className="text-[11px] text-zinc-400">{member.user.email || 'No email registered'}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    {member.role === 'OWNER' ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                        <Shield className="h-3 w-3 text-amber-400" /> Owner
                      </span>
                    ) : canAdmin ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                        className="bg-[#1e1e24] border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2.5 py-1 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    ) : (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
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
                  </td>

                  <td className="py-4 px-4 text-zinc-400 font-mono text-[11px]">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>

                  <td className="py-4 px-6 text-right">
                    {canAdmin && member.role !== 'OWNER' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMemberToRemove(member)}
                        className="h-8 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg gap-1 cursor-pointer"
                        title="Remove team member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}

              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-zinc-500 text-xs">
                    No team members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Pending Invitations Table */}
      {activeTab === 'invites' && (
        <div className="rounded-2xl border border-zinc-800/80 bg-[#161618] overflow-hidden shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-900/50">
                <th className="py-3.5 px-6">Invited Email</th>
                <th className="py-3.5 px-4">Assigned Role</th>
                <th className="py-3.5 px-4">Sent Date</th>
                <th className="py-3.5 px-6 text-right">Invite Link / Revoke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {filteredInvites.map((invite) => (
                <tr key={invite.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-white">{invite.email}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        invite.role === 'ADMIN'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : invite.role === 'MEMBER'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30'
                      }`}
                    >
                      {invite.role}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-zinc-400 font-mono text-[11px]">
                    {new Date(invite.createdAt).toLocaleDateString()}
                  </td>

                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteLink(invite.token)}
                        className="h-8 px-2.5 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1 rounded-lg"
                      >
                        {copiedToken === invite.token ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </Button>

                      {canAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite.id, invite.email)}
                          className="h-8 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg gap-1 cursor-pointer"
                          title="Revoke invite token"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Revoke</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredInvites.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-zinc-500 text-xs">
                    No pending invitations sent yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Team Modal */}
      <InviteTeamModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />

      {/* Custom Shadcn UI Remove Member Confirmation Modal */}
      <RemoveMemberConfirmModal
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        memberName={memberToRemove?.user.name || memberToRemove?.user.email || 'Team Member'}
        memberEmail={memberToRemove?.user.email}
        memberRole={memberToRemove?.role}
        memberImage={memberToRemove?.user.image}
        workspaceName={currentWorkspace?.name}
        onConfirm={handleConfirmRemoveMember}
      />

      {/* Leave Workspace Confirmation Modal */}
      <ConfirmationModal
        open={leaveModalOpen}
        onOpenChange={setLeaveModalOpen}
        title="Leave Workspace Team?"
        description={
          <>
            Are you sure you want to leave <strong className="text-zinc-200">&quot;{currentWorkspace?.name || 'this workspace'}&quot;</strong>? You will lose access to all documents and whiteboards in this workspace until an admin invites you back.
          </>
        }
        icon={<LogOut className="h-5 w-5 text-amber-400" />}
        variant="warning"
        confirmLabel="Leave Workspace"
        confirmIcon={<LogOut className="h-3.5 w-3.5" />}
        onConfirm={handleLeaveWorkspace}
      />
    </div>
  );
}
