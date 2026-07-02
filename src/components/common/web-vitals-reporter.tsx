'use client';

/**
 * WebVitalsReporter — Core Web Vitals -> GA4 events (부속I T13).
 *
 * Mounted once in the root layout. Fires through the SAME consent-gated
 * trackEvent() pipeline as every other custom event — no new script, no new
 * consent surface. No-op server-side and pre-consent (trackEvent() itself
 * guards on `window.gtag` being a function).
 *
 * metric_value is rounded per web-vitals convention: CLS is a small unitless
 * score, so it's scaled x1000 to an integer (matching the official web-vitals
 * GA4 recipe: https://github.com/GoogleChrome/web-vitals#send-the-results-to-google-analytics)
 * before rounding; every other metric (LCP/INP/FCP/TTFB) is already in
 * milliseconds and only needs rounding.
 */

import { useEffect } from 'react';
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { trackEvent } from '@/lib/analytics';

function reportMetric(metric: Metric): void {
  trackEvent('web_vitals', {
    metric_name: metric.name,
    metric_value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    metric_rating: metric.rating,
    metric_id: metric.id,
  });
}

export function WebVitalsReporter() {
  useEffect(() => {
    onLCP(reportMetric);
    onCLS(reportMetric);
    onINP(reportMetric);
  }, []);

  return null;
}
