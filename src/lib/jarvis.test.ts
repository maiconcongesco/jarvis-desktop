import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JarvisApiError } from './errors';
import {
  enviarFeedback,
  obterTrace,
  streamChat,
  textoCanonico,
} from './jarvis';
import { DEFAULT_API_URL, useSettingsStore } from './settings';
import { _resetVaultMemoria, setDesktopToken } from './vault';

function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i++]));
    },
  });
}

describe('jarvis client', () => {
  beforeEach(async () => {
    useSettingsStore.setState({ apiUrl: DEFAULT_API_URL, theme: 'system' });
    _resetVaultMemoria();
    sessionStorage.clear();
    await setDesktopToken('token-teste-32-bytes-aaaaaaaaaa');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    _resetVaultMemoria();
    sessionStorage.clear();
  });

  it('streamChat emite eventos na ordem e manda Bearer', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        sseBody([
          'event: rota\ndata: {"agente":"core"}\n\n',
          'event: ferramenta_inicio\ndata: {"id":"1","nome":"web.buscar"}\n\n',
          'event: ferramenta_fim\ndata: {"id":"1","nome":"web.buscar","ok":true,"ms":12}\n\n',
          'event: frase\ndata: {"texto":"Parcial."}\n\n',
          'event: fim\ndata: {"text":"Canônico.","trace_id":"t1","agent":"core","modelo":"m","latencia_ms":100,"custo_usd":0.01}\n\n',
        ]),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
      ),
    );

    const eventos = [];
    for await (const ev of streamChat({ text: 'oi' })) {
      eventos.push(ev);
    }

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/v1/chat/stream');
    expect((init?.headers as Headers).get('Authorization')).toMatch(/^Bearer /);
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ channel: 'desktop', user_ref: 'dono', text: 'oi' });

    expect(eventos.map((e) => e.tipo)).toEqual([
      'rota',
      'ferramenta_inicio',
      'ferramenta_fim',
      'frase',
      'fim',
    ]);
    const fim = eventos.find((e) => e.tipo === 'fim');
    expect(fim).toMatchObject({ text: 'Canônico.', trace_id: 't1' });
    expect(textoCanonico('Parcial.', 'Canônico.')).toBe('Canônico.');
  });

  it('401 vira mensagem em pt-BR', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: 'token recusado' }), { status: 401 }),
    );
    let err: unknown;
    try {
      for await (const _ of streamChat({ text: 'x' })) {
        /* */
      }
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(JarvisApiError);
    expect((err as JarvisApiError).message).toContain('Token recusado');
  });

  it('obterTrace e feedback', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            trace_id: 't1',
            criado_em: '2026-10-17T00:00:00Z',
            canal: 'desktop',
            agente: 'core',
            modelo: 'm',
            variante: null,
            desfecho: 'ok',
            erro: null,
            latencia_ms: 10,
            tokens_in: 1,
            tokens_out: 2,
            custo_usd: 0,
            ferramentas: [],
            feedback: [],
            pedido: 'oi',
            resposta: 'olá',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));

    const trace = await obterTrace('t1');
    expect(trace.agente).toBe('core');
    await enviarFeedback('t1', 'up');
    expect(vi.mocked(fetch).mock.calls[1]![0]).toContain('/v1/feedback');
  });
});
