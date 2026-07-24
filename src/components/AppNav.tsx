'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/editor', label: 'Diagram editor' },
  { href: '/docs', label: 'Docs' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-10 shrink-0 items-center gap-1 border-b bg-background px-3">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'rounded-md px-3 py-1 text-sm',
            pathname === link.href
              ? 'bg-secondary font-medium'
              : 'text-muted-foreground hover:bg-secondary/50'
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}