/**
 * Fetch que prefere o plugin HTTP do Tauri (sem CORS) e cai no fetch global
 * no navegador / vitest / `npm run dev`.
 */

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

async function tauriFetch(): Promise<FetchLike | null> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    return null;
  }
  try {
    const mod = (await import(
      /* @vite-ignore */ '@tauri-apps/plugin-http'
    )) as { fetch: FetchLike };
    return mod.fetch;
  } catch {
    return null;
  }
}

export async function jarvisFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const viaTauri = await tauriFetch();
  if (viaTauri) return viaTauri(input, init);
  return globalThis.fetch(input, init);
}
