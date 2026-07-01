# design/principles.md — FIREPath

Concrete, enforceable design principles derived from `DESIGN.md`, `globals.css`, `src/constants/fire-colors.ts`, and the calculator feature components. Use these as review gates for any UI change.

## 1. Data-first hierarchy
- The most important thing on any screen is a **number**. Size, weight, and position serve the data, not the chrome.
- Financial figures use `tabular-nums` **always** so columns and changing values stay aligned (e.g. `text-3xl font-bold tabular-nums` on result figures; `font-medium tabular-nums` in card detail rows).
- Secondary metadata uses `text-xs text-muted-foreground`; type labels use `text-xs font-semibold uppercase tracking-wider` tinted with the FIRE-type color.
- **Gate:** if a new component buries the key value beneath decorative or navigational chrome, redesign it.

## 2. FIRE-type colors are locked semantics
- `Lean #10B981 · Regular #2563EB · Fat #7C3AED · Coast #F59E0B · Barista #EC4899`. Defined once in `fire-colors.ts` (`FIRE_COLORS`) and mirrored in `globals.css` (`--fire-*`).
- These colors carry meaning consistently across chart lines, reference lines, and the 4px card left-border. Never hardcode a different value, never repurpose a FIRE hue for unrelated UI.
- Coast is **also** distinguished structurally (dashed `8 4`) because it shares amber with the Warning semantic — never rely on hue alone to separate them.
- **Gate:** any FIRE-type rendering must pull from `FIRE_COLORS`/`--fire-*`, not a literal.

## 3. Industrial-utilitarian restraint ("Bloomberg meets fintech")
- Decoration is **intentional**, not absent: `shadow-sm` resting → `shadow-md` hover; 20%→0% gradient fill under the chart line; 4px type-color left border on cards. Each must encode state or identity.
- No glassmorphism, no ambient gradients, no decorative illustration, no oversized consumer-app rounding.
- **Gate:** for any new ornament, name the information it encodes. If none, remove it.

## 4. Grid discipline & comfortable density
- 4px base spacing scale: 4/8/12/16/20/24/32/40/48/64. Density is **comfortable** — not cramped, not airy.
- Layout: max-width **1440px** centered (`px-4`); desktop = **320px sticky sidebar** + fluid content; mobile = bottom-sheet parameters + full-width content.
- Radius from `--radius: 0.625rem`: cards `rounded-xl`, buttons `rounded-md`, chart container `rounded-xl`.
- **Gate:** spacing/padding values must map to the scale; don't introduce off-grid magic numbers.

## 5. Single typeface, weight-driven hierarchy
- **Inter** for everything sans (`--font-sans`, also aliased to `--font-heading`). This is deliberate for `tabular-nums` financial alignment — do not swap it for a "display" face.
- **Monospace** (`font-mono`) is reserved for raw, user-editable or precise values: slider number inputs and chart tooltip values. (Note: `--font-mono` currently falls back to system mono because Geist Mono isn't loaded — keep `font-mono` semantics regardless of which physical font backs it.)
- Hierarchy comes from the size/weight scale (h1 36/700 … caption 12/400), not from mixing typefaces.

## 6. Motion is functional feedback
- Stay within 150–300ms: hover 150ms, default 200ms, chart recalc 300ms, sheet 300ms.
- Use motion to **link** related UI: hovering/focusing a result card sets `isHighlighted`, which scales the card `scale(1.02)` and emphasizes its chart reference line. Motion reveals relationships; it never decorates.
- **Gate:** no entrance animations, parallax, or looping motion; respect reduced-motion.

## 7. Accessibility is non-negotiable (WCAG 2.1 AA)
- 4.5:1 text contrast minimum; 2px focus ring (`ring-ring/50`) never removed.
- Every interactive element is keyboard-reachable and behaves identically on focus as on hover (see result cards' `onFocus/onBlur` mirroring `onMouseEnter/Leave`).
- Every slider/input carries an `aria-label`; result cards carry a descriptive summary label; the chart stays interpretable without color.
- **Gate:** new interactive components ship with aria labels, keyboard support, visible focus, and color-independent state cues.

## 8. Honest, trustworthy surfaces
- Show truthful edge states (e.g. "80+" when a FIRE goal isn't reached by age 80) rather than blanks or fake precision.
- No dark patterns, urgency, or hidden costs; FIRE math is transparent and client-side. Trust is a design property, upheld by clarity and a11y as much as by copy.

## 9. One timeline, all five types
- The core value is comparing all five FIRE types on a **single** interactive chart with five result cards. Don't fragment this into tabs or per-type screens; enhancements should deepen the single-surface comparison.
