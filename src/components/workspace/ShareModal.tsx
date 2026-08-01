'use client';

import React, { useState } from 'react';
import { useDocumentStore } from '@/lib/store/document-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Share2, Globe, Lock, Copy, Check, Link as LinkIcon, LogIn, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { AuthModal } from '@/components/auth/AuthModal';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareModal({ open, onOpenChange }: ShareModalProps) {
  const { isPublic, shareToken, activeDocumentTitle, togglePublicShare } = useDocumentStore();
  const { status } = useSession();
  const isSignedIn = status === 'authenticated';
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin;
    return shareToken ? `${base}/share/${shareToken}` : '';
  };

  const handleSignInPrompt = () => {
    // Close the share dialog and open the inline auth modal on the Sign In tab
    onOpenChange(false);
    setAuthModalOpen(true);
  };

  const handleToggleAccess = async () => {
    setLoading(true);
    const { shareUrl } = await togglePublicShare(!isPublic);
    setLoading(false);
    if (!shareUrl) {
      toast.error('Could not update sharing. Please try again.');
    } else {
      toast.success(isPublic ? 'Document is now private.' : 'Public link created!');
    }
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Share2 className="h-4 w-4 text-purple-600" />
            <span>Share Document</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Manage public read-only access and shareable links for &quot;{activeDocumentTitle}&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isSignedIn ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                <LogIn className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Sign in to share this document
                </p>
                <p className="text-[11px] text-muted-foreground">
                  You&apos;re in guest mode — documents stay local in your browser. Sign in to
                  generate public links and sync to the cloud.
                </p>
              </div>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSignInPrompt}>
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Button>
            </div>
          ) : (
            <>
              {/* Public Toggle Card */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isPublic ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                    {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {isPublic ? 'Public View Enabled' : 'Private Access Only'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isPublic ? 'Anyone with the link can view' : 'Only you can view and edit'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={isPublic ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleToggleAccess}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isPublic ? (
                    'Make Private'
                  ) : (
                    'Enable Link'
                  )}
                </Button>
              </div>

              {/* Share Link Input & Copy */}
              {isPublic && (
                <div className="space-y-1.5 animate-in fade-in-50">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    <span>Shareable Link</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getShareUrl()}
                      placeholder="Enable link sharing to generate a URL"
                      className="h-8 flex-1 rounded border bg-muted/40 px-2.5 text-xs text-foreground outline-none font-mono"
                    />
                    <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleCopyLink} disabled={!shareToken}>
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Inline auth modal — opens on the Sign In tab when a guest taps Sign In */}
    <AuthModal
      open={authModalOpen}
      onOpenChange={setAuthModalOpen}
      defaultTab="login"
    />
    </>
  );
}
