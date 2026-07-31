'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
        <Monitor className="h-3.5 w-3.5" />
      </Button>
    );
  }

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[2];
  const nextIndex = (THEMES.findIndex((t) => t.value === theme) + 1) % THEMES.length;
  const next = THEMES[nextIndex];
  const Icon = current.icon;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground"
      onClick={() => setTheme(next.value)}
      title={`Theme: ${current.label} (click for ${next.label})`}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}
