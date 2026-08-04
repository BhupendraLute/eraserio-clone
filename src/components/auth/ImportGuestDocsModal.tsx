'use client';

import React, { useState } from 'react';
import { useDocumentStore } from '@/lib/store/document-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CloudUpload, Trash2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function ImportGuestDocsModal() {
  const hasPendingGuestDocs = useDocumentStore((s) => s.hasPendingGuestDocs);
  const importGuestDocuments = useDocumentStore((s) => s.importGuestDocuments);
  const clearGuestDocuments = useDocumentStore((s) => s.clearGuestDocuments);

  const [loading, setLoading] = useState(false);

  if (!hasPendingGuestDocs) return null;

  const handleImport = async () => {
    setLoading(true);
    const success = await importGuestDocuments();
    setLoading(false);
    if (success) {
      toast.success('Offline documents imported to your cloud account!');
    } else {
      toast.error('Failed to import guest documents.');
    }
  };

  const handleDiscard = () => {
    clearGuestDocuments();
    toast.info('Guest drafts cleared.');
  };

  return (
    <Dialog open={hasPendingGuestDocs} onOpenChange={() => {}}>
      <DialogContent className="max-w-md rounded-xl p-6">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
            <CloudUpload className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-bold">Unsaved Offline Documents Found</DialogTitle>
          <DialogDescription className="mt-1.5 text-xs text-muted-foreground">
            We found offline draft documents created while you were signed out. Would you like to save and import them into your cloud account?
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-lg border bg-muted/40 p-3.5 text-xs text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
          <span>Imported documents will automatically sync across all your devices.</span>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDiscard}
            disabled={loading}
            className="text-muted-foreground hover:text-destructive gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Discard Drafts
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={loading}
            className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
            {loading ? 'Importing…' : 'Import to Cloud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
