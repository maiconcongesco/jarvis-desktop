/** Detecta se estamos no webview Tauri (não no `npm run dev` puro). */
export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
}
