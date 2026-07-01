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
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';

// Same-origin capture endpoint (see src/app/api/subscribe/route.ts).
const ENDPOINT = '/api/subscribe';

type Status = 'idle' | 'submitting' | 'done' | 'error';

export function EmailResultCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'submitting') return;
    setStatus('submitting');

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'firepath-result',
          url: typeof window !== 'undefined' ? window.location.href : undefined,
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
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Thanks! We&apos;ll send your FIRE result and the 2026 cost report to{' '}
        <strong className="text-foreground">{email}</strong>.
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
    </form>
  );
}
