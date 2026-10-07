'use client';

/**
 * HealthcareBridgeCalculator — interactive form for the Healthcare Bridge Estimator.
 *
 * INFORMATIONAL ONLY. This tool helps estimate the cost of bridging private
 * health insurance from early retirement to Medicare eligibility at 65.
 *
 * - Annual premiums are USER-SUPPLIED; we do NOT provide, adjust, or fabricate
 *   ACA subsidy figures. Users should obtain real quotes at healthcare.gov.
 * - All computation is client-side using the pure engine function in
 *   src/lib/engine/healthcare-bridge.ts.
 */

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateHealthcareBridge, MEDICARE_ELIGIBILITY_AGE } from '@/lib/engine/healthcare-bridge';
import { formatCurrencyFull } from '@/lib/utils/format';
import { trackEvent, IS_SENSITIVE_SITE } from '@/lib/analytics';
import { decodeAges } from '@/lib/engine/url-state';

/** Stable calc_type slug for this calculator (부속I T03). */
const CALC_TYPE = 'healthcare_bridge';
/** Minimum ms between calculator_complete events per calc_type (debounce). */
const COMPLETE_DEBOUNCE_MS = 2000;

/** Coarse, output-derived bucket for total estimated bridge cost — never the
 *  raw dollar value or user-supplied premium. */
function bucketTotalCost(totalEstimatedCost: number): string {
  if (totalEstimatedCost < 10_000) return 'under_10k';
  if (totalEstimatedCost < 50_000) return '10k_50k';
  if (totalEstimatedCost < 250_000) return '50k_250k';
  return 'over_250k';
}

interface FormState {
  currentAge: string;
  retirementAge: string;
  annualPremium: string;
  annualGrowthRate: string;
}

const DEFAULT_FORM: FormState = {
  currentAge: '35',
  retirementAge: '50',
  annualPremium: '7200',
  annualGrowthRate: '5',
};

/** Ages carried in the URL hash by the result module's healthcare link (the scenario's current and retirement age); anything else starts from the page defaults. */
export function initialFormFromHash(hash: string): FormState {
  const ages = decodeAges(hash);
  if (!ages) return DEFAULT_FORM;
  return { ...DEFAULT_FORM, currentAge: String(ages.currentAge), retirementAge: String(ages.retirementAge) };
}

// Clickwrap consent gate for THIS calculator's "Estimate Bridge Cost" button.
// Separate key from the main calculator's TermsGate (which gates the live
// slider results panel) since this is a distinct button-triggered surface.
const CONSENT_KEY = 'firepath_terms_consent_healthcare_bridge';

interface StoredConsent {
  accepted: true;
  timestamp: string;
}

function readStoredConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as StoredConsent;
    return parsed?.accepted === true && typeof parsed.timestamp === 'string';
  } catch {
    return false;
  }
}

function writeStoredConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ accepted: true, timestamp: new Date().toISOString() })
    );
  } catch {
    // localStorage unavailable — consent won't persist; non-fatal.
  }
}

export function HealthcareBridgeCalculator() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [result, setResult] = useState<ReturnType<typeof calculateHealthcareBridge> | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // 부속I T03 — hasUserInteracted guard: calc_input_start fires once on the
  // first real field edit; calculator_complete fires only when a result
  // renders AS A CONSEQUENCE of the user's own submit (never on load).
  const hasStartedRef = useRef(false);
  const lastCompleteAtRef = useRef(0);

  useEffect(() => {
    // Defer the setState call out of the synchronous effect body (avoids
    // cascading-render lint warning; same pattern as CookieConsentBanner).
    queueMicrotask(() => {
      setTermsAccepted(readStoredConsent());
      const carried = initialFormFromHash(window.location.hash);
      if (carried !== DEFAULT_FORM) setForm(carried);
    });
  }, []);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      trackEvent('calc_input_start', { calc_type: CALC_TYPE });
    }
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) return;
    const parsed = {
      currentAge: Number(form.currentAge),
      retirementAge: Number(form.retirementAge),
      annualPremium: Number(form.annualPremium),
      annualGrowthRate: form.annualGrowthRate === '' ? 0 : Number(form.annualGrowthRate) / 100,
    };
    const computed = calculateHealthcareBridge(parsed);
    setResult(computed);

    // Only a successful computation (computed.ok) renders an actual RESULT —
    // a validation-error list is not a "result" per T03, so calculator_complete
    // stays scoped to real output. Debounced so rapid re-submits (e.g.
    // double-click) emit at most one event per 2s.
    if (computed.ok) {
      const now = Date.now();
      if (now - lastCompleteAtRef.current >= COMPLETE_DEBOUNCE_MS) {
        lastCompleteAtRef.current = now;
        trackEvent('calculator_complete', {
          calc_type: CALC_TYPE,
          ...(!IS_SENSITIVE_SITE && !computed.result.noGapNeeded
            ? { result_bucket: bucketTotalCost(computed.result.totalEstimatedCost) }
            : {}),
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer — always visible, above the inputs */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Informational estimate only.</strong> Annual premiums are user-supplied. This tool does{' '}
            <strong>not</strong> estimate ACA subsidies. Your actual premium, subsidy, and
            eligibility depend on income, household size, plan, and state.{' '}
            <a
              href="https://www.healthcare.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Get real quotes at healthcare.gov
            </a>
            . Not financial, tax, or medical advice.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} aria-label="Healthcare bridge cost estimator" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Current Age */}
          <div className="space-y-1">
            <Label htmlFor="hb-current-age">Current Age</Label>
            <Input
              id="hb-current-age"
              type="number"
              min={0}
              max={120}
              step={1}
              required
              value={form.currentAge}
              onChange={handleChange('currentAge')}
              aria-label="Current age in years"
              className="font-mono"
            />
          </div>

          {/* Planned Retirement Age */}
          <div className="space-y-1">
            <Label htmlFor="hb-retirement-age">
              Planned Early-Retirement Age
            </Label>
            <Input
              id="hb-retirement-age"
              type="number"
              min={0}
              max={120}
              step={1}
              required
              value={form.retirementAge}
              onChange={handleChange('retirementAge')}
              aria-label="Planned early retirement age in years"
              className="font-mono"
            />
          </div>

          {/* Annual Premium */}
          <div className="space-y-1">
            <Label htmlFor="hb-annual-premium">
              Estimated Annual Premium (USD)
            </Label>
            <Input
              id="hb-annual-premium"
              type="number"
              min={0}
              max={10000000}
              step={100}
              required
              value={form.annualPremium}
              onChange={handleChange('annualPremium')}
              aria-label="Your estimated annual health insurance premium in US dollars"
              className="font-mono"
              placeholder="e.g. 7200"
            />
            <p className="text-[10px] text-muted-foreground">
              User-supplied — obtain your quote at{' '}
              <a
                href="https://www.healthcare.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                healthcare.gov
              </a>
            </p>
          </div>

          {/* Annual Growth Rate */}
          <div className="space-y-1">
            <Label htmlFor="hb-growth-rate">
              Annual Premium Growth Rate (%) — optional
            </Label>
            <Input
              id="hb-growth-rate"
              type="number"
              min={-100}
              max={500}
              step={0.1}
              value={form.annualGrowthRate}
              onChange={handleChange('annualGrowthRate')}
              aria-label="Optional annual growth rate for premiums as a percentage"
              className="font-mono"
              placeholder="e.g. 5"
            />
            <p className="text-[10px] text-muted-foreground">
              Premiums tend to rise over time. 5 is an example assumption, not a published figure; use your own. Leave blank for 0%.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="hb-terms-checkbox"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              const next = e.target.checked;
              setTermsAccepted(next);
              if (next) writeStoredConsent();
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-[var(--brand-primary)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <label htmlFor="hb-terms-checkbox" className="text-xs text-muted-foreground leading-snug">
            I agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:underline"
            >
              Terms of Use
            </a>{' '}
            and understand results are estimates, not professional advice.
          </label>
        </div>

        <Button type="submit" className="w-full sm:w-auto" disabled={!termsAccepted}>
          Estimate Bridge Cost
        </Button>
      </form>

      {/* Results */}
      {result !== null && (
        <div className="rounded-xl border bg-card p-6 space-y-4" aria-live="polite">
          {!result.ok ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">Please correct the following:</p>
              <ul className="space-y-1 list-disc list-inside text-sm text-destructive">
                {result.errors.map((err) => (
                  <li key={err.field}>{err.message}</li>
                ))}
              </ul>
            </div>
          ) : result.result.noGapNeeded ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--fire-lean)]">
                No healthcare bridge needed.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This scenario retires at or after age {MEDICARE_ELIGIBILITY_AGE} — Medicare
                coverage will already be available.
              </p>
              <p className="text-xs text-muted-foreground">
                Tax and healthcare rules change frequently — verify current rules with a
                qualified professional.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border p-4" style={{ borderLeftWidth: 4, borderLeftColor: 'var(--fire-coast)' }}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Bridge Years
                  </p>
                  <p className="text-3xl font-bold tabular-nums">
                    {result.result.bridgeYears}
                    <span className="text-sm font-normal text-muted-foreground ml-1">yrs</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Until Medicare at {MEDICARE_ELIGIBILITY_AGE}
                  </p>
                </div>

                <div className="rounded-xl border p-4" style={{ borderLeftWidth: 4, borderLeftColor: 'var(--fire-regular)' }}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Total Estimated Cost
                  </p>
                  <p className="text-3xl font-bold tabular-nums">
                    {formatCurrencyFull(result.result.totalEstimatedCost)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cumulative premium estimate
                  </p>
                </div>

                <div className="rounded-xl border p-4" style={{ borderLeftWidth: 4, borderLeftColor: 'var(--fire-lean)' }}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Medicare Eligibility
                  </p>
                  <p className="text-3xl font-bold tabular-nums">
                    {MEDICARE_ELIGIBILITY_AGE}
                    <span className="text-sm font-normal text-muted-foreground ml-1">yrs</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per US law
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                <strong>Estimate only.</strong> Actual costs depend on your income, subsidies,
                plan selection, and annual rate changes. Verify with{' '}
                <a
                  href="https://www.healthcare.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  healthcare.gov
                </a>{' '}
                and a licensed health-insurance advisor.
              </p>
              <p className="text-xs text-muted-foreground">
                Tax and healthcare rules change frequently — verify current rules with a
                qualified professional.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
