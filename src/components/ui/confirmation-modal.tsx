'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'destructive' | 'warning' | 'primary' | 'neutral';
  confirmLabel?: string;
  cancelLabel?: string;
  confirmIcon?: React.ReactNode;
  children?: React.ReactNode;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  variant = 'destructive',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmIcon,
  children,
  onConfirm,
}: ConfirmationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          buttonClass: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40',
          defaultIcon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
        };
      case 'primary':
        return {
          iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          buttonClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/40',
          defaultIcon: <AlertTriangle className="h-5 w-5 text-blue-400" />,
        };
      case 'neutral':
        return {
          iconBg: 'bg-zinc-800 border-zinc-700 text-zinc-300',
          buttonClass: 'bg-zinc-700 hover:bg-zinc-600 text-white shadow-zinc-950/40',
          defaultIcon: <AlertTriangle className="h-5 w-5 text-zinc-300" />,
        };
      case 'destructive':
      default:
        return {
          iconBg: 'bg-red-500/10 border-red-500/20 text-red-400',
          buttonClass: 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/40',
          defaultIcon: <Trash2 className="h-5 w-5 text-red-400" />,
        };
    }
  };

  const variantConfig = getVariantStyles();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-zinc-800 bg-[#161618] text-zinc-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border shrink-0 ${variantConfig.iconBg}`}>
            {icon ?? variantConfig.defaultIcon}
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-white tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 mt-1 leading-relaxed">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {children && <div className="my-2">{children}</div>}

        <DialogFooter className="mt-5 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="h-9 px-4 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`h-9 px-4 font-bold text-xs gap-1.5 rounded-xl shadow-lg transition-all ${variantConfig.buttonClass}`}
          >
            {isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              confirmIcon
            )}
            <span>{confirmLabel}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
