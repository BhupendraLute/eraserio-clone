'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogIn, LogOut, UserPlus, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AuthModal } from './AuthModal';
import { StatusDot } from '@/components/ui/status-dot';
import { SyncStatusBadge } from '@/components/workspace/SyncStatusBadge';
import { useDocumentStore } from '@/lib/store/document-store';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function UserNav() {
  const { data: session, status } = useSession();
  const mode = useDocumentStore((s) => s.mode);
  const syncStatus = useDocumentStore((s) => s.syncStatus);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  const openAuthModal = (tab: 'login' | 'signup') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const user = session?.user;
  const isLoggedIn = status === 'authenticated' && !!user;

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ redirect: false, callbackUrl: '/' });
    setSigningOut(false);
    toast.success('Signed out successfully.');
    router.push('/');
  };

  // Auth session is loading (initial hydration)
  if (status === 'loading') {
    return (
      <Button variant="ghost" size="sm" className="h-7 w-7 px-0" disabled>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </Button>
    );
  }

  return (
    <>
      {isLoggedIn ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            title="Cloud sync active"
            className="flex h-8 items-center gap-2 rounded-full border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/40 px-2 text-xs hover:bg-accent cursor-pointer transition-colors"
          >
            <span className="relative">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name || 'User avatar'}
                  className="h-6 w-6 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-[11px] shadow-sm">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {/* Cloud-synced status dot on the avatar corner */}
              <StatusDot color="emerald" />
            </span>
            <span className="hidden md:inline font-semibold text-foreground max-w-[100px] truncate">
              {user?.name || user?.email?.split('@')[0] || 'User'}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold">{user?.name || 'Architecta User'}</span>
              <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs gap-2 cursor-default" disabled>
              <SyncStatusBadge mode={mode} syncStatus={syncStatus} className="text-xs" />
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
              <User className="h-3.5 w-3.5" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-xs gap-2 text-destructive cursor-pointer"
            >
              {signingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            title="Local-only mode — documents saved in your browser"
            className="flex h-8 items-center gap-2 rounded-full border border-muted bg-muted/40 px-2 text-xs hover:bg-accent cursor-pointer transition-colors"
          >
            <span className="relative">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User className="h-3.5 w-3.5" />
              </div>
              {/* Local-only status dot on the avatar corner */}
              <StatusDot color="amber" />
            </span>
            <span className="hidden md:inline font-semibold text-foreground">Guest</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold">Guest Mode</span>
              <span className="text-[10px] text-muted-foreground">
                Working locally in your browser
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => openAuthModal('login')}
              className="text-xs gap-2 cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openAuthModal('signup')}
              className="text-xs gap-2 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Create Account</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs gap-2 cursor-default" disabled>
              <SyncStatusBadge mode={mode} syncStatus={syncStatus} className="text-xs" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab={authModalTab}
      />
    </>
  );
}
