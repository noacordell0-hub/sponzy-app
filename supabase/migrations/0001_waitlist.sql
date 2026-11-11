-- Layer 0: waitlist signups from the landing page.
create extension if not exists citext;

create table if not exists public.waitlist (
  id          bigint generated always as identity primary key,
  email       citext not null unique,
  role        text not null default 'creator' check (role in ('creator', 'brand')),
  handle      text check (char_length(handle) <= 60),
  source      text check (char_length(source) <= 60),
  created_at  timestamptz not null default now(),
  constraint waitlist_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Row Level Security on, with no policies: the public (anon) key can neither
-- read nor write. Only the server route, using the service role key, can.
alter table public.waitlist enable row level security;

-- Public count for the "spots left" meter, without exposing any emails.
create or replace function public.waitlist_count()
returns bigint
language sql
security definer
set search_path = public
as $$ select count(*) from public.waitlist $$;

grant execute on function public.waitlist_count() to anon, authenticated;
