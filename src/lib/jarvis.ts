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

async function authHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra);
  const token = await getDesktopToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !headers.has('content-type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
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
