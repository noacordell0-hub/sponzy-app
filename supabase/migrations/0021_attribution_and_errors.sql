-- Analytics groundwork (approved): where each waitlist signup came from, and a place to keep server errors
-- (Vercel Hobby deletes runtime logs after 1 hour). Add-only: nothing existing changes.

alter table public.waitlist
  add column if not exists utm_source text check (char_length(utm_source) <= 100),
  add column if not exists utm_medium text check (char_length(utm_medium) <= 100),
  add column if not exists utm_campaign text check (char_length(utm_campaign) <= 100),
  add column if not exists landing_page text check (char_length(landing_page) <= 100);

create table if not exists public.error_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  level       text not null default 'error' check (level in ('error', 'warn', 'client')),
  route       text check (char_length(route) <= 300),
  message     text not null check (char_length(message) <= 2000),
  stack       text check (char_length(stack) <= 8000),
  user_id     uuid,
  digest      text check (char_length(digest) <= 100),
  context     jsonb not null default '{}'
);
create index if not exists error_events_created_idx on public.error_events(created_at desc);

-- Only admins can read errors (through the server). Written only by the server's service role.
alter table public.error_events enable row level security;
revoke all on public.error_events from anon, authenticated;
grant select on public.error_events to authenticated;
create policy "errors admin read" on public.error_events for select to authenticated using (public.is_admin());
