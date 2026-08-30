import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const CHARTS = [
  'calculator/fire-timeline-chart.tsx',
  'scenario/scenario-comparison.tsx',
  'portfolio/portfolio-results.tsx',
  'portfolio/portfolio-chart.tsx',
  'monte-carlo/monte-carlo-chart.tsx',
];

describe('responsive chart initialization', () => {
  it.each(CHARTS)('%s starts from a non-negative measured size', (file) => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/features', file),
      'utf8',
    );

    expect(source).toContain('initialDimension={{ width: 1, height: 1 }}');
  });
});
