import { describe, expect, it } from 'vitest';
import {
  NODE_COLORS,
  resolveNodeColor,
  ICON_NAMES,
  resolveIconName,
  ICON_SIZE,
  ICON_GAP,
} from '@/lib/render/node-style';

describe('NODE_COLORS', () => {
  it('exposes the curated color palette', () => {
    expect(Object.keys(NODE_COLORS)).toEqual([
      'blue',
      'green',
      'red',
      'amber',
      'purple',
      'gray',
    ]);
  });

  it('keeps border and accent in sync for every color', () => {
    for (const color of Object.values(NODE_COLORS)) {
      expect(color.border).toBe(color.accent);
      expect(color.border).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('resolveNodeColor', () => {
  it('returns null for a missing attribute', () => {
    expect(resolveNodeColor(undefined)).toBeNull();
  });

  it('resolves a known color name', () => {
    expect(resolveNodeColor('blue')).toEqual({
      border: '#3b82f6',
      accent: '#3b82f6',
    });
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(resolveNodeColor('  PURPLE  ')).toEqual(NODE_COLORS.purple);
    expect(resolveNodeColor('Green')).toEqual(NODE_COLORS.green);
  });

  it('returns null for an unrecognized color instead of throwing', () => {
    expect(resolveNodeColor('neon')).toBeNull();
  });
});

describe('ICON_NAMES', () => {
  it('exposes the curated icon set', () => {
    expect(ICON_NAMES).toContain('user');
    expect(ICON_NAMES).toContain('database');
    expect(ICON_NAMES).toContain('cloud');
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(15);
  });

  it('exports the icon layout constants', () => {
    expect(ICON_SIZE).toBe(16);
    expect(ICON_GAP).toBe(6);
  });
});

describe('resolveIconName', () => {
  it('returns null for a missing attribute', () => {
    expect(resolveIconName(undefined)).toBeNull();
  });

  it('resolves a known icon name', () => {
    expect(resolveIconName('database')).toBe('database');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(resolveIconName('  Mail  ')).toBe('mail');
  });

  it('returns null for an unrecognized icon so typos do not break layouts', () => {
    expect(resolveIconName('rocket')).toBeNull();
  });
});
