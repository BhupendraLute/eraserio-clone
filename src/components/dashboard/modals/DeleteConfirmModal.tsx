'use client';

import React, { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-zinc-800 bg-[#161618] text-zinc-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <Trash2 className="h-5 w-5" />
          </div>
          <DialogTitle className="text-base font-bold text-white tracking-tight">
            Delete Document?
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-zinc-200">"{documentTitle}"</span>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="h-9 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="h-9 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs gap-1.5 rounded-lg shadow-sm"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>Delete Document</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
