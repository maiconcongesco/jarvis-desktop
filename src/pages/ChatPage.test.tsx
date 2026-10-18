import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHistoryStore } from '../lib/history';
import { DEFAULT_API_URL, DEFAULT_SHORTCUT, useSettingsStore } from '../lib/settings';
import { _resetVaultMemoria, setDesktopToken } from '../lib/vault';
import { sseBody, sseBodyTravado } from '../test/sse';
import { ChatPage } from './ChatPage';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  message: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: toastMock }));

/** fetch: /healthz ok; /v1/chat/stream devolve o corpo SSE dado. */
function mockFetch(corpo: () => ReadableStream<Uint8Array>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/healthz')) return new Response('ok', { status: 200 });
      if (url.includes('/v1/chat/stream')) {
        return new Response(corpo(), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }
      return new Response('{}', { status: 404 });
    }),
  );
}

function renderPagina() {
  return render(
    <MemoryRouter>
      <ChatPage />
    </MemoryRouter>,
  );
}

async function enviarMensagem(texto: string) {
  const user = userEvent.setup();
  renderPagina();
  // Espera o token ser lido do cofre (aviso some) antes de enviar.
  await waitFor(() => expect(screen.queryByText(/Falta o token desktop/)).toBeNull());
  await user.type(screen.getByPlaceholderText('Fale com o JARVIS…'), texto);
  await user.click(screen.getByRole('button', { name: 'Enviar' }));
  return user;
}

describe('ChatPage', () => {
  beforeEach(async () => {
    // jsdom não implementa scrollTo em elementos.
    if (!Element.prototype.scrollTo) {
      Element.prototype.scrollTo = () => {};
    }
    useSettingsStore.setState({
      apiUrl: DEFAULT_API_URL,
      theme: 'system',
      voiceAutoplay: false,
      autostart: true,
      globalShortcut: DEFAULT_SHORTCUT,
    });
    useHistoryStore.setState({ conversations: [], activeId: null });
    localStorage.clear();
    sessionStorage.clear();
    _resetVaultMemoria();
    await setDesktopToken('token-teste-32-bytes-aaaaaaaaaa');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    _resetVaultMemoria();
    sessionStorage.clear();
  });

  it('mostra as frases e depois o texto canônico do fim', async () => {
    mockFetch(() =>
      sseBody([
        'event: rota\ndata: {"agente":"core"}\n\n',
        'event: frase\ndata: {"texto":"Olá,"}\n\n',
        'event: frase\ndata: {"texto":"tudo bem?"}\n\n',
        'event: fim\ndata: {"text":"Olá! Tudo bem por aqui.","trace_id":"t1","agent":"core","modelo":"m","latencia_ms":10,"custo_usd":0}\n\n',
      ]),
    );

    await enviarMensagem('oi');

    // "oi" aparece na bolha do usuário e no título da conversa.
    expect((await screen.findAllByText('oi')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Olá! Tudo bem por aqui.')).toBeTruthy();
    // Terminou: volta o botão Enviar.
    expect(await screen.findByRole('button', { name: 'Enviar' })).toBeTruthy();

    const conv = useHistoryStore.getState().conversations[0]!;
    const resposta = conv.messages[conv.messages.length - 1]!;
    expect(resposta).toMatchObject({
      role: 'assistant',
      content: 'Olá! Tudo bem por aqui.',
      trace_id: 't1',
      agent: 'core',
    });
  });

  it('mostra as frases parciais enquanto o stream segue', async () => {
    mockFetch(() => sseBodyTravado('event: frase\ndata: {"texto":"Pensando."}\n\n'));

    const user = await enviarMensagem('oi');

    expect(await screen.findByText('Pensando.')).toBeTruthy();
    await user.click(await screen.findByRole('button', { name: /Parar/ }));
    // Interrompido com texto parcial: mantém o parcial.
    expect(await screen.findByRole('button', { name: 'Enviar' })).toBeTruthy();
    expect(screen.getByText('Pensando.')).toBeTruthy();
  });

  it('botão Parar gera "(interrompido)"', async () => {
    mockFetch(() => sseBodyTravado('event: rota\ndata: {"agente":"core"}\n\n'));

    const user = await enviarMensagem('oi');

    await user.click(await screen.findByRole('button', { name: /Parar/ }));

    expect(await screen.findByText('(interrompido)')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Enviar' })).toBeTruthy();
    expect(toastMock.error).not.toHaveBeenCalled();
  });
});
