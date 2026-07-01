# design/required.md — FIREPath Required Patterns

The positive counterpart to `forbidden.md`. New UI **must** satisfy these. Treat each as a review gate; pair with `principles.md`.

## Tokens & color
- **Use tokens, never literals.** Colors come from `FIRE_COLORS` / `--fire-*` (FIRE types), `--brand-primary` / `--brand-light` (brand), or the OKLCH neutral/semantic vars in `globals.css`. See `design/tokens.css` for the canonical set.
- **FIRE-type color = semantics.** Render any FIRE type via its locked token; keep Coast's dashed `8 4` stroke so it's distinguishable from amber Warning without relying on hue.
- **Respect light + dark.** Every surface must work in both themes (`.dark` variant); maintain contrast on both.

## Typography
- **Inter for sans**, weight/size for hierarchy (h1 36/700 … caption 12/400). Don't introduce a second display typeface.
- **`tabular-nums` on every financial figure** — currency, percentages, ages, year counts. Misaligned numerals are a bug.
- **`font-mono` for raw/editable values** — slider number inputs, chart tooltip values.

## Layout & spacing
- **4px spacing scale only** (4/8/12/16/20/24/32/40/48/64). No off-grid values.
- **Grid discipline:** max-width 1440px centered (`px-4`); desktop 320px sticky sidebar + fluid content; mobile bottom-sheet parameters + full-width content.
- **Radius from `--radius`:** cards `rounded-xl`, buttons `rounded-md`, chart container `rounded-xl`.
- **Intentional decoration only:** `shadow-sm`→`shadow-md` on hover; gradient fill only under the chart line; 4px type-color left border as card identity. Each ornament must encode information.

## Motion
- **150–300ms, functional.** hover 150ms · default 200ms · chart recalc 300ms · sheet 300ms.
- Motion must **link** related UI (e.g. card highlight ↔ chart reference line), never merely decorate. Respect reduced-motion.

## Accessibility (WCAG 2.1 AA — required, not optional)
- **Keyboard:** every interactive element reachable and operable; focus behavior mirrors hover behavior.
- **Visible focus:** 2px ring (`ring-ring/50` / `focus-visible:ring-2`); never remove it.
- **Labels:** `aria-label` on every slider/input; descriptive summary label on result cards; chart interpretable without color.
- **Contrast:** ≥ 4.5:1 for text in both themes.
- **Color independence:** state/identity must have a non-color cue too (dash pattern, label, icon).

## Content & trust
- **Honest edge states** ("80+" when unreached); no fake precision, urgency, or dark patterns.
- **Consistent terminology** — "Lean/Regular/Fat/Coast/Barista FIRE", uppercase "FIRE", and the format helpers in `lib/utils/format` for money/percent.

## Architecture-adjacent (so UI stays clean)
- **No business logic in components** (CLAUDE.md): calculations live in `lib/engine`; data access via hooks/services/repositories. Components render and wire interactions only.
- **Performance budget:** LCP < 2.5s, FID < 100ms, CLS < 0.1; premium-only panels stay code-split (`next/dynamic`).
