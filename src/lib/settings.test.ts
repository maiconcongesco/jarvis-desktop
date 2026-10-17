import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_API_URL, getApiUrl, loadSettings, useSettingsStore } from './settings';

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      apiUrl: DEFAULT_API_URL,
      theme: 'system',
      voiceAutoplay: false,
    });
  });

  it('usa a URL padrão da API na LAN', () => {
    expect(getApiUrl()).toBe(DEFAULT_API_URL);
  });

  it('persiste e recarrega a URL', () => {
    useSettingsStore.getState().setApiUrl('http://127.0.0.1:8000/');
    expect(getApiUrl()).toBe('http://127.0.0.1:8000');
    useSettingsStore.setState({ apiUrl: DEFAULT_API_URL });
    const loaded = loadSettings();
    expect(loaded.apiUrl).toBe('http://127.0.0.1:8000/');
    expect(getApiUrl()).toBe('http://127.0.0.1:8000');
  });

  it('persiste voiceAutoplay', () => {
    useSettingsStore.getState().setVoiceAutoplay(true);
    useSettingsStore.setState({ voiceAutoplay: false });
    const loaded = loadSettings();
    expect(loaded.voiceAutoplay).toBe(true);
  });
});
