import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, '../../src/components/features/calculator/calculator-client.tsx'), 'utf8');

describe('UX P1-4: the mobile parameters sheet', () => {
  it('pads the panel on both sides, so labels, value fields and any bordered block never touch the screen edge', () => {
    const wrapper = source.match(/<SheetContent[^>]*>\s*<div className="([^"]*)">\s*<CalculatorPanel/);
    expect(wrapper, 'the sheet wraps the panel in a div').not.toBeNull();
    expect(wrapper![1]).toMatch(/\bpx-4\b/);
  });

  it('ends with pb-28 or more, so the lowest slider clears an anchor ad over the bottom of the sheet (W9)', () => {
    const wrapper = source.match(/<SheetContent[^>]*>\s*<div className="([^"]*)">\s*<CalculatorPanel/);
    const bottom = wrapper![1].match(/\bpb-(\d+)\b/);
    expect(bottom, 'the sheet wrapper sets a bottom padding').not.toBeNull();
    expect(Number(bottom![1])).toBeGreaterThanOrEqual(28);
  });
});
