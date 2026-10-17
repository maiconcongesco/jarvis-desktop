import { useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router';
import { ApprovalBell } from './components/ApprovalBell';
import { UpdateChecker } from './components/UpdateChecker';
import { Toaster } from './components/ui/sonner';
import { bootNativeShell } from './lib/native';
import { loadSettings, useSettingsStore } from './lib/settings';
import { ChatPage } from './pages/ChatPage';
import { FloatingPage } from './pages/FloatingPage';
import { HudPage } from './pages/HudPage';
import { SettingsPage } from './pages/SettingsPage';
import { SobrePage } from './pages/SobrePage';

function ShellPrincipal() {
  return (
    <>
      <UpdateChecker />
      <header
        className="flex items-center gap-4 px-4 py-2 shrink-0 relative z-10"
        style={{
          borderBottom: '1px solid color-mix(in srgb, var(--color-border) 60%, transparent)',
          background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)',
        }}
      >
        <span
          className="text-lg font-semibold tracking-wide"
          style={{ color: 'var(--color-accent)' }}
        >
          Jarvis
        </span>
        <nav className="flex gap-3 text-sm flex-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'underline underline-offset-4' : 'opacity-70 hover:opacity-100'
            }
            style={{ color: 'var(--color-text)' }}
          >
            Conversa
          </NavLink>
          <NavLink
            to="/hud"
            className={({ isActive }) =>
              isActive ? 'underline underline-offset-4' : 'opacity-70 hover:opacity-100'
            }
            style={{ color: 'var(--color-text)' }}
          >
            HUD
          </NavLink>
          <NavLink
            to="/configuracoes"
            className={({ isActive }) =>
              isActive ? 'underline underline-offset-4' : 'opacity-70 hover:opacity-100'
            }
            style={{ color: 'var(--color-text)' }}
          >
            Configurações
          </NavLink>
          <NavLink
            to="/sobre"
            className={({ isActive }) =>
              isActive ? 'underline underline-offset-4' : 'opacity-70 hover:opacity-100'
            }
            style={{ color: 'var(--color-text)' }}
          >
            Sobre
          </NavLink>
        </nav>
        <ApprovalBell />
      </header>
      <main className="flex-1 min-h-0 relative z-10">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/hud" element={<HudPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/sobre" element={<SobrePage />} />
        </Routes>
      </main>
      <Toaster />
    </>
  );
}

export default function App() {
  const theme = useSettingsStore((s) => s.theme);
  const location = useLocation();
  const flutuante = location.pathname === '/flutuante';

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (flutuante) return;
    let cleanup: (() => void) | undefined;
    void bootNativeShell().then((fn) => {
      cleanup = fn;
    });
    return () => cleanup?.();
  }, [flutuante]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    if (theme === 'dark') root.classList.add('dark');
    else if (theme === 'light') root.classList.add('light');
  }, [theme]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <div className="hud-backdrop" aria-hidden="true" />
      {flutuante ? <FloatingPage /> : <ShellPrincipal />}
    </div>
  );
}
