'use client';

/**
 * "Do Not Sell or Share My Personal Information / Manage Consent" link.
 *
 * Clears the stored consent choice and re-opens the cookie banner so the user
 * can change (or withdraw) their consent — satisfying CCPA "Do Not Sell/Share"
 * and GDPR withdrawal-of-consent requirements. Rendered in the footer.
 *
 * Clearing the stored choice means the next page load re-applies the region
 * default (EEA → denied + banner; US → granted notice), and dispatching the
 * reopen event surfaces the banner immediately in the current session.
 */

import { REOPEN_CONSENT_EVENT } from '@/components/common/cookie-consent-banner';

const CONSENT_KEY = 'firepath_cookie_consent';

export function ManageConsentLink({ className }: { className?: string }) {
  const handleClick = () => {
    try {
      localStorage.removeItem(CONSENT_KEY);
    } catch {
      // localStorage unavailable (private mode etc.) — still reopen the banner.
    }
    window.dispatchEvent(new Event(REOPEN_CONSENT_EVENT));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        'text-left text-sm text-muted-foreground hover:text-foreground transition-colors duration-200'
      }
    >
      Do Not Sell or Share My Personal Information / Manage Consent
    </button>
  );
}
