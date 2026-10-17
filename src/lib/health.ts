import { getApiUrl } from './settings';

/** Consulta /healthz da API do JARVIS. Sem token — endpoint público na LAN/VPN. */
export async function checkHealth(timeoutMs = 5000): Promise<boolean> {
  const base = getApiUrl();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/healthz`, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
