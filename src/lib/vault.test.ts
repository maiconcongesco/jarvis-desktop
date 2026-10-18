import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

import { _resetVaultMemoria, clearDesktopToken, getDesktopToken, setDesktopToken } from './vault';

describe('vault no app Tauri', () => {
  beforeEach(() => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    invoke.mockReset();
    _resetVaultMemoria();
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  });

  it('salva no Credential Manager pelo invoke', async () => {
    invoke.mockResolvedValue(undefined);
    await setDesktopToken('  abc123  ');
    expect(invoke).toHaveBeenCalledWith('set_desktop_token', { token: 'abc123' });
  });

  it('lê o token salvo', async () => {
    invoke.mockResolvedValue('abc123');
    expect(await getDesktopToken()).toBe('abc123');
    expect(invoke).toHaveBeenCalledWith('get_desktop_token');
  });

  it('erro do cofre ao salvar chega a quem chamou', async () => {
    invoke.mockRejectedValue(new Error('acesso negado'));
    await expect(setDesktopToken('abc123')).rejects.toThrow('acesso negado');
  });

  it('limpar chama clear_desktop_token', async () => {
    invoke.mockResolvedValue(undefined);
    await clearDesktopToken();
    expect(invoke).toHaveBeenCalledWith('clear_desktop_token');
  });
});
