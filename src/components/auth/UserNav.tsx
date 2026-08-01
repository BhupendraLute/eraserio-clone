'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { User, LogIn, ShieldCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserNav() {
  const isGuest = true; // Guest mode fallback

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 items-center gap-2 rounded px-2 text-xs hover:bg-accent cursor-pointer">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-[11px]">
          G
        </div>
        <span className="hidden md:inline font-medium">Guest Developer</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold">Guest Developer</span>
          <span className="text-[10px] text-muted-foreground">Local Session Active</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Local Storage Sync</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
          <User className="h-3.5 w-3.5" />
          <span>Account Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs gap-2 text-blue-600 dark:text-blue-400 font-medium cursor-pointer">
          <LogIn className="h-3.5 w-3.5" />
          <span>Connect Cloud Database</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
