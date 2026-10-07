'use client';

/**
 * "Do Not Sell or Share My Personal Information / Manage Consent" footer link.
 *
 * EEA/UK/CH: reopens Google's certified consent message (googlefc revocation).
 * Elsewhere: opens our cookie notice. Neither path clears the stored choice;
 * it is replaced only when the visitor clicks Accept or Decline.
 */

import { openConsentChoices, readVisitorCountry } from '@/lib/consent';

export function ManageConsentLink({ className }: { className?: string }) {
  const handleClick = () => {
    openConsentChoices(window, readVisitorCountry());
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        'flex min-h-11 items-center text-left text-sm text-muted-foreground hover:text-foreground transition-colors duration-200'
      }
    >
      Do Not Sell or Share My Personal Information / Manage Consent
    </button>
  );
}
