import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkHealth } from './health';
import { DEFAULT_API_URL, useSettingsStore } from './settings';

describe('checkHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useSettingsStore.setState({ apiUrl: DEFAULT_API_URL });
  });

  it('retorna true quando /healthz responde ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('ok', { status: 200 })),
    );
    await expect(checkHealth()).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      `${DEFAULT_API_URL}/healthz`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('retorna false quando a rede falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    await expect(checkHealth()).resolves.toBe(false);
  });
});
