'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DashboardFolder } from '@/lib/store/document-store';

interface DeleteFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: DashboardFolder | null;
  documentsCount: number;
  onConfirm: (deleteContents: boolean) => void;
}

export function DeleteFolderModal({
  open,
  onOpenChange,
  folder,
  documentsCount,
  onConfirm,
}: DeleteFolderModalProps) {
  const [deleteContents, setDeleteContents] = useState(false);

  if (!folder) return null;

  const handleDelete = () => {
    onConfirm(deleteContents);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center">
              <Trash2 className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-extrabold tracking-tight text-white">
              Delete Folder
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Are you sure you want to delete <span className="font-semibold text-zinc-200">&quot;{folder.name}&quot;</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3 text-xs">
          {documentsCount > 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>This folder contains {documentsCount} document{documentsCount > 1 ? 's' : ''}.</span>
              </div>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 hover:text-white">
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={!deleteContents}
                    onChange={() => setDeleteContents(false)}
                    className="accent-blue-600"
                  />
                  <span>Keep documents (Move to Unsorted)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 hover:text-white">
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={deleteContents}
                    onChange={() => setDeleteContents(true)}
                    className="accent-red-600"
                  />
                  <span className="text-red-400">Delete all {documentsCount} document{documentsCount > 1 ? 's' : ''} permanently</span>
                </label>
              </div>
            </div>
          ) : (
            <p className="text-zinc-400 text-xs">
              This folder is currently empty. Deleting it will remove it from your workspace.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 h-9 rounded-xl shadow-md"
            >
              Delete Folder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
