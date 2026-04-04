# Design System — FIREPath

## Product Context
- **What this is:** Interactive FIRE calculator comparing 5 retirement types on one timeline
- **Who it's for:** FIRE pursuers (25-45), explorers (22-35), finance bloggers
- **Space:** Personal finance / fintech tools
- **Project type:** Web app (calculator + data visualization + content)

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian with financial trust signals
- **Decoration level:** Intentional (subtle surface treatments, data-first)
- **Mood:** Confident, precise, empowering. Like a Bloomberg terminal met a modern fintech app. The numbers do the talking.

## Typography
- **Display/Hero:** Inter (var: --font-sans) — clean geometric for financial data
- **Body:** Inter — high readability, excellent tabular-nums support
- **Data/Tables:** Inter tabular-nums — critical for aligned currency/percentage columns
- **Code:** system monospace
- **Scale:**
  - h1: 2.25rem/700 (36px)
  - h2: 1.875rem/700 (30px)
  - h3: 1.5rem/600 (24px)
  - body: 1rem/400 (16px)
  - small: 0.875rem/400 (14px)
  - caption: 0.75rem/400 (12px)

## Color

### Brand
- **Primary:** #065F53 (deep teal) — trust, stability, growth
- **Light:** #0D9488 (teal-500) — hover states, gradients
- **Dark:** #042F2E (teal-950) — headings emphasis

### FIRE Type Colors (semantic, never change)
| Type | Hex | Usage |
|------|-----|-------|
| Lean | #10B981 | Chart line, card border, reference line |
| Regular | #2563EB | Chart line, card border, reference line |
| Fat | #7C3AED | Chart line, card border, reference line |
| Coast | #F59E0B | Chart line, card border, reference line (dashed) |
| Barista | #EC4899 | Chart line, card border, reference line |

### Neutrals
- Background: #FAFAFA / dark: #0A0A0A
- Surface (cards): #FFFFFF / dark: #171717
- Border: #E5E5E5 / dark: #262626
- Text primary: #171717 / dark: #FAFAFA
- Text secondary: #737373 / dark: #A3A3A3

### Semantic
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444
- Info: #2563EB

### CSS Variables (globals.css)
```css
--fire-lean: #10B981;
--fire-regular: #2563EB;
--fire-fat: #7C3AED;
--fire-coast: #F59E0B;
--fire-barista: #EC4899;
--brand-primary: #065F53;
--brand-light: #0D9488;
```

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** 1(4) 2(8) 3(12) 4(16) 5(20) 6(24) 8(32) 10(40) 12(48) 16(64)

## Layout
- **Approach:** Grid-disciplined (sidebar + content split)
- **Max width:** 1440px (7xl), centered with px-4
- **Desktop (lg+):** 320px sidebar (sticky) + flexible content area
- **Mobile (<md):** Bottom Sheet for parameters, full-width content
- **Breakpoints:** sm(640) md(768) lg(1024) xl(1280)

## Component Patterns

### Cards
- Border radius: 12px (rounded-xl)
- Padding: 16-24px
- Shadow: sm default, md on hover
- FIRE cards: 4px left border in type color

### Sliders (shadcn/ui base-ui)
- Track: 4px height, muted background
- Thumb: 12px circle, white with ring border
- Active indicator: brand primary
- Layout: label+tooltip left, value input right, slider below

### Chart (Recharts)
- Container: rounded-xl border, card background, p-4/p-6
- Grid: dashed, muted color
- Area: brand-primary stroke(2px), gradient fill(20% → 0%)
- Reference lines: FIRE type colors, dashed(5 5), Coast uses dashed(8 4)
- Achievement markers: vertical dashed lines at reach age
- Tooltip: dark bg, white text, font-mono for values

### Buttons
- Primary: brand-primary bg, white text, rounded-md
- Secondary/Outline: border, brand-primary text
- Ghost: transparent, hover accent bg
- Sizes: sm(h-8) md(h-10) lg(h-12)

## Motion
- **Approach:** Minimal-functional
- **Transitions:** 200ms ease-in-out (default)
- **Chart recalculation:** 300ms (Recharts animationDuration)
- **Sheet open/close:** 300ms
- **Hover:** 150ms
- **Card scale on highlight:** scale(1.02) 200ms

## Dark Mode
- Strategy: CSS variables via Tailwind `dark:` variant
- Default: system preference
- Surfaces: reduce lightness, maintain contrast ratios

## Accessibility
- WCAG 2.1 AA compliance
- Color contrast: 4.5:1 minimum for text
- Focus ring: 2px brand primary (ring-ring/50)
- All sliders: aria-label with parameter name
- Keyboard: full tab navigation through all interactive elements
- Chart: descriptive alt text via screen reader

## Iconography
- Library: Lucide React
- Sizes: 14px(3.5) 16px(4) 20px(5) 24px(6)
- Stroke: 2px
- Key icons: Flame(logo), SlidersHorizontal(params), Share2, RotateCcw(reset), Menu, Calculator, Crown(premium)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-05 | Initial design system | Created with PRD, financial trust aesthetic |
| 2026-04-05 | Inter font kept | Best tabular-nums support for financial data display |
| 2026-04-05 | 5 FIRE colors locked | Must be visually distinct on chart, accessible contrast |
| 2026-04-05 | Sidebar 320px (was 380px) | Give more chart space on 1440px viewports |
