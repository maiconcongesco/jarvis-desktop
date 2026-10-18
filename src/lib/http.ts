/**
 * Fetch usado pelo cliente da API.
 *
 * No app Tauri vai pelo `tauri-plugin-http` (a requisição sai da casca Rust, sem CORS):
 * a API do JARVIS não responde preflight, então o fetch do webview com `Authorization`
 * é bloqueado. O escopo de URLs está na capability `http:default`
 * (`src-tauri/capabilities/default.json`), com os mesmos hosts do `connect-src` do CSP
 * (ver `lib/apiUrl.ts`). Fora do Tauri (`npm run dev`, vitest) usa o fetch global.
 *
 * Import estático de propósito: o dinâmico com especificador nu ficava sem resolver no
 * bundle e o app caía calado no fetch do webview.
 */
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { isTauri } from './tauriEnv';

export function jarvisFetch(input: string, init?: RequestInit): Promise<Response> {
  if (isTauri()) return tauriFetch(input, init);
  return globalThis.fetch(input, init);
}
