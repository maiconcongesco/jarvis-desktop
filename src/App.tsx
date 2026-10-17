import { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { SobrePage } from './pages/SobrePage';
import { loadSettings, useSettingsStore } from './lib/settings';

export default function App() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    if (theme === 'dark') root.classList.add('dark');
    else if (theme === 'light') root.classList.add('light');
  }, [theme]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <div className="hud-backdrop" aria-hidden="true" />
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
        <nav className="flex gap-3 text-sm">
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
      </header>
      <main className="flex-1 min-h-0 relative z-10">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/sobre" element={<SobrePage />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
}
