import { describe, expect, it } from 'vitest';
import { shareableUrl } from '@/components/features/calculator/share-result-buttons';

describe('S3 (K20): shared result links never carry the internal-traffic marker', () => {
  it('drops ?crew=1 and ?crew=0 but keeps the other params and the scenario hash', () => {
    expect(shareableUrl('https://gofirepath.com/result?crew=1#a=30&e=40000')).toBe('https://gofirepath.com/result#a=30&e=40000');
    expect(shareableUrl('https://gofirepath.com/?utm_source=x&crew=0#s=1')).toBe('https://gofirepath.com/?utm_source=x#s=1');
  });

  it('leaves a link without the marker unchanged, byte for byte', () => {
    expect(shareableUrl('https://gofirepath.com/result#a=30')).toBe('https://gofirepath.com/result#a=30');
    const encoded = 'https://gofirepath.com/?utm_term=a%20b&q=(1)&flag#s=1';
    expect(shareableUrl(encoded)).toBe(encoded);
  });
});
