import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HealthcareBridgeCalculator } from '@/components/features/healthcare/healthcare-bridge-calculator';
import { AGREE_ALERT, evaluateAgreeAttempt } from '@/lib/terms-consent';
import { renderWithProviders } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const FILE = join(__dirname, '..', '..', 'src', 'components', 'features', 'healthcare', 'healthcare-bridge-calculator.tsx');
const source = readFileSync(FILE, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const html = renderWithProviders(createElement(HealthcareBridgeCalculator));

describe('D1: the Estimate Bridge Cost button looks active and explains a missing agreement', () => {
  it('the primary button is not disabled before the box is ticked', () => {
    const button = (html.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? '').replace(/class="[^"]*"/, '');
    expect(button).not.toBe('');
    expect(button).not.toMatch(/\sdisabled(=|\s|>)/);
    expect(button).not.toMatch(/data-disabled|aria-disabled="true"/);
    expect(source).not.toMatch(/disabled=\{!termsAccepted\}/);
  });

  it('an inline role="alert" region sits between the agreement row and the button, ready to carry the message', () => {
    const alert = html.match(/<p[^>]*id="hb-terms-alert"[^>]*>/)?.[0] ?? '';
    expect(alert).toContain('role="alert"');
    const checkbox = html.indexOf('id="hb-terms-checkbox"');
    const region = html.indexOf('id="hb-terms-alert"');
    const button = html.indexOf('Estimate Bridge Cost');
    expect(checkbox).toBeGreaterThan(-1);
    expect(checkbox).toBeLessThan(region);
    expect(region).toBeLessThan(button);
    expect(html.match(/<input[^>]*id="hb-terms-checkbox"[^>]*>/)?.[0]).toContain('aria-describedby="hb-terms-alert"');
  });

  it('a submit without agreement shows the shared alert text and moves focus to the checkbox, and computes nothing', () => {
    expect(evaluateAgreeAttempt(false)).toEqual({ accepted: false, alert: AGREE_ALERT, focusCheckbox: true });
    expect(source).toMatch(/evaluateAgreeAttempt\(termsAccepted\)/);
    expect(source).toMatch(/checkboxRef\.current\?\.focus\(\)/);
    expect(source).toMatch(/if \(!attempt\.accepted\) return;/);
    const guard = source.indexOf('if (!attempt.accepted) return;');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(source.indexOf('calculateHealthcareBridge(parsed)'));
  });

  it('the agreement itself is unchanged: unchecked on load, same wording, never pre-filled', () => {
    expect(html.match(/<input[^>]*id="hb-terms-checkbox"[^>]*>/)?.[0]).not.toMatch(/\bchecked\b/);
    expect(html).toContain('I agree to the');
    expect(html).toContain('Terms of Use');
    expect(html).toContain('and understand results are estimates, not professional advice.');
    expect(source.match(/writeStoredConsent\(\)/g)).toHaveLength(2);
  });
});
