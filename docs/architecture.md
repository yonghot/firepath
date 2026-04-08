# Architecture — FIREPath

## System Overview
```
Browser (Client)
├── React Pages/Components
├── Zustand Store (client state)
├── FIRE Calculator Engine (pure functions)
└── React Query (server state cache)
        ↓
Next.js Server
├── API Route Handlers (auth + validation)
├── Service Layer (business logic)
└── Repository Layer (data access)
        ↓
Supabase
├── PostgreSQL (data)
├── Auth (users + sessions)
└── RLS (row-level security)
```

## 3-Layer Architecture

### API Route (Controller)
- Parse request (query params, body)
- Authenticate user via `requireAuth()` (shared utility)
- Validate input (Zod schemas)
- Call service method
- Error handling via `handleApiError()` (shared utility)
- Format response { success, data/error }

#### Shared API Utilities (`src/lib/utils/api-handler.ts`)
- `requireAuth()`: Creates Supabase client, checks auth, returns `{ supabase, user }` or throws `AppError('AUTH_REQUIRED')`
- `handleApiError(routeLabel, error)`: Maps `AppError` to typed JSON responses, logs and returns 500 for unknown errors

### Service Layer
- Business logic (limits, permissions, workflows)
- Calls repository methods only
- Never imports Supabase client
- Throws typed errors (AppError with code)

### Repository Layer
- Direct Supabase queries
- CRUD operations
- Returns typed data or null
- No business logic

## Data Model

### profiles
- id (UUID, FK auth.users)
- display_name, avatar_url
- subscription_tier (free|premium)

### saved_calculations
- id (UUID), user_id (FK profiles)
- name, input_params (JSONB), results (JSONB)
- is_default, soft delete (deleted_at)

### subscriptions
- id (UUID), user_id (FK profiles, UNIQUE)
- stripe_customer_id, stripe_subscription_id
- status (active|canceled|past_due|trialing)

### guides
- id (UUID), slug (UNIQUE)
- title, description, content (Markdown)
- fire_type, is_published, sort_order

## Component Hierarchy

### Main Calculator Page (/)
```
Page (CC)
├── CalculatorPanel (CC) — 35% sidebar / mobile sheet
│   └── SliderInput × 9
├── FIRETimelineChart (CC) — Recharts
├── FIREResultCards (CC)
│   └── FIREResultCard × 5
├── ScenarioComparison (CC) — P1
├── MonteCarloPanel (CC) — P2 premium
│   ├── MonteCarloChart — fan chart (10-90 percentiles)
│   └── MonteCarloResults — success rates per FIRE type
├── PortfolioPanel (CC) — P2 premium
│   ├── PortfolioChart — allocation pie chart
│   ├── PortfolioLegend — asset class weights
│   └── PortfolioGrowthChart — strategy comparison area chart
└── DisclaimerBanner (SC)
```

### State Management
- **Zustand**: Calculator inputs (9 params), computed results, timeline
- **React Query**: Saved calculations, subscription status, guides
- **URL Hash**: Bidirectional sync with Zustand store

## FIRE Calculation Engine
- Location: src/lib/engine/fire-calculator.ts
- Pure function: calculateFIRE(input: FIREInput) → FIREOutput
- Client-side only, synchronous
- Formulas:
  - Real return = (1 + nominal) / (1 + inflation) - 1
  - FIRE target = expenses × multiplier / SWR
  - Year simulation: netWorth = prev × (1 + realReturn) + annualSavings
  - CoastFIRE: target / (1 + realReturn)^(retirementAge - currentAge)

## Monte Carlo Simulation Engine
- Location: src/lib/engine/monte-carlo.ts
- Pure function: runMonteCarlo(input, config) → MonteCarloResult
- Client-side only, deterministic (seeded PRNG)
- Uses Box-Muller transform for normal distribution of returns
- Default: 1000 simulations, 15% annual volatility
- Outputs: percentile bands (10/25/50/75/90), success rates, median reach ages
- Premium-only feature (gated in MonteCarloPanel component)

## Portfolio Optimization Engine
- Location: src/lib/engine/portfolio-optimizer.ts
- Pure function: optimizePortfolio(input, fireResults) → PortfolioResult
- Client-side only, synchronous
- 4 asset classes: US Stocks, Int'l Stocks, Bonds, Cash/MM
- Simplified correlation matrix for portfolio variance calculation
- 3 model portfolios (Conservative/Moderate/Aggressive) adjusted by time horizon
- Recommendation based on years to FIRE target and current age
- Outputs: allocations, risk/return metrics, Sharpe ratios, projected growth
- Premium-only feature (gated in PortfolioPanel component)

## Security
- RLS on all tables
- Auth required for save/load/subscription APIs
- Service role key for Stripe webhooks and admin operations
- Zod validation on all API inputs
- CORS handled by Next.js defaults
