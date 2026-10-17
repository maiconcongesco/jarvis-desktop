/**
 * Token desktop: Credential Manager via Tauri/keyring.
 * Fora do Tauri (vite/vitest): memória de processo + sessionStorage (nunca localStorage).
 */

const SESSION_KEY = 'jarvis-desktop-token-sessao';

let memoria: string | null = null;

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const mod = (await import(
    /* @vite-ignore */ '@tauri-apps/api/core'
  )) as { invoke: <R>(c: string, a?: Record<string, unknown>) => Promise<R> };
  return mod.invoke<T>(cmd, args);
}

export async function getDesktopToken(): Promise<string | null> {
  if (isTauri()) {
    try {
      const valor = await invokeTauri<string | null>('get_desktop_token');
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
    await invokeTauri('set_desktop_token', { token: limpo });
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
      await invokeTauri('clear_desktop_token');
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
