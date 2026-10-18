import { describe, expect, it } from 'vitest';
import capability from '../../src-tauri/capabilities/default.json';
import { origensPermitidas, validarApiUrl } from './apiUrl';
import { DEFAULT_API_URL } from './settings';

describe('apiUrl x CSP', () => {
  it('lê as origens http(s) do connect-src', () => {
    const csp =
      "default-src 'self'; connect-src 'self' http://10.0.0.1:8000 https://github.com ipc:; img-src 'self'";
    expect(origensPermitidas(csp)).toEqual(['http://10.0.0.1:8000', 'https://github.com']);
    expect(origensPermitidas("default-src 'self'")).toEqual([]);
  });

  it('a URL padrão está no CSP real do tauri.conf.json', () => {
    expect(origensPermitidas()).toContain(DEFAULT_API_URL);
    expect(validarApiUrl(DEFAULT_API_URL)).toEqual({ ok: true, url: DEFAULT_API_URL });
  });

  it('normaliza barra final e aceita host permitido', () => {
    expect(validarApiUrl(' http://127.0.0.1:8000/ ', ['http://127.0.0.1:8000'])).toEqual({
      ok: true,
      url: 'http://127.0.0.1:8000',
    });
  });

  it('recusa host fora do CSP, porta diferente e lixo', () => {
    const permitidas = ['http://192.168.20.210:8000'];
    const fora = validarApiUrl('http://10.8.0.5:8000', permitidas);
    expect(fora.ok).toBe(false);
    if (!fora.ok) expect(fora.motivo).toContain('não está no CSP');
    expect(validarApiUrl('http://192.168.20.210:9000', permitidas).ok).toBe(false);
    expect(validarApiUrl('192.168.20.210:8000', permitidas).ok).toBe(false);
    expect(validarApiUrl('ftp://192.168.20.210:8000', permitidas).ok).toBe(false);
  });

  it('escopo do plugin HTTP lista os mesmos hosts da API que o CSP', () => {
    const http = capability.permissions.find(
      (p): p is { identifier: string; allow: Array<{ url: string }> } =>
        typeof p === 'object' && p.identifier === 'http:default',
    );
    expect(http, 'capability http:default ausente').toBeDefined();
    const doEscopo = http!.allow.map((a) => new URL(a.url.replace(/\*$/, '')).origin).sort();
    const daApi = origensPermitidas().filter((o) => !o.startsWith('https://')).sort();
    expect(doEscopo).toEqual(daApi);
  });
});
