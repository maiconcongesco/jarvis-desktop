import { create } from 'zustand';

const STORAGE_KEY = 'jarvis-desktop-settings';
export const DEFAULT_API_URL = 'http://192.168.20.210:8000';

export type Theme = 'system' | 'dark' | 'light';

export interface DesktopSettings {
  apiUrl: string;
  theme: Theme;
}

interface SettingsState extends DesktopSettings {
  setApiUrl: (url: string) => void;
  setTheme: (theme: Theme) => void;
  hydrate: (partial: Partial<DesktopSettings>) => void;
}

function persist(state: DesktopSettings) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ apiUrl: state.apiUrl, theme: state.theme }),
    );
  } catch {
    /* ignore quota */
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiUrl: DEFAULT_API_URL,
  theme: 'system',
  setApiUrl: (apiUrl) => {
    set({ apiUrl });
    persist(get());
  },
  setTheme: (theme) => {
    set({ theme });
    persist(get());
  },
  hydrate: (partial) => {
    set(partial);
    persist(get());
  },
}));

export function loadSettings(): DesktopSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DesktopSettings>;
      const next: DesktopSettings = {
        apiUrl: typeof parsed.apiUrl === 'string' && parsed.apiUrl ? parsed.apiUrl : DEFAULT_API_URL,
        theme:
          parsed.theme === 'dark' || parsed.theme === 'light' || parsed.theme === 'system'
            ? parsed.theme
            : 'system',
      };
      useSettingsStore.getState().hydrate(next);
      return next;
    }
  } catch {
    /* ignore */
  }
  return { apiUrl: DEFAULT_API_URL, theme: 'system' };
}

export function getApiUrl(): string {
  return useSettingsStore.getState().apiUrl.replace(/\/+$/, '') || DEFAULT_API_URL;
}
