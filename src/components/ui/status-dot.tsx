import { cn } from '@/lib/utils';

const statusDotColors = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  slate: 'bg-slate-400',
} as const;

export type StatusDotColor = keyof typeof statusDotColors;

interface StatusDotProps {
  /** Status color. Defaults to `emerald`. */
  color?: StatusDotColor;
  /**
   * Extra classes — e.g. custom positioning. By default the dot sits on the
   * bottom-right corner of its (relative) parent, like a badge on an avatar.
   */
  className?: string;
}

/**
 * Tiny status indicator dot, typically anchored to the corner of an avatar or
 * icon. Decorative, so it is hidden from assistive technology — pair it with a
 * `title`/tooltip or visible text where the meaning matters.
 */
export function StatusDot({ color = 'emerald', className }: StatusDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
        statusDotColors[color],
        className
      )}
    />
  );
}
