import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Explode(): never {
  throw new Error('quebrou no render');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renderiza os filhos quando não há erro', () => {
    render(
      <ErrorBoundary>
        <p>tudo certo</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('tudo certo')).toBeTruthy();
  });

  it('renderiza o fallback quando um filho lança erro', () => {
    // React e o próprio boundary logam o erro; silencia para não poluir a saída.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo deu errado')).toBeTruthy();
    expect(screen.getByText('quebrou no render')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tentar de novo/ })).toBeTruthy();
    expect(consoleError).toHaveBeenCalled();
  });
});
