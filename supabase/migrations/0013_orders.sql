-- Layer 4: orders and payments (Stripe Connect Express, separate charges and transfers).
-- Every status change happens in server code using the service role; users can only read their own orders.

-- Payout account details (private to the owner; written only by the server).
alter table public.profile_private
  add column if not exists stripe_account_id text unique,
  add column if not exists payouts_enabled boolean not null default false,
  add column if not exists details_submitted boolean not null default false;

-- Public flag so profiles and checkout know a creator can be booked (set by the server).
alter table public.profiles add column if not exists payouts_ready boolean not null default false;

create table if not exists public.orders (
  id                     bigint generated always as identity primary key,
  brand_id               uuid references public.profiles(id) on delete set null,
  creator_id             uuid references public.profiles(id) on delete set null,
  service_id             bigint references public.services(id) on delete set null,
  offer_message_id       bigint references public.messages(id) on delete set null,
  thread_id              bigint references public.threads(id) on delete set null,
  title                  text not null check (char_length(title) between 1 and 80),
  includes               text check (char_length(includes) <= 600),
  price_cents            integer not null check (price_cents between 500 and 10000000),
  fee_rate               numeric(4,3) not null,
  creator_fee_cents      integer not null check (creator_fee_cents >= 0),
  brand_fee_cents        integer not null check (brand_fee_cents >= 0),
  total_cents            integer not null,
  turnaround_days        smallint not null,
  revisions_allowed      smallint not null default 0,
  revisions_used         smallint not null default 0,
  brief                  text not null check (char_length(brief) between 10 and 4000),
  tag                    text check (char_length(tag) <= 80),
  post_by                date not null,
  status                 text not null default 'awaiting_payment' check (status in (
                           'awaiting_payment', 'funded', 'in_progress', 'proof_submitted', 'revision_requested',
                           'approved', 'paid', 'cancelled', 'refunded', 'disputed')),
  stripe_checkout_session text unique,
  stripe_payment_intent  text,
  stripe_charge          text,
  stripe_transfer        text,
  proof_links            text[] not null default '{}',
  proof_note             text check (char_length(proof_note) <= 1000),
  revision_note          text check (char_length(revision_note) <= 1000),
  funded_at              timestamptz,
  started_at             timestamptz,
  submitted_at           timestamptz,
  auto_approve_at        timestamptz,
  approved_at            timestamptz,
  paid_at                timestamptz,
  cancelled_at           timestamptz,
  refunded_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint orders_total_ok check (total_cents = price_cents + brand_fee_cents)
);
create index if not exists orders_brand_idx on public.orders(brand_id, created_at desc);
create index if not exists orders_creator_idx on public.orders(creator_id, created_at desc);
create index if not exists orders_auto_approve_idx on public.orders(auto_approve_at) where status = 'proof_submitted';
-- One live order per accepted offer.
create unique index if not exists orders_offer_once on public.orders(offer_message_id)
  where offer_message_id is not null and status not in ('cancelled', 'refunded');

create table if not exists public.order_events (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references public.orders(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  kind        text not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events(order_id, created_at);

create or replace function public.orders_touch()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.orders_touch();
revoke all on function public.orders_touch() from public, anon, authenticated;

alter table public.orders enable row level security;
alter table public.order_events enable row level security;
revoke all on public.orders, public.order_events from anon, authenticated;

grant select on public.orders to authenticated;
create policy "orders parties read" on public.orders for select using (auth.uid() in (brand_id, creator_id) or public.is_admin());
grant select on public.order_events to authenticated;
create policy "order events parties read" on public.order_events for select using (
  exists (select 1 from public.orders o where o.id = order_id));  -- inherits the orders policy

-- Live order updates for both parties.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
