import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shareableUrl } from '@/lib/engine/url-state';

const CALCULATOR = join(__dirname, '..', '..', 'src', 'components', 'features', 'calculator');

describe('S3 (K20): shared result links carry the scenario hash and none of the sharer\'s attribution', () => {
  it('drops ?crew, utm_*, gclid and any other query but keeps the path and the scenario hash', () => {
    expect(shareableUrl('https://gofirepath.com/result?crew=1#a=30&e=40000')).toBe('https://gofirepath.com/result#a=30&e=40000');
    expect(shareableUrl('https://gofirepath.com/?utm_source=x&crew=0#s=1')).toBe('https://gofirepath.com/#s=1');
    expect(
      shareableUrl('https://gofirepath.com/?utm_source=embed&utm_medium=widget&utm_campaign=blog.example#a=41'),
    ).toBe('https://gofirepath.com/#a=41');
    expect(shareableUrl('https://gofirepath.com/?gclid=abc&fbclid=def')).toBe('https://gofirepath.com/');
  });

  it('leaves a link without a query unchanged', () => {
    expect(shareableUrl('https://gofirepath.com/result#a=30')).toBe('https://gofirepath.com/result#a=30');
    expect(shareableUrl('https://gofirepath.com/')).toBe('https://gofirepath.com/');
  });

  it('Copy link, Web Share and the emailed result link all go through it', () => {
    const share = readFileSync(join(CALCULATOR, 'share-result-buttons.tsx'), 'utf8');
    expect(share.match(/shareableUrl\(window\.location\.href\)/g)).toHaveLength(2);
    expect(share).not.toMatch(/(writeText|url:)\s*\(?window\.location\.href/);
    const email = readFileSync(join(CALCULATOR, 'email-my-results-form.tsx'), 'utf8');
    expect(email).toMatch(/const shareUrl = shareableUrl\(window\.location\.href\);/);
    expect(email).not.toMatch(/split\('\?'\)/);
  });
});
