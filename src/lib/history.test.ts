import { beforeEach, describe, expect, it } from 'vitest';
import { generateMessageId, useHistoryStore } from './history';

describe('history', () => {
  beforeEach(() => {
    localStorage.clear();
    useHistoryStore.setState({ conversations: [], activeId: null });
  });

  it('cria conversa, adiciona mensagens e persiste', () => {
    const id = useHistoryStore.getState().nova();
    useHistoryStore.getState().appendMessage(id, {
      id: generateMessageId(),
      role: 'user',
      content: 'Qual o status da VPN?',
      createdAt: Date.now(),
    });
    const conv = useHistoryStore.getState().conversations[0]!;
    expect(conv.title).toContain('VPN');
    expect(conv.messages).toHaveLength(1);

    useHistoryStore.setState({ conversations: [], activeId: null });
    useHistoryStore.getState().hydrate();
    expect(useHistoryStore.getState().conversations).toHaveLength(1);
  });

  it('exporta e importa JSON', () => {
    const id = useHistoryStore.getState().nova();
    useHistoryStore.getState().appendMessage(id, {
      id: generateMessageId(),
      role: 'assistant',
      content: 'ok',
      createdAt: Date.now(),
      trace_id: 't1',
    });
    const json = useHistoryStore.getState().exportar();
    useHistoryStore.getState().limpar();
    expect(useHistoryStore.getState().conversations).toHaveLength(0);
    useHistoryStore.getState().importar(json);
    expect(useHistoryStore.getState().conversations[0]!.messages[0]!.trace_id).toBe(
      't1',
    );
  });

  it('busca por título', () => {
    const a = useHistoryStore.getState().nova();
    useHistoryStore.getState().rename(a, 'Agenda da semana');
    const b = useHistoryStore.getState().nova();
    useHistoryStore.getState().rename(b, 'Finanças');
    expect(useHistoryStore.getState().buscar('agenda')).toHaveLength(1);
  });
});
