/**
 * Global type augmentations for browser globals used by FIREPath.
 */

declare global {
  interface Window {
    /**
     * Google Analytics 4 / gtag.js data layer array.
     * Populated when the user accepts cookies and GA4 is initialized.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer: any[];

    /**
     * Google Tag Manager / gtag function.
     * Only available after the user accepts analytics cookies.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag: (...args: any[]) => void;

    /**
     * Google AdSense push queue. Populated after the user accepts cookies and
     * the AdSense loader script is injected; AdSlot calls `.push({})` to fill
     * each <ins> unit. (No NEXT_PUBLIC_ADSENSE_CLIENT_ID → never present.)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adsbygoogle: any[];
  }
}

export {};
