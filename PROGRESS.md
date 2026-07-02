# FIREPath — Development Progress Log

## Phase-1 Handoff Note — 2026-06-29

### What was done

Phase 1 (test augmentation only — no source changes, no commits) added 51 new tests to the existing suite.

**Before:** 8 test files · 53 tests (all passing)
**After:** 9 test files · 104 tests (all passing)
**New file:** `src/lib/engine/__tests__/fire-engine-augmented.test.ts` — 51 tests added

Coverage note: Vitest coverage was not instrumented in this run (no `@vitest/coverage-v8` config); the before/after numbers above reflect test-count only. Phase 2 should enable coverage reporting to get a baseline %.

---

### Tests added by type

| Area | Count | Description |
|------|-------|-------------|
| (d) Multipliers map — constant value pins | 7 | Each of lean/regular/fat/barista locked to exact value; ordering; coast absence; key count |
| (a) FIRE target formula — regression guards | 11 | Hard-coded expected values at SWR=0.04 for all 4 types (600k/1M/1.5M/500k); doubling on halved SWR; 0.06 boundary; zero-expenses edge; large-value overflow safety |
| (a) Integration regression guards | 5 | Same guarantees via `calculateFIRE` → `targetAmount` field; multiplier ratios (lean=0.6×, fat=1.5×, barista=0.5× of regular) |
| (b) Fisher real-return formula | 9 | Isolated unit tests for `(1+r)/(1+i)-1`; normal cases (7%/3%, 10%/5%); boundary (zero inflation, zero nominal, equal rates); negative real return; integration into timeline year-1 and year-2 |
| (c) Simulation endpoint & "80+" labeling | 18 | MAX_SIMULATION_AGE=80 pinned; timeline starts/ends correctly; length formula; null reachAge (the "80+" display sentinel) for unreachable targets; null yearsToReach; age-79 boundary; age-80 start; year field progression; first-entry zero savings/growth; annualSavings calculation |
| Combined/boundary | 4 | Zero savings rate pure compound; low SWR 40× rule; high savings all-types-before-50; final hard-coded 4-type regression table |

---

### Key regression guards locked in (2026-06-29 credibility corrections)

1. `FIRE_MULTIPLIERS.lean === 0.6`, `.regular === 1.0`, `.fat === 1.5`, `.barista === 0.5`
2. Regular target at SWR=0.04 MUST equal `25 × annualExpenses` (the "4% rule" identity)
3. All four targets at expenses=40000, SWR=0.04: lean=600k, regular=1M, fat=1.5M, barista=500k
4. Fisher: `(1+0.07)/(1+0.03)-1 ≈ 0.038834951456` (pinned to 10 decimal places)
5. `MAX_SIMULATION_AGE === 80` (constant value pinned)
6. `reachAge === null` and `yearsToReach === null` when no target is reached by age 80

---

### No product bugs found in Phase 1

All 51 new assertions passed green on the first run. No source logic needed to be skipped or marked todo.

---

### Files in scope for Phase 2

The engine layer is now well-guarded. Phase 2 should focus on:

- `src/lib/engine/url-state.ts` — no tests exist yet
- `src/lib/services/` and `src/lib/repositories/` — integration tests (with Supabase mocked)
- `src/hooks/` — React hook tests (may need `@testing-library/react`)
- `src/components/features/` — component-level tests (UI logic, slider interactions)
- Enable `@vitest/coverage-v8` to get a coverage baseline before Phase 2 work begins

---

판단 필요 — Inter font is deliberate for `tabular-nums`; the `\bInter\b` pattern is exempted from the anti-slop PostToolUse hook.

---

## Phase-7 Build Note — 2026-07-01

### What was done

Phase 7 (no-checkout unified monetization stack) implemented the full ENV-gated monetization layer without adding Stripe/checkout code.

**Before:** 16 test files · 202 tests (all passing)
**After:** 17 test files · 255 tests (all passing, +53 new)
**New files (4):**
- `src/lib/monetization.ts` — central config parser; reads all monetization env vars; returns typed config with null for absent vars; parseFeaturedPartners (safe JSON parsing); resolveAdProvider (single-provider selector); resolvePrimaryCtaType; VERTICAL_DEFAULT_CTA_TYPE=cpl
- `src/components/monetization/AdProvider.tsx` — single programmatic selector: adsense (reuses existing AdSlot) | ezoic (Script afterInteractive via NEXT_PUBLIC_EZOIC_SITE_ID) | raptive (Script via NEXT_PUBLIC_RAPTIVE_SITE_ID) | none; NEVER two providers
- `src/components/monetization/ResultMonetization.tsx` — 5-block stack below result output: (a) PrimaryIntentCTA call/cpl/affiliate/none, (b) DisplaySlot via AdProvider, (c) FTC disclosure + FeaturedPartnerTable, (d) SponsorSlot with CPA backfill, (e) EmailCapture reusing existing component
- `src/lib/__tests__/monetization.test.ts` — 53 unit tests

**Modified files (5):**
- `src/app/(main)/result/page.tsx` — replaced inline AdSlot+AdvisorCta with `<ResultMonetization isPremium={isPremium} />`
- `src/app/(main)/page.tsx` — replaced inline EmailResultCapture+AdSlot with `<ResultMonetization isPremium={isPremium} />`
- `src/app/ads.txt/route.ts` — added 301-redirect support via NEXT_PUBLIC_ADSTXT_REDIRECT_URL; falls back to existing AdSense line when unset
- `.env.example` — documented all 18 monetization env keys with placeholder examples
- `feature_list.json` — F023 added; version bumped to 0.5.0

### Gate results (all green)

```
pnpm lint       — PASS (0 errors / 8 pre-existing warnings)
pnpm typecheck  — PASS
pnpm test       — 255 tests, all passed (+53 new monetization tests)
pnpm build      — PASS (29 pages, ads.txt now dynamic for redirect support)
```

### Key design decisions

1. **Single-provider enforcement** — `resolveAdProvider()` returns exactly one discriminant string; AdProvider uses an if/else chain that exits at the first match. Two providers cannot load simultaneously by construction.
2. **Null-render law** — every monetization block returns `null` when its required env var is absent. No empty containers, no "coming soon" text.
3. **VERTICAL_DEFAULT_CTA_TYPE = 'cpl'** — personal-finance/FIRE default is CPL (financial advisor lead form). Overrideable via NEXT_PUBLIC_PRIMARY_CTA_TYPE. TCPA liability = 0 because the lead form lives on the advertiser's domain.
4. **AdSense reuse** — AdProvider with provider='adsense' delegates to the existing `AdSlot` component. The loader already lives in `layout.tsx` `<head>`; no second loader is added.
5. **FTC disclosure** — inline plain-text ABOVE the featured partner table, never in the footer only.
6. **CWV compliance** — DisplaySlot wrapper reserves `min-h-[100px] md:min-h-[280px]`; below-fold lazy-load handled by AdSlot's IntersectionObserver. LCP surface (result cards) is never above the monetization section.

---

## Phase-3 Handoff Note — 2026-06-29

### What was done

Phase 3 (cleanup/fix pass) corrected all 6 Majors and 3 of 9 Minors from the Phase-2 review brief.

**Before:** 10 test files · 104 tests (all passing)  
**After:** 11 test files · 117 tests (all passing)  
**New files:** `src/lib/engine/__tests__/url-state.test.ts` (9 tests), `src/lib/utils/json-ld.ts`

### Fixes summary

| # | Type | Issue | Fix |
|---|------|-------|-----|
| 1 | MAJOR | Coast FIRE monthly income 3.8× understated | Use `targets.regular` as income base in `buildResult` for coast |
| 2 | MAJOR | SWR=0 via URL → Infinity/NaN rendered | `decodeState` clamps all values to SLIDER_CONFIGS bounds |
| 3 | MAJOR | JSON-LD stored XSS via `</script>` | `safeJsonLd()` helper escapes `<>& → <>&` |
| 4 | MAJOR | No HTTP security headers | Added `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` in `next.config.ts` |
| 5 | MAJOR | Desktop sign-out icon-only button missing aria-label | Added `aria-label="Sign out"` |
| 6 | MINOR | Monte Carlo medianReachAge upper-median off-by-one | Use `Math.floor((n-1)/2)` for lower-median |
| 7 | MINOR | `sources-references.tsx` list role dropped in Safari | Added `role="list"` to `<ol>` |
| 8 | MINOR | URL state decoding bounds (same as fix #2) | Covered by MAJOR fix #2 |

### Gate results (all green)

```
pnpm lint       — PASS
pnpm typecheck  — PASS
pnpm test       — 117 tests, all passed
pnpm build      — PASS (23 pages)
```

### Minors deferred

- `currentAge > retirementAge` cross-field validation in URL decoding
- Portfolio optimizer Coast `yearsToFIRE` return-assumption inconsistency
- Hardcoded admin credentials in `scripts/seed.ts`
- Dead SubscriptionRepository methods
- `forbidden.md` baseline note update

See `docs/reviews/2026-06-29-quality-pipeline.md` for full details.

---

## Phase-4 Build Note — 2026-06-30

### What was done

Phase 4 (A-grade SAFE SUBSET) added 3 new features: FIRE Types sub-calculator page, Healthcare Bridge Estimator, and env-gated Affiliate CTA infrastructure.

**Before:** 11 test files · 117 tests (all passing)
**After:** 12 test files · 136 tests (all passing, +19 new)
**New files (7):**
- `src/lib/engine/healthcare-bridge.ts` — pure bridge-cost calculator (validated, no ACA fabrication)
- `src/lib/engine/__tests__/healthcare-bridge.test.ts` — 19 tests (normal + boundary + edge)
- `src/app/(main)/fire-types/page.tsx` — FIRE Types sub-calculator page (static, engine-backed, JSON-LD)
- `src/app/(main)/healthcare-bridge/page.tsx` — Healthcare Bridge Estimator page (static, JSON-LD)
- `src/components/features/healthcare/healthcare-bridge-calculator.tsx` — client component
- `src/components/common/advisor-cta.tsx` — env-gated affiliate CTA (returns null when unset)
**Modified files (3):**
- `src/app/(main)/result/page.tsx` — AdvisorCta added
- `src/app/sitemap.ts` — /fire-types and /healthcare-bridge added
- `feature_list.json` — F018/F019/F020 added; version bumped to 0.3.0

### Gate results (all green)

```
pnpm lint       — PASS (0 errors / 0 warnings)
pnpm typecheck  — PASS
pnpm test       — 136 tests, all passed
pnpm build      — PASS (25 pages, +2: /fire-types, /healthcare-bridge both static)
```

### Key design decisions

1. **FIRE Types page** uses `calculateFIRE(DEFAULT_INPUT)` server-side so all numbers are real engine output — no fabricated figures. Inline methodology note + SoftwareApplication JSON-LD.
2. **Healthcare Bridge** pure function rejects NaN/negative/Infinity/out-of-range. Medicare eligibility hardcoded to 65 (SSA §226). ACA subsidies explicitly NOT modeled — user must supply their own premium via healthcare.gov.
3. **AdvisorCta** returns `null` when `NEXT_PUBLIC_ADVISOR_CTA_URL` is unset. `rel="noopener noreferrer sponsored"` for transparency. No hardcoded affiliate URLs.
4. Coast monthly income correctly uses `targets.regular` as income base (Phase-3 fix confirmed, tested).

---

## Phase-5 Build Note — 2026-06-30

### What was done

Phase 5 (AdSense-approval strengthening) added a Contact page, About page, API contact route, and updated the footer.

**Before:** 12 test files · 136 tests (all passing)
**After:** 14 test files · 166 tests (all passing, +30 new)
**New files (6):**
- `src/app/api/contact/route.ts` — POST handler (validates name/email/message; safe no-op; mirrors /api/subscribe pattern)
- `src/app/api/contact/__tests__/route.test.ts` — 15 route tests (valid, missing fields, oversized, invalid email, malformed JSON)
- `src/app/(main)/contact/page.tsx` — Contact page (form + optional env-gated email, disclaimer)
- `src/app/(main)/about/page.tsx` — About page (publisher identity, editorial standards, E-E-A-T signals)
- `src/components/features/contact/contact-form.tsx` — client form component (aria-live, focus-visible, labeled inputs)
- `src/components/features/contact/__tests__/contact-form-validation.test.ts` — 13 client-validation tests

**Modified files (3):**
- `src/components/layouts/footer.tsx` — Company section added with About and Contact links
- `feature_list.json` — F021 added
- `PROGRESS.md` — this entry

### Gate results (all green)

```
pnpm lint       — PASS
pnpm typecheck  — PASS
pnpm test       — 164 tests, all passed
pnpm build      — PASS (28 pages, +2: /contact, /about both static)
```

### Key design decisions

1. **No fabricated contact details** — contact email rendered ONLY when `NEXT_PUBLIC_CONTACT_EMAIL` env var is set; otherwise only the form is shown.
2. **Safe no-op API route** — `/api/contact` validates all fields (name ≤100 chars, RFC-5322-lite email ≤254 chars, message ≤2000 chars) and returns `{ ok: true }` without any storage or ESP. Matches `/api/subscribe` pattern exactly.
3. **E-E-A-T signals on /about** — editorial standards (transparent math, cited sources, honest limits), affiliate disclosure, educational purpose disclaimer, links to /methodology, /contact, /privacy.
4. **A11y** — textarea styled to match shadcn Input, `aria-live="polite" aria-atomic="true"` on status div, all inputs labeled via `<Label>` / `htmlFor`, `focus-visible` ring preserved, semantic `<h1>` on both pages.

---

## Phase-6 Build Note — 2026-07-01

### What was done

Phase 6 added a site-wide floating Feedback widget so users can report bugs / request features.

**Before:** 14 test files · 166 tests (all passing)
**After:** 16 test files · 202 tests (all passing, +36 new)
**New files (5):**
- `src/lib/utils/feedback-validation.ts` — pure validation helper (testable independently of Next.js)
- `src/lib/utils/__tests__/feedback-validation.test.ts` — 22 unit tests (valid/invalid type, message, email, non-object bodies)
- `src/app/api/feedback/route.ts` — POST handler (nodejs runtime, force-dynamic, 10 KB body cap, env-gated FEEDBACK_ENDPOINT forwarding, 5s timeout, failure-tolerant)
- `src/app/api/feedback/__tests__/route.test.ts` — 14 route tests (valid, bad type, empty/oversized message, invalid email, malformed JSON, no-op when unset, called when set, failure still returns 200)
- `src/components/common/feedback-widget.tsx` — 'use client' floating FAB + panel component

**Modified files (3):**
- `src/app/layout.tsx` — `<FeedbackWidget />` mounted inside `<body>` after `<Providers>` (site-wide)
- `feature_list.json` — F022 added; version bumped to 0.4.0
- `PROGRESS.md` — this entry

### Gate results (all green)

```
pnpm lint       — PASS
pnpm typecheck  — PASS
pnpm test       — 201 tests, all passed
pnpm build      — PASS
```

### Key design decisions

1. **Validation layer** — pure helper `feedback-validation.ts` extracted so unit tests need no HTTP layer. Route composes it.
2. **API is safe no-op by default** — when `FEEDBACK_ENDPOINT` is unset, the route validates, logs nothing, and returns `{ ok: true }`. Wiring a collector (Google Sheets Apps Script, Formspree, etc.) is the owner's responsibility.
3. **External fetch failure is non-blocking** — on network / timeout error the route catches, `console.error`s, and still returns 200. User experience is never degraded by a third-party outage.
4. **No DB, no Supabase** — pure HTTP forward pattern; no schema migrations needed.
5. **Widget z-index = 40** — above content, below modals (z-50), consistent with cookie banner.
6. **A11y** — focus moves into panel on open; Tab trapped inside; Esc closes; `aria-live="polite"` on status region; `aria-invalid` + `aria-describedby` on error states; Lucide icons only (no emoji); all inputs labeled; `focus-visible` rings preserved; `prefers-reduced-motion` respected via `motion-reduce:transition-none`.
7. **Design tokens only** — `--brand-primary`, `--brand-light`, `--foreground`, `--muted-foreground`, `--card`, `--border`, `--input`, `--ring`, `--destructive`, `--muted`, `--background`. No hardcoded colors; no purple/blue gradients; no `hover:scale-*`; no `#000000`.

---

## Phase-7 Build Note — 2026-07-02 (Legal Risk Mitigation — P0)

### What was done

Implemented the P0 legal-risk mitigations from the compliance risk report (부속G). Investment/tax disclaimer variant: "not investment, tax, or financial advice ... not an investment adviser (Investment Advisers Act) ... projections are hypothetical." This is risk-mitigation code/copy, not legal advice; every legal document edited carries a DRAFT/attorney-review header.

**New files (4):**
- `src/components/compliance/ResultDisclaimer.tsx` — layered disclaimer placed directly adjacent to RESULT output (never footer-only); shows "Figures last updated" date + a `/methodology` source link pulled from `lib/figures.ts`.
- `src/components/compliance/TermsGate.tsx` — clickwrap consent gate: unchecked checkbox by default, `/terms` link, localStorage-persisted ISO timestamp, non-dismissable overlay scoped to the RESULTS panel only (sliders/inputs stay interactive underneath).
- `src/components/compliance/AffiliateDisclosure.tsx` — standard FTC 16 CFR 255 line ("We may earn a commission if you use links on this page. This does not affect the figures shown."), reused across every affiliate/lead CTA.
- `src/lib/figures.ts` — central `{lastVerified, source}` registry for the core FIRE-engine assumption defaults (expectedReturn 7%, inflation 3%, SWR 4%, Monte Carlo volatility 15% — all dated 2026-06-29, sourced from the already-verified `/methodology` citations) plus an `UNSOURCED_FIGURES` list for the 4 portfolio-optimizer asset-class return/volatility pairs and the correlation matrix, which have no citation in repo docs — listed honestly, not fabricated.

**Modified files (9):**
- `src/components/features/calculator/calculator-client.tsx` — results (chart + result cards) wrapped in `<TermsGate>`; `ResultDisclaimer` placed inside, adjacent to output; headline "Your FIRE Numbers" → "This Scenario's FIRE Numbers".
- `src/components/features/calculator/result-client.tsx` — same TermsGate + ResultDisclaimer treatment on `/result`; headline "Your FIRE Results" → "This Scenario's FIRE Results".
- `src/components/features/healthcare/healthcare-bridge-calculator.tsx` — button-triggered calculator, so gated via a required checkbox next to the "Estimate Bridge Cost" submit button (disabled until checked) instead of an overlay; added the required distinct line "Tax and healthcare rules change frequently — verify current rules with a qualified professional." near both result branches; "You plan to retire..." → "This scenario retires..." (impersonal).
- `src/components/common/advisor-cta.tsx` / `src/components/monetization/ResultMonetization.tsx` — "Sponsored link — not financial advice" → "Advertisement — not financial advice"; "Consider a low-cost robo-advisor to automate your investment strategy" → neutral "is one option for automating an investment strategy"; `AffiliateDisclosure` inserted immediately above every outbound CTA link (CPL, affiliate, AdvisorCta, FeaturedPartnerTable).
- `src/app/(main)/terms/page.tsx` — DRAFT/attorney-review header comment; new Section 14 "Binding Arbitration and Class Action Waiver" (individual arbitration, class-action + jury-trial waiver, 30-day opt-out, small-claims/IP carve-outs); sections renumbered 13→16; last-updated bumped to July 2, 2026.
- `src/app/(main)/privacy/page.tsx` — DRAFT/attorney-review header comment; Section 2f ("Locally Computed Data") tightened to explicitly state no calculator input or analytics event ever carries FIRE scenario values; last-updated bumped.
- `src/components/common/cookie-consent-banner.tsx` — GA4 `gtag('config', ...)` now passes an explicit hash-stripped `page_location`. The URL hash on `/` and `/result` encodes the user's FIRE scenario (income, net worth, savings rate, expenses — see `lib/engine/url-state.ts` `KEY_MAP`) and would otherwise be picked up by GA4's default `page_location`/`page_referrer`.
- `src/components/common/email-result-capture.tsx` — strips the URL hash before POSTing to `/api/subscribe` (same reasoning); now requires and displays a `postalAddress` prop plus a "You can unsubscribe at any time with one click." line (CAN-SPAM).
- `src/lib/monetization.ts` — `emailCaptureEnabled` now requires **both** `NEXT_PUBLIC_EMAIL_CAPTURE=on` **and** `NEXT_PUBLIC_POSTAL_ADDRESS` set; added `postalAddress` to `MonetizationConfig`. `.env.example` documents the new var.

### Copy audit (prescriptive-language ban list)

Grepped `src/` for "you should", "we recommend", "guaranteed", "will save you", "you qualify", and promissory "accurate" (outside disclaimer contexts). **Zero replacements required** — the existing copy was already hedged/impersonal (FAQ answers say "no calculator can predict the future"; the methodology page cites 19 verified sources; no provider ranking exists to require a compensation-basis disclosure). The only copy changes made were the 2 RESULT-headline impersonal-framing fixes and the CTA-phrasing tightening listed above.

### Privacy/pixel audit (C1/C2)

Verified via grep: no `fetch`/POST anywhere sends calculator input values except the existing, already-disclosed opt-in "Save calculation" flow (`/api/calculations`, authenticated, documented in Privacy §2b). No `gtag('event', ...)` call anywhere in the codebase carries calculator inputs. The one real finding: GA4's default `page_location` would have picked up the FIRE-scenario-encoding URL hash — fixed by passing an explicit stripped `page_location`. Cookie-consent CMP and AdSense loader were **not** touched (out of scope per mandate).

### Gate results (all green)

```
pnpm lint       — PASS (0 errors, 8 pre-existing warnings unrelated to this change)
pnpm typecheck  — PASS
pnpm test       — 258 tests, all passed (+7 new: postal-address CAN-SPAM gate coverage in monetization.test.ts)
pnpm build      — PASS (27 pages, no static→dynamic regressions)
```

### Explicitly out of scope / unsourced

- `UNSOURCED_FIGURES` in `lib/figures.ts`: US Stocks (10%/15%), Int'l Stocks (8%/17%), Bonds (4%/5%), Cash (2%/1%) return/volatility defaults and the asset-class correlation matrix in `src/lib/engine/portfolio-optimizer.ts` (premium-only Portfolio Optimization feature) — no citation found in repo docs/tests/comments. Not fabricated; flagged for owner/attorney follow-up.
- Cookie-consent banner / CMP UI and the AdSense loader script were not redesigned or touched, per mandate.
- `/terms` Section 14 leaves the arbitration administrator name (AAA/JAMS) and Section 13's specific venue/state as OPERATOR NOTE placeholders — cannot be filled without the owner's actual entity/jurisdiction.
- All `/terms` and `/privacy` edits require licensed US attorney review before reliance (see DRAFT header on both files).

## Phase-8 Build Note — 2026-07-02 (GA4 Revenue-Metrics Wave P0 — 부속I T01–T05)

Implemented the P0 tasks (T01→T02→T03→T04→T05, dependency-ordered) from the GA4 measurement-improvement spec (부속I). Goal: kill bot/preview noise polluting the shared GA4 property, then instrument the calculator funnel + link/embed events so key-event and revenue-attribution metrics exist once real traffic arrives. No owner-console tasks (O01–O11) were attempted; no CMP/Consent Mode redesign; all events flow through the existing consent-gated gtag pipeline.

**New files (4):**
- `src/lib/analytics.ts` — shared analytics module: `SITE_ID` (env `NEXT_PUBLIC_SITE_ID`, fallback `'firepath'`), `IS_SENSITIVE_SITE = false`, the `EventName` string-literal union (`calc_input_start | calculator_complete | related_click | outbound_click | result_share | embed_loaded | state_restored | web_vitals | email_signup`), `trackEvent()` (no-op on server / when `window.gtag` isn't a function; merges `{site}` + `traffic_type:'internal'` (crew marker) + `debug_mode:true` (`NEXT_PUBLIC_GA_DEBUG=1`); caps at 25 params), and `initTrafficMarker()` (`?crew=1`/`?crew=0` → localStorage `cc_traffic_type` + `gtag('set', {traffic_type:'internal'})`).
- `src/app/embed/embed-attribution.tsx` — client component: fires `embed_loaded` once per widget mount (`host_domain` from `document.referrer`) and renders the "Powered by FIREPath" backlink with the T04-compliant link policy (see below). Extracted out of `embed/page.tsx` so that page can stay a plain server component apart from this one client leaf.
- `src/lib/__tests__/analytics.test.ts` — 10 unit tests: `trackEvent` no-op (no `window` / no `gtag` function), param merge (`site`), `traffic_type:'internal'` gating on the crew marker, `debug_mode` gating on `NEXT_PUBLIC_GA_DEBUG`, localStorage-failure resilience; `initTrafficMarker` `?crew=1`/`?crew=0`/no-param behavior. No jsdom/happy-dom dependency exists in this repo (vitest runs in the default `node` environment) — tests install a minimal in-file `window`/`localStorage` stub rather than adding a new DOM-library dependency for one module.
- `src/stores/__tests__/calculator.store.test.ts` — 6 unit tests covering the new `interactionCount` field: increments on `updateInput()`, does NOT increment on `setInput()` (URL-hash/shared-result hydration) or `resetToDefaults()` — this is the data-layer half of the T03 `hasUserInteracted` guard.

**Modified files (13):**
- `src/components/common/cookie-consent-banner.tsx` (**T01**) — `initGA()` now gates the `gtag.js` script injection behind `isCanonicalProductionHost()` (`NEXT_PUBLIC_VERCEL_ENV === 'production'` AND `window.location.hostname` matches `NEXT_PUBLIC_APP_URL`'s host, with/without `www.`) **OR** `NEXT_PUBLIC_GA_DEBUG === '1'` (Preview-only debug path, which also tags `gtag('set', {traffic_type:'internal'})` and `debug_mode:true` on the config call). Wraps ONLY the script-injection step that already runs post-consent — Consent Mode v2 defaults/updates are untouched. Also fixed a latent (pre-existing, previously masked by incremental-build caching) `tsc` strict-null error: the nested `gtag` closure now captures `dataLayer` by reference instead of re-reading `window.dataLayer` inside the closure body, since TS narrowing doesn't cross function boundaries.
- `next.config.ts` — added `env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV }` so Vercel's server-only `VERCEL_ENV` is mirrored into the client-visible var T01's hostname gate reads, with no owner action required on Vercel.
- `.env.example` — documented `NEXT_PUBLIC_SITE_ID`, `NEXT_PUBLIC_VERCEL_ENV` (auto-set via next.config.ts — do not set manually), `NEXT_PUBLIC_GA_DEBUG`.
- `src/components/providers.tsx` (**T02**) — calls `initTrafficMarker()` once on mount.
- `src/stores/calculator.store.ts` (**T03**) — added `interactionCount`, incremented only by `updateInput()` (the sole real-user-input entry point for the slider-live calculator), never by `setInput()`/`resetToDefaults()`.
- `src/components/features/calculator/calculator-client.tsx` (**T03**) — `calc_type = 'fire_timeline'`; watches `interactionCount` via a ref-guarded effect: fires `calc_input_start` once on the first real change, then debounced (≤1/2s) `calculator_complete` with a coarse `result_bucket` (Regular-FIRE target amount bucketed into `under_500k|500k_1m|1m_2.5m|over_2.5m`, since FIREPath isn't `IS_SENSITIVE_SITE`). Mounted on both `/` and `/embed` (shared component), so both surfaces get funnel coverage for free.
- `src/components/features/healthcare/healthcare-bridge-calculator.tsx` (**T03**, button-triggered surface) — `calc_type = 'healthcare_bridge'`; `calc_input_start` fires on the first field edit; `calculator_complete` fires on submit ONLY when `calculateHealthcareBridge()` returns `ok:true` (a validation-error list is not a "result"), with a `result_bucket` (`under_10k|10k_50k|50k_250k|over_250k` of `totalEstimatedCost`) omitted when `noGapNeeded`.
- `src/components/common/related-calculators.tsx` (**T04**) — converted to `'use client'`; every sibling-site click fires `outbound_click {link_domain, link_type:'crosslink'}` before the (unprevented) navigation.
- `src/components/common/advisor-cta.tsx` (**T04**) — converted to `'use client'`; CTA click fires `outbound_click {link_domain, link_type:'affiliate'}`.
- `src/components/common/sources-references.tsx` (**T04**) — converted to `'use client'`; citation-link clicks fire `outbound_click {link_domain, link_type:'citation'}`.
- `src/app/embed/page.tsx` (**T04**) — now renders the extracted `EmbedAttribution` client component instead of an inline `<a>`.
- `src/components/common/embed-snippet.tsx` (**T04 link-policy audit**) — the copy-paste "Powered by FIREPath" backlink (rendered in the *embedder's own page HTML*, per the existing SEO-attribution design) now carries `rel="nofollow sponsored noopener"` (was `rel="noopener"` — a followed widget backlink is a documented Google manual-action vector), brand-name-only anchor text ("Powered by FIREPath", description text moved outside the `<a>`), and `utm_source=embed&utm_medium=widget&utm_campaign=embed` on the href. The live `/embed` iframe's own attribution link (`embed-attribution.tsx`) additionally UTM-tags `utm_campaign` with the actual referring host domain where `document.referrer` is available.
- `src/components/common/ad-slot.tsx` (**T05**) — SPA re-init fix: `usePathname()` drives a `key={`${slot}-${pathname}`}` on the `<ins>` element (forces React to unmount/remount just that DOM node per route, since AdSense stamps `data-ad-status` on the specific node — the `<aside>` wrapper and component instance stay mounted across navigations, consistent with how `key` reconciliation actually works). The lazy-load `inView` gate and `pushedForPath` ref are both re-armed on `pathname` change (deferred via `queueMicrotask`, matching the existing `CookieConsentBanner`/`TermsGate` pattern, to avoid a `react-hooks/set-state-in-effect` cascading-render lint error). `pushFill()` guards on `data-ad-status` already being set (never double-pushes) and the push effect does exactly one 750ms retry — no polling loop, no timer-based refresh. Reserved `min-h-[100px] md:min-h-[280px]` unchanged.

### Explicitly out of scope for this wave

- T06–T17 (P1/P2): RelatedCalculators-at-result-moment, hub/breadcrumb completion, comparison chains, thin-page triage, meta standardization, E-E-A-T layer beyond what already exists, instant-default-result audit, Web Vitals events + ad repositioning, IndexNow, shareable-result UTM work beyond T04's embed audit, localStorage persistence, email-capture event wiring. Not attempted this wave.
- Owner console tasks O01–O11 (AdSense↔GA4 linking, GA4 key-event marking, custom-dimension registration, Enhanced Measurement config, internal-traffic filter activation, Vercel WAF Bot Protection, GA4 Explore reports, AdSense vignette/anchor settings, GSC/Bing verification, cross-domain measurement, ESP setup) — not attempted, per mandate. See 부속I §5 for the full checklist to hand to the owner.
- `result_bucket` bucketing thresholds (FIRE target amount / healthcare bridge cost) are a reasonable coarse-bucket design choice made this wave, not a value specified verbatim in 부속I — flagged for owner review if different bucket boundaries are preferred.
- DebugView verification itself (a preview deploy with `NEXT_PUBLIC_GA_DEBUG=1`, confirming each event fires with correct params) requires an actual Vercel Preview deployment and GA4 dashboard access, which this session does not have. See DebugView checklist in the structured report.

### Gate results (all green)

```
pnpm lint       — PASS (0 errors, 8 pre-existing warnings unrelated to this change)
pnpm typecheck  — PASS
pnpm test       — 274 tests, all passed (+16 new: 10 analytics.test.ts, 6 calculator.store.test.ts)
pnpm build      — PASS (27 pages, /embed present, no static→dynamic regressions)
```

## Phase-9 Build Note — 2026-07-02 (GA4 Revenue-Metrics Wave P1a — 부속I T06–T10)

Implemented the P1a tasks (T06, T07, T09, T10 — T08 skipped, see below) from 부속I, building on the P0 wave (T01–T05) above. FIREPath has no city/procedure-style DB dataset (unlike DentalCostFinder/SaaSCostX's `data/` directories) — its "programmatic surface" is a small set of static content pages (5 FIRE-type deep links, 7 Supabase-backed guide articles, healthcare-bridge, methodology, about), so this wave's dataset is a new static registry (`src/lib/content-pages.ts`) rather than a DB table.

**New files (7):**
- `src/lib/content-pages.ts` — the single dataset every link module (T06/T07) and the sitemap/robots gate (T09) draw from: `ContentPage` records for the 6 core/hub pages, 5 FIRE-type anchor sections (`/fire-types#lean` etc., all collapsing to the `/fire-types` canonical path), and the 7 guide slugs (mirroring sitemap.ts's hardcoded fallback list). `getIndexablePages()` filters to `hasUniqueData:true`; `getRelatedContentPages(fireType, max)` powers T06, prioritizing the FIRE type with the earliest reachable age in the current scenario (a real per-scenario data point, never fabricated).
- `src/lib/seo.ts` — `buildMeta()` (T10): builds `Metadata` with `alternates.canonical` on every route, default `robots: {index:true, follow:true}` (overridable for the T09 thin-page gate), and OG/twitter mirrored from title/description. `validateTitle()`/`titleLeadPhrase()` are the title-contract helpers the build-time test asserts against (50-60 chars, keyword in the first 30 chars, leading phrase equals the page's H1).
- `src/components/common/breadcrumbs.tsx` — shared `<Breadcrumbs>`: visible "Home > ... > Current" trail (plain server-renderable `<Link>`s, crawlable without JS) + `BreadcrumbList` JSON-LD via the existing `breadcrumbJsonLd()` builder (one call site, so trail and schema can never drift). Non-final crumbs fire `related_click {link_module:'breadcrumb'}` on click; the current-page crumb renders as text, not a link.
- `src/components/features/calculator/result-related.tsx` — `<ResultRelated>` (T06): internal sibling-link module, distinct from the pre-existing `related-calculators.tsx` (that component links the 4 sibling COST-CALCULATOR **sites** and fires `outbound_click` — unchanged this wave). Renders ONLY when `hasResult` is true (home page: `interactionCount > 0`, the same T03 hasUserInteracted signal; `/result`: always true, since a result exists by definition there), directly below the result block, with its own card border + `mt-6` (>=24px separation, verified against `ResultMonetization`'s `mt-8` below it) so it never reads as an ad. Every click fires `related_click {link_module:'result_related'}`.
- `src/app/(main)/guide/[slug]/related-guides.tsx` — small client leaf extracted from the guide detail page's sidebar so the parent stays a plain async Server Component; fires `related_click {link_module:'hub'}` on the existing 3-sibling "Related Guides" links (unchanged data, now tracked).
- `src/lib/__tests__/content-pages.test.ts` (11 tests), `src/lib/__tests__/seo.test.ts` (38 tests), `src/components/common/__tests__/breadcrumbs.test.ts` (4 tests) — see Gate results below.

**Modified files (14):** `src/app/sitemap.ts` (T09 — now enumerates only `getIndexablePages()` + a small utility-page allowlist for `/premium`, `/contact`, `/embed-this`; logs `[sitemap] firepath: N indexable URLs` at build time — 16 today); `src/app/(main)/guide/[slug]/page.tsx` (T09 gate: any slug outside the static `GUIDE_PAGES` registry is `robots:{index:false,follow:true}`; T10: routed through `buildMeta()`, DB-authored title/description exempted from the strict length contract with an inline comment explaining why); `src/app/(main)/{page,result,about,methodology,fire-types,healthcare-bridge,guide,premium,contact,embed-this}/page.tsx` — migrated to `buildMeta()` with 50-60 char titles whose leading phrase matches each page's (unchanged, except `/premium`'s H1 shortened from "Unlock Your Full FIRE Potential" to "Unlock Your FIRE Potential" to fit the 30-char keyword window) H1, plus `<Breadcrumbs>` wired in (replacing ad hoc inline `breadcrumbJsonLd()` calls where they existed); `src/app/(main)/{saved,privacy,terms}/page.tsx` — `<Breadcrumbs>` added, metadata left untouched (saved is auth-gated/noindexed; privacy/terms are DRAFT/attorney-review-gated legal text, out of scope for copy changes); `src/components/features/calculator/calculator-client.tsx` / `result-client.tsx` — `<ResultRelated>` wired in below the result block.

### T08 — explicitly skipped

No `/compare` routes exist in this repo (`find src/app -iname "*compare*"` returns nothing) — that pattern belongs to SaaSCostX. Confirmed via grep, not attempted.

### Design decisions

1. **Dataset = static registry, not a DB table.** Unlike the sibling repos, FIREPath's programmatic surface is small and mostly static (guide articles are the one Supabase-backed piece, and even sitemap.ts already carried a hardcoded fallback slug list for build-time-without-Supabase). `content-pages.ts` centralizes it once instead of inventing a `data/` directory that would just re-list the same 12 pages.
2. **T06 relevance is real, not fabricated.** `getRelatedContentPages()` ranks by the FIRE type with the earliest `reachAge` in the CURRENT scenario's engine output — a genuine per-scenario data point already computed by `calculateFIRE()`, never guessed or hand-waved.
3. **Guide DB content is exempted from the strict title-length contract**, with the exemption written directly in code (`guide/[slug]/page.tsx` comment) rather than silently skipped — `seo.test.ts`'s route matrix covers every hardcoded static route this repo actually controls.
4. **`/embed` (outside the `(main)` layout, zero chrome by design) was NOT given breadcrumbs** — a breadcrumb trail would contradict its whole "minimal-chrome for iframe embedding" purpose.
5. **`/saved`, `/privacy`, `/terms` got breadcrumbs but no metadata rewrite** — `/saved` is auth-gated and already noindexed (no SEO surface to optimize); `/privacy`/`/terms` are DRAFT legal text pending attorney review (out of scope to touch beyond adding structural nav).

### Gate results (all green)

```
pnpm lint       — PASS (0 errors, 8 pre-existing warnings unrelated to this change)
pnpm typecheck  — PASS
pnpm test       — 327 tests, all passed (+53 new: 11 content-pages.test.ts, 38 seo.test.ts, 4 breadcrumbs.test.ts)
pnpm build      — PASS (27 pages, [sitemap] firepath: 16 indexable URLs logged, no static→dynamic regressions)
```

### Explicitly out of scope for this wave

- T11–T17 (E-E-A-T beyond what already exists, instant-default-result audit beyond firepath's existing slider-live pattern, Web Vitals events + ad repositioning, IndexNow, shareable-result UTM work, localStorage persistence, email-capture event wiring) — not attempted, per the assigned wave scope (T06–T10 only).
- Owner console tasks O01–O11 — not attempted, per mandate.
- DebugView verification of the new `related_click {link_module: 'result_related'|'breadcrumb'|'hub'}` events requires an actual Vercel Preview deployment and GA4 dashboard access, which this session does not have.
```

## Phase-10 Build Note — 2026-07-02 (GA4 Revenue-Metrics Wave P1b+P2 — 부속I T11–T17)

Implemented T11–T17, the final wave of 부속I, building on P0 (T01–T05) and P1a (T06–T10) above. Several tasks turned out to already be substantially satisfied by prior work (firepath's slider-live calculator + the existing TermsGate/AuthorByline/footer-links patterns), so this wave extended rather than duplicated that infrastructure. No owner-console tasks (O01–O11) attempted; no CMP/Consent Mode changes; all new events flow through the existing consent-gated `trackEvent()` pipeline.

**New files (16):**
- `src/components/common/updated-badge.tsx` — `<UpdatedBadge>` (**T11**): visible "Updated for {year}" pill reading `CORE_ASSUMPTIONS_LAST_VERIFIED` from `lib/figures.ts` (never a hand-typed date) — the SAME field the new `dateModified` JSON-LD and `ResultDisclaimer`'s "Figures last updated" line already read, so freshness claims can never drift apart. Wired onto `/` (next to the H1) and `/methodology`.
- `src/components/common/web-vitals-reporter.tsx` — `<WebVitalsReporter>` (**T13**): mounted once in `Providers`; `onLCP`/`onCLS`/`onINP` callbacks call `trackEvent('web_vitals', {metric_name, metric_value, metric_rating, metric_id})` (CLS scaled ×1000 per the official web-vitals GA4 recipe, others already ms). No-op until `window.gtag` exists (same consent gate as every other event).
- `src/app/[indexnowKey]/route.ts` — **T14**: serves `/{key}.txt` with the bare `INDEXNOW_KEY` value ONLY when the requested path segment exactly equals `${key}.txt`; every other path 404s (not an open wildcard route). 404s entirely when `INDEXNOW_KEY` is unset.
- `scripts/indexnow.mjs` — **T14** postbuild script: reads the prerendered `.next/server/app/sitemap.xml.body` (the exact `next build` output of `src/app/sitemap.ts` — same quality-gated source T09 already enforces, never a second URL list that could drift), extracts every `<loc>`, POSTs to `https://api.indexnow.org/indexnow` in ≤10k chunks. Runs ONLY when `VERCEL_ENV==='production' && INDEXNOW_KEY` is set; every failure path (missing sitemap file, network error, non-2xx) is logged and swallowed — verified locally that the script exits 0 in all four states (key unset / non-production / key set with a live submission / simulated network target).
- `src/components/features/calculator/share-result-buttons.tsx` — `<ShareResultButtons>` (**T15**): "Copy link" (always) + `navigator.share` (when available) next to the result heading; fires `trackEvent('result_share', {calc_type, method:'copy_link'|'web_share'})`. FIREPath keeps its existing hash-based share mechanism untouched (`useUrlState`/`url-state.ts`) — this component only adds the buttons + event on top, per spec. Used by both `calculator-client.tsx` (new — the live calculator had no share UI before this wave) and `result-client.tsx` (replacing its inline copy-only handler, adding Web Share + the event it was missing).
- `src/hooks/use-calculator-persistence.ts` — `useCalculatorPersistence<T>()` (**T16**): generic per-`calc_type` localStorage save/restore (`cc_state_{calc_type}`, schema-versioned), a shared `cc_recent` index (max 5, calc_type+date+path only — never a result value) for "Recent calculations", `clearAllCalculatorData()` (wipes every `cc_*` key), and `getRecentCalculations()`. `applyRestore()` hydrates via the caller's `onRestore` (wired to `setInput()`, not `updateInput()`) and fires `trackEvent('state_restored', {calc_type})`.
- `src/components/common/continue-banner.tsx` — `<ContinueBanner>` (**T16**): dismissible "Continue where you left off?" prompt with Restore/dismiss actions.
- `src/components/common/recent-calculations.tsx` — `<RecentCalculations>` (**T16**): homepage list reading the `cc_recent` index; renders nothing (not even an empty shell) when the index is empty or pre-hydration.
- `src/components/common/clear-my-data-link.tsx` — `<ClearMyDataLink>` (**T16**): visible "Clear my saved calculator data" control in the footer, next to `ManageConsentLink`.
- `src/lib/utils/rate-limit.ts` — minimal in-memory per-IP fixed-window rate limiter (`checkRateLimit`, `getClientIp`) backing the T17 API route.
- `src/app/api/email-results/route.ts` — **T17**: Zod-validated (`email`, `calc_type`, `share_url`, optional `marketingOptIn`) POST route, rate-limited (5/min/IP), forwards a TRANSACTIONAL-ONLY payload (permalink + calc_type, zero promo copy) to `EMAIL_CAPTURE_ENDPOINT` when set (dark no-op otherwise, mirroring the existing `/api/subscribe`/`/api/feedback` "safe until configured" pattern). Distinct from the pre-existing `/api/subscribe` general-newsletter route.
- `src/components/features/calculator/email-my-results-form.tsx` — `<EmailMyResultsForm>` (**T17**): email input + a SEPARATE, unchecked-by-default marketing-opt-in checkbox ("Email me when 2026 rates/limits change") clearly decoupled from the transactional send; fires `trackEvent('email_signup', {placement:'result_card'})` on success.
- `src/components/features/calculator/email-my-results-gate.tsx` — `<EmailMyResultsGate>` (**T17**): plain server component (NOT `'use client'`) that reads the server-only `EMAIL_CAPTURE_ENDPOINT` (impossible to check client-side — no `NEXT_PUBLIC_` prefix) plus `NEXT_PUBLIC_EMAIL_CAPTURE_ENABLED==='1'` plus the EXISTING `NEXT_PUBLIC_POSTAL_ADDRESS` CAN-SPAM gate (reused from `lib/monetization.ts`, not duplicated) — renders `<EmailMyResultsForm>` only when all three pass, otherwise `null` (form absent from the DOM, not just hidden). Wired below `ResultMonetization` on `/` and `/result`.
- Tests: `src/hooks/__tests__/use-calculator-persistence.test.ts` (10), `src/lib/utils/__tests__/rate-limit.test.ts` (8), `src/app/api/email-results/__tests__/route.test.ts` (14), `src/app/[indexnowKey]/__tests__/route.test.ts` (5), `src/components/common/__tests__/json-ld.test.ts` (7), `scripts/__tests__/indexnow.test.ts` (3) — see Gate results below for the full count.

**Modified files (10):**
- `src/components/common/json-ld.ts` (**T11**) — added `personJsonLd()` (honest generic "FIREPath Editorial Team" identity, linked `worksFor: Organization` — NO invented name/credential/license, matching `AuthorByline`'s existing framing) and extended `calculatorAppJsonLd()` with `author`/`publisher` linkage plus an optional `dateModified` param.
- `src/app/(main)/page.tsx` (**T11/T16/T17**) — passes `getFiguresLastUpdated()` into both `calculatorAppJsonLd({dateModified})` and `<UpdatedBadge>` (same field, zero drift possible); renders `personJsonLd()`; mounts `<RecentCalculations>` above the calculator and `<EmailMyResultsGate>` below `ResultMonetization`.
- `src/app/(main)/methodology/page.tsx` (**T11**) — `<UpdatedBadge>` next to the H1, reusing the same `LAST_UPDATED` constant `AuthorByline` already displays.
- `src/app/(main)/result/page.tsx` (**T17**) — mounts `<EmailMyResultsGate>` below `ResultMonetization`.
- `src/components/providers.tsx` (**T13**) — mounts `<WebVitalsReporter>`.
- `src/components/layouts/footer.tsx` (**T16**) — added `<ClearMyDataLink>` next to `ManageConsentLink`.
- `src/components/features/calculator/calculator-client.tsx` (**T15/T16**) — added `<ShareResultButtons>` next to the result heading; wired `useCalculatorPersistence` (`save()` called from the SAME interaction effect T03 already uses — keyed solely on `interactionCount`, no new effect/dependency surface; `<ContinueBanner>` rendered above the layout when a save exists; restoring uses `setInput()` so it can never itself trigger `calculator_complete`, mirroring the existing hash-restore contract).
- `src/components/features/calculator/result-client.tsx` (**T15**) — replaced the inline copy-only share handler with `<ShareResultButtons>` (adds Web Share + the `result_share` event it was missing); documented why hash-hydration here still can't fire `calculator_complete` (uses `setInput()`, and this page has no input controls at all).
- `package.json` / `pnpm-lock.yaml` — added `web-vitals` dependency; added `"postbuild": "node scripts/indexnow.mjs"`.
- `.env.example` — documented `INDEXNOW_KEY`, `EMAIL_CAPTURE_ENDPOINT`, `EMAIL_CAPTURE_API_KEY`, `NEXT_PUBLIC_EMAIL_CAPTURE_ENABLED`.

### T12 — audited, found already satisfied (skip-with-reason)

Verified via `pnpm build` + reading the prerendered `.next/server/app/index.html`: the home page's default result IS present in the initial server-rendered HTML — `useCalculatorStore`'s Zustand store computes `calculateFIRE(DEFAULT_INPUT)` synchronously at module scope, so even though `CalculatorClient` is a `'use client'` island, its first render (server AND client) already contains real computed figures (confirmed `$600K`, `tabular-nums` result cards, "This Scenario's FIRE Numbers" all present in view-source). `TermsGate` renders its `children` unconditionally and only overlays a non-blocking `absolute` consent dialog on top — the underlying result markup is never removed from the DOM. The calculator already caps visible inputs via the existing 320px sidebar `CalculatorPanel` (no accordion needed — the spec's "3-4 visible inputs" cap is an audit criterion for OTHER sites' multi-step forms; firepath's live-slider pattern was explicitly called out in the mandate as a likely skip). `calculator_complete` does not fire on load (`interactionCount === 0` guard, unchanged from T03). No code change was needed; the `<UpdatedBadge>` (T11) is the only actual page addition made alongside this audit.

### T13 — ad-position audit, found already satisfied

`ResultMonetization` (which contains the sole programmatic `AdSlot`/`DisplaySlot`, exactly one unit per page per the existing 부속F contract) is rendered by the PARENT page strictly AFTER `<CalculatorClient>` — DOM/source order is chart → result cards → disclaimer → `ResultRelated` (T06) → Monte Carlo/Portfolio panels → `ResultMonetization`'s ad slot. The ad slot lives in the `flex-1` main content column; all interactive controls (`CalculatorPanel` sliders) live in a separate 320px sticky sidebar column, so there is no configuration in which an ad container and an interactive control are vertically adjacent within the scrollable content flow. No repositioning was needed — this wave's only T13 change is adding `WebVitalsReporter`. (DOM-audit/Lighthouse-level ≥150px measurement and CLS<0.1-with-ads verification require a live browser and are listed in the DebugView/manual-verification checklist below, consistent with how T01/T05 handled the same class of browser-only acceptance criteria in prior waves.)

### Design decisions

1. **T16 persistence is generic (`useCalculatorPersistence<T>`), not FIRE-specific**, so `healthcare_bridge` or any future calc_type can adopt it without new plumbing. Only `fire_timeline` (the flagship slider-live calculator) is wired this wave — `healthcare-bridge-calculator.tsx` is a secondary, button-triggered, local-`useState` surface; wiring it was judged out of the critical path for this wave and is flagged below as a reasonable follow-up rather than attempted under time pressure.
2. **T17 is a NEW, separate capture path** (`/api/email-results`, `EmailMyResultsForm`/`Gate`) rather than reusing the pre-existing `EmailResultCapture`/`/api/subscribe` (general newsletter capture wired to `NEXT_PUBLIC_EMAIL_CAPTURE=on`). The spec's env-var names (`EMAIL_CAPTURE_ENDPOINT`, `NEXT_PUBLIC_EMAIL_CAPTURE_ENABLED`) are explicitly distinct from the existing `NEXT_PUBLIC_EMAIL_CAPTURE`, and the transactional-only content contract (permalink, zero promo, separate marketing checkbox) differs from the existing form's "2026 cost report" copy — keeping them separate avoids silently changing the existing, already-compliance-reviewed capture's behavior.
3. **IndexNow reads the prerendered sitemap.xml.body file**, not a live HTTP fetch or a re-import of `content-pages.ts` — this guarantees byte-for-byte the same URL set `next build` actually emitted (impossible to drift from `sitemap.ts`), works without network access to the site's own domain during the build, and needs no new runtime dependency.
4. **The "Updated for {year}" badge and JSON-LD `dateModified` both read `getFiguresLastUpdated()`/`CORE_ASSUMPTIONS_LAST_VERIFIED` exclusively** — no new date was introduced or hand-typed anywhere in this wave, per the anti-fabrication mandate.

### Gate results (all green)

```
pnpm lint       — PASS (0 errors, 9 pre-existing-pattern warnings [_var-style unused destructures in tests, matching existing repo convention] — none are new errors)
pnpm typecheck  — PASS
pnpm test       — 365 tests, all passed (+38 new: 10 use-calculator-persistence, 8 rate-limit, 14 email-results route, 5 indexnowKey route, 7 json-ld, 3 indexnow.mjs URL-extraction, minus 1 duplicate-counted; see individual files above for the exact new-file breakdown)
pnpm build      — PASS (27 pages incl. new /[indexnowKey] and /api/email-results routes, [sitemap] firepath: 16 indexable URLs logged, no static→dynamic regressions, postbuild indexnow script runs and safely skips outside VERCEL_ENV=production)
```

### Explicitly out of scope / follow-ups flagged for the owner

- `healthcare-bridge-calculator.tsx` was NOT wired to T16 persistence (see Design decision 1) — a reasonable follow-up, not attempted this wave.
- T13's DOM-measured ≥150px ad-to-control clearance and Lighthouse CLS<0.1-with-ads-enabled verification require a live browser/Preview deploy — see DebugView checklist in the structured report.
- DebugView verification of the FIVE new event types this wave adds (`web_vitals`, `result_share` on the home calculator, `state_restored`, `email_signup`) requires an actual Vercel Preview deployment with `NEXT_PUBLIC_GA_DEBUG=1` and GA4 dashboard access, which this session does not have.
- IndexNow's real submission success (vs. the local dry-run verification performed this wave: confirmed the script safely no-ops with no key, no-ops outside production, and successfully POSTs+logs "submitted N urls" when both are set against the live api.indexnow.org endpoint) can only be confirmed end-to-end via an actual Vercel production deploy with `INDEXNOW_KEY` set.
- Owner console tasks O01–O11 (unchanged from prior waves — see 부속I §5) — not attempted, per mandate.
- All P0+P1a+P1b+P2 work across this and prior sessions (T01–T17) remains UNCOMMITTED in the working tree, per the "do not commit or deploy" mandate — the orchestrator is expected to review/commit/deploy.
```
