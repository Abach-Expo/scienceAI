import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useLanguageStore } from './languageStore';
import type { Language } from '../i18n/translations';

interface SettingsState {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  /** @deprecated Use useLanguageStore().language instead */
  get language(): Language;
  /** @deprecated Use useLanguageStore().setLanguage instead */
  setLanguage: (lang: Language) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      get language() {
        return useLanguageStore.getState().language;
      },
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => {
        // Delegate to the single source of truth
        useLanguageStore.getState().setLanguage(language);
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
