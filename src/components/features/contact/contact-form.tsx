'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

/** Minimal validation helper — mirrors the server-side rules. */
function validateContactForm(fields: {
  name: string;
  email: string;
  message: string;
}): string | null {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!fields.name.trim() || fields.name.trim().length > 100) {
    return 'Name is required and must be 100 characters or fewer.';
  }
  if (!fields.email.trim() || fields.email.trim().length > 254 || !EMAIL_RE.test(fields.email.trim())) {
    return 'A valid email address is required.';
  }
  if (!fields.message.trim() || fields.message.trim().length > 2000) {
    return 'Message is required and must be 2,000 characters or fewer.';
  }
  return null;
}

/**
 * ContactForm — client-side contact form.
 *
 * POSTs to /api/contact (same-origin, no credentials).
 * Uses aria-live for accessible status announcements.
 */
export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setStatusMessage('');

    const clientError = validateContactForm({ name, email, message });
    if (clientError) {
      setStatus('error');
      setStatusMessage(clientError);
      return;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });

      if (res.ok) {
        setStatus('success');
        setStatusMessage("Your message was sent. We'll get back to you as soon as we can.");
        setName('');
        setEmail('');
        setMessage('');
      } else {
        const data = (await res.json()) as { ok: boolean; error?: string };
        setStatus('error');
        setStatusMessage(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Network error. Please check your connection and try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="contact-name">Name</Label>
        <Input
          id="contact-name"
          type="text"
          autoComplete="name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          disabled={status === 'submitting' || status === 'success'}
          aria-required="true"
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={status === 'submitting' || status === 'success'}
          aria-required="true"
        />
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Message</Label>
        <textarea
          id="contact-message"
          required
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Questions, corrections, or feedback…"
          rows={5}
          disabled={status === 'submitting' || status === 'success'}
          aria-required="true"
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 resize-y min-h-[120px] dark:bg-input/30"
        />
        <p className="text-xs text-muted-foreground text-right">
          {message.length}/2,000
        </p>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={status === 'submitting' || status === 'success'}
        className="w-full sm:w-auto"
      >
        {status === 'submitting' ? (
          'Sending…'
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" aria-hidden="true" />
            Send Message
          </>
        )}
      </Button>

      {/* Status message — aria-live so screen readers announce it */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={status === 'idle' || status === 'submitting' ? 'sr-only' : ''}
      >
        {status === 'success' && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{statusMessage}</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/10">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </form>
  );
}
