'use client';

/**
 * FeedbackWidget — footer "Send feedback" launcher + panel.
 *
 * The launcher sits in the footer; the panel renders only after the visitor
 * clicks it, so nothing is pinned to the viewport on first paint (K18).
 * Sends feedback to POST /api/feedback. No DB — the API forwards to an
 * env-configured external collector (FEEDBACK_ENDPOINT).
 *
 * A11y:
 *  - Labeled inputs with aria-describedby on error states.
 *  - Focus moves into panel on open; Esc closes; focus trapped inside.
 *  - aria-live="polite" region for success/error messages.
 *  - Respects prefers-reduced-motion (no transition animations in that mode).
 *  - focus-visible rings preserved throughout.
 *
 * Design:
 *  - Uses only design tokens from globals.css / design/tokens.css.
 *  - NO purple/blue gradients, NO hover:scale-105, NO #000000, NO emoji icons.
 *  - Lucide icons only. On-grid spacing (4px base).
 *  - z-index: 40 for the user-opened panel (above content, below modals at z-50).
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
} from 'react';
import { X, Send, ChevronDown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackType = 'bug' | 'feature' | 'other';
type PanelStatus = 'idle' | 'submitting' | 'success' | 'error';

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE = 'gofirepath.com';
const MAX_MESSAGE = 2000;

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug report' },
  { value: 'feature', label: 'Feature request' },
  { value: 'other', label: 'Other' },
];

// ─── Focus trap ───────────────────────────────────────────────────────────────

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

function trapFocus(container: HTMLElement, e: KeyboardEvent): void {
  const focusable = getFocusable(container);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.key === 'Tab') {
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<PanelStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const firstInputRef = useRef<HTMLSelectElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      // Small delay so the panel is in the DOM and painted.
      requestAnimationFrame(() => {
        firstInputRef.current?.focus();
      });
    } else if (wasOpenRef.current) {
      // Only after a close: focusing the footer launcher on mount would scroll the page to the footer.
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  // Close on Escape; trap Tab inside the panel.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (panelRef.current) {
        trapFocus(panelRef.current, e);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const reset = useCallback(() => {
    setType('bug');
    setMessage('');
    setEmail('');
    setStatus('idle');
    setErrorMsg('');
  }, []);

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    setErrorMsg('');

    const payload = {
      type,
      message: message.trim(),
      email: email.trim(),
      pageUrl:
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '',
      site: SITE,
    };

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Something went wrong. Please try again.');
      }

      setStatus('success');
      // Auto-close after a short delay so the success message is readable.
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 2500);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  const msgRemaining = MAX_MESSAGE - message.length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Footer launcher ─────────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex min-h-11 items-center text-left text-sm text-muted-foreground hover:text-foreground',
          'transition-colors duration-200 motion-reduce:transition-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        ].join(' ')}
      >
        Send feedback
      </button>

      {/* ── Panel ───────────────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Send feedback"
          className={[
            // Position: opened by the visitor, anchored bottom-right.
            'fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm',
            'sm:bottom-6 sm:right-6',
            // Card appearance.
            'rounded-xl border bg-[var(--card)] text-[var(--card-foreground)]',
            'shadow-md',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b">
            <h2 className="text-sm font-semibold">Send feedback</h2>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close feedback panel"
              className={[
                'rounded-md p-1 text-[var(--muted-foreground)]',
                'hover:text-[var(--foreground)] hover:bg-[var(--muted)]',
                'transition-colors duration-150 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
              ].join(' ')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Live status region (success / error) */}
          <div
            ref={liveRef}
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {status === 'success' && 'Thanks — we got your feedback!'}
            {status === 'error' && errorMsg}
          </div>

          {/* Success state */}
          {status === 'success' ? (
            <div className="px-4 py-6 text-center" aria-hidden="false">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Thanks — we got your feedback!
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                This panel will close shortly.
              </p>
            </div>
          ) : (
            /* Form */
            <form
              onSubmit={handleSubmit}
              noValidate
              className="px-4 pb-4 pt-3 flex flex-col gap-3"
            >
              {/* Type select */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="feedback-type"
                  className="text-xs font-medium text-[var(--foreground)]"
                >
                  Type
                </label>
                <div className="relative">
                  <select
                    id="feedback-type"
                    ref={firstInputRef}
                    value={type}
                    onChange={(e) => setType(e.target.value as FeedbackType)}
                    disabled={status === 'submitting'}
                    className={[
                      'w-full appearance-none rounded-md border bg-[var(--background)]',
                      'px-3 py-2 pr-8 text-sm text-[var(--foreground)]',
                      'border-[var(--input)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors duration-150 motion-reduce:transition-none',
                    ].join(' ')}
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Message textarea */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="feedback-message"
                  className="text-xs font-medium text-[var(--foreground)]"
                >
                  Message <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={MAX_MESSAGE}
                  rows={4}
                  placeholder="Describe the bug, feature, or anything else…"
                  disabled={status === 'submitting'}
                  aria-required="true"
                  aria-describedby={
                    status === 'error' && errorMsg
                      ? 'feedback-error feedback-msg-counter'
                      : 'feedback-msg-counter'
                  }
                  aria-invalid={
                    status === 'error' && !message.trim() ? 'true' : 'false'
                  }
                  className={[
                    'w-full resize-none rounded-md border bg-[var(--background)]',
                    'px-3 py-2 text-sm text-[var(--foreground)]',
                    'placeholder:text-[var(--muted-foreground)]',
                    status === 'error' && !message.trim()
                      ? 'border-[var(--destructive)]'
                      : 'border-[var(--input)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-colors duration-150 motion-reduce:transition-none',
                  ].join(' ')}
                />
                <div
                  id="feedback-msg-counter"
                  className="text-right text-xs tabular-nums text-[var(--muted-foreground)]"
                  aria-label={`${msgRemaining} characters remaining`}
                >
                  {msgRemaining.toLocaleString()} remaining
                </div>
              </div>

              {/* Email input */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="feedback-email"
                  className="text-xs font-medium text-[var(--foreground)]"
                >
                  Email{' '}
                  <span className="font-normal text-[var(--muted-foreground)]">
                    (optional — so we can follow up)
                  </span>
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={status === 'submitting'}
                  aria-describedby={
                    status === 'error' && errorMsg ? 'feedback-error' : undefined
                  }
                  className={[
                    'w-full rounded-md border bg-[var(--background)]',
                    'px-3 py-2 text-sm text-[var(--foreground)]',
                    'placeholder:text-[var(--muted-foreground)]',
                    'border-[var(--input)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-colors duration-150 motion-reduce:transition-none',
                  ].join(' ')}
                />
              </div>

              {/* Error message */}
              {status === 'error' && errorMsg && (
                <p
                  id="feedback-error"
                  role="alert"
                  className="text-xs text-[var(--destructive)]"
                >
                  {errorMsg}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={status === 'submitting'}
                  className={[
                    'rounded-md px-3 py-2 text-sm font-medium',
                    'border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]',
                    'hover:bg-[var(--muted)] transition-colors duration-150 motion-reduce:transition-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  ].join(' ')}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={status === 'submitting' || !message.trim()}
                  aria-disabled={status === 'submitting' || !message.trim()}
                  className={[
                    'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium',
                    'bg-[var(--brand-primary)] text-white',
                    'hover:bg-[var(--brand-light)] transition-colors duration-150 motion-reduce:transition-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  ].join(' ')}
                >
                  <Send className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {status === 'submitting' ? 'Sending…' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
