-- DRAFT pending Gary store-vs-drop decision (210d P0-3)
-- Prompt 210d P0-3: the stripe webhook (src/app/api/stripe/webhook/route.ts) upserts a
-- subscription record into public.subscriptions on checkout.session.completed and updates it
-- on customer.subscription.updated/deleted and invoice.payment_failed, but the table does not
-- exist live (2026-07-06 snapshot: docs/integrity/snapshot/live-types.ts), so every record is
-- silently dropped. Columns are exactly the webhook upsert payload plus id, created_at,
-- updated_at. stripe_subscription_id is unique because the webhook upserts with
-- onConflict stripe_subscription_id (the upsert errors without a unique constraint there).
-- RLS enabled with one owner-scoped select policy only; the webhook writes with the service
-- role key, which bypasses RLS, so no anon or authenticated insert policy is granted.
-- Shape test: src/app/api/stripe/__tests__/webhook-shapes.test.ts parses this file.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_customer_id text not null default '',
  stripe_subscription_id text not null unique,
  plan_id text,
  plan text not null,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
