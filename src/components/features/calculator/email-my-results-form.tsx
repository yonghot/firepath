'use client';

/**
 * EmailMyResultsForm — env-gated "Email my results" capture (부속I T17).
 *
 * Distinct from EmailResultCapture (src/components/common/email-result-capture.tsx,
 * the existing NEXT_PUBLIC_EMAIL_CAPTURE=on newsletter-style capture posting
 * to /api/subscribe). This component:
 *   - posts to the NEW /api/email-results route (transactional-only email:
 *     just the result permalink, zero promo lines)
 *   - shows a SEPARATE, unchecked-by-default marketing opt-in checkbox
 *     ("Email me when 2026 rates/limits change") — never pre-checked, never
 *     implied by the transactional submit
 *   - fires trackEvent('email_signup', { placement: 'result_card' }) on success
 *
 * Rendering is gated by the SERVER (see EmailMyResultsGate below) on BOTH
 * EMAIL_CAPTURE_ENDPOINT (server env) AND NEXT_PUBLIC_EMAIL_CAPTURE_ENABLED
 * === '1' — this component assumes that gate already passed and never
 * re-checks server-only env itself (it can't; env vars without the
 * NEXT_PUBLIC_ prefix aren't inlined into client bundles).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { shareableUrl } from '@/lib/engine/url-state';

const ENDPOINT = '/api/email-results';
const CALC_TYPE = 'fire_timeline';

type Status = 'idle' | 'submitting' | 'done' | 'error';

interface EmailMyResultsFormProps {
  /** Physical postal address — required, already gated server-side alongside EMAIL_CAPTURE_ENDPOINT. */
  postalAddress: string;
}

export function EmailMyResultsForm({ postalAddress }: EmailMyResultsFormProps) {
  const [email, setEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'submitting') return;
    setStatus('submitting');

    try {
      const shareUrl = shareableUrl(window.location.href);

      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          calc_type: CALC_TYPE,
          share_url: shareUrl,
          marketingOptIn,
        }),
      });
      if (!res.ok) throw new Error(`Capture failed: ${res.status}`);
      setStatus('done');
      trackEvent('email_signup', { placement: 'result_card' });
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground space-y-2">
        <p>
          Thanks! We&apos;ll send a link to this result to{' '}
          <strong className="text-foreground">{email}</strong>.
        </p>
        <p className="text-xs text-muted-foreground border-t border-border pt-2">
          {postalAddress} · You can unsubscribe at any time with one click.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Email my results"
      className="rounded-xl border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <Mail className="h-4 w-4 text-[var(--brand-primary)]" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Email my results</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        We&apos;ll send a link to this exact scenario — no spam, just the permalink.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="flex-1"
        />
        <Button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Send my results'}
        </Button>
      </div>

      <div className="flex items-start gap-2">
        <input
          id="email-results-marketing-optin"
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-[var(--brand-primary)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <label htmlFor="email-results-marketing-optin" className="text-xs text-muted-foreground leading-snug">
          Email me when 2026 rates/limits change (separate from the result link above — unchecked by default)
        </label>
      </div>

      {status === 'error' && (
        <p className="mt-2 text-xs text-destructive">
          Something went wrong. Please try again.
        </p>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground">
        {postalAddress} · You can unsubscribe at any time with one click.
      </p>
    </form>
  );
}
