import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { checkHealth } from '../lib/health';
import { getApiUrl } from '../lib/settings';

export function ChatPage() {
  const [reachable, setReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      void checkHealth().then((ok) => {
        if (alive) setReachable(ok);
      });
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
        Jarvis Desktop
      </h1>
      <p className="max-w-md text-sm opacity-80" style={{ color: 'var(--color-text)' }}>
        Casca F3 pronta: marca, tema e conexão com a API. O chat com streaming, voz e HUD
        entram nas fases seguintes.
      </p>
      <p className="text-sm" style={{ color: 'var(--color-text)' }}>
        API: <code>{getApiUrl()}</code>
      </p>
      <p className="text-sm" style={{ color: 'var(--color-text)' }}>
        Estado:{' '}
        {reachable === null && 'verificando…'}
        {reachable === true && (
          <span style={{ color: 'var(--color-accent)' }}>JARVIS no ar</span>
        )}
        {reachable === false && (
          <span style={{ color: 'var(--color-error)' }}>JARVIS inacessível</span>
        )}
      </p>
      <Link
        to="/configuracoes"
        className="text-sm underline"
        style={{ color: 'var(--color-accent)' }}
      >
        Abrir configurações
      </Link>
    </div>
  );
}
