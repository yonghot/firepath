'use client';

/**
 * EmailResultCapture — lightweight, non-blocking "email my result" form.
 *
 * Mechanism only. It POSTs to the same-origin "/api/subscribe" route, which
 * validates the email and (until the owner wires storage/an ESP) returns a safe
 * 200 no-op. The component renders even with no backend configured.
 *
 * NO real email-service-provider integration is included — the storage/ESP
 * wiring (and any API keys) is the owner's responsibility (see /api/subscribe).
 *
 * CAN-SPAM: this is a commercial email-collection form, so a physical postal
 * address and an unsubscribe notice must be shown near it. The caller
 * (ResultMonetization) only renders this component when a postal address is
 * configured (see lib/monetization.ts emailCaptureEnabled gate) and passes it
 * in as a required prop — this component has no fallback/default address.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';

// Same-origin capture endpoint (see src/app/api/subscribe/route.ts).
const ENDPOINT = '/api/subscribe';

type Status = 'idle' | 'submitting' | 'done' | 'error';

interface EmailResultCaptureProps {
  /** Physical postal address (CAN-SPAM requirement) — always provided by the caller. */
  postalAddress: string;
}

export function EmailResultCapture({ postalAddress }: EmailResultCaptureProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'submitting') return;
    setStatus('submitting');

    try {
      // PRIVACY: strip the URL hash before sending. On calculator/result pages
      // the hash encodes the user's FIRE scenario (income, net worth, savings
      // rate, expenses — see src/lib/engine/url-state.ts). We only need the
      // page path for context, not the user's financial inputs.
      const url =
        typeof window !== 'undefined' ? window.location.href.split('#')[0] : undefined;
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'firepath-result',
          url,
        }),
      });
      if (!res.ok) throw new Error(`Capture failed: ${res.status}`);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground space-y-2">
        <p>
          Thanks! We&apos;ll send your FIRE result and the 2026 cost report to{' '}
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
      aria-label="Email my FIRE result"
      className="rounded-xl border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <Mail className="h-4 w-4 text-[var(--brand-primary)]" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Email my result</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Get your FIRE numbers and the free 2026 cost report in your inbox.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
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
          {status === 'submitting' ? 'Sending…' : 'Send me the report'}
        </Button>
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
