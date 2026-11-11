-- Each signup gets a personal invite code; referred_by records who invited them.
alter table public.waitlist
  add column if not exists referral_code text unique,
  add column if not exists referred_by bigint references public.waitlist(id) on delete set null;

update public.waitlist
set referral_code = lower(substr(md5(random()::text || id::text), 1, 8))
where referral_code is null;

alter table public.waitlist alter column referral_code set not null;

create index if not exists waitlist_referred_by_idx on public.waitlist(referred_by);

-- Place in line: join order, moved up 5 spots per friend who joined with your link.
-- Only the server (service role) may call this.
create or replace function public.waitlist_status(p_code text)
returns table (position_in_line bigint, referrals bigint, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select w.id,
           w.referral_code,
           row_number() over (order by w.created_at, w.id) as base_pos,
           (select count(*) from public.waitlist r where r.referred_by = w.id) as refs
    from public.waitlist w
  ),
  scored as (
    select id, referral_code, refs, base_pos - 5 * refs as score, base_pos from ranked
  )
  select
    (select count(*) from scored s2 where (s2.score, s2.base_pos) < (me.score, me.base_pos)) + 1,
    me.refs,
    (select count(*) from scored)
  from scored me
  where me.referral_code = p_code;
$$;

revoke all on function public.waitlist_status(text) from public, anon, authenticated;
grant execute on function public.waitlist_status(text) to service_role;
