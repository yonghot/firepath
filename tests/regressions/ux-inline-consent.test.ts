import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { gateResult } from '@/lib/engine/example-scenarios';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { formatCurrency } from '@/lib/utils/format';
import type { FIREInput } from '@/types/fire.types';
import { CalculatorClient } from '@/components/features/calculator/calculator-client';
import { ResultClient } from '@/components/features/calculator/result-client';
import { ResultsPanel } from '@/components/features/calculator/results-panel';
import { renderWithProviders } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const decode = (value: string) =>
  value.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const home = renderWithProviders(createElement(CalculatorClient));
const resultPage = renderWithProviders(createElement(ResultClient));

const custom: FIREInput = { ...DEFAULT_INPUT, currentAge: 33, annualExpenses: 52_000, savingsRate: 0.4 };
const defaults = calculateFIRE(DEFAULT_INPUT);
const customOutput = calculateFIRE(custom);

function cardLabels(html: string): string[] {
  return [...html.matchAll(/role="button" aria-label="([^"]*)"/g)].map((m) => decode(m[1]));
}

function consentSection(html: string): string {
  const match = html.match(/<section[^>]*id="terms-consent"[\s\S]*?<\/section>/);
  expect(match, 'the consent row is in the server HTML').not.toBeNull();
  return match![0];
}

function panelHtml(accepted: boolean | null, input: FIREInput, showActions = true): string {
  const gated = gateResult({ input, output: calculateFIRE(input), accepted });
  return renderWithProviders(
    createElement(ResultsPanel, { gated, accepted, showActions, highlightedType: null, onHighlight: () => undefined }),
  );
}

describe('UX P0-2 / D1: no veil over the results', () => {
  for (const [name, html] of [['home calculator', home], ['/result', resultPage]] as const) {
    it(`${name}: no dialog, overlay, blur or cover is rendered`, () => {
      expect(html).not.toMatch(/role="dialog"|aria-modal|backdrop-blur|absolute inset-0|bg-background\/90/);
      expect(html).not.toContain('Before you see results');
      expect(html).not.toContain('Adjust the sliders anytime');
    });

    it(`${name}: the results wrapper is not hidden, inert or blurred`, () => {
      const open = html.match(/<div[^>]*id="fire-results"[^>]*>/)?.[0] ?? '';
      expect(open).not.toBe('');
      expect(open).not.toMatch(/aria-hidden|inert|blur|opacity-|pointer-events-none|invisible/);
    });
  }

  it('the old overlay implementation is gone from the gate source', () => {
    const src = stripComments(read('src/components/compliance/TermsGate.tsx'));
    expect(src).not.toMatch(/role="dialog"|aria-modal|backdrop-blur|absolute inset-0|showGate/);
    expect(src).not.toMatch(/useEffect|queueMicrotask/);
  });
});

describe('UX P0-2 / D1: the example results are always visible and labelled', () => {
  it('a first-time visitor sees the default example with its label and all five cards', () => {
    expect(home).toContain('data-result-caption');
    const caption = home.match(/<div[^>]*data-result-caption[^>]*>[\s\S]*?<\/div>/)![0];
    expect(textOf(caption)).toContain('Example · default inputs');
    const labels = cardLabels(home);
    expect(labels).toHaveLength(5);
    expect(labels.join(' ')).toContain(formatCurrency(defaults.results.regular.targetAmount));
  });

  it('the caption is a polite live region so a change from example to own numbers is announced', () => {
    expect(home).toMatch(/<div[^>]*data-result-caption[^>]*role="status"[^>]*aria-live="polite"|<div[^>]*role="status"[^>]*aria-live="polite"[^>]*data-result-caption/);
  });

  it('own numbers are withheld before agreement: the panel shows the default example, never the custom output', () => {
    expect(customOutput.results.regular.targetAmount).not.toBe(defaults.results.regular.targetAmount);
    for (const accepted of [false, null] as const) {
      const html = panelHtml(accepted, custom);
      const labels = cardLabels(html).join(' ');
      expect(labels).toContain(formatCurrency(defaults.results.regular.targetAmount));
      expect(labels).not.toContain(formatCurrency(customOutput.results.regular.targetAmount));
      expect(textOf(html)).toContain('Example · default inputs');
      expect(textOf(html)).toContain('These are not your numbers yet');
    }
  });

  it('the pointer to the consent row is a button, not an anchor, so the share hash is never replaced', () => {
    const html = panelHtml(false, custom);
    expect(html).not.toMatch(/href="#terms-consent"/);
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Agree to the terms below<\/button>/);
  });

  it('a preset example is shown without agreement and labelled with the preset', () => {
    const preset: FIREInput = { ...DEFAULT_INPUT, currentAge: 40, annualIncome: 120000, savingsRate: 0.25 };
    const html = panelHtml(false, preset);
    expect(textOf(html)).toContain('Example · 40, $120k income, 25% savings');
    expect(textOf(html)).not.toContain('These are not your numbers yet');
    expect(cardLabels(html).join(' ')).toContain(formatCurrency(calculateFIRE(preset).results.regular.targetAmount));
  });

  it('after agreement the visitor\'s own numbers show, labelled "Your inputs"', () => {
    const html = panelHtml(true, custom);
    expect(cardLabels(html).join(' ')).toContain(formatCurrency(customOutput.results.regular.targetAmount));
    expect(textOf(html)).toContain('Your inputs');
    expect(textOf(html)).not.toContain('Example');
  });
});

describe('UX P0-2 / D1: share and save stay behind agreement', () => {
  it('the first-time home render has no share or save control', () => {
    expect(textOf(home)).not.toMatch(/Copy link|Save Calculation/i);
    expect(home).not.toMatch(/aria-label="Copy link to this result"/);
  });

  it('the panel shows them only once agreement is known', () => {
    expect(panelHtml(false, DEFAULT_INPUT)).not.toContain('Copy link');
    expect(panelHtml(null, DEFAULT_INPUT)).not.toContain('Copy link');
    expect(panelHtml(true, DEFAULT_INPUT)).toContain('Copy link');
    expect(panelHtml(true, DEFAULT_INPUT, false)).not.toContain('Copy link');
  });

  it('/result no longer shows the header share button before agreement', () => {
    expect(resultPage).not.toContain('Copy link');
  });
});

describe('UX P0-2 / D1: the inline consent row', () => {
  const section = consentSection(home);

  it('is server-rendered with reserved height, below the full disclaimer, after the result cards', () => {
    expect(section).toMatch(/class="[^"]*\bmin-h-\[\d+rem\]/);
    expect(section).toMatch(/class="[^"]*\bmd:min-h-\[\d+rem\]/);
    const cards = home.indexOf('role="button" aria-label=');
    const disclaimer = home.indexOf('id="results-disclaimer"');
    const consent = home.indexOf('id="terms-consent"');
    expect(cards).toBeGreaterThan(-1);
    expect(disclaimer).toBeGreaterThan(cards);
    expect(consent).toBeGreaterThan(disclaimer);
  });

  it('keeps the checkbox unticked, with the unchanged agreement wording and a Terms link', () => {
    const box = section.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0] ?? '';
    expect(box).not.toBe('');
    expect(box).not.toMatch(/\schecked/);
    expect(box).toContain('id="terms-gate-checkbox"');
    const label = section.match(/<label[^>]*for="terms-gate-checkbox"[^>]*>([\s\S]*?)<\/label>/)![1];
    expect(textOf(label)).toBe('I agree to the Terms of Use and understand results are estimates, not professional advice.');
    expect(label).toMatch(/<a [^>]*href="\/terms"[^>]*>Terms of Use<\/a>/);
  });

  it('puts the primary button directly after the checkbox row with only the alert region between', () => {
    const afterLabel = section.slice(section.indexOf('</label>'));
    const beforeButton = afterLabel.slice(0, afterLabel.indexOf('<button'));
    expect(beforeButton).toContain('role="alert"');
    expect(beforeButton).not.toMatch(/<(input|button|a|select|textarea)\b/);
    expect(section.match(/<button\b/g)).toHaveLength(1);
    expect(textOf(afterLabel)).toContain('Agree and view results');
  });

  it('the primary button always looks enabled', () => {
    const button = section.match(/<button[^>]*>/)![0];
    expect(button).not.toMatch(/\sdisabled(?=[=\s>])|aria-disabled|data-disabled/);
    expect(button).toContain('type="button"');
    const plainClasses = (button.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter((token) => !token.includes(':'));
    expect(plainClasses.filter((token) => /^opacity-|^cursor-not-allowed$/.test(token))).toEqual([]);
  });

  it('has an empty role="alert" region with reserved height and no separate Continue button', () => {
    const alert = section.match(/<p[^>]*role="alert"[^>]*>([\s\S]*?)<\/p>/);
    expect(alert).not.toBeNull();
    expect(alert![0]).toMatch(/class="[^"]*\bmin-h-\d/);
    expect(textOf(alert![1])).toBe('');
    expect(textOf(section)).not.toMatch(/\bContinue\b/);
  });

  it('is also on /result, after the disclaimer', () => {
    const consent = consentSection(resultPage);
    expect(consent).toContain('Agree and view results');
    expect(resultPage.indexOf('id="results-disclaimer"')).toBeLessThan(resultPage.indexOf('id="terms-consent"'));
  });
});

describe('UX P0-2 / K26-7: the consent button keeps its distance from the ad slot', () => {
  const spacing = (token: string) => Number(token) * 4;

  it('at least 150px separate the primary button from the display slot that follows the calculator', () => {
    const section = consentSection(home);
    const classes = section.match(/<section[^>]*class="([^"]*)"/)![1].split(/\s+/);
    const marginBottom = classes.find((c) => /^mb-\d+$/.test(c));
    expect(marginBottom, 'consent section has a bottom margin').toBeDefined();
    const paddingBottom = classes.includes('p-4') ? 16 : 24;
    const monetization = stripComments(read('src/components/monetization/ResultMonetization.tsx'));
    const slotTop = monetization.match(/aria-label="Related offers and resources"[\s\S]{0,40}className="(?:[^"]*\s)?mt-(\d+)(?:\s|")/);
    expect(slotTop, 'ResultMonetization has a top margin').not.toBeNull();
    const gap = spacing(marginBottom!.slice(3)) + spacing(slotTop![1]) + paddingBottom;
    expect(gap).toBeGreaterThanOrEqual(150);
  });

  it('the exclusion-zone reference lists the consent row for the owner console', () => {
    expect(read('docs/ad-exclusion-zones.md')).toContain('#terms-consent');
  });
});

describe('UX P0-2 / D1: nothing is pre-agreed or injected', () => {
  it('rendering never touches localStorage', () => {
    const calls: string[] = [];
    vi.stubGlobal('localStorage', {
      getItem: () => {
        calls.push('get');
        return null;
      },
      setItem: () => {
        calls.push('set');
      },
      removeItem: () => undefined,
    });
    renderWithProviders(createElement(CalculatorClient));
    vi.unstubAllGlobals();
    expect(calls.filter((c) => c === 'set')).toEqual([]);
  });

  it('the agreement is recorded from the primary button handler only', () => {
    const src = stripComments(read('src/components/compliance/TermsGate.tsx'));
    expect(src.match(/acceptTerms\(/g)).toHaveLength(1);
    expect(src.indexOf('acceptTerms(')).toBeGreaterThan(src.indexOf('const handleAgree'));
    expect(src).toMatch(/evaluateAgreeAttempt\(checked\)/);
    expect(src).toMatch(/checkboxRef\.current\?\.focus\(\)/);
    expect(src).not.toMatch(/useState\(true\)|defaultChecked|checked=\{true\}/);
  });
});

describe('UX P0-2 / D1: personalised output cannot reach the screen around the gate', () => {
  const client = stripComments(read('src/components/features/calculator/calculator-client.tsx'));

  it('the next-step module and the premium panels read the gated scenario, not the raw store output', () => {
    expect(client).toMatch(/<ResultRelated[\s\S]{0,120}output=\{gated\.output\}[\s\S]{0,40}input=\{gated\.input\}/);
    expect(client).not.toMatch(/<ResultRelated[\s\S]{0,120}output=\{output\}/);
    expect(client).toMatch(/<MonteCarloPanel[\s\S]*?input=\{gated\.input\}[\s\S]*?results=\{gated\.output\.results\}/);
  });

  it('the scenario comparison opens only after agreement', () => {
    expect(client).toMatch(/accepted === true/);
    expect(client).toMatch(/focusTermsConsent\(\)/);
  });
});
