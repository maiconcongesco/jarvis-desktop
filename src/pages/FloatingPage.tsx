/**
 * Chat rápido da janela flutuante (F6). Texto only — sem voz/HUD (F5).
 * Esc fecha; a conversa entra no mesmo histórico local da janela principal.
 */

import { useEffect, useRef, useState } from 'react';
import { Square, X } from 'lucide-react';
import { toast } from 'sonner';
import { MessageView } from '../components/chat/MessageView';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { mensagemErroRede } from '../lib/errors';
import {
  generateMessageId,
  useHistoryStore,
  type ToolCallLive,
} from '../lib/history';
import { streamChat, textoCanonico } from '../lib/jarvis';
import { fecharJanelaFlutuante } from '../lib/native';
import { getDesktopToken } from '../lib/vault';

export function FloatingPage() {
  const activeId = useHistoryStore((s) => s.activeId);
  const conversations = useHistoryStore((s) => s.conversations);
  const nova = useHistoryStore((s) => s.nova);
  const appendMessage = useHistoryStore((s) => s.appendMessage);
  const updateMessage = useHistoryStore((s) => s.updateMessage);

  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [temToken, setTemToken] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const ativa = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    useHistoryStore.getState().hydrate();
    if (!useHistoryStore.getState().activeId) {
      useHistoryStore.getState().nova();
    }
    void getDesktopToken().then((t) => setTemToken(Boolean(t)));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [ativa?.messages, streaming]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void fecharJanelaFlutuante();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const enviar = async () => {
    const texto = draft.trim();
    if (!texto || streaming) return;
    if (!temToken) {
      toast.error('Configure o token na janela principal.');
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
          updateMessage(convId, assistantId, {
            content: textoCanonico(acumulado, ev.text),
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
        }
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        const msg = mensagemErroRede(e);
        updateMessage(convId, assistantId, { content: msg });
        toast.error(msg);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden rounded-xl"
      style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <header
        className="flex items-center justify-between px-3 py-2 shrink-0"
        data-tauri-drag-region
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
          Jarvis
        </span>
        <button
          type="button"
          className="p-1 rounded opacity-70 hover:opacity-100"
          title="Fechar (Esc)"
          onClick={() => void fecharJanelaFlutuante()}
        >
          <X size={14} style={{ color: 'var(--color-text)' }} />
        </button>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
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
            />
          ))
        ) : (
          <p className="m-auto text-center text-xs opacity-70" style={{ color: 'var(--color-text)' }}>
            Ctrl+Espaço · Esc fecha
          </p>
        )}
      </div>

      <div
        className="shrink-0 border-t p-2 flex gap-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Pergunte ao JARVIS…"
          disabled={streaming}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void enviar();
            }
          }}
        />
        {streaming ? (
          <Button type="button" variant="outline" onClick={() => abortRef.current?.abort()}>
            <Square size={14} />
          </Button>
        ) : (
          <Button type="button" onClick={() => void enviar()} disabled={!draft.trim()}>
            Enviar
          </Button>
        )}
      </div>
    </div>
  );
}
