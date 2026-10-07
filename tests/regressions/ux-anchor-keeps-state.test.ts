import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { decodeState, encodeState, reconcileHash } from '@/lib/engine/url-state';

const own = { ...DEFAULT_INPUT, currentAge: 41, savingsRate: 0.35 };

describe('UX P0-1 / D2: jumping to an in-page anchor must not replace the share state in the URL', () => {
  it('an anchor hash is replaced by the encoded inputs', () => {
    expect(reconcileHash('#results-disclaimer', own)).toBe(encodeState(own));
    expect(decodeState(reconcileHash('#terms-consent', own) as string)).toEqual(own);
  });

  it('at the default inputs the replacement is empty, so the caller can drop the hash', () => {
    expect(reconcileHash('#results-disclaimer', DEFAULT_INPUT)).toBe('');
  });

  it('a hash that already carries a valid state, or no hash, is left alone', () => {
    expect(reconcileHash(`#${encodeState(own)}`, own)).toBeNull();
    expect(reconcileHash('', own)).toBeNull();
    expect(reconcileHash('#', own)).toBeNull();
  });

  it('the URL-state hook listens for hashchange and uses the reconciler', () => {
    const src = readFileSync(join(__dirname, '..', '..', 'src', 'hooks', 'use-url-state.ts'), 'utf8');
    expect(src).toMatch(/addEventListener\('hashchange'/);
    expect(src).toMatch(/removeEventListener\('hashchange'/);
    expect(src).toMatch(/reconcileHash\(/);
  });
});
