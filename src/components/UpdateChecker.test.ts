import { afterEach, describe, expect, it } from 'vitest';
import {
  CHECK_INTERVAL_MS,
  isAutoUpdateDisabled,
  setAutoUpdateDisabled,
} from './UpdateChecker';

describe('UpdateChecker prefs', () => {
  afterEach(() => {
    setAutoUpdateDisabled(false);
  });

  it('intervalo de checagem é 6 horas (spec §9)', () => {
    expect(CHECK_INTERVAL_MS).toBe(6 * 60 * 60 * 1000);
  });

  it('liga e desliga preferência de auto-update', () => {
    expect(isAutoUpdateDisabled()).toBe(false);
    setAutoUpdateDisabled(true);
    expect(isAutoUpdateDisabled()).toBe(true);
    setAutoUpdateDisabled(false);
    expect(isAutoUpdateDisabled()).toBe(false);
  });
});
