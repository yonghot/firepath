# AdSense Day-1 runbook — FIREPath (gofirepath.com)

> 부속M K11. Transcribes 부속M §3 ("승인 후 첫 90일 설정 시퀀스") for this
> repo, faithfully, with no additions or reinterpretation. This is an
> **owner-console runbook** (부속M §10 P05 executes it) — nothing in this
> document changes ad code, Auto ads state, or the AdSense review queue.
> Claude Code does not and must not perform any of the console steps below;
> this file exists so the owner has the exact checklist ready the day
> gofirepath.com's AdSense review clears.

## Why "Day 1" and not "now"

부속M's decision tree is explicit: **Day 0–14 (~7/16), touch nothing.** The
review queue must not be prodded, re-requested, or "helped along." This
runbook activates the moment — and only the moment — AdSense approval for
gofirepath.com is granted. Acting on any item below before approval is an
anti-pattern (부속M §9).

## 2026년 Auto ads 3대 변경 (배경 — 왜 감사가 필요한가)

Google shipped three more-aggressive Auto ads defaults during 2026, all
verified as of the report date:

1. Vignette "additional triggers" — 2/9 introduced, **3/9 auto-activated**
   (includes a 30-second-inactivity trigger; a back-button trigger existed
   but was **removed 6/15**).
2. The ad-load slider was **removed 4/16**, approximated instead by three
   banner "advanced settings" controls (needs verification post-approval).
3. "Dynamic anchor" **auto-activated 6/19** (desktop expansion).
4. **From 6/30**, ad intents auto-inserts Gemini-generated content —
   **no opt-out**; the format itself must be turned off entirely to avoid it.

Because every one of these defaults changed *after* this repo's ad code was
last reviewed, the Day-1 audit below cannot be skipped or assumed
already-correct — it must be re-verified against whatever the console shows
on approval day.

## Day-1 audit (approval day, Ads ▸ By site ▸ Edit — gofirepath.com)

Perform every step below, in order, the day AdSense approval is granted:

1. **Disable "vignette additional triggers."** The 30-second-inactivity
   trigger fires mid-calculation on this site (a user pausing to read a
   result is not idle) — that is an accidental-click trap. gofirepath.com is
   **not** one of the two YMYL sites (legal/dental) in this portfolio, so
   full vignette OFF is not mandated by 부속M for this site specifically —
   but the additional-triggers toggle must still be disabled regardless of
   site category.
2. **Turn OFF ad intents everywhere.** Gemini-generated content is inserted
   into ad intents units with no opt-out as of 6/30 — unverified/unreviewed
   generated content rendering on the page is an unacceptable content-quality
   and trust risk regardless of YMYL status. Disable the format entirely.
3. **Anchor ads**: turn ON for mobile, **bottom-fixed position only** (the
   highest-value always-on format on a tool page). Turn OFF "anchor ads on
   screens over 1000px" (this blocks the desktop dynamic-anchor auto-activation
   from 6/19).
4. **Banner advanced settings**: cap in-page banners at a **maximum of 2**,
   with a generous minimum distance between them. Verify these three
   settings are what the removed ad-load slider actually migrated to — do
   not assume; check the console values directly.
5. **Ad exclusion areas**: register the calculator-widget selectors listed in
   `docs/ad-exclusion-zones.md` (inputs + calculate/action controls + result
   cards) so Auto ads' own placement engine cannot place a unit inside or
   immediately beside them. That document is the code-side audit and
   selector reference (부속M K05) — this step is where the owner actually
   registers them in the console.
6. **Side rails**: OK to enable on desktop — no restriction.

## Week 1 — CLS recheck

After Auto ads activates, **re-measure Cumulative Layout Shift** within the
first week. Post-approval CLS regression is a documented recurring pattern
(a newly-filling ad unit shifting page content is exactly the kind of
layout jump the reserved-height (`min-h`) CWV guards in `ad-slot.tsx` exist
to prevent — but Auto ads' own automatically-placed units, which are outside
this repo's own component tree, are not covered by that guard and must be
verified in the live console/PageSpeed data, not assumed safe).

## Month 1 — Auto-only

Run **Auto ads only** (anchor + capped in-page banners) for the entire first
month. Do not add a manual/reserved unit yet. The goal of month 1 is a
**clean AdSense account history** — no experimentation, no manual slot
additions, no format changes — while the account is newest and has the least
policy buffer.

## Month 2–3 — one manual slot, gated on two clean Policy Center weeks

Only after **two consecutive weeks with a clean Policy Center** (no
warnings, no policy violations, no "limited ads" states) may the owner
enable **one** reserved manual ad slot — placed **below the result output**
(after the free-tier result cards / `ResultMonetization` block, matching
where this repo's own reserved ad slots already sit in the DOM per
`docs/ad-exclusion-zones.md`'s DOM-order audit). Do not add more than one
manual slot in this window.

**Experiments are off-limits for the full 90 days** — AdSense Experiments
require real traffic volume (~100 real sessions/day) to be statistically
meaningful, which this site will not have reached in this window per 부속M
§1's traffic projections. Do not create an Experiment before that volume
exists, regardless of how the console prompts for one.

## IVT house rules (account-fatal if violated)

These rules are absolute — a single violation risks **account termination**,
not a warning:

- **Never render live ads while logged into the AdSense/Google account, and
  never click a live ad for any reason** (QA, "just checking it looks
  right," curiosity). Use an ad-blocking browser profile or the AdSense
  Publisher Console preview tooling for any visual QA of ad placement —
  never the live site while authenticated.
- **Never ask a friend, colleague, or "someone to look at the site"** in a
  way that could be read as soliciting a click or an impression from someone
  who knows the request came from the site owner.
- **Never purchase or exchange traffic**, in any form, permanently. At this
  site's real traffic level (single-digit to low-teens human sessions per
  28 days per 부속M §0), a single owner self-click is a catastrophic
  Invalid Traffic ratio against the denominator — this is not a "small
  mistake," it is a disproportionately large signal on a low-traffic new
  account.
- If AdSense shows a **"being assessed" / limited serving** state on this
  account: this is common for new accounts and typically **auto-resolves
  within 30 days**. **Do not react** — do not add ad units, do not file an
  appeal, do not attempt to "boost" traffic to clear it. Reacting to this
  state is itself a documented anti-pattern.

## Rollback trigger

**AdSense's own session-level reporting was discontinued (2025-09)** — the
monthly review dashboard for this account is: the AdSense per-format
report + Policy Center + this repo's GA4 `calculator_complete` conversion
rate (already instrumented, 부속I).

**If any ad-configuration change (Day-1 audit, Month-2–3 manual slot, or any
later console change) is followed by a `calculator_complete` conversion-rate
drop of 10–15% or more, treat this as an automatic rollback trigger:** revert
the most recent ad-configuration change immediately, without waiting for a
"let's see if it recovers" observation period. The tool's core conversion
action (a completed calculation) takes priority over incremental ad
placement.

## Non-goals / what this document does NOT do

- Does not modify `ads.txt`, the AdSense loader script, or any Auto ads
  state — every item above is a **console** action the owner performs
  (부속M §10 P05); this file is the transcribed checklist, not the
  execution of it.
- Does not change ad placement/behavior in this repo's code. The
  pathname-keyed SPA re-init in `src/components/common/ad-slot.tsx` and the
  reserved-height CWV guard are unchanged by this document.
- Is not a substitute for `docs/ad-exclusion-zones.md` (부속M K05, the
  selector reference for step 5 above) — read both together on approval day.
