export function SobrePage() {
  return (
    <div className="max-w-lg mx-auto p-6 flex flex-col gap-4 text-sm" style={{ color: 'var(--color-text)' }}>
      <h1 className="text-xl font-semibold">Sobre o Jarvis Desktop</h1>
      <p>
        Cliente nativo do JARVIS para Windows. O cérebro continua na API da VM
        <code className="mx-1">jarvis-01</code>; este app só conversa com ela.
      </p>
      <p>
        A casca Tauri e o kit visual foram derivados do front-end do{' '}
        <a
          href="https://github.com/open-jarvis/OpenJarvis"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--color-accent)' }}
        >
          OpenJarvis
        </a>{' '}
        (Apache-2.0). Detalhes em <code>NOTICE</code>.
      </p>
      <p className="opacity-70">Versão 0.1.3 · updater assinado (F7)</p>
    </div>
  );
}
