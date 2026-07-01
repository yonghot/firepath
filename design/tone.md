# design/tone.md — FIREPath (DRAFT)

> ⚠️ **toneDeclared = false.** The repository does **not** contain an explicit brand-voice / tone declaration. DESIGN.md, PRD.md, and CLAUDE.md describe the *visual* and *product* system but never define voice, person, or copy rules. The guidance below is a **sensible draft inferred** from the product surface (tagline, metadata, UI microcopy, FIRE descriptions) and the locked "industrial-utilitarian fintech" aesthetic. Confirm or correct each `[TODO]` before treating this as authoritative.

## Voice (inferred)

FIREPath should sound like a **precise, trustworthy financial instrument with a quietly empowering edge** — Bloomberg-terminal credibility, modern-fintech warmth. Clear over clever; the numbers carry the emotion.

Evidence in the codebase:
- Tagline: "All FIRE types in one beautiful calculator" — plain, confident, benefit-first.
- Meta description: "Compare 5 FIRE types … on one interactive timeline. Free FIRE calculator with real-time charts." — declarative, feature-true, no hype.
- FIRE descriptions (`fire-colors.ts`) are crisp and definitional: "Minimalist retirement with 60% of current expenses"; "Investments grow to retirement goal without additional savings."
- UI microcopy is terse and literal: "Target", "Monthly", "In {n} years", "80+".

[TODO: confirm — is the intended voice closer to neutral "instrument" (sober, restrained) or "empowering coach" (warmer, motivational)? The aesthetic says instrument; "beautiful/empowering" framing hints coach.]

## Tone principles (draft)

1. **Plain and precise.** Prefer the literal word. "Reach age", "Target amount", "Monthly passive income" — not jargon dressed up, not slang dressed down.
2. **Confident, not salesy.** State capabilities and results; never oversell or manufacture urgency. No "!!!", no growth-hacky CTAs.
3. **Empowering, not preachy.** The user is in control of their numbers. Frame outcomes as theirs ("your timeline", "your target"), not lectures about saving more. [TODO: confirm second-person voice and how much encouragement is wanted.]
4. **Honest about uncertainty.** FIRE projections are estimates. Tone should acknowledge assumptions (returns, inflation, SWR) rather than imply guarantees. Edge states stay truthful ("80+").
5. **Calm under data.** Even with dense figures, copy stays unhurried and legible — short labels, full words where space allows, mono only for the raw values.

## Person & address (draft)

- **Person:** Second person ("you / your") for the user's data and outcomes; first person plural ("we") avoided unless speaking as the product team in docs. [TODO: confirm.]
- **Formality:** Professional but unstuffy — contractions OK ("you're on track"), no corporate stiffness, no memes. [TODO: confirm.]
- **Localization:** Product internals and PRD are bilingual (Korean spec, English UI). Shipping UI copy is **English**. [TODO: confirm whether Korean (or other) localized UI copy is in scope, and the tone for each locale.]

## Do / Don't (draft)

| Do | Don't |
|----|-------|
| "Compare all 5 FIRE types on one timeline." | "🔥 Unlock your dream retirement NOW!" |
| "Target: $1.2M · Reach age: 47" | "You'll be a millionaire in no time!" |
| "Investments grow to your goal without extra saving." | "The secret rich people don't want you to know." |
| "Estimates based on your return and inflation assumptions." | Implying projections are guarantees. |
| "80+" when a goal isn't reached by 80. | Hiding or faking an unreachable result. |

## Terminology (observed — keep consistent)

- Capitalize FIRE-type names as "Lean FIRE", "Regular FIRE", "Fat FIRE", "Coast FIRE", "Barista FIRE" (`FIRE_LABELS`).
- "FIRE" is always uppercase (Financial Independence, Retire Early).
- Use "net worth", "target amount", "reach age", "savings rate", "SWR (safe withdrawal rate)", "passive income" consistently.
- Money/percent values are formatted via `lib/utils/format` helpers — don't hand-format in copy.

[TODO: confirm via /impeccable teach — owner to ratify voice positioning (instrument vs. coach), person/formality, encouragement level, and localization scope. Until then this file is a draft, not a contract.]
