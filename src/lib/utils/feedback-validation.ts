/**
 * feedback-validation.ts — Pure validation helpers for /api/feedback.
 *
 * Extracted into a separate module so the same logic can be unit-tested
 * independently of the Next.js request/response cycle.
 */

export const FEEDBACK_TYPES = ['bug', 'feature', 'other'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

// Conservative RFC-5322-lite email check — good enough for capture validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_MESSAGE = 2000;
const MAX_EMAIL = 254;
const MAX_PAGE_URL = 2000;
const MAX_SITE = 200;

export interface FeedbackPayload {
  type: FeedbackType;
  message: string;
  email: string; // optional — empty string when absent
  pageUrl: string;
  site: string;
}

export type ValidationResult =
  | { ok: true; payload: FeedbackPayload }
  | { ok: false; error: string };

/**
 * Validates and normalises raw feedback input from an untrusted JSON body.
 * Returns either a validated `FeedbackPayload` or an error string.
 */
export function validateFeedback(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }

  const obj = raw as Record<string, unknown>;

  // --- type ---
  const typeRaw = typeof obj.type === 'string' ? obj.type.trim().toLowerCase() : '';
  if (!FEEDBACK_TYPES.includes(typeRaw as FeedbackType)) {
    return {
      ok: false,
      error: `type must be one of: ${FEEDBACK_TYPES.join(', ')}.`,
    };
  }
  const type = typeRaw as FeedbackType;

  // --- message (required) ---
  const message = typeof obj.message === 'string' ? obj.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE) {
    return {
      ok: false,
      error: `message is required and must be ${MAX_MESSAGE} characters or fewer.`,
    };
  }

  // --- email (optional) ---
  const emailRaw = typeof obj.email === 'string' ? obj.email.trim() : '';
  if (emailRaw) {
    if (emailRaw.length > MAX_EMAIL || !EMAIL_RE.test(emailRaw)) {
      return { ok: false, error: 'email must be a valid email address (≤254 chars).' };
    }
  }
  const email = emailRaw;

  // --- pageUrl (optional string, capped) ---
  const pageUrl =
    typeof obj.pageUrl === 'string' ? obj.pageUrl.trim().slice(0, MAX_PAGE_URL) : '';

  // --- site (optional string, capped) ---
  const site =
    typeof obj.site === 'string' ? obj.site.trim().slice(0, MAX_SITE) : '';

  return {
    ok: true,
    payload: { type, message, email, pageUrl, site },
  };
}
