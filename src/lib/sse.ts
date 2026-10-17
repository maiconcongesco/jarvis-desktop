/** Parser SSE genérico (event: + data:). */

export interface SseFrame {
  event: string;
  data: string;
}

/** Extrai frames completos de um buffer acumulado; devolve o resto incompleto. */
export function consumirSse(buffer: string): { frames: SseFrame[]; resto: string } {
  const frames: SseFrame[] = [];
  const blocos = buffer.split('\n\n');
  const resto = blocos.pop() ?? '';

  for (const bloco of blocos) {
    if (!bloco.trim()) continue;
    let event = 'message';
    const dataLines: string[] = [];
    for (const linha of bloco.split('\n')) {
      if (linha.startsWith('event:')) {
        event = linha.slice(6).trim();
      } else if (linha.startsWith('data:')) {
        dataLines.push(linha.slice(5).trimStart());
      }
    }
    if (dataLines.length > 0) {
      frames.push({ event, data: dataLines.join('\n') });
    }
  }
  return { frames, resto };
}

export async function* lerSse(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<SseFrame> {
  if (!response.body) {
    throw new Error('Resposta SSE sem corpo.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        throw new DOMException('Aborted', 'AbortError');
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { frames, resto } = consumirSse(buffer);
      buffer = resto;
      for (const frame of frames) {
        yield frame;
      }
    }
    if (buffer.trim()) {
      const { frames } = consumirSse(`${buffer}\n\n`);
      for (const frame of frames) {
        yield frame;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
