import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GridStyle = 'dots' | 'grid' | 'plain';
export type ExportFormat = 'png' | 'svg' | 'pdf';

export interface UserPreferences {
  gridStyle: GridStyle;
  defaultExportFormat: ExportFormat;
  exportScale: number;
  codeKeymap: 'default' | 'vim';
}

interface PreferencesState extends UserPreferences {
  setGridStyle: (style: GridStyle) => void;
  setDefaultExportFormat: (format: ExportFormat) => void;
  setExportScale: (scale: number) => void;
  setCodeKeymap: (keymap: 'default' | 'vim') => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  syncWithCloud: () => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      gridStyle: 'dots',
      defaultExportFormat: 'png',
      exportScale: 2,
      codeKeymap: 'default',

      setGridStyle: (gridStyle) => {
        set({ gridStyle });
        void get().syncWithCloud();
      },

      setDefaultExportFormat: (defaultExportFormat) => {
        set({ defaultExportFormat });
        void get().syncWithCloud();
      },

      setExportScale: (exportScale) => {
        set({ exportScale });
        void get().syncWithCloud();
      },

      setCodeKeymap: (codeKeymap) => {
        set({ codeKeymap });
        void get().syncWithCloud();
      },

      updatePreferences: (prefs) => {
        set(prefs);
      },

      syncWithCloud: async () => {
        const { gridStyle, defaultExportFormat, exportScale, codeKeymap } = get();
        try {
          await fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              preferences: { gridStyle, defaultExportFormat, exportScale, codeKeymap },
            }),
          });
        } catch {
          // ignore offline sync error
        }
      },
    }),
    {
      name: 'eraserio_user_preferences',
    }
  )
);
