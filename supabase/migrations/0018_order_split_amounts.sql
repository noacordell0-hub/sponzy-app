-- Dispute splits: how much the creator is paid and how much the brand got back, when not the standard amounts.
alter table public.orders
  add column if not exists payout_cents integer check (payout_cents >= 0),
  add column if not exists refunded_cents integer check (refunded_cents >= 0);
