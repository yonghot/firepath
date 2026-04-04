# Components Layer Rules

## Organization
- `ui/` — shadcn/ui primitives (do not modify directly)
- `layouts/` — Header, Footer, MobileNav
- `features/` — Feature-specific components grouped by domain
- `common/` — Shared components (disclaimers, SEO, etc.)

## Rules
- No business logic in components — use hooks/stores/services
- No direct API calls — use React Query hooks
- No direct Supabase calls — use hooks that call API routes
- Props must be typed with interfaces
- Use shadcn/ui primitives for UI elements
- Follow DESIGN.md for styling (colors, spacing, typography)
- Mobile-first responsive design (min-width breakpoints)
- All interactive elements must be keyboard accessible
