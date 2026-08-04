'use client';

import { Button } from '@/components/ui/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Extra visual appearances layered on top of the base shadcn Button variants.
 * Use `appearance` for brand-specific treatments (gradient CTA, dark outline,
 * light outline on colored backgrounds) and keep `variant` for the standard
 * shadcn variants (default, outline, ghost, ...).
 */
const appButtonAppearance = cva('', {
  variants: {
    appearance: {
      // Primary gradient CTA
      brand: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 border border-white/10',
      // Quiet outline for dark surfaces (landing page hero)
      'brand-outline': 'border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800',
      // Outline for colored/gradient backgrounds (footer CTA banner)
      'light-outline': 'border-white/30 text-white hover:bg-white/10',
    },
  },
});

type AppButtonAppearance = VariantProps<typeof appButtonAppearance>['appearance'];

export interface AppButtonProps extends ComponentProps<typeof Button> {
  /** Brand-specific look layered on top of the shadcn `variant`. */
  appearance?: AppButtonAppearance;
  /** Optional icon rendered at the start or end of the label. */
  icon?: ReactNode;
  /** Where to place the icon relative to the label. Defaults to `start`. */
  iconPosition?: 'start' | 'end';
  /** Text label (alternative to children). */
  label?: ReactNode;
  children?: ReactNode;
}

/**
 * Reusable, customizable button built on top of the shadcn/ui Button.
 *
 * - Supports every standard shadcn `variant` and `size`.
 * - Adds brand-specific `appearance` presets (gradient, dark outline, light outline).
 * - Convenient `icon` / `iconPosition` / `label` props.
 * - Any extra props (onClick, disabled, className, ...) pass straight through.
 */
export function AppButton({
  appearance,
  variant,
  size,
  icon,
  iconPosition = 'start',
  label,
  children,
  className,
  ...props
}: AppButtonProps) {
  const content = children ?? label;

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(appButtonAppearance({ appearance }), className)}
      {...props}
    >
      {icon && iconPosition === 'start' && <span className="inline-flex shrink-0">{icon}</span>}
      {content}
      {icon && iconPosition === 'end' && <span className="inline-flex shrink-0">{icon}</span>}
    </Button>
  );
}

export { appButtonAppearance };
