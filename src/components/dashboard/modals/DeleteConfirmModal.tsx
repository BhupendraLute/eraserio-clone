'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

interface DeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle?: string;
  onConfirm: () => Promise<void> | void;
}

export function DeleteConfirmModal({
  open,
  onOpenChange,
  documentTitle = 'this document',
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Document?"
      description={
        <>
          Are you sure you want to delete <span className="font-semibold text-zinc-200">&quot;{documentTitle}&quot;</span>? This action cannot be undone.
        </>
      }
      variant="destructive"
      confirmLabel="Delete Document"
      confirmIcon={<Trash2 className="h-3.5 w-3.5" />}
      onConfirm={onConfirm}
    />
  );
}
