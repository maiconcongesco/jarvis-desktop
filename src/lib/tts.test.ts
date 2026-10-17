import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./jarvis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./jarvis')>();
  return {
    ...actual,
    sintetizarTts: vi.fn(),
  };
});

import { sintetizarTts } from './jarvis';
import {
  __resetTtsForTests,
  shouldAutoplayFinishedReply,
  useTtsStore,
} from './tts';

const synth = vi.mocked(sintetizarTts);

class FakeAudio {
  static instances: FakeAudio[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string;
  paused = false;
  playCalls = 0;

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  play(): Promise<void> {
    this.playCalls += 1;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

beforeEach(() => {
  vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);
  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:fake/1',
    revokeObjectURL: () => undefined,
  });
  synth.mockReset();
  __resetTtsForTests();
  FakeAudio.instances = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tts store', () => {
  it('speak toca um áudio e marca speakingId', async () => {
    synth.mockResolvedValue(new Blob(['wav']));
    await useTtsStore.getState().speak('m1', 'Olá');
    expect(FakeAudio.instances).toHaveLength(1);
    expect(useTtsStore.getState().state).toBe('speaking');
    expect(useTtsStore.getState().speakingId).toBe('m1');
  });

  it('segundo speak interrompe o primeiro', async () => {
    synth.mockResolvedValue(new Blob(['wav']));
    await useTtsStore.getState().speak('m1', 'um');
    const first = FakeAudio.instances[0]!;
    await useTtsStore.getState().speak('m2', 'dois');
    expect(first.paused).toBe(true);
    expect(useTtsStore.getState().speakingId).toBe('m2');
  });

  it('stop volta a idle', async () => {
    synth.mockResolvedValue(new Blob(['wav']));
    await useTtsStore.getState().speak('m1', 'x');
    useTtsStore.getState().stop();
    expect(useTtsStore.getState().state).toBe('idle');
    expect(useTtsStore.getState().speakingId).toBeNull();
  });

  it('playBlob não chama sintetizarTts', async () => {
    await useTtsStore.getState().playBlob('v1', new Blob(['a']));
    expect(synth).not.toHaveBeenCalled();
    expect(useTtsStore.getState().speakingId).toBe('v1');
  });
});

describe('shouldAutoplayFinishedReply', () => {
  it('só dispara quando o stream da conversa ativa acabou', () => {
    expect(
      shouldAutoplayFinishedReply('c1', 'c1', false, { id: 'a', role: 'assistant' }, null),
    ).toBe(true);
    expect(
      shouldAutoplayFinishedReply('c1', 'c1', true, { id: 'a', role: 'assistant' }, null),
    ).toBe(false);
    expect(
      shouldAutoplayFinishedReply('c1', 'c1', false, { id: 'a', role: 'assistant' }, 'a'),
    ).toBe(false);
  });
});
