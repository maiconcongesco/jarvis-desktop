/**
 * Segurar para falar: Web Audio + ScriptProcessor → WAV 16 kHz.
 * Espelha o fluxo do `hud.js` (nível no analisador, mínimo ~350 ms).
 */

import { blocosParaWav16k } from './wav';

const MIN_MS = 350;

type AudioContextCtor = {
  new (contextOptions?: AudioContextOptions): AudioContext;
  prototype: AudioContext;
};

function audioContextCtor(): AudioContextCtor {
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) throw new Error('AudioContext indisponível');
  return Ctor;
}

export type HoldState = 'idle' | 'recording' | 'too-short';

export class HoldToTalk {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private samples: Float32Array[] = [];
  private recording = false;
  private startedAt = 0;
  private levelRaf = 0;
  private onLevel: ((n: number) => void) | null = null;

  get isRecording(): boolean {
    return this.recording;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  setLevelListener(cb: ((n: number) => void) | null): void {
    this.onLevel = cb;
  }

  async start(): Promise<void> {
    if (this.recording) return;
    const AC = audioContextCtor();
    this.ctx = new AC();
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.samples = [];
    this.processor.onaudioprocess = (ev) => {
      if (!this.recording) return;
      this.samples.push(new Float32Array(ev.inputBuffer.getChannelData(0)));
    };
    this.source.connect(this.analyser);
    this.source.connect(this.processor);
    this.processor.connect(this.ctx.destination);
    this.recording = true;
    this.startedAt = performance.now();
    this.tickLevel();
  }

  /** Para a captura. Retorna null se curta demais (&lt; 350 ms). */
  async stop(): Promise<Blob | null> {
    if (!this.recording) return null;
    this.recording = false;
    const duracao = performance.now() - this.startedAt;
    cancelAnimationFrame(this.levelRaf);
    this.onLevel?.(0);

    try {
      this.source?.disconnect();
      this.processor?.disconnect();
    } catch {
      /* já desligado */
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    const taxa = this.ctx?.sampleRate ?? 48000;
    const blocos = this.samples;
    this.samples = [];
    this.stream = null;
    this.source = null;
    this.processor = null;
    this.analyser = null;
    if (this.ctx) {
      await this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
    if (duracao < MIN_MS || blocos.length === 0) return null;
    return blocosParaWav16k(blocos, taxa);
  }

  /** Aborta sem produzir WAV. */
  async cancel(): Promise<void> {
    this.recording = false;
    cancelAnimationFrame(this.levelRaf);
    this.onLevel?.(0);
    try {
      this.source?.disconnect();
      this.processor?.disconnect();
    } catch {
      /* */
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.samples = [];
    this.stream = null;
    this.source = null;
    this.processor = null;
    this.analyser = null;
    if (this.ctx) {
      await this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
  }

  private tickLevel = (): void => {
    if (!this.recording || !this.analyser || !this.onLevel) {
      if (this.recording) this.levelRaf = requestAnimationFrame(this.tickLevel);
      return;
    }
    const buf = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(buf);
    let soma = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i]! - 128) / 128;
      soma += v * v;
    }
    this.onLevel(Math.min(1, Math.sqrt(soma / buf.length) * 4));
    this.levelRaf = requestAnimationFrame(this.tickLevel);
  };
}

export function micDisponivel(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return false;
  }
  const w = window as unknown as {
    AudioContext?: unknown;
    webkitAudioContext?: unknown;
  };
  const devices = navigator.mediaDevices;
  const temMic =
    !!devices && typeof devices.getUserMedia === 'function';
  return temMic && Boolean(w.AudioContext || w.webkitAudioContext);
}
