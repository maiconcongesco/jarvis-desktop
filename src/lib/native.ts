/**
 * Casca nativa F6: atalho global, autostart, status da bandeja e notificações.
 * Isolado da voz/HUD (F5) — só depende de settings + health + jarvis.
 */

import { invoke } from '@tauri-apps/api/core';
import { disable as disableAutostart, enable as enableAutostart, isEnabled } from '@tauri-apps/plugin-autostart';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import {
  isPermissionGranted,
  onAction,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { checkHealth } from './health';
import { DEFAULT_SHORTCUT, useSettingsStore } from './settings';
import { isTauri } from './tauriEnv';

const EVENTO_ABRIR_SINO = 'jarvis:abrir-sino';
let atalhoAtual: string | null = null;
let healthTimer: ReturnType<typeof setInterval> | null = null;
let nativeBooted = false;

export function onAbrirSino(handler: () => void): () => void {
  const listener = () => handler();
  window.addEventListener(EVENTO_ABRIR_SINO, listener);
  return () => window.removeEventListener(EVENTO_ABRIR_SINO, listener);
}

export function dispararAbrirSino(): void {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_SINO));
}

export async function toggleJanelaFlutuante(): Promise<void> {
  if (!isTauri()) return;
  await invoke('toggle_janela_flutuante');
}

export async function fecharJanelaFlutuante(): Promise<void> {
  if (!isTauri()) return;
  await invoke('fechar_janela_flutuante');
}

export async function mostrarJanelaPrincipal(): Promise<void> {
  if (!isTauri()) return;
  await invoke('mostrar_janela_principal');
}

async function atualizarBandeja(): Promise<void> {
  if (!isTauri()) return;
  const noAr = await checkHealth();
  try {
    await invoke('atualizar_status_cerebro', { noAr });
  } catch {
    /* bandeja pode estar indisponível no browser */
  }
}

export async function registrarAtalho(atalho: string): Promise<void> {
  if (!isTauri()) return;
  const next = atalho.trim() || DEFAULT_SHORTCUT;
  if (atalhoAtual) {
    try {
      await unregister(atalhoAtual);
    } catch {
      /* pode não estar registrado */
    }
    atalhoAtual = null;
  }
  await register(next, (event) => {
    if (event.state === 'Pressed') {
      void toggleJanelaFlutuante();
    }
  });
  atalhoAtual = next;
}

export async function sincronizarAutostart(ligado: boolean): Promise<void> {
  if (!isTauri()) return;
  const atual = await isEnabled();
  if (ligado && !atual) await enableAutostart();
  if (!ligado && atual) await disableAutostart();
}

export async function garantirPermissaoNotificacao(): Promise<boolean> {
  if (!isTauri()) return false;
  let ok = await isPermissionGranted();
  if (!ok) {
    const perm = await requestPermission();
    ok = perm === 'granted';
  }
  return ok;
}

export async function notificarAprovacao(ferramenta: string, limite: string): Promise<void> {
  if (!isTauri()) return;
  const ok = await garantirPermissaoNotificacao();
  if (!ok) return;
  sendNotification({
    title: 'Aprovação pendente',
    body: `${ferramenta} · ${limite}`,
  });
}

/** Liga atalho, autostart, polling da bandeja e clique em notificação. Idempotente. */
export async function bootNativeShell(): Promise<() => void> {
  if (!isTauri() || nativeBooted) {
    return () => undefined;
  }
  nativeBooted = true;

  const { globalShortcut, autostart } = useSettingsStore.getState();
  try {
    await sincronizarAutostart(autostart);
  } catch {
    /* plugin pode falhar fora do instalador */
  }
  try {
    await registrarAtalho(globalShortcut);
  } catch (e) {
    console.warn('atalho global:', e);
  }
  try {
    await garantirPermissaoNotificacao();
  } catch {
    /* ignore */
  }

  void atualizarBandeja();
  healthTimer = setInterval(() => {
    void atualizarBandeja();
  }, 30_000);

  let unlistenAction: (() => Promise<void>) | null = null;
  try {
    const listener = await onAction(() => {
      void mostrarJanelaPrincipal().then(() => dispararAbrirSino());
    });
    unlistenAction = () => listener.unregister();
  } catch {
    /* desktop sem action listener */
  }

  return () => {
    nativeBooted = false;
    if (healthTimer) {
      clearInterval(healthTimer);
      healthTimer = null;
    }
    if (atalhoAtual) {
      void unregister(atalhoAtual).catch(() => undefined);
      atalhoAtual = null;
    }
    void unlistenAction?.();
  };
}
