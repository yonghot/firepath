# design/forbidden.md — FIREPath Anti-Slop List

Patterns that signal generic, AI-default "slop" and are **forbidden** in new code. The PostToolUse hook (`.claude/settings.json`) greps `src/` for a subset of these on every Edit/Write; the Stop hook runs `impeccable detect` for the full set. Findings present at takeover are recorded in `baseline.json`.

## Hard-blocked patterns (PostToolUse grep → exit 2)

These literal patterns cause the edit hook to fail. Do not introduce them:

| Pattern | Why it's slop | Do instead |
|---------|---------------|------------|
| `from-purple-*` | Purple→blue gradient is the #1 AI-generated tell | Use `--brand-primary` (#065F53 teal) solid or the documented chart gradient |
| `to-blue-*` | Same gradient cliché | Solid brand color; gradients only on the chart area fill (20%→0%) |
| `hover:scale-105` | Generic "pop" hover with no meaning | Use the documented `scale(1.02)` card-highlight that links card↔chart, or a `shadow-sm→shadow-md` lift |
| `#000000` | Pure black — never used; harsh, off-system | Use `--foreground` / OKLCH neutrals (`oklch(0.145 0 0)`) |

> **`Inter` is EXEMPT.** The generic anti-slop list normally flags `Inter` as a default-font tell, but FIREPath uses Inter **deliberately** for `tabular-nums` financial alignment (documented in DESIGN.md and `.impeccable.md`). The `\bInter\b` pattern is therefore **intentionally removed** from the PostToolUse hook for this project. If the brand font ever changes, re-add it. See `docs/PROGRESS.md` → "판단 필요".

## Soft-flagged patterns (impeccable detect / design review)

Avoid these; they are flagged by `impeccable detect` and design review even though they don't hard-block edits:

- **Gradient text** (`bg-clip-text` + `bg-gradient-*`) — decorative, not meaningful. *Baselined:* 2 pre-existing occurrences in `src/app/(auth)/layout.tsx` are recorded in `baseline.json`; do not add new ones.
- **Glassmorphism** — `backdrop-blur` + translucent panels as decoration.
- **Emoji as UI iconography** — use Lucide icons, not emoji, in product chrome.
- **Ambient/looping animation**, parallax, entrance choreography — motion must be functional feedback (150–300ms).
- **Off-grid magic numbers** for spacing — stick to the 4px scale.
- **Repurposing FIRE-type colors** (`#10B981/#2563EB/#7C3AED/#F59E0B/#EC4899`) for non-FIRE meaning.
- **Hardcoded color literals** where a token exists — pull from `FIRE_COLORS` / `--fire-*` / `--brand-*` / OKLCH vars.
- **Oversized consumer-app rounding** (e.g. `rounded-3xl` on dense data cards) — cards are `rounded-xl`.
- **Removing focus rings** (`outline-none` without a visible `focus-visible` replacement).
- **Fake precision / dark patterns** in copy — projections are estimates; show honest edge states ("80+").

## How to override intentionally

If a flagged pattern is genuinely the right call (like Inter), document the decision in `DESIGN.md` "Decisions Log" + `.impeccable.md`, exempt it explicitly here, and (if it's hard-blocked) adjust the hook pattern. Never silence a finding without a written rationale.
