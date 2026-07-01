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

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateHealthcareBridge, MEDICARE_ELIGIBILITY_AGE } from '@/lib/engine/healthcare-bridge';
import { formatCurrencyFull } from '@/lib/utils/format';

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

export function HealthcareBridgeCalculator() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [result, setResult] = useState<ReturnType<typeof calculateHealthcareBridge> | null>(null);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = {
      currentAge: Number(form.currentAge),
      retirementAge: Number(form.retirementAge),
      annualPremium: Number(form.annualPremium),
      annualGrowthRate: form.annualGrowthRate === '' ? 0 : Number(form.annualGrowthRate) / 100,
    };
    setResult(calculateHealthcareBridge(parsed));
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer — always visible, above the inputs */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Informational estimate only.</strong> Annual premiums are user-supplied. We do{' '}
            <strong>not</strong> fabricate ACA subsidy figures. Your actual premium, subsidy, and
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
              US health premiums grew ~5 %/yr historically (KFF 2023 Survey). Leave blank for 0%.
            </p>
          </div>
        </div>

        <Button type="submit" className="w-full sm:w-auto">
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
            <div>
              <p className="text-sm font-medium text-[var(--fire-lean)]">
                No healthcare bridge needed.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You plan to retire at or after age {MEDICARE_ELIGIBILITY_AGE} — Medicare coverage
                will already be available.
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
