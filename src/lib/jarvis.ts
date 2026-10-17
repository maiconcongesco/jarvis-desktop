/**
 * Cliente tipado da API do JARVIS (desktop).
 * Canal fixo `desktop`, user_ref `dono`. Bearer via cofre.
 */

import { JarvisApiError, mensagemErroHttp } from './errors';
import { jarvisFetch } from './http';
import { getApiUrl } from './settings';
import { lerSse } from './sse';
import { getDesktopToken } from './vault';

const CANAL = 'desktop';
const USER_REF = 'dono';
const TIMEOUT_PADRAO_MS = 30_000;

export interface ChatStreamInicio {
  text: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export type EventoStream =
  | { tipo: 'rota'; agente: string }
  | { tipo: 'ferramenta_inicio'; id: string; nome: string }
  | { tipo: 'ferramenta_fim'; id: string; nome: string; ok: boolean; ms: number }
  | { tipo: 'frase'; texto: string }
  | {
      tipo: 'fim';
      text: string;
      trace_id: string;
      agent: string;
      modelo: string;
      latencia_ms: number;
      custo_usd: number;
    }
  | { tipo: 'erro'; detalhe: string };

export interface TraceDetalhe {
  trace_id: string;
  criado_em: string;
  canal: string;
  agente: string;
  modelo: string;
  variante: string | null;
  desfecho: string;
  erro: string | null;
  latencia_ms: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  custo_usd: number | null;
  ferramentas: Array<{ nome: string; status: unknown }>;
  feedback: string[];
  pedido: string;
  resposta: string;
}

export type FeedbackKind = 'up' | 'down' | 'correcao' | 'intervencao' | 'reformulacao';

async function authHeaders(
  extra?: HeadersInit,
  opts?: { json?: boolean },
): Promise<Headers> {
  const headers = new Headers(extra);
  const token = await getDesktopToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const querJson = opts?.json !== false;
  if (querJson && !headers.has('Content-Type') && !headers.has('content-type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

/** Cabeçalhos X-Transcript / X-Text vêm percent-encoded (HTTP latin-1). */
export function decodificarCabecalho(valor: string | null): string {
  if (!valor) return '';
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

async function parseErro(res: Response): Promise<JarvisApiError> {
  let detalhe = '';
  try {
    const corpo = (await res.json()) as { detail?: unknown };
    if (typeof corpo.detail === 'string') detalhe = corpo.detail;
    else if (corpo.detail != null) detalhe = JSON.stringify(corpo.detail);
  } catch {
    try {
      detalhe = await res.text();
    } catch {
      /* ignore */
    }
  }
  return new JarvisApiError(res.status, mensagemErroHttp(res.status, detalhe));
}

function comTimeout(signal: AbortSignal | undefined, ms: number): {
  signal: AbortSignal;
  limpar: () => void;
} {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  return {
    signal: ctrl.signal,
    limpar: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

export async function testarAutenticacao(timeoutMs = 10_000): Promise<void> {
  const base = getApiUrl();
  const { signal, limpar } = comTimeout(undefined, timeoutMs);
  try {
    const res = await jarvisFetch(`${base}/v1/aprovacoes?status=pendente`, {
      headers: await authHeaders(),
      signal,
    });
    if (!res.ok) throw await parseErro(res);
  } finally {
    limpar();
  }
}

export async function* streamChat(
  pedido: ChatStreamInicio,
): AsyncGenerator<EventoStream> {
  const base = getApiUrl();
  const timeoutMs = pedido.timeoutMs ?? TIMEOUT_PADRAO_MS;
  const { signal, limpar } = comTimeout(pedido.signal, timeoutMs);
  try {
    const res = await jarvisFetch(`${base}/v1/chat/stream`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        channel: CANAL,
        user_ref: USER_REF,
        text: pedido.text,
      }),
      signal,
    });
    if (!res.ok) throw await parseErro(res);

    for await (const frame of lerSse(res, signal)) {
      let dados: Record<string, unknown> = {};
      try {
        dados = JSON.parse(frame.data) as Record<string, unknown>;
      } catch {
        continue;
      }
      switch (frame.event) {
        case 'rota':
          yield { tipo: 'rota', agente: String(dados.agente ?? '') };
          break;
        case 'ferramenta_inicio':
          yield {
            tipo: 'ferramenta_inicio',
            id: String(dados.id ?? ''),
            nome: String(dados.nome ?? ''),
          };
          break;
        case 'ferramenta_fim':
          yield {
            tipo: 'ferramenta_fim',
            id: String(dados.id ?? ''),
            nome: String(dados.nome ?? ''),
            ok: Boolean(dados.ok),
            ms: Number(dados.ms ?? 0),
          };
          break;
        case 'frase':
          yield { tipo: 'frase', texto: String(dados.texto ?? '') };
          break;
        case 'fim':
          yield {
            tipo: 'fim',
            text: String(dados.text ?? ''),
            trace_id: String(dados.trace_id ?? ''),
            agent: String(dados.agent ?? ''),
            modelo: String(dados.modelo ?? ''),
            latencia_ms: Number(dados.latencia_ms ?? 0),
            custo_usd: Number(dados.custo_usd ?? 0),
          };
          break;
        case 'erro':
          yield { tipo: 'erro', detalhe: String(dados.detalhe ?? 'erro') };
          break;
        default:
          break;
      }
    }
  } finally {
    limpar();
  }
}

export async function obterTrace(traceId: string, timeoutMs = TIMEOUT_PADRAO_MS): Promise<TraceDetalhe> {
  const base = getApiUrl();
  const { signal, limpar } = comTimeout(undefined, timeoutMs);
  try {
    const res = await jarvisFetch(`${base}/v1/traces/${encodeURIComponent(traceId)}`, {
      headers: await authHeaders(),
      signal,
    });
    if (!res.ok) throw await parseErro(res);
    return (await res.json()) as TraceDetalhe;
  } finally {
    limpar();
  }
}

export async function enviarFeedback(
  traceId: string,
  kind: FeedbackKind,
  text?: string,
  timeoutMs = TIMEOUT_PADRAO_MS,
): Promise<void> {
  const base = getApiUrl();
  const { signal, limpar } = comTimeout(undefined, timeoutMs);
  try {
    const res = await jarvisFetch(`${base}/v1/feedback`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        trace_id: traceId,
        kind,
        text: text ?? null,
      }),
      signal,
    });
    if (!res.ok) throw await parseErro(res);
  } finally {
    limpar();
  }
}

/** Aplica o texto canônico do evento `fim` no lugar do acumulado de frases. */
export function textoCanonico(exibido: string, fimText: string): string {
  return fimText;
}

export interface AprovacaoPendente {
  id: string;
  ferramenta: string;
  parametros: Record<string, unknown>;
  limite: string;
  solicitada_em: string;
  trace_id: string;
}

export async function listarAprovacoes(
  timeoutMs = 10_000,
): Promise<AprovacaoPendente[]> {
  const base = getApiUrl();
  const { signal, limpar } = comTimeout(undefined, timeoutMs);
  try {
    const res = await jarvisFetch(`${base}/v1/aprovacoes?status=pendente`, {
      headers: await authHeaders(),
      signal,
    });
    if (!res.ok) throw await parseErro(res);
    return (await res.json()) as AprovacaoPendente[];
  } finally {
    limpar();
  }
}

export interface RespostaVoz {
  transcript: string;
  text: string;
  trace_id: string;
  agent: string;
  audio: Blob;
}

export interface HudSecao {
  nome: string;
  ok: boolean;
  resumo: string;
  cegueira: string | null;
}

export interface HudAprovacao {
  id: string;
  ferramenta: string;
  limite: string;
  params: Record<string, unknown>;
}

export interface HudDados {
  secoes: HudSecao[];
  aprovacoes: HudAprovacao[];
  agora: string;
}

/** POST /v1/voice — WAV PCM 16 kHz; canal no servidor é `voz`. */
export async function enviarVoz(
  wav: Blob,
  opts?: { userRef?: string; signal?: AbortSignal; timeoutMs?: number },
): Promise<RespostaVoz> {
  const base = getApiUrl();
  const timeoutMs = opts?.timeoutMs ?? 60_000;
  const { signal, limpar } = comTimeout(opts?.signal, timeoutMs);
  try {
    const form = new FormData();
    form.append('audio', wav, 'fala.wav');
    form.append('user_ref', opts?.userRef ?? 'dono');
    const res = await jarvisFetch(`${base}/v1/voice`, {
      method: 'POST',
      headers: await authHeaders(undefined, { json: false }),
      body: form,
      signal,
    });
    if (!res.ok) throw await parseErro(res);
    return {
      transcript: decodificarCabecalho(res.headers.get('X-Transcript')),
      text: decodificarCabecalho(res.headers.get('X-Text')),
      trace_id: res.headers.get('X-Trace-Id') ?? '',
      agent: decodificarCabecalho(res.headers.get('X-Agent')),
      audio: await res.blob(),
    };
  } finally {
    limpar();
  }
}

/** POST /v1/tts — até 1000 caracteres; devolve audio/wav. */
export async function sintetizarTts(
  texto: string,
  opts?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<Blob> {
  const trimmed = texto.trim().slice(0, 1000);
  if (!trimmed) throw new JarvisApiError(400, 'texto vazio');
  const base = getApiUrl();
  const timeoutMs = opts?.timeoutMs ?? TIMEOUT_PADRAO_MS;
  const { signal, limpar } = comTimeout(opts?.signal, timeoutMs);
  try {
    const res = await jarvisFetch(`${base}/v1/tts`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ texto: trimmed }),
      signal,
    });
    if (!res.ok) throw await parseErro(res);
    return await res.blob();
  } finally {
    limpar();
  }
}

export async function obterHudDados(timeoutMs = TIMEOUT_PADRAO_MS): Promise<HudDados> {
  const base = getApiUrl();
  const { signal, limpar } = comTimeout(undefined, timeoutMs);
  try {
    const res = await jarvisFetch(`${base}/v1/hud/dados`, {
      headers: await authHeaders(),
      signal,
    });
    if (!res.ok) throw await parseErro(res);
    return (await res.json()) as HudDados;
  } finally {
    limpar();
  }
}

export async function negarAprovacao(
  id: string,
  timeoutMs = TIMEOUT_PADRAO_MS,
): Promise<void> {
  const base = getApiUrl();
  const { signal, limpar } = comTimeout(undefined, timeoutMs);
  try {
    const res = await jarvisFetch(
      `${base}/v1/aprovacoes/${encodeURIComponent(id)}/negar`,
      {
        method: 'POST',
        headers: await authHeaders(),
        signal,
      },
    );
    if (!res.ok) throw await parseErro(res);
  } finally {
    limpar();
  }
}

/**
 * POST /v1/aprovacoes/{id}/executar — exige status `confirmada` no servidor
 * (Telegram marca antes). Pendente → 409 até a API aceitar o fluxo desktop.
 */
export async function executarAprovacao(
  id: string,
  timeoutMs = TIMEOUT_PADRAO_MS,
): Promise<{ status: string; resultado?: string }> {
  const base = getApiUrl();
  const { signal, limpar } = comTimeout(undefined, timeoutMs);
  try {
    const res = await jarvisFetch(
      `${base}/v1/aprovacoes/${encodeURIComponent(id)}/executar`,
      {
        method: 'POST',
        headers: await authHeaders(),
        signal,
      },
    );
    if (!res.ok) throw await parseErro(res);
    return (await res.json()) as { status: string; resultado?: string };
  } finally {
    limpar();
  }
}
