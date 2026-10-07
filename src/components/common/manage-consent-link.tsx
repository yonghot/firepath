'use client';

/**
 * "Do Not Sell or Share My Personal Information / Manage Consent" footer link.
 *
 * EEA/UK/CH: reopens Google's certified consent message (googlefc revocation) on
 * pages that carry Google's runtime (the ad loader pages); on a page without it the
 * visitor is sent to the privacy section, which sits on a page that has it.
 * Elsewhere: opens our cookie notice. No path clears the stored choice;
 * it is replaced only when the visitor clicks Accept or Decline.
 */

import { openConsentChoices, readVisitorCountry } from '@/lib/consent';

export function ManageConsentLink({ className, cmpAvailable }: { className?: string; cmpAvailable: boolean }) {
  const handleClick = () => {
    openConsentChoices(window, readVisitorCountry(), cmpAvailable);
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
