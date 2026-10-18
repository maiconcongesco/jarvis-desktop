import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ReactorCanvas, type HudEstado } from '../components/hud/ReactorCanvas';
import { mensagemErroRede } from '../lib/errors';
import { HoldToTalk, micDisponivel } from '../lib/holdToTalk';
import {
  enviarVoz,
  executarAprovacao,
  negarAprovacao,
  obterHudDados,
  streamChat,
  type HudAprovacao,
  type HudSecao,
} from '../lib/jarvis';
import { useTtsStore } from '../lib/tts';
import '../styles/hud.css';

const TITULOS: Record<string, string> = {
  agenda: 'Agenda de hoje',
  'e-mail': 'E-mail',
  finanças: 'Finanças do mês',
  infra: 'Homelab',
  contratos: 'Contratos',
};

const ACOES: Record<string, string> = {
  'email.rascunho': 'Criar rascunho de e-mail',
  'agenda.criar_evento': 'Criar evento na agenda',
  'casa.acionar': 'Acionar dispositivo da casa',
  'alexa.anunciar': 'Anunciar no Echo',
  'infra.awx_acao': 'Rodar ação no homelab',
  'memoria.registrar': 'Guardar uma memória',
};

function nomeAcao(ferramenta: string): string {
  return ACOES[ferramenta] || ferramenta;
}

function motivo(limite: string): string {
  if (limite === 'conteudo_externo_suspeito') {
    return 'Pedido veio de um conteúdo com sinais de instrução de terceiros.';
  }
  return 'Passa por um limite que exige sua confirmação.';
}

const DICA =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
    ? 'Segure o reator para falar'
    : 'Segure espaço ou o reator para falar';

function formatHora(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatData(d: Date): string {
  const s = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function HudPage() {
  const [estado, setEstado] = useState<HudEstado>('ocioso');
  const [estadoTexto, setEstadoTexto] = useState(DICA);
  const [nivel, setNivel] = useState(0);
  const [hora, setHora] = useState(() => formatHora(new Date()));
  const [data, setData] = useState(() => formatData(new Date()));
  const [falaVoce, setFalaVoce] = useState('');
  const [falaJarvis, setFalaJarvis] = useState('');
  const [secoes, setSecoes] = useState<HudSecao[]>([]);
  const [aprovacoes, setAprovacoes] = useState<HudAprovacao[]>([]);
  const [draft, setDraft] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  const gravador = useRef(new HoldToTalk());
  const inputRef = useRef<HTMLInputElement>(null);
  const pedidoRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stopTts = useTtsStore((s) => s.stop);
  const playBlob = useTtsStore((s) => s.playBlob);
  const ttsState = useTtsStore((s) => s.state);

  const definirEstado = useCallback((novo: HudEstado, texto?: string) => {
    setEstado(novo);
    setEstadoTexto(
      texto ??
        (
          {
            ocioso: DICA,
            ouvindo: 'Ouvindo. Solte para enviar',
            pensando: 'Pensando',
            falando: 'Falando. Aperte para interromper',
            erro: texto || 'Erro',
          } as Record<HudEstado, string>
        )[novo],
    );
  }, []);

  const falhar = useCallback(
    (texto: string) => {
      definirEstado('erro', texto);
      window.setTimeout(() => {
        setEstado((e) => {
          if (e === 'erro') {
            setEstadoTexto(DICA);
            return 'ocioso';
          }
          return e;
        });
      }, 4000);
    },
    [definirEstado],
  );

  const atualizarDados = useCallback(async () => {
    try {
      const dados = await obterHudDados();
      setSecoes(dados.secoes || []);
      setAprovacoes(dados.aprovacoes || []);
    } catch {
      /* mantém o último quadro */
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      const agora = new Date();
      setHora(formatHora(agora));
      setData(formatData(agora));
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    void atualizarDados();
    const id = window.setInterval(() => void atualizarDados(), 60_000);
    return () => clearInterval(id);
  }, [atualizarDados]);

  useEffect(() => {
    if (ttsState === 'idle' && estado === 'falando') {
      definirEstado('ocioso');
    }
  }, [ttsState, estado, definirEstado]);

  useEffect(() => {
    gravador.current.setLevelListener((n) => setNivel(n));
    return () => gravador.current.setLevelListener(null);
  }, []);

  // Cancela voz/stream em andamento ao sair do HUD.
  useEffect(() => () => pedidoRef.current?.abort(), []);

  const interromper = useCallback(() => {
    pedidoRef.current?.abort();
    stopTts();
    if (estado === 'falando' || estado === 'pensando') definirEstado('ocioso');
  }, [estado, stopTts, definirEstado]);

  const comecarAOuvir = useCallback(async () => {
    if (gravador.current.isRecording) return;
    if (!micDisponivel()) {
      falhar('Microfone indisponível neste ambiente.');
      return;
    }
    pedidoRef.current?.abort();
    stopTts();
    try {
      await gravador.current.start();
      definirEstado('ouvindo');
    } catch {
      falhar('Não consegui abrir o microfone. Libere o acesso no sistema.');
    }
  }, [definirEstado, falhar, stopTts]);

  const pararEEnviar = useCallback(async () => {
    if (!gravador.current.isRecording) return;
    const wav = await gravador.current.stop();
    setNivel(0);
    if (!wav) {
      definirEstado('ocioso', 'Segure um pouco mais enquanto fala');
      return;
    }
    definirEstado('pensando');
    setFalaVoce('…');
    setFalaJarvis('');
    const ctrl = new AbortController();
    pedidoRef.current = ctrl;
    try {
      const r = await enviarVoz(wav, { userRef: 'hud', signal: ctrl.signal });
      setFalaVoce(r.transcript);
      setFalaJarvis(r.text);
      definirEstado('falando');
      await playBlob(`voz-${r.trace_id || Date.now()}`, r.audio);
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setFalaVoce('');
      falhar(mensagemErroRede(e));
    } finally {
      pedidoRef.current = null;
    }
  }, [definirEstado, falhar, playBlob]);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space' || ev.repeat) return;
      if (ev.target === inputRef.current) return;
      ev.preventDefault();
      void comecarAOuvir();
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space') return;
      if (ev.target === inputRef.current) return;
      ev.preventDefault();
      void pararEEnviar();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [comecarAOuvir, pararEEnviar]);

  const enviarTexto = async (ev: FormEvent) => {
    ev.preventDefault();
    const texto = draft.trim();
    if (!texto) return;
    stopTts();
    setDraft('');
    setFalaVoce(texto);
    setFalaJarvis('');
    definirEstado('pensando');
    pedidoRef.current?.abort();
    const ctrl = new AbortController();
    pedidoRef.current = ctrl;
    try {
      let final = '';
      for await (const e of streamChat({ text: texto, signal: ctrl.signal })) {
        if (e.tipo === 'frase') final = final ? `${final} ${e.texto}` : e.texto;
        if (e.tipo === 'fim') final = e.text;
        if (e.tipo === 'erro') throw new Error(e.detalhe);
      }
      setFalaJarvis(final);
      definirEstado('ocioso');
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      falhar(mensagemErroRede(e));
    } finally {
      if (pedidoRef.current === ctrl) pedidoRef.current = null;
    }
  };

  const secaoPor = (nome: string) => secoes.find((s) => s.nome === nome);

  const toggleFs = async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      toast.error('Tela cheia indisponível');
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const esquerda = ['agenda', 'e-mail'] as const;
  const direita = ['finanças', 'infra', 'contratos'] as const;

  return (
    <div
      ref={rootRef}
      className="hud-root"
      data-estado={estado}
      style={{ height: '100%', overflow: 'auto' }}
    >
      <main className="orbita" style={{ minHeight: fullscreen ? '100vh' : '100%' }}>
        <header className="relogio" aria-label="Agora">
          <p className="hora">{hora}</p>
          <p className="data">{data}</p>
          <button
            type="button"
            className="hud-fs"
            onClick={() => void toggleFs()}
            style={{
              marginTop: '0.5rem',
              background: 'transparent',
              border: '1px solid var(--holo-tenue)',
              color: 'var(--texto-calmo)',
              font: 'inherit',
              fontSize: '0.85rem',
              padding: '0.25rem 0.6rem',
              cursor: 'pointer',
            }}
          >
            {fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          </button>
        </header>

        <section
          className="aprovacoes"
          aria-live="polite"
          aria-label="Aprovações pendentes"
          hidden={aprovacoes.length === 0}
        >
          {aprovacoes.map((item) => {
            const params = Object.entries(item.params || {})
              .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
              .join('; ');
            return (
              <article key={item.id} className="pedido">
                <p className="acao-nome">{nomeAcao(item.ferramenta)}</p>
                <p className="detalhe">
                  {motivo(item.limite)} {params}
                </p>
                <div className="botoes">
                  <button
                    type="button"
                    className="confirmar"
                    onClick={() => {
                      void executarAprovacao(item.id)
                        .then(() => {
                          toast.success('Confirmado');
                          void atualizarDados();
                        })
                        .catch((e) => {
                          const msg = mensagemErroRede(e);
                          toast.error(
                            msg.includes('pendente') || msg.includes('409')
                              ? 'Confirmar pelo desktop ainda exige status confirmada na API (use Telegram/painel). Negar funciona.'
                              : msg,
                          );
                        });
                    }}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    className="recusar"
                    onClick={() => {
                      void negarAprovacao(item.id)
                        .then(() => {
                          toast.success('Recusado');
                          void atualizarDados();
                        })
                        .catch((e) => toast.error(mensagemErroRede(e)));
                    }}
                  >
                    Recusar
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="coluna esquerda" aria-label="Seu dia">
          {esquerda.map((nome) => {
            const s = secaoPor(nome);
            return (
              <article
                key={nome}
                className="secao"
                data-secao={nome}
                data-cego={s?.cegueira ? 'sim' : undefined}
              >
                <h2>{TITULOS[nome] ?? nome}</h2>
                <p>
                  {s
                    ? s.cegueira
                      ? `Não consegui ver: ${s.resumo}`
                      : s.resumo
                    : 'Carregando…'}
                </p>
              </article>
            );
          })}
        </aside>

        <div className="nucleo">
          <button
            className="reator"
            type="button"
            aria-describedby="estado-texto"
            onPointerDown={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
              if (estado === 'falando') {
                interromper();
                return;
              }
              void comecarAOuvir();
            }}
            onPointerUp={() => {
              if (estado === 'ouvindo') void pararEEnviar();
            }}
            onPointerCancel={() => {
              if (estado === 'ouvindo') void pararEEnviar();
            }}
          >
            <ReactorCanvas estado={estado} nivel={nivel} />
            <span className="invisivel">Segure para falar com o JARVIS</span>
          </button>
          <p className="estado" id="estado-texto" aria-live="polite">
            {estadoTexto}
          </p>
        </div>

        <aside className="coluna direita" aria-label="Casa e finanças">
          {direita.map((nome) => {
            const s = secaoPor(nome);
            return (
              <article
                key={nome}
                className="secao"
                data-secao={nome}
                data-cego={s?.cegueira ? 'sim' : undefined}
              >
                <h2>{TITULOS[nome] ?? nome}</h2>
                <p>
                  {s
                    ? s.cegueira
                      ? `Não consegui ver: ${s.resumo}`
                      : s.resumo
                    : 'Carregando…'}
                </p>
              </article>
            );
          })}
        </aside>

        <footer className="dialogo">
          <p className="fala voce">{falaVoce}</p>
          <p className="fala jarvis">{falaJarvis}</p>
          <form className="escrever" onSubmit={(e) => void enviarTexto(e)} autoComplete="off">
            <label className="invisivel" htmlFor="hud-texto">
              Escreva para o JARVIS
            </label>
            <input
              ref={inputRef}
              id="hud-texto"
              name="texto"
              type="text"
              placeholder="Ou escreva aqui"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              enterKeyHint="send"
            />
            <button type="submit">Enviar</button>
          </form>
        </footer>
      </main>
    </div>
  );
}
