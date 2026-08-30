import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('web share hydration', () => {
  it('uses a server-stable snapshot before detecting Web Share support', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/features/calculator/share-result-buttons.tsx'),
      'utf8',
    );

    expect(source).toContain('useSyncExternalStore');
    expect(source).toMatch(/\(\)\s*=>\s*false/);
    expect(source).not.toMatch(/const canWebShare\s*=\s*typeof navigator/);
  });
});
