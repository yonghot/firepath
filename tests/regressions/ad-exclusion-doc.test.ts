import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const doc = read('docs/ad-exclusion-zones.md');

const SELECTORS: Array<{ selector: string; markup: string; file: string }> = [
  {
    selector: 'form[aria-label="Healthcare bridge cost estimator"]',
    markup: 'aria-label="Healthcare bridge cost estimator"',
    file: 'src/components/features/healthcare/healthcare-bridge-calculator.tsx',
  },
  {
    selector: '[data-testid="calculator-presets"]',
    markup: 'data-testid="calculator-presets"',
    file: 'src/components/features/calculator/calculator-presets.tsx',
  },
  {
    selector: '[data-slot="sheet-trigger"]',
    markup: 'data-slot="sheet-trigger"',
    file: 'src/components/ui/sheet.tsx',
  },
  {
    selector: 'aside:has(input[aria-label$=" value"])',
    markup: 'aria-label={`${label} value`}',
    file: 'src/components/features/calculator/slider-input.tsx',
  },
];

describe('W10: the Auto ads exclusion list matches the markup it names', () => {
  for (const { selector, markup, file } of SELECTORS) {
    it(`${selector} is listed and the markup it targets exists`, () => {
      expect(doc).toContain(selector);
      expect(read(file)).toContain(markup);
    });
  }

  it('the selector that could never match (slider as a direct child of the sidebar div) is gone', () => {
    expect(doc).not.toContain('aside:has(> div > [role="slider"])');
  });

  it('the sidebar markup is an aside that holds the slider inputs', () => {
    const client = read('src/components/features/calculator/calculator-client.tsx');
    expect(client).toMatch(/<aside className="hidden lg:block[^"]*">/);
  });

  it('the healthcare-bridge bullet admits that the page carries the Auto ads loader', () => {
    const bullet = doc.slice(doc.indexOf('**`/fire-types` and `/healthcare-bridge`**'));
    expect(bullet).toMatch(/loader/i);
    expect(bullet).not.toMatch(/so there is no\s+proximity surface/);
  });

  it('/result is documented as loader-free (utility group)', () => {
    const bullet = doc.slice(doc.indexOf('- **`/result`**'), doc.indexOf('- **`/guide` and `/guide/[slug]`**'));
    expect(bullet).toMatch(/no (ad )?loader/i);
  });
});
