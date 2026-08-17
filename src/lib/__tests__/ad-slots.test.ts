/**
 * ad-slots.test.ts — CODE-01 (부속W) slot-resolution contract.
 *
 * The bug this locks down: a live audit found ZERO
 * `<ins class="adsbygoogle">` elements across all 10 portfolio domains even
 * though the loader script and publisher meta tag were present — every ad
 * component correctly renders nothing without a numeric slot id, and no repo
 * had one set because each invented its own env var name (부속W §2.3).
 *
 * Contract asserted here:
 *   1. `NEXT_PUBLIC_ADSENSE_SLOT_ID` is canonical — setting only that one
 *      variable resolves every placement in this repo.
 *   2. Per-placement legacy vars still take precedence (no regression for an
 *      existing deployment).
 *   3. Non-numeric junk ("rectangle", "TODO", "") never resolves, so an
 *      invalid `data-ad-slot` can't ship.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { resolveAdSlot, isValidSlotId, SLOT_ID_PATTERN, CANONICAL_SLOT_ENV_NAME } from '@/lib/ad-slots';

const SLOT_ENVS = [
  'NEXT_PUBLIC_ADSENSE_SLOT_ID',
  'NEXT_PUBLIC_ADSENSE_SLOT_RESULT',
  'NEXT_PUBLIC_ADSENSE_SLOT_GUIDE',
] as const;

function clearSlotEnvs() {
  for (const key of SLOT_ENVS) delete process.env[key];
}

afterEach(clearSlotEnvs);

describe('isValidSlotId — only real AdSense slot ids pass', () => {
  it('accepts a numeric id of 6+ digits', () => {
    expect(isValidSlotId('1234567890')).toBe(true);
    expect(isValidSlotId('123456')).toBe(true);
  });

  it('rejects placement labels, short digits, empty and undefined', () => {
    // "rectangle" is exactly the value found on a live domain (부속W §2.3).
    expect(isValidSlotId('rectangle')).toBe(false);
    expect(isValidSlotId('leaderboard')).toBe(false);
    expect(isValidSlotId('TODO')).toBe(false);
    expect(isValidSlotId('12345')).toBe(false);
    expect(isValidSlotId('')).toBe(false);
    expect(isValidSlotId(undefined)).toBe(false);
    expect(isValidSlotId('123abc456')).toBe(false);
  });

  it('SLOT_ID_PATTERN is the digits-only, 6+ rule', () => {
    expect(SLOT_ID_PATTERN.test('1234567890')).toBe(true);
    expect(SLOT_ID_PATTERN.test('abc')).toBe(false);
  });
});

describe('resolveAdSlot — canonical env is enough for every placement', () => {
  it('returns undefined when nothing is configured (caller renders no <ins>)', () => {
    clearSlotEnvs();
    expect(resolveAdSlot('result')).toBeUndefined();
    expect(resolveAdSlot('guide')).toBeUndefined();
  });

  it('CANONICAL env alone resolves BOTH placements — the portfolio-wide fix', () => {
    clearSlotEnvs();
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID = '9876543210';
    expect(resolveAdSlot('result')).toBe('9876543210');
    expect(resolveAdSlot('guide')).toBe('9876543210');
    expect(CANONICAL_SLOT_ENV_NAME).toBe('NEXT_PUBLIC_ADSENSE_SLOT_ID');
  });

  it('per-placement legacy env wins over the canonical one (no regression)', () => {
    clearSlotEnvs();
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID = '1111111111';
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT = '2222222222';
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE = '3333333333';
    expect(resolveAdSlot('result')).toBe('2222222222');
    expect(resolveAdSlot('guide')).toBe('3333333333');
  });

  it('an explicit numeric argument beats every env var', () => {
    clearSlotEnvs();
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID = '1111111111';
    expect(resolveAdSlot('result', '4444444444')).toBe('4444444444');
  });

  it('a non-numeric explicit value is treated as a hint and falls through to env', () => {
    clearSlotEnvs();
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID = '1111111111';
    expect(resolveAdSlot('result', 'state-result')).toBe('1111111111');
  });

  it('invalid env values never resolve — no malformed data-ad-slot can ship', () => {
    clearSlotEnvs();
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID = 'rectangle';
    expect(resolveAdSlot('result')).toBeUndefined();
  });

  it('trims surrounding whitespace from an otherwise valid id', () => {
    clearSlotEnvs();
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID = '  5555555555  ';
    expect(resolveAdSlot('result')).toBe('5555555555');
  });
});
