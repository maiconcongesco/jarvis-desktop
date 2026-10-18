import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_API_URL, DEFAULT_SHORTCUT, useSettingsStore } from '../lib/settings';
import { _resetVaultMemoria, getDesktopToken } from '../lib/vault';
import { SettingsPage } from './SettingsPage';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  message: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: toastMock }));

function renderPagina() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      apiUrl: DEFAULT_API_URL,
      theme: 'system',
      voiceAutoplay: false,
      autostart: true,
      globalShortcut: DEFAULT_SHORTCUT,
    });
    _resetVaultMemoria();
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    _resetVaultMemoria();
    sessionStorage.clear();
  });

  it('URL fora do CSP mostra o alerta', async () => {
    const user = userEvent.setup();
    renderPagina();
    expect(screen.queryByRole('alert')).toBeNull();

    const campo = screen.getByPlaceholderText('http://192.168.20.210:8000');
    await user.clear(campo);
    await user.type(campo, 'http://10.9.9.9:8000');

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toMatch(/não está no CSP/);
    expect(campo.getAttribute('aria-invalid')).toBe('true');
  });

  it('URL permitida salva no store', async () => {
    const user = userEvent.setup();
    renderPagina();

    const campo = screen.getByPlaceholderText('http://192.168.20.210:8000');
    await user.clear(campo);
    await user.type(campo, 'http://localhost:8000/');
    expect(screen.queryByRole('alert')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Salvar URL' }));

    expect(useSettingsStore.getState().apiUrl).toBe('http://localhost:8000');
    expect(toastMock.success).toHaveBeenCalledWith('URL salva');
  });

  it('guarda e limpa o token no cofre da sessão', async () => {
    const user = userEvent.setup();
    renderPagina();

    const campo = screen.getByPlaceholderText('Cole o token');
    await user.type(campo, 'token-de-teste-123');
    await user.click(screen.getByRole('button', { name: 'Guardar token' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    expect(await getDesktopToken()).toBe('token-de-teste-123');
    expect(campo).toHaveProperty('value', '');
    expect(campo.getAttribute('placeholder')).toMatch(/já configurado/);

    await user.click(screen.getByRole('button', { name: 'Limpar token' }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Token removido'));
    expect(await getDesktopToken()).toBeNull();
    expect(campo.getAttribute('placeholder')).toBe('Cole o token');
  });
});
