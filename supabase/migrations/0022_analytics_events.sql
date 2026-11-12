-- First-party funnel events (approved), so the funnel is visible on Vercel's free plan.
-- No emails, names or IPs: only the event name, small properties, page, source and an anonymous visitor id.
create table if not exists public.analytics_events (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  name          text not null check (char_length(name) <= 60),
  props         jsonb not null default '{}',
  path          text check (char_length(path) <= 200),
  visitor_id    text check (char_length(visitor_id) <= 20),
  utm_source    text check (char_length(utm_source) <= 100),
  utm_medium    text check (char_length(utm_medium) <= 100),
  utm_campaign  text check (char_length(utm_campaign) <= 100)
);
create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_name_idx on public.analytics_events(name, created_at desc);

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;
grant select on public.analytics_events to authenticated;
create policy "analytics admin read" on public.analytics_events for select to authenticated using (public.is_admin());
