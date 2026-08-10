// Curated color palette for the `color` node attribute — deliberately
// a fixed set rather than arbitrary hex codes, so diagrams stay
// visually consistent rather than becoming a free-for-all.
export const NODE_COLORS = {
  blue: { border: '#3b82f6', accent: '#3b82f6' },
  green: { border: '#10b981', accent: '#10b981' },
  red: { border: '#ef4444', accent: '#ef4444' },
  amber: { border: '#f59e0b', accent: '#f59e0b' },
  purple: { border: '#a855f7', accent: '#a855f7' },
  gray: { border: '#6b7280', accent: '#6b7280' },
} as const;

export type NodeColorName = keyof typeof NODE_COLORS;

export function resolveNodeColor(colorAttr: string | undefined) {
  if (!colorAttr) return null;
  const key = colorAttr.trim().toLowerCase() as NodeColorName;
  return NODE_COLORS[key] ?? null;
}

// Curated icon set — the `icon` attribute is a name into this list, not
// an arbitrary icon library lookup. Unrecognized names are ignored
// rather than erroring, since a typo shouldn't break the whole diagram.
export const ICON_NAMES = [
  'user',
  'users',
  'database',
  'server',
  'cloud',
  'lock',
  'globe',
  'mail',
  'file',
  'folder',
  'settings',
  'bell',
  'shield',
  'zap',
  'box',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

import { ICON_MAP } from '../icons/icon-catalog';

export function resolveIconName(iconAttr: string | undefined): string | null {
  if (!iconAttr || !iconAttr.trim()) return null;
  const key = iconAttr.trim().toLowerCase();
  if (
    (ICON_NAMES as readonly string[]).includes(key) ||
    ICON_MAP.has(key) ||
    ICON_MAP.has(`iconify-${key}`) ||
    key.startsWith('aws-') ||
    key.startsWith('gcp-') ||
    key.startsWith('azure-') ||
    key.startsWith('iconify-')
  ) {
    return key;
  }
  return null;
}

export const ICON_SIZE = 16;
export const ICON_GAP = 6; // space between icon and label text