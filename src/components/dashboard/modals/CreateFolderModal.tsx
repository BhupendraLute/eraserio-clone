'use client';

import React, { useState } from 'react';
import { FolderPlus, Edit3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentStore, DashboardFolder } from '@/lib/store/document-store';

interface CreateFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderToEdit?: DashboardFolder | null;
}

const COLOR_OPTIONS = [
  { label: 'Blue', value: 'text-blue-400 bg-blue-500/20 border-blue-500/30' },
  { label: 'Purple', value: 'text-purple-400 bg-purple-500/20 border-purple-500/30' },
  { label: 'Emerald', value: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' },
  { label: 'Amber', value: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
  { label: 'Rose', value: 'text-rose-400 bg-rose-500/20 border-rose-500/30' },
  { label: 'Cyan', value: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30' },
];

export function CreateFolderModal({ open, onOpenChange, folderToEdit }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState(folderToEdit?.name || '');
  const [selectedColor, setSelectedColor] = useState(folderToEdit?.color || COLOR_OPTIONS[0].value);
  const [prevFolder, setPrevFolder] = useState<DashboardFolder | null | undefined>(folderToEdit);
  const createFolder = useDocumentStore((s) => s.createFolder);
  const renameFolder = useDocumentStore((s) => s.renameFolder);

  if (folderToEdit !== prevFolder) {
    setPrevFolder(folderToEdit);
    setFolderName(folderToEdit?.name || '');
    setSelectedColor(folderToEdit?.color || COLOR_OPTIONS[0].value);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      if (folderToEdit) {
        renameFolder(folderToEdit.id, folderName.trim());
      } else {
        createFolder(folderName.trim(), selectedColor);
      }
      setFolderName('');
      onOpenChange(false);
    }
  };

  const isEditing = !!folderToEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              {isEditing ? <Edit3 className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}
            </div>
            <DialogTitle className="text-lg font-extrabold tracking-tight text-white">
              {isEditing ? 'Rename Team Folder' : 'Create Team Folder'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            {isEditing
              ? 'Update the folder name to keep your workspace organized.'
              : 'Organize architecture documents into folders for your workspace team.'}
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

          {!isEditing && (
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Accent Color
              </label>
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    className={`h-7 w-7 rounded-lg flex items-center justify-center border transition-all ${
                      c.value
                    } ${selectedColor === c.value ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                  >
                    <span className="text-[10px] font-bold">{c.label.charAt(0)}</span>
                  </button>
                ))}
              </div>
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
              disabled={!folderName.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 h-9 rounded-xl shadow-md"
            >
              {isEditing ? 'Save Changes' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
