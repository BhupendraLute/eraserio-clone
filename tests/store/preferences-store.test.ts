import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePreferencesStore } from '@/lib/store/preferences-store';

// zustand's `persist` middleware resolves its backing storage synchronously at
// module load. In the vitest node environment `localStorage` exists but is
// `undefined`, which would make every subsequent setState() throw. `vi.hoisted`
// runs before the store module is imported, so we install a working
// window/localStorage first.
//
// Note: this relies on vitest's default per-file isolation (`isolate: true`),
// so the globals defined here never leak into other test files.
const hoisted = vi.hoisted(() => {
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  };
  // zustand's persist resolves `createJSONStorage(() => window.localStorage)`
  // synchronously at module load, so both globals must exist before the store
  // module is imported.
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: localStorageMock },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorageMock,
  });
  return { storage };
});

beforeEach(() => {
  hoisted.storage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  );
  usePreferencesStore.setState({
    gridStyle: 'dots',
    defaultExportFormat: 'png',
    exportScale: 2,
    codeKeymap: 'default',
  });
});

describe('usePreferencesStore', () => {
  it('starts with the documented defaults', () => {
    const s = usePreferencesStore.getState();
    expect(s.gridStyle).toBe('dots');
    expect(s.defaultExportFormat).toBe('png');
    expect(s.exportScale).toBe(2);
    expect(s.codeKeymap).toBe('default');
  });

  it('setGridStyle updates the style and syncs with the cloud', () => {
    usePreferencesStore.getState().setGridStyle('grid');
    const s = usePreferencesStore.getState();
    expect(s.gridStyle).toBe('grid');
    expect(fetch).toHaveBeenCalledWith(
      '/api/user/profile',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('setDefaultExportFormat updates the format', () => {
    usePreferencesStore.getState().setDefaultExportFormat('svg');
    expect(usePreferencesStore.getState().defaultExportFormat).toBe('svg');
  });

  it('setExportScale updates the scale', () => {
    usePreferencesStore.getState().setExportScale(3);
    expect(usePreferencesStore.getState().exportScale).toBe(3);
  });

  it('setCodeKeymap updates the keymap', () => {
    usePreferencesStore.getState().setCodeKeymap('vim');
    expect(usePreferencesStore.getState().codeKeymap).toBe('vim');
  });

  it('updatePreferences merges a partial set of preferences', () => {
    usePreferencesStore.getState().updatePreferences({
      exportScale: 4,
      codeKeymap: 'vim',
    });
    const s = usePreferencesStore.getState();
    expect(s.exportScale).toBe(4);
    expect(s.codeKeymap).toBe('vim');
    // Untouched fields keep their values.
    expect(s.gridStyle).toBe('dots');
    expect(s.defaultExportFormat).toBe('png');
  });

  it('updatePreferences does not trigger a cloud sync', () => {
    usePreferencesStore.getState().updatePreferences({ gridStyle: 'plain' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('syncWithCloud posts the full preferences payload', async () => {
    usePreferencesStore.getState().setGridStyle('grid');
    usePreferencesStore.getState().setExportScale(3);
    await usePreferencesStore.getState().syncWithCloud();

    expect(fetch).toHaveBeenLastCalledWith(
      '/api/user/profile',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            gridStyle: 'grid',
            defaultExportFormat: 'png',
            exportScale: 3,
            codeKeymap: 'default',
          },
        }),
      })
    );
  });

  it('syncWithCloud swallows network failures so the UI never throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(usePreferencesStore.getState().syncWithCloud()).resolves.toBeUndefined();
  });
});
