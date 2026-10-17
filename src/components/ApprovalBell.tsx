import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle, ChevronDown, ChevronUp, Clock, XCircle } from 'lucide-react';
import {
  executarAprovacao,
  listarAprovacoes,
  negarAprovacao,
  type AprovacaoPendente,
} from '../lib/jarvis';
import { notificarAprovacao, onAbrirSino } from '../lib/native';

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function ApprovalBell() {
  const [aprovacoes, setAprovacoes] = useState<AprovacaoPendente[]>([]);
  const [aberto, setAberto] = useState(false);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [processando, setProcessando] = useState<Record<string, boolean>>({});
  const conhecidos = useRef<Set<string>>(new Set());
  const primeiraCarga = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    try {
      const lista = await listarAprovacoes();
      if (!primeiraCarga.current) {
        for (const item of lista) {
          if (!conhecidos.current.has(item.id)) {
            void notificarAprovacao(item.ferramenta, item.limite);
          }
        }
      }
      conhecidos.current = new Set(lista.map((a) => a.id));
      primeiraCarga.current = false;
      setAprovacoes(lista);
    } catch {
      /* API offline ou sem token — sino fica vazio */
    }
  }, []);

  useEffect(() => {
    void carregar();
    const id = setInterval(() => void carregar(), 10_000);
    return () => clearInterval(id);
  }, [carregar]);

  useEffect(() => onAbrirSino(() => setAberto(true)), []);

  useEffect(() => {
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aberto]);

  const aprovar = async (id: string) => {
    setProcessando((p) => ({ ...p, [id]: true }));
    try {
      await executarAprovacao(id);
      setAprovacoes((prev) => prev.filter((a) => a.id !== id));
      conhecidos.current.delete(id);
    } finally {
      setProcessando((p) => ({ ...p, [id]: false }));
    }
  };

  const negar = async (id: string) => {
    setProcessando((p) => ({ ...p, [id]: true }));
    try {
      await negarAprovacao(id);
      setAprovacoes((prev) => prev.filter((a) => a.id !== id));
      conhecidos.current.delete(id);
    } finally {
      setProcessando((p) => ({ ...p, [id]: false }));
    }
  };

  const count = aprovacoes.length;

  return (
    <div ref={containerRef} className="relative z-40">
      <button
        type="button"
        onClick={() => setAberto((o) => !o)}
        className="relative p-2 rounded-lg transition-colors cursor-pointer"
        title="Aprovações pendentes"
        aria-label="Aprovações pendentes"
        style={{
          color: count > 0 ? 'var(--color-text)' : 'var(--color-text-secondary)',
          background: aberto
            ? 'var(--color-bg-tertiary)'
            : count > 0
              ? 'color-mix(in srgb, var(--color-error) 8%, transparent)'
              : 'transparent',
        }}
      >
        <Bell size={17} />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold px-1 leading-none"
            style={{ background: 'var(--color-error)', color: '#fff' }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {aberto && (
        <div
          className="absolute right-0 top-full mt-1 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            width: '340px',
            maxHeight: '500px',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <Bell size={13} style={{ color: 'var(--color-accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Aprovações
              </span>
            </div>
            {count > 0 && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
                  color: 'var(--color-error)',
                }}
              >
                {count} pendente{count === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {count === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <CheckCircle
                  size={26}
                  style={{ color: 'var(--color-text-secondary)', opacity: 0.35 }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Nenhuma aprovação pendente
                </span>
              </div>
            ) : (
              aprovacoes.map((action, idx) => {
                const isExpanded = !!expandidos[action.id];
                const isLoading = !!processando[action.id];
                const hasPayload = Object.keys(action.parametros ?? {}).length > 0;

                return (
                  <div
                    key={action.id}
                    className="px-4 py-3"
                    style={{
                      borderBottom: idx < count - 1 ? '1px solid var(--color-border)' : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-[11px] font-mono font-semibold truncate"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {action.ferramenta}
                      </span>
                      <span
                        className="text-[10px] flex items-center gap-0.5 shrink-0"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <Clock size={9} />
                        {tempoRelativo(action.solicitada_em)}
                      </span>
                    </div>

                    <p
                      className="text-[12px] mb-2 leading-snug"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Limite: {action.limite}
                    </p>

                    {hasPayload && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-[11px] mb-2 cursor-pointer"
                        style={{ color: 'var(--color-text-secondary)' }}
                        onClick={() =>
                          setExpandidos((e) => ({ ...e, [action.id]: !e[action.id] }))
                        }
                      >
                        {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        {isExpanded ? 'Ocultar parâmetros' : 'Ver parâmetros'}
                      </button>
                    )}

                    {isExpanded && (
                      <pre
                        className="text-[10px] rounded-lg p-2.5 mb-2.5 overflow-x-auto"
                        style={{
                          background: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-secondary)',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          lineHeight: '1.5',
                        }}
                      >
                        {JSON.stringify(action.parametros, null, 2)}
                      </pre>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void aprovar(action.id)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity cursor-pointer disabled:opacity-40"
                        style={{
                          background: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
                          color: 'var(--color-success)',
                          border:
                            '1px solid color-mix(in srgb, var(--color-success) 22%, transparent)',
                        }}
                      >
                        <CheckCircle size={12} />
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => void negar(action.id)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity cursor-pointer disabled:opacity-40"
                        style={{
                          background: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
                          color: 'var(--color-error)',
                          border:
                            '1px solid color-mix(in srgb, var(--color-error) 22%, transparent)',
                        }}
                      >
                        <XCircle size={12} />
                        Negar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
