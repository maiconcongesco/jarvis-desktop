import { create } from 'zustand';

const STORAGE_KEY = 'jarvis-desktop-settings';
export const DEFAULT_API_URL = 'http://192.168.20.210:8000';
export const DEFAULT_SHORTCUT = 'CommandOrControl+Space';

export type Theme = 'system' | 'dark' | 'light';

export interface DesktopSettings {
  apiUrl: string;
  theme: Theme;
  /** Ler respostas em voz alta automaticamente após o stream. */
  voiceAutoplay: boolean;
  /** Inicia com o Windows (plugin autostart + --hidden). Padrão: ligado. */
  autostart: boolean;
  /** Atalho global Tauri (ex.: CommandOrControl+Space). */
  globalShortcut: string;
}

interface SettingsState extends DesktopSettings {
  setApiUrl: (url: string) => void;
  setTheme: (theme: Theme) => void;
  setVoiceAutoplay: (on: boolean) => void;
  setAutostart: (autostart: boolean) => void;
  setGlobalShortcut: (globalShortcut: string) => void;
  hydrate: (partial: Partial<DesktopSettings>) => void;
}

function slicePersist(state: DesktopSettings): DesktopSettings {
  return {
    apiUrl: state.apiUrl,
    theme: state.theme,
    voiceAutoplay: state.voiceAutoplay,
    autostart: state.autostart,
    globalShortcut: state.globalShortcut,
  };
}

function persist(state: DesktopSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slicePersist(state)));
  } catch {
    /* ignore quota */
  }
}

function parseSettings(parsed: Partial<DesktopSettings>): DesktopSettings {
  return {
    apiUrl: typeof parsed.apiUrl === 'string' && parsed.apiUrl ? parsed.apiUrl : DEFAULT_API_URL,
    theme:
      parsed.theme === 'dark' || parsed.theme === 'light' || parsed.theme === 'system'
        ? parsed.theme
        : 'system',
    voiceAutoplay: Boolean(parsed.voiceAutoplay),
    autostart: typeof parsed.autostart === 'boolean' ? parsed.autostart : true,
    globalShortcut:
      typeof parsed.globalShortcut === 'string' && parsed.globalShortcut.trim()
        ? parsed.globalShortcut.trim()
        : DEFAULT_SHORTCUT,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiUrl: DEFAULT_API_URL,
  theme: 'system',
  voiceAutoplay: false,
  autostart: true,
  globalShortcut: DEFAULT_SHORTCUT,
  setApiUrl: (apiUrl) => {
    set({ apiUrl });
    persist(get());
  },
  setTheme: (theme) => {
    set({ theme });
    persist(get());
  },
  setVoiceAutoplay: (voiceAutoplay) => {
    set({ voiceAutoplay });
    persist(get());
  },
  setAutostart: (autostart) => {
    set({ autostart });
    persist(get());
  },
  setGlobalShortcut: (globalShortcut) => {
    set({ globalShortcut });
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
      const next = parseSettings(parsed);
      useSettingsStore.getState().hydrate(next);
      return next;
    }
  } catch {
    /* ignore */
  }
  return {
    apiUrl: DEFAULT_API_URL,
    theme: 'system',
    voiceAutoplay: false,
    autostart: true,
    globalShortcut: DEFAULT_SHORTCUT,
  };
}

export function getApiUrl(): string {
  return useSettingsStore.getState().apiUrl.replace(/\/+$/, '') || DEFAULT_API_URL;
}
