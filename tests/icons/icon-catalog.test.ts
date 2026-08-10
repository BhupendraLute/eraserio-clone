import { describe, expect, it } from 'vitest';
import { ICON_CATALOG, ICON_MAP, searchIconsDynamic } from '@/lib/icons/icon-catalog';

describe('Icon Catalog', () => {
  it('registers system design iconify catalog into ICON_MAP', () => {
    expect(ICON_CATALOG.length).toBeGreaterThan(50);
    expect(ICON_MAP.has('iconify-kafka')).toBe(true);
    expect(ICON_MAP.has('kafka')).toBe(true);
    expect(ICON_MAP.has('iconify-redis')).toBe(true);
    expect(ICON_MAP.has('redis')).toBe(true);
    expect(ICON_MAP.has('iconify-postgresql')).toBe(true);
    expect(ICON_MAP.has('postgres')).toBe(true);
  });

  it('searches icons dynamically by keyword', () => {
    const kafkaResults = searchIconsDynamic('kafka');
    expect(kafkaResults.length).toBeGreaterThan(0);
    expect(kafkaResults.some((item) => item.kind.includes('kafka'))).toBe(true);

    const redisResults = searchIconsDynamic('redis');
    expect(redisResults.length).toBeGreaterThan(0);
    expect(redisResults.some((item) => item.kind.includes('redis'))).toBe(true);
  });
});
