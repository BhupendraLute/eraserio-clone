'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/settings', id: 'settings' as const, label: 'Settings' },
  { href: '/settings/profile', id: 'profile' as const, label: 'Profile' },
  { href: '/settings/workspace', id: 'workspace' as const, label: 'Workspace' },
];

/** Segmented switcher used in the Settings / Profile / Workspace page headers. */
export function SettingsNav({ active }: { active: 'settings' | 'profile' | 'workspace' }) {
  return (
    <nav className="flex items-center rounded-lg border bg-muted/40 p-0.5 shadow-inner">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
            active === tab.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
