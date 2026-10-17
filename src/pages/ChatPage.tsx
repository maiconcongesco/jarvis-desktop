import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Square, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MessageView } from '../components/chat/MessageView';
import { TracePanel } from '../components/chat/TracePanel';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { mensagemErroRede } from '../lib/errors';
import { checkHealth } from '../lib/health';
import {
  generateMessageId,
  useHistoryStore,
  type ToolCallLive,
} from '../lib/history';
import {
  enviarFeedback,
  streamChat,
  textoCanonico,
} from '../lib/jarvis';
import { getApiUrl } from '../lib/settings';
import { getDesktopToken } from '../lib/vault';

export function ChatPage() {
  const conversations = useHistoryStore((s) => s.conversations);
  const activeId = useHistoryStore((s) => s.activeId);
  const nova = useHistoryStore((s) => s.nova);
  const setActive = useHistoryStore((s) => s.setActive);
  const apagar = useHistoryStore((s) => s.apagar);
  const appendMessage = useHistoryStore((s) => s.appendMessage);
  const updateMessage = useHistoryStore((s) => s.updateMessage);
  const buscar = useHistoryStore((s) => s.buscar);

  const [reachable, setReachable] = useState<boolean | null>(null);
  const [temToken, setTemToken] = useState<boolean | null>(null);
  const [draft, setDraft] = useState('');
  const [busca, setBusca] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [traceAberto, setTraceAberto] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const lista = useMemo(() => buscar(busca), [busca, conversations, buscar]);
  const ativa = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    useHistoryStore.getState().hydrate();
    if (!useHistoryStore.getState().activeId) {
      useHistoryStore.getState().nova();
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      void checkHealth().then((ok) => {
        if (alive) setReachable(ok);
      });
      void getDesktopToken().then((t) => {
        if (alive) setTemToken(Boolean(t));
      });
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [ativa?.messages, streaming]);

  const enviar = async () => {
    const texto = draft.trim();
    if (!texto || streaming) return;
    if (!temToken) {
      toast.error('Configure o token em Configurações.');
      return;
    }
    let convId = activeId;
    if (!convId) convId = nova();

    const userMsg = {
      id: generateMessageId(),
      role: 'user' as const,
      content: texto,
      createdAt: Date.now(),
    };
    const assistantId = generateMessageId();
    appendMessage(convId, userMsg);
    appendMessage(convId, {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      tools: [],
    });
    setDraft('');
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acumulado = '';
    const tools = new Map<string, ToolCallLive>();

    try {
      for await (const ev of streamChat({ text: texto, signal: ctrl.signal })) {
        if (ev.tipo === 'rota') {
          updateMessage(convId, assistantId, { agent: ev.agente });
        } else if (ev.tipo === 'ferramenta_inicio') {
          tools.set(ev.id, {
            id: ev.id,
            nome: ev.nome,
            status: 'running',
          });
          updateMessage(convId, assistantId, { tools: [...tools.values()] });
        } else if (ev.tipo === 'ferramenta_fim') {
          tools.set(ev.id, {
            id: ev.id,
            nome: ev.nome,
            ok: ev.ok,
            ms: ev.ms,
            status: ev.ok ? 'ok' : 'erro',
          });
          updateMessage(convId, assistantId, { tools: [...tools.values()] });
        } else if (ev.tipo === 'frase') {
          acumulado = acumulado ? `${acumulado} ${ev.texto}` : ev.texto;
          updateMessage(convId, assistantId, { content: acumulado });
        } else if (ev.tipo === 'fim') {
          const final = textoCanonico(acumulado, ev.text);
          updateMessage(convId, assistantId, {
            content: final,
            agent: ev.agent,
            modelo: ev.modelo,
            latencia_ms: ev.latencia_ms,
            custo_usd: ev.custo_usd,
            trace_id: ev.trace_id,
          });
        } else if (ev.tipo === 'erro') {
          updateMessage(convId, assistantId, {
            content: ev.detalhe || 'Erro no turno.',
          });
          toast.error(ev.detalhe);
        }
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        updateMessage(convId, assistantId, {
          content: acumulado || '(interrompido)',
        });
      } else {
        const msg = mensagemErroRede(e);
        updateMessage(convId, assistantId, { content: msg });
        toast.error(msg);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const parar = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="flex h-full min-h-0">
      <aside
        className="w-56 shrink-0 border-r flex flex-col gap-2 p-2"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
      >
        <Button
          type="button"
          size="sm"
          onClick={() => nova()}
          className="justify-start gap-1"
        >
          <Plus size={14} /> Nova
        </Button>
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-2.5 opacity-50"
          />
          <Input
            className="pl-7 h-8 text-xs"
            placeholder="Buscar…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1">
          {lista.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-1 rounded px-1"
              style={{
                background:
                  c.id === activeId ? 'var(--color-accent-subtle)' : 'transparent',
              }}
            >
              <button
                type="button"
                className="flex-1 text-left text-xs truncate py-1.5 px-1"
                onClick={() => setActive(c.id)}
              >
                {c.title}
              </button>
              <button
                type="button"
                className="opacity-50 hover:opacity-100 p-1"
                aria-label="Apagar conversa"
                onClick={() => apagar(c.id)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-[10px] opacity-60 px-1">
          {reachable === true && 'JARVIS no ar'}
          {reachable === false && 'JARVIS inacessível'}
          {reachable === null && '…'}
          {' · '}
          <code className="break-all">{getApiUrl()}</code>
        </p>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col">
        {!temToken && (
          <div
            className="text-sm px-4 py-2"
            style={{
              background: 'var(--color-accent-amber-subtle)',
              color: 'var(--color-text)',
            }}
          >
            Falta o token desktop.{' '}
            <Link to="/configuracoes" className="underline">
              Abrir configurações
            </Link>
          </div>
        )}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {ativa?.messages.length ? (
            ativa.messages.map((m) => (
              <MessageView
                key={m.id}
                message={m}
                streaming={
                  streaming &&
                  m.role === 'assistant' &&
                  m === ativa.messages[ativa.messages.length - 1]
                }
                onVerTrace={
                  m.trace_id ? () => setTraceAberto(m.trace_id!) : undefined
                }
                onFeedback={
                  m.trace_id
                    ? (kind) => {
                        void enviarFeedback(m.trace_id!, kind)
                          .then(() => {
                            updateMessage(ativa.id, m.id, { feedback: kind });
                            toast.success(
                              kind === 'up' ? 'Feedback positivo' : 'Feedback negativo',
                            );
                          })
                          .catch((e) => toast.error(mensagemErroRede(e)));
                      }
                    : undefined
                }
              />
            ))
          ) : (
            <div className="m-auto text-center opacity-70 text-sm" style={{ color: 'var(--color-text)' }}>
              <p className="text-lg font-semibold mb-2">Jarvis</p>
              <p>Digite abaixo. As respostas chegam frase a frase via `/v1/chat/stream`.</p>
            </div>
          )}
        </div>
        <div
          className="shrink-0 border-t p-3 flex gap-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Fale com o JARVIS…"
            disabled={streaming}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void enviar();
              }
            }}
          />
          {streaming ? (
            <Button type="button" variant="outline" onClick={parar}>
              <Square size={14} /> Parar
            </Button>
          ) : (
            <Button type="button" onClick={() => void enviar()} disabled={!draft.trim()}>
              Enviar
            </Button>
          )}
        </div>
      </section>

      {traceAberto && (
        <TracePanel traceId={traceAberto} onClose={() => setTraceAberto(null)} />
      )}
    </div>
  );
}
