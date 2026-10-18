/**
 * Token desktop: Credential Manager via Tauri/keyring.
 * Fora do Tauri (vite/vitest): memória de processo + sessionStorage (nunca localStorage).
 *
 * Import estático de propósito: o dinâmico com `@vite-ignore` ficava fora do bundle e,
 * no app instalado, o `invoke` nunca chegava ao Rust (o token não era salvo nem lido).
 */
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './tauriEnv';

const SESSION_KEY = 'jarvis-desktop-token-sessao';

let memoria: string | null = null;

export async function getDesktopToken(): Promise<string | null> {
  if (isTauri()) {
    try {
      const valor = await invoke<string | null>('get_desktop_token');
      return valor && valor.trim() ? valor.trim() : null;
    } catch {
      return null;
    }
  }
  if (memoria) return memoria;
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (s && s.trim()) {
      memoria = s.trim();
      return memoria;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function setDesktopToken(token: string): Promise<void> {
  const limpo = token.trim();
  if (!limpo) {
    await clearDesktopToken();
    return;
  }
  if (isTauri()) {
    await invoke('set_desktop_token', { token: limpo });
    return;
  }
  memoria = limpo;
  try {
    sessionStorage.setItem(SESSION_KEY, limpo);
  } catch {
    /* ignore */
  }
}

export async function clearDesktopToken(): Promise<void> {
  if (isTauri()) {
    try {
      await invoke('clear_desktop_token');
    } catch {
      /* ignore */
    }
    return;
  }
  memoria = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Só para testes. */
export function _resetVaultMemoria(): void {
  memoria = null;
}
