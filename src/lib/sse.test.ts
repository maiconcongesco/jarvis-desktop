import { describe, expect, it } from 'vitest';
import { consumirSse } from './sse';

describe('consumirSse', () => {
  it('parseia event + data no formato do JARVIS', () => {
    const bruto =
      'event: rota\ndata: {"agente":"core"}\n\nevent: frase\ndata: {"texto":"Olá."}\n\n';
    const { frames, resto } = consumirSse(bruto);
    expect(resto).toBe('');
    expect(frames).toEqual([
      { event: 'rota', data: '{"agente":"core"}' },
      { event: 'frase', data: '{"texto":"Olá."}' },
    ]);
  });

  it('guarda fragmento incompleto no resto', () => {
    const { frames, resto } = consumirSse('event: fim\ndata: {"text":');
    expect(frames).toEqual([]);
    expect(resto).toContain('event: fim');
  });
});
