import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { checkHealth } from '../lib/health';
import { useSettingsStore, type Theme } from '../lib/settings';

export function SettingsPage() {
  const apiUrl = useSettingsStore((s) => s.apiUrl);
  const theme = useSettingsStore((s) => s.theme);
  const setApiUrl = useSettingsStore((s) => s.setApiUrl);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [draft, setDraft] = useState(apiUrl);
  const [testing, setTesting] = useState(false);

  const save = () => {
    setApiUrl(draft.trim() || apiUrl);
    toast.success('URL salva');
  };

  const test = async () => {
    setApiUrl(draft.trim() || apiUrl);
    setTesting(true);
    try {
      const ok = await checkHealth();
      if (ok) toast.success('Conexão ok — /healthz respondeu');
      else toast.error('O JARVIS não respondeu. Confira a URL e a VPN/LAN.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
        Configurações
      </h1>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          URL da API
        </label>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="http://192.168.20.210:8000"
        />
        <div className="flex gap-2">
          <Button type="button" onClick={save}>
            Salvar
          </Button>
          <Button type="button" variant="outline" disabled={testing} onClick={() => void test()}>
            {testing ? 'Testando…' : 'Testar conexão'}
          </Button>
        </div>
        <p className="text-xs opacity-70" style={{ color: 'var(--color-text)' }}>
          O token do app fica no Credential Manager (F4). Nesta fase só a URL é configurável.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Aparência
        </label>
        <select
          className="rounded border px-2 py-1.5 text-sm bg-transparent"
          style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
        >
          <option value="system">Sistema</option>
          <option value="dark">Escuro</option>
          <option value="light">Claro</option>
        </select>
      </section>
    </div>
  );
}
