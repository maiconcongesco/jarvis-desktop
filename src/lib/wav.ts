/**
 * Codificador WAV PCM 16 kHz mono — mesma lógica do `hud.js` do painel.
 * O `/v1/voice` só aceita este formato.
 */

export function floatParaInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Reamostra float32 na taxa de entrada para 16 kHz (decimação simples). */
export function resamplePara16k(float32: Float32Array, rateIn: number): Float32Array {
  if (rateIn === 16000) return float32;
  const ratio = rateIn / 16000;
  const len = Math.floor(float32.length / ratio);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = float32[Math.floor(i * ratio)] || 0;
  }
  return out;
}

export function juntarAmostras(blocos: Float32Array[]): Float32Array {
  let total = 0;
  for (const b of blocos) total += b.length;
  const junto = new Float32Array(total);
  let pos = 0;
  for (const b of blocos) {
    junto.set(b, pos);
    pos += b.length;
  }
  return junto;
}

/** Bytes do WAV PCM Int16 mono (útil em testes sem depender de Blob.arrayBuffer). */
export function pcmParaWavBytes(int16: Int16Array, rate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + int16.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + int16.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, int16.length * 2, true);
  let off = 44;
  for (let i = 0; i < int16.length; i++, off += 2) {
    view.setInt16(off, int16[i]!, true);
  }
  return new Uint8Array(buffer);
}

/** Empacota PCM Int16 mono em Blob `audio/wav`. */
export function pcmParaWav(int16: Int16Array, rate: number): Blob {
  return new Blob([pcmParaWavBytes(int16, rate)], { type: 'audio/wav' });
}

/** Blocos capturados + taxa do AudioContext → WAV 16 kHz mono. */
export function blocosParaWav16k(blocos: Float32Array[], taxa: number): Blob {
  const junto = juntarAmostras(blocos);
  const a16k = resamplePara16k(junto, taxa);
  return pcmParaWav(floatParaInt16(a16k), 16000);
}
