# GA4 measurement interpretation notes (부속U U-06)

Read this before drawing conclusions from this site's GA4 property (543449434
"Cost Calculators", shared across all 10 AppFarm sites via the `site`
dimension — see `src/lib/analytics.ts`). Zero code change accompanies this
doc; it is a reading guide for whoever is looking at the numbers.

1. **Sessions-per-user < 1 is expected, not a bug.** It is the signature of
   consent-denied, cookieless measurement pings (GA4's Consent Mode v2
   behavioral modeling sends aggregated, non-session-bound hits when a
   visitor declines analytics consent). Do **not** change the CMP/Consent
   Mode implementation (`cookie-consent-banner.tsx`, `layout.tsx` consent
   defaults) in response to this metric — it is measuring consent posture
   working as designed, not a tracking failure.
2. **Traffic from datacenter cities is bot traffic, not users.** Council
   Bluffs (Google Cloud, Iowa), Ashburn and Boardman (AWS us-east-1 /
   us-west-2) are cloud-provider POPs, not residential ISPs — any city-level
   breakdown dominated by these should be excluded before drawing conclusions
   about real visitor behavior, engagement, or funnel performance. This is a
   reporting/analysis-time filter, not a code or CMP change (Vercel WAF Bot
   Protection, 부속U §6 O-1, is the owner-side mitigation).
3. **The funnel KPI is `calc_input_start` → `calculator_complete` only.**
   `page_view` counts are inflated by the same bot/cookieless noise above;
   treat the input-start→complete ratio (부속U U-01's target: 15%+) as the
   authoritative funnel signal, not raw session or page-view counts.

Source: 부속U_GA4근본진단_개선스펙.md §1 (GA4 ground truth) and §4 U-06.
