'use client';

import React, { useState } from 'react';
import { Send, UserPlus, CheckCircle2, Copy, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/lib/store/document-store';

import { toast } from 'sonner';

interface InviteTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string | null;
}

export function InviteTeamModal({ open, onOpenChange, workspaceId }: InviteTeamModalProps) {
  const storeWorkspaceId = useDocumentStore((s) => s.activeWorkspaceId);
  const workspaces = useDocumentStore((s) => s.workspaces);
  const activeWorkspaceId = workspaceId || storeWorkspaceId || workspaces[0]?.id;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'VIEWER' | 'ADMIN'>('MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (!activeWorkspaceId) {
        setErrorMessage('No active workspace found. Please select or create a workspace first.');
        toast.error('No active workspace found');
        return;
      }

      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));

      if (res.ok && data.inviteUrl) {
        setGeneratedLink(data.inviteUrl);
        setSent(true);
        toast.success(data.message || `Invitation created for ${email.trim()}`);
      } else {
        const errorMsg = data.error || 'Failed to send invitation. Please try again.';
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('[InviteTeamModal] Submit Error:', err);
      const errorMsg = 'Network error occurred while sending invite';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setSent(false);
    setEmail('');
    setGeneratedLink(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <UserPlus className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-extrabold tracking-tight text-white">
              Invite Team Members
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Invite teammates to view, comment, and edit diagrams in your workspace.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="py-4 space-y-4 text-center">
            <div className="flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 animate-bounce" />
              <div className="text-sm font-bold text-white">Invitation Dispatched!</div>
              <p className="text-xs text-zinc-400">
                An invitation email has been sent to <span className="text-blue-400 font-mono">{email}</span>.
              </p>
            </div>

            {generatedLink && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 space-y-2 text-left">
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

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleReset}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-4 h-8 rounded-xl"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="space-y-4 py-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Teammate Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Workspace Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'MEMBER' | 'VIEWER' | 'ADMIN')}
                className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="MEMBER">Member (Can edit and create diagrams)</option>
                <option value="VIEWER">Viewer (Can view and comment only)</option>
                <option value="ADMIN">Admin (Full workspace administration)</option>
              </select>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!email.trim() || isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5 px-5 h-9 rounded-xl shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Invite</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
