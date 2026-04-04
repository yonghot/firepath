# FIREPath — Design System

## 3-1. Brand Identity
- Name: FIREPath
- Tagline: "All FIRE types in one beautiful calculator"
- Personality: Modern, trustworthy, data-driven, approachable

## 3-2. Color Palette

### Primary
- Brand Primary: #065F53 (deep teal)
- Brand Light: #0D9488 (teal-500)
- Brand Dark: #042F2E (teal-950)

### FIRE Type Colors
- Lean FIRE: #10B981 (emerald-500)
- Regular FIRE: #2563EB (blue-600)
- Fat FIRE: #7C3AED (violet-600)
- Coast FIRE: #F59E0B (amber-500)
- Barista FIRE: #EC4899 (pink-500)

### Neutral
- Background: #FAFAFA (light) / #0A0A0A (dark)
- Surface: #FFFFFF / #171717
- Border: #E5E5E5 / #262626
- Text Primary: #171717 / #FAFAFA
- Text Secondary: #737373 / #A3A3A3

### Semantic
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444
- Info: #2563EB

## 3-3. Typography
- Font: Inter (system fallback: -apple-system, sans-serif)
- Heading 1: 2.25rem/700
- Heading 2: 1.875rem/700
- Heading 3: 1.5rem/600
- Body: 1rem/400
- Small: 0.875rem/400
- Caption: 0.75rem/400

## 3-4. Spacing Scale
4px base: 1(4px), 2(8px), 3(12px), 4(16px), 5(20px), 6(24px), 8(32px), 10(40px), 12(48px), 16(64px)

## 3-5. Breakpoints
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

## 3-6. Component Patterns

### Cards
- Border radius: 12px (rounded-xl)
- Padding: 24px
- Shadow: sm (default), md (hover)
- FIRE result cards: colored left border (4px) matching FIRE type

### Sliders
- Track height: 8px
- Thumb: 20px circle
- Active color: brand primary
- Label above, value right

### Charts
- Background: transparent
- Grid: dashed, neutral-200
- Line width: 2px
- Area fill: 10% opacity of FIRE color
- Tooltip: dark bg, white text

### Buttons
- Primary: brand primary bg, white text
- Secondary: outline, brand primary border
- Ghost: transparent, hover bg
- Size: sm(32px), md(40px), lg(48px)
- Border radius: 8px

## 3-7. Layout Patterns

### Desktop (lg+)
- Calculator panel: 35% left sidebar (sticky)
- Content area: 65% right (chart + cards)
- Max width: 1440px, centered

### Mobile (< md)
- Calculator panel: Bottom sheet (draggable)
- Full-width chart (height: 250px)
- Result cards: horizontal scroll

## 3-8. Animation
- Transitions: 200ms ease-in-out
- Chart updates: 300ms smooth
- Sheet open/close: 300ms spring
- Hover effects: 150ms

## 3-9. Dark Mode
- Support via CSS variables + Tailwind dark:
- Default: system preference
- Toggle in header

## 3-10. Accessibility
- WCAG 2.1 AA compliance
- Color contrast: 4.5:1 minimum
- Focus ring: 2px brand primary
- All interactive elements keyboard accessible
- aria-labels on all inputs/sliders
- Chart: alt text description

## 3-11. Iconography
- Lucide React icons
- Size: 16px (sm), 20px (md), 24px (lg)
- Stroke width: 2px
