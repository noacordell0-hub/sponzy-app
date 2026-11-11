-- Fixes from the Supabase security advisor:
-- 1. waitlist_count() is no longer used by the landing page and was callable by anyone.
-- 2. citext should not live in the public (API-exposed) schema.
drop function if exists public.waitlist_count();
create schema if not exists extensions;
alter extension citext set schema extensions;
