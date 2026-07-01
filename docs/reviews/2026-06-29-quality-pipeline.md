# Quality Pipeline Review — 2026-06-29

## Summary

Phase-3 cleanup/fix pass executed on the firepath repo. All majors fixed, key minors applied.

## Fixes Applied

### MAJORS (6/6 fixed)

#### 1. Coast FIRE monthly income — correctness fix
- **File:** `src/lib/engine/fire-calculator.ts` (line 115)
- **Fix:** `buildResult` now accepts an optional `incomeBase` parameter. For coast FIRE, `targets.regular` is passed as the income base instead of `coastTarget`. This means `monthlyPassiveIncome` for coast correctly reflects what the portfolio generates at retirement ($3,333/mo at default inputs) rather than the misleading discounted seed amount ($879/mo — 3.8x too low).
- **Test:** `[REGRESSION] coast monthlyPassiveIncome equals regular monthlyPassiveIncome` added to `fire-calculator.test.ts`.

#### 2. SWR=0 via URL hash — NaN/Infinity prevention
- **File:** `src/lib/engine/url-state.ts`
- **Fix:** `decodeState` now imports `SLIDER_CONFIGS` and validates each decoded value against its slider's `min`/`max` bounds. Out-of-range values are skipped (default kept). Prevents `safeWithdrawalRate=0` from passing through and causing `Infinity` targets and `NaN` monthly income in the UI.
- **Test:** New file `url-state.test.ts` with 9 regression tests covering SWR=0, negative SWR, above-max SWR, annualExpenses=0, valid boundary values.

#### 3. JSON-LD XSS prevention (stored XSS via </script>)
- **Files:** `src/app/(main)/guide/page.tsx`, `src/app/(main)/guide/[slug]/page.tsx`
- **Fix:** Created `src/lib/utils/json-ld.ts` with `safeJsonLd()` helper that escapes `<` → `<`, `>` → `>`, `&` → `&` after `JSON.stringify`. Both guide pages now use `safeJsonLd()` instead of bare `JSON.stringify()` for all `dangerouslySetInnerHTML` JSON-LD blocks.

#### 4. HTTP security headers
- **File:** `next.config.ts`
- **Fix:** Added `headers()` export with three security headers applied to all routes except `/embed`:
  - `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
  - `X-Content-Type-Options: nosniff` — prevents MIME-sniffing
  - `Referrer-Policy: strict-origin-when-cross-origin` — prevents hash-encoded financial data leaking to third parties

#### 5. Desktop sign-out button — accessibility label
- **File:** `src/components/layouts/header.tsx` (line 59)
- **Fix:** Added `aria-label="Sign out"` to the icon-only desktop sign-out `<Button>`. Screen readers now announce a meaningful label. (Mobile nav already has text "Sign Out" — unaffected.)

#### 6. Coast FIRE monthly income (duplicate in brief — same fix as #1)

### MINORS APPLIED (3/9)

#### M1. Monte Carlo medianReachAge lower-median index
- **File:** `src/lib/engine/monte-carlo.ts` (line 131)
- **Fix:** Changed `ages[Math.floor(ages.length / 2)]` → `ages[Math.floor((ages.length - 1) / 2)]`. For even-N arrays the old formula picked the upper of the two middle elements, overstating by 0-1 year. The new formula always picks the lower-median element.

#### M2. sources-references.tsx role="list"
- **File:** `src/components/common/sources-references.tsx` (line 28)
- **Fix:** Added `role="list"` to the `<ol>`. Safari/VoiceOver drops the list role when `list-none` is applied via CSS; this explicit role restores semantics for all screen readers.

#### M3. decodeState bounds-clamping (maintainability)
- Already covered by MAJOR fix #2 above.

### MINORS SKIPPED

| Minor | Reason Skipped |
|-------|---------------|
| currentAge > retirementAge URL inversion | Partially covered by SWR clamping fix; full fix requires retirementAge > currentAge cross-field validation which is a separate concern. Low risk in practice since both ages are clamped to their individual slider bounds. |
| Portfolio optimizer Coast yearsToFIRE | Invasive change to portfolio-optimizer.ts with risk of breaking other optimizer logic. Deferred. |
| Hardcoded admin credentials in seed.ts | Seed script is dev-only (explicitly marked PROD-TODO). Deferred to a dedicated secrets-rotation task. |
| Dead SubscriptionRepository methods | Code removal with uncertain future impact. Deferred. |
| forbidden.md baseline description update | Documentation-only cosmetic fix. Deferred. |

## Gate Results

| Step | Result |
|------|--------|
| `pnpm lint` | PASS (no errors) |
| `pnpm typecheck` | PASS (no errors) |
| `pnpm test` | PASS — 117 tests passed (10 test files) |
| `pnpm build` | PASS (23 pages generated, pre-existing Recharts SSR width warning unrelated to changes) |

## Files Changed

| File | Change Type |
|------|-------------|
| `src/lib/engine/fire-calculator.ts` | Fix: Coast FIRE income base |
| `src/lib/engine/url-state.ts` | Fix: bounds-clamping in decodeState |
| `src/lib/engine/monte-carlo.ts` | Fix: lower-median index |
| `src/lib/utils/json-ld.ts` | New: safe JSON-LD serialization helper |
| `src/app/(main)/guide/page.tsx` | Fix: use safeJsonLd |
| `src/app/(main)/guide/[slug]/page.tsx` | Fix: use safeJsonLd |
| `next.config.ts` | Fix: security headers |
| `src/components/layouts/header.tsx` | Fix: aria-label on sign-out button |
| `src/components/common/sources-references.tsx` | Fix: role="list" |
| `src/lib/engine/__tests__/fire-calculator.test.ts` | Test: coast income regression |
| `src/lib/engine/__tests__/url-state.test.ts` | New: URL state bounds regression tests |
