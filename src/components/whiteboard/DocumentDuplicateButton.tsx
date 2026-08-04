'use client';

import React, { useState } from 'react';
import { useDocumentStore } from '@/lib/store/document-store';
import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  documentId: string;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

export function DocumentDuplicateButton({ documentId, variant = 'ghost', size = 'sm', className }: Props) {
  const duplicateDocument = useDocumentStore((s) => s.duplicateDocument);
  const [loading, setLoading] = useState(false);

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const newId = await duplicateDocument(documentId);
    setLoading(false);
    if (newId) {
      toast.success('Document duplicated successfully!');
    } else {
      toast.error('Failed to duplicate document.');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDuplicate}
      disabled={loading}
      className={className}
      title="Duplicate Document"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {size !== 'icon' && <span className="ml-1 text-xs">Duplicate</span>}
    </Button>
  );
}
