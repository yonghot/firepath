import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { calculateHealthcareBridge } from '@/lib/engine/healthcare-bridge';
import { decodeAges, healthcareBridgeHref } from '@/lib/engine/url-state';
import { resultNextSteps } from '@/lib/next-steps';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { ResultRelated } from '@/components/features/calculator/result-related';
import { initialFormFromHash } from '@/components/features/healthcare/healthcare-bridge-calculator';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const ROOT = path.resolve(__dirname, '../..');

const decode = (value: string) => value.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

const SCENARIO = { ...DEFAULT_INPUT, currentAge: 41, retirementAge: 52, annualIncome: 123456, currentNetWorth: 777777 };

const DEFAULT_FORM = { currentAge: '35', retirementAge: '50', annualPremium: '7200', annualGrowthRate: '5' };

function hrefsIn(html: string): string[] {
  return [...html.matchAll(/<a\s[^>]*?href="([^"]*)"/g)].map((m) => decode(m[1]));
}

describe('FIRE-36 (K26-2): next-step links carry the scenario to the page that reads it', () => {
  const output = calculateFIRE(SCENARIO);
  const reach = output.results.regular.reachAge;

  it('the healthcare link carries the two ages and nothing else from the scenario', () => {
    const href = healthcareBridgeHref(41, 52);
    expect(href).toBe('/healthcare-bridge#a=41&ra=52');
    expect(href).not.toMatch(/123456|777777/);
  });

  it('an age that leaves no bridge, predates the current age or is outside the decoder range opens the tool on its own defaults', () => {
    for (const age of [65, 70, 40, 24, 81, null]) expect(healthcareBridgeHref(41, age), String(age)).toBe('/healthcare-bridge');
  });

  it('every other next step keeps its exact path, including in-page anchors', () => {
    const others = resultNextSteps(SCENARIO, output).filter((item) => item.slot !== 'healthcare');
    expect(others.map((item) => item.href)).toContain('/fire-types#regular');
    for (const item of others) expect(item.href, item.slot).toBe(item.path);
  });

  it('the result module links the healthcare tool with the age Regular FIRE is reached and no other link carries a hash it cannot read', () => {
    expect(reach).not.toBeNull();
    const html = renderToStaticMarkup(createElement(ResultRelated, { output, input: SCENARIO }));
    const hrefs = hrefsIn(html);
    const expected = `/healthcare-bridge#a=41&ra=${reach}`;
    expect(hrefs).toContain(expected);
    expect(hrefs.filter((href) => /#a=/.test(href))).toEqual([expected]);
    expect(hrefs).toContain('/fire-guide');
    expect(html).toContain(`Reaching Regular FIRE at ${reach} leaves ${65 - (reach as number)} years before Medicare at 65`);
  });

  it('analytics clicks never include the hash or any input value', () => {
    const source = readFileSync(path.join(ROOT, 'src/components/common/next-step-link.tsx'), 'utf8');
    expect(source).toMatch(/trackEvent\('related_click',\s*\{\s*link_module:\s*'next_step',\s*link_context:\s*item\.slot,\s*link_url:\s*item\.path\s*\}\)/);
  });
});

describe('FIRE-36: the healthcare calculator starts from the carried ages', () => {
  it('reads both ages from the hash and keeps its own defaults for the rest', () => {
    expect(initialFormFromHash('#a=41&ra=52')).toEqual({ ...DEFAULT_FORM, currentAge: '41', retirementAge: '52' });
  });

  it('a link built by the result module round-trips into the form', () => {
    const hash = healthcareBridgeHref(41, 52).split('#')[1];
    const form = initialFormFromHash(hash);
    expect([form.currentAge, form.retirementAge]).toEqual(['41', '52']);
    const computed = calculateHealthcareBridge({
      currentAge: Number(form.currentAge),
      retirementAge: Number(form.retirementAge),
      annualPremium: Number(form.annualPremium),
      annualGrowthRate: Number(form.annualGrowthRate) / 100,
    });
    expect(computed.ok && computed.result.bridgeYears).toBe(65 - 52);
  });

  it('without a usable hash it falls back to the page defaults', () => {
    for (const hash of ['', '#', '#unknown=1', '#a=5', '#ra=999', '#a=abc']) {
      expect(initialFormFromHash(hash), hash).toEqual(DEFAULT_FORM);
    }
  });

  it('the pure age parser only reports ages inside the calculator bounds', () => {
    expect(decodeAges('#a=41&ra=52')).toEqual({ currentAge: 41, retirementAge: 52 });
    expect(decodeAges('')).toBeNull();
    expect(decodeAges('#a=5')).toBeNull();
  });

  it('the calculator applies the hash after mount, not during render, so server and client markup stay identical', () => {
    const source = readFileSync(path.join(ROOT, 'src/components/features/healthcare/healthcare-bridge-calculator.tsx'), 'utf8');
    expect(source).toMatch(/useEffect\(\(\) => \{[\s\S]*?initialFormFromHash\(window\.location\.hash\)[\s\S]*?\}, \[\]\)/);
    expect(source).toMatch(/useState<FormState>\(DEFAULT_FORM\)/);
  });
});
