import { useCallback, useEffect, useRef, useState } from 'react';
import { isTauri } from '../lib/tauriEnv';

type UpdateState = 'idle' | 'available' | 'downloading' | 'ready' | 'error';

/** Spec §9: consulta ao abrir e a cada 6 h. */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DISABLED_KEY = 'jarvis-auto-update-disabled';

export function isAutoUpdateDisabled(): boolean {
  try {
    return localStorage.getItem(DISABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAutoUpdateDisabled(disabled: boolean): void {
  try {
    if (disabled) {
      localStorage.setItem(DISABLED_KEY, '1');
    } else {
      localStorage.removeItem(DISABLED_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function UpdateChecker() {
  const [state, setState] = useState<UpdateState>('idle');
  const [version, setVersion] = useState('');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const updateRef = useRef<{
    version: string;
    contentLength?: number;
    downloadAndInstall: (cb: (event: unknown) => void) => Promise<void>;
  } | null>(null);

  const checkForUpdate = useCallback(async () => {
    if (isAutoUpdateDisabled()) return;
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        updateRef.current = update;
        setVersion(update.version);
        setState('available');
        setDismissed(false);
      }
    } catch {
      // Browser / sem release / rede: silencioso.
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    if (isAutoUpdateDisabled()) return;

    const noUpdater = (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_JARVIS_NO_UPDATER;
    if (noUpdater === '1' || noUpdater === 'true') return;

    void checkForUpdate();
    const interval = setInterval(() => void checkForUpdate(), CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  const handleDownload = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;

    setState('downloading');
    setProgress(0);

    try {
      let downloaded = 0;
      const contentLength = update.contentLength ?? 0;

      await update.downloadAndInstall((event: unknown) => {
        const e = event as { event?: string; data?: { chunkLength?: number } };
        if (e.event === 'Progress') {
          downloaded += e.data?.chunkLength ?? 0;
          if (contentLength > 0) {
            setProgress(Math.min(100, Math.round((downloaded / contentLength) * 100)));
          }
        } else if (e.event === 'Finished') {
          setProgress(100);
        }
      });

      setState('ready');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha no download';
      setErrorMsg(msg);
      setState('error');
      setTimeout(() => setState('idle'), 5000);
    }
  }, []);

  const handleRelaunch = useCallback(async () => {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch {
      setErrorMsg('Reinicie o aplicativo manualmente');
      setState('error');
      setTimeout(() => setState('idle'), 5000);
    }
  }, []);

  const handleDisable = useCallback(() => {
    setAutoUpdateDisabled(true);
    setState('idle');
    setDismissed(false);
  }, []);

  if (state === 'idle' || dismissed) return null;

  return (
    <div
      className="px-6 py-2.5 text-sm shrink-0 relative z-20"
      style={{
        background: 'color-mix(in srgb, var(--color-bg) 92%, #000)',
        borderBottom: '1px solid color-mix(in srgb, var(--color-border) 60%, transparent)',
        color: 'var(--color-text)',
      }}
      role="status"
    >
      {state === 'available' && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span>
            Atualização disponível: <strong>v{version}</strong>
          </span>
          <div className="flex gap-2 items-center flex-wrap">
            <button type="button" className="upd-btn upd-btn-primary" onClick={() => void handleDownload()}>
              Baixar
            </button>
            <button type="button" className="upd-btn upd-btn-secondary" onClick={() => setDismissed(true)}>
              Depois
            </button>
            <button type="button" className="upd-btn upd-btn-mute" onClick={handleDisable}>
              Desligar atualizações automáticas
            </button>
          </div>
        </div>
      )}

      {state === 'downloading' && (
        <div className="flex items-center justify-between gap-4">
          <span>Baixando atualização… {progress}%</span>
          <div
            className="flex-1 max-w-xs h-1.5 rounded overflow-hidden"
            style={{ background: 'color-mix(in srgb, var(--color-border) 80%, transparent)' }}
          >
            <div
              className="h-full rounded transition-[width] duration-300"
              style={{ width: `${progress}%`, background: 'var(--color-accent)' }}
            />
          </div>
        </div>
      )}

      {state === 'ready' && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span style={{ color: 'var(--color-accent)' }}>Atualização instalada.</span>
          <div className="flex gap-2">
            <button type="button" className="upd-btn upd-btn-primary" onClick={() => void handleRelaunch()}>
              Reiniciar agora
            </button>
            <button type="button" className="upd-btn upd-btn-secondary" onClick={() => setDismissed(true)}>
              Depois
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div>
          <span style={{ color: '#f38ba8' }}>Erro na atualização: {errorMsg}</span>
        </div>
      )}

      <style>{`
        .upd-btn {
          padding: 4px 14px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }
        .upd-btn-primary {
          border: none;
          font-weight: 600;
          background: var(--color-accent);
          color: var(--color-bg);
        }
        .upd-btn-secondary {
          border: 1px solid color-mix(in srgb, var(--color-border) 80%, transparent);
          background: transparent;
          color: var(--color-text);
          opacity: 0.85;
        }
        .upd-btn-mute {
          border: none;
          background: transparent;
          color: var(--color-text);
          opacity: 0.45;
          font-size: 11px;
          text-decoration: underline;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
