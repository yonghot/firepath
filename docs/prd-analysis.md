# PRD Analysis — FIREPath

## P0 Features (Must Ship)

### F001: FIRE Calculation Engine
- **Input**: 9 parameters (currentAge, retirementAge, annualIncome, currentNetWorth, savingsRate, annualExpenses, expectedReturn, inflation, safeWithdrawalRate)
- **Output**: timeline[] + results{lean, regular, fat, coast, barista}
- **Logic**: Pure client-side, synchronous, 0ms delay
- **Dependencies**: None (standalone module)
- **Acceptance**: Default input → Regular target = $1,000,000, timeline length = 51

### F002: Interactive Slider Panel
- **9 sliders** with live numeric input
- **Real-time**: onChange triggers recalculation
- **Mobile**: Bottom sheet variant
- **Dependencies**: F001 (engine), Zustand store

### F003: Timeline Chart
- **Recharts AreaChart**: X=age, Y=net worth ($)
- **5 reference lines** for FIRE targets (color-coded)
- **Achievement markers** at intersection points
- **Tooltip** on hover with age/netWorth/target
- **Dependencies**: F001, F002

### F004: FIRE Result Cards
- **5 cards**: Lean, Regular, Fat, Coast, Barista
- **Each**: achievement age (large), target amount, years remaining, monthly passive income
- **Color-coded** left border per FIRE type
- **Hover interaction** with chart highlight
- **Dependencies**: F001

### F005: URL Hash Sharing
- **Encode**: 9 input params → compact hash string
- **Decode**: hash → restore slider values
- **Bidirectional sync**: slider ↔ URL
- **Dependencies**: F002

### F006: Responsive Layout
- **Desktop**: 35/65 split (panel | chart+cards)
- **Mobile**: Sheet panel + full-width content
- **Breakpoints**: sm(640), md(768), lg(1024), xl(1280)
- **Dependencies**: All UI components

## P1 Features

### F007: Authentication
- Email/password + Google OAuth via Supabase Auth
- Auto-create profile on signup (DB trigger)
- Session persistence via middleware

### F008: Save/Load Calculations
- 3-layer API: Route → Service → Repository
- Free: max 5 saves, Premium: unlimited
- Soft delete, pagination

### F009: OG Image Generation
- @vercel/og ImageResponse
- 1200x630 PNG with FIRE results

### F010: SEO Guide Content
- SSG pages from guides table
- Markdown rendering, Schema.org JSON-LD

### F011: Scenario Comparison
- What-If A vs B comparison
- Free: 2 scenarios, Premium: unlimited

## P2 Features
- F012: Stripe premium subscription ($4.99/mo)
- F013: Monte Carlo simulation (1000 runs)
- F014: Portfolio optimization

## Data Flow Summary
```
User Input → Zustand Store → FIRE Engine → { timeline, results }
                                              ↓            ↓
                                         Chart          Cards
                                              ↓
                                         URL Hash ↔ Store (bidirectional)
```

## API Inventory
| Method | Path | Auth | Layer |
|--------|------|------|-------|
| POST | /api/auth/callback | No | Supabase OAuth |
| GET | /api/calculations | Yes | Service → Repo |
| POST | /api/calculations | Yes | Service → Repo |
| GET | /api/calculations/[id] | Yes | Service → Repo |
| DELETE | /api/calculations/[id] | Yes | Service → Repo |
| GET | /api/subscriptions | Yes | Service → Repo |
| POST | /api/subscriptions | Yes | Service → Stripe |
| POST | /api/subscriptions/portal | Yes | Service → Stripe |
| GET | /api/og | No | Vercel OG |

## Risk Items
1. Recharts bundle size — monitor, consider lazy loading
2. URL hash length — test with extreme values
3. CoastFIRE calculation edge case when realReturn ≈ 0
4. Mobile slider UX — thumb size, touch targets
