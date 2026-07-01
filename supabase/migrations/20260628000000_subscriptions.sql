-- ============================================================================
-- FIREPath — Stripe subscription state
-- ============================================================================
-- Where premium/subscription status lives. Populated by the Stripe webhook
-- (/api/stripe/webhook) using the service-role key (RLS bypassed). Read by the
-- server-side premium helper (src/lib/subscription/premium.ts) to gate ads and
-- premium features.
--
-- DO NOT run this automatically — apply it via the Supabase dashboard SQL editor
-- or `supabase db push` when wiring the backend. It is written to be idempotent
-- and safe to re-run.
-- ============================================================================

-- ── profiles.subscription_tier ─────────────────────────────────────────────
-- `profiles` already exists (auth-linked user profile). Ensure the convenience
-- tier mirror column exists; the webhook keeps it in sync with Stripe.
alter table if exists public.profiles
  add column if not exists subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'premium'));

-- ── subscriptions ──────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id      text not null,
  stripe_subscription_id  text,
  status                  text not null default 'incomplete'
                            check (status in (
                              'active', 'trialing', 'past_due',
                              'canceled', 'incomplete', 'incomplete_expired',
                              'unpaid', 'paused'
                            )),
  plan                    text not null default 'premium',
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  canceled_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- One subscription row per user — required for upsert(onConflict: 'user_id').
  constraint subscriptions_user_id_key unique (user_id)
);

create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id);
create index if not exists subscriptions_stripe_subscription_id_idx
  on public.subscriptions (stripe_subscription_id);

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Users may READ their own subscription row. Writes happen ONLY via the
-- service-role key in the Stripe webhook (which bypasses RLS), so there is no
-- insert/update/delete policy for end users — they cannot self-grant premium.
alter table public.subscriptions enable row level security;

drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- ── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();
