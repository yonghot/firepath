'use client';

/**
 * TermsGate — CLICKWRAP consent gate for the RESULTS panel.
 *
 * FIREPath is a slider-live calculator: results recompute continuously as the
 * user drags sliders, so there is no single "calculate" button to gate. Per
 * the P0 mitigation, we instead gate the RESULTS surface itself with a
 * non-dismissable overlay/inline card until the user affirmatively agrees.
 * Inputs (sliders/panel) remain fully usable while the overlay is showing —
 * only the results view is obscured.
 *
 * Requirements:
 *   - Active affirmative action: unchecked checkbox by default, no browse-wrap.
 *   - Persists consent in localStorage with an ISO timestamp; once accepted,
 *     never shown again (until localStorage is cleared).
 *   - SSR-safe: renders nothing gate-related until mounted on the client, so
 *     server and first client render match (no hydration mismatch), and no
 *     `localStorage` access happens outside `useEffect`.
 *   - a11y: labeled checkbox (label/htmlFor), visible focus-visible ring,
 *     keyboard operable, role="dialog" region describing the gate.
 *
 * Usage: wrap the results children (chart + result cards) with <TermsGate>.
 * The gate renders its children immediately (so layout/CLS is stable) and
 * overlays a translucent, non-dismissable card on top until consent is given.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'firepath_terms_consent';

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
  const payload: StoredConsent = { accepted: true, timestamp: new Date().toISOString() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable (private mode / quota) — consent simply won't
    // persist across reloads; the gate will show again next time. Non-fatal.
  }
}

interface TermsGateProps {
  children: React.ReactNode;
  className?: string;
}

export function TermsGate({ children, className }: TermsGateProps) {
  // null = not yet resolved on the client (avoids hydration mismatch / flash).
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Defer the setState call out of the synchronous effect body (avoids
    // cascading-render lint warning; same pattern as CookieConsentBanner).
    queueMicrotask(() => setAccepted(readStoredConsent()));
  }, []);

  const handleAgree = () => {
    if (!checked) return;
    writeStoredConsent();
    setAccepted(true);
  };

  // Before client resolution, render children un-gated to avoid layout shift /
  // hydration mismatch. The gate will snap into place on mount if needed —
  // this mirrors the SSR-safety pattern used by CookieConsentBanner.
  const showGate = accepted === false;

  return (
    <div className={`relative ${className ?? ''}`}>
      {children}

      {showGate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-gate-heading"
          className="absolute inset-0 z-30 flex items-start justify-center rounded-xl bg-background/90 backdrop-blur-sm p-4 pt-8"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
              <h2 id="terms-gate-heading" className="text-lg font-semibold">
                Before you see results
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Adjust the sliders anytime — to view the calculated results, please confirm you
              understand and agree to the following.
            </p>

            <div className="flex items-start gap-3 mb-4">
              <input
                id="terms-gate-checkbox"
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-[var(--brand-primary)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
              <label htmlFor="terms-gate-checkbox" className="text-sm leading-snug">
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

            <Button
              onClick={handleAgree}
              disabled={!checked}
              className="w-full"
              aria-label="Agree and view results"
            >
              Agree and view results
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
