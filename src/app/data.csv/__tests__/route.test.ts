/**
 * GET /data.csv — unit tests (부속P CODE-04 acceptance criteria)
 *
 * "working ... /data.csv exports containing the same figures" as
 * /fire-statistics and /data.json.
 */

import { describe, it, expect } from 'vitest';
import { GET } from '../route';
import { buildFireStatisticsDataset } from '@/lib/seo/statistics';
import { FIRE_TYPES } from '@/constants/fire-colors';

describe('GET /data.csv', () => {
  it('returns 200 with text/csv content-type', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
  });

  it('body is valid CSV with a header row and one row per retirement-age x FIRE-type pair', async () => {
    const res = GET();
    const body = await res.text();
    const lines = body.trim().split('\n');
    const dataset = buildFireStatisticsDataset();

    expect(lines[0]).toBe('retirement_age,fire_type,target_amount_usd,data_verified_date');
    expect(lines.length - 1).toBe(dataset.scenarios.length * FIRE_TYPES.length);
  });

  it('every row value traces to buildFireStatisticsDataset() — never a fabricated figure', async () => {
    const res = GET();
    const body = await res.text();
    const [, ...rows] = body.trim().split('\n');
    const dataset = buildFireStatisticsDataset();

    const parsed = rows.map((line) => line.split(','));
    for (const scenario of dataset.scenarios) {
      for (const type of FIRE_TYPES) {
        const match = parsed.find(
          ([age, fireType]) => Number(age) === scenario.retirementAge && fireType === type
        );
        expect(match).toBeDefined();
        expect(Number(match![2])).toBe(scenario.targets[type]);
        expect(match![3]).toBe(dataset.dataVerifiedDate);
      }
    }
  });
});
