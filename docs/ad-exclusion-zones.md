# Ad exclusion zones — FIREPath (gofirepath.com)

> 부속M K05. Lists the widget CSS selectors the AdSense account owner should
> register as **Auto ads exclusion areas** (Ads ▸ By site ▸ Edit ▸ "Ad exclusion
> areas") so Google's automatic placement engine never places a unit inside or
> immediately beside FIREPath's calculator input/results surfaces. This is an
> owner-console action (부속M §10 P05) — this document is the code-side audit
> and selector reference for it; no ad code or Auto ads state is modified here.

## Why this matters

부속M §7's #1 account-fatal policy trap is **accidental-click proximity**: an
ad rendered close enough to an input field or "Calculate"/submit-style control
that a user tapping the control clicks the ad instead. AdSense's own guidance
is to keep a comfortable buffer (documented industry practice: ~150px) between
interactive calculator controls and any ad unit. FIREPath's layout already
achieves this structurally (see "Code-side audit" below); the exclusion-zone
registration is the belt-and-suspenders step so Auto ads' own placement
heuristics can't override that structure.

## Registrable selectors

Register these as ad exclusion areas in AdSense (one entry per calculator
surface). They cover every element that contains slider/input controls or a
result-adjacent action control on an ad-bearing page:

| Selector | What it covers | Page(s) |
|---|---|---|
| `aside:has(> div > [role="slider"])` | Desktop sticky sidebar containing all 9 FIRE input sliders (`CalculatorPanel`) | `/` |
| `[data-slot="sheet-content"]` | Mobile bottom-sheet parameter panel (same `CalculatorPanel` content, sheet-rendered) | `/` |
| `.space-y-2:has(input[aria-label$=" value"])` | Individual slider+number-input row (`SliderInput`) — belt-and-suspenders per-control coverage | `/` |
| `[aria-label="Financial advisor phone contact"]` | Primary-intent CTA (call variant) — a clickable action control, not itself an ad, but adjacent to the display slot | `/`, `/result`, guide pages |
| `[aria-label="Financial advisor referral"]` | Primary-intent CTA (CPL variant) | `/`, `/result`, guide pages |
| `[aria-label="Featured robo-advisor"]` | Primary-intent CTA (affiliate variant) | `/`, `/result`, guide pages |
| `button:has(svg.lucide-share-2)` (Share button) | Share/Reset action row above the result cards | `/`, `/result` |

The `AdSlot`/`AdProvider` unit itself is always rendered inside an
`<aside aria-label="Advertisement">` (or `"Advertisement placeholder"` when
unconfigured) — Auto ads should never place an *additional* unit inside that
container; the container selector `aside[aria-label^="Advertisement"]` can be
registered as a **negative** reference if the owner wants to confirm Auto ads
isn't stacking a second unit inside the reserved slot.

## Code-side audit (부속M K05 acceptance criterion)

Verified by reading the DOM source order of every page that mounts an ad
(`AdSlot` via `ResultMonetization`/`AdProvider`, or directly):

- **`/` (home)** — `CalculatorPanel` (sliders) renders in a `position: sticky`
  desktop sidebar **column**, never in the same vertical flow as the ad. In
  the main content column, the ad (`ResultMonetization` → `DisplaySlot`) is
  separated from the result cards by, in DOM order: `ResultDisclaimer` →
  `ResultRelated` (bordered card, `mt-6` + `p-4 md:p-6`) → `MonteCarloPanel` →
  `PortfolioPanel` — each a full card section, not a spacer div. There is no
  "Calculate" submit button on this page (the calculator recalculates live on
  slider drag); the nearest action controls to inputs are "Reset"/"Share" in
  `CalculatorPanel`'s own header, which never sits in the same column as the
  ad.
- **`/result`** — No calculator inputs render on this page at all (it is a
  read-only shared-result view; "Edit"/share buttons sit at the top of the
  page, far from the ad at the bottom). Source order: result chart → result
  cards → `ResultDisclaimer` → `ResultRelated` (bordered card) →
  `ResultMonetization` (ad).
- **`/guide` and `/guide/[slug]`** — No calculator inputs or "Calculate"
  buttons render on these pages at all (guide pages are articles with a single
  "Open Calculator" `<Link>` that navigates to `/`). The ad
  (`<AdSlot slot={NEXT_PUBLIC_ADSENSE_SLOT_GUIDE} />`) renders after the full
  article body and the CTA block, at the end of the `<article>`.
- **`/fire-types` and `/healthcare-bridge`** — Neither page mounts an ad at
  all (no `AdSlot`/`AdProvider`/`ResultMonetization` import), so there is no
  proximity surface to audit on them.

This DOM-order/component-composition contract is enforced by
`src/components/common/__tests__/ad-slot.test.ts` and
`src/lib/__tests__/content-pages.test.ts` (which pin which pages carry which
components); see `docs/PROGRESS.md` for the wave note recording this audit.

## Non-goals / what this document does NOT do

- Does not modify `ads.txt`, the AdSense loader, or any Auto ads state —
  registering these selectors in the AdSense console is an owner action
  (부속M §10 P05), out of scope for Claude Code per 부속M §9 guardrails.
  This document exists so the owner has the exact selector list ready for
  that console step.
- Does not change ad placement/behavior in code. The reserved-height
  (`min-h-[100px] md:min-h-[280px]`) CWV guard and the pathname-keyed re-init
  in `ad-slot.tsx` are unchanged.
