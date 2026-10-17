import { create } from 'zustand';

const STORAGE_KEY = 'jarvis-desktop-historico';

export interface ToolCallLive {
  id: string;
  nome: string;
  ok?: boolean;
  ms?: number;
  status: 'running' | 'ok' | 'erro';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  agent?: string;
  modelo?: string;
  latencia_ms?: number;
  custo_usd?: number;
  trace_id?: string;
  tools?: ToolCallLive[];
  feedback?: 'up' | 'down';
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

interface HistoryState {
  conversations: Conversation[];
  activeId: string | null;
  hydrate: () => void;
  nova: () => string;
  setActive: (id: string | null) => void;
  apagar: (id: string) => void;
  buscar: (q: string) => Conversation[];
  appendMessage: (conversationId: string, msg: ChatMessage) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    patch: Partial<ChatMessage>,
  ) => void;
  rename: (conversationId: string, title: string) => void;
  exportar: () => string;
  importar: (json: string) => void;
  limpar: () => void;
}

function persist(state: Pick<HistoryState, 'conversations' | 'activeId'>) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        conversations: state.conversations,
        activeId: state.activeId,
      }),
    );
  } catch {
    /* ignore */
  }
}

function novoId(): string {
  return crypto.randomUUID();
}

function tituloDe(texto: string): string {
  const t = texto.trim().replace(/\s+/g, ' ');
  return t.length > 48 ? `${t.slice(0, 48)}…` : t || 'Nova conversa';
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  conversations: [],
  activeId: null,

  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        conversations?: Conversation[];
        activeId?: string | null;
      };
      if (Array.isArray(parsed.conversations)) {
        set({
          conversations: parsed.conversations,
          activeId: parsed.activeId ?? parsed.conversations[0]?.id ?? null,
        });
      }
    } catch {
      /* ignore */
    }
  },

  nova: () => {
    const id = novoId();
    const agora = Date.now();
    const conv: Conversation = {
      id,
      title: 'Nova conversa',
      createdAt: agora,
      updatedAt: agora,
      messages: [],
    };
    set((s) => {
      const next = { conversations: [conv, ...s.conversations], activeId: id };
      persist(next);
      return next;
    });
    return id;
  },

  setActive: (id) => {
    set((s) => {
      const next = { conversations: s.conversations, activeId: id };
      persist(next);
      return next;
    });
  },

  apagar: (id) => {
    set((s) => {
      const conversations = s.conversations.filter((c) => c.id !== id);
      const activeId =
        s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId;
      const next = { conversations, activeId };
      persist(next);
      return next;
    });
  },

  buscar: (q) => {
    const termo = q.trim().toLowerCase();
    if (!termo) return get().conversations;
    return get().conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(termo) ||
        c.messages.some((m) => m.content.toLowerCase().includes(termo)),
    );
  },

  appendMessage: (conversationId, msg) => {
    set((s) => {
      const conversations = s.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const title =
          c.messages.length === 0 && msg.role === 'user'
            ? tituloDe(msg.content)
            : c.title;
        return {
          ...c,
          title,
          updatedAt: Date.now(),
          messages: [...c.messages, msg],
        };
      });
      const next = { conversations, activeId: s.activeId };
      persist(next);
      return next;
    });
  },

  updateMessage: (conversationId, messageId, patch) => {
    set((s) => {
      const conversations = s.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          updatedAt: Date.now(),
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, ...patch } : m,
          ),
        };
      });
      const next = { conversations, activeId: s.activeId };
      persist(next);
      return next;
    });
  },

  rename: (conversationId, title) => {
    set((s) => {
      const conversations = s.conversations.map((c) =>
        c.id === conversationId ? { ...c, title, updatedAt: Date.now() } : c,
      );
      const next = { conversations, activeId: s.activeId };
      persist(next);
      return next;
    });
  },

  exportar: () =>
    JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        conversations: get().conversations,
      },
      null,
      2,
    ),

  importar: (json) => {
    const parsed = JSON.parse(json) as { conversations?: Conversation[] };
    if (!Array.isArray(parsed.conversations)) {
      throw new Error('JSON inválido: falta conversations.');
    }
    set(() => {
      const next = {
        conversations: parsed.conversations!,
        activeId: parsed.conversations![0]?.id ?? null,
      };
      persist(next);
      return next;
    });
  },

  limpar: () => {
    set(() => {
      const next = { conversations: [], activeId: null };
      persist(next);
      return next;
    });
  },
}));

export function generateMessageId(): string {
  return novoId();
}
