/**
 * GET /data.json — unit tests (부속P CODE-04 acceptance criteria)
 *
 * "working /data.json ... exports containing the same figures" as the
 * /fire-statistics page and no fabricated numbers.
 */

import { describe, it, expect } from 'vitest';
import { GET } from '../route';
import { buildFireStatisticsDataset } from '@/lib/seo/statistics';

describe('GET /data.json', () => {
  it('returns 200 with application/json content-type', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('body contains the same figures as buildFireStatisticsDataset() — never a separate/inconsistent copy', async () => {
    const res = GET();
    const body = await res.json();
    const dataset = buildFireStatisticsDataset();

    expect(body.dataVerifiedDate).toBe(dataset.dataVerifiedDate);
    expect(body.headline.value).toBe(dataset.headline.value);
    expect(body.rankedFireTypes).toEqual(dataset.rankedFireTypes);
    expect(body.scenarios).toEqual(dataset.scenarios);
    expect(body.findings).toEqual(dataset.findings);
  });

  it('has no aggregateRating/review fields', async () => {
    const res = GET();
    const body = await res.json();
    expect(body).not.toHaveProperty('aggregateRating');
    expect(body).not.toHaveProperty('review');
  });
});
