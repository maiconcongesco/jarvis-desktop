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

/**
 * Lê o corpo SSE frame a frame. `aoReceber` é chamado a cada pedaço de bytes
 * (inclusive keep-alive sem frame), útil para renovar timeout de inatividade.
 */
export async function* lerSse(
  response: Response,
  signal?: AbortSignal,
  aoReceber?: () => void,
): AsyncGenerator<SseFrame> {
  if (!response.body) {
    throw new Error('Resposta SSE sem corpo.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  // Destrava um read() pendente quando o signal aborta no meio da espera.
  const onAbort = () => {
    reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', onAbort);

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => {});
        throw new DOMException('Aborted', 'AbortError');
      }
      const { done, value } = await reader.read();
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      if (done) break;
      aoReceber?.();
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
    signal?.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }
}
