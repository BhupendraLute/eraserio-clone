'use client';

import React, { useState } from 'react';
import { Send, UserPlus, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface InviteTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteTeamModal({ open, onOpenChange }: InviteTeamModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'VIEWER' | 'ADMIN'>('MEMBER');
  const [sent, setSent] = useState(false);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setEmail('');
        onOpenChange(false);
      }, 1500);
    }
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
          <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 animate-bounce" />
            <div className="text-sm font-bold text-white">Invitation Sent!</div>
            <p className="text-xs text-zinc-400">
              An invitation email has been dispatched to <span className="text-blue-400 font-mono">{email}</span>.
            </p>
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
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="MEMBER">Member (Can edit and create diagrams)</option>
                <option value="VIEWER">Viewer (Can view and comment only)</option>
                <option value="ADMIN">Admin (Full workspace administration)</option>
              </select>
            </div>

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
                disabled={!email.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5 px-5 h-9 rounded-xl shadow-md"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Invite</span>
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
