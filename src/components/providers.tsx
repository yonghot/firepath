'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { CookieConsentBanner } from '@/components/common/cookie-consent-banner';
import { WebVitalsReporter } from '@/components/common/web-vitals-reporter';
import {
  initTrafficMarker,
  initReferralClassifier,
  initHumanSessionSignal,
} from '@/lib/analytics';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  // Reads ?crew=1 / ?crew=0 once on mount and persists the internal-traffic
  // marker (부속I T02) so owner/crew visits can be excluded from reports via
  // a GA4 data filter without any further code changes.
  useEffect(() => {
    initTrafficMarker();
    // 부속P CODE-07 — first-load AI-referral / embed-referral /
    // community-directory classifier. Pure measurement through the same
    // consent-gated trackEvent() pipeline; no-op until gtag exists.
    initReferralClassifier();
    // 부속W CODE-07 — arms the `human_session` engagement signal: fires once
    // per session on 25% scroll depth or the first real input interaction, so
    // the datacenter noise documented in docs/ga4-measurement-interpretation.md
    // §2 can be separated from real readers in GA4 REPORTING. It never changes
    // what is served to anyone — see the no-cloaking warning in lib/analytics.ts.
    initHumanSessionSignal();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          {children}
          <Toaster />
          {/* Cookie consent banner — gates GA4 analytics until user accepts */}
          <CookieConsentBanner />
          {/* Core Web Vitals -> GA4 events (부속I T13) — flows through the same
              consent-gated trackEvent() pipeline; no-op until gtag exists. */}
          <WebVitalsReporter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
