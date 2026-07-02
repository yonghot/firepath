/**
 * EmailMyResultsGate — server-side env gate for the T17 "Email my results" form.
 *
 * `EMAIL_CAPTURE_ENDPOINT` is a server-only env var (no NEXT_PUBLIC_ prefix,
 * so it is NEVER inlined into the client bundle) — it can only be read here,
 * in a plain (non-'use client') server component, and passed down as a
 * boolean. The form itself renders ONLY when ALL of the following are set:
 *
 *   - EMAIL_CAPTURE_ENDPOINT           (server — where submissions forward to)
 *   - NEXT_PUBLIC_EMAIL_CAPTURE_ENABLED === '1'  (explicit owner opt-in)
 *   - NEXT_PUBLIC_POSTAL_ADDRESS       (existing CAN-SPAM gate from the
 *                                        compliance workstream — reused, not
 *                                        duplicated; same var EmailResultCapture
 *                                        already requires)
 *
 * With any of these unset, this renders null and the form is ABSENT from the
 * DOM entirely (not just hidden) — see email-my-results-gate.test.ts.
 */

import { EmailMyResultsForm } from './email-my-results-form';

export function EmailMyResultsGate() {
  const endpointSet = Boolean(process.env.EMAIL_CAPTURE_ENDPOINT?.trim());
  const enabled = process.env.NEXT_PUBLIC_EMAIL_CAPTURE_ENABLED?.trim() === '1';
  const postalAddress = process.env.NEXT_PUBLIC_POSTAL_ADDRESS?.trim() || null;

  if (!endpointSet || !enabled || !postalAddress) return null;

  return <EmailMyResultsForm postalAddress={postalAddress} />;
}
