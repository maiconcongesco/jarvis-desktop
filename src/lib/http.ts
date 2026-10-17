/**
 * Fetch usado pelo cliente da API.
 *
 * Decisão: usar o fetch do webview (sem tauri-plugin-http). O plugin nunca foi
 * registrado no Rust e o import dinâmico ficava sem resolver no bundle, então
 * o app já caía neste caminho. Consequências: a API precisa aceitar CORS da
 * origem do app e o host tem de constar no `connect-src` do CSP
 * (`src-tauri/tauri.conf.json`; ver `lib/apiUrl.ts`).
 */
export function jarvisFetch(input: string, init?: RequestInit): Promise<Response> {
  return globalThis.fetch(input, init);
}
