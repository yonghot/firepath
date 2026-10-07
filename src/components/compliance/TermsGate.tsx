'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTermsConsent } from '@/hooks/use-terms-consent';
import { acceptTerms, evaluateAgreeAttempt } from '@/lib/terms-consent';

const CHECKBOX_ID = 'terms-gate-checkbox';
const ALERT_ID = 'terms-consent-alert';

export function focusTermsConsent(): void {
  document.getElementById(CHECKBOX_ID)?.focus();
}

function TermsConsentRow() {
  const [checked, setChecked] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);

  const handleAgree = () => {
    const attempt = evaluateAgreeAttempt(checked);
    setAlert(attempt.alert);
    if (attempt.focusCheckbox) checkboxRef.current?.focus();
    if (attempt.accepted) {
      acceptTerms();
      requestAnimationFrame(() => document.getElementById('fire-results')?.focus());
    }
  };

  return (
    <section
      id="terms-consent"
      aria-labelledby="terms-consent-heading"
      className="scroll-mt-20 mb-28 min-h-[18rem] rounded-xl border border-border bg-card p-4 md:min-h-[16rem] md:p-6"
    >
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
        <h2 id="terms-consent-heading" className="text-lg font-semibold">
          See numbers for your own inputs
        </h2>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        The numbers above are an example. Agree to the terms to see results for your own inputs. You can keep adjusting
        the inputs either way.
      </p>

      <div className="flex items-start gap-3">
        <input
          ref={checkboxRef}
          id={CHECKBOX_ID}
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
            if (e.target.checked) setAlert(null);
          }}
          aria-invalid={alert !== null}
          aria-describedby={ALERT_ID}
          className="mt-2 h-5 w-5 shrink-0 rounded border-input accent-[var(--brand-primary)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <label htmlFor={CHECKBOX_ID} className="py-2 text-sm leading-snug">
          I agree to the{' '}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:underline"
          >
            Terms of Use
          </Link>{' '}
          and understand results are estimates, not professional advice.
        </label>
      </div>

      <p id={ALERT_ID} role="alert" className="mb-2 min-h-5 text-sm text-destructive">
        {alert}
      </p>

      <Button type="button" onClick={handleAgree} className="h-11 w-full px-6 sm:w-auto sm:min-w-64">
        Agree and view results
      </Button>
    </section>
  );
}

export function TermsGate({ children, className }: { children: React.ReactNode; className?: string }) {
  const accepted = useTermsConsent();
  return (
    <div className={className}>
      {children}
      {accepted !== true && <TermsConsentRow />}
    </div>
  );
}
