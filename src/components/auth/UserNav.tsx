'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogIn, ShieldCheck, LogOut, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AuthModal } from './AuthModal';

export function UserNav() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('Guest Developer');

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setUserName('Guest Developer');
  };

  const handleDemoSignIn = () => {
    setIsLoggedIn(true);
    setUserName('Alex Developer');
    setAuthModalOpen(false);
  };

  return (
    <>
      {isLoggedIn ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 items-center gap-2 rounded-full border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/40 px-2 text-xs hover:bg-accent cursor-pointer transition-colors">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-[11px] shadow-sm">
              {userName.charAt(0)}
            </div>
            <span className="hidden md:inline font-semibold text-foreground max-w-[100px] truncate">
              {userName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold">{userName}</span>
              <span className="text-[10px] text-muted-foreground">alex@developer.io</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>NeonDB Cloud Sync Active</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
              <User className="h-3.5 w-3.5" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-xs gap-2 text-destructive cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-medium gap-1 px-2"
            onClick={() => setAuthModalOpen(true)}
          >
            <LogIn className="h-3.5 w-3.5 text-blue-500" />
            <span className="hidden sm:inline">Sign In</span>
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs font-semibold gap-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            onClick={() => setAuthModalOpen(true)}
          >
            <Sparkles className="h-3 w-3 text-amber-300" />
            <span>Sign Up</span>
          </Button>
        </div>
      )}

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
}
