-- TokenGate storefront schema. Run in the Supabase SQL editor (idempotent).
-- All access goes through the server using the service role key; RLS is
-- enabled with no policies so anon/authenticated clients can read nothing.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- api_keys: one row per upstream token sold through the storefront
-- ---------------------------------------------------------------------------
create table if not exists public.api_keys (
  id                uuid primary key default gen_random_uuid(),
  key_secret        text        not null,
  user_email        text        not null,
  quota_total       bigint      not null default 0 check (quota_total >= 0),
  upstream_token_id bigint      not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint api_keys_key_secret_key unique (key_secret),
  constraint api_keys_upstream_token_id_key unique (upstream_token_id)
);

create index if not exists api_keys_user_email_idx on public.api_keys (lower(user_email));
create index if not exists api_keys_created_at_idx on public.api_keys (created_at desc);

-- ---------------------------------------------------------------------------
-- orders: one row per paid Stripe Checkout Session
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  stripe_session_id text          not null,
  user_email        text          not null,
  amount_usd        numeric(10,2) not null check (amount_usd > 0),
  quota_granted     bigint        not null check (quota_granted > 0),
  key_secret        text          not null,
  is_topup          boolean       not null default false,
  created_at        timestamptz   not null default now(),
  -- A session can only ever be fulfilled once, regardless of which event fired.
  constraint orders_stripe_session_id_key unique (stripe_session_id)
);

create index if not exists orders_user_email_idx on public.orders (lower(user_email));
create index if not exists orders_key_secret_idx on public.orders (key_secret);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- ---------------------------------------------------------------------------
-- processed_stripe_events: webhook idempotency ledger
--   status = 'processing' -> claimed by an in-flight invocation
--   status = 'completed'  -> fully fulfilled, never process again
-- ---------------------------------------------------------------------------
create table if not exists public.processed_stripe_events (
  id           text        primary key,           -- Stripe event id (evt_...)
  event_type   text        not null,
  status       text        not null default 'processing'
               check (status in ('processing', 'completed')),
  processed_at timestamptz not null default now()
);

create index if not exists processed_stripe_events_type_idx
  on public.processed_stripe_events (event_type, processed_at desc);

-- ---------------------------------------------------------------------------
-- Atomic quota increment for top-ups (avoids read-modify-write races).
-- ---------------------------------------------------------------------------
create or replace function public.increment_key_quota(p_key_secret text, p_quota bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.api_keys
     set quota_total = quota_total + p_quota,
         updated_at  = now()
   where key_secret = p_key_secret;
$$;

revoke all on function public.increment_key_quota(text, bigint) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- rate_limits: fixed-window counters shared across all serverless instances.
-- bucket = "<route>:<sha256(ip)>" so raw IPs are never stored.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, window_start)
);

create index if not exists rate_limits_window_start_idx on public.rate_limits (window_start);

-- Atomically records a hit and returns the hit count for the current window.
create or replace function public.rate_limit_hit(p_bucket text, p_window_seconds integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits   integer;
begin
  insert into public.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Opportunistic cleanup (~1% of calls) keeps the table small without a cron job.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer) from public, anon, authenticated;
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- The server uses the service_role key. Grant it explicitly rather than relying
-- on Supabase default privileges (guarded so the file also runs on plain Postgres).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.increment_key_quota(text, bigint) to service_role;
    grant execute on function public.rate_limit_hit(text, integer) to service_role;
    grant select, insert, update, delete on
      public.api_keys, public.orders, public.processed_stripe_events, public.rate_limits
      to service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Lock down direct client access.
-- ---------------------------------------------------------------------------
alter table public.api_keys                enable row level security;
alter table public.orders                  enable row level security;
alter table public.processed_stripe_events enable row level security;

revoke all on public.api_keys, public.orders, public.processed_stripe_events from anon, authenticated;
