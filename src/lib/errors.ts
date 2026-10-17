/** Mensagens de erro em pt-BR para o cliente da API. */

export class JarvisApiError extends Error {
  readonly status: number;
  readonly detalhe: string;

  constructor(status: number, detalhe: string) {
    super(detalhe);
    this.name = 'JarvisApiError';
    this.status = status;
    this.detalhe = detalhe;
  }
}

export function mensagemErroHttp(status: number, detalhe?: string): string {
  if (status === 401) {
    return 'Token recusado: confira em Configurações.';
  }
  if (status === 503) {
    return 'API sem token desktop configurado (JARVIS_DESKTOP_TOKEN).';
  }
  if (status === 404) {
    return detalhe?.trim() || 'Recurso não encontrado.';
  }
  if (status === 409) {
    return detalhe?.trim() || 'Conflito: o recurso já foi decidido.';
  }
  if (status === 0) {
    return 'O JARVIS não respondeu em 30 s.';
  }
  return detalhe?.trim() || `Erro da API (${status}).`;
}

export function mensagemErroRede(err: unknown): string {
  if (err instanceof JarvisApiError) return err.message;
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'O JARVIS não respondeu em 30 s.';
  }
  if (err instanceof TypeError) {
    return 'O JARVIS está inacessível. Confira a URL e a VPN/LAN.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Falha de rede ao falar com o JARVIS.';
}
