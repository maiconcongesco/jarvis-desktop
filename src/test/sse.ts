/** Helpers de teste: corpos SSE para `fetch` mockado. */

export function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i++]));
    },
  });
}

/** Entrega um pedaço a cada `intervaloMs`. */
export function sseBodyLento(chunks: string[], intervaloMs: number): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    async pull(controller) {
      await new Promise((r) => setTimeout(r, intervaloMs));
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i++]));
    },
  });
}

/** Entrega um pedaço e depois fica parado (nunca fecha). */
export function sseBodyTravado(primeiro: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let enviado = false;
  return new ReadableStream({
    pull(controller) {
      if (!enviado) {
        enviado = true;
        controller.enqueue(encoder.encode(primeiro));
        return;
      }
      return new Promise<void>(() => {});
    },
  });
}
