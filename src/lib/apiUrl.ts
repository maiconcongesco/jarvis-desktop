/**
 * Validação da URL da API contra o `connect-src` do CSP do app Tauri.
 *
 * O CSP em `src-tauri/tauri.conf.json` é a fonte única: se a URL não estiver
 * lá, o webview bloqueia a chamada (sem tauri-plugin-http, ver `lib/http.ts`).
 * Para liberar outro host, edite o CSP e gere nova versão do app.
 */
import tauriConf from '../../src-tauri/tauri.conf.json';

export type ValidacaoApiUrl =
  | { ok: true; url: string }
  | { ok: false; motivo: string };

/** Origens http(s) explícitas do `connect-src` (ignora 'self', curingas etc.). */
export function origensPermitidas(csp: string = tauriConf.app.security.csp): string[] {
  const diretiva = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('connect-src '));
  if (!diretiva) return [];
  const origens: string[] = [];
  for (const fonte of diretiva.split(/\s+/).slice(1)) {
    try {
      const u = new URL(fonte);
      if (u.protocol === 'http:' || u.protocol === 'https:') origens.push(u.origin);
    } catch {
      /* 'self', esquemas sem host etc. */
    }
  }
  return origens;
}

/** Normaliza (sem barra final) e confere se a origem está no CSP. */
export function validarApiUrl(
  bruto: string,
  permitidas: string[] = origensPermitidas(),
): ValidacaoApiUrl {
  const texto = bruto.trim();
  let u: URL;
  try {
    u = new URL(texto);
  } catch {
    return { ok: false, motivo: 'URL inválida. Use o formato http://host:porta.' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, motivo: 'Use http:// ou https://.' };
  }
  if (!permitidas.includes(u.origin)) {
    return {
      ok: false,
      motivo: `${u.origin} não está no CSP do app (connect-src). Permitidas: ${permitidas.join(', ')}.`,
    };
  }
  return { ok: true, url: texto.replace(/\/+$/, '') };
}
