import { describe, expect, it } from 'vitest';
import {
  blocosParaWav16k,
  floatParaInt16,
  juntarAmostras,
  pcmParaWav,
  pcmParaWavBytes,
  resamplePara16k,
} from './wav';

describe('wav', () => {
  it('floatParaInt16 satura e escala', () => {
    const out = floatParaInt16(new Float32Array([0, 1, -1, 2, -2]));
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(0x7fff);
    expect(out[2]).toBe(-0x8000);
    expect(out[3]).toBe(0x7fff);
    expect(out[4]).toBe(-0x8000);
  });

  it('resamplePara16k decima 48 kHz → 16 kHz', () => {
    const in48 = new Float32Array(480);
    for (let i = 0; i < in48.length; i++) in48[i] = i;
    const out = resamplePara16k(in48, 48000);
    expect(out.length).toBe(160);
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(3);
  });

  it('pcmParaWav gera cabeçalho RIFF/WAVE 16 kHz', () => {
    const pcm = new Int16Array([0, 100, -100]);
    const bytes = pcmParaWavBytes(pcm, 16000);
    expect(bytes.length).toBe(44 + pcm.length * 2);
    expect(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!)).toBe('RIFF');
    expect(String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!)).toBe('WAVE');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(22, true)).toBe(1);
    const blob = pcmParaWav(pcm, 16000);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(bytes.length);
  });

  it('blocosParaWav16k junta e reamostra', () => {
    const a = new Float32Array([0.1, 0.2]);
    const b = new Float32Array([0.3, 0.4]);
    expect(juntarAmostras([a, b]).length).toBe(4);
    const blob = blocosParaWav16k([a, b], 16000);
    expect(blob.size).toBeGreaterThan(44);
  });
});
