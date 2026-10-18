import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { validarApiUrl } from '../lib/apiUrl';
import { mensagemErroRede } from '../lib/errors';
import { checkHealth } from '../lib/health';
import { useHistoryStore } from '../lib/history';
import { testarAutenticacao } from '../lib/jarvis';
import { registrarAtalho, sincronizarAutostart } from '../lib/native';
import {
  DEFAULT_SHORTCUT,
  useSettingsStore,
  type Theme,
} from '../lib/settings';
import { isTauri } from '../lib/tauriEnv';
import {
  clearDesktopToken,
  getDesktopToken,
  setDesktopToken,
} from '../lib/vault';

export function SettingsPage() {
  const apiUrl = useSettingsStore((s) => s.apiUrl);
  const theme = useSettingsStore((s) => s.theme);
  const voiceAutoplay = useSettingsStore((s) => s.voiceAutoplay);
  const autostart = useSettingsStore((s) => s.autostart);
  const globalShortcut = useSettingsStore((s) => s.globalShortcut);
  const setApiUrl = useSettingsStore((s) => s.setApiUrl);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setVoiceAutoplay = useSettingsStore((s) => s.setVoiceAutoplay);
  const setAutostart = useSettingsStore((s) => s.setAutostart);
  const setGlobalShortcut = useSettingsStore((s) => s.setGlobalShortcut);
  const exportar = useHistoryStore((s) => s.exportar);
  const importar = useHistoryStore((s) => s.importar);
  const limpar = useHistoryStore((s) => s.limpar);

  const [draftUrl, setDraftUrl] = useState(apiUrl);
  const [draftToken, setDraftToken] = useState('');
  const [draftShortcut, setDraftShortcut] = useState(globalShortcut);
  const [temToken, setTemToken] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setDraftUrl(apiUrl);
  }, [apiUrl]);

  useEffect(() => {
    setDraftShortcut(globalShortcut);
  }, [globalShortcut]);

  useEffect(() => {
    void getDesktopToken().then((t) => {
      setTemToken(Boolean(t));
      setDraftToken('');
    });
  }, []);

  const salvarAutostart = async (ligado: boolean) => {
    setAutostart(ligado);
    try {
      await sincronizarAutostart(ligado);
      toast.success(ligado ? 'Autostart ligado' : 'Autostart desligado');
    } catch (e) {
      toast.error(mensagemErroRede(e));
    }
  };

  const salvarAtalho = async () => {
    const next = draftShortcut.trim() || DEFAULT_SHORTCUT;
    setGlobalShortcut(next);
    setDraftShortcut(next);
    try {
      await registrarAtalho(next);
      toast.success(`Atalho: ${next}`);
    } catch (e) {
      toast.error(
        isTauri()
          ? mensagemErroRede(e)
          : 'Atalho só funciona no app nativo (Tauri).',
      );
    }
  };

  const validacaoUrl = validarApiUrl(draftUrl.trim() || apiUrl);

  /** Aplica a URL do rascunho. No app nativo, recusa host fora do CSP. */
  const aplicarUrl = (): boolean => {
    const alvo = draftUrl.trim() || apiUrl;
    const v = validarApiUrl(alvo);
    if (!v.ok && isTauri()) {
      toast.error(v.motivo);
      return false;
    }
    setApiUrl(v.ok ? v.url : alvo);
    return true;
  };

  const saveUrl = () => {
    if (aplicarUrl()) toast.success('URL salva');
  };

  const saveToken = async () => {
    if (!draftToken.trim()) {
      toast.error('Cole o token (não fica vazio). Use Limpar para remover.');
      return;
    }
    try {
      await setDesktopToken(draftToken);
    } catch (e) {
      toast.error(`Não consegui salvar o token: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    setDraftToken('');
    setTemToken(true);
    toast.success('Token guardado no cofre da sessão/Credential Manager');
  };

  const limparToken = async () => {
    await clearDesktopToken();
    setTemToken(false);
    setDraftToken('');
    toast.success('Token removido');
  };

  const test = async () => {
    if (!aplicarUrl()) return;
    if (draftToken.trim()) {
      await setDesktopToken(draftToken);
      setDraftToken('');
      setTemToken(true);
    }
    setTesting(true);
    try {
      const ok = await checkHealth();
      if (!ok) {
        toast.error('O JARVIS não respondeu. Confira a URL e a VPN/LAN.');
        return;
      }
      await testarAutenticacao();
      toast.success('Conexão ok — /healthz e token aceitos');
    } catch (e) {
      toast.error(mensagemErroRede(e));
    } finally {
      setTesting(false);
    }
  };

  const exportHist = () => {
    const blob = new Blob([exportar()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-historico-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importHist = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      importar(text);
      toast.success('Histórico importado');
    } catch (e) {
      toast.error(mensagemErroRede(e));
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 flex flex-col gap-6 overflow-y-auto h-full">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
        Configurações
      </h1>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          URL da API
        </label>
        <Input
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          placeholder="http://192.168.20.210:8000"
          aria-invalid={!validacaoUrl.ok}
        />
        {!validacaoUrl.ok && (
          <p className="text-xs" style={{ color: 'var(--color-error)' }} role="alert">
            {validacaoUrl.motivo}
            {isTauri() ? '' : ' (no navegador de dev é só aviso.)'}
          </p>
        )}
        <Button type="button" onClick={saveUrl}>
          Salvar URL
        </Button>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Token desktop (Bearer)
        </label>
        <Input
          type="password"
          value={draftToken}
          onChange={(e) => setDraftToken(e.target.value)}
          placeholder={temToken ? '•••••••• (já configurado — cole para trocar)' : 'Cole o token'}
          autoComplete="off"
        />
        <p className="text-xs opacity-70" style={{ color: 'var(--color-text)' }}>
          No app nativo o token vai ao Credential Manager. No navegador (`npm run
          dev`) fica só na sessão — nunca em localStorage. Valor vem do OpenBao
          (`JARVIS_DESKTOP_TOKEN`), não cole em commits.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button type="button" onClick={() => void saveToken()}>
            Guardar token
          </Button>
          <Button type="button" variant="outline" onClick={() => void limparToken()}>
            Limpar token
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={testing}
            onClick={() => void test()}
          >
            {testing ? 'Testando…' : 'Testar conexão'}
          </Button>
        </div>
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

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Voz
        </label>
        <label
          className="flex items-center gap-2 text-sm"
          style={{ color: 'var(--color-text)' }}
        >
          <input
            type="checkbox"
            checked={voiceAutoplay}
            onChange={(e) => setVoiceAutoplay(e.target.checked)}
          />
          Ler respostas em voz alta automaticamente (TTS)
        </label>
        <p className="text-xs opacity-70" style={{ color: 'var(--color-text)' }}>
          Segurar para falar usa `/v1/voice`. O botão de alto-falante em cada
          mensagem chama `/v1/tts`. Um áudio por vez.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Autostart
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text)' }}>
          <input
            type="checkbox"
            checked={autostart}
            onChange={(e) => void salvarAutostart(e.target.checked)}
          />
          Iniciar com o Windows (só bandeja, `--hidden`)
        </label>
        <p className="text-xs opacity-70" style={{ color: 'var(--color-text)' }}>
          Fechar a janela principal esconde na bandeja; Sair pelo menu da bandeja.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Atalho global (janela flutuante)
        </label>
        <Input
          value={draftShortcut}
          onChange={(e) => setDraftShortcut(e.target.value)}
          placeholder={DEFAULT_SHORTCUT}
        />
        <p className="text-xs opacity-70" style={{ color: 'var(--color-text)' }}>
          Formato Tauri, ex. <code>CommandOrControl+Space</code> (Ctrl+Espaço no Windows).
        </p>
        <Button type="button" variant="outline" onClick={() => void salvarAtalho()}>
          Aplicar atalho
        </Button>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Dados (histórico local)
        </label>
        <div className="flex gap-2 flex-wrap">
          <Button type="button" variant="outline" onClick={exportHist}>
            Exportar JSON
          </Button>
          <label className="inline-flex items-center">
            <span
              className="inline-flex h-8 cursor-pointer items-center rounded-lg border px-2.5 text-sm"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              Importar JSON
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => void importHist(e.target.files?.[0] ?? null)}
              />
            </span>
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (confirm('Apagar todo o histórico local?')) {
                limpar();
                toast.success('Histórico limpo');
              }
            }}
          >
            Limpar histórico
          </Button>
        </div>
      </section>
    </div>
  );
}
