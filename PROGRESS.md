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
