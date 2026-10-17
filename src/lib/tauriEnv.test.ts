import { describe, expect, it } from 'vitest';
import { isTauri } from './tauriEnv';

describe('tauriEnv', () => {
  it('no jsdom não é Tauri', () => {
    expect(isTauri()).toBe(false);
  });
});
