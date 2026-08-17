'use client';

import React from 'react';
import { UserMinus, Mail } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

interface RemoveMemberConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberEmail?: string | null;
  memberRole?: string | null;
  memberImage?: string | null;
  workspaceName?: string;
  onConfirm: () => Promise<void> | void;
}

export function RemoveMemberConfirmModal({
  open,
  onOpenChange,
  memberName,
  memberEmail,
  memberRole,
  memberImage,
  workspaceName,
  onConfirm,
}: RemoveMemberConfirmModalProps) {
  const initial = memberName ? memberName.charAt(0).toUpperCase() : 'U';

  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      title="Remove Team Member?"
      description={
        <>
          Are you sure you want to remove this member from{' '}
          <strong className="text-zinc-200">{workspaceName || 'this workspace'}</strong>?
          They will immediately lose access to all documents, whiteboards, and diagrams.
        </>
      }
      icon={<UserMinus className="h-5 w-5 text-red-400" />}
      variant="destructive"
      confirmLabel="Remove Member"
      confirmIcon={<UserMinus className="h-3.5 w-3.5" />}
      onConfirm={onConfirm}
    >
      {/* Member Profile Preview Card */}
      <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {memberImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={memberImage}
              alt={memberName}
              className="h-10 w-10 rounded-xl object-cover border border-zinc-700 shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-sm flex items-center justify-center border border-zinc-700 shrink-0">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{memberName}</div>
            {memberEmail && (
              <div className="text-xs text-zinc-400 truncate flex items-center gap-1">
                <Mail className="h-3 w-3 text-zinc-500" />
                <span>{memberEmail}</span>
              </div>
            )}
          </div>
        </div>

        {memberRole && (
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${
              memberRole === 'ADMIN'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : memberRole === 'MEMBER'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {memberRole}
          </span>
        )}
      </div>
    </ConfirmationModal>
  );
}
