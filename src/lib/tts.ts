/**
 * Saída de voz compartilhada: um áudio por vez (ler em voz alta / autoplay).
 * Sintetiza via POST /v1/tts do JARVIS.
 */

import { create } from 'zustand';
import { sintetizarTts } from './jarvis';

export type TtsState = 'idle' | 'loading' | 'speaking';

interface TtsStore {
  state: TtsState;
  speakingId: string | null;
  error: string | null;
  errorId: string | null;
  autoSpokenId: string | null;
  /** Reproduz um Blob WAV já obtido (ex.: resposta de /v1/voice). */
  playBlob: (id: string, blob: Blob) => Promise<void>;
  speak: (id: string, text: string) => Promise<void>;
  stop: () => void;
  markAutoSpoken: (id: string) => void;
}

let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let controller: AbortController | null = null;
let token = 0;

/** Só um turno que acabou de streamar na conversa ativa dispara autoplay. */
export function shouldAutoplayFinishedReply(
  previousStreamingConversationId: string | null,
  activeId: string | null,
  streamIsActive: boolean,
  lastMessage: { id: string; role: string } | undefined,
  autoSpokenId: string | null,
): boolean {
  return (
    previousStreamingConversationId !== null &&
    previousStreamingConversationId === activeId &&
    !streamIsActive &&
    lastMessage !== undefined &&
    lastMessage.role === 'assistant' &&
    lastMessage.id !== autoSpokenId
  );
}

function teardown(): void {
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.src = '';
    audio = null;
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  if (controller) {
    controller.abort();
    controller = null;
  }
}

async function playFromBlob(id: string, blob: Blob, mine: number): Promise<void> {
  const url = URL.createObjectURL(blob);
  objectUrl = url;
  const el = new Audio(url);
  audio = el;

  el.onended = () => {
    if (mine !== token) return;
    teardown();
    useTtsStore.setState({ state: 'idle', speakingId: null });
  };
  el.onerror = () => {
    if (mine !== token) return;
    teardown();
    useTtsStore.setState({
      state: 'idle',
      speakingId: null,
      error: 'Falha na reprodução',
      errorId: id,
    });
  };

  await el.play();
  if (mine === token) useTtsStore.setState({ state: 'speaking', speakingId: id });
}

export const useTtsStore = create<TtsStore>((set, get) => ({
  state: 'idle',
  speakingId: null,
  error: null,
  errorId: null,
  autoSpokenId: null,

  markAutoSpoken: (id: string) => set({ autoSpokenId: id }),

  playBlob: async (id: string, blob: Blob) => {
    token += 1;
    const mine = token;
    teardown();
    set({ state: 'loading', speakingId: id, error: null, errorId: null });
    try {
      await playFromBlob(id, blob, mine);
    } catch (err) {
      if (mine !== token) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      teardown();
      set({
        state: 'idle',
        speakingId: null,
        error: err instanceof Error ? err.message : 'Falha na reprodução',
        errorId: id,
      });
    }
  },

  speak: async (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    token += 1;
    const mine = token;
    teardown();
    set({ state: 'loading', speakingId: id, error: null, errorId: null });

    const ac = new AbortController();
    controller = ac;

    try {
      const blob = await sintetizarTts(trimmed, { signal: ac.signal });
      if (mine !== token) return;
      await playFromBlob(id, blob, mine);
    } catch (err) {
      if (mine !== token) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      teardown();
      set({
        state: 'idle',
        speakingId: null,
        error: err instanceof Error ? err.message : 'Síntese de voz falhou',
        errorId: id,
      });
    }
  },

  stop: () => {
    token += 1;
    teardown();
    set({ state: 'idle', speakingId: null, error: null, errorId: null });
  },
}));

/** Costura de teste: zera handles de áudio entre casos. */
export function __resetTtsForTests(): void {
  teardown();
  token = 0;
  useTtsStore.setState({
    state: 'idle',
    speakingId: null,
    error: null,
    errorId: null,
    autoSpokenId: null,
  });
}
