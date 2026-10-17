import { useState } from 'react';
import { ThumbsDown, ThumbsUp, Volume2, VolumeX, Waypoints } from 'lucide-react';
import type { ChatMessage, ToolCallLive } from '../../lib/history';
import { useTtsStore } from '../../lib/tts';
import { Button } from '../ui/button';

function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function formatCusto(usd: number): string {
  if (usd <= 0) return 'US$ 0';
  if (usd < 0.01) return `US$ ${usd.toFixed(4)}`;
  return `US$ ${usd.toFixed(3)}`;
}

function ToolCard({ tool }: { tool: ToolCallLive }) {
  const cor =
    tool.status === 'running'
      ? 'var(--color-accent)'
      : tool.status === 'ok'
        ? 'var(--color-success)'
        : 'var(--color-error)';
  return (
    <div
      className="text-xs px-2 py-1 rounded my-1 font-mono"
      style={{
        border: '1px solid var(--color-border)',
        color: cor,
        background: 'var(--color-bg-tertiary)',
      }}
    >
      {tool.status === 'running' ? '… ' : tool.status === 'ok' ? '✓ ' : '✗ '}
      {tool.nome}
      {tool.ms != null ? ` (${tool.ms} ms)` : ''}
    </div>
  );
}

interface Props {
  message: ChatMessage;
  streaming?: boolean;
  onFeedback?: (kind: 'up' | 'down') => void;
  onVerTrace?: () => void;
}

/** Bolha de mensagem (markdown GFM fica para portar do _upstream). */
export function MessageView({ message, streaming, onFeedback, onVerTrace }: Props) {
  const [copiado, setCopiado] = useState(false);
  const isUser = message.role === 'user';
  const ttsState = useTtsStore((s) => s.state);
  const speakingId = useTtsStore((s) => s.speakingId);
  const speak = useTtsStore((s) => s.speak);
  const stop = useTtsStore((s) => s.stop);
  const falandoEsta = speakingId === message.id && ttsState !== 'idle';

  return (
    <div
      className={`flex flex-col gap-1 max-w-[85%] ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
    >
      <div
        className="px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words"
        style={{
          background: isUser ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
      >
        {!isUser &&
          message.tools?.map((t) => <ToolCard key={t.id} tool={t} />)}
        {message.content || (streaming ? 'pensando…' : '')}
      </div>

      {!isUser && !streaming && message.content && (
        <div
          className="flex flex-wrap items-center gap-2 text-xs opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span>
            {[
              message.agent,
              message.modelo,
              message.latencia_ms != null ? formatMs(message.latencia_ms) : null,
              message.custo_usd != null ? formatCusto(message.custo_usd) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          {message.trace_id && onVerTrace && (
            <button
              type="button"
              className="inline-flex items-center gap-1 underline"
              onClick={onVerTrace}
            >
              <Waypoints size={12} /> ver passos
            </button>
          )}
          {message.trace_id && onFeedback && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1"
                aria-label="Gostei"
                disabled={message.feedback === 'up'}
                onClick={() => onFeedback('up')}
              >
                <ThumbsUp size={12} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1"
                aria-label="Não gostei"
                disabled={message.feedback === 'down'}
                onClick={() => onFeedback('down')}
              >
                <ThumbsDown size={12} />
              </Button>
            </>
          )}
          <button
            type="button"
            className="underline"
            onClick={() => {
              void navigator.clipboard.writeText(message.content);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            }}
          >
            {copiado ? 'copiado' : 'copiar'}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1"
            aria-label={falandoEsta ? 'Parar leitura' : 'Ler em voz alta'}
            title={falandoEsta ? 'Parar' : 'Ler em voz alta'}
            onClick={() => {
              if (falandoEsta) stop();
              else void speak(message.id, message.content);
            }}
          >
            {falandoEsta ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </Button>
        </div>
      )}
    </div>
  );
}
