'use client';

import React, { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/lib/store/document-store';

interface CreateFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFolderModal({ open, onOpenChange }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const createFolder = useDocumentStore((s) => s.createFolder);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      createFolder(folderName.trim());
      setFolderName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <FolderPlus className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-extrabold tracking-tight text-white">
              Create Team Folder
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Organize architecture documents into folders for your workspace team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Infrastructure & AWS"
              autoFocus
              className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
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
              disabled={!folderName.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 h-9 rounded-xl shadow-md"
            >
              Create Folder
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
