import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { mensagemErroRede } from '../../lib/errors';
import { obterTrace, type TraceDetalhe } from '../../lib/jarvis';
import { Button } from '../ui/button';

interface Props {
  traceId: string;
  onClose: () => void;
}

export function TracePanel({ traceId, onClose }: Props) {
  const [dados, setDados] = useState<TraceDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setDados(null);
    setErro(null);
    void obterTrace(traceId)
      .then((t) => {
        if (alive) setDados(t);
      })
      .catch((e) => {
        if (alive) setErro(mensagemErroRede(e));
      });
    return () => {
      alive = false;
    };
  }, [traceId]);

  return (
    <aside
      className="w-80 shrink-0 h-full overflow-y-auto border-l flex flex-col gap-3 p-4"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text)',
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Passos do turno</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
          <X size={16} />
        </Button>
      </div>
      {erro && (
        <p className="text-sm" style={{ color: 'var(--color-error)' }}>
          {erro}
        </p>
      )}
      {!erro && !dados && <p className="text-sm opacity-70">carregando…</p>}
      {dados && (
        <dl className="text-xs flex flex-col gap-2">
          <Linha rotulo="Agente" valor={dados.agente} />
          <Linha rotulo="Modelo" valor={dados.modelo} />
          <Linha rotulo="Variante" valor={dados.variante ?? '—'} />
          <Linha rotulo="Desfecho" valor={dados.desfecho} />
          <Linha
            rotulo="Latência"
            valor={dados.latencia_ms != null ? `${dados.latencia_ms} ms` : '—'}
          />
          <Linha
            rotulo="Tokens"
            valor={`${dados.tokens_in ?? '—'} → ${dados.tokens_out ?? '—'}`}
          />
          <Linha
            rotulo="Custo"
            valor={dados.custo_usd != null ? `US$ ${dados.custo_usd}` : '—'}
          />
          {dados.erro && <Linha rotulo="Erro" valor={dados.erro} />}
          <Linha
            rotulo="Feedback"
            valor={dados.feedback.length ? dados.feedback.join(', ') : '—'}
          />
          <div>
            <dt className="opacity-70 mb-1">Ferramentas</dt>
            <dd>
              {dados.ferramentas.length === 0 && 'nenhuma'}
              <ul className="list-disc pl-4">
                {dados.ferramentas.map((f, i) => (
                  <li key={`${f.nome}-${i}`}>
                    {f.nome} ({String(f.status)})
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="opacity-70 mb-1">Pedido</dt>
            <dd className="whitespace-pre-wrap break-words">{dados.pedido}</dd>
          </div>
          <div>
            <dt className="opacity-70 mb-1">Resposta</dt>
            <dd className="whitespace-pre-wrap break-words">{dados.resposta}</dd>
          </div>
        </dl>
      )}
    </aside>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="opacity-70">{rotulo}</dt>
      <dd className="break-words">{valor}</dd>
    </div>
  );
}
